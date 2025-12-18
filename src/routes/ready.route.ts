import { Hono } from 'hono';
import { checkPostgresReadiness } from '../infra/readiness';

export type ReadyRouteDependencies = {
  getDatabaseUrl?: () => string;
  check?: typeof checkPostgresReadiness;
  schemaName?: string;
};

export function createReadyRoute({
  getDatabaseUrl = () => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    return databaseUrl;
  },
  check = checkPostgresReadiness,
  schemaName = 'telemetry',
}: ReadyRouteDependencies = {}) {
  const readyRoute = new Hono();

  readyRoute.get('/ready', async (c) => {
    try {
      const databaseUrl = getDatabaseUrl();
      await check({ databaseUrl, schemaName });
      return c.json({ status: 'ready' }, 200);
    } catch (error) {
      // Log full error for debugging (server-side only)
      console.error('Ready check failed:', error);
      // Return generic message - do not expose internal details (hostnames, schema names, connection strings)
      return c.json({ status: 'not_ready', error: 'db_unavailable' }, 503);
    }
  });

  return readyRoute;
}

export const readyRoute = createReadyRoute();
