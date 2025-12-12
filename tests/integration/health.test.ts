import { describe, it, expect } from 'vitest';
import { app } from '../../src/app';

describe('Health Endpoint', () => {
  it('GET /health should return 200 with status ok', async () => {
    const res = await app.request('/health');
    
    expect(res.status).toBe(200);
    
    const body = await res.json();
    expect(body).toEqual({ status: 'ok', service: 'xynes-telemetry-service' });
  });

  it('should have correct content-type header', async () => {
    const res = await app.request('/health');
    
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});
