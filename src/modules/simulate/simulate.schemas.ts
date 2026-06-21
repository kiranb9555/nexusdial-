import { z } from 'zod';
import { phoneSchema } from '../../lib/validation';

export const simulateCallSchema = z.object({
  virtualNumberId: z.string().uuid(),
  callerMobile: phoneSchema,
  direction: z.enum(['INBOUND', 'OUTBOUND']),
  durationSec: z.number().int().min(0).max(36000),
  hasVoicemail: z.boolean().default(false),
});

export type SimulateCallInput = z.infer<typeof simulateCallSchema>;
