import { z } from 'zod';
import { phoneSchema, otpSchema, shortText } from '../../lib/validation';

export const sendOtpSchema = z.object({
  mobile: phoneSchema,
});

export const verifyOtpSchema = z.object({
  mobile: phoneSchema,
  otp: otpSchema,
  businessName: shortText.optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
