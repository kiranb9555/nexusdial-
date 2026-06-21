import { CallRecord, Contact, Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { AppError } from '../../lib/errors';
import { ListContactsQuery, UpdateContactInput } from './contacts.schemas';

const SOFT_DELETE_RETENTION_DAYS = 30;

/**
 * Canonical contact resolution used at call ingestion and by the AI worker:
 * create the contact if absent (optionally with an extracted name / tag),
 * otherwise increment callCount. Runs inside the caller's transaction client.
 */
export async function incrementOrCreateContact(
  client: Prisma.TransactionClient,
  params: { tenantId: string; phoneNumber: string; name?: string | null; tag?: string | null },
): Promise<Contact> {
  const { tenantId, phoneNumber, name, tag } = params;
  const existing = await client.contact.findUnique({
    where: { tenantId_phoneNumber: { tenantId, phoneNumber } },
  });

  if (!existing) {
    return client.contact.create({
      data: {
        tenantId,
        phoneNumber,
        name: name ?? null,
        tags: tag ? [tag] : [],
        callCount: 1,
      },
    });
  }

  const nextTags =
    tag && !existing.tags.includes(tag) ? [...existing.tags, tag] : existing.tags;

  return client.contact.update({
    where: { id: existing.id },
    data: {
      callCount: { increment: 1 },
      // Backfill the name only if we have one and it's currently empty.
      ...(name && !existing.name ? { name } : {}),
      ...(nextTags !== existing.tags ? { tags: nextTags } : {}),
    },
  });
}

export async function listContacts(
  tenantId: string,
  q: ListContactsQuery,
): Promise<{ data: Contact[]; page: number; pageSize: number; total: number }> {
  const where: Prisma.ContactWhereInput = {
    tenantId,
    isDeleted: false,
    ...(q.tag ? { tags: { has: q.tag } } : {}),
    ...(q.minCallCount !== undefined ? { callCount: { gte: q.minCallCount } } : {}),
    ...(q.firstSeenFrom || q.firstSeenTo
      ? {
          firstSeenAt: {
            ...(q.firstSeenFrom ? { gte: q.firstSeenFrom } : {}),
            ...(q.firstSeenTo ? { lte: q.firstSeenTo } : {}),
          },
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { firstSeenAt: 'desc' },
      skip: (q.page - 1) * q.pageSize,
      take: q.pageSize,
    }),
    prisma.contact.count({ where }),
  ]);

  return { data, page: q.page, pageSize: q.pageSize, total };
}

export async function getContact(
  tenantId: string,
  id: string,
): Promise<Contact & { recentCalls: CallRecord[] }> {
  const contact = await prisma.contact.findFirst({
    where: { id, tenantId, isDeleted: false },
  });
  if (!contact) {
    throw AppError.notFound('Contact not found');
  }
  const recentCalls = await prisma.callRecord.findMany({
    where: { tenantId, contactId: id },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });
  return { ...contact, recentCalls };
}

export async function updateContact(
  tenantId: string,
  id: string,
  input: UpdateContactInput,
): Promise<Contact> {
  const contact = await prisma.contact.findFirst({
    where: { id, tenantId, isDeleted: false },
  });
  if (!contact) {
    throw AppError.notFound('Contact not found');
  }

  let tags = contact.tags;
  if (input.addTags) {
    for (const t of input.addTags) {
      if (!tags.includes(t)) tags = [...tags, t];
    }
  }
  if (input.removeTags) {
    tags = tags.filter((t) => !input.removeTags!.includes(t));
  }

  return prisma.contact.update({
    where: { id: contact.id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.addTags || input.removeTags ? { tags } : {}),
    },
  });
}

export async function getTimeline(tenantId: string, id: string): Promise<CallRecord[]> {
  const contact = await prisma.contact.findFirst({
    where: { id, tenantId, isDeleted: false },
  });
  if (!contact) {
    throw AppError.notFound('Contact not found');
  }
  return prisma.callRecord.findMany({
    where: { tenantId, contactId: id },
    orderBy: { createdAt: 'asc' },
  });
}

export async function softDeleteContact(tenantId: string, id: string): Promise<{ deletedAt: Date }> {
  const contact = await prisma.contact.findFirst({
    where: { id, tenantId, isDeleted: false },
  });
  if (!contact) {
    throw AppError.notFound('Contact not found');
  }
  const deletedAt = new Date();
  await prisma.contact.update({
    where: { id: contact.id },
    data: { isDeleted: true, deletedAt },
  });
  // Data is retained (not hard-deleted) for the retention window.
  return { deletedAt };
}

export const RETENTION_DAYS = SOFT_DELETE_RETENTION_DAYS;
