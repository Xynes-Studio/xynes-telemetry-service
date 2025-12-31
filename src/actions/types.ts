export type TelemetryActionKey =
  | "telemetry.event.ingest" // Legacy action key
  | "telemetry.events.ingest"; // TELE-GW-1: New canonical action key

export interface TelemetryActionContext {
  workspaceId?: string;
  userId?: string;
  requestId: string;
}

export type TelemetryActionHandler<Payload, Result> = (
  payload: Payload,
  ctx: TelemetryActionContext
) => Promise<Result>;
