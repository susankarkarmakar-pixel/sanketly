import request from 'supertest';
import app from './index';

describe('Prekeys Routes', () => {
  const username = 'testuser-prekey';
  const identityKey = 'base64-identity-key-mock';
  const prekeys = [
    { id: 1, key: 'base64-prekey-1' },
    { id: 2, key: 'base64-prekey-2' },
  ];

  it('should upload prekeys successfully', async () => {
    const res = await request(app).post('/prekeys').send({
      username,
      identityKey,
      prekeys,
    });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Prekeys uploaded successfully');
  });

  it('should reject upload if missing fields', async () => {
    const res = await request(app).post('/prekeys').send({
      username,
    });

    expect(res.status).toBe(400);
  });

  it('should fetch a single prekey and consume it', async () => {
    const res1 = await request(app).get(`/prekeys/${username}`);
    expect(res1.status).toBe(200);
    expect(res1.body.identityKey).toBe(identityKey);
    expect(res1.body.prekey.id).toBe(1);

    const res2 = await request(app).get(`/prekeys/${username}`);
    expect(res2.status).toBe(200);
    expect(res2.body.prekey.id).toBe(2);

    const res3 = await request(app).get(`/prekeys/${username}`);
    expect(res3.status).toBe(404);
    expect(res3.body.error).toBe('No prekeys left for user');
  });

  it('should return 404 for unknown user', async () => {
    const res = await request(app).get(`/prekeys/unknownuser`);
    expect(res.status).toBe(404);
  });
});
