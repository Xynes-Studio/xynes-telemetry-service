/**
 * TELE-VIEW-1: Authorization error for workspace access control.
 */
export class AuthorizationError extends Error {
  public readonly code: string;
  public readonly statusCode = 403;

  constructor(message: string, code = "FORBIDDEN") {
    super(message);
    this.name = "AuthorizationError";
    this.code = code;
  }
}
