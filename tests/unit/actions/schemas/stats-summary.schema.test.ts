import { describe, it, expect } from "vitest";
import {
  statsSummaryPayloadSchema,
  routeStatsSchema,
  DEFAULT_TIME_WINDOW_HOURS,
  MAX_TIME_WINDOW_HOURS,
} from "../../../../src/actions/schemas/stats-summary.schema";

describe("Stats Summary Schema (TELE-VIEW-1)", () => {
  describe("statsSummaryPayloadSchema", () => {
    it("should validate complete payload", () => {
      const result = statsSummaryPayloadSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        timeWindowHours: 48,
        routeId: "route-123",
      });
      expect(result.success).toBe(true);
    });

    it("should apply default timeWindowHours when not provided", () => {
      const result = statsSummaryPayloadSchema.parse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.timeWindowHours).toBe(DEFAULT_TIME_WINDOW_HOURS);
    });

    it("should reject invalid UUID for workspaceId", () => {
      const result = statsSummaryPayloadSchema.safeParse({
        workspaceId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject timeWindowHours exceeding max", () => {
      const result = statsSummaryPayloadSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        timeWindowHours: MAX_TIME_WINDOW_HOURS + 1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject zero timeWindowHours", () => {
      const result = statsSummaryPayloadSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        timeWindowHours: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should accept maximum allowed timeWindowHours", () => {
      const result = statsSummaryPayloadSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        timeWindowHours: MAX_TIME_WINDOW_HOURS,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("routeStatsSchema", () => {
    const validRouteStats = {
      routeId: "route-123",
      serviceKey: "doc-service",
      actionKey: "docs.document.create",
      method: "POST",
      pathPattern: "/workspaces/:workspaceId/documents",
      totalRequests: 100,
      successCount: 95,
      errorCount: 5,
      avgDurationMs: 45.5,
      minDurationMs: 10,
      maxDurationMs: 200,
      p95DurationMs: 150,
    };

    it("should validate complete route stats", () => {
      const result = routeStatsSchema.safeParse(validRouteStats);
      expect(result.success).toBe(true);
    });

    it("should accept null values for optional fields", () => {
      const result = routeStatsSchema.safeParse({
        ...validRouteStats,
        routeId: null,
        serviceKey: null,
        actionKey: null,
        pathPattern: null,
        avgDurationMs: null,
        minDurationMs: null,
        maxDurationMs: null,
        p95DurationMs: null,
      });
      expect(result.success).toBe(true);
    });

    it("should reject non-integer counts", () => {
      const result = routeStatsSchema.safeParse({
        ...validRouteStats,
        totalRequests: 10.5,
      });
      expect(result.success).toBe(false);
    });
  });
});
