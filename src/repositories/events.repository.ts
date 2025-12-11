import { db } from '../db/client';
import { events, type NewEvent, type Event } from '../db/schema';

export interface EventsRepository {
  create(event: NewEvent): Promise<Event>;
}

export function createEventsRepository(): EventsRepository {
  return {
    async create(event: NewEvent): Promise<Event> {
      const [inserted] = await db.insert(events).values(event).returning();
      if (!inserted) {
        throw new Error('Failed to insert event');
      }
      return inserted;
    },
  };
}

export const eventsRepository = createEventsRepository();
