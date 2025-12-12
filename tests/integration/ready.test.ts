import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { app } from '../../src/app';
import { createReadyRoute } from '../../src/routes/ready.route';

describe('Ready Endpoint', () => {
  it('GET /ready should return 200 with status ready when db reachable', async () => {
    const res = await app.request('/ready');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ready' });
  });

  it('should fail with invalid url and recover when fixed', async () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error('DATABASE_URL is required for this test');

    const invalidUrl = (() => {
      const url = new URL(databaseUrl);
      url.hostname = '127.0.0.1';
      url.port = '1';
      return url.toString();
    })();

    const failingApp = new Hono();
    failingApp.route('/', createReadyRoute({ getDatabaseUrl: () => invalidUrl }));
    const failingRes = await failingApp.request('/ready');
    expect(failingRes.status).toBe(503);

    const recoveredApp = new Hono();
    recoveredApp.route('/', createReadyRoute({ getDatabaseUrl: () => databaseUrl }));
    const recoveredRes = await recoveredApp.request('/ready');
    expect(recoveredRes.status).toBe(200);
  });
});

