import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEventIngestHandler } from '../../../src/actions/handlers/event-ingest.handler';
import { ValidationError } from '../../../src/errors';
import type { TelemetryActionContext } from '../../../src/actions/types';
import type { EventsRepository } from '../../../src/repositories';
import type { Event } from '../../../src/db/schema';

describe('Event Ingest Handler', () => {
  const mockEvent: Event = {
    id: 'test-event-id',
    workspaceId: 'ws-123',
    userId: 'user-456',
    source: 'web',
    eventType: 'ui.interaction',
    name: 'button.clicked',
    targetType: 'button',
    targetId: 'submit-btn',
    metadata: { key: 'value' },
    createdAt: new Date('2024-01-01T00:00:00Z'),
  };

  const createMockRepository = (): EventsRepository => ({
    create: vi.fn().mockResolvedValue(mockEvent),
  });

  describe('valid payload', () => {
    it('should create event with all fields', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);
      
      const payload = {
        source: 'web',
        eventType: 'ui.interaction',
        name: 'button.clicked',
        targetType: 'button',
        targetId: 'submit-btn',
        metadata: { key: 'value' },
      };
      
      const ctx: TelemetryActionContext = {
        workspaceId: 'ws-123',
        userId: 'user-456',
      };
      
      const result = await handler(payload, ctx);
      
      expect(result).toEqual({
        id: mockEvent.id,
        createdAt: mockEvent.createdAt,
      });
      
      expect(mockRepo.create).toHaveBeenCalledWith({
        workspaceId: 'ws-123',
        userId: 'user-456',
        source: 'web',
        eventType: 'ui.interaction',
        name: 'button.clicked',
        targetType: 'button',
        targetId: 'submit-btn',
        metadata: { key: 'value' },
      });
    });

    it('should create event with minimal required fields', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);
      
      const payload = {
        source: 'backend',
        eventType: 'perf.metric',
        name: 'response.time',
      };
      
      const ctx: TelemetryActionContext = {};
      
      const result = await handler(payload, ctx);
      
      expect(result.id).toBe(mockEvent.id);
      expect(mockRepo.create).toHaveBeenCalledWith({
        workspaceId: undefined,
        userId: undefined,
        source: 'backend',
        eventType: 'perf.metric',
        name: 'response.time',
        targetType: null,
        targetId: null,
        metadata: null,
      });
    });

    it('should handle null optional fields', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);
      
      const payload = {
        source: 'mobile',
        eventType: 'error',
        name: 'crash.detected',
        targetType: null,
        targetId: null,
        metadata: null,
      };
      
      await handler(payload, {});
      
      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        targetType: null,
        targetId: null,
        metadata: null,
      }));
    });
  });

  describe('invalid payload', () => {
    it('should throw ValidationError for missing source', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);
      
      const payload = {
        eventType: 'test',
        name: 'test.event',
      };
      
      await expect(handler(payload, {})).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing eventType', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);
      
      const payload = {
        source: 'web',
        name: 'test.event',
      };
      
      await expect(handler(payload, {})).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing name', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);
      
      const payload = {
        source: 'web',
        eventType: 'test',
      };
      
      await expect(handler(payload, {})).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty source', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);
      
      const payload = {
        source: '',
        eventType: 'test',
        name: 'test.event',
      };
      
      await expect(handler(payload, {})).rejects.toThrow(ValidationError);
    });

    it('should include field path in validation error message', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);
      
      try {
        await handler({}, {});
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect((error as ValidationError).message).toContain('source');
      }
    });
  });

  describe('context handling', () => {
    it('should pass workspaceId from context', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);
      
      const payload = { source: 'web', eventType: 'test', name: 'event' };
      const ctx: TelemetryActionContext = { workspaceId: 'workspace-id-123' };
      
      await handler(payload, ctx);
      
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: 'workspace-id-123' })
      );
    });

    it('should pass userId from context', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);
      
      const payload = { source: 'web', eventType: 'test', name: 'event' };
      const ctx: TelemetryActionContext = { userId: 'user-id-789' };
      
      await handler(payload, ctx);
      
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-id-789' })
      );
    });

    it('should handle undefined context values', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);
      
      const payload = { source: 'web', eventType: 'test', name: 'event' };
      
      await handler(payload, {});
      
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: undefined, userId: undefined })
      );
    });
  });
});
