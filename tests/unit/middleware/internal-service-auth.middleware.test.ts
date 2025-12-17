import { describe, it, expect, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { internalServiceAuthMiddleware } from '../../../src/middleware/internal-service-auth.middleware';

describe('internalServiceAuthMiddleware (unit)', () => {
  const token = 'unit-test-token';

  beforeEach(() => {
    process.env.INTERNAL_SERVICE_TOKEN = token;
  });

  it('returns 401 when header missing and does not run handler', async () => {
    const app = new Hono();
    let ran = false;
    app.use('/internal/*', internalServiceAuthMiddleware);
    app.post('/internal/telemetry-actions', (c) => {
      ran = true;
      return c.json({ ok: true });
    });

    const res = await app.request('/internal/telemetry-actions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(401);
    expect(ran).toBe(false);
  });

  it('returns 403 when header mismatched and does not run handler', async () => {
    const app = new Hono();
    let ran = false;
    app.use('/internal/*', internalServiceAuthMiddleware);
    app.post('/internal/telemetry-actions', (c) => {
      ran = true;
      return c.json({ ok: true });
    });

    const res = await app.request('/internal/telemetry-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service-Token': 'wrong-token',
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(403);
    expect(ran).toBe(false);
  });

  it('allows request when header matches', async () => {
    const app = new Hono();
    let ran = false;
    app.use('/internal/*', internalServiceAuthMiddleware);
    app.post('/internal/telemetry-actions', (c) => {
      ran = true;
      return c.json({ ok: true });
    });

    const res = await app.request('/internal/telemetry-actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Service-Token': token,
      },
      body: JSON.stringify({}),
    });

    expect(res.status).toBe(200);
    expect(ran).toBe(true);
  });
});

