import { Hono } from 'hono';

const healthRoute = new Hono();

healthRoute.get('/health', (c) => {
  return c.json({ status: 'ok', service: 'xynes-telemetry-service' }, 200);
});

export { healthRoute };
