import { z } from "zod";

/**
 * TELE-VIEW-1: Schema for route statistics aggregation.
 *
 * Provides aggregated counts and durations per routeId for a workspace.
 */

/** Default time window in hours */
export const DEFAULT_TIME_WINDOW_HOURS = 24;

/** Maximum time window in hours */
export const MAX_TIME_WINDOW_HOURS = 168; // 7 days

/**
 * Payload schema for telemetry.stats.summaryByRoute
 */
export const statsSummaryPayloadSchema = z.object({
  workspaceId: z.string().uuid("workspaceId must be a valid UUID"),
  timeWindowHours: z
    .number()
    .int()
    .min(1)
    .max(MAX_TIME_WINDOW_HOURS)
    .optional()
    .default(DEFAULT_TIME_WINDOW_HOURS),
  routeId: z.string().optional(), // Filter to specific route
});

export type StatsSummaryPayload = z.infer<typeof statsSummaryPayloadSchema>;

/**
 * Single route stats entry
 */
export const routeStatsSchema = z.object({
  routeId: z.string().nullable(),
  serviceKey: z.string().nullable(),
  actionKey: z.string().nullable(),
  method: z.string().nullable(),
  pathPattern: z.string().nullable(),
  totalRequests: z.number().int(),
  successCount: z.number().int(), // 2xx
  errorCount: z.number().int(), // 4xx + 5xx
  avgDurationMs: z.number().nullable(),
  minDurationMs: z.number().nullable(),
  maxDurationMs: z.number().nullable(),
  p95DurationMs: z.number().nullable(), // 95th percentile
});

export type RouteStats = z.infer<typeof routeStatsSchema>;

/**
 * Response schema for telemetry.stats.summaryByRoute
 */
export const statsSummaryResultSchema = z.object({
  workspaceId: z.string().uuid(),
  timeWindowHours: z.number().int(),
  fromTimestamp: z.string().datetime(),
  toTimestamp: z.string().datetime(),
  routes: z.array(routeStatsSchema),
  totals: z.object({
    totalRequests: z.number().int(),
    successCount: z.number().int(),
    errorCount: z.number().int(),
    avgDurationMs: z.number().nullable(),
  }),
});

export type StatsSummaryResult = z.infer<typeof statsSummaryResultSchema>;
