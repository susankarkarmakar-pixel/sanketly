import { io, Socket } from 'socket.io-client';
import { getOrCreateIdentity, signChallenge } from '../identity';
import { v4 as uuidv4 } from 'uuid';

let socket: Socket | null = null;
let currentSessionId: string | null = null;

export type MessageCallback = (message: { fromUsername: string; content: string; clientMessageId: string; serverTimestamp: number }) => void;
export type ErrorCallback = (error: { error: string; clientMessageId: string }) => void;

const messageListeners: MessageCallback[] = [];
const errorListeners: ErrorCallback[] = [];

// For the sake of this mock/demo, hardcode the server URL
// In reality, this would come from an environment variable.
const SERVER_URL = 'http://localhost:4000';

export async function connectTransport(username: string) {
  if (socket?.connected) {
    return;
  }

  const identity = await getOrCreateIdentity();

  // 1. Try to register (fail gracefully if already exists)
  try {
    await fetch(`${SERVER_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        ed25519PublicKey: identity.ed25519.publicKey,
        x25519PublicKey: identity.x25519.publicKey,
      })
    });
  } catch (e) {
    // Ignore network errors here for simplicity,
    // or handle conflict if user already registered.
  }

  // 2. Get challenge
  const challengeRes = await fetch(`${SERVER_URL}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });

  if (!challengeRes.ok) {
    throw new Error('Failed to get challenge');
  }
  const { challenge } = await challengeRes.json();

  // 3. Sign challenge
  const signature = await signChallenge(challenge);

  // 4. Verify & get session
  const verifyRes = await fetch(`${SERVER_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, challenge, signature })
  });

  if (!verifyRes.ok) {
    throw new Error('Failed to verify challenge');
  }

  const { sessionId } = await verifyRes.json();
  currentSessionId = sessionId;

  // 5. Connect Socket
  socket = io(SERVER_URL, {
    auth: { sessionId }
  });

  socket.on('message:receive', (data) => {
    messageListeners.forEach(cb => cb(data));
  });

  socket.on('message:error', (data) => {
    errorListeners.forEach(cb => cb(data));
  });

  return new Promise<void>((resolve, reject) => {
    socket!.on('connect', () => resolve());
    socket!.on('connect_error', (err) => reject(err));
  });
}

export function sendMessage(toUsername: string, content: string): string {
  if (!socket || !socket.connected) {
    throw new Error('Transport not connected');
  }

  const clientMessageId = uuidv4();

  socket.emit('message:send', {
    toUsername,
    content,
    clientMessageId
  });

  return clientMessageId;
}

export function onMessage(callback: MessageCallback) {
  messageListeners.push(callback);
  return () => {
    const index = messageListeners.indexOf(callback);
    if (index > -1) {
      messageListeners.splice(index, 1);
    }
  };
}

export function onError(callback: ErrorCallback) {
  errorListeners.push(callback);
  return () => {
    const index = errorListeners.indexOf(callback);
    if (index > -1) {
      errorListeners.splice(index, 1);
    }
  };
}

export function disconnectTransport() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  currentSessionId = null;
}
