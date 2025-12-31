import { db } from "../db/client";
import { events, type NewEvent, type Event } from "../db/schema";
import { eq, and, lt, desc, sql, gte } from "drizzle-orm";

/**
 * Filter options for listing events
 */
export interface EventsListOptions {
  workspaceId: string;
  limit: number;
  statusCode?: number;
  routeId?: string;
  eventType?: string;
  cursor?: string; // ISO timestamp for pagination
}

/**
 * Filter options for stats aggregation
 */
export interface StatsAggregateOptions {
  workspaceId: string;
  fromTimestamp: Date;
  routeId?: string;
}

/**
 * Route stats aggregate result
 */
export interface RouteStatsRow {
  routeId: string | null;
  serviceKey: string | null;
  actionKey: string | null;
  method: string | null;
  pathPattern: string | null;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgDurationMs: number | null;
  minDurationMs: number | null;
  maxDurationMs: number | null;
}

export interface EventsRepository {
  create(event: NewEvent): Promise<Event>;
  listRecent(options: EventsListOptions): Promise<Event[]>;
  aggregateByRoute(options: StatsAggregateOptions): Promise<RouteStatsRow[]>;
}

export function createEventsRepository(): EventsRepository {
  return {
    async create(event: NewEvent): Promise<Event> {
      const [inserted] = await db.insert(events).values(event).returning();
      if (!inserted) {
        throw new Error("Failed to insert event");
      }
      return inserted;
    },

    /**
     * TELE-VIEW-1: List recent events for a workspace with optional filters.
     * Results are ordered by createdAt descending (newest first).
     */
    async listRecent(options: EventsListOptions): Promise<Event[]> {
      const conditions = [eq(events.workspaceId, options.workspaceId)];

      // Cursor-based pagination
      if (options.cursor) {
        conditions.push(lt(events.createdAt, new Date(options.cursor)));
      }

      // Filter by eventType (e.g., "http_request")
      if (options.eventType) {
        conditions.push(eq(events.eventType, options.eventType));
      }

      // Filter by routeId in metadata (JSON path)
      // Note: statusCode and routeId filtering is done on metadata JSONB
      const baseQuery = db
        .select()
        .from(events)
        .where(and(...conditions))
        .orderBy(desc(events.createdAt))
        .limit(options.limit);

      const results = await baseQuery;

      // Post-filter for metadata fields if needed
      // (In production, consider adding GIN index on metadata for better performance)
      let filtered = results;

      if (options.statusCode !== undefined) {
        filtered = filtered.filter((e) => {
          const meta = e.metadata as Record<string, unknown> | null;
          return meta?.statusCode === options.statusCode;
        });
      }

      if (options.routeId !== undefined) {
        filtered = filtered.filter((e) => {
          const meta = e.metadata as Record<string, unknown> | null;
          return meta?.routeId === options.routeId;
        });
      }

      return filtered;
    },

    /**
     * TELE-VIEW-1: Aggregate stats by route for a workspace.
     * Returns counts and duration metrics per routeId.
     */
    async aggregateByRoute(
      options: StatsAggregateOptions
    ): Promise<RouteStatsRow[]> {
      // Use raw SQL for JSON aggregation - more efficient than loading all rows
      const conditions = [
        eq(events.workspaceId, options.workspaceId),
        gte(events.createdAt, options.fromTimestamp),
        eq(events.eventType, "http_request"), // Only aggregate http_request events
      ];

      if (options.routeId) {
        // Filter by specific routeId - requires JSON path query
        // Using sql`` for JSONB comparison
        conditions.push(
          sql`${events.metadata}->>'routeId' = ${options.routeId}`
        );
      }

      const result = await db
        .select({
          routeId: sql<string | null>`${events.metadata}->>'routeId'`,
          serviceKey: sql<string | null>`${events.metadata}->>'serviceKey'`,
          actionKey: sql<string | null>`${events.metadata}->>'actionKey'`,
          method: sql<string | null>`${events.metadata}->>'method'`,
          pathPattern: sql<
            string | null
          >`${events.metadata}->'meta'->>'pathPattern'`,
          totalRequests: sql<number>`count(*)::int`,
          successCount: sql<number>`count(*) filter (where (${events.metadata}->>'statusCode')::int between 200 and 299)::int`,
          errorCount: sql<number>`count(*) filter (where (${events.metadata}->>'statusCode')::int >= 400)::int`,
          avgDurationMs: sql<
            number | null
          >`avg((${events.metadata}->>'durationMs')::numeric)`,
          minDurationMs: sql<
            number | null
          >`min((${events.metadata}->>'durationMs')::int)`,
          maxDurationMs: sql<
            number | null
          >`max((${events.metadata}->>'durationMs')::int)`,
        })
        .from(events)
        .where(and(...conditions))
        .groupBy(
          sql`${events.metadata}->>'routeId'`,
          sql`${events.metadata}->>'serviceKey'`,
          sql`${events.metadata}->>'actionKey'`,
          sql`${events.metadata}->>'method'`,
          sql`${events.metadata}->'meta'->>'pathPattern'`
        )
        .orderBy(sql`count(*) desc`);

      return result;
    },
  };
}

export const eventsRepository = createEventsRepository();
