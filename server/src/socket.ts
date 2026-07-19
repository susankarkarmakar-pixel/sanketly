import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { sessions } from './state';
import { groupStore } from './routes/groups';
import { redis } from './redis';

const activeSockets = new Map<string, string>(); // username -> socketId

// Default TTL: 7 days
const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;

async function queueMessage(username: string, payload: any, expiresInSeconds?: number) {
  const ttl = expiresInSeconds ? Math.min(expiresInSeconds, DEFAULT_TTL_SECONDS) : DEFAULT_TTL_SECONDS;

  const msgId = payload.clientMessageId;
  const msgKey = `msg:${username}:${msgId}`;

  // Store payload as string, using Redis's built-in expiry
  await redis.setex(msgKey, ttl, JSON.stringify(payload));
  // Keep order in list
  await redis.rpush(`queue:${username}`, msgKey);
}

async function flushMessages(username: string, socket: Socket) {
  const queueKey = `queue:${username}`;
  const keys = await redis.lrange(queueKey, 0, -1);

  if (keys.length === 0) return;

  for (const key of keys) {
    const raw = await redis.get(key);
    if (raw) {
      try {
        const payload = JSON.parse(raw);
        socket.emit('message:receive', payload);
      } catch (e) {
        console.error('Failed to parse queued message', key);
      }
      // Delete the individual message key as it's been delivered
      await redis.del(key);
    }
  }

  // Delete the queue list
  await redis.del(queueKey);
}

export function setupSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.use((socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    if (!sessionId) {
      return next(new Error('Authentication error: Missing sessionId'));
    }

    const username = sessions.get(sessionId);
    if (!username) {
      return next(new Error('Authentication error: Invalid sessionId'));
    }

    (socket as any).username = username;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const username = (socket as any).username;

    if (!username) {
       socket.disconnect(true);
       return;
    }

    activeSockets.set(username, socket.id);

    // Flush queued messages upon connection
    flushMessages(username, socket).catch(console.error);

    socket.on('message:send', async (data) => {
      const { toUsername, groupId, content, ciphertextsByMember, clientMessageId, expiresInSeconds } = data;

      if (!clientMessageId) {
        socket.emit('message:error', { error: 'Invalid message payload' });
        return;
      }

      // Group Messaging Logic
      if (groupId && ciphertextsByMember) {
        const group = groupStore.get(groupId);
        if (!group) {
          socket.emit('message:error', { error: 'Group not found', clientMessageId });
          return;
        }

        // Fan out message to each member
        for (const member of group.members) {
          // Don't echo to sender
          if (member === username) continue;

          const memberCiphertext = ciphertextsByMember[member];
          if (!memberCiphertext) {
             // Missing ciphertext for a member - skip or error? We'll just skip here
             continue;
          }

          const payload = {
            fromUsername: username,
            groupId: groupId,
            content: memberCiphertext,
            clientMessageId,
            serverTimestamp: Date.now()
          };

          const recipientSocketId = activeSockets.get(member);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('message:receive', payload);
          } else {
            // Recipient is offline, queue the message
            await queueMessage(member, payload, expiresInSeconds);
          }
        }
        return;
      }

      // 1:1 Messaging Logic
      if (!toUsername || !content) {
        socket.emit('message:error', { error: 'Invalid message payload', clientMessageId });
        return;
      }

      const payload = {
        fromUsername: username,
        content,
        clientMessageId,
        serverTimestamp: Date.now()
      };

      const recipientSocketId = activeSockets.get(toUsername);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('message:receive', payload);
      } else {
        // Recipient is offline, queue the message
        await queueMessage(toUsername, payload, expiresInSeconds);
      }
    });

    socket.on('disconnect', () => {
      if (activeSockets.get(username) === socket.id) {
        activeSockets.delete(username);
      }
    });
  });

  return io;
}
