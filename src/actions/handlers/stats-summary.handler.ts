import type { TelemetryActionHandler, TelemetryActionContext } from "../types";
import {
  statsSummaryPayloadSchema,
  type StatsSummaryPayload,
  type StatsSummaryResult,
  type RouteStats,
} from "../schemas";
import {
  eventsRepository,
  type EventsRepository,
  type RouteStatsRow,
} from "../../repositories";
import { ValidationError, AuthorizationError } from "../../errors";
import { ZodError } from "zod";

/**
 * TELE-VIEW-1: Transform repository row to API response format.
 */
function transformRouteStats(row: RouteStatsRow): RouteStats {
  return {
    routeId: row.routeId,
    serviceKey: row.serviceKey,
    actionKey: row.actionKey,
    method: row.method,
    pathPattern: row.pathPattern,
    totalRequests: row.totalRequests,
    successCount: row.successCount,
    errorCount: row.errorCount,
    avgDurationMs: row.avgDurationMs
      ? Math.round(row.avgDurationMs * 100) / 100
      : null,
    minDurationMs: row.minDurationMs,
    maxDurationMs: row.maxDurationMs,
    p95DurationMs: null, // TODO: Implement p95 calculation if needed
  };
}

/**
 * TELE-VIEW-1: Handler factory for route stats aggregation.
 *
 * @param repository - Events repository (injectable for testing)
 */
export function createStatsSummaryHandler(
  repository: EventsRepository = eventsRepository
): TelemetryActionHandler<unknown, StatsSummaryResult> {
  return async (
    payload: unknown,
    ctx: TelemetryActionContext
  ): Promise<StatsSummaryResult> => {
    // 1. Validate payload
    let validatedPayload: StatsSummaryPayload;
    try {
      validatedPayload = statsSummaryPayloadSchema.parse(payload);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(error);
      }
      throw error;
    }

    // 2. Security: Verify workspace access
    if (ctx.workspaceId && ctx.workspaceId !== validatedPayload.workspaceId) {
      throw new AuthorizationError(
        "Workspace ID mismatch - access denied",
        "WORKSPACE_MISMATCH"
      );
    }

    // 3. Calculate time window
    const toTimestamp = new Date();
    const fromTimestamp = new Date(
      toTimestamp.getTime() - validatedPayload.timeWindowHours * 60 * 60 * 1000
    );

    // 4. Fetch aggregated stats from repository
    const routeStats = await repository.aggregateByRoute({
      workspaceId: validatedPayload.workspaceId,
      fromTimestamp,
      routeId: validatedPayload.routeId,
    });

    // 5. Transform and calculate totals
    const routes = routeStats.map(transformRouteStats);

    const totals = routes.reduce(
      (acc, route) => ({
        totalRequests: acc.totalRequests + route.totalRequests,
        successCount: acc.successCount + route.successCount,
        errorCount: acc.errorCount + route.errorCount,
        avgDurationMs: null, // Will calculate below
      }),
      {
        totalRequests: 0,
        successCount: 0,
        errorCount: 0,
        avgDurationMs: null as number | null,
      }
    );

    // Calculate weighted average duration
    if (totals.totalRequests > 0) {
      const totalDurationWeight = routes.reduce((sum, route) => {
        if (route.avgDurationMs !== null) {
          return sum + route.avgDurationMs * route.totalRequests;
        }
        return sum;
      }, 0);
      totals.avgDurationMs =
        Math.round((totalDurationWeight / totals.totalRequests) * 100) / 100;
    }

    return {
      workspaceId: validatedPayload.workspaceId,
      timeWindowHours: validatedPayload.timeWindowHours,
      fromTimestamp: fromTimestamp.toISOString(),
      toTimestamp: toTimestamp.toISOString(),
      routes,
      totals,
    };
  };
}

export const statsSummaryHandler = createStatsSummaryHandler();
