export type TelemetryActionKey =
  | "telemetry.event.ingest" // Legacy action key
  | "telemetry.events.ingest" // TELE-GW-1: New canonical action key
  | "telemetry.events.listRecentForWorkspace" // TELE-VIEW-1: List recent events
  | "telemetry.stats.summaryByRoute"; // TELE-VIEW-1: Aggregated stats

export interface TelemetryActionContext {
  workspaceId?: string;
  userId?: string;
  requestId: string;
}

export type TelemetryActionHandler<Payload, Result> = (
  payload: Payload,
  ctx: TelemetryActionContext
) => Promise<Result>;
