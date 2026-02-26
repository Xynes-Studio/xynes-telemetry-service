import { serve } from 'bun';
import { app } from './app';
import { config, validateConfig } from './config';
import { startGatewayRequestLogsRetention } from "./retention";

// Validate configuration on startup
validateConfig();

const server = serve({
  fetch: app.fetch,
  port: config.server.port,
});

startGatewayRequestLogsRetention();

console.log(`🚀 Telemetry service running on http://localhost:${server.port}`);
