import { describe, it, expect } from 'vitest';
import { UnknownActionError } from '../../../src/errors/unknown-action.error';

describe('UnknownActionError', () => {
  it('should create error with action key', () => {
    const error = new UnknownActionError('test.action');
    
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(UnknownActionError);
    expect(error.actionKey).toBe('test.action');
    expect(error.message).toBe('Unknown action: test.action');
    expect(error.name).toBe('UnknownActionError');
  });

  it('should preserve action key for different keys', () => {
    const error1 = new UnknownActionError('telemetry.event.ingest');
    const error2 = new UnknownActionError('other.action');
    
    expect(error1.actionKey).toBe('telemetry.event.ingest');
    expect(error2.actionKey).toBe('other.action');
  });
});
