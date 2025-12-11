import { ZodError, type ZodIssue } from 'zod';

export class ValidationError extends Error {
  public readonly issues: ZodIssue[];

  constructor(zodError: ZodError) {
    const message = zodError.issues
      .map((e: ZodIssue) => `${e.path.join('.')}: ${e.message}`)
      .join(', ');
    super(`Validation failed: ${message}`);
    this.name = 'ValidationError';
    this.issues = zodError.issues;
  }
}

