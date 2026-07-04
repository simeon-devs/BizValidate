// Application error with a stable machine-readable code. Raw provider
// error messages must never reach the frontend — catch and rethrow as
// AppError at the boundary, and return { error, code } to clients.
export class AppError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "AppError";
    this.code = code;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
