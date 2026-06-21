import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { AppError, ErrorCode } from '../lib/errors';
import { AccessTokenPayload, TenantContext } from '../modules/auth/auth.types';

/**
 * Verifies the Bearer access token and attaches req.tenant.
 * All tenant-scoped controllers rely on req.tenant.id for the WHERE clause.
 */
export function validateToken(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    next(AppError.unauthorized('Missing bearer token', ErrorCode.UNAUTHORIZED));
    return;
  }
  const token = header.slice(7).trim();
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    if (payload.type !== 'access') {
      next(AppError.unauthorized('Invalid token type', ErrorCode.TOKEN_INVALID));
      return;
    }
    const tenant: TenantContext = {
      id: payload.tenantId,
      mobile: payload.mobile,
      planTier: payload.planTier,
    };
    req.tenant = tenant;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(AppError.unauthorized('Access token expired', ErrorCode.TOKEN_EXPIRED));
      return;
    }
    next(AppError.unauthorized('Invalid access token', ErrorCode.TOKEN_INVALID));
  }
}

/** Helper for controllers: guarantees req.tenant exists (after validateToken). */
export function requireTenant(req: Request): TenantContext {
  if (!req.tenant) {
    throw AppError.unauthorized('Tenant context missing', ErrorCode.UNAUTHORIZED);
  }
  return req.tenant;
}
