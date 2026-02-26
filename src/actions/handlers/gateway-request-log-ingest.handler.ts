import { ZodError } from "zod";
import type {
  TelemetryActionContext,
  TelemetryActionHandler,
} from "../types";
import {
  gatewayRequestLogPayloadSchema,
  type GatewayRequestLogPayload,
  type GatewayRequestLogResult,
} from "../schemas";
import {
  gatewayRequestLogsRepository,
  type GatewayRequestLogsRepository,
} from "../../repositories";
import { ValidationError } from "../../errors";

export function createGatewayRequestLogIngestHandler(
  repository: GatewayRequestLogsRepository = gatewayRequestLogsRepository,
): TelemetryActionHandler<unknown, GatewayRequestLogResult> {
  return async (
    payload: unknown,
    _ctx: TelemetryActionContext,
  ): Promise<GatewayRequestLogResult> => {
    let validatedPayload: GatewayRequestLogPayload;
    try {
      validatedPayload = gatewayRequestLogPayloadSchema.parse(payload);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(error);
      }
      throw error;
    }

    const inserted = await repository.create({
      requestId: validatedPayload.requestId,
      method: validatedPayload.method,
      path: validatedPayload.path,
      pathPattern: validatedPayload.pathPattern ?? null,
      routeId: validatedPayload.routeId ?? null,
      serviceKey: validatedPayload.serviceKey ?? null,
      actionKey: validatedPayload.actionKey ?? null,
      statusCode: validatedPayload.statusCode,
      durationMs: validatedPayload.durationMs,
      workspaceId: validatedPayload.workspaceId ?? null,
      userId: validatedPayload.userId ?? null,
      clientIpHash: validatedPayload.clientIpHash ?? null,
      geoCountry: validatedPayload.geo?.country ?? null,
      geoRegion: validatedPayload.geo?.region ?? null,
      geoCity: validatedPayload.geo?.city ?? null,
      geoSource: validatedPayload.geo?.source ?? null,
      deviceType: validatedPayload.device?.type ?? null,
      deviceBrowser: validatedPayload.device?.browser ?? null,
      deviceOs: validatedPayload.device?.os ?? null,
      userAgent: validatedPayload.userAgent ?? null,
      errorCode: validatedPayload.errorCode ?? null,
      requestSnippet: validatedPayload.requestSnippet ?? null,
      responseSnippet: validatedPayload.responseSnippet ?? null,
      requestSizeBytes: validatedPayload.requestSizeBytes ?? null,
      responseSizeBytes: validatedPayload.responseSizeBytes ?? null,
      occurredAt: new Date(validatedPayload.timestamp),
    });

    return {
      id: inserted.id,
      createdAt: inserted.createdAt,
    };
  };
}

export const gatewayRequestLogIngestHandler =
  createGatewayRequestLogIngestHandler();
