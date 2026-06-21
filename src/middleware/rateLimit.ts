import { NextFunction, Request, Response } from 'express';
import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { env } from '../config/env';
import { redis } from '../lib/redis';
import { ErrorBody, ErrorCode } from '../lib/errors';

function redisStore(prefix: string): RedisStore {
  return new RedisStore({
    prefix,
    // rate-limit-redis calls the redis client via sendCommand
    sendCommand: (command: string, ...args: string[]) =>
      redis.call(command, ...args) as Promise<never>,
  });
}

/** General API limit: 200 req / 15 min, keyed per tenant (falls back to IP). */
export const generalApiLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.API_RATE_WINDOW_MS,
  max: env.API_RATE_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:api:'),
  keyGenerator: (req: Request): string => req.tenant?.id ?? req.ip ?? 'anon',
  handler: (_req: Request, res: Response): void => {
    const body: ErrorBody = {
      error: { code: ErrorCode.RATE_LIMITED, message: 'Too many requests' },
    };
    res.status(429).json(body);
  },
});

/**
 * Auth limit guard: max 3 OTP requests per mobile per 10 minutes.
 * Keyed by the mobile in the request body, so it must run after body parsing.
 */
export const otpLimiter: RateLimitRequestHandler = rateLimit({
  windowMs: env.OTP_WINDOW_SECONDS * 1000,
  max: env.OTP_MAX_PER_WINDOW,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore('rl:otp:'),
  keyGenerator: (req: Request): string => {
    const mobile = (req.body as { mobile?: string } | undefined)?.mobile;
    return mobile ? `mobile:${mobile}` : `ip:${req.ip ?? 'anon'}`;
  },
  handler: (_req: Request, res: Response): void => {
    const body: ErrorBody = {
      error: { code: ErrorCode.OTP_RATE_LIMITED, message: 'Too many OTP requests, try again later' },
    };
    res.status(429).json(body);
  },
});

/** No-op passthrough used in tests where Redis-backed limiting is disabled. */
export function noopLimiter(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
