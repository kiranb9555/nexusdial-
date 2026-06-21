import { z } from 'zod';
import { shortText } from '../../lib/validation';

export const provisionNumberSchema = z.object({
  label: shortText.optional(),
});

export const updateNumberSchema = z
  .object({
    label: shortText.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((v) => v.label !== undefined || v.isActive !== undefined, {
    message: 'At least one of label or isActive is required',
  });

export type ProvisionNumberInput = z.infer<typeof provisionNumberSchema>;
export type UpdateNumberInput = z.infer<typeof updateNumberSchema>;
