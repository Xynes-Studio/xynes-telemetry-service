export * from "./types";
export * from "./registry";
export * from "./schemas";
export * from "./handlers";

import { registerTelemetryAction } from "./registry";
import { eventIngestHandler } from "./handlers";

// Register all actions
export function registerAllActions(): void {
  // Legacy action key (backward compatibility)
  registerTelemetryAction("telemetry.event.ingest", eventIngestHandler);
  // TELE-GW-1: New canonical action key
  registerTelemetryAction("telemetry.events.ingest", eventIngestHandler);
}
