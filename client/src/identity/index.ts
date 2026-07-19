import { get, set } from 'idb-keyval';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

export interface KeyPair {
  publicKey: string;
  secretKey: string;
}

export interface Identity {
  ed25519: KeyPair;
  x25519: KeyPair;
}

const IDENTITY_STORE_KEY = 'sanketly_identity';

export async function getOrCreateIdentity(): Promise<Identity> {
  const existing = await get<Identity>(IDENTITY_STORE_KEY);
  if (existing) {
    return existing;
  }

  // Generate new keys
  const signKeyPair = nacl.sign.keyPair();
  const boxKeyPair = nacl.box.keyPair();

  const newIdentity: Identity = {
    ed25519: {
      publicKey: naclUtil.encodeBase64(signKeyPair.publicKey),
      secretKey: naclUtil.encodeBase64(signKeyPair.secretKey),
    },
    x25519: {
      publicKey: naclUtil.encodeBase64(boxKeyPair.publicKey),
      secretKey: naclUtil.encodeBase64(boxKeyPair.secretKey),
    }
  };

  await set(IDENTITY_STORE_KEY, newIdentity);
  return newIdentity;
}

export async function signChallenge(challenge: string): Promise<string> {
  const identity = await get<Identity>(IDENTITY_STORE_KEY);
  if (!identity) {
    throw new Error('Identity not found. Call getOrCreateIdentity() first.');
  }

  const secretKey = naclUtil.decodeBase64(identity.ed25519.secretKey);
  const messageUint8 = naclUtil.decodeUTF8(challenge);

  const signature = nacl.sign.detached(messageUint8, secretKey);
  return naclUtil.encodeBase64(signature);
}
