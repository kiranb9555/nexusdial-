import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().positive().default(30),

  OTP_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  OTP_MAX_PER_WINDOW: z.coerce.number().int().positive().default(3),
  OTP_WINDOW_SECONDS: z.coerce.number().int().positive().default(600),

  API_RATE_MAX: z.coerce.number().int().positive().default(200),
  API_RATE_WINDOW_MS: z.coerce.number().int().positive().default(900000),

  AI_PROVIDER: z.enum(['openai', 'mock']).default('mock'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-3.5-turbo'),

  INTELLIGENCE_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(5).default(3),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // This runs at boot before the logger is guaranteed; surface the failure loudly.
  throw new Error(
    `Invalid environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  );
}

export const env = parsed.data;

export const isTest = env.NODE_ENV === 'test';
export const isProd = env.NODE_ENV === 'production';
