import { Server, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { sessions } from './state';

const activeSockets = new Map<string, string>(); // username -> socketId

export function setupSocket(server: HttpServer) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Authentication middleware
  io.use((socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    if (!sessionId) {
      return next(new Error('Authentication error: Missing sessionId'));
    }

    const username = sessions.get(sessionId);
    if (!username) {
      return next(new Error('Authentication error: Invalid sessionId'));
    }

    // Attach username to socket for later use
    (socket as any).username = username;
    next();
  });

  io.on('connection', (socket: Socket) => {
    const username = (socket as any).username;

    // Disconnect if auth isn't complete (though our middleware handles it,
    // it's good practice to enforce timeout if doing manual auth post-connection,
    // but here we enforce it pre-connection via io.use. We'll add a safety check.)
    if (!username) {
       socket.disconnect(true);
       return;
    }

    activeSockets.set(username, socket.id);

    socket.on('message:send', (data) => {
      const { toUsername, content, clientMessageId } = data;

      if (!toUsername || !content || !clientMessageId) {
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
