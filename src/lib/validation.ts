import { z } from 'zod';

/**
 * Phone number validation. Accepts E.164 (e.g. +919876543210) or a bare
 * 10-15 digit national number. Normalisation happens in callers when needed.
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, 'Invalid phone number format');

/** E.164 strictly (leading +). */
export const e164Schema = z
  .string()
  .trim()
  .regex(/^\+[1-9]\d{7,14}$/, 'Invalid E.164 number');

export const otpSchema = z.string().trim().regex(/^\d{6}$/, 'OTP must be 6 digits');

/** Reusable bounded text. */
export const shortText = z.string().trim().min(1).max(120);
export const mediumText = z.string().trim().min(1).max(280);
export const tagSchema = z.string().trim().min(1).max(40);

export const idParam = z.object({ id: z.string().uuid() });

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;
