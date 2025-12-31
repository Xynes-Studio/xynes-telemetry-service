import { describe, it, expect, vi, beforeEach } from "vitest";
import { createEventsListHandler } from "../../../src/actions/handlers/events-list.handler";
import { ValidationError, AuthorizationError } from "../../../src/errors";
import type { TelemetryActionContext } from "../../../src/actions/types";
import type { EventsRepository } from "../../../src/repositories";
import type { Event } from "../../../src/db/schema";

describe("Events List Handler (TELE-VIEW-1)", () => {
  const mockEvent: Event = {
    id: "test-event-id-1",
    workspaceId: "ws-123",
    userId: "user-456",
    source: "gateway",
    eventType: "http_request",
    name: "gateway.http_request",
    targetType: "service",
    targetId: "doc-service",
    metadata: {
      type: "http_request",
      routeId: "route-1",
      serviceKey: "doc-service",
      actionKey: "docs.document.create",
      method: "POST",
      path: "/workspaces/ws-123/documents",
      statusCode: 201,
      durationMs: 45,
    },
    createdAt: new Date("2024-01-15T12:00:00Z"),
  };

  const createMockRepository = (
    events: Event[] = [mockEvent]
  ): EventsRepository => ({
    create: vi.fn().mockResolvedValue(mockEvent),
    listRecent: vi.fn().mockResolvedValue(events),
    aggregateByRoute: vi.fn().mockResolvedValue([]),
  });

  const validPayload = {
    workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    limit: 10,
  };

  const ctx: TelemetryActionContext = {
    requestId: "test-req-id",
    workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    userId: "user-456",
  };

  describe("valid payload", () => {
    it("should return events list for valid payload", async () => {
      const events = [{ ...mockEvent, workspaceId: validPayload.workspaceId }];
      const mockRepo = createMockRepository(events);
      const handler = createEventsListHandler(mockRepo);

      const result = await handler(validPayload, ctx);

      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toHaveProperty("id");
      expect(result.events[0]).toHaveProperty("source", "gateway");
      expect(result.events[0]).toHaveProperty("eventType", "http_request");
      expect(result.nextCursor).toBeNull();
    });

    it("should sanitize metadata in response", async () => {
      const eventWithSensitiveData: Event = {
        ...mockEvent,
        workspaceId: validPayload.workspaceId,
        metadata: {
          type: "http_request",
          routeId: "route-1",
          statusCode: 200,
          // These should NOT be in response (if they existed)
          rawHeaders: { authorization: "Bearer secret" },
          body: { password: "secret" },
        },
      };
      const mockRepo = createMockRepository([eventWithSensitiveData]);
      const handler = createEventsListHandler(mockRepo);

      const result = await handler(validPayload, ctx);

      expect(result.events[0]?.metadata).not.toHaveProperty("rawHeaders");
      expect(result.events[0]?.metadata).not.toHaveProperty("body");
      expect(result.events[0]?.metadata).toHaveProperty("type", "http_request");
    });

    it("should apply optional filters", async () => {
      const mockRepo = createMockRepository([mockEvent]);
      const handler = createEventsListHandler(mockRepo);

      const payloadWithFilters = {
        ...validPayload,
        statusCode: 200,
        routeId: "route-1",
        eventType: "http_request",
      };

      await handler(payloadWithFilters, ctx);

      expect(mockRepo.listRecent).toHaveBeenCalledWith(
        expect.objectContaining({
          workspaceId: validPayload.workspaceId,
          statusCode: 200,
          routeId: "route-1",
          eventType: "http_request",
        })
      );
    });

    it("should handle pagination with cursor", async () => {
      const events = Array.from({ length: 11 }, (_, i) => ({
        ...mockEvent,
        id: `event-${i}`,
        workspaceId: validPayload.workspaceId,
        createdAt: new Date(Date.now() - i * 1000),
      }));
      const mockRepo = createMockRepository(events);
      const handler = createEventsListHandler(mockRepo);

      const result = await handler({ ...validPayload, limit: 10 }, ctx);

      expect(result.events).toHaveLength(10);
      expect(result.nextCursor).not.toBeNull();
    });

    it("should return null cursor when no more results", async () => {
      const events = [{ ...mockEvent, workspaceId: validPayload.workspaceId }];
      const mockRepo = createMockRepository(events);
      const handler = createEventsListHandler(mockRepo);

      const result = await handler(validPayload, ctx);

      expect(result.nextCursor).toBeNull();
    });
  });

  describe("validation errors", () => {
    it("should throw ValidationError for invalid workspaceId", async () => {
      const mockRepo = createMockRepository();
      const handler = createEventsListHandler(mockRepo);

      await expect(handler({ workspaceId: "not-a-uuid" }, ctx)).rejects.toThrow(
        ValidationError
      );
    });

    it("should throw ValidationError for limit exceeding max", async () => {
      const mockRepo = createMockRepository();
      const handler = createEventsListHandler(mockRepo);

      await expect(
        handler({ ...validPayload, limit: 200 }, ctx)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for negative limit", async () => {
      const mockRepo = createMockRepository();
      const handler = createEventsListHandler(mockRepo);

      await expect(
        handler({ ...validPayload, limit: -1 }, ctx)
      ).rejects.toThrow(ValidationError);
    });

    it("should throw ValidationError for invalid cursor format", async () => {
      const mockRepo = createMockRepository();
      const handler = createEventsListHandler(mockRepo);

      await expect(
        handler({ ...validPayload, cursor: "invalid-date" }, ctx)
      ).rejects.toThrow(ValidationError);
    });
  });

  describe("authorization", () => {
    it("should throw AuthorizationError when workspaceId mismatch", async () => {
      const mockRepo = createMockRepository();
      const handler = createEventsListHandler(mockRepo);

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
      // Gateway may not always set workspaceId - handler trusts authz was done
      const events = [{ ...mockEvent, workspaceId: validPayload.workspaceId }];
      const mockRepo = createMockRepository(events);
      const handler = createEventsListHandler(mockRepo);

      const ctxNoWorkspace: TelemetryActionContext = {
        requestId: "test-req-id",
        userId: "user-456",
      };

      const result = await handler(validPayload, ctxNoWorkspace);
      expect(result.events).toHaveLength(1);
    });
  });

  describe("empty results", () => {
    it("should return empty array when no events found", async () => {
      const mockRepo = createMockRepository([]);
      const handler = createEventsListHandler(mockRepo);

      const result = await handler(validPayload, ctx);

      expect(result.events).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });
  });
});
