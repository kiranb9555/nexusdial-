import { z } from 'zod';
import { tagSchema, shortText } from '../../lib/validation';

export const listContactsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  tag: tagSchema.optional(),
  minCallCount: z.coerce.number().int().min(0).optional(),
  firstSeenFrom: z.coerce.date().optional(),
  firstSeenTo: z.coerce.date().optional(),
});

export const updateContactSchema = z
  .object({
    name: shortText.nullable().optional(),
    addTags: z.array(tagSchema).max(50).optional(),
    removeTags: z.array(tagSchema).max(50).optional(),
  })
  .refine(
    (v) => v.name !== undefined || v.addTags !== undefined || v.removeTags !== undefined,
    { message: 'Provide name, addTags, or removeTags' },
  );

export type ListContactsQuery = z.infer<typeof listContactsQuerySchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
