import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { connectTransport, disconnectTransport, sendMessage, onMessage, onError } from './index';

// Mock node-fetch (global.fetch)
const mockFetch = vi.fn();
global.fetch = mockFetch;

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

describe('Transport Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocketInstance.connected = false;

    // Default fetch mock behavior
    mockFetch.mockImplementation((url) => {
      if (url.endsWith('/register')) {
        return Promise.resolve({ ok: true });
      }
      if (url.endsWith('/auth/challenge')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ challenge: 'mock-challenge' }) });
      }
      if (url.endsWith('/auth/verify')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ sessionId: 'mock-session-id' }) });
      }
      return Promise.resolve({ ok: false });
    });

    // Mock socket on('connect') callback invocation
    mockSocketOn.mockImplementation((event, callback) => {
      if (event === 'connect') {
        setTimeout(callback, 0); // Simulate asynchronous connection success
      }
    });
  });

  afterEach(() => {
    disconnectTransport();
  });

  it('should authenticate and connect socket successfully', async () => {
    await connectTransport('testuser');

    expect(mockFetch).toHaveBeenCalledTimes(3); // register, challenge, verify
    expect(mockSocketInstance.connected).toBe(true);
  });

  it('should fail to send a message if not connected', () => {
    expect(() => sendMessage('bob', 'Hello')).toThrow('Transport not connected');
  });

  it('should emit message:send with correct payload when connected', async () => {
    await connectTransport('alice');

    const msgId = sendMessage('bob', 'Hello Bob');

    expect(msgId).toBe('mock-uuid-1234');
    expect(mockSocketEmit).toHaveBeenCalledWith('message:send', {
      toUsername: 'bob',
      content: 'Hello Bob',
      clientMessageId: 'mock-uuid-1234'
    });
  });

  it('should trigger onMessage callback when message:receive is received', async () => {
    await connectTransport('alice');

    const messageCallback = vi.fn();
    const unsubscribe = onMessage(messageCallback);

    // Find the registered handler for 'message:receive' and call it
    const receiveHandlerCall = mockSocketOn.mock.calls.find(call => call[0] === 'message:receive');
    expect(receiveHandlerCall).toBeDefined();

    const handler = receiveHandlerCall[1];
    const incomingPayload = { fromUsername: 'bob', content: 'Hi', clientMessageId: 'msg-1', serverTimestamp: 123 };
    handler(incomingPayload);

    expect(messageCallback).toHaveBeenCalledWith(incomingPayload);

    unsubscribe();
  });

  it('should trigger onError callback when message:error is received', async () => {
    await connectTransport('alice');

    const errorCallback = vi.fn();
    const unsubscribe = onError(errorCallback);

    // Find the registered handler for 'message:error' and call it
    const errorHandlerCall = mockSocketOn.mock.calls.find(call => call[0] === 'message:error');
    expect(errorHandlerCall).toBeDefined();

    const handler = errorHandlerCall[1];
    const errorPayload = { error: 'User is offline', clientMessageId: 'mock-uuid-1234' };
    handler(errorPayload);

    expect(errorCallback).toHaveBeenCalledWith(errorPayload);

    unsubscribe();
  });
});
