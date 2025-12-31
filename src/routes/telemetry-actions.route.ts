import { Hono } from "hono";
import { z } from "zod";
import {
  executeTelemetryAction,
  type TelemetryActionKey,
  type TelemetryActionContext,
} from "../actions";
import { ValidationError, AuthorizationError } from "../errors";
import { ZodError } from "zod";
import { internalServiceAuthMiddleware } from "../middleware/internal-service-auth.middleware";
import { generateRequestId } from "../utils/request";

const telemetryActionsRoute = new Hono();
telemetryActionsRoute.use("/internal/*", internalServiceAuthMiddleware);

// All supported action keys
const actionRequestSchema = z.object({
  actionKey: z.enum([
    // Ingest actions
    "telemetry.event.ingest",
    "telemetry.events.ingest",
    // TELE-VIEW-1: Query actions (requires telemetry.view permission via gateway)
    "telemetry.events.listRecentForWorkspace",
    "telemetry.stats.summaryByRoute",
  ] as const),
  payload: z.unknown(),
});

telemetryActionsRoute.post("/internal/telemetry-actions", async (c) => {
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
    workspaceId: c.req.header("X-Workspace-Id") || undefined,
    userId: c.req.header("X-XS-User-Id") || undefined,
    requestId,
  };

  // Execute action
  const result = await executeTelemetryAction(
    request.actionKey as TelemetryActionKey,
    request.payload,
    ctx
  );

  // Return 200 for query actions, 201 for ingest actions
  const isQueryAction =
    request.actionKey === "telemetry.events.listRecentForWorkspace" ||
    request.actionKey === "telemetry.stats.summaryByRoute";

  return c.json(
    { ok: true, data: result, meta: { requestId } },
    isQueryAction ? 200 : 201
  );
});

export { telemetryActionsRoute };
