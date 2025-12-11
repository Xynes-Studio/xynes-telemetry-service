import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { app } from '../../src/app';
import * as eventsRepository from '../../src/repositories/events.repository';
import { clearRegistry, registerTelemetryAction } from '../../src/actions/registry';
import { createEventIngestHandler } from '../../src/actions/handlers/event-ingest.handler';
import type { Event } from '../../src/db/schema';

describe('Telemetry Actions Endpoint', () => {
  const mockEvent: Event = {
    id: 'mock-event-id-123',
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

  beforeEach(() => {
    // Clear and re-register with mocked repository
    clearRegistry();
    
    const mockRepo = {
      create: vi.fn().mockResolvedValue(mockEvent),
    };
    
    const handler = createEventIngestHandler(mockRepo);
    registerTelemetryAction('telemetry.event.ingest', handler);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST /internal/telemetry-actions', () => {
    describe('telemetry.event.ingest action', () => {
      it('should return 201 with success response for valid payload', async () => {
        const res = await app.request('/internal/telemetry-actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Workspace-Id': 'ws-123',
            'X-XS-User-Id': 'user-456',
          },
          body: JSON.stringify({
            actionKey: 'telemetry.event.ingest',
            payload: {
              source: 'web',
              eventType: 'ui.interaction',
              name: 'button.clicked',
              targetType: 'button',
              targetId: 'submit-btn',
              metadata: { key: 'value' },
            },
          }),
        });

        expect(res.status).toBe(201);
        
        const body = await res.json() as { success: boolean; data: { id: string; createdAt: string } };
        expect(body.success).toBe(true);
        expect(body.data).toHaveProperty('id');
        expect(body.data).toHaveProperty('createdAt');
      });

      it('should return 201 with minimal payload', async () => {
        const res = await app.request('/internal/telemetry-actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            actionKey: 'telemetry.event.ingest',
            payload: {
              source: 'backend',
              eventType: 'perf.metric',
              name: 'response.time',
            },
          }),
        });

        expect(res.status).toBe(201);
        
        const body = await res.json() as { success: boolean };
        expect(body.success).toBe(true);
      });

      it('should work without workspace and user headers', async () => {
        const res = await app.request('/internal/telemetry-actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            actionKey: 'telemetry.event.ingest',
            payload: {
              source: 'cli',
              eventType: 'custom',
              name: 'script.executed',
            },
          }),
        });

        expect(res.status).toBe(201);
      });
    });

    describe('validation errors', () => {
      it('should return 400 for missing required payload fields', async () => {
        const res = await app.request('/internal/telemetry-actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            actionKey: 'telemetry.event.ingest',
            payload: {
              source: 'web',
              // missing eventType and name
            },
          }),
        });

        expect(res.status).toBe(400);
        
        const body = await res.json() as { error: string };
        expect(body.error).toBe('ValidationError');
      });

      it('should return 400 for empty source', async () => {
        const res = await app.request('/internal/telemetry-actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            actionKey: 'telemetry.event.ingest',
            payload: {
              source: '',
              eventType: 'test',
              name: 'test.event',
            },
          }),
        });

        expect(res.status).toBe(400);
        
        const body = await res.json() as { error: string };
        expect(body.error).toBe('ValidationError');
      });

      it('should return 400 for invalid actionKey', async () => {
        const res = await app.request('/internal/telemetry-actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            actionKey: 'invalid.action',
            payload: {},
          }),
        });

        expect(res.status).toBe(400);
        
        const body = await res.json() as { error: string };
        expect(body.error).toBe('ValidationError');
      });

      it('should return 400 for missing actionKey', async () => {
        const res = await app.request('/internal/telemetry-actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            payload: { source: 'web', eventType: 'test', name: 'test' },
          }),
        });

        expect(res.status).toBe(400);
      });
    });

    describe('unknown action', () => {
      it('should return 400 for unknown action key via validation', async () => {
        const res = await app.request('/internal/telemetry-actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            actionKey: 'unknown.action.key',
            payload: {},
          }),
        });

        expect(res.status).toBe(400);
      });
    });
  });
});
