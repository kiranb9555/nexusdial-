import { z } from 'zod';

/**
 * The contract the AI model must satisfy. We validate the model output with Zod
 * before trusting any of it — models can hallucinate shapes.
 */
export const extractionSchema = z.object({
  name: z.string().trim().min(1).max(80).nullable(),
  intent: z
    .string()
    .trim()
    .max(160)
    .nullable()
    .transform((v) => {
      if (!v) return v;
      // Enforce the "max 20 words" rule defensively.
      const words = v.split(/\s+/).slice(0, 20);
      return words.join(' ');
    }),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  callbackRequested: z.boolean(),
});

export type Extraction = z.infer<typeof extractionSchema>;
