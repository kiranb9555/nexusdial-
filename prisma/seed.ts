import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Seed a pool of provisionable virtual numbers (DIDPool equivalent).
  const numbers: string[] = [];
  for (let i = 0; i < 20; i++) {
    // Indian E.164 style demo numbers.
    const suffix = (9000000000 + i).toString();
    numbers.push(`+91${suffix}`);
  }

  for (const e164Number of numbers) {
    await prisma.numberPool.upsert({
      where: { e164Number },
      update: {},
      create: { e164Number },
    });
  }

  const total = await prisma.numberPool.count();
  const available = await prisma.numberPool.count({ where: { isAssigned: false } });
  console.log(`NumberPool seeded: ${total} total, ${available} available`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
