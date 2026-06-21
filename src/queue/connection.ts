import { Redis } from 'ioredis';
import { env } from '../config/env';

/**
 * BullMQ requires a dedicated connection with maxRetriesPerRequest set to null
 * and blocking command support. Do not share this with the app redis client.
 */
export function createQueueConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
}
