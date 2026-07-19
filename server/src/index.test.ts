import request from 'supertest';
import server from './index';

describe('GET /health', () => {
  it('should return 200 OK', async () => {
    const response = await request(server).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });
});
