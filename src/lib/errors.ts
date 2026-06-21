/**
 * Machine-readable error codes. Format: ND_<http><seq>.
 * These are stable contract values returned to clients.
 */
export const ErrorCode = {
  // 400 - validation / bad input
  VALIDATION_FAILED: 'ND_4001',
  INVALID_PHONE: 'ND_4002',
  INVALID_OTP: 'ND_4003',
  BAD_REQUEST: 'ND_4004',
  // 401 - auth
  UNAUTHORIZED: 'ND_4010',
  TOKEN_EXPIRED: 'ND_4011',
  TOKEN_INVALID: 'ND_4012',
  REFRESH_INVALID: 'ND_4013',
  // 403
  FORBIDDEN: 'ND_4030',
  // 404
  NOT_FOUND: 'ND_4040',
  // 409
  CONFLICT: 'ND_4090',
  NO_NUMBERS_AVAILABLE: 'ND_4091',
  // 429
  RATE_LIMITED: 'ND_4029',
  OTP_RATE_LIMITED: 'ND_4291',
  // 500
  INTERNAL: 'ND_5000',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCodeValue;
  public readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCodeValue, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message: string, code: ErrorCodeValue = ErrorCode.BAD_REQUEST, details?: unknown): AppError {
    return new AppError(400, code, message, details);
  }

  static unauthorized(message: string, code: ErrorCodeValue = ErrorCode.UNAUTHORIZED): AppError {
    return new AppError(401, code, message);
  }

  static forbidden(message: string, code: ErrorCodeValue = ErrorCode.FORBIDDEN): AppError {
    return new AppError(403, code, message);
  }

  static notFound(message: string, code: ErrorCodeValue = ErrorCode.NOT_FOUND): AppError {
    return new AppError(404, code, message);
  }

  static conflict(message: string, code: ErrorCodeValue = ErrorCode.CONFLICT): AppError {
    return new AppError(409, code, message);
  }

  static rateLimited(message: string, code: ErrorCodeValue = ErrorCode.RATE_LIMITED): AppError {
    return new AppError(429, code, message);
  }
}

export interface ErrorBody {
  error: {
    code: ErrorCodeValue;
    message: string;
    details?: unknown;
  };
}
