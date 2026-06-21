import { NextFunction, Request, Response } from 'express';
import { ZodTypeAny, z } from 'zod';
import { AppError, ErrorCode } from '../lib/errors';

interface RequestSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

/**
 * Strict request validation. Any field not present in the schema is stripped
 * (Zod objects strip unknown keys by default), so unexpected fields never reach
 * the controller. Validated, typed values are written back onto the request.
 */
export function validate(schemas: RequestSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.params) {
        req.params = schemas.params.parse(req.params) as Request['params'];
      }
      if (schemas.query) {
        // req.query has only a getter in Express 5; assign defensively for v4.
        const parsedQuery = schemas.query.parse(req.query);
        Object.defineProperty(req, 'validatedQuery', { value: parsedQuery, writable: true });
        req.query = parsedQuery as Request['query'];
      }
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        next(
          new AppError(400, ErrorCode.VALIDATION_FAILED, 'Request validation failed', err.flatten()),
        );
        return;
      }
      next(err);
    }
  };
}
