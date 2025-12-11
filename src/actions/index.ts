export * from './types';
export * from './registry';
export * from './schemas';
export * from './handlers';

import { registerTelemetryAction } from './registry';
import { eventIngestHandler } from './handlers';

// Register all actions
export function registerAllActions(): void {
  registerTelemetryAction('telemetry.event.ingest', eventIngestHandler);
}
