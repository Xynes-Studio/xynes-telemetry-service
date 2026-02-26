export * from "./types";
export * from "./registry";
export * from "./schemas";
export * from "./handlers";

import { registerTelemetryAction } from "./registry";
import {
  eventIngestHandler,
  gatewayRequestLogIngestHandler,
  eventsListHandler,
  statsSummaryHandler,
} from "./handlers";

// Register all actions
export function registerAllActions(): void {
  // Legacy action key (backward compatibility)
  registerTelemetryAction("telemetry.event.ingest", eventIngestHandler);
  // TELE-GW-1: New canonical action key
  registerTelemetryAction("telemetry.events.ingest", eventIngestHandler);
  // GATEWAY-AUDIT-1: Canonical gateway access logs
  registerTelemetryAction(
    "telemetry.gateway.logs.ingest",
    gatewayRequestLogIngestHandler,
  );
  // TELE-VIEW-1: Query actions (admin/owner only)
  registerTelemetryAction(
    "telemetry.events.listRecentForWorkspace",
    eventsListHandler
  );
  registerTelemetryAction(
    "telemetry.stats.summaryByRoute",
    statsSummaryHandler
  );
}
