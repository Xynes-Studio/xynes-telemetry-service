import type { TelemetryActionKey, TelemetryActionHandler, TelemetryActionContext } from './types';
import { UnknownActionError } from '../errors';

const registry: Record<string, TelemetryActionHandler<unknown, unknown>> = {};

export function registerTelemetryAction<Payload, Result>(
  key: TelemetryActionKey,
  handler: TelemetryActionHandler<Payload, Result>
): void {
  registry[key] = handler as TelemetryActionHandler<unknown, unknown>;
}

export function getTelemetryActionHandler(
  key: TelemetryActionKey
): TelemetryActionHandler<unknown, unknown> | undefined {
  return registry[key];
}

export async function executeTelemetryAction(
  actionKey: TelemetryActionKey,
  payload: unknown,
  ctx: TelemetryActionContext
): Promise<unknown> {
  const handler = getTelemetryActionHandler(actionKey);
  if (!handler) {
    throw new UnknownActionError(actionKey);
  }
  return handler(payload, ctx);
}

export function clearRegistry(): void {
  Object.keys(registry).forEach((key) => {
    delete registry[key];
  });
}

export function getRegisteredActions(): TelemetryActionKey[] {
  return Object.keys(registry) as TelemetryActionKey[];
}
