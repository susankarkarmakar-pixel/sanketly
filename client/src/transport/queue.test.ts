import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectTransport, disconnectTransport, sendMessage, sendGroupMessage, onMessage } from './index';
import * as crypto from '@sanketly/crypto';

// Mock fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch as any;

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

describe('Transport Module - TTL and Offline Queues', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
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

  it('should include expiresInSeconds when sending a 1:1 message', async () => {
    await connectTransport('alice');

    await sendMessage('bob', 'Hello Bob', 3600);

    expect(mockSocketEmit).toHaveBeenCalledTimes(1);

    const [event, payload] = mockSocketEmit.mock.calls[0];
    expect(event).toBe('message:send');
    expect(payload.toUsername).toBe('bob');
    expect(payload.expiresInSeconds).toBe(3600);
  });

  it('should process flushed queue messages in order', async () => {
    await connectTransport('bob');

    const receivedMessages: string[] = [];
    const unsubscribe = onMessage((msg) => {
      receivedMessages.push(msg.content);
    });

    const receiveHandlerCall = mockSocketOn.mock.calls.find(call => call[0] === 'message:receive');
    const handler = receiveHandlerCall![1];

    const aliceId = crypto.generateIdentityKeyPair();

    const bobIdJson = localStorage.getItem('proteus_identity_bob');
    if (!bobIdJson) {
      throw new Error('Bob identity not found in localStorage. Was connectTransport successful?');
    }
    const bobId = crypto.deserializeIdentityKeyPair(bobIdJson!);
    const bobPreKey = crypto.deserializePreKey(localStorage.getItem('proteus_prekey_bob_1')!);

    const bobBundle = await crypto.constructPreKeyBundle(bobId, bobPreKey);
    const aliceSession = await crypto.initSessionAsSender('bob', aliceId, bobBundle);

    const msg1 = crypto.serializeEnvelope(await crypto.encryptMessage('bob', aliceSession, 'First Message'));
    const msg2 = crypto.serializeEnvelope(await crypto.encryptMessage('bob', aliceSession, 'Second Message'));
    const msg3 = crypto.serializeEnvelope(await crypto.encryptMessage('bob', aliceSession, 'Third Message'));

    // Simulate socket incoming messages (simulating queue flush)
    await handler({ fromUsername: 'alice', content: msg1, clientMessageId: 'id-1', serverTimestamp: 1 });
    await handler({ fromUsername: 'alice', content: msg2, clientMessageId: 'id-2', serverTimestamp: 2 });
    await handler({ fromUsername: 'alice', content: msg3, clientMessageId: 'id-3', serverTimestamp: 3 });

    // Ensure we await any async hooks in message:receive (crypto decrypts async)
    await new Promise(r => setTimeout(r, 100));

    expect(receivedMessages.length).toBe(3);
    expect(receivedMessages).toEqual(['First Message', 'Second Message', 'Third Message']);

    unsubscribe();
  });
});
