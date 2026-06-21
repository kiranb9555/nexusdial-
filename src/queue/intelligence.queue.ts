import { Queue } from 'bullmq';
import { env } from '../config/env';
import { createQueueConnection } from './connection';

export const INTELLIGENCE_QUEUE = 'intelligence';

export interface IntelligenceJobData {
  callRecordId: string;
  tenantId: string;
  callerMobile: string;
}

let queue: Queue<IntelligenceJobData> | null = null;

export function getIntelligenceQueue(): Queue<IntelligenceJobData> {
  if (!queue) {
    queue = new Queue<IntelligenceJobData>(INTELLIGENCE_QUEUE, {
      connection: createQueueConnection(),
      defaultJobOptions: {
        attempts: env.INTELLIGENCE_MAX_ATTEMPTS,
        backoff: { type: 'exponential', delay: 1000 },
        // Failed jobs must remain inspectable — do NOT auto-remove on fail.
        removeOnFail: false,
        removeOnComplete: { age: 24 * 3600, count: 1000 },
      },
    });
  }
  return queue;
}

export async function enqueueIntelligenceJob(data: IntelligenceJobData): Promise<void> {
  await getIntelligenceQueue().add('process-voicemail', data);
}

export async function closeIntelligenceQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
