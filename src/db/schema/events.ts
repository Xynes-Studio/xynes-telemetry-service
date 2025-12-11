import { pgSchema, uuid, text, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

export const telemetrySchema = pgSchema('telemetry');

export const events = telemetrySchema.table(
  'events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id'),
    userId: uuid('user_id'),
    source: text('source').notNull(),
    eventType: text('event_type').notNull(),
    name: text('name').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('events_workspace_created_idx').on(table.workspaceId, table.createdAt),
    index('events_type_name_idx').on(table.eventType, table.name),
  ]
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
