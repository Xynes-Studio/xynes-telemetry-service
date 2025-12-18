import { describe, it, expect } from 'vitest';
import {
    METADATA_MAX_DEPTH,
    METADATA_MAX_SIZE_BYTES,
    validateMetadataDepth,
    validateMetadataSize,
    validateMetadata,
} from '../../../src/utils/metadata-validator';

describe('Metadata Validator', () => {
    describe('Constants', () => {
        it('should have METADATA_MAX_DEPTH set to 5', () => {
            expect(METADATA_MAX_DEPTH).toBe(5);
        });

        it('should have METADATA_MAX_SIZE_BYTES set to 10KB', () => {
            expect(METADATA_MAX_SIZE_BYTES).toBe(10 * 1024);
        });
    });

    describe('validateMetadataDepth', () => {
        it('should return true for null/undefined', () => {
            expect(validateMetadataDepth(null)).toBe(true);
            expect(validateMetadataDepth(undefined)).toBe(true);
        });

        it('should return true for primitive values', () => {
            expect(validateMetadataDepth('string')).toBe(true);
            expect(validateMetadataDepth(123)).toBe(true);
            expect(validateMetadataDepth(true)).toBe(true);
        });

        it('should return true for empty object (depth 1)', () => {
            expect(validateMetadataDepth({})).toBe(true);
        });

        it('should return true for flat object (depth 1)', () => {
            expect(validateMetadataDepth({ a: 1, b: 2, c: 3 })).toBe(true);
        });

        it('should return true for object at depth 5 (max allowed)', () => {
            const depth5 = { a: { b: { c: { d: { e: 'value' } } } } };
            expect(validateMetadataDepth(depth5)).toBe(true);
        });

        it('should return false for object at depth 6 (exceeds max)', () => {
            const depth6 = { a: { b: { c: { d: { e: { f: 'too deep' } } } } } };
            expect(validateMetadataDepth(depth6)).toBe(false);
        });

        it('should return false for deeply nested object at depth 10', () => {
            const depth10 = { a: { b: { c: { d: { e: { f: { g: { h: { i: { j: 'very deep' } } } } } } } } } };
            expect(validateMetadataDepth(depth10)).toBe(false);
        });

        it('should handle arrays at depth boundary', () => {
            // Arrays count as a level
            const arrayAtDepth5 = { a: { b: { c: { d: ['value'] } } } };
            expect(validateMetadataDepth(arrayAtDepth5)).toBe(true);

            const arrayAtDepth6 = { a: { b: { c: { d: { e: ['too deep'] } } } } };
            expect(validateMetadataDepth(arrayAtDepth6)).toBe(false);
        });

        it('should handle nested arrays', () => {
            // { a: [x] } = depth 2 (obj + array)
            // { a: [{ b: 'x' }] } = depth 3 (obj + array + obj)
            const nestedArraysDepth4 = { a: [{ b: ['value'] }] }; // obj + arr + obj + arr = 4
            expect(validateMetadataDepth(nestedArraysDepth4)).toBe(true);

            const nestedArraysDepth6 = { a: [{ b: [{ c: ['too deep'] }] }] }; // obj + arr + obj + arr + obj + arr = 6
            expect(validateMetadataDepth(nestedArraysDepth6)).toBe(false);
        });

        it('should allow custom max depth', () => {
            const depth3 = { a: { b: { c: 'value' } } };
            expect(validateMetadataDepth(depth3, 3)).toBe(true);
            expect(validateMetadataDepth(depth3, 2)).toBe(false);
        });
    });

    describe('validateMetadataSize', () => {
        it('should return true for null/undefined', () => {
            expect(validateMetadataSize(null)).toBe(true);
            expect(validateMetadataSize(undefined)).toBe(true);
        });

        it('should return true for small objects', () => {
            expect(validateMetadataSize({ key: 'value' })).toBe(true);
        });

        it('should return true for object just under 10KB', () => {
            // Create object around 9KB
            const smallValue = 'x'.repeat(9 * 1024 - 100);
            expect(validateMetadataSize({ data: smallValue })).toBe(true);
        });

        it('should return true for object exactly at 10KB', () => {
            // Create object exactly at 10KB (accounting for JSON overhead)
            const value = 'x'.repeat(10 * 1024 - 12); // {"data":"..."} = 10 + value.length
            expect(validateMetadataSize({ data: value })).toBe(true);
        });

        it('should return false for object over 10KB', () => {
            // Create object around 15KB
            const largeValue = 'x'.repeat(15 * 1024);
            expect(validateMetadataSize({ data: largeValue })).toBe(false);
        });

        it('should return false for object just over 10KB', () => {
            // Create object just over 10KB
            const value = 'x'.repeat(10 * 1024 + 100);
            expect(validateMetadataSize({ data: value })).toBe(false);
        });

        it('should allow custom max size', () => {
            const smallObj = { key: 'small' };
            expect(validateMetadataSize(smallObj, 5)).toBe(false); // Too small limit
            expect(validateMetadataSize(smallObj, 100)).toBe(true);
        });

        it('should handle arrays in size calculation', () => {
            const largeArray = { items: Array(1000).fill('large string value here') };
            const serialized = JSON.stringify(largeArray);
            const byteLength = Buffer.byteLength(serialized, 'utf8');
            const expectedResult = byteLength <= METADATA_MAX_SIZE_BYTES;
            expect(validateMetadataSize(largeArray)).toBe(expectedResult);
        });

        it('should correctly count UTF-8 multi-byte characters', () => {
            // Each emoji is 4 bytes in UTF-8, but 2 UTF-16 code units
            // 2600 emojis × 4 bytes = 10400 bytes > 10KB limit
            // But string.length would show 5200, which is < 10KB
            const emoji = '😀';
            const emojiCount = 2600;
            const manyEmojis = emoji.repeat(emojiCount);
            const metadata = { data: manyEmojis };

            // Verify our understanding: string length vs byte length
            const serialized = JSON.stringify(metadata);
            const stringLength = serialized.length;
            const byteLength = Buffer.byteLength(serialized, 'utf8');

            // String length will be much smaller than byte length for emojis
            expect(byteLength).toBeGreaterThan(stringLength);

            // The function should reject based on byte length, not string length
            expect(validateMetadataSize(metadata)).toBe(false);
        });
    });

    describe('validateMetadata', () => {
        it('should return valid for null/undefined', () => {
            expect(validateMetadata(null)).toEqual({ valid: true });
            expect(validateMetadata(undefined)).toEqual({ valid: true });
        });

        it('should return valid for well-formed metadata', () => {
            const metadata = {
                action: 'click',
                component: 'button',
                details: {
                    x: 100,
                    y: 200,
                },
            };
            expect(validateMetadata(metadata)).toEqual({ valid: true });
        });

        it('should return invalid with reason "depth" for deep objects', () => {
            const deepMetadata = { a: { b: { c: { d: { e: { f: 'too deep' } } } } } };
            const result = validateMetadata(deepMetadata);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('depth');
            expect(result.message).toContain('depth');
        });

        it('should return invalid with reason "size" for large objects', () => {
            const largeMetadata = { data: 'x'.repeat(15 * 1024) };
            const result = validateMetadata(largeMetadata);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('size');
            expect(result.message).toContain('size');
        });

        it('should check depth before size', () => {
            // Object that is both too deep and too large
            const deepAndLarge = {
                a: { b: { c: { d: { e: { f: 'x'.repeat(15 * 1024) } } } } },
            };
            const result = validateMetadata(deepAndLarge);
            expect(result.valid).toBe(false);
            expect(result.reason).toBe('depth'); // Depth checked first
        });

        it('should validate complex nested structures', () => {
            const complexMetadata = {
                user: {
                    preferences: {
                        theme: 'dark',
                        notifications: {
                            email: true,
                            push: false,
                        },
                    },
                },
                session: {
                    id: 'abc123',
                },
            };
            expect(validateMetadata(complexMetadata)).toEqual({ valid: true });
        });
    });
});
