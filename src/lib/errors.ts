export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}

export function toHttpError(err: unknown): { statusCode: number; message: string; code?: string } {
  if (isAppError(err)) {
    return { statusCode: err.statusCode, message: err.message, code: err.code };
  }
  if (err instanceof Error) {
    return { statusCode: 500, message: err.message };
  }
  return { statusCode: 500, message: 'Internal server error' };
}
