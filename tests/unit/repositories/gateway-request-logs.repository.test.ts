import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const insertReturningMock = vi.fn();
  const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }));
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));

  const deleteReturningMock = vi.fn();
  const deleteWhereMock = vi.fn(() => ({ returning: deleteReturningMock }));
  const deleteMock = vi.fn(() => ({ where: deleteWhereMock }));

  return {
    insertReturningMock,
    insertValuesMock,
    insertMock,
    deleteReturningMock,
    deleteWhereMock,
    deleteMock,
  };
});

vi.mock("../../../src/db/client", () => ({
  db: {
    insert: mocks.insertMock,
    delete: mocks.deleteMock,
  },
}));

import { createGatewayRequestLogsRepository } from "../../../src/repositories/gatewayRequestLogs.repository";

describe("gateway request logs repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates gateway access log rows", async () => {
    const repository = createGatewayRequestLogsRepository();
    const inserted = {
      id: "00000000-0000-0000-0000-000000000001",
      requestId: "req-1",
      method: "GET",
      path: "/health",
      statusCode: 200,
      durationMs: 4,
      occurredAt: new Date("2026-02-20T00:00:00.000Z"),
      createdAt: new Date("2026-02-20T00:00:00.000Z"),
    };
    mocks.insertReturningMock.mockResolvedValueOnce([inserted]);

    const result = await repository.create({
      requestId: "req-1",
      method: "GET",
      path: "/health",
      statusCode: 200,
      durationMs: 4,
      occurredAt: new Date("2026-02-20T00:00:00.000Z"),
    });

    expect(result).toBe(inserted);
    expect(mocks.insertMock).toHaveBeenCalledTimes(1);
    expect(mocks.insertValuesMock).toHaveBeenCalledTimes(1);
  });

  it("throws when insert returns empty", async () => {
    const repository = createGatewayRequestLogsRepository();
    mocks.insertReturningMock.mockResolvedValueOnce([]);

    await expect(
      repository.create({
        requestId: "req-1",
        method: "GET",
        path: "/health",
        statusCode: 200,
        durationMs: 4,
        occurredAt: new Date("2026-02-20T00:00:00.000Z"),
      }),
    ).rejects.toThrow("Failed to insert gateway request log");
  });

  it("deletes rows older than a cutoff and returns deleted count", async () => {
    const repository = createGatewayRequestLogsRepository();
    mocks.deleteReturningMock.mockResolvedValueOnce([{ id: "1" }, { id: "2" }]);

    const deleted = await repository.deleteOlderThan(
      new Date("2026-01-01T00:00:00.000Z"),
    );

    expect(deleted).toBe(2);
    expect(mocks.deleteMock).toHaveBeenCalledTimes(1);
    expect(mocks.deleteWhereMock).toHaveBeenCalledTimes(1);
  });
});
