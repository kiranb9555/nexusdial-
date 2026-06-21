import { Request } from 'express';
import { AppError, ErrorCode } from './errors';

/** Reads a route param that is guaranteed present by prior Zod validation. */
export function requireParam(req: Request, name: string): string {
  const value = req.params[name];
  if (value === undefined) {
    throw new AppError(400, ErrorCode.BAD_REQUEST, `Missing route parameter: ${name}`);
  }
  return value;
}
