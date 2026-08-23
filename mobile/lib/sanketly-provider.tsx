import type { MeshIdentity } from "@sanketly/mesh-crypto";
import { encryptMeshMessage, envelopeToMeshPacket } from "@sanketly/mesh-crypto";
import type { OutboxRecord } from "@sanketly/domain";
import type { MeshPeer, TransportStatus } from "@sanketly/protocol";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { MeshNative } from "@/modules/sanketly-mesh/src";
import { createId, loadMeshIdentity, MobileOutboxStore } from "./storage";

export interface LocalMessage {
  id: string;
  peerId: string;
  body: string;
  createdAt: number;
  deliveryState: "queued" | "failed";
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

  useEffect(() => {
    void loadMeshIdentity().then(setIdentity).catch((error: unknown) => {
      setMeshStatus({ kind: "mesh", state: "error", detail: error instanceof Error ? error.message : "Unable to create secure identity" });
    });
    const unsubscribe = MeshNative.subscribe((event) => {
      if (event.type === "status") {
        setMeshStatus({ kind: "mesh", state: event.state === "stopped" ? "disabled" : event.state, detail: event.detail });
      }
      if (event.type === "peer") {
        setPeers((current) => {
          const withoutPeer = current.filter((peer) => peer.peerId !== event.peer.peerId);
          return [...withoutPeer, { ...event.peer, transport: "ble" }];
        });
      }
    });
    return unsubscribe;
  }, []);

  const startMesh = useCallback(async () => {
    setMeshStatus({ kind: "mesh", state: "starting", detail: "Starting nearby discovery…" });
    try {
      await MeshNative.start();
      if (!MeshNative.isAvailable) {
        setMeshStatus({
          kind: "mesh",
          state: "error",
          detail: "Native mesh module is not installed. Build the mobile app with the Sanketly native module.",
        });
      } else {
        setMeshStatus({ kind: "mesh", state: "ready", detail: "Nearby discovery is active" });
      }
    } catch (error) {
      setMeshStatus({ kind: "mesh", state: "error", detail: error instanceof Error ? error.message : "Unable to start mesh" });
    }
  }, []);

  const stopMesh = useCallback(async () => {
    await MeshNative.stop();
    setMeshStatus(initialStatus);
  }, []);

  const queueMessage = useCallback(async (targetPeerId: string, body: string) => {
    if (!body.trim()) throw new Error("Message cannot be empty");
    if (!identity) throw new Error("Secure identity is still loading");
    const recipient = peers.find((peer) => peer.peerId === targetPeerId);
    if (!recipient?.encryptionPublicKey) {
      throw new Error("Recipient encryption key is not available; complete authenticated peer discovery first");
    }

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
    const localMessage: LocalMessage = {
      id: messageId,
      peerId: targetPeerId,
      body: body.trim(),
      createdAt: now,
      deliveryState: "queued",
    };
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
    setMessages((current) => ({
      ...current,
      [targetPeerId]: [...(current[targetPeerId] ?? []), localMessage],
    }));
    return localMessage;
  }, [identity, peers]);

  const value = useMemo(() => ({ peerId: identity?.peerId ?? null, meshStatus, peers, messages, startMesh, stopMesh, queueMessage }), [identity, meshStatus, peers, messages, startMesh, stopMesh, queueMessage]);
  return <SanketlyContext.Provider value={value}>{children}</SanketlyContext.Provider>;
}

export function useSanketly(): SanketlyContextValue {
  const context = useContext(SanketlyContext);
  if (!context) throw new Error("useSanketly must be used within SanketlyProvider");
  return context;
}
