import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';
import { users, challenges, sessions } from '../state';

export const authRouter = Router();

authRouter.post('/register', (req: Request, res: Response) => {
  const { username, ed25519PublicKey, x25519PublicKey } = req.body;

  if (!username || !ed25519PublicKey || !x25519PublicKey) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (users.has(username)) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  users.set(username, { username, ed25519PublicKey, x25519PublicKey });
  res.status(201).json({ message: 'User registered successfully' });
});

authRouter.post('/auth/challenge', (req: Request, res: Response) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Missing username' });
  }

  if (!users.has(username)) {
    return res.status(404).json({ error: 'User not found' });
  }

  const challenge = uuidv4();
  challenges.set(username, challenge);

  res.status(200).json({ challenge });
});

authRouter.post('/auth/verify', (req: Request, res: Response) => {
  const { username, challenge, signature } = req.body;

  if (!username || !challenge || !signature) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const user = users.get(username);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const expectedChallenge = challenges.get(username);
  if (!expectedChallenge || expectedChallenge !== challenge) {
    return res.status(401).json({ error: 'Invalid or expired challenge' });
  }

  try {
    const signatureUint8 = naclUtil.decodeBase64(signature);
    const messageUint8 = naclUtil.decodeUTF8(challenge);
    const publicKeyUint8 = naclUtil.decodeBase64(user.ed25519PublicKey);

    const isValid = nacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);

    if (isValid) {
      // Clear the challenge after successful use
      challenges.delete(username);

      const sessionId = uuidv4();
      sessions.set(sessionId, username);

      return res.status(200).json({ sessionId });
    } else {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (error) {
    return res.status(401).json({ error: 'Error verifying signature' });
  }
});
