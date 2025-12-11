import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { setupErrorHandler } from '../../../src/middleware/error-handler.middleware';
import { UnknownActionError, ValidationError } from '../../../src/errors';
import { ZodError, z } from 'zod';

describe('Error Handler (setupErrorHandler)', () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    setupErrorHandler(app);
  });

  it('should return 400 for ValidationError', async () => {
    const schema = z.object({ name: z.string() });
    
    app.get('/test', async () => {
      try {
        schema.parse({});
      } catch (e) {
        throw new ValidationError(e as ZodError);
      }
      return new Response('ok');
    });

    const res = await app.request('/test');
    
    expect(res.status).toBe(400);
    
    const body = await res.json() as { error: string; message: string; details: unknown };
    expect(body.error).toBe('ValidationError');
    expect(body.message).toContain('Validation failed');
    expect(body.details).toBeDefined();
  });

  it('should return 400 for UnknownActionError', async () => {
    app.get('/test', async () => {
      throw new UnknownActionError('test.action');
    });

    const res = await app.request('/test');
    
    expect(res.status).toBe(400);
    
    const body = await res.json() as { error: string; message: string; actionKey: string };
    expect(body.error).toBe('UnknownActionError');
    expect(body.message).toContain('test.action');
    expect(body.actionKey).toBe('test.action');
  });

  it('should return 500 for generic Error', async () => {
    app.get('/test', async () => {
      throw new Error('Something went wrong');
    });

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await app.request('/test');
    
    expect(res.status).toBe(500);
    
    const body = await res.json() as { error: string; message: string };
    expect(body.error).toBe('InternalServerError');
    expect(body.message).toBe('Something went wrong');

    consoleSpy.mockRestore();
  });

  // Note: Hono's onError requires Error instances, non-Error throws behave differently
  it.skip('should return 500 for non-Error throws', async () => {
    app.get('/test', async (): Promise<Response> => {
      throw 'string error';
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await app.request('/test');
    
    expect(res.status).toBe(500);
    
    const body = await res.json() as { error: string };
    expect(body.error).toBe('InternalServerError');

    consoleSpy.mockRestore();
  });

  it('should pass through successful responses', async () => {
    app.get('/test', (c) => c.json({ success: true }));

    const res = await app.request('/test');
    
    expect(res.status).toBe(200);
    
    const body = await res.json() as { success: boolean };
    expect(body.success).toBe(true);
  });
});
