import { createServer } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { initSocket, closeSocket } from './lib/socket';
import { disconnectPrisma } from './lib/prisma';
import { disconnectRedis } from './lib/redis';
import { closeIntelligenceQueue } from './queue/intelligence.queue';
import { startIntelligenceWorker } from './workers/intelligence.worker';

async function main(): Promise<void> {
  const app = createApp();
  const httpServer = createServer(app);
  initSocket(httpServer);

  // Run the worker in-process for a single-command demo. In production it can be
  // run separately via `npm run worker` and removed from here.
  const worker = startIntelligenceWorker();

  httpServer.listen(env.PORT, () => {
    logger.info('nexusdial server listening', { port: env.PORT, env: env.NODE_ENV });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info('shutting down', { signal });
    httpServer.close();
    closeSocket();
    await worker.close();
    await closeIntelligenceQueue();
    await disconnectPrisma();
    await disconnectRedis();
    process.exit(0);
  };

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err: unknown) => {
  logger.error('fatal startup error', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
