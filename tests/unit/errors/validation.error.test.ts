import { describe, it, expect } from 'vitest';
import { ZodError, z } from 'zod';
import { ValidationError } from '../../../src/errors/validation.error';

describe('ValidationError', () => {
  it('should create error from ZodError', () => {
    const schema = z.object({
      name: z.string(),
    });
    
    try {
      schema.parse({});
    } catch (e) {
      const validationError = new ValidationError(e as ZodError);
      
      expect(validationError).toBeInstanceOf(Error);
      expect(validationError).toBeInstanceOf(ValidationError);
      expect(validationError.name).toBe('ValidationError');
      expect(validationError.message).toContain('Validation failed');
      expect(validationError.issues).toHaveLength(1);
    }
  });

  it('should include field path in message', () => {
    const schema = z.object({
      user: z.object({
        email: z.string().email(),
      }),
    });
    
    try {
      schema.parse({ user: { email: 'invalid' } });
    } catch (e) {
      const validationError = new ValidationError(e as ZodError);
      
      expect(validationError.message).toContain('user.email');
    }
  });

  it('should handle multiple validation errors', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });
    
    try {
      schema.parse({});
    } catch (e) {
      const validationError = new ValidationError(e as ZodError);
      
      expect(validationError.issues.length).toBeGreaterThan(1);
      expect(validationError.message).toContain('name');
      expect(validationError.message).toContain('age');
    }
  });

  it('should preserve ZodIssue details', () => {
    const schema = z.object({
      count: z.number().min(5),
    });
    
    try {
      schema.parse({ count: 2 });
    } catch (e) {
      const validationError = new ValidationError(e as ZodError);
      
      expect(validationError.issues[0]).toHaveProperty('path');
      expect(validationError.issues[0]).toHaveProperty('message');
    }
  });
});
