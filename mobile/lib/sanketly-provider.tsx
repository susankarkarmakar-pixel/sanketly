import { derivePeerId, encryptMeshMessage, envelopeToMeshPacket, type DecryptedMeshMessage, type MeshIdentity } from "@sanketly/mesh-crypto";
import { parseStructuredAlert, serializeStructuredAlert, type AlertRecord, type OutboxRecord, type StructuredAlert } from "@sanketly/domain";
import { createAnnouncePacket, decodePacket, encodePacket, NEARBY_SERVICE_ID, type MeshPacket, type MeshPeer, type TransportStatus } from "@sanketly/protocol";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { MeshNative } from "@/modules/sanketly-mesh/src";
import { NearbyNative, type NearbyEvent } from "@/modules/ssa-nearby/src";
import { createId, loadMeshIdentity, MobileAlertStore, MobileOutboxStore, MobileRelayEventStore, MobileRelayQueueStore } from "./storage";
import { MeshEngine } from "./mesh/mesh-engine";

export interface LocalMessage {
  id: string;
  peerId: string;
  body: string;
  createdAt: number;
  deliveryState: "queued" | "relaying" | "delivered" | "failed";
  alert?: StructuredAlert;
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
  alerts: AlertRecord[];
  startMesh(): Promise<void>;
  stopMesh(): Promise<void>;
  acceptNearbyRequest(endpointId: string): Promise<void>;
  rejectNearbyRequest(endpointId: string): Promise<void>;
  openBatterySettings(): Promise<void>;
  queueMessage(peerId: string, body: string, options?: { displayBody?: string; alert?: StructuredAlert }): Promise<LocalMessage>;
  queueAlert(peerId: string, alert: StructuredAlert): Promise<LocalMessage>;
}

const initialStatus: TransportStatus = {
  kind: "mesh",
  state: "disabled",
  detail: "SSA service is not started",
};

const SanketlyContext = createContext<SanketlyContextValue | null>(null);
const outbox = new MobileOutboxStore();
const relayQueue = new MobileRelayQueueStore();
const alertStore = new MobileAlertStore();
const relayEventStore = new MobileRelayEventStore();

