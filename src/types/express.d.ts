import { TenantContext } from '../modules/auth/auth.types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      validatedQuery?: unknown;
    }
  }
}

export {};
