import type {
  DeliveryState,
  MessageEnvelope,
  MeshPacket,
  MeshPeer,
  RelayQueueRecord,
  RouteCandidate,
  TransportKind,
  TransportMessage,
  TransportStatus,
} from "@sanketly/protocol";

export type {
  DeliveryState,
  MessageEnvelope,
  MeshPacket,
  MeshPeer,
  RelayQueueRecord,
  RouteCandidate,
  TransportKind,
  TransportMessage,
  TransportStatus,
};

export interface Conversation {
  id: string;
  peerId: string;
  title: string;
  lastMessage?: MessageEnvelope;
  unreadCount: number;
}

export interface OutboxRecord extends MessageEnvelope {
  meshPacket?: MeshPacket;
  attempts: number;
  lastAttemptAt?: number;
  lastError?: string;
}

export interface TransportAdapter {
  readonly kind: TransportKind;
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): TransportStatus;
  listPeers(): Promise<MeshPeer[]>;
  send(message: OutboxRecord): Promise<TransportMessage>;
  onMessage(listener: (message: TransportMessage) => void): () => void;
  onStatus(listener: (status: TransportStatus) => void): () => void;
}

export interface OutboxStore {
  list(): Promise<OutboxRecord[]>;
  upsert(record: OutboxRecord): Promise<void>;
  remove(messageId: string): Promise<void>;
  clear(): Promise<void>;
}

export function createConversationId(peerId: string): string {
  return `dm:${peerId}`;
}

export function nextDeliveryState(current: DeliveryState, next: DeliveryState): DeliveryState {
  const rank: Record<DeliveryState, number> = {
    queued: 0,
    relaying: 1,
    sent: 2,
    delivered: 3,
    read: 4,
    failed: -1,
    expired: -1,
  };
  if (next === "failed" || next === "expired") return next;
  return rank[next] >= rank[current] ? next : current;
}
