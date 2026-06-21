import { PrismaClient } from '@prisma/client';
import { logger } from './logger';

export const prisma = new PrismaClient();

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
  logger.info('prisma disconnected');
}
