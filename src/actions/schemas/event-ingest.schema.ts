import { z } from 'zod';

export const eventIngestPayloadSchema = z.object({
  source: z.string().min(1, 'Source is required'),
  eventType: z.string().min(1, 'Event type is required'),
  name: z.string().min(1, 'Name is required'),
  targetType: z.string().nullish(),
  targetId: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

export type EventIngestPayload = z.infer<typeof eventIngestPayloadSchema>;

export const eventIngestResultSchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
});

export type EventIngestResult = z.infer<typeof eventIngestResultSchema>;
