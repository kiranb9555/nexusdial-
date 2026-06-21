import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { Tenant } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../lib/prisma';
import { redis } from '../../lib/redis';
import { logger } from '../../lib/logger';
import { AppError, ErrorCode } from '../../lib/errors';
import { AccessTokenPayload, RefreshTokenPayload } from './auth.types';

const otpKey = (mobile: string): string => `otp:${mobile}`;

function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export async function sendOtp(mobile: string): Promise<{ devOtp?: string }> {
  const otp = generateOtp();
  await redis.set(otpKey(mobile), otp, 'EX', env.OTP_TTL_SECONDS);

  // "Send" the OTP — for the demo we log it instead of calling an SMS provider.
  logger.info('otp dispatched', { mobile, otp, channel: 'sms-simulated' });

  // Only expose the OTP outside production to make local testing painless.
  return env.NODE_ENV === 'production' ? {} : { devOtp: otp };
}

async function issueTokens(tenant: Tenant): Promise<TokenPair> {
  const accessPayload: AccessTokenPayload = {
    tenantId: tenant.id,
    mobile: tenant.mobile,
    planTier: tenant.planTier,
    type: 'access',
  };
  const accessToken = jwt.sign(accessPayload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_TTL,
  } as SignOptions);

  const jti = crypto.randomUUID();
  const refreshPayload: RefreshTokenPayload = { tenantId: tenant.id, jti, type: 'refresh' };
  const refreshToken = jwt.sign(refreshPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: `${env.JWT_REFRESH_TTL_DAYS}d`,
  } as SignOptions);

  const expiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 3600 * 1000);
  await prisma.refreshToken.create({
    data: { tenantId: tenant.id, tokenHash: hashToken(refreshToken), expiresAt },
  });

  return { accessToken, refreshToken, expiresIn: env.JWT_ACCESS_TTL };
}

export async function verifyOtp(
  mobile: string,
  otp: string,
  businessName?: string,
): Promise<{ tenant: Tenant; tokens: TokenPair }> {
  const stored = await redis.get(otpKey(mobile));
  if (!stored || stored !== otp) {
    throw new AppError(401, ErrorCode.INVALID_OTP, 'Invalid or expired OTP');
  }
  await redis.del(otpKey(mobile));

  // OTP-only auth: first successful verification provisions the tenant.
  const tenant = await prisma.tenant.upsert({
    where: { mobile },
    update: {},
    create: { mobile, businessName: businessName ?? `Tenant ${mobile}` },
  });

  const tokens = await issueTokens(tenant);
  return { tenant, tokens };
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  let payload: RefreshTokenPayload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  } catch {
    throw new AppError(401, ErrorCode.REFRESH_INVALID, 'Invalid refresh token');
  }
  if (payload.type !== 'refresh') {
    throw new AppError(401, ErrorCode.REFRESH_INVALID, 'Invalid refresh token type');
  }

  const tokenHash = hashToken(refreshToken);
  const record = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!record || record.revoked || record.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, ErrorCode.REFRESH_INVALID, 'Refresh token not recognised');
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: record.tenantId } });
  if (!tenant) {
    throw new AppError(401, ErrorCode.REFRESH_INVALID, 'Tenant not found');
  }

  // Rotate: revoke the presented token, issue a fresh pair.
  await prisma.refreshToken.update({ where: { id: record.id }, data: { revoked: true } });
  return issueTokens(tenant);
}
