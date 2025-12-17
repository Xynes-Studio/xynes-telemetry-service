import type { TelemetryActionHandler, TelemetryActionContext } from '../types';
import { eventIngestPayloadSchema, type EventIngestPayload, type EventIngestResult } from '../schemas';
import { eventsRepository, type EventsRepository } from '../../repositories';
import { ValidationError } from '../../errors';
import { ZodError } from 'zod';
import { sanitizeUrlQueryStringsDeep, stripQueryFromUrlLikeString } from '../../utils/url';

export function createEventIngestHandler(
  repository: EventsRepository = eventsRepository
): TelemetryActionHandler<unknown, EventIngestResult> {
  return async (payload: unknown, ctx: TelemetryActionContext): Promise<EventIngestResult> => {
    // Validate payload
    let validatedPayload: EventIngestPayload;
    try {
      validatedPayload = eventIngestPayloadSchema.parse(payload);
    } catch (error) {
      if (error instanceof ZodError) {
        throw new ValidationError(error);
      }
      throw error;
    }

    // Build event row from payload and context
    const eventData = {
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      source: validatedPayload.source,
      eventType: validatedPayload.eventType,
      name: validatedPayload.name,
      targetType: validatedPayload.targetType ?? null,
      targetId: validatedPayload.targetId ? stripQueryFromUrlLikeString(validatedPayload.targetId) : null,
      metadata: validatedPayload.metadata ? sanitizeUrlQueryStringsDeep(validatedPayload.metadata) : null,
    };

    // Insert into database
    const event = await repository.create(eventData);

    return {
      id: event.id,
      createdAt: event.createdAt,
    };
  };
}

export const eventIngestHandler = createEventIngestHandler();
