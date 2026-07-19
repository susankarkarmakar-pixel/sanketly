import { Server as HttpServer } from 'http';
import { setupSocket } from './socket';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { sessions } from './state';
import { redis } from './redis';

jest.mock('./redis', () => {
  const Redis = require('ioredis-mock');
  return { redis: new Redis() };
});

describe('Socket.io server', () => {
  let io: any, clientSocket1: ClientSocket, clientSocket2: ClientSocket;
  let httpServer: HttpServer;
  const port = 4001;
  const serverUrl = `http://localhost:${port}`;

  beforeAll((done) => {
    httpServer = new HttpServer();
    io = setupSocket(httpServer);
    httpServer.listen(port, () => {
      done();
    });
  });

  afterAll((done) => {
    io.close();
    httpServer.close();
    redis.quit();
    done();
  });

  beforeEach(async () => {
    sessions.set('session-1', 'alice');
    sessions.set('session-2', 'bob');
    sessions.set('session-3', 'charlie');
    await redis.flushall();
  });

  afterEach(() => {
    if (clientSocket1?.connected) clientSocket1.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();
  });

  it('should authenticate user and allow connection', (done) => {
    clientSocket1 = Client(serverUrl, { auth: { sessionId: 'session-1' } });
    clientSocket1.on('connect', () => {
      expect(clientSocket1.connected).toBe(true);
      done();
    });
  });

  it('should queue message if recipient is offline and deliver on reconnect', (done) => {
    clientSocket1 = Client(serverUrl, { auth: { sessionId: 'session-1' } });

    clientSocket1.on('connect', () => {
      // Bob is offline (not connected)
      clientSocket1.emit('message:send', {
        toUsername: 'bob',
        content: 'ciphertext-123',
        clientMessageId: 'msg-id-1'
      });

      // Wait a little bit for the server to process and queue
      setTimeout(() => {
        // Now connect bob
        clientSocket2 = Client(serverUrl, { auth: { sessionId: 'session-2' } });

        clientSocket2.on('message:receive', async (data) => {
          expect(data.fromUsername).toBe('alice');
          expect(data.content).toBe('ciphertext-123');
          expect(data.clientMessageId).toBe('msg-id-1');

          // Verify it was flushed from queue
          const queueKeys = await redis.lrange('queue:bob', 0, -1);
          expect(queueKeys.length).toBe(0);

          done();
        });
      }, 50);
    });
  });

  it('should apply TTL correctly for queued messages', (done) => {
    clientSocket1 = Client(serverUrl, { auth: { sessionId: 'session-1' } });

    clientSocket1.on('connect', () => {
      // Charlie is offline
      clientSocket1.emit('message:send', {
        toUsername: 'charlie',
        content: 'ciphertext-expire-test',
        clientMessageId: 'msg-id-expire',
        expiresInSeconds: 1 // 1 second TTL
      });

      setTimeout(async () => {
        // Verify it was queued
        const queueKeys = await redis.lrange('queue:charlie', 0, -1);
        expect(queueKeys.length).toBe(1);

        const ttl = await redis.ttl(queueKeys[0]);
        expect(ttl).toBeGreaterThan(0);
        expect(ttl).toBeLessThanOrEqual(1);

        done();
      }, 50);
    });
  });

  it('should not contain plaintext in redis', (done) => {
    clientSocket1 = Client(serverUrl, { auth: { sessionId: 'session-1' } });
    clientSocket1.on('connect', () => {
      clientSocket1.emit('message:send', {
        toUsername: 'charlie',
        content: 'opaque-ciphertext-blob',
        clientMessageId: 'msg-id-3'
      });

      setTimeout(async () => {
        const queueKeys = await redis.lrange('queue:charlie', 0, -1);
        const msgStr = await redis.get(queueKeys[0]);
        expect(msgStr).toContain('opaque-ciphertext-blob');
        expect(msgStr).not.toContain('plaintext');
        done();
      }, 50);
    });
  });
});
