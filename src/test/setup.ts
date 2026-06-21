import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import { closeIntelligenceQueue } from '../queue/intelligence.queue';

/** Wipe all tables between tests for isolation (order respects FKs). */
export async function resetDb(): Promise<void> {
  await prisma.intelligenceJob.deleteMany();
  await prisma.callRecord.deleteMany();
  await prisma.walletTx.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.virtualNumber.deleteMany();
  await prisma.numberPool.deleteMany();
  await prisma.tenant.deleteMany();
}

beforeEach(async () => {
  await resetDb();
  await redis.flushdb();
});

afterAll(async () => {
  await closeIntelligenceQueue();
  await prisma.$disconnect();
  await redis.quit();
});
