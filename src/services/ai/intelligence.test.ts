import { prisma } from '../../lib/prisma';
import { processIntelligenceJob } from './intelligence.processor';
import { setExtractor, getExtractor, AiExtractor } from './ai.service';
import { Extraction } from './extraction.schema';

async function seedVoicemailCall(): Promise<{
  tenantId: string;
  callRecordId: string;
  callerMobile: string;
}> {
  const tenant = await prisma.tenant.create({
    data: { mobile: '+919600000001', businessName: 'Pipeline Co' },
  });
  const number = await prisma.virtualNumber.create({
    data: { tenantId: tenant.id, e164Number: '+917900000001' },
  });
  const callerMobile = '+919876500000';
  const call = await prisma.callRecord.create({
    data: {
      tenantId: tenant.id,
      virtualNumberId: number.id,
      direction: 'INBOUND',
      status: 'ANSWERED',
      durationSec: 25,
      recordingKey: 'voicemail/test.wav',
    },
  });
  await prisma.intelligenceJob.create({
    data: { callRecordId: call.id, status: 'PENDING' },
  });
  return { tenantId: tenant.id, callRecordId: call.id, callerMobile };
}

describe('AI intelligence pipeline', () => {
  afterEach(() => setExtractor(null));

  it('processes a voicemail job to DONE with transcript, contact, and summary', async () => {
    const { tenantId, callRecordId, callerMobile } = await seedVoicemailCall();

    await processIntelligenceJob({ callRecordId, tenantId, callerMobile }, 1);

    const job = await prisma.intelligenceJob.findUnique({ where: { callRecordId } });
    expect(job?.status).toBe('DONE');
    expect(job?.transcript).toBeTruthy();
    expect(job?.extractedData).toBeTruthy();
    expect(job?.processingMs).toBeGreaterThanOrEqual(0);

    const call = await prisma.callRecord.findUnique({ where: { id: callRecordId } });
    expect(call?.aiSummary).toBeTruthy();
    expect(call?.contactId).toBeTruthy();

    const contact = await prisma.contact.findUnique({
      where: { tenantId_phoneNumber: { tenantId, phoneNumber: callerMobile } },
    });
    expect(contact).not.toBeNull();
    expect(contact?.callCount).toBe(1);
  });

  it('saves the transcript and marks FAILED when AI extraction fails (data never lost)', async () => {
    const failing: AiExtractor = {
      name: 'failing',
      extract: async (): Promise<Extraction> => {
        throw new Error('simulated AI outage');
      },
    };
    setExtractor(failing);

    const { tenantId, callRecordId, callerMobile } = await seedVoicemailCall();

    await expect(
      processIntelligenceJob({ callRecordId, tenantId, callerMobile }, 1),
    ).rejects.toThrow('simulated AI outage');

    const job = await prisma.intelligenceJob.findUnique({ where: { callRecordId } });
    expect(job?.status).toBe('FAILED');
    expect(job?.transcript).toBeTruthy();
    expect(job?.lastError).toContain('simulated AI outage');
  });

  it('uses the mock extractor by default and validates output with Zod', async () => {
    const extractor = getExtractor();
    const result = await extractor.extract('Hi, this is Priya. We want to place a bulk order.');
    expect(['positive', 'neutral', 'negative']).toContain(result.sentiment);
    expect(typeof result.callbackRequested).toBe('boolean');
  });
});
