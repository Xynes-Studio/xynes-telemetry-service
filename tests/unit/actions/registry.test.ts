import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerTelemetryAction,
  getTelemetryActionHandler,
  executeTelemetryAction,
  clearRegistry,
  getRegisteredActions,
} from '../../../src/actions/registry';
import { UnknownActionError } from '../../../src/errors';
import type { TelemetryActionHandler, TelemetryActionContext } from '../../../src/actions/types';

describe('Action Registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('registerTelemetryAction', () => {
    it('should register an action handler', () => {
      const mockHandler: TelemetryActionHandler<unknown, unknown> = async () => ({ success: true });
      
      registerTelemetryAction('telemetry.event.ingest', mockHandler);
      
      const retrieved = getTelemetryActionHandler('telemetry.event.ingest');
      expect(retrieved).toBe(mockHandler);
    });

    it('should overwrite existing handler with same key', () => {
      const handler1: TelemetryActionHandler<unknown, unknown> = async () => ({ result: 1 });
      const handler2: TelemetryActionHandler<unknown, unknown> = async () => ({ result: 2 });
      
      registerTelemetryAction('telemetry.event.ingest', handler1);
      registerTelemetryAction('telemetry.event.ingest', handler2);
      
      const retrieved = getTelemetryActionHandler('telemetry.event.ingest');
      expect(retrieved).toBe(handler2);
    });
  });

  describe('getTelemetryActionHandler', () => {
    it('should return undefined for unregistered action', () => {
      const handler = getTelemetryActionHandler('telemetry.event.ingest');
      expect(handler).toBeUndefined();
    });

    it('should return registered handler', () => {
      const mockHandler: TelemetryActionHandler<unknown, unknown> = async () => ({ ok: true });
      registerTelemetryAction('telemetry.event.ingest', mockHandler);
      
      const handler = getTelemetryActionHandler('telemetry.event.ingest');
      expect(handler).toBe(mockHandler);
    });
  });

  describe('executeTelemetryAction', () => {
    it('should execute registered action with payload and context', async () => {
      const mockPayload = { source: 'web', eventType: 'test', name: 'test.event' };
      const mockContext: TelemetryActionContext = { workspaceId: 'ws-123', userId: 'user-456', requestId: 'test-req-id' };
      const expectedResult = { id: 'event-789', createdAt: new Date() };
      
      const mockHandler: TelemetryActionHandler<typeof mockPayload, typeof expectedResult> = async (payload, ctx) => {
        expect(payload).toEqual(mockPayload);
        expect(ctx).toEqual(mockContext);
        return expectedResult;
      };
      
      registerTelemetryAction('telemetry.event.ingest', mockHandler);
      
      const result = await executeTelemetryAction('telemetry.event.ingest', mockPayload, mockContext);
      expect(result).toEqual(expectedResult);
    });

    it('should throw UnknownActionError for unregistered action', async () => {
      await expect(
        executeTelemetryAction('telemetry.event.ingest', {}, { requestId: 'test-req-id' })
      ).rejects.toThrow(UnknownActionError);
    });

    it('should include action key in UnknownActionError', async () => {
      try {
        await executeTelemetryAction('telemetry.event.ingest', {}, { requestId: 'test-req-id' });
        expect.fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(UnknownActionError);
        expect((error as UnknownActionError).actionKey).toBe('telemetry.event.ingest');
        expect((error as UnknownActionError).message).toContain('telemetry.event.ingest');
      }
    });
  });

  describe('clearRegistry', () => {
    it('should clear all registered actions', () => {
      const mockHandler: TelemetryActionHandler<unknown, unknown> = async () => ({});
      registerTelemetryAction('telemetry.event.ingest', mockHandler);
      
      expect(getRegisteredActions()).toHaveLength(1);
      
      clearRegistry();
      
      expect(getRegisteredActions()).toHaveLength(0);
    });
  });

  describe('getRegisteredActions', () => {
    it('should return empty array when no actions registered', () => {
      expect(getRegisteredActions()).toEqual([]);
    });

    it('should return all registered action keys', () => {
      const mockHandler: TelemetryActionHandler<unknown, unknown> = async () => ({});
      registerTelemetryAction('telemetry.event.ingest', mockHandler);
      
      const actions = getRegisteredActions();
      expect(actions).toContain('telemetry.event.ingest');
    });
  });
});
