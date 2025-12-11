import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Hono } from 'hono';
import { loggerMiddleware } from '../../../src/middleware/logger.middleware';

describe('Logger Middleware', () => {
  let app: Hono;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    app = new Hono();
    app.use('*', loggerMiddleware);
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('should log incoming request', async () => {
    app.get('/test', (c) => c.json({ ok: true }));

    await app.request('/test');

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('--> GET /test'));
  });

  it('should log outgoing response with status and duration', async () => {
    app.get('/test', (c) => c.json({ ok: true }));

    await app.request('/test');

    const allCalls = consoleSpy.mock.calls.map((call: unknown[]) => call[0]);
    const responseLog = allCalls.find((log: unknown) => typeof log === 'string' && log.includes('<-- GET /test'));
    
    expect(responseLog).toBeDefined();
    expect(responseLog).toMatch(/<-- GET \/test 200 \d+ms/);
  });

  it('should log POST requests', async () => {
    app.post('/api/test', (c) => c.json({ created: true }, 201));

    await app.request('/api/test', { method: 'POST' });

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('--> POST /api/test'));
  });

  it('should pass through to next middleware', async () => {
    const nextMiddleware = vi.fn((c: any, next: any) => next());
    app.use('*', nextMiddleware);
    app.get('/test', (c) => c.json({ ok: true }));

    await app.request('/test');

    expect(nextMiddleware).toHaveBeenCalled();
  });
});
