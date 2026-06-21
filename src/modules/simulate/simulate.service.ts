import { CallRecord } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { emitToTenant } from '../../lib/socket';
import { enqueueIntelligenceJob } from '../../queue/intelligence.queue';
import { incrementOrCreateContact } from '../contacts/contacts.service';
import { SimulateCallInput } from './simulate.schemas';

export async function simulateCall(
  tenantId: string,
  input: SimulateCallInput,
): Promise<CallRecord> {
  // Verify the virtual number belongs to this tenant (tenant isolation).
  const vNumber = await prisma.virtualNumber.findFirst({
    where: { id: input.virtualNumberId, tenantId },
  });
  if (!vNumber) {
    throw AppError.notFound('Virtual number not found');
  }

  const status = input.durationSec === 0 ? 'MISSED' : 'ANSWERED';

  const callRecord = await prisma.$transaction(async (tx) => {
    // For calls WITHOUT a voicemail, the worker never runs, so resolve the
    // contact + increment callCount here. For voicemail calls the worker owns
    // contact intelligence (exactly-once callCount increment).
    let contactId: string | null = null;
    if (!input.hasVoicemail) {
      const contact = await incrementOrCreateContact(tx, {
        tenantId,
        phoneNumber: input.callerMobile,
      });
      contactId = contact.id;
    } else {
      // Link to an existing contact if present; worker creates one otherwise.
      const existing = await tx.contact.findUnique({
        where: { tenantId_phoneNumber: { tenantId, phoneNumber: input.callerMobile } },
      });
      contactId = existing?.id ?? null;
    }

    const record = await tx.callRecord.create({
      data: {
        tenantId,
        virtualNumberId: input.virtualNumberId,
        contactId,
        direction: input.direction,
        status,
        durationSec: input.durationSec,
        recordingKey: input.hasVoicemail ? `voicemail/${tenantId}/${Date.now()}.wav` : null,
      },
    });

    if (input.hasVoicemail) {
      // Create the IntelligenceJob row up front so it is inspectable as PENDING.
      await tx.intelligenceJob.create({
        data: { callRecordId: record.id, status: 'PENDING' },
      });
    }

    return record;
  });

  if (input.hasVoicemail) {
    await enqueueIntelligenceJob({
      callRecordId: callRecord.id,
      tenantId,
      callerMobile: input.callerMobile,
    });
  }

  // Notify the tenant's room in real time.
  emitToTenant(tenantId, 'call_event', { event: 'call_event', data: callRecord });

  return callRecord;
}
