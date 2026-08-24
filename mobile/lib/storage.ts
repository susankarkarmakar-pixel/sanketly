import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { OutboxRecord } from "@sanketly/domain";
import { MAX_RELAY_QUEUE_ITEMS, type RelayQueueRecord } from "@sanketly/protocol";
import { generateMeshIdentity, type MeshIdentity } from "@sanketly/mesh-crypto";

const OUTBOX_KEY = "sanketly.outbox.v1";
const RELAY_QUEUE_KEY = "sanketly.relay-queue.v1";
const MESH_IDENTITY_KEY = "sanketly.mesh-identity.v1";

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 12);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

function isMeshIdentity(value: unknown): value is MeshIdentity {
  if (!value || typeof value !== "object") return false;
  const identity = value as Partial<MeshIdentity>;
  return [
    "peerId",
    "signingPublicKey",
    "signingPrivateKey",
    "encryptionPublicKey",
    "encryptionPrivateKey",
  ].every((key) => typeof identity[key as keyof MeshIdentity] === "string");
}

export async function loadMeshIdentity(): Promise<MeshIdentity> {
  const existing = await SecureStore.getItemAsync(MESH_IDENTITY_KEY);
  if (existing) {
    try {
      const parsed: unknown = JSON.parse(existing);
      if (isMeshIdentity(parsed)) return parsed;
    } catch {
      // Corrupt identity records are replaced with a new identity below.
    }
  }
  const created = await generateMeshIdentity();
  await SecureStore.setItemAsync(MESH_IDENTITY_KEY, JSON.stringify(created));
  return created;
}

export async function loadPeerId(): Promise<string> {
  return (await loadMeshIdentity()).peerId;
}

export async function loadOutbox(): Promise<OutboxRecord[]> {
  const raw = await AsyncStorage.getItem(OUTBOX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxRecord[]) : [];
  } catch {
    return [];
  }
}

export async function saveOutbox(records: OutboxRecord[]): Promise<void> {
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(records));
}

async function loadRelayQueue(): Promise<RelayQueueRecord[]> {
  const raw = await AsyncStorage.getItem(RELAY_QUEUE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RelayQueueRecord[]) : [];
  } catch {
    return [];
  }
}

async function saveRelayQueue(records: RelayQueueRecord[]): Promise<void> {
  await AsyncStorage.setItem(RELAY_QUEUE_KEY, JSON.stringify(records.slice(-MAX_RELAY_QUEUE_ITEMS)));
}

export class MobileRelayQueueStore {
  async list(): Promise<RelayQueueRecord[]> {
    return loadRelayQueue();
  }

  async upsert(record: RelayQueueRecord): Promise<void> {
    const records = await loadRelayQueue();
    const index = records.findIndex((entry) => entry.queueId === record.queueId);
    if (index === -1) records.push(record);
    else records[index] = record;
    await saveRelayQueue(records);
  }

  async remove(queueId: string): Promise<void> {
    const records = await loadRelayQueue();
    await saveRelayQueue(records.filter((entry) => entry.queueId !== queueId));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(RELAY_QUEUE_KEY);
  }
}

export class MobileOutboxStore {
  async list(): Promise<OutboxRecord[]> {
    return loadOutbox();
  }

  async upsert(record: OutboxRecord): Promise<void> {
    const records = await loadOutbox();
    const index = records.findIndex((entry) => entry.messageId === record.messageId);
    if (index === -1) records.push(record);
    else records[index] = record;
    await saveOutbox(records);
  }

  async remove(messageId: string): Promise<void> {
    const records = await loadOutbox();
    await saveOutbox(records.filter((entry) => entry.messageId !== messageId));
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(OUTBOX_KEY);
  }
}
