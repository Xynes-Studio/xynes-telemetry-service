import type { TelemetryActionHandler, TelemetryActionContext } from "../types";
import {
  eventsListPayloadSchema,
  type EventsListPayload,
  type EventsListResult,
  type EventListItem,
} from "../schemas";
import { eventsRepository, type EventsRepository } from "../../repositories";
import { ValidationError, AuthorizationError } from "../../errors";
import { ZodError } from "zod";

/**
 * TELE-VIEW-1: Sanitize event metadata for public response.
 * Security: Only return safe fields, no raw headers/tokens/bodies.
 */
function sanitizeEventForResponse(event: {
  id: string;
  source: string;
  eventType: string;
  name: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: Date;
  metadata: unknown;
}): EventListItem {
  const meta = event.metadata as Record<string, unknown> | null;

  // Only include safe metadata fields
  const sanitizedMetadata = meta
    ? {
        type: typeof meta.type === "string" ? meta.type : undefined,
        routeId:
          typeof meta.routeId === "string" || meta.routeId === null
            ? meta.routeId
            : undefined,
        serviceKey:
          typeof meta.serviceKey === "string" || meta.serviceKey === null
            ? meta.serviceKey
            : undefined,
        actionKey:
          typeof meta.actionKey === "string" || meta.actionKey === null
            ? meta.actionKey
            : undefined,
        method: typeof meta.method === "string" ? meta.method : undefined,
        path: typeof meta.path === "string" ? meta.path : undefined,
        statusCode:
          typeof meta.statusCode === "number" ? meta.statusCode : undefined,
        durationMs:
          typeof meta.durationMs === "number" ? meta.durationMs : undefined,
      }
    : null;

  return {
    id: event.id,
    source: event.source,
    eventType: event.eventType,
    name: event.name,
    targetType: event.targetType,
    targetId: event.targetId,
    createdAt: event.createdAt.toISOString(),
    metadata: sanitizedMetadata,
  };
}

/**
 * TELE-VIEW-1: Handler factory for listing recent telemetry events.
 *
 * @param repository - Events repository (injectable for testing)
 */
export function createEventsListHandler(
  repository: EventsRepository = eventsRepository
): TelemetryActionHandler<unknown, EventsListResult> {
  return async (
    payload: unknown,
    ctx: TelemetryActionContext
  ): Promise<EventsListResult> => {
    // 1. Validate payload
    let validatedPayload: EventsListPayload;
    try {
      validatedPayload = eventsListPayloadSchema.parse(payload);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(error);
      }
      throw error;
    }

    // 2. Security: Verify workspace access
    // The workspaceId in payload must match context (set by gateway after authz check)
    if (ctx.workspaceId && ctx.workspaceId !== validatedPayload.workspaceId) {
      throw new AuthorizationError(
        "Workspace ID mismatch - access denied",
        "WORKSPACE_MISMATCH"
      );
    }

    // 3. Fetch events from repository
    const events = await repository.listRecent({
      workspaceId: validatedPayload.workspaceId,
      limit: validatedPayload.limit + 1, // Fetch one extra to detect hasMore
      statusCode: validatedPayload.statusCode,
      routeId: validatedPayload.routeId,
      eventType: validatedPayload.eventType,
      cursor: validatedPayload.cursor,
    });

    // 4. Determine pagination
    const hasMore = events.length > validatedPayload.limit;
    const resultEvents = hasMore
      ? events.slice(0, validatedPayload.limit)
      : events;
    const lastEvent = resultEvents[resultEvents.length - 1];
    const nextCursor =
      hasMore && lastEvent ? lastEvent.createdAt.toISOString() : null;

    // 5. Sanitize events for response
    const sanitizedEvents = resultEvents.map(sanitizeEventForResponse);

    return {
      events: sanitizedEvents,
      nextCursor,
    };
  };
}

export const eventsListHandler = createEventsListHandler();