export function SanketlyProvider({ children }: PropsWithChildren) {
  const [identity, setIdentity] = useState<MeshIdentity | null>(null);
  const [meshStatus, setMeshStatus] = useState<TransportStatus>(initialStatus);
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [pendingNearbyRequests, setPendingNearbyRequests] = useState<PendingNearbyRequest[]>([]);
  const [messages, setMessages] = useState<Record<string, LocalMessage[]>>({});
  const [alerts, setAlerts] = useState<AlertRecord[]>([]);
  const identityRef = useRef<MeshIdentity | null>(null);
  const peersRef = useRef<MeshPeer[]>([]);
  const announceFrameRef = useRef<number[] | null>(null);
  const meshEngineRef = useRef<MeshEngine | null>(null);

  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  useEffect(() => {
    if (!identity) {
      meshEngineRef.current = null;
      return;
    }
    meshEngineRef.current = new MeshEngine({
      identity,
      relayStore: relayQueue,
      send: async (linkId, bytes) => {
        const peer = peersRef.current.find((candidate) => candidate.linkId === linkId);
        if (!peer) throw new Error("Mesh route is no longer connected");
        await sendPacketToPeer(peer, decodePacket(Uint8Array.from(bytes)));
      },
      events: {
        onMessage: (message) => { void handleDecryptedMessage(message); },
        onPacket: (packet, linkId) => {
          if (packet.type === "announce") handleAnnounce(linkId, packet);
        },
        onRelay: (packet, viaPeer) => {
          void relayEventStore.append({ eventId: createId("relay-event"), packetId: packet.packetId, messageId: packet.messageId, kind: "forwarded", peerId: viaPeer.peerId, createdAt: Date.now() });
          setMeshStatus((current) => ({ ...current, detail: `Relaying through ${viaPeer.displayName ?? "nearby peer"}` }));
        },
        onQueued: (packet) => {
          void relayEventStore.append({ eventId: createId("relay-event"), packetId: packet.packetId, messageId: packet.messageId, kind: "queued", createdAt: Date.now() });
          setMeshStatus((current) => ({ ...current, detail: "Packet queued for the next available relay" }));
        },
        onError: (error) => {
          setMeshStatus({ kind: "mesh", state: "error", detail: error.message });
        },
      },
    });
    return () => {
      meshEngineRef.current = null;
    };
  }, [identity]);

  useEffect(() => {
    void Promise.all([loadMeshIdentity(), alertStore.list()]).then(([loadedIdentity, loadedAlerts]) => {
      setIdentity(loadedIdentity);
      setAlerts(loadedAlerts);
    }).catch((error: unknown) => {
      setMeshStatus({ kind: "mesh", state: "error", detail: error instanceof Error ? error.message : "Unable to load SSA local state" });
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
    if (Platform.OS === "android") void NearbyNative.attach().catch(() => undefined);
    return () => {
      unsubscribeMesh();
      unsubscribeNearby();
    };
  }, []);

  async function handleIncomingFrame(_currentIdentity: MeshIdentity, linkId: string, bytes: number[]): Promise<void> {
    const engine = meshEngineRef.current;
    if (engine) await engine.receive(linkId, bytes, peersRef.current);
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

  async function handleDecryptedMessage(message: DecryptedMeshMessage): Promise<void> {
    const alert = parseStructuredAlert(message.body) ?? undefined;
    const localMessage: LocalMessage = {
      id: message.messageId,
      peerId: message.senderId,
      body: alert ? `${alert.title} · ${alert.village}` : message.body,
      createdAt: message.createdAt,
      deliveryState: "delivered",
      alert,
    };
    setMessages((current) => ({ ...current, [message.senderId]: [...(current[message.senderId] ?? []), localMessage] }));
    if (alert) {
      const record: AlertRecord = { alert, messageId: message.messageId, deliveryState: "delivered", updatedAt: Date.now() };
      await alertStore.upsert(record);
      setAlerts((current) => [record, ...current.filter((entry) => entry.messageId !== record.messageId)]);
    }
  }

  async function sendPacketToPeer(peer: MeshPeer, packet: MeshPacket): Promise<void> {
    if (!peer.linkId) throw new Error("Route has no native link");
    const bytes = Array.from(encodePacket(packet));
    if (peer.transport === "nearby") await NearbyNative.sendPayload(peer.linkId, bytes);
    else await MeshNative.sendFrame(peer.linkId, bytes);
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
        if (Platform.Version >= 33 && PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS) {
          permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
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

  const openBatterySettings = useCallback(async () => {
    if (Platform.OS !== "android") return;
    await NearbyNative.openBatterySettings();
  }, []);

  const queueMessage = useCallback(async (targetPeerId: string, body: string, options?: { displayBody?: string; alert?: StructuredAlert }) => {
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
    const engine = meshEngineRef.current;
    if (engine) {
      await engine.send(meshPacket, peersRef.current);
    } else {
      await relayQueue.upsert({
        queueId: `${meshPacket.packetId}:${identity.peerId}`,
        packet: meshPacket,
        attempts: 0,
        nextAttemptAt: now,
        enqueuedAt: now,
      });
    }
    const localMessage: LocalMessage = {
      id: messageId,
      peerId: targetPeerId,
      body: options?.displayBody ?? body.trim(),
      createdAt: now,
      deliveryState: "queued",
      alert: options?.alert,
    };
    setMessages((current) => ({ ...current, [targetPeerId]: [...(current[targetPeerId] ?? []), localMessage] }));
    if (options?.alert) {
      const record: AlertRecord = { alert: options.alert, messageId, packetId: meshPacket.packetId, deliveryState: "queued", updatedAt: Date.now() };
      await alertStore.upsert(record);
      setAlerts((current) => [record, ...current.filter((entry) => entry.messageId !== record.messageId)]);
    }
    return localMessage;
  }, [identity, peers]);

  const queueAlert = useCallback(async (targetPeerId: string, alert: StructuredAlert) => {
    return queueMessage(targetPeerId, serializeStructuredAlert(alert), {
      displayBody: `${alert.title} · ${alert.village}`,
      alert,
    });
  }, [queueMessage]);

  const value = useMemo(() => ({ peerId: identity?.peerId ?? null, meshStatus, peers, pendingNearbyRequests, messages, alerts, startMesh, stopMesh, acceptNearbyRequest, rejectNearbyRequest, openBatterySettings, queueMessage, queueAlert }), [identity, meshStatus, peers, pendingNearbyRequests, messages, alerts, startMesh, stopMesh, acceptNearbyRequest, rejectNearbyRequest, openBatterySettings, queueMessage, queueAlert]);
  return <SanketlyContext.Provider value={value}>{children}</SanketlyContext.Provider>;
}

export function useSanketly(): SanketlyContextValue {
  const context = useContext(SanketlyContext);
  if (!context) throw new Error("useSanketly must be used within SanketlyProvider");
  return context;
}
