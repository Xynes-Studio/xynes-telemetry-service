import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  executeMock: vi.fn(),
  deleteOlderThanMock: vi.fn(),
}));

vi.mock("../../../src/db/client", () => ({
  db: {
    execute: mocks.executeMock,
  },
}));

vi.mock("../../../src/repositories", () => ({
  gatewayRequestLogsRepository: {
    deleteOlderThan: mocks.deleteOlderThanMock,
  },
}));

vi.mock("../../../src/config", () => ({
  config: {
    retention: {
      gatewayLogsDays: 180,
      runIntervalMs: 60_000,
    },
  },
}));

import { startGatewayRequestLogsRetention } from "../../../src/retention/gateway-request-logs-retention";

async function flushAsyncWork(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe("gateway request logs retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prunes when advisory lock is acquired", async () => {
    mocks.executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockResolvedValueOnce([]);
    mocks.deleteOlderThanMock.mockResolvedValueOnce(7);
    const infoSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const scheduler = startGatewayRequestLogsRetention();
    await flushAsyncWork();

    expect(mocks.deleteOlderThanMock).toHaveBeenCalledTimes(1);
    expect(mocks.executeMock).toHaveBeenCalledTimes(2);
    expect(infoSpy).toHaveBeenCalled();

    scheduler.stop();
    infoSpy.mockRestore();
  });

  it("skips prune when advisory lock is not acquired", async () => {
    mocks.executeMock.mockResolvedValueOnce([{ locked: false }]);

    const scheduler = startGatewayRequestLogsRetention();
    await flushAsyncWork();

    expect(mocks.deleteOlderThanMock).not.toHaveBeenCalled();
    expect(mocks.executeMock).toHaveBeenCalledTimes(1);

    scheduler.stop();
  });

  it("logs failures and still attempts unlock", async () => {
    mocks.executeMock
      .mockResolvedValueOnce([{ locked: true }])
      .mockRejectedValueOnce(new Error("unlock failed"));
    mocks.deleteOlderThanMock.mockRejectedValueOnce(new Error("delete failed"));
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const scheduler = startGatewayRequestLogsRetention();
    await flushAsyncWork();

    expect(mocks.deleteOlderThanMock).toHaveBeenCalledTimes(1);
    expect(mocks.executeMock).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalled();

    scheduler.stop();
    errorSpy.mockRestore();
  });
});
