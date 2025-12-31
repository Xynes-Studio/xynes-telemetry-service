import { describe, it, expect } from "vitest";
import {
  eventsListPayloadSchema,
  MAX_LIMIT,
  DEFAULT_LIMIT,
} from "../../../../src/actions/schemas/events-list.schema";

describe("Events List Schema (TELE-VIEW-1)", () => {
  const validPayload = {
    workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    limit: 50,
  };

  describe("eventsListPayloadSchema", () => {
    it("should validate complete payload", () => {
      const result = eventsListPayloadSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        limit: 25,
        statusCode: 200,
        routeId: "route-123",
        eventType: "http_request",
        cursor: "2024-01-15T12:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });

    it("should apply default limit when not provided", () => {
      const result = eventsListPayloadSchema.parse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
      });
      expect(result.limit).toBe(DEFAULT_LIMIT);
    });

    it("should reject invalid UUID for workspaceId", () => {
      const result = eventsListPayloadSchema.safeParse({
        workspaceId: "not-a-uuid",
      });
      expect(result.success).toBe(false);
    });

    it("should reject limit exceeding MAX_LIMIT", () => {
      const result = eventsListPayloadSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        limit: MAX_LIMIT + 1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject negative limit", () => {
      const result = eventsListPayloadSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        limit: -1,
      });
      expect(result.success).toBe(false);
    });

    it("should reject zero limit", () => {
      const result = eventsListPayloadSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        limit: 0,
      });
      expect(result.success).toBe(false);
    });

    it("should reject invalid status code", () => {
      const result = eventsListPayloadSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        statusCode: 999,
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid status code range", () => {
      for (const statusCode of [100, 200, 301, 404, 500, 599]) {
        const result = eventsListPayloadSchema.safeParse({
          workspaceId: "550e8400-e29b-41d4-a716-446655440000",
          statusCode,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should reject invalid cursor format", () => {
      const result = eventsListPayloadSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        cursor: "not-a-datetime",
      });
      expect(result.success).toBe(false);
    });

    it("should accept valid ISO datetime cursor", () => {
      const result = eventsListPayloadSchema.safeParse({
        workspaceId: "550e8400-e29b-41d4-a716-446655440000",
        cursor: "2024-01-15T12:00:00.000Z",
      });
      expect(result.success).toBe(true);
    });
  });
});
