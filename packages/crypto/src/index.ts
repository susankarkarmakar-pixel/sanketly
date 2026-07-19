import * as proteus from '@wireapp/proteus';
import libsodium from 'libsodium-wrappers-sumo';
import { get, set } from 'idb-keyval';
import { Buffer } from 'buffer';

export async function initCrypto() {
  await libsodium.ready;
}

export function generateKeyPair(): proteus.keys.KeyPair {
  const kp = libsodium.crypto_sign_keypair();
  return new proteus.keys.KeyPair(
    proteus.keys.KeyPair.construct_public_key(kp),
    proteus.keys.KeyPair.construct_private_key(kp)
  );
}

export function generateIdentityKeyPair(): proteus.keys.IdentityKeyPair {
  const kp = generateKeyPair();
  const idKey = new proteus.keys.IdentityKey(kp.public_key);
  return new proteus.keys.IdentityKeyPair(idKey, kp.secret_key);
}

export function generatePreKey(id: number): proteus.keys.PreKey {
  const kp = generateKeyPair();
  return new proteus.keys.PreKey(id, kp);
}

// Convert ArrayBuffer to base64 for easy JSON storage in idb (if ArrayBuffer isn't supported directly everywhere)
function bufferToBase64(buf: ArrayBuffer): string {
  return Buffer.from(buf).toString('base64');
}

function base64ToBuffer(b64: string): ArrayBuffer {
  const b = Buffer.from(b64, 'base64');
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

const SESSION_PREFIX = 'proteus_session_';

class SimplePreKeyStore extends proteus.session.PreKeyStore {
  constructor(private preKeys: Map<number, proteus.keys.PreKey>) {
    super();
  }
  async load_prekey(id: number) {
    return this.preKeys.get(id);
  }
  async delete_prekey(id: number) {
    this.preKeys.delete(id);
    return 1;
  }
}

export async function loadSession(username: string, identity: proteus.keys.IdentityKeyPair): Promise<proteus.session.Session | null> {
  const b64 = await get<string>(`${SESSION_PREFIX}${username}`);
  if (!b64) return null;
  return proteus.session.Session.deserialise(identity, base64ToBuffer(b64));
}

export async function saveSession(username: string, session: proteus.session.Session) {
  const buf = session.serialise();
  await set(`${SESSION_PREFIX}${username}`, bufferToBase64(buf));
}

export async function initSessionAsSender(
  recipientUsername: string,
  myIdentity: proteus.keys.IdentityKeyPair,
  recipientBundle: proteus.keys.PreKeyBundle
): Promise<proteus.session.Session> {
  const session = proteus.session.Session.init_from_prekey(myIdentity, recipientBundle);
  await saveSession(recipientUsername, session);
  return session;
}

export async function initSessionAsReceiver(
  senderUsername: string,
  myIdentity: proteus.keys.IdentityKeyPair,
  preKeys: proteus.keys.PreKey[],
  envelope: proteus.message.Envelope
): Promise<[proteus.session.Session, Uint8Array]> {
  const preKeyMap = new Map<number, proteus.keys.PreKey>();
  for (const pk of preKeys) {
    preKeyMap.set(pk.key_id, pk);
  }
  const store = new SimplePreKeyStore(preKeyMap);
  const [session, plaintext] = await proteus.session.Session.init_from_message(myIdentity, store, envelope);
  await saveSession(senderUsername, session);
  return [session, plaintext];
}

export async function encryptMessage(
  recipientUsername: string,
  session: proteus.session.Session,
  plaintext: string
): Promise<proteus.message.Envelope> {
  const envelope = proteus.session.Session.encrypt(session, plaintext);
  await saveSession(recipientUsername, session);
  return envelope;
}

export async function decryptMessage(
  senderUsername: string,
  session: proteus.session.Session,
  envelope: proteus.message.Envelope
): Promise<string> {
  // Pass an empty store if it's not a prekey message anymore
  const store = new SimplePreKeyStore(new Map());
  const ptBytes = await session.decrypt(store, envelope);
  await saveSession(senderUsername, session);
  return new TextDecoder().decode(ptBytes);
}

// Helper to encode/decode bundle
export function serializePreKeyBundle(bundle: proteus.keys.PreKeyBundle): string {
  return bufferToBase64(bundle.serialise());
}

export function deserializePreKeyBundle(b64: string): proteus.keys.PreKeyBundle {
  return proteus.keys.PreKeyBundle.deserialise(base64ToBuffer(b64));
}

export function serializeIdentityKeyPair(kp: proteus.keys.IdentityKeyPair): string {
  return bufferToBase64(kp.serialise());
}

export function deserializeIdentityKeyPair(b64: string): proteus.keys.IdentityKeyPair {
  return proteus.keys.IdentityKeyPair.deserialise(base64ToBuffer(b64));
}

export function serializeEnvelope(env: proteus.message.Envelope): string {
  return bufferToBase64(env.serialise());
}

export function deserializeEnvelope(b64: string): proteus.message.Envelope {
  return proteus.message.Envelope.deserialise(base64ToBuffer(b64));
}

// Helpers for serializing/deserializing PreKeys to/from indexedDb (or sending them)
export function serializePreKey(pk: proteus.keys.PreKey): string {
  return bufferToBase64(pk.serialise());
}
export function deserializePreKey(b64: string): proteus.keys.PreKey {
  return proteus.keys.PreKey.deserialise(base64ToBuffer(b64));
}

export async function constructPreKeyBundle(
  remoteIdentity: proteus.keys.IdentityKeyPair,
  remotePreKey: proteus.keys.PreKey
): Promise<proteus.keys.PreKeyBundle> {
  return new (await import('@wireapp/proteus')).keys.PreKeyBundle(
    remoteIdentity.public_key,
    remotePreKey
  );
}
