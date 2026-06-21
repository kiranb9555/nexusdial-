import { Router } from 'express';
import { asyncHandler } from '../../lib/asyncHandler';
import { validate } from '../../middleware/validate';
import { otpLimiter } from '../../middleware/rateLimit';
import * as controller from './auth.controller';
import { sendOtpSchema, verifyOtpSchema, refreshSchema } from './auth.schemas';

export const authRouter = Router();

authRouter.post(
  '/send-otp',
  validate({ body: sendOtpSchema }),
  otpLimiter,
  asyncHandler(controller.sendOtp),
);

authRouter.post(
  '/verify-otp',
  validate({ body: verifyOtpSchema }),
  asyncHandler(controller.verifyOtp),
);

authRouter.post('/refresh', validate({ body: refreshSchema }), asyncHandler(controller.refresh));
