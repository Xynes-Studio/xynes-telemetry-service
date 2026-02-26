import { describe, expect, it, vi } from "vitest";
import { createGatewayRequestLogIngestHandler } from "../../../src/actions/handlers/gateway-request-log-ingest.handler";
import { ValidationError } from "../../../src/errors";
import type { GatewayRequestLogsRepository } from "../../../src/repositories";

describe("Gateway Request Log Ingest Handler", () => {
  const createMockRepo = (): GatewayRequestLogsRepository => ({
    create: vi.fn().mockResolvedValue({
      id: "550e8400-e29b-41d4-a716-446655440000",
      requestId: "req_abc_123",
      method: "GET",
      path: "/health",
      pathPattern: null,
      routeId: null,
      serviceKey: null,
      actionKey: null,
      statusCode: 200,
      durationMs: 12,
      workspaceId: null,
      userId: null,
      clientIpHash: null,
      geoCountry: null,
      geoRegion: null,
      geoCity: null,
      geoSource: null,
      deviceType: null,
      deviceBrowser: null,
      deviceOs: null,
      userAgent: null,
      errorCode: null,
      requestSnippet: null,
      responseSnippet: null,
      requestSizeBytes: null,
      responseSizeBytes: null,
      occurredAt: new Date(),
      createdAt: new Date("2026-02-25T10:00:00Z"),
    }),
    deleteOlderThan: vi.fn().mockResolvedValue(0),
  });

  it("creates gateway access log row", async () => {
    const repo = createMockRepo();
    const handler = createGatewayRequestLogIngestHandler(repo);

    const payload = {
      requestId: "req_abc_123",
      timestamp: new Date().toISOString(),
      method: "GET",
      path: "/health",
      statusCode: 200,
      durationMs: 12,
      geo: { country: "US", source: "cf" },
      device: { type: "desktop", browser: "Chrome", os: "Mac OS" },
    };

    const result = await handler(payload, { requestId: "ctx-1" });
    expect(result.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(repo.create).toHaveBeenCalledOnce();
  });

  it("throws ValidationError on invalid payload", async () => {
    const repo = createMockRepo();
    const handler = createGatewayRequestLogIngestHandler(repo);

    await expect(
      handler(
        {
          requestId: "",
          timestamp: "nope",
        },
        { requestId: "ctx-1" },
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
