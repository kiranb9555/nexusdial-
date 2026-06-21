import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { emitToTenant } from '../../lib/socket';
import { generateTranscript } from '../transcript';
import { getExtractor } from './ai.service';
import { incrementOrCreateContact } from '../../modules/contacts/contacts.service';
import { Extraction } from './extraction.schema';
import { IntelligenceJobData } from '../../queue/intelligence.queue';

function buildSummary(extraction: Extraction): string {
  const parts: string[] = [];
  parts.push(`Sentiment: ${extraction.sentiment}`);
  if (extraction.intent) parts.push(`Intent: ${extraction.intent}`);
  if (extraction.callbackRequested) parts.push('Callback requested');
  if (extraction.name) parts.push(`Caller: ${extraction.name}`);
  return parts.join('. ') + '.';
}

/**
 * Processes a voicemail intelligence job. Designed to be fault tolerant:
 * the raw transcript is persisted BEFORE the AI call, so a failed extraction
 * never loses data. AI failures throw so BullMQ retries up to the configured
 * attempt cap; on each failure the job row is marked FAILED + inspectable.
 *
 * @param attemptsMade number of attempts already made for this job (>=1).
 */
export async function processIntelligenceJob(
  data: IntelligenceJobData,
  attemptsMade: number,
): Promise<void> {
  const startedAt = Date.now();
  const { callRecordId, tenantId, callerMobile } = data;

  const job = await prisma.intelligenceJob.findUnique({ where: { callRecordId } });
  if (!job) {
    logger.error('intelligence job row missing', { callRecordId });
    return;
  }

  await prisma.intelligenceJob.update({
    where: { callRecordId },
    data: { status: 'PROCESSING', attempts: attemptsMade },
  });

  // Step 1 — Transcription (simulated). Persist immediately so raw data survives
  // even if AI extraction fails.
  const transcript = generateTranscript();
  await prisma.intelligenceJob.update({
    where: { callRecordId },
    data: { transcript },
  });

  // Step 2 — AI extraction (validated with Zod inside the extractor).
  let extraction: Extraction;
  try {
    extraction = await getExtractor().extract(transcript);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown extraction error';
    logger.error('ai extraction failed', { callRecordId, attemptsMade, error: message });
    await prisma.intelligenceJob.update({
      where: { callRecordId },
      data: { status: 'FAILED', lastError: message, attempts: attemptsMade },
    });
    // Rethrow so BullMQ retries (bounded by queue attempts). Transcript is saved.
    throw err;
  }

  // Step 3 — Contact intelligence: create or increment, backfill name, add intent tag.
  const contact = await prisma.$transaction((tx) =>
    incrementOrCreateContact(tx, {
      tenantId,
      phoneNumber: callerMobile,
      name: extraction.name,
      tag: extraction.intent,
    }),
  );

  // Step 4 — Persist results.
  const processingMs = Date.now() - startedAt;
  const summary = buildSummary(extraction);
  const [, updatedCall] = await prisma.$transaction([
    prisma.intelligenceJob.update({
      where: { callRecordId },
      data: {
        status: 'DONE',
        extractedData: extraction,
        processingMs,
        lastError: null,
      },
    }),
    prisma.callRecord.update({
      where: { id: callRecordId },
      data: { aiSummary: summary, contactId: contact.id },
    }),
  ]);

  // Step 5 — Notify the tenant room with the enriched call record.
  emitToTenant(tenantId, 'intelligence_ready', {
    event: 'intelligence_ready',
    data: { ...updatedCall, extractedData: extraction },
  });

  logger.info('intelligence job done', { callRecordId, processingMs, provider: getExtractor().name });
}
