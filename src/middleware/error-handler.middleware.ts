import type { Context, Hono } from 'hono';
import { UnknownActionError, ValidationError } from '../errors';

/**
 * Generates a unique request ID for error correlation.
 */
function generateRequestId(): string {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Standard error response envelope.
 */
interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: { requestId: string };
}

function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  details?: unknown
): ApiError {
  const response: ApiError = {
    ok: false,
    error: { code, message },
    meta: { requestId },
  };
  if (details) {
    response.error.details = details;
  }
  return response;
}

export function setupErrorHandler(app: Hono): void {
  app.onError((error, c: Context) => {
    const requestId = c.get('requestId') || generateRequestId();
    console.error('Error:', { message: error.message, requestId });

    if (error instanceof ValidationError) {
      return c.json(
        createErrorResponse('VALIDATION_ERROR', error.message, requestId, error.issues),
        400
      );
    }

    if (error instanceof UnknownActionError) {
      return c.json(
        createErrorResponse('UNKNOWN_ACTION', error.message, requestId),
        400
      );
    }

    // Generic error
    const message = error instanceof Error ? error.message : 'Internal server error';
    return c.json(
      createErrorResponse('INTERNAL_ERROR', message, requestId),
      500
    );
  });
}

