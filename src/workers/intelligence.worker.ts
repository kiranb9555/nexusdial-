import { Worker, Job } from 'bullmq';
import { env } from '../config/env';
import { logger } from '../lib/logger';
import { createQueueConnection } from '../queue/connection';
import { INTELLIGENCE_QUEUE, IntelligenceJobData } from '../queue/intelligence.queue';
import { processIntelligenceJob } from '../services/ai/intelligence.processor';

export function startIntelligenceWorker(): Worker<IntelligenceJobData> {
  const worker = new Worker<IntelligenceJobData>(
    INTELLIGENCE_QUEUE,
    async (job: Job<IntelligenceJobData>) => {
      await processIntelligenceJob(job.data, job.attemptsMade + 1);
    },
    {
      connection: createQueueConnection(),
      concurrency: 5,
    },
  );

  worker.on('failed', (job, err) => {
    logger.error('intelligence worker job failed', {
      jobId: job?.id,
      attemptsMade: job?.attemptsMade,
      maxAttempts: env.INTELLIGENCE_MAX_ATTEMPTS,
      error: err.message,
    });
  });

  worker.on('completed', (job) => {
    logger.info('intelligence worker job completed', { jobId: job.id });
  });

  logger.info('intelligence worker started', { concurrency: 5 });
  return worker;
}

// Allow running the worker as a standalone process: `npm run worker`.
if (require.main === module) {
  startIntelligenceWorker();
}
