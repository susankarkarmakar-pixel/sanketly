import { io, Socket } from 'socket.io-client';
import { getOrCreateIdentity, signChallenge } from '../identity';
import * as crypto from '@sanketly/crypto';
import { v4 as uuidv4 } from 'uuid';

let socket: Socket | null = null;

let localUsername: string | null = null;
let localIdentity: any = null; // proteus identity key pair

export type MessageCallback = (message: { fromUsername: string; content: string; clientMessageId: string; serverTimestamp: number }) => void;
export type ErrorCallback = (error: { error: string; clientMessageId: string }) => void;

const messageListeners: MessageCallback[] = [];
const errorListeners: ErrorCallback[] = [];

const SERVER_URL = 'http://localhost:4000';

export async function connectTransport(username: string) {
  if (socket?.connected) {
    return;
  }

  localUsername = username;

  await crypto.initCrypto();

  // Note: we can use the identity generated in Phase 1 for signing/auth,
  // but Proteus requires its own specific IdentityKeyPair format.
  // For now, let's generate a Proteus Identity for E2E separately or assume `getOrCreateIdentity` handles it.
  // Actually, since the prompt says "layered on top of existing identity", we should probably
  // just generate the Proteus keys and register them to the prekey server, independent of the auth key.

  const authIdentity = await getOrCreateIdentity();

  // Check if we have a Proteus identity stored yet.
  let proteusIdentityJson = localStorage.getItem(`proteus_identity_${username}`);
  if (!proteusIdentityJson) {
    localIdentity = crypto.generateIdentityKeyPair();
    localStorage.setItem(`proteus_identity_${username}`, crypto.serializeIdentityKeyPair(localIdentity));

    // Also generate prekeys and upload them
    const prekeys = [];
    for (let i = 1; i <= 10; i++) {
        const pk = crypto.generatePreKey(i);
        prekeys.push({ id: i, key: crypto.serializePreKey(pk) });
        localStorage.setItem(`proteus_prekey_${username}_${i}`, crypto.serializePreKey(pk));
    }

    await fetch(`${SERVER_URL}/prekeys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            identityKey: crypto.serializeIdentityKeyPair(localIdentity),
            prekeys
        })
    });
  } else {
    localIdentity = crypto.deserializeIdentityKeyPair(proteusIdentityJson);
  }

  // 1. Try to register (fail gracefully if already exists)
  try {
    await fetch(`${SERVER_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        ed25519PublicKey: authIdentity.ed25519.publicKey,
        x25519PublicKey: authIdentity.x25519.publicKey,
      })
    });
  } catch (e) {}

  // 2. Get challenge
  const challengeRes = await fetch(`${SERVER_URL}/auth/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username })
  });

  if (!challengeRes.ok) throw new Error('Failed to get challenge');
  const { challenge } = await challengeRes.json();

  // 3. Sign challenge
  const signature = await signChallenge(challenge);

  // 4. Verify & get session
  const verifyRes = await fetch(`${SERVER_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, challenge, signature })
  });

  if (!verifyRes.ok) throw new Error('Failed to verify challenge');

  const { sessionId } = await verifyRes.json();


  // 5. Connect Socket
  socket = io(SERVER_URL, {
    auth: { sessionId }
  });

  socket.on('message:receive', async (data) => {
    // data.content is an Envelope ciphertext now. We must decrypt it.
    try {
        let session = await crypto.loadSession(data.fromUsername, localIdentity);

        let envelope = crypto.deserializeEnvelope(data.content);

        let plaintext: string;
        if (!session) {
            // First message, it's a PreKey message.
            // We need our prekey to decrypt. It's stored in localStorage in this simplified setup.
            // (Assuming it was a PreKey message and it used one of our prekeys)
            // The crypto package expects an array of prekeys in initSessionAsReceiver
            const prekeys = [];
            for (let i = 1; i <= 10; i++) {
                const pkJson = localStorage.getItem(`proteus_prekey_${localUsername}_${i}`);
                if (pkJson) prekeys.push(crypto.deserializePreKey(pkJson));
            }

            const result = await crypto.initSessionAsReceiver(
                data.fromUsername,
                localIdentity,
                prekeys,
                envelope
            );
            session = result[0];
            plaintext = new TextDecoder().decode(result[1]);
        } else {
            plaintext = await crypto.decryptMessage(data.fromUsername, session, envelope);
        }

        data.content = plaintext;
        messageListeners.forEach(cb => cb(data));
    } catch (e) {
        console.error("Failed to decrypt message from", data.fromUsername, e);
    }
  });

  socket.on('message:error', (data) => {
    errorListeners.forEach(cb => cb(data));
  });

  return new Promise<void>((resolve, reject) => {
    socket!.on('connect', () => resolve());
    socket!.on('connect_error', (err) => reject(err));
  });
}

export async function sendMessage(toUsername: string, plaintext: string): Promise<string> {
  if (!socket || !socket.connected) {
    throw new Error('Transport not connected');
  }

  // E2E Encrypt the message
  let session = await crypto.loadSession(toUsername, localIdentity);

  if (!session) {
      // Need to fetch prekey bundle from server
      const res = await fetch(`${SERVER_URL}/prekeys/${toUsername}`);
      if (!res.ok) throw new Error('Could not fetch prekeys for user');
      const { identityKey, prekey } = await res.json();

      const remoteIdentity = crypto.deserializeIdentityKeyPair(identityKey);
      const remotePreKey = crypto.deserializePreKey(prekey.key);
      const bundle = await crypto.constructPreKeyBundle(
          remoteIdentity,
          remotePreKey
      );

      session = await crypto.initSessionAsSender(toUsername, localIdentity, bundle);
  }

  const envelope = await crypto.encryptMessage(toUsername, session, plaintext);
  const ciphertextBase64 = crypto.serializeEnvelope(envelope);

  const clientMessageId = uuidv4();

  socket.emit('message:send', {
    toUsername,
    content: ciphertextBase64,
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

  localUsername = null;
  localIdentity = null;
}
