import type { Context, Hono } from 'hono';
import { UnknownActionError, ValidationError } from '../errors';

export function setupErrorHandler(app: Hono): void {
  app.onError((error, c: Context) => {
    console.error('Error:', error);

    if (error instanceof ValidationError) {
      return c.json(
        {
          error: 'ValidationError',
          message: error.message,
          details: error.issues,
        },
        400
      );
    }

    if (error instanceof UnknownActionError) {
      return c.json(
        {
          error: 'UnknownActionError',
          message: error.message,
          actionKey: error.actionKey,
        },
        400
      );
    }

    // Generic error
    const message = error instanceof Error ? error.message : 'Internal server error';
    return c.json(
      {
        error: 'InternalServerError',
        message,
      },
      500
    );
  });
}
