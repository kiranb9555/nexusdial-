import { prisma } from '../../lib/prisma';
import { extractionSchema } from '../../services/ai/extraction.schema';

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() - 7);
  return d;
}

export interface AnalyticsSummary {
  totalCallsToday: number;
  missedCallsToday: number;
  newContactsThisWeek: number;
  topCallers: Array<{ id: string; name: string | null; phoneNumber: string; callCount: number }>;
  sentimentBreakdown: { positive: number; neutral: number; negative: number };
}

export async function getSummary(tenantId: string): Promise<AnalyticsSummary> {
  const todayStart = startOfToday();
  const weekStart = startOfWeek();

  const [totalCallsToday, missedCallsToday, newContactsThisWeek, topCallers, intelligenceJobs] =
    await Promise.all([
      prisma.callRecord.count({
        where: { tenantId, createdAt: { gte: todayStart } },
      }),
      prisma.callRecord.count({
        where: { tenantId, status: 'MISSED', createdAt: { gte: todayStart } },
      }),
      prisma.contact.count({
        where: { tenantId, isDeleted: false, firstSeenAt: { gte: weekStart } },
      }),
      prisma.contact.findMany({
        where: { tenantId, isDeleted: false },
        orderBy: { callCount: 'desc' },
        take: 5,
        select: { id: true, name: true, phoneNumber: true, callCount: true },
      }),
      prisma.intelligenceJob.findMany({
        where: { status: 'DONE', callRecord: { tenantId } },
        select: { extractedData: true },
      }),
    ]);

  const sentimentBreakdown = { positive: 0, neutral: 0, negative: 0 };
  for (const job of intelligenceJobs) {
    const parsed = extractionSchema.safeParse(job.extractedData);
    if (parsed.success) {
      sentimentBreakdown[parsed.data.sentiment] += 1;
    }
  }

  return {
    totalCallsToday,
    missedCallsToday,
    newContactsThisWeek,
    topCallers,
    sentimentBreakdown,
  };
}
