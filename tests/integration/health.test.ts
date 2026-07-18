import { beforeEach, describe, expect, it } from "vitest";
import { Hono } from "hono";
import {
  createHealthRoute,
  resetHealthRouteCacheForTests,
  type CheckStatus,
  type HealthResponseBody,
} from "../../src/routes/health.route";

const okPing = () => Promise.resolve();
const failPing = () => Promise.reject(new Error("db down"));

interface BuildAppOptions {
  pingDb?: () => Promise<void>;
  uptimeSeconds?: number;
  version?: string;
  now?: () => number;
}

function buildApp(options: BuildAppOptions = {}) {
  const app = new Hono();
  app.route(
    "/",
    createHealthRoute({
      pingDb: options.pingDb ?? okPing,
      getUptimeSeconds: () => options.uptimeSeconds ?? 42,
      getVersion: () => options.version ?? "v0.1.0",
      now: options.now ?? (() => Date.now()),
    }),
  );
  return app;
}

async function readBody(res: Response): Promise<HealthResponseBody> {
  return (await res.json()) as HealthResponseBody;
}

describe("/health (HEALTHCHECK-CONTRACT.md section 2 + section 7)", () => {
  beforeEach(() => {
    resetHealthRouteCacheForTests();
  });

  it("section 7.1 returns 200 + application/json with the contract shape", async () => {
    const res = await buildApp().request("/health");

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/application\/json/i);
    expect(await readBody(res)).toEqual({
      ok: true,
      service: "xynes-telemetry-service",
      version: "v0.1.0",
      uptime_seconds: 42,
      checks: { db: "ok" },
    });
  });

  it("section 7.2 declares db as the only service check", async () => {
    const body = await readBody(await buildApp().request("/health"));

    expect(typeof body.ok).toBe("boolean");
    expect(typeof body.version).toBe("string");
    expect(Number.isInteger(body.uptime_seconds)).toBe(true);
    expect(Object.keys(body.checks).sort()).toEqual(["db"]);
    const validStatuses: CheckStatus[] = ["ok", "fail", "skipped"];
    expect(validStatuses).toContain(body.checks.db);
  });

  it("section 7.3 reports healthy when the DB probe passes", async () => {
    const res = await buildApp({ pingDb: okPing }).request("/health");
    const body = await readBody(res);

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.checks.db).toBe("ok");
  });

  it("section 7.4 returns 503 with the same shape when the DB probe fails", async () => {
    const res = await buildApp({ pingDb: failPing }).request("/health");
    const body = await readBody(res);

    expect(res.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.checks.db).toBe("fail");
  });

  it("section 7.5 completes within the mocked hot-path latency budget", async () => {
    const start = Date.now();
    const res = await buildApp().request("/health");

    expect(res.status).toBe(200);
    expect(Date.now() - start).toBeLessThan(200);
  });

  it("section 7.6 requires no authentication", async () => {
    const res = await buildApp().request("/health");

    expect(res.status).toBe(200);
    expect(res.headers.get("WWW-Authenticate")).toBeNull();
  });

  it("section 7.7 returns no authorization-leaking headers", async () => {
    const res = await buildApp().request("/health");

    expect(res.headers.get("Set-Cookie")).toBeNull();
    expect(res.headers.get("Authorization")).toBeNull();
    for (const [name] of res.headers.entries()) {
      expect(name.toLowerCase().startsWith("x-xs-")).toBe(false);
    }
  });

  it("section 7.8 never leaks DB URLs, secrets, raw API keys, or stacks", async () => {
    const postgresScheme = ["postgres", "://"].join("");
    const jwtSecretMarker = ["JWT", "SECRET"].join("_");
    const databaseUrlMarker = ["DATABASE", "URL"].join("_");
    const rawApiKeyPrefix = ["xynes", "live", ""].join("_");
    const hostileError = [
      "connect ECONNREFUSED",
      `${postgresScheme}leak:s3cret@db.internal:5432/postgres`,
      `${jwtSecretMarker}=super-secret`,
      `${databaseUrlMarker}=${postgresScheme}leak`,
      `${rawApiKeyPrefix}aabbccdd11223344`,
    ].join("; ");
    const res = await buildApp({
      pingDb: () => Promise.reject(new Error(hostileError)),
    }).request("/health");
    const raw = await res.text();

    expect(raw).not.toContain(postgresScheme);
    expect(raw).not.toContain(jwtSecretMarker);
    expect(raw).not.toContain(databaseUrlMarker);
    expect(raw).not.toContain(rawApiKeyPrefix);
    expect(raw).not.toContain("ECONNREFUSED");
    expect(raw).not.toMatch(/\s+at\s+/);
  });

  it("caches DB probe failures for the documented 30-second window", async () => {
    let pingCalls = 0;
    let nowMs = 1_000_000;
    const app = buildApp({
      pingDb: async () => {
        pingCalls += 1;
        throw new Error("transient db blip");
      },
      now: () => nowMs,
    });

    expect((await app.request("/health")).status).toBe(503);
    expect(pingCalls).toBe(1);
    nowMs += 5_000;
    expect((await app.request("/health")).status).toBe(503);
    expect(pingCalls).toBe(1);
    nowMs += 30_000;
    expect((await app.request("/health")).status).toBe(503);
    expect(pingCalls).toBe(2);
  });

  it("recovers after the cached failure expires and the DB probe succeeds", async () => {
    let nowMs = 1_000_000;
    let nextResult: "ok" | "fail" = "fail";
    const app = buildApp({
      pingDb: () =>
        nextResult === "ok"
          ? Promise.resolve()
          : Promise.reject(new Error("transient")),
      now: () => nowMs,
    });

    expect((await app.request("/health")).status).toBe(503);
    nowMs += 60_000;
    nextResult = "ok";
    expect((await app.request("/health")).status).toBe(200);
  });

  it("falls back to dev when XYNES_BUILD_VERSION is unset or blank", async () => {
    const originalVersion = process.env.XYNES_BUILD_VERSION;
    delete process.env.XYNES_BUILD_VERSION;
    try {
      const unsetApp = new Hono();
      unsetApp.route("/", createHealthRoute({ pingDb: okPing }));
      expect((await readBody(await unsetApp.request("/health"))).version).toBe(
        "dev",
      );

      process.env.XYNES_BUILD_VERSION = "   ";
      const blankApp = new Hono();
      blankApp.route("/", createHealthRoute({ pingDb: okPing }));
      expect((await readBody(await blankApp.request("/health"))).version).toBe(
        "dev",
      );
    } finally {
      if (originalVersion === undefined) delete process.env.XYNES_BUILD_VERSION;
      else process.env.XYNES_BUILD_VERSION = originalVersion;
    }
  });

  it("bounds the DB probe with the one-second timeout", async () => {
    const neverResolves = () => new Promise<void>(() => undefined);
    const start = Date.now();
    const res = await buildApp({ pingDb: neverResolves }).request("/health");

    expect(res.status).toBe(503);
    expect((await readBody(res)).checks.db).toBe("fail");
    expect(Date.now() - start).toBeLessThan(2_000);
  });
});
