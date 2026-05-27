import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';

let io: SocketServer | null = null;

export const initSocket = (server: HttpServer, frontendUrl: string): SocketServer => {
  io = new SocketServer(server, {
    cors: {
      origin: frontendUrl || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join tenant isolation room
    socket.on('join-tenant', (organizationId: string) => {
      if (organizationId) {
        socket.join(organizationId);
        console.log(`🏢 Socket ${socket.id} joined room: ${organizationId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
};

export const emitToTenant = (organizationId: string, eventName: string, payload: any): void => {
  if (!io) return;
  io.to(organizationId).emit(eventName, payload);
  console.log(`📡 Broadcasted event "${eventName}" to room "${organizationId}"`);
};
