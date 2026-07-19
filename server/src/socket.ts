import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { sessions } from './state';
import { groupStore } from './routes/groups';

const activeSockets = new Map<string, string>(); // username -> socketId

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

    socket.on('message:send', (data) => {
      const { toUsername, groupId, content, ciphertextsByMember, clientMessageId } = data;

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

          const recipientSocketId = activeSockets.get(member);
          if (recipientSocketId) {
            io.to(recipientSocketId).emit('message:receive', {
              fromUsername: username,
              groupId: groupId,
              content: memberCiphertext,
              clientMessageId,
              serverTimestamp: Date.now()
            });
          }
        }
        return;
      }

      // 1:1 Messaging Logic
      if (!toUsername || !content) {
        socket.emit('message:error', { error: 'Invalid message payload', clientMessageId });
        return;
      }

      const recipientSocketId = activeSockets.get(toUsername);

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('message:receive', {
          fromUsername: username,
          content,
          clientMessageId,
          serverTimestamp: Date.now()
        });
      } else {
        socket.emit('message:error', {
          error: 'User is offline',
          clientMessageId
        });
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
