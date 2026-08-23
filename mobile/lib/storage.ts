import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import type { OutboxRecord } from "@sanketly/domain";

const OUTBOX_KEY = "sanketly.outbox.v1";
const PEER_ID_KEY = "sanketly.peer-id.v1";

export function createId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 12);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export async function loadPeerId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(PEER_ID_KEY);
  if (existing) return existing;
  const created = createId("peer");
  await SecureStore.setItemAsync(PEER_ID_KEY, created);
  return created;
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
