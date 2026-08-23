import { decryptMeshPacket, derivePeerId, encryptMeshMessage, envelopeToMeshPacket, type DecryptedMeshMessage, type MeshIdentity } from "@sanketly/mesh-crypto";
import type { OutboxRecord } from "@sanketly/domain";
import { createAnnouncePacket, decodePacket, encodePacket, NEARBY_SERVICE_ID, type MeshPacket, type MeshPeer, type TransportStatus } from "@sanketly/protocol";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { MeshNative } from "@/modules/sanketly-mesh/src";
import { NearbyNative, type NearbyEvent } from "@/modules/ssa-nearby/src";
import { createId, loadMeshIdentity, MobileOutboxStore } from "./storage";

export interface LocalMessage {
  id: string;
  peerId: string;
  body: string;
  createdAt: number;
  deliveryState: "queued" | "relaying" | "delivered" | "failed";
}

export interface PendingNearbyRequest {
  endpointId: string;
  name: string;
  authenticationToken: string;
}

interface SanketlyContextValue {
  peerId: string | null;
  meshStatus: TransportStatus;
  peers: MeshPeer[];
  pendingNearbyRequests: PendingNearbyRequest[];
  messages: Record<string, LocalMessage[]>;
  startMesh(): Promise<void>;
  stopMesh(): Promise<void>;
  acceptNearbyRequest(endpointId: string): Promise<void>;
  rejectNearbyRequest(endpointId: string): Promise<void>;
  queueMessage(peerId: string, body: string): Promise<LocalMessage>;
}

const initialStatus: TransportStatus = {
  kind: "mesh",
  state: "disabled",
  detail: "SSA service is not started",
};

const SanketlyContext = createContext<SanketlyContextValue | null>(null);
const outbox = new MobileOutboxStore();

