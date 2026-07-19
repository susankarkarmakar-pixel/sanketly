import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectTransport, disconnectTransport, sendMessage, onMessage, onError } from './index';
import * as crypto from '@sanketly/crypto';

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as any;

// Mock idb-keyval to avoid indexedDB errors in jsdom
const mockStore = new Map<string, any>();
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => mockStore.get(key)),
  set: vi.fn(async (key: string, val: any) => mockStore.set(key, val)),
}));

// Mock socket.io-client
let mockSocketEmit = vi.fn();
let mockSocketOn = vi.fn();
let mockSocketDisconnect = vi.fn();

const mockSocketInstance = {
  connected: false,
  emit: (...args: any[]) => mockSocketEmit(...args),
  on: (...args: any[]) => mockSocketOn(...args),
  disconnect: () => {
    mockSocketInstance.connected = false;
    mockSocketDisconnect();
  },
};

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => {
    mockSocketInstance.connected = true;
    return mockSocketInstance;
  }),
}));

// Mock identity module
vi.mock('../identity', () => ({
  getOrCreateIdentity: vi.fn().mockResolvedValue({
    ed25519: { publicKey: 'ed25519-pub', secretKey: 'ed25519-sec' },
    x25519: { publicKey: 'x25519-pub', secretKey: 'x25519-sec' },
  }),
  signChallenge: vi.fn().mockResolvedValue('mock-signature'),
}));

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-1234'),
}));

describe('Transport Module with Crypto', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockStore.clear();
    mockSocketInstance.connected = false;
    localStorage.clear();

    await crypto.initCrypto();

    mockFetch.mockImplementation(async (url: string) => {
      if (url.endsWith('/register') || url.endsWith('/prekeys')) {
        return { ok: true };
      }
      if (url.endsWith('/auth/challenge')) {
        return { ok: true, json: async () => ({ challenge: 'mock-challenge' }) };
      }
      if (url.endsWith('/auth/verify')) {
        return { ok: true, json: async () => ({ sessionId: 'mock-session-id' }) };
      }
      if (url.includes('/prekeys/')) {
        // Mock returning a prekey bundle for the recipient
        const remoteId = crypto.generateIdentityKeyPair();
        const remotePreKey = crypto.generatePreKey(1);
        return {
          ok: true,
          json: async () => ({
            identityKey: crypto.serializeIdentityKeyPair(remoteId),
            prekey: {
              id: 1,
              key: crypto.serializePreKey(remotePreKey)
            }
          })
        };
      }
      return { ok: false };
    });

    mockSocketOn.mockImplementation((event, callback) => {
      if (event === 'connect') {
        setTimeout(callback, 0);
      }
    });
  });

  afterEach(() => {
    disconnectTransport();
  });

  it('should authenticate and connect socket successfully', async () => {
    await connectTransport('testuser');

    // Should fetch register auth, challenge, verify, and prekeys POST
    expect(mockFetch).toHaveBeenCalledTimes(4);
    expect(mockSocketInstance.connected).toBe(true);
  });

  it('should encrypt message before emitting to socket', async () => {
    await connectTransport('alice');

    const msgId = await sendMessage('bob', 'Hello Bob');

    expect(msgId).toBe('mock-uuid-1234');
    expect(mockSocketEmit).toHaveBeenCalledTimes(1);

    const [event, payload] = mockSocketEmit.mock.calls[0];
    expect(event).toBe('message:send');
    expect(payload.toUsername).toBe('bob');
    expect(payload.clientMessageId).toBe('mock-uuid-1234');

    // The content must NOT be plaintext
    expect(payload.content).not.toContain('Hello Bob');
    // Content should be a base64 serialized Envelope
    expect(typeof payload.content).toBe('string');

    // Try deserializing it to ensure it is valid
    const envelope = crypto.deserializeEnvelope(payload.content);
    expect(envelope).toBeDefined();
  });
});
