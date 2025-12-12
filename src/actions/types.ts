export type TelemetryActionKey = 'telemetry.event.ingest';

export interface TelemetryActionContext {
  workspaceId?: string;
  userId?: string;
  requestId: string;
}

export type TelemetryActionHandler<Payload, Result> = (
  payload: Payload,
  ctx: TelemetryActionContext
) => Promise<Result>;