export function SanketlyProvider({ children }: PropsWithChildren) {
  const [identity, setIdentity] = useState<MeshIdentity | null>(null);
  const [meshStatus, setMeshStatus] = useState<TransportStatus>(initialStatus);
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [pendingNearbyRequests, setPendingNearbyRequests] = useState<PendingNearbyRequest[]>([]);
  const [messages, setMessages] = useState<Record<string, LocalMessage[]>>({});
  const seenPacketIds = useRef(new Set<string>());
  const identityRef = useRef<MeshIdentity | null>(null);
  const announceFrameRef = useRef<number[] | null>(null);

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  useEffect(() => {
    void loadMeshIdentity().then(setIdentity).catch((error: unknown) => {
      setMeshStatus({ kind: "mesh", state: "error", detail: error instanceof Error ? error.message : "Unable to create secure SSA identity" });
    });

    const handleNearbyEvent = (event: NearbyEvent) => {
      if (event.type === "status") {
        setMeshStatus({ kind: "mesh", state: event.state === "stopped" ? "disabled" : event.state, detail: event.detail });
        return;
      }
      if (event.type === "connection-request") {
        setPendingNearbyRequests((current) => [
          ...current.filter((request) => request.endpointId !== event.endpointId),
          { endpointId: event.endpointId, name: event.name, authenticationToken: event.authenticationToken },
        ]);
        setMeshStatus({ kind: "mesh", state: "starting", detail: `Connection request from ${event.name}` });
        return;
      }
      if (event.type === "peer") {
        const state = event.peer.state === "disconnected" || event.peer.state === "rejected" ? "unavailable" : event.peer.state;
        setPeers((current) => {
          const withoutPeer = current.filter((peer) => peer.linkId !== event.peer.endpointId && peer.peerId !== event.peer.endpointId);
          return [...withoutPeer, {
            peerId: event.peer.endpointId,
            linkId: event.peer.endpointId,
            displayName: event.peer.name,
            lastSeenAt: event.peer.lastSeenAt,
            verified: false,
            connectionState: state === "discovered" ? "discovered" : state === "connecting" ? "connecting" : state === "connected" ? "connected" : "unavailable",
            transport: "nearby",
          }];
        });
        if (event.peer.state === "connected") {
          const currentIdentity = identityRef.current;
          const announceBytes = announceFrameRef.current;
          if (currentIdentity && announceBytes) {
            void NearbyNative.sendPayload(event.peer.endpointId, announceBytes).catch((error: unknown) => {
              setMeshStatus({ kind: "mesh", state: "error", detail: error instanceof Error ? error.message : "Unable to announce SSA identity" });
            });
          }
        }
        return;
      }
      if (event.type === "payload") {
        const currentIdentity = identityRef.current;
        if (currentIdentity) void handleIncomingFrame(currentIdentity, event.endpointId, event.bytes);
      }
    };

    const unsubscribeMesh = MeshNative.subscribe((event) => {
      if (event.type === "status") {
        setMeshStatus({ kind: "mesh", state: event.state === "stopped" ? "disabled" : event.state, detail: event.detail });
        return;
      }
      if (event.type === "peer") {
        setPeers((current) => {
          const withoutPeer = current.filter((peer) => peer.linkId !== event.peer.linkId);
          return [...withoutPeer, { ...event.peer, transport: "ble" }];
        });
        return;
      }
      if (event.type === "frame") {
        const currentIdentity = identityRef.current;
        if (currentIdentity) void handleIncomingFrame(currentIdentity, event.linkId, event.bytes);
      }
    });
    const unsubscribeNearby = NearbyNative.subscribe(handleNearbyEvent);
    return () => {
      unsubscribeMesh();
      unsubscribeNearby();
    };
  }, []);

  async function handleIncomingFrame(currentIdentity: MeshIdentity, linkId: string, bytes: number[]): Promise<void> {
    try {
      const packet = decodePacket(Uint8Array.from(bytes));
      if (!seenPacketIds.current.add(packet.packetId)) return;
      if (packet.type === "announce") {
        handleAnnounce(linkId, packet);
        return;
      }
      if (packet.type !== "message") return;
      const decrypted = await decryptMeshPacket({ identity: currentIdentity, packet });
      handleDecryptedMessage(decrypted);
    } catch (error) {
      setMeshStatus({ kind: "mesh", state: "error", detail: error instanceof Error ? error.message : "Rejected invalid SSA transport frame" });
    }
  }

  function handleAnnounce(linkId: string, packet: MeshPacket): void {
    if (!packet.payload) return;
    try {
      const announced: unknown = JSON.parse(packet.payload);
      if (!announced || typeof announced !== "object") return;
      const value = announced as Record<string, unknown>;
      const encryptionPublicKey = value.encryptionPublicKey;
      const signingPublicKey = value.signingPublicKey;
      if (value.peerId !== packet.senderId || typeof encryptionPublicKey !== "string" || typeof signingPublicKey !== "string") return;
      if (derivePeerId(signingPublicKey) !== packet.senderId) return;
      setPeers((current) => {
        const existing = current.find((peer) => peer.linkId === linkId || peer.peerId === packet.senderId);
        const withoutPeer = current.filter((peer) => peer.peerId !== packet.senderId && peer.linkId !== linkId);
        return [...withoutPeer, {
          linkId,
          peerId: packet.senderId,
          encryptionPublicKey,
          signingPublicKey,
          displayName: existing?.displayName ?? "Nearby SSA device",
          lastSeenAt: Date.now(),
          verified: true,
          connectionState: "connected",
          transport: existing?.transport ?? (Platform.OS === "android" ? "nearby" : "ble"),
        }];
      });
    } catch {
      setMeshStatus({ kind: "mesh", state: "error", detail: "Rejected malformed SSA peer announcement" });
    }
  }

  function handleDecryptedMessage(message: DecryptedMeshMessage): void {
    setMessages((current) => ({
      ...current,
      [message.senderId]: [...(current[message.senderId] ?? []), {
        id: message.messageId,
        peerId: message.senderId,
        body: message.body,
        createdAt: message.createdAt,
        deliveryState: "delivered",
      }],
    }));
  }

  const startMesh = useCallback(async () => {
    if (!identity) {
      setMeshStatus({ kind: "mesh", state: "error", detail: "Secure identity is still loading" });
      return;
    }
    setMeshStatus({ kind: "mesh", state: "starting", detail: "Starting SSA nearby discovery…" });
    try {
      if (Platform.OS === "android") {
        if (!NearbyNative.isAvailable) throw new Error("SSA Nearby native module is not installed in this development build");
        const permissions: string[] = [];
        if (Platform.Version >= 31) {
          permissions.push(
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
          );
        }
        if (Platform.Version >= 32 && PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES) {
          permissions.push(PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES);
        }
        if (Platform.Version >= 29 && Platform.Version <= 31) {
          permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        }
        if (Platform.Version <= 28) {
          permissions.push(PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION);
        }
        const results = await PermissionsAndroid.requestMultiple(permissions.filter(Boolean) as Parameters<typeof PermissionsAndroid.requestMultiple>[0]);
        if (Object.values(results).some((status) => status !== PermissionsAndroid.RESULTS.GRANTED)) {
          throw new Error("SSA Nearby permissions were denied");
        }
      }

      const announce = createAnnouncePacket({
        packetId: createId("announce"),
        senderId: identity.peerId,
        payload: JSON.stringify({
          peerId: identity.peerId,
          signingPublicKey: identity.signingPublicKey,
          encryptionPublicKey: identity.encryptionPublicKey,
        }),
      });
      const announceBytes = Array.from(encodePacket(announce));
      announceFrameRef.current = announceBytes;

      if (Platform.OS === "android") {
        await NearbyNative.start(NEARBY_SERVICE_ID, `SSA-${identity.peerId.slice(0, 8)}`);
      } else {
        await MeshNative.start(announceBytes);
      }
      setMeshStatus({ kind: "mesh", state: "starting", detail: Platform.OS === "android" ? "Waiting for nearby SSA connection approval" : "SSA nearby transport is active" });
    } catch (error) {
      setMeshStatus({ kind: "mesh", state: "error", detail: error instanceof Error ? error.message : "Unable to start SSA nearby transport" });
    }
  }, [identity]);

  const stopMesh = useCallback(async () => {
    await Promise.allSettled([MeshNative.stop(), NearbyNative.stop()]);
    announceFrameRef.current = null;
    setPendingNearbyRequests([]);
    setPeers([]);
    setMeshStatus(initialStatus);
  }, []);

  const acceptNearbyRequest = useCallback(async (endpointId: string) => {
    await NearbyNative.acceptConnection(endpointId);
    setPendingNearbyRequests((current) => current.filter((request) => request.endpointId !== endpointId));
  }, []);

  const rejectNearbyRequest = useCallback(async (endpointId: string) => {
    await NearbyNative.rejectConnection(endpointId);
    setPendingNearbyRequests((current) => current.filter((request) => request.endpointId !== endpointId));
  }, []);

  const queueMessage = useCallback(async (targetPeerId: string, body: string) => {
    if (!body.trim()) throw new Error("Message cannot be empty");
    if (!identity) throw new Error("Secure identity is still loading");
    const recipient = peers.find((peer) => peer.peerId === targetPeerId);
    if (!recipient?.encryptionPublicKey) throw new Error("Recipient encryption key is not available; complete authenticated peer discovery first");

    const now = Date.now();
    const messageId = createId("message");
    const conversationId = `dm:${targetPeerId}`;
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
    const envelope = await encryptMeshMessage({
      identity,
      recipient: { peerId: targetPeerId, encryptionPublicKey: recipient.encryptionPublicKey },
      messageId,
      conversationId,
      body: body.trim(),
      createdAt: now,
      expiresAt,
    });
    const meshPacket = envelopeToMeshPacket({ envelope, packetId: createId("packet") });
    const outboxRecord: OutboxRecord = {
      messageId,
      conversationId,
      senderId: identity.peerId,
      recipientId: targetPeerId,
      ciphertext: envelope.ciphertext,
      createdAt: now,
      expiresAt,
      deliveryState: "queued",
      attempts: 0,
      cryptoVersion: envelope.version,
      senderSigningPublicKey: envelope.senderSigningPublicKey,
      senderEncryptionPublicKey: envelope.senderEncryptionPublicKey,
      signature: envelope.signature,
      meshPacket,
    };
    await outbox.upsert(outboxRecord);
    if (meshStatus.state === "ready" || meshStatus.state === "starting") {
      try {
        const bytes = Array.from(encodePacket(meshPacket));
        if (recipient.transport === "nearby" && recipient.linkId) {
          await NearbyNative.sendPayload(recipient.linkId, bytes);
        } else if (recipient.linkId) {
          await MeshNative.sendFrame(recipient.linkId, bytes);
        }
      } catch {
        // The durable outbox remains queued for retry when the link reconnects.
      }
    }
    const localMessage: LocalMessage = {
      id: messageId,
      peerId: targetPeerId,
      body: body.trim(),
      createdAt: now,
      deliveryState: "queued",
    };
    setMessages((current) => ({ ...current, [targetPeerId]: [...(current[targetPeerId] ?? []), localMessage] }));
    return localMessage;
  }, [identity, meshStatus.state, peers]);

  const value = useMemo(() => ({ peerId: identity?.peerId ?? null, meshStatus, peers, pendingNearbyRequests, messages, startMesh, stopMesh, acceptNearbyRequest, rejectNearbyRequest, queueMessage }), [identity, meshStatus, peers, pendingNearbyRequests, messages, startMesh, stopMesh, acceptNearbyRequest, rejectNearbyRequest, queueMessage]);
  return <SanketlyContext.Provider value={value}>{children}</SanketlyContext.Provider>;
}

export function useSanketly(): SanketlyContextValue {
  const context = useContext(SanketlyContext);
  if (!context) throw new Error("useSanketly must be used within SanketlyProvider");
  return context;
}
