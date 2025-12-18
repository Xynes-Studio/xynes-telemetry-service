import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createEventIngestHandler } from '../../../src/actions/handlers/event-ingest.handler';
import { ValidationError, MetadataLimitError } from '../../../src/errors';
import type { TelemetryActionContext } from '../../../src/actions/types';
import type { EventsRepository } from '../../../src/repositories';
import type { Event } from '../../../src/db/schema';
import { METADATA_MAX_DEPTH, METADATA_MAX_SIZE_BYTES } from '../../../src/utils/metadata-validator';

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
        requestId: 'test-req-id',
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

    it('should strip query strings from URL-like telemetry metadata', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      const payload = {
        source: 'gateway',
        eventType: 'http.request',
        name: 'gateway.request.completed',
        targetId: 'https://xynes.example/resource?token=supersecret',
        metadata: {
          method: 'GET',
          path: '/workspaces/123/documents?token=supersecret&foo=bar',
          referer: 'https://example.com/callback?code=supersecret',
          nested: {
            url: 'https://xynes.example/path?token=supersecret',
          },
        },
      };

      await handler(payload, { requestId: 'test-req-id' });

      const createCalls = (mockRepo.create as unknown as { mock: { calls: unknown[][] } }).mock.calls;
      const created = createCalls[0]?.[0] as { metadata?: unknown };
      const createdJson = JSON.stringify(created.metadata);

      expect(createdJson).not.toContain('supersecret');
      expect(createdJson).not.toContain('token=');

      expect(created.metadata).toEqual(
        expect.objectContaining({
          method: 'GET',
          path: '/workspaces/123/documents',
          referer: 'https://example.com/callback',
          nested: { url: 'https://xynes.example/path' },
        })
      );

      expect(createCalls[0]?.[0]).toEqual(
        expect.objectContaining({
          targetId: 'https://xynes.example/resource',
        })
      );
    });

    it('should create event with minimal required fields', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      const payload = {
        source: 'backend',
        eventType: 'perf.metric',
        name: 'response.time',
      };

      const ctx: TelemetryActionContext = { requestId: 'test-req-id' };

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

      await handler(payload, { requestId: 'test-req-id' });

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

      await expect(handler(payload, { requestId: 'test-req-id' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing eventType', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      const payload = {
        source: 'web',
        name: 'test.event',
      };

      await expect(handler(payload, { requestId: 'test-req-id' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for missing name', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      const payload = {
        source: 'web',
        eventType: 'test',
      };

      await expect(handler(payload, { requestId: 'test-req-id' })).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for empty source', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      const payload = {
        source: '',
        eventType: 'test',
        name: 'test.event',
      };

      await expect(handler(payload, { requestId: 'test-req-id' })).rejects.toThrow(ValidationError);
    });

    it('should include field path in validation error message', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      try {
        await handler({}, { requestId: 'test-req-id' });
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
      const ctx: TelemetryActionContext = { workspaceId: 'workspace-id-123', requestId: 'test-req-id' };

      await handler(payload, ctx);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: 'workspace-id-123' })
      );
    });

    it('should pass userId from context', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      const payload = { source: 'web', eventType: 'test', name: 'event' };
      const ctx: TelemetryActionContext = { userId: 'user-id-789', requestId: 'test-req-id' };

      await handler(payload, ctx);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-id-789' })
      );
    });

    it('should handle undefined context values', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      const payload = { source: 'web', eventType: 'test', name: 'event' };

      await handler(payload, { requestId: 'test-req-id' });

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: undefined, userId: undefined })
      );
    });
  });

  describe('metadata limits', () => {
    it('should throw MetadataLimitError for deeply nested metadata', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      // Create metadata at depth 6 (exceeds max of 5)
      const deepMetadata = { a: { b: { c: { d: { e: { f: 'too deep' } } } } } };
      const payload = {
        source: 'web',
        eventType: 'test',
        name: 'test.event',
        metadata: deepMetadata,
      };

      await expect(handler(payload, { requestId: 'test-req-id' })).rejects.toThrow(MetadataLimitError);
      try {
        await handler(payload, { requestId: 'test-req-id' });
      } catch (error) {
        expect((error as MetadataLimitError).reason).toBe('depth');
      }
    });

    it('should throw MetadataLimitError for oversized metadata', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      // Create metadata over 10KB
      const largeMetadata = { data: 'x'.repeat(15 * 1024) };
      const payload = {
        source: 'web',
        eventType: 'test',
        name: 'test.event',
        metadata: largeMetadata,
      };

      await expect(handler(payload, { requestId: 'test-req-id' })).rejects.toThrow(MetadataLimitError);
      try {
        await handler(payload, { requestId: 'test-req-id' });
      } catch (error) {
        expect((error as MetadataLimitError).reason).toBe('size');
      }
    });

    it('should accept metadata within depth limit', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      // Create metadata at depth 5 (at max limit)
      const validMetadata = { a: { b: { c: { d: { e: 'at limit' } } } } };
      const payload = {
        source: 'web',
        eventType: 'test',
        name: 'test.event',
        metadata: validMetadata,
      };

      const result = await handler(payload, { requestId: 'test-req-id' });
      expect(result.id).toBeDefined();
    });

    it('should accept metadata within size limit', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      // Create metadata just under 10KB
      const validMetadata = { data: 'x'.repeat(9 * 1024) };
      const payload = {
        source: 'web',
        eventType: 'test',
        name: 'test.event',
        metadata: validMetadata,
      };

      const result = await handler(payload, { requestId: 'test-req-id' });
      expect(result.id).toBeDefined();
    });

    it('should not call repository.create for rejected metadata', async () => {
      const mockRepo = createMockRepository();
      const handler = createEventIngestHandler(mockRepo);

      const deepMetadata = { a: { b: { c: { d: { e: { f: 'too deep' } } } } } };
      const payload = {
        source: 'web',
        eventType: 'test',
        name: 'test.event',
        metadata: deepMetadata,
      };

      try {
        await handler(payload, { requestId: 'test-req-id' });
      } catch {
        // Expected
      }

      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });
});
