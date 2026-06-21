import { NextFunction, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { AppError, ErrorBody, ErrorCode } from '../lib/errors';
import { logger } from '../lib/logger';

export function notFoundHandler(_req: Request, res: Response): void {
  const body: ErrorBody = {
    error: { code: ErrorCode.NOT_FOUND, message: 'Resource not found' },
  };
  res.status(404).json(body);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error('request error', { code: err.code, message: err.message, path: req.path });
    } else {
      logger.warn('request error', { code: err.code, message: err.message, path: req.path });
    }
    const body: ErrorBody = {
      error: { code: err.code, message: err.message, details: err.details },
    };
    res.status(err.statusCode).json(body);
    return;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const body: ErrorBody = {
        error: { code: ErrorCode.CONFLICT, message: 'Unique constraint violation' },
      };
      res.status(409).json(body);
      return;
    }
    if (err.code === 'P2025') {
      const body: ErrorBody = {
        error: { code: ErrorCode.NOT_FOUND, message: 'Resource not found' },
      };
      res.status(404).json(body);
      return;
    }
  }

  // Unknown error: never leak stack traces to the client.
  const message = err instanceof Error ? err.message : 'Unknown error';
  logger.error('unhandled error', { message, path: req.path });
  const body: ErrorBody = {
    error: { code: ErrorCode.INTERNAL, message: 'Internal server error' },
  };
  res.status(500).json(body);
}
