import { describe, it, expect } from 'vitest';
import { MetadataLimitError } from '../../../src/errors';

describe('MetadataLimitError', () => {
    it('should be an instance of Error', () => {
        const error = new MetadataLimitError('depth', 'Test message');
        expect(error).toBeInstanceOf(Error);
    });

    it('should have name set to MetadataLimitError', () => {
        const error = new MetadataLimitError('depth', 'Test message');
        expect(error.name).toBe('MetadataLimitError');
    });

    it('should store the message', () => {
        const error = new MetadataLimitError('size', 'Metadata too large');
        expect(error.message).toBe('Metadata too large');
    });

    it('should store reason as "depth"', () => {
        const error = new MetadataLimitError('depth', 'Too deep');
        expect(error.reason).toBe('depth');
    });

    it('should store reason as "size"', () => {
        const error = new MetadataLimitError('size', 'Too large');
        expect(error.reason).toBe('size');
    });
});
