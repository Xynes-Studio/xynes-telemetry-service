import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createReadyRoute } from '../../src/routes/ready.route';

describe('Ready Endpoint (Unit)', () => {
  const checkMock = vi.fn();

  beforeEach(() => {
    checkMock.mockReset();
  });

  it('GET /ready returns 200 when DB is reachable', async () => {
    checkMock.mockResolvedValueOnce(undefined);
    const app = new Hono();
    app.route('/', createReadyRoute({ getDatabaseUrl: () => 'postgres://unused', check: checkMock }));

    const res = await app.request('/ready');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ready' });
  });

  it('GET /ready returns 503 when DB is unreachable', async () => {
    checkMock.mockRejectedValueOnce(new Error('db down'));
    const app = new Hono();
    app.route('/', createReadyRoute({ getDatabaseUrl: () => 'postgres://unused', check: checkMock }));

    const res = await app.request('/ready');
    expect(res.status).toBe(503);
    const body = await res.json() as any;
    expect(body.status).toBe('not_ready');
    expect(body.error).toContain('db down');
  });
});
