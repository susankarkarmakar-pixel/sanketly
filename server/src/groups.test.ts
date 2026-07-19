import request from 'supertest';
import app from './index';

describe('Group Routes', () => {
  const username = 'creator';
  const name = 'My Test Group';
  const members = ['user1', 'user2'];
  let groupId: string;

  it('should create a group successfully', async () => {
    const res = await request(app).post('/groups').send({
      name,
      members,
      username,
    });

    expect(res.status).toBe(201);
    expect(res.body.groupId).toBeDefined();
    expect(typeof res.body.groupId).toBe('string');
    groupId = res.body.groupId;
  });

  it('should reject group creation if missing fields', async () => {
    const res = await request(app).post('/groups').send({
      name,
      members,
    });

    expect(res.status).toBe(400);
  });

  it('should fetch group metadata and include creator as member', async () => {
    const res = await request(app).get(`/groups/${groupId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe(name);
    // Creator should be added to members automatically
    expect(res.body.members).toContain(username);
    expect(res.body.members).toContain('user1');
    expect(res.body.members).toContain('user2');
    expect(res.body.members.length).toBe(3);
  });

  it('should return 404 for unknown group', async () => {
    const res = await request(app).get(`/groups/unknowngroup`);
    expect(res.status).toBe(404);
  });
});
