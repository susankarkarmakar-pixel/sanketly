import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getOrCreateIdentity, signChallenge, Identity } from './index';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

// Mock idb-keyval
const mockStore = new Map<string, any>();

vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => mockStore.get(key)),
  set: vi.fn(async (key: string, val: any) => mockStore.set(key, val)),
}));

describe('Identity Module', () => {
  beforeEach(() => {
    mockStore.clear();
    vi.clearAllMocks();
  });

  it('should generate and return a new identity if none exists', async () => {
    const identity = await getOrCreateIdentity();

    expect(identity).toBeDefined();
    expect(identity.ed25519).toBeDefined();
    expect(identity.x25519).toBeDefined();

    expect(typeof identity.ed25519.publicKey).toBe('string');
    expect(typeof identity.ed25519.secretKey).toBe('string');
    expect(typeof identity.x25519.publicKey).toBe('string');
    expect(typeof identity.x25519.secretKey).toBe('string');

    // Check if stored in our mock store
    expect(mockStore.has('sanketly_identity')).toBe(true);
  });

  it('should return the existing identity if one already exists', async () => {
    const firstIdentity = await getOrCreateIdentity();
    const secondIdentity = await getOrCreateIdentity();

    expect(firstIdentity).toEqual(secondIdentity);
  });

  it('should correctly sign a challenge string', async () => {
    const identity = await getOrCreateIdentity();
    const challenge = 'random-challenge-string-123';

    const signatureBase64 = await signChallenge(challenge);
    expect(signatureBase64).toBeDefined();
    expect(typeof signatureBase64).toBe('string');

    // Verify signature to ensure it's valid
    const signatureUint8 = naclUtil.decodeBase64(signatureBase64);
    const messageUint8 = naclUtil.decodeUTF8(challenge);
    const publicKeyUint8 = naclUtil.decodeBase64(identity.ed25519.publicKey);

    const isValid = nacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);
    expect(isValid).toBe(true);
  });

  it('should throw an error if signChallenge is called before identity creation', async () => {
    await expect(signChallenge('test-challenge')).rejects.toThrow('Identity not found. Call getOrCreateIdentity() first.');
  });
});
