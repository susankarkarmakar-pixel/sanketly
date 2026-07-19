import { Router, Request, Response } from 'express';

export const prekeysRouter = Router();

interface UserPrekeys {
  identityKey: string;
  prekeys: { id: number; key: string }[];
}

// In-memory store for prekeys
const prekeyStore = new Map<string, UserPrekeys>();

prekeysRouter.post('/prekeys', (req: Request, res: Response) => {
  const { username, identityKey, prekeys } = req.body;

  if (!username || !identityKey || !prekeys || !Array.isArray(prekeys)) {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  // Overwrite existing or create new
  prekeyStore.set(username, { identityKey, prekeys });
  res.status(201).json({ message: 'Prekeys uploaded successfully' });
});

prekeysRouter.get('/prekeys/:username', (req: Request, res: Response) => {
  const { username } = req.params;
  const store = prekeyStore.get(username as string);

  if (!store) {
    return res.status(404).json({ error: 'User prekeys not found' });
  }

  if (store.prekeys.length === 0) {
    return res.status(404).json({ error: 'No prekeys left for user' });
  }

  // Pop a prekey
  const prekey = store.prekeys.shift();

  res.status(200).json({
    identityKey: store.identityKey,
    prekey
  });
});
