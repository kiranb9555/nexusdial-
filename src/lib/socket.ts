import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { logger } from './logger';
import { AccessTokenPayload } from '../modules/auth/auth.types';

let io: SocketIOServer | null = null;

export function tenantRoom(tenantId: string): string {
  return `tenant:${tenantId}`;
}

export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: { origin: '*' },
  });

  // Authenticate sockets with the same JWT access token and auto-join tenant room.
  io.use((socket: Socket, next: (err?: Error) => void) => {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      socket.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');
    if (!token) {
      next(new Error('missing token'));
      return;
    }
    try {
      const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
      socket.data.tenantId = payload.tenantId;
      next();
    } catch {
      next(new Error('invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const tenantId = socket.data.tenantId as string;
    void socket.join(tenantRoom(tenantId));
    logger.info('socket connected', { tenantId, socketId: socket.id });
  });

  return io;
}

export function emitToTenant(tenantId: string, event: string, payload: unknown): void {
  if (!io) {
    logger.warn('socket emit skipped: io not initialised', { event, tenantId });
    return;
  }
  io.to(tenantRoom(tenantId)).emit(event, payload);
}

export function getIo(): SocketIOServer | null {
  return io;
}

export function closeSocket(): void {
  io?.close();
  io = null;
}
