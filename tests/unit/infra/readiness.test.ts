import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock postgres before importing the module
const mockSql = vi.fn();
const mockEnd = vi.fn().mockResolvedValue(undefined);

vi.mock("postgres", () => {
  return {
    default: vi.fn(() => {
      const sqlFn = mockSql as unknown;
      (sqlFn as { end: typeof mockEnd }).end = mockEnd;
      return sqlFn;
    }),
  };
});

import {
  checkPostgresReadiness,
  type PostgresReadinessCheckOptions,
} from "../../../src/infra/readiness";

describe("checkPostgresReadiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should execute SELECT 1 when no schema is provided", async () => {
    mockSql.mockResolvedValueOnce([{ 1: 1 }]);

    const options: PostgresReadinessCheckOptions = {
      databaseUrl: "postgres://test:test@localhost:5432/test",
    };

    await checkPostgresReadiness(options);

    expect(mockEnd).toHaveBeenCalledWith({ timeout: 2 });
  });

  it("should query pg_namespace when schema is provided", async () => {
    mockSql.mockResolvedValueOnce([{ nspname: "telemetry" }]);

    const options: PostgresReadinessCheckOptions = {
      databaseUrl: "postgres://test:test@localhost:5432/test",
      schemaName: "telemetry",
    };

    await checkPostgresReadiness(options);

    expect(mockEnd).toHaveBeenCalledWith({ timeout: 2 });
  });

  it("should still call end even if query fails", async () => {
    mockSql.mockRejectedValueOnce(new Error("Connection refused"));

    const options: PostgresReadinessCheckOptions = {
      databaseUrl: "postgres://test:test@localhost:5432/test",
    };

    await expect(checkPostgresReadiness(options)).rejects.toThrow(
      "Connection refused"
    );

    expect(mockEnd).toHaveBeenCalledWith({ timeout: 2 });
  });

  it("should suppress end errors gracefully", async () => {
    mockSql.mockResolvedValueOnce([{ 1: 1 }]);
    mockEnd.mockRejectedValueOnce(new Error("End timeout"));

    const options: PostgresReadinessCheckOptions = {
      databaseUrl: "postgres://test:test@localhost:5432/test",
    };

    // Should not throw even if end fails
    await checkPostgresReadiness(options);

    expect(mockEnd).toHaveBeenCalled();
  });
});
