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

  it('GET /ready returns 503 with generic error when DB is unreachable', async () => {
    checkMock.mockRejectedValueOnce(new Error('connection to 84.247.176.134:5432 refused'));
    const app = new Hono();
    app.route('/', createReadyRoute({ getDatabaseUrl: () => 'postgres://unused', check: checkMock }));

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    const res = await app.request('/ready');
    expect(res.status).toBe(503);
    const body = await res.json() as any;
    expect(body.status).toBe('not_ready');
    expect(body.error).toBe('db_unavailable');

    consoleSpy.mockRestore();
  });

  it('GET /ready does not leak hostnames in error response', async () => {
    checkMock.mockRejectedValueOnce(new Error('FATAL: password authentication failed for user "xynes" at db.internal.example.com'));
    const app = new Hono();
    app.route('/', createReadyRoute({ getDatabaseUrl: () => 'postgres://unused', check: checkMock }));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    const res = await app.request('/ready');
    const body = await res.json() as any;

    // Should NOT contain internal details
    const responseJson = JSON.stringify(body);
    expect(responseJson).not.toContain('internal.example.com');
    expect(responseJson).not.toContain('password');
    expect(responseJson).not.toContain('xynes');
    expect(responseJson).not.toContain('FATAL');

    // Should contain generic message
    expect(body.error).toBe('db_unavailable');

    consoleSpy.mockRestore();
  });

  it('GET /ready does not leak schema names in error response', async () => {
    checkMock.mockRejectedValueOnce(new Error('relation "telemetry.events" does not exist'));
    const app = new Hono();
    app.route('/', createReadyRoute({ getDatabaseUrl: () => 'postgres://unused', check: checkMock }));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    const res = await app.request('/ready');
    const body = await res.json() as any;

    // Should NOT contain schema/table details
    const responseJson = JSON.stringify(body);
    expect(responseJson).not.toContain('telemetry');
    expect(responseJson).not.toContain('events');
    expect(responseJson).not.toContain('relation');

    // Should contain generic message
    expect(body.error).toBe('db_unavailable');

    consoleSpy.mockRestore();
  });

  it('GET /ready logs the full error server-side', async () => {
    const detailedError = new Error('connection to 84.247.176.134:5432 refused');
    checkMock.mockRejectedValueOnce(detailedError);
    const app = new Hono();
    app.route('/', createReadyRoute({ getDatabaseUrl: () => 'postgres://unused', check: checkMock }));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

    await app.request('/ready');

    // Verify the full error is logged for debugging
    expect(consoleSpy).toHaveBeenCalledWith('Ready check failed:', detailedError);

    consoleSpy.mockRestore();
  });
});
