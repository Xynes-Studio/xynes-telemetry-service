import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "../../../src/db/schema";

const mocks = vi.hoisted(() => {
  const insertReturningMock = vi.fn();
  const insertValuesMock = vi.fn(() => ({ returning: insertReturningMock }));
  const insertMock = vi.fn(() => ({ values: insertValuesMock }));

  const listLimitMock = vi.fn();
  const listOrderByMock = vi.fn(() => ({ limit: listLimitMock }));
  const listWhereMock = vi.fn(() => ({ orderBy: listOrderByMock }));
  const listFromMock = vi.fn(() => ({ where: listWhereMock }));
  const listSelectMock = vi.fn(() => ({ from: listFromMock }));

  const aggOrderByMock = vi.fn();
  const aggGroupByMock = vi.fn(() => ({ orderBy: aggOrderByMock }));
  const aggWhereMock = vi.fn(() => ({ groupBy: aggGroupByMock }));
  const aggFromMock = vi.fn(() => ({ where: aggWhereMock }));
  const aggSelectMock = vi.fn(() => ({ from: aggFromMock }));

  return {
    insertReturningMock,
    insertValuesMock,
    insertMock,
    listLimitMock,
    listOrderByMock,
    listWhereMock,
    listFromMock,
    listSelectMock,
    aggOrderByMock,
    aggGroupByMock,
    aggWhereMock,
    aggFromMock,
    aggSelectMock,
  };
});

vi.mock("../../../src/db/client", () => ({
  db: {
    insert: mocks.insertMock,
    select: vi.fn((arg?: unknown) => {
      if (arg === undefined) return mocks.listSelectMock();
      return mocks.aggSelectMock();
    }),
  },
}));

import { createEventsRepository } from "../../../src/repositories/events.repository";

describe("events repository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates event rows", async () => {
    const repository = createEventsRepository();
    const inserted = {
      id: "evt-1",
      workspaceId: "00000000-0000-0000-0000-000000000001",
      userId: "00000000-0000-0000-0000-000000000002",
      source: "gateway",
      eventType: "http_request",
      name: "gateway.http_request",
      targetType: null,
      targetId: null,
      metadata: {},
      createdAt: new Date(),
    } as Event;

    mocks.insertReturningMock.mockResolvedValueOnce([inserted]);

    const result = await repository.create({
      source: "gateway",
      eventType: "http_request",
      name: "gateway.http_request",
    });

    expect(result).toBe(inserted);
    expect(mocks.insertMock).toHaveBeenCalledTimes(1);
    expect(mocks.insertValuesMock).toHaveBeenCalledTimes(1);
  });

  it("throws when event insert returns empty", async () => {
    const repository = createEventsRepository();
    mocks.insertReturningMock.mockResolvedValueOnce([]);

    await expect(
      repository.create({
        source: "gateway",
        eventType: "http_request",
        name: "gateway.http_request",
      }),
    ).rejects.toThrow("Failed to insert event");
  });

  it("lists recent events with status and route filters", async () => {
    const repository = createEventsRepository();
    const rows = [
      {
        id: "evt-1",
        workspaceId: "ws-1",
        userId: "user-1",
        source: "gateway",
        eventType: "http_request",
        name: "gateway.http_request",
        targetType: null,
        targetId: null,
        metadata: { statusCode: 200, routeId: "route-1" },
        createdAt: new Date("2026-02-25T00:00:00.000Z"),
      },
      {
        id: "evt-2",
        workspaceId: "ws-1",
        userId: "user-1",
        source: "gateway",
        eventType: "http_request",
        name: "gateway.http_request",
        targetType: null,
        targetId: null,
        metadata: { statusCode: 500, routeId: "route-2" },
        createdAt: new Date("2026-02-25T00:00:01.000Z"),
      },
    ] as Event[];

    mocks.listLimitMock.mockResolvedValueOnce(rows);

    const result = await repository.listRecent({
      workspaceId: "ws-1",
      limit: 50,
      cursor: "2026-02-26T00:00:00.000Z",
      eventType: "http_request",
      statusCode: 200,
      routeId: "route-1",
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("evt-1");
    expect(mocks.listLimitMock).toHaveBeenCalledWith(50);
  });

  it("aggregates stats by route with and without route filter", async () => {
    const repository = createEventsRepository();
    const summary = [
      {
        routeId: "route-1",
        serviceKey: "doc-service",
        actionKey: "docs.document.create",
        method: "POST",
        pathPattern: "/workspaces/:workspaceId/documents",
        totalRequests: 10,
        successCount: 9,
        errorCount: 1,
        avgDurationMs: 42,
        minDurationMs: 10,
        maxDurationMs: 100,
      },
    ];
    mocks.aggOrderByMock.mockResolvedValue(summary);

    const withRoute = await repository.aggregateByRoute({
      workspaceId: "ws-1",
      fromTimestamp: new Date("2026-02-20T00:00:00.000Z"),
      routeId: "route-1",
    });
    const withoutRoute = await repository.aggregateByRoute({
      workspaceId: "ws-1",
      fromTimestamp: new Date("2026-02-20T00:00:00.000Z"),
    });

    expect(withRoute).toEqual(summary);
    expect(withoutRoute).toEqual(summary);
    expect(mocks.aggWhereMock).toHaveBeenCalledTimes(2);
  });
});
