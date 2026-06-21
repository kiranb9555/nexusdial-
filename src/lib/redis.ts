import { Redis } from 'ioredis';
import { env } from '../config/env';
import { logger } from './logger';

/**
 * Shared connection for app-level usage (OTP store, rate limiting).
 * BullMQ requires its own connection options (maxRetriesPerRequest: null),
 * so the queue/worker create dedicated connections (see queue/connection.ts).
 */
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 3,
  lazyConnect: false,
});

redis.on('error', (err) => {
  logger.error('redis error', { error: err.message });
});

export async function disconnectRedis(): Promise<void> {
  await redis.quit();
  logger.info('redis disconnected');
}
