import type { Context, Hono } from 'hono';
import { UnknownActionError, ValidationError, MetadataLimitError } from '../errors';
import { generateRequestId } from '../utils/request';

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

    if (error instanceof MetadataLimitError) {
      return c.json(
        createErrorResponse('METADATA_LIMIT_EXCEEDED', error.message, requestId, { reason: error.reason }),
        413 // Payload Too Large
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

