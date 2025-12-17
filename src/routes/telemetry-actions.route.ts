import { Hono } from 'hono';
import { z } from 'zod';
import { executeTelemetryAction, type TelemetryActionKey, type TelemetryActionContext } from '../actions';
import { ValidationError } from '../errors';
import { ZodError } from 'zod';
import { internalServiceAuthMiddleware } from '../middleware/internal-service-auth.middleware';

const telemetryActionsRoute = new Hono();
telemetryActionsRoute.use('/internal/*', internalServiceAuthMiddleware);

const actionRequestSchema = z.object({
  actionKey: z.enum(['telemetry.event.ingest'] as const),
  payload: z.unknown(),
});

/**
 * Generates a unique request ID for correlation.
 */
function generateRequestId(): string {
  return `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

telemetryActionsRoute.post('/internal/telemetry-actions', async (c) => {
  const requestId = generateRequestId();

  // Parse request body
  const body = await c.req.json();

  // Validate action request structure
  let request: z.infer<typeof actionRequestSchema>;
  try {
    request = actionRequestSchema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ValidationError(error);
    }
    throw error;
  }

  // Build context from headers
  const ctx: TelemetryActionContext = {
    workspaceId: c.req.header('X-Workspace-Id') || undefined,
    userId: c.req.header('X-XS-User-Id') || undefined,
    requestId,
  };

  // Execute action
  const result = await executeTelemetryAction(
    request.actionKey as TelemetryActionKey,
    request.payload,
    ctx
  );

  return c.json({ ok: true, data: result, meta: { requestId } }, 201);
});

export { telemetryActionsRoute };
