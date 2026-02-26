import { describe, expect, it } from "vitest";
import { gatewayRequestLogPayloadSchema } from "../../../../src/actions/schemas/gateway-request-log.schema";

describe("gatewayRequestLogPayloadSchema", () => {
  const validPayload = {
    requestId: "req_abc_123",
    timestamp: new Date().toISOString(),
    method: "GET",
    path: "/workspaces/ws-1/documents",
    pathPattern: "/workspaces/:workspaceId/documents",
    routeId: "route-1",
    serviceKey: "doc-service",
    actionKey: "docs.document.listByWorkspace",
    statusCode: 200,
    durationMs: 31,
    workspaceId: "ws-1",
    userId: "user-1",
    clientIpHash: "ab12cd34ef56ab12",
    userAgent: "Mozilla/5.0",
    requestSnippet: "{\"q\":\"docs\"}",
    responseSnippet: "{\"ok\":true}",
    requestSizeBytes: 13,
    responseSizeBytes: 11,
    geo: {
      country: "US",
      region: "CA",
      city: "San Francisco",
      source: "cf",
    },
    device: {
      type: "desktop",
      browser: "Chrome",
      os: "Mac OS",
    },
  };

  it("accepts valid payload", () => {
    const result = gatewayRequestLogPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects query string in path", () => {
    const result = gatewayRequestLogPayloadSchema.safeParse({
      ...validPayload,
      path: "/x?token=secret",
    });
    expect(result.success).toBe(false);
  });

  it("rejects suspicious raw ip markers", () => {
    const result = gatewayRequestLogPayloadSchema.safeParse({
      ...validPayload,
      requestSnippet: '{"clientIp":"203.0.113.7"}',
    });
    expect(result.success).toBe(false);
  });
});
