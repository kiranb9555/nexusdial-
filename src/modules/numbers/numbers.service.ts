import { VirtualNumber } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { logger } from '../../lib/logger';
import { AppError, ErrorCode } from '../../lib/errors';
import { ProvisionNumberInput, UpdateNumberInput } from './numbers.schemas';

const LOW_POOL_THRESHOLD = 5;

export async function listNumbers(tenantId: string): Promise<VirtualNumber[]> {
  return prisma.virtualNumber.findMany({
    where: { tenantId },
    orderBy: { provisionedAt: 'desc' },
  });
}

export async function provisionNumber(
  tenantId: string,
  input: ProvisionNumberInput,
): Promise<VirtualNumber> {
  // Atomically claim an unassigned pool number and create the VirtualNumber.
  const created = await prisma.$transaction(async (tx) => {
    const pooled = await tx.numberPool.findFirst({
      where: { isAssigned: false },
      orderBy: { createdAt: 'asc' },
    });
    if (!pooled) {
      throw new AppError(409, ErrorCode.NO_NUMBERS_AVAILABLE, 'No numbers available in pool');
    }

    await tx.numberPool.update({
      where: { id: pooled.id },
      data: { isAssigned: true, assignedToTenantId: tenantId, assignedAt: new Date() },
    });

    return tx.virtualNumber.create({
      data: {
        tenantId,
        e164Number: pooled.e164Number,
        label: input.label ?? null,
      },
    });
  });

  // Pretend-Slack alert when the pool runs low.
  const remaining = await prisma.numberPool.count({ where: { isAssigned: false } });
  if (remaining < LOW_POOL_THRESHOLD) {
    logger.warn('NumberPool running low', {
      alert: 'slack',
      remaining,
      threshold: LOW_POOL_THRESHOLD,
    });
  }

  return created;
}

export async function updateNumber(
  tenantId: string,
  id: string,
  input: UpdateNumberInput,
): Promise<VirtualNumber> {
  // Tenant-scoped existence check before mutating.
  const existing = await prisma.virtualNumber.findFirst({ where: { id, tenantId } });
  if (!existing) {
    throw AppError.notFound('Virtual number not found');
  }

  return prisma.virtualNumber.update({
    where: { id: existing.id },
    data: {
      ...(input.label !== undefined ? { label: input.label } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
}
