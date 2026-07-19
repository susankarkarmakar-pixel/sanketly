import request from 'supertest';
import app from './index';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

describe('Auth Routes', () => {
  const username = 'testuser123';
  let ed25519PublicKey: string;
  let ed25519SecretKey: Uint8Array;
  let x25519PublicKey: string;

  beforeAll(() => {
    // Generate test keys
    const signKeyPair = nacl.sign.keyPair();
    ed25519PublicKey = naclUtil.encodeBase64(signKeyPair.publicKey);
    ed25519SecretKey = signKeyPair.secretKey;

    const boxKeyPair = nacl.box.keyPair();
    x25519PublicKey = naclUtil.encodeBase64(boxKeyPair.publicKey);
  });

  it('should register a user successfully', async () => {
    const res = await request(app).post('/register').send({
      username,
      ed25519PublicKey,
      x25519PublicKey,
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('User registered successfully');
  });

  it('should reject registering an existing user', async () => {
    const res = await request(app).post('/register').send({
      username,
      ed25519PublicKey,
      x25519PublicKey,
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Username already exists');
  });

  it('should return a challenge for an existing user', async () => {
    const res = await request(app).post('/auth/challenge').send({
      username,
    });

    expect(res.status).toBe(200);
    expect(res.body.challenge).toBeDefined();
    expect(typeof res.body.challenge).toBe('string');
  });

  it('should successfully verify a correct signature and return a session token', async () => {
    // 1. Get a challenge
    const challengeRes = await request(app).post('/auth/challenge').send({
      username,
    });
    const challenge = challengeRes.body.challenge;

    // 2. Sign the challenge
    const messageUint8 = naclUtil.decodeUTF8(challenge);
    const signatureUint8 = nacl.sign.detached(messageUint8, ed25519SecretKey);
    const signature = naclUtil.encodeBase64(signatureUint8);

    // 3. Verify
    const verifyRes = await request(app).post('/auth/verify').send({
      username,
      challenge,
      signature,
    });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.sessionId).toBeDefined();
  });

  it('should reject an incorrect signature', async () => {
    // 1. Get a challenge
    const challengeRes = await request(app).post('/auth/challenge').send({
      username,
    });
    const challenge = challengeRes.body.challenge;

    // 2. Sign with a DIFFERENT key
    const differentKeyPair = nacl.sign.keyPair();
    const messageUint8 = naclUtil.decodeUTF8(challenge);
    const signatureUint8 = nacl.sign.detached(messageUint8, differentKeyPair.secretKey);
    const signature = naclUtil.encodeBase64(signatureUint8);

    // 3. Verify (should fail)
    const verifyRes = await request(app).post('/auth/verify').send({
      username,
      challenge,
      signature,
    });

    expect(verifyRes.status).toBe(401);
    expect(verifyRes.body.error).toBe('Invalid signature');
  });
});
