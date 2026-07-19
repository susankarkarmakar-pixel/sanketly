import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export const groupsRouter = Router();

export interface Group {
  groupId: string;
  name: string;
  members: string[]; // usernames
}

export const groupStore = new Map<string, Group>();

groupsRouter.post('/groups', (req: Request, res: Response) => {
  const { name, members, username } = req.body;

  if (!name || !members || !Array.isArray(members) || !username) {
    return res.status(400).json({ error: 'Missing or invalid required fields' });
  }

  const uniqueMembers = new Set(members);
  uniqueMembers.add(username);

  const groupId = uuidv4();
  const group: Group = {
    groupId,
    name,
    members: Array.from(uniqueMembers) as string[],
  };

  groupStore.set(groupId, group);
  res.status(201).json({ groupId });
});

groupsRouter.get('/groups/:groupId', (req: Request, res: Response) => {
  const groupId = req.params.groupId as string;
  const group = groupStore.get(groupId);

  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  res.status(200).json({
    name: group.name,
    members: group.members,
  });
});
