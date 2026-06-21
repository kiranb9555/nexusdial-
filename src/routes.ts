import { Router } from 'express';
import { validateToken } from './middleware/auth';
import { generalApiLimiter } from './middleware/rateLimit';
import { authRouter } from './modules/auth/auth.routes';
import { numbersRouter } from './modules/numbers/numbers.routes';
import { simulateRouter } from './modules/simulate/simulate.routes';
import { contactsRouter } from './modules/contacts/contacts.routes';
import { analyticsRouter } from './modules/analytics/analytics.routes';

export function buildApiRouter(): Router {
  const api = Router();

  // Public auth routes (OTP-based).
  api.use('/auth', authRouter);

  // Everything below requires a valid access token + general rate limiting.
  api.use(validateToken);
  api.use(generalApiLimiter);

  api.use('/numbers', numbersRouter);
  api.use('/simulate', simulateRouter);
  api.use('/contacts', contactsRouter);
  api.use('/analytics', analyticsRouter);

  return api;
}
