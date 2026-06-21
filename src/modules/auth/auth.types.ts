import { PlanTier } from '@prisma/client';

export interface AccessTokenPayload {
  tenantId: string;
  mobile: string;
  planTier: PlanTier;
  type: 'access';
}

export interface RefreshTokenPayload {
  tenantId: string;
  jti: string;
  type: 'refresh';
}

export interface TenantContext {
  id: string;
  mobile: string;
  planTier: PlanTier;
}
