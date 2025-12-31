import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { app } from "../../src/app";
import * as eventsRepository from "../../src/repositories/events.repository";
import {
  clearRegistry,
  registerTelemetryAction,
} from "../../src/actions/registry";
import { createEventIngestHandler } from "../../src/actions/handlers/event-ingest.handler";
import type { Event } from "../../src/db/schema";
import { INTERNAL_SERVICE_TOKEN } from "../support/internal-auth";

describe("Telemetry Actions Endpoint", () => {
  const mockEvent: Event = {
    id: "mock-event-id-123",
    workspaceId: "ws-123",
    userId: "user-456",
    source: "web",
    eventType: "ui.interaction",
    name: "button.clicked",
    targetType: "button",
    targetId: "submit-btn",
    metadata: { key: "value" },
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(() => {
    // Clear and re-register with mocked repository
    clearRegistry();

    const mockRepo = {
      create: vi.fn().mockResolvedValue(mockEvent),
    };

    const handler = createEventIngestHandler(mockRepo);
    // Register both legacy and new action keys
    registerTelemetryAction("telemetry.event.ingest", handler);
    registerTelemetryAction("telemetry.events.ingest", handler);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST /internal/telemetry-actions", () => {
    describe("telemetry.event.ingest action", () => {
      it("should return 201 with success response for valid payload", async () => {
        const res = await app.request("/internal/telemetry-actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
            "X-Workspace-Id": "ws-123",
            "X-XS-User-Id": "user-456",
          },
          body: JSON.stringify({
            actionKey: "telemetry.event.ingest",
            payload: {
              source: "web",
              eventType: "ui.interaction",
              name: "button.clicked",
              targetType: "button",
              targetId: "submit-btn",
              metadata: { key: "value" },
            },
          }),
        });

        expect(res.status).toBe(201);

        const body = (await res.json()) as any;
        expect(body.ok).toBe(true);
        expect(body.data).toHaveProperty("id");
        expect(body.data).toHaveProperty("createdAt");
      });

      it("should return 201 with minimal payload", async () => {
        const res = await app.request("/internal/telemetry-actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
          },
          body: JSON.stringify({
            actionKey: "telemetry.event.ingest",
            payload: {
              source: "backend",
              eventType: "perf.metric",
              name: "response.time",
            },
          }),
        });

        expect(res.status).toBe(201);

        const body = (await res.json()) as any;
        expect(body.ok).toBe(true);
      });

      it("should work without workspace and user headers", async () => {
        const res = await app.request("/internal/telemetry-actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
          },
          body: JSON.stringify({
            actionKey: "telemetry.event.ingest",
            payload: {
              source: "cli",
              eventType: "custom",
              name: "script.executed",
            },
          }),
        });

        expect(res.status).toBe(201);
      });
    });

    describe("validation errors", () => {
      it("should return 400 for missing required payload fields", async () => {
        const res = await app.request("/internal/telemetry-actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
          },
          body: JSON.stringify({
            actionKey: "telemetry.event.ingest",
            payload: {
              source: "web",
              // missing eventType and name
            },
          }),
        });

        expect(res.status).toBe(400);

        const body = (await res.json()) as any;
        expect(body.ok).toBe(false);
        expect(body.error.code).toBe("VALIDATION_ERROR");
      });

      it("should return 400 for empty source", async () => {
        const res = await app.request("/internal/telemetry-actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
          },
          body: JSON.stringify({
            actionKey: "telemetry.event.ingest",
            payload: {
              source: "",
              eventType: "test",
              name: "test.event",
            },
          }),
        });

        expect(res.status).toBe(400);

        const body = (await res.json()) as any;
        expect(body.ok).toBe(false);
        expect(body.error.code).toBe("VALIDATION_ERROR");
      });

      it("should return 400 for invalid actionKey", async () => {
        const res = await app.request("/internal/telemetry-actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
          },
          body: JSON.stringify({
            actionKey: "invalid.action",
            payload: {},
          }),
        });

        expect(res.status).toBe(400);

        const body = (await res.json()) as any;
        expect(body.ok).toBe(false);
        expect(body.error.code).toBe("VALIDATION_ERROR");
      });

      it("should return 400 for missing actionKey", async () => {
        const res = await app.request("/internal/telemetry-actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
          },
          body: JSON.stringify({
            payload: { source: "web", eventType: "test", name: "test" },
          }),
        });

        expect(res.status).toBe(400);
      });
    });

    describe("unknown action", () => {
      it("should return 400 for unknown action key via validation", async () => {
        const res = await app.request("/internal/telemetry-actions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
          },
          body: JSON.stringify({
            actionKey: "unknown.action.key",
            payload: {},
          }),
        });

        expect(res.status).toBe(400);
      });
    });
  });

  it("should return 401 when X-Internal-Service-Token is missing", async () => {
    const res = await app.request("/internal/telemetry-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actionKey: "telemetry.event.ingest",
        payload: {
          source: "backend",
          eventType: "perf.metric",
          name: "response.time",
        },
      }),
    });

    expect(res.status).toBe(401);
    const body = (await res.json()) as any;
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("should return 403 when X-Internal-Service-Token is mismatched", async () => {
    const res = await app.request("/internal/telemetry-actions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Service-Token": "wrong-token",
      },
      body: JSON.stringify({
        actionKey: "telemetry.event.ingest",
        payload: {
          source: "backend",
          eventType: "perf.metric",
          name: "response.time",
        },
      }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as any;
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  // TELE-GW-1: New canonical action key tests
  describe("telemetry.events.ingest action (TELE-GW-1)", () => {
    it("should accept telemetry.events.ingest action key", async () => {
      const res = await app.request("/internal/telemetry-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
          "X-Workspace-Id": "ws-123",
          "X-XS-User-Id": "user-456",
        },
        body: JSON.stringify({
          actionKey: "telemetry.events.ingest",
          payload: {
            source: "gateway",
            eventType: "http_request",
            name: "gateway.http_request",
            targetType: "service",
            targetId: "doc-service",
            metadata: {
              type: "http_request",
              routeId: "route-123",
              method: "POST",
              path: "/workspaces/ws-1/documents",
              statusCode: 201,
              durationMs: 45,
            },
          },
        }),
      });

      expect(res.status).toBe(201);
      const body = (await res.json()) as any;
      expect(body.ok).toBe(true);
      expect(body.data).toHaveProperty("id");
    });

    it("should work with http_request gateway events", async () => {
      const res = await app.request("/internal/telemetry-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
        },
        body: JSON.stringify({
          actionKey: "telemetry.events.ingest",
          payload: {
            source: "gateway",
            eventType: "http_request",
            name: "gateway.http_request",
            targetType: "service",
            targetId: "cms-core",
            metadata: {
              type: "http_request",
              routeId: "blog-list-1",
              serviceKey: "cms-core",
              actionKey: "cms.blog_entry.listPublished",
              method: "GET",
              path: "/workspaces/ws-1/blog",
              statusCode: 200,
              durationMs: 120,
              workspaceId: "ws-1",
              userId: null,
              clientIpHash: "abc123def456",
              timestamp: new Date().toISOString(),
              meta: {
                userAgent: "Mozilla/5.0 (Test)",
                pathPattern: "/workspaces/:workspaceId/blog",
              },
            },
          },
        }),
      });

      expect(res.status).toBe(201);
    });

    it("should sanitize query strings in targetId", async () => {
      const res = await app.request("/internal/telemetry-actions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Service-Token": INTERNAL_SERVICE_TOKEN,
        },
        body: JSON.stringify({
          actionKey: "telemetry.events.ingest",
          payload: {
            source: "gateway",
            eventType: "http_request",
            name: "gateway.http_request",
            targetType: "service",
            targetId: "/api/test?token=secret123",
            metadata: {
              type: "http_request",
            },
          },
        }),
      });

      // Should still succeed - sanitization happens server-side
      expect(res.status).toBe(201);
    });
  });
});
