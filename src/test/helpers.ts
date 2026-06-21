import { Express } from 'express';
import request from 'supertest';
import { prisma } from '../lib/prisma';

export interface AuthedTenant {
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  mobile: string;
}

/** Runs the OTP flow end-to-end and returns tokens for a tenant. */
export async function authenticate(app: Express, mobile: string): Promise<AuthedTenant> {
  const sendRes = await request(app).post('/api/auth/send-otp').send({ mobile });
  const otp = sendRes.body.devOtp as string;

  const verifyRes = await request(app).post('/api/auth/verify-otp').send({ mobile, otp });

  return {
    tenantId: verifyRes.body.tenant.id as string,
    accessToken: verifyRes.body.accessToken as string,
    refreshToken: verifyRes.body.refreshToken as string,
    mobile,
  };
}

/** Seeds N unassigned pool numbers for provisioning tests. */
export async function seedPool(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await prisma.numberPool.create({
      data: { e164Number: `+9170000000${i.toString().padStart(2, '0')}` },
    });
  }
}

export function bearer(token: string): string {
  return `Bearer ${token}`;
}
