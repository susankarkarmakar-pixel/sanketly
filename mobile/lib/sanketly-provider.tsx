import type { MeshIdentity, DecryptedMeshMessage } from "@sanketly/mesh-crypto";
import { decryptMeshPacket, derivePeerId, encryptMeshMessage, envelopeToMeshPacket } from "@sanketly/mesh-crypto";
import type { OutboxRecord } from "@sanketly/domain";
import { createAnnouncePacket, decodePacket, encodePacket, type MeshPacket, type MeshPeer, type TransportStatus } from "@sanketly/protocol";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { MeshNative } from "@/modules/sanketly-mesh/src";
import { createId, loadMeshIdentity, MobileOutboxStore } from "./storage";

export interface LocalMessage {
  id: string;
  peerId: string;
  body: string;
  createdAt: number;
  deliveryState: "queued" | "relaying" | "delivered" | "failed";
}

interface SanketlyContextValue {
  peerId: string | null;
  meshStatus: TransportStatus;
  peers: MeshPeer[];
  messages: Record<string, LocalMessage[]>;
  startMesh(): Promise<void>;
  stopMesh(): Promise<void>;
  queueMessage(peerId: string, body: string): Promise<LocalMessage>;
}

const initialStatus: TransportStatus = {
  kind: "mesh",
  state: "disabled",
  detail: "Mesh service is not started",
};

const SanketlyContext = createContext<SanketlyContextValue | null>(null);
const outbox = new MobileOutboxStore();

export function SanketlyProvider({ children }: PropsWithChildren) {
  const [identity, setIdentity] = useState<MeshIdentity | null>(null);
  const [meshStatus, setMeshStatus] = useState<TransportStatus>(initialStatus);
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [messages, setMessages] = useState<Record<string, LocalMessage[]>>({});
  const seenPacketIds = useRef(new Set<string>());
  const identityRef = useRef<MeshIdentity | null>(null);

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  useEffect(() => {
    void loadMeshIdentity().then(setIdentity).catch((error: unknown) => {
      setMeshStatus({ kind: "mesh", state: "error", detail: error instanceof Error ? error.message : "Unable to create secure SSA identity" });
    });
    const unsubscribe = MeshNative.subscribe((event) => {
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
    return unsubscribe;
  }, []);

  async function handleIncomingFrame(currentIdentity: MeshIdentity, linkId: string, bytes: number[]): Promise<void> {
    if (!currentIdentity) return;
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
        const withoutPeer = current.filter((peer) => peer.peerId !== packet.senderId && peer.linkId !== linkId);
        return [...withoutPeer, {
          linkId,
          peerId: packet.senderId,
          encryptionPublicKey,
          signingPublicKey,
          lastSeenAt: Date.now(),
          verified: false,
          connectionState: "connected",
          transport: "ble",
        }];
      });
    } catch {
      setMeshStatus({ kind: "mesh", state: "error", detail: "Rejected malformed peer announcement" });
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
      if (Platform.OS === "android" && Platform.Version >= 31) {
        const permissions = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        ]);
        const denied = Object.values(permissions).some((status) => status !== PermissionsAndroid.RESULTS.GRANTED);
        if (denied) throw new Error("Nearby Bluetooth permission was denied");
      } else if (Platform.OS === "android") {
        const status = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
        if (status !== PermissionsAndroid.RESULTS.GRANTED) throw new Error("Location permission is required for BLE scanning on this Android version");
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
      await MeshNative.start(Array.from(encodePacket(announce)));
      if (!MeshNative.isAvailable) {
        setMeshStatus({ kind: "mesh", state: "error", detail: "SSA native transport is not installed. Build the Android app with the SSA native module." });
      } else {
        setMeshStatus({ kind: "mesh", state: "ready", detail: "SSA nearby discovery is active" });
      }
    } catch (error) {
      setMeshStatus({ kind: "mesh", state: "error", detail: error instanceof Error ? error.message : "Unable to start SSA nearby transport" });
    }
  }, [identity]);

  const stopMesh = useCallback(async () => {
    await MeshNative.stop();
    setMeshStatus(initialStatus);
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
    if (meshStatus.state === "ready" && recipient.linkId) {
      try {
        await MeshNative.sendFrame(recipient.linkId, Array.from(encodePacket(meshPacket)));
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

  const value = useMemo(() => ({ peerId: identity?.peerId ?? null, meshStatus, peers, messages, startMesh, stopMesh, queueMessage }), [identity, meshStatus, peers, messages, startMesh, stopMesh, queueMessage]);
  return <SanketlyContext.Provider value={value}>{children}</SanketlyContext.Provider>;
}

export function useSanketly(): SanketlyContextValue {
  const context = useContext(SanketlyContext);
  if (!context) throw new Error("useSanketly must be used within SanketlyProvider");
  return context;
}
