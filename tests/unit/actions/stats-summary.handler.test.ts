import { describe, it, expect, vi, beforeEach } from "vitest";
import { createStatsSummaryHandler } from "../../../src/actions/handlers/stats-summary.handler";
import { ValidationError, AuthorizationError } from "../../../src/errors";
import type { TelemetryActionContext } from "../../../src/actions/types";
import type {
  EventsRepository,
  RouteStatsRow,
} from "../../../src/repositories";
import type { Event } from "../../../src/db/schema";

describe("Stats Summary Handler (TELE-VIEW-1)", () => {
  const mockRouteStats: RouteStatsRow[] = [
    {
      routeId: "route-1",
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
    },
    {
      routeId: "route-2",
      serviceKey: "cms-core",
      actionKey: "cms.blog.list",
      method: "GET",
      pathPattern: "/workspaces/:workspaceId/blog",
      totalRequests: 50,
      successCount: 50,
      errorCount: 0,
      avgDurationMs: 30.2,
      minDurationMs: 5,
      maxDurationMs: 100,
    },
  ];

  const createMockRepository = (
    routeStats: RouteStatsRow[] = mockRouteStats
  ): EventsRepository => ({
    create: vi.fn(),
    listRecent: vi.fn(),
    aggregateByRoute: vi.fn().mockResolvedValue(routeStats),
  });

  const validPayload = {
    workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    timeWindowHours: 24,
  };

  const ctx: TelemetryActionContext = {
    requestId: "test-req-id",
    workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    userId: "user-456",
  };

  describe("valid payload", () => {
    it("should return aggregated stats for valid payload", async () => {
      const mockRepo = createMockRepository();
      const handler = createStatsSummaryHandler(mockRepo);

      const result = await handler(validPayload, ctx);

      expect(result.workspaceId).toBe(validPayload.workspaceId);
      expect(result.timeWindowHours).toBe(24);
      expect(result.routes).toHaveLength(2);
      expect(result.totals.totalRequests).toBe(150);
      expect(result.totals.successCount).toBe(145);
      expect(result.totals.errorCount).toBe(5);
    });

    it("should calculate weighted average duration correctly", async () => {
      const mockRepo = createMockRepository();
      const handler = createStatsSummaryHandler(mockRepo);

      const result = await handler(validPayload, ctx);

      // Weighted average: (45.5 * 100 + 30.2 * 50) / 150 = 40.4
      expect(result.totals.avgDurationMs).toBeCloseTo(40.4, 1);
    });

    it("should include timestamp range in response", async () => {
      const mockRepo = createMockRepository();
      const handler = createStatsSummaryHandler(mockRepo);

      const result = await handler(validPayload, ctx);

      expect(result.fromTimestamp).toBeDefined();
      expect(result.toTimestamp).toBeDefined();

      const from = new Date(result.fromTimestamp);
      const to = new Date(result.toTimestamp);
      const diffHours = (to.getTime() - from.getTime()) / (1000 * 60 * 60);

      expect(diffHours).toBeCloseTo(24, 0);
    });

    it("should apply routeId filter when provided", async () => {
      const mockRepo = createMockRepository();
      const handler = createStatsSummaryHandler(mockRepo);

      await handler({ ...validPayload, routeId: "route-1" }, ctx);

      expect(mockRepo.aggregateByRoute).toHaveBeenCalledWith(
        expect.objectContaining({
          routeId: "route-1",
        })
      );
    });

    it("should use default time window when not provided", async () => {
      const mockRepo = createMockRepository();
      const handler = createStatsSummaryHandler(mockRepo);

      const result = await handler(
        { workspaceId: validPayload.workspaceId },
        ctx
      );

      expect(result.timeWindowHours).toBe(24); // DEFAULT_TIME_WINDOW_HOURS
    });

    it("should round avgDurationMs to 2 decimal places", async () => {
      const statsWithLongDecimal: RouteStatsRow[] = [
        {
          ...mockRouteStats[0]!,
          avgDurationMs: 45.123456789,
        },
      ];
      const mockRepo = createMockRepository(statsWithLongDecimal);
      const handler = createStatsSummaryHandler(mockRepo);

      const result = await handler(validPayload, ctx);

      expect(result.routes[0]?.avgDurationMs).toBe(45.12);
    });
  });

  describe("validation errors", () => {
    it("should throw ValidationError for invalid workspaceId", async () => {
      const mockRepo = createMockRepository();
      const handler = createStatsSummaryHandler(mockRepo);

      await expect(handler({ workspaceId: "not-a-uuid" }, ctx)).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError for timeWindowHours exceeding max", async () => {
      const mockRepo = createMockRepository();
      const handler = createStatsSummaryHandler(mockRepo);

      await expect(
        handler({ ...validPayload, timeWindowHours: 200 }, ctx)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for zero timeWindowHours", async () => {
      const mockRepo = createMockRepository();
      const handler = createStatsSummaryHandler(mockRepo);

      await expect(
        handler({ ...validPayload, timeWindowHours: 0 }, ctx)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("authorization", () => {
    it("should throw AuthorizationError when workspaceId mismatch", async () => {
      const mockRepo = createMockRepository();
      const handler = createStatsSummaryHandler(mockRepo);

      const mismatchCtx: TelemetryActionContext = {
        requestId: "test-req-id",
        workspaceId: "different-workspace-id-1234567890",
        userId: "user-456",
      };

      await expect(handler(validPayload, mismatchCtx)).rejects.toThrow(
        AuthorizationError
      );
    });

    it("should allow access when context has no workspaceId", async () => {
      const mockRepo = createMockRepository();
      const handler = createStatsSummaryHandler(mockRepo);

      const ctxNoWorkspace: TelemetryActionContext = {
        requestId: "test-req-id",
        userId: "user-456",
      };

      const result = await handler(validPayload, ctxNoWorkspace);
      expect(result.routes).toHaveLength(2);
    });
  });

  describe("empty results", () => {
    it("should return empty routes array when no stats found", async () => {
      const mockRepo = createMockRepository([]);
      const handler = createStatsSummaryHandler(mockRepo);

      const result = await handler(validPayload, ctx);

      expect(result.routes).toHaveLength(0);
      expect(result.totals.totalRequests).toBe(0);
      expect(result.totals.successCount).toBe(0);
      expect(result.totals.errorCount).toBe(0);
      expect(result.totals.avgDurationMs).toBeNull();
    });
  });

  describe("null handling", () => {
    it("should handle null values in route stats", async () => {
      const statsWithNulls: RouteStatsRow[] = [
        {
          routeId: null,
          serviceKey: null,
          actionKey: null,
          method: "GET",
          pathPattern: null,
          totalRequests: 10,
          successCount: 10,
          errorCount: 0,
          avgDurationMs: null,
          minDurationMs: null,
          maxDurationMs: null,
        },
      ];
      const mockRepo = createMockRepository(statsWithNulls);
      const handler = createStatsSummaryHandler(mockRepo);

      const result = await handler(validPayload, ctx);

      expect(result.routes[0]?.routeId).toBeNull();
      expect(result.routes[0]?.avgDurationMs).toBeNull();
      expect(result.routes[0]?.p95DurationMs).toBeNull();
    });
  });
});
