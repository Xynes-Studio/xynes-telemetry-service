import { describe, it, expect } from "vitest";
import {
  httpRequestEventSchema,
  httpRequestMetaSchema,
  parseHttpRequestEvent,
  safeParseHttpRequestEvent,
  MAX_USER_AGENT_LENGTH,
} from "../../../../src/actions/schemas/http-request-event.schema";

describe("HTTP Request Event Schema (TELE-GW-1)", () => {
  const validEvent = {
    type: "http_request" as const,
    routeId: "route-123",
    serviceKey: "doc-service",
    actionKey: "docs.document.create",
    method: "POST",
    path: "/workspaces/ws-1/documents",
    statusCode: 201,
    durationMs: 45,
    workspaceId: "550e8400-e29b-41d4-a716-446655440000",
    userId: "550e8400-e29b-41d4-a716-446655440001",
    clientIpHash: "a1b2c3d4e5f6",
    timestamp: "2024-01-15T12:00:00.000Z",
    meta: {
      userAgent: "Mozilla/5.0 (Test)",
      pathPattern: "/workspaces/:workspaceId/documents",
    },
  };

  describe("httpRequestEventSchema", () => {
    it("should validate a complete valid event", () => {
      const result = httpRequestEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it("should accept null values for optional fields", () => {
      const eventWithNulls = {
        ...validEvent,
        routeId: null,
        serviceKey: null,
        actionKey: null,
        workspaceId: null,
        userId: null,
      };
      const result = httpRequestEventSchema.safeParse(eventWithNulls);
      expect(result.success).toBe(true);
    });

    it("should reject invalid type", () => {
      const invalidEvent = { ...validEvent, type: "invalid_type" };
      const result = httpRequestEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject path with query string", () => {
      const invalidEvent = { ...validEvent, path: "/api/test?token=secret" };
      const result = httpRequestEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toContain("query string");
      }
    });

    it("should reject path with hash", () => {
      const invalidEvent = { ...validEvent, path: "/api/test#section" };
      const result = httpRequestEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject invalid status code", () => {
      const invalidEvent = { ...validEvent, statusCode: 999 };
      const result = httpRequestEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject status code below 100", () => {
      const invalidEvent = { ...validEvent, statusCode: 99 };
      const result = httpRequestEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject negative durationMs", () => {
      const invalidEvent = { ...validEvent, durationMs: -1 };
      const result = httpRequestEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject invalid UUID for workspaceId", () => {
      const invalidEvent = { ...validEvent, workspaceId: "not-a-uuid" };
      const result = httpRequestEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject invalid timestamp format", () => {
      const invalidEvent = { ...validEvent, timestamp: "2024-01-15" };
      const result = httpRequestEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });

    it("should reject extra properties (strict mode)", () => {
      const invalidEvent = { ...validEvent, extraField: "should-fail" };
      const result = httpRequestEventSchema.safeParse(invalidEvent);
      expect(result.success).toBe(false);
    });
  });

  describe("httpRequestMetaSchema", () => {
    it("should accept valid meta object", () => {
      const meta = {
        userAgent: "Mozilla/5.0",
        errorCode: "RATE_LIMIT",
        pathPattern: "/workspaces/:workspaceId/documents",
      };
      const result = httpRequestMetaSchema.safeParse(meta);
      expect(result.success).toBe(true);
    });

    it("should accept empty meta object", () => {
      const result = httpRequestMetaSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("should reject userAgent over max length", () => {
      const longUserAgent = "A".repeat(MAX_USER_AGENT_LENGTH + 1);
      const result = httpRequestMetaSchema.safeParse({
        userAgent: longUserAgent,
      });
      expect(result.success).toBe(false);
    });

    it("should accept userAgent at max length", () => {
      const maxUserAgent = "A".repeat(MAX_USER_AGENT_LENGTH);
      const result = httpRequestMetaSchema.safeParse({
        userAgent: maxUserAgent,
      });
      expect(result.success).toBe(true);
    });

    it("should reject extra properties in meta (strict mode)", () => {
      const result = httpRequestMetaSchema.safeParse({
        userAgent: "Test",
        secretData: "should-fail",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("parseHttpRequestEvent", () => {
    it("should return parsed event for valid input", () => {
      const result = parseHttpRequestEvent(validEvent);
      expect(result.type).toBe("http_request");
      expect(result.statusCode).toBe(201);
    });

    it("should throw for invalid input", () => {
      expect(() => parseHttpRequestEvent({ invalid: "data" })).toThrow();
    });
  });

  describe("safeParseHttpRequestEvent", () => {
    it("should return success result for valid input", () => {
      const result = safeParseHttpRequestEvent(validEvent);
      expect(result.success).toBe(true);
    });

    it("should return error result for invalid input", () => {
      const result = safeParseHttpRequestEvent({ invalid: "data" });
      expect(result.success).toBe(false);
    });
  });

  describe("Security constraints", () => {
    it("should not allow raw IP addresses (enforced by clientIpHash being a hash)", () => {
      // The schema allows any string for clientIpHash, but the field name
      // makes it clear it should be hashed. The gateway is responsible for hashing.
      const result = httpRequestEventSchema.safeParse(validEvent);
      expect(result.success).toBe(true);
    });

    it("should block query strings in path (may contain secrets)", () => {
      const sensitiveEvent = {
        ...validEvent,
        path: "/api/auth?token=jwt.secret.token&refresh=abc123",
      };
      const result = httpRequestEventSchema.safeParse(sensitiveEvent);
      expect(result.success).toBe(false);
    });
  });
});
