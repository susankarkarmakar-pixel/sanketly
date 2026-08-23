import type { OutboxRecord } from "@sanketly/domain";
import type { MeshPeer, TransportStatus } from "@sanketly/protocol";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { MeshNative } from "@/modules/sanketly-mesh/src";
import { createId, loadPeerId, MobileOutboxStore } from "./storage";

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
  const [peerId, setPeerId] = useState<string | null>(null);
  const [meshStatus, setMeshStatus] = useState<TransportStatus>(initialStatus);
  const [peers, setPeers] = useState<MeshPeer[]>([]);
  const [messages, setMessages] = useState<Record<string, LocalMessage[]>>({});

  useEffect(() => {
    void loadPeerId().then(setPeerId);
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
    if (!peerId) throw new Error("Local identity is still loading");

    const now = Date.now();
    const localMessage: LocalMessage = {
      id: createId("message"),
      peerId: targetPeerId,
      body: body.trim(),
      createdAt: now,
      deliveryState: "queued",
    };
    const outboxRecord: OutboxRecord = {
      messageId: localMessage.id,
      conversationId: `dm:${targetPeerId}`,
      senderId: peerId,
      recipientId: targetPeerId,
      ciphertext: "pending-native-encryption",
      createdAt: now,
      expiresAt: now + 7 * 24 * 60 * 60 * 1000,
      deliveryState: "queued",
      attempts: 0,
    };
    await outbox.upsert(outboxRecord);
    setMessages((current) => ({
      ...current,
      [targetPeerId]: [...(current[targetPeerId] ?? []), localMessage],
    }));
    return localMessage;
  }, [peerId]);

  const value = useMemo(() => ({ peerId, meshStatus, peers, messages, startMesh, stopMesh, queueMessage }), [peerId, meshStatus, peers, messages, startMesh, stopMesh, queueMessage]);
  return <SanketlyContext.Provider value={value}>{children}</SanketlyContext.Provider>;
}

export function useSanketly(): SanketlyContextValue {
  const context = useContext(SanketlyContext);
  if (!context) throw new Error("useSanketly must be used within SanketlyProvider");
  return context;
}
