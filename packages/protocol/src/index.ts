export const PROTOCOL_VERSION = 1;
export const FRAME_MAGIC = new Uint8Array([0x53, 0x4b]);
export const DEFAULT_HOP_LIMIT = 3;
export const MAX_PACKET_BYTES = 4096;

export type MeshPacketType = "announce" | "handshake" | "message" | "ack";

export type TransportKind = "mesh" | "internet";
export type DeliveryState =
  | "queued"
  | "relaying"
  | "sent"
  | "delivered"
  | "read"
  | "expired"
  | "failed";

export interface MeshPacket {
  version: number;
  type: MeshPacketType;
  packetId: string;
  messageId?: string;
  senderId: string;
  recipientId?: string;
  createdAt: number;
  expiresAt: number;
  hopLimit: number;
  hopCount: number;
  ciphertext?: string;
  payload?: string;
  signature?: string;
}

export interface MessageEnvelope {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  ciphertext: string;
  createdAt: number;
  expiresAt: number;
  deliveryState: DeliveryState;
  transport?: TransportKind;
}

export interface MeshPeer {
  peerId: string;
  displayName?: string;
  lastSeenAt: number;
  verified: boolean;
  connectionState: "discovered" | "connecting" | "connected" | "unavailable";
  transport: "ble" | "internet";
}

export interface TransportStatus {
  kind: TransportKind;
  state: "disabled" | "starting" | "ready" | "error";
  detail?: string;
}

export interface TransportMessage {
  message: MessageEnvelope;
  packet: MeshPacket;
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entry]) => [key, stableValue(entry)]),
    );
  }
  return value;
}

function utf8Encode(value: string): Uint8Array {
  return new TextEncoder().encode(value);
}

function utf8Decode(value: Uint8Array): string {
  return new TextDecoder("utf-8", { fatal: true }).decode(value);
}

export function encodePacket(packet: MeshPacket): Uint8Array {
  if (packet.version !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocol version: ${packet.version}`);
  }
  if (packet.hopCount < 0 || packet.hopCount > packet.hopLimit) {
    throw new Error("Invalid hop count");
  }
  const body = utf8Encode(JSON.stringify(stableValue(packet)));
  const frame = new Uint8Array(FRAME_MAGIC.length + 1 + body.length);
  frame.set(FRAME_MAGIC, 0);
  frame[2] = packet.version;
  frame.set(body, 3);
  if (frame.byteLength > MAX_PACKET_BYTES) {
    throw new Error(`Packet exceeds ${MAX_PACKET_BYTES} bytes`);
  }
  return frame;
}

export function decodePacket(frame: Uint8Array): MeshPacket {
  if (frame.byteLength < 4 || frame[0] !== FRAME_MAGIC[0] || frame[1] !== FRAME_MAGIC[1]) {
    throw new Error("Invalid Sanketly frame header");
  }
  if (frame.byteLength > MAX_PACKET_BYTES) {
    throw new Error("Frame exceeds maximum packet size");
  }
  const version = frame[2];
  if (version !== PROTOCOL_VERSION) {
    throw new Error(`Unsupported protocol version: ${version}`);
  }
  const parsed: unknown = JSON.parse(utf8Decode(frame.slice(3)));
  if (!isMeshPacket(parsed)) throw new Error("Invalid mesh packet");
  return parsed;
}

export function isMeshPacket(value: unknown): value is MeshPacket {
  if (!value || typeof value !== "object") return false;
  const packet = value as Partial<MeshPacket>;
  return (
    packet.version === PROTOCOL_VERSION &&
    typeof packet.type === "string" &&
    ["announce", "handshake", "message", "ack"].includes(packet.type) &&
    typeof packet.packetId === "string" &&
    typeof packet.senderId === "string" &&
    typeof packet.createdAt === "number" &&
    typeof packet.expiresAt === "number" &&
    typeof packet.hopLimit === "number" &&
    typeof packet.hopCount === "number" &&
    packet.hopLimit >= 0 &&
    packet.hopCount >= 0 &&
    packet.hopCount <= packet.hopLimit
  );
}

export function canRelay(packet: MeshPacket, now = Date.now()): boolean {
  return packet.expiresAt > now && packet.hopCount < packet.hopLimit;
}

export function relayPacket(packet: MeshPacket): MeshPacket {
  if (!canRelay(packet)) throw new Error("Packet cannot be relayed");
  return { ...packet, hopCount: packet.hopCount + 1, packetId: `${packet.packetId}:${packet.hopCount + 1}` };
}

export class DeduplicationCache {
  private readonly entries = new Map<string, number>();

  constructor(private readonly maxEntries = 2048, private readonly retentionMs = 7 * 24 * 60 * 60 * 1000) {}

  has(id: string, now = Date.now()): boolean {
    this.prune(now);
    return this.entries.has(id);
  }

  remember(id: string, now = Date.now()): boolean {
    this.prune(now);
    if (this.entries.has(id)) return false;
    this.entries.set(id, now);
    while (this.entries.size > this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
    return true;
  }

  get size(): number {
    return this.entries.size;
  }

  private prune(now: number): void {
    for (const [id, timestamp] of this.entries) {
      if (now - timestamp > this.retentionMs) this.entries.delete(id);
    }
  }
}

export function createMessagePacket(input: {
  packetId: string;
  messageId: string;
  senderId: string;
  recipientId: string;
  ciphertext: string;
  now?: number;
  ttlMs?: number;
  hopLimit?: number;
}): MeshPacket {
  const now = input.now ?? Date.now();
  return {
    version: PROTOCOL_VERSION,
    type: "message",
    packetId: input.packetId,
    messageId: input.messageId,
    senderId: input.senderId,
    recipientId: input.recipientId,
    createdAt: now,
    expiresAt: now + (input.ttlMs ?? 7 * 24 * 60 * 60 * 1000),
    hopLimit: input.hopLimit ?? DEFAULT_HOP_LIMIT,
    hopCount: 0,
    ciphertext: input.ciphertext,
  };
}
