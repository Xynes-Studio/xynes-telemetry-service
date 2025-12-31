import { z } from "zod";

/**
 * TELE-VIEW-1: Schema for listing recent telemetry events.
 *
 * Security: Only returns non-sensitive fields.
 * No raw tokens, bodies, or PII are exposed.
 */

/** Maximum number of events to return */
export const MAX_LIMIT = 100;

/** Default number of events to return */
export const DEFAULT_LIMIT = 50;

/**
 * Payload schema for telemetry.events.listRecentForWorkspace
 */
export const eventsListPayloadSchema = z.object({
  workspaceId: z.string().uuid("workspaceId must be a valid UUID"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .optional()
    .default(DEFAULT_LIMIT),
  statusCode: z.number().int().min(100).max(599).optional(),
  routeId: z.string().optional(),
  eventType: z.string().optional(),
  cursor: z.string().datetime().optional(), // ISO timestamp for pagination
});

export type EventsListPayload = z.infer<typeof eventsListPayloadSchema>;

/**
 * Single event in list response - sanitized output.
 * Security: No sensitive fields like raw headers, tokens, or bodies.
 */
export const eventListItemSchema = z.object({
  id: z.string().uuid(),
  source: z.string(),
  eventType: z.string(),
  name: z.string(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  createdAt: z.string().datetime(),
  // Selective metadata fields - only safe ones
  metadata: z
    .object({
      type: z.string().optional(),
      routeId: z.string().nullable().optional(),
      serviceKey: z.string().nullable().optional(),
      actionKey: z.string().nullable().optional(),
      method: z.string().optional(),
      path: z.string().optional(),
      statusCode: z.number().optional(),
      durationMs: z.number().optional(),
    })
    .passthrough()
    .nullable(),
});

export type EventListItem = z.infer<typeof eventListItemSchema>;

/**
 * Response schema for telemetry.events.listRecentForWorkspace
 */
export const eventsListResultSchema = z.object({
  events: z.array(eventListItemSchema),
  nextCursor: z.string().datetime().nullable(),
  total: z.number().int().optional(), // Total count if available
});

export type EventsListResult = z.infer<typeof eventsListResultSchema>;
