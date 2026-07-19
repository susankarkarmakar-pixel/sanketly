import { createServer } from 'http';
import { AddressInfo } from 'net';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import express from 'express';
import { setupSocket } from './socket';
import { sessions } from './state';
import { v4 as uuidv4 } from 'uuid';

describe('Socket Logic', () => {
  let io: any, clientSocket1: ClientSocket, clientSocket2: ClientSocket;
  let port: number;
  let httpServer: any;
  const username1 = 'userA';
  const username2 = 'userB';
  const sessionId1 = uuidv4();
  const sessionId2 = uuidv4();

  beforeAll((done) => {
    const app = express();
    httpServer = createServer(app);
    io = setupSocket(httpServer);

    // Seed state for authentication
    sessions.set(sessionId1, username1);
    sessions.set(sessionId2, username2);

    httpServer.listen(() => {
      port = (httpServer.address() as AddressInfo).port;
      done();
    });
  });

  afterAll((done) => {
    io.close();
    httpServer.close();
    sessions.clear();
    done();
  });

  afterEach(() => {
    if (clientSocket1?.connected) clientSocket1.disconnect();
    if (clientSocket2?.connected) clientSocket2.disconnect();
  });

  it('should reject connection if no sessionId is provided', (done) => {
    const socket = Client(`http://localhost:${port}`);

    socket.on('connect_error', (err) => {
      expect(err.message).toBe('Authentication error: Missing sessionId');
      socket.close();
      done();
    });
  });

  it('should reject connection if invalid sessionId is provided', (done) => {
    const socket = Client(`http://localhost:${port}`, {
      auth: { sessionId: 'invalid-session-id' }
    });

    socket.on('connect_error', (err) => {
      expect(err.message).toBe('Authentication error: Invalid sessionId');
      socket.close();
      done();
    });
  });

  it('should connect successfully with valid sessionId', (done) => {
    clientSocket1 = Client(`http://localhost:${port}`, {
      auth: { sessionId: sessionId1 }
    });

    clientSocket1.on('connect', () => {
      expect(clientSocket1.connected).toBe(true);
      done();
    });
  });

  it('should successfully relay a message from clientA to clientB', (done) => {
    clientSocket1 = Client(`http://localhost:${port}`, { auth: { sessionId: sessionId1 } });
    clientSocket2 = Client(`http://localhost:${port}`, { auth: { sessionId: sessionId2 } });

    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        // Both connected, send message
        clientSocket1.emit('message:send', {
          toUsername: username2,
          content: 'Hello World',
          clientMessageId: 'msg-1'
        });
      }
    };

    clientSocket1.on('connect', onConnect);
    clientSocket2.on('connect', onConnect);

    clientSocket2.on('message:receive', (data) => {
      expect(data.fromUsername).toBe(username1);
      expect(data.content).toBe('Hello World');
      expect(data.clientMessageId).toBe('msg-1');
      expect(data.serverTimestamp).toBeDefined();
      done();
    });
  });

  it('should return error if recipient is offline', (done) => {
    clientSocket1 = Client(`http://localhost:${port}`, { auth: { sessionId: sessionId1 } });

    clientSocket1.on('connect', () => {
      clientSocket1.emit('message:send', {
        toUsername: 'offlineUser',
        content: 'Are you there?',
        clientMessageId: 'msg-2'
      });
    });

    clientSocket1.on('message:error', (data) => {
      expect(data.error).toBe('User is offline');
      expect(data.clientMessageId).toBe('msg-2');
      done();
    });
  });

  it('should successfully relay a ciphertext message without modification', (done) => {
    clientSocket1 = Client(`http://localhost:${port}`, { auth: { sessionId: sessionId1 } });
    clientSocket2 = Client(`http://localhost:${port}`, { auth: { sessionId: sessionId2 } });

    let connectedCount = 0;
    const onConnect = () => {
      connectedCount++;
      if (connectedCount === 2) {
        // Send pseudo-ciphertext
        clientSocket1.emit('message:send', {
          toUsername: username2,
          content: 'SOME_OPAQUE_CIPHERTEXT_BASE64==',
          clientMessageId: 'msg-crypto'
        });
      }
    };

    clientSocket1.on('connect', onConnect);
    clientSocket2.on('connect', onConnect);

    clientSocket2.on('message:receive', (data: any) => {
      expect(data.fromUsername).toBe(username1);
      expect(data.content).toBe('SOME_OPAQUE_CIPHERTEXT_BASE64==');
      expect(data.content).not.toBe('valid plaintext');
      done();
    });
  });
});
