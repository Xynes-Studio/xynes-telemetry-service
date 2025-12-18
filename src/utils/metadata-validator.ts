/**
 * Metadata validation utilities.
 *
 * Prevents DoS attacks via deeply nested or oversized telemetry payloads.
 */

/** Maximum allowed nesting depth for metadata objects */
export const METADATA_MAX_DEPTH = 5;

/** Maximum allowed serialized size in bytes for metadata (10KB) */
export const METADATA_MAX_SIZE_BYTES = 10 * 1024;

export interface MetadataValidationResult {
    valid: boolean;
    reason?: 'depth' | 'size';
    message?: string;
}

/**
 * Validates that an object does not exceed the maximum nesting depth.
 * Arrays count as a level of nesting.
 *
 * @param obj - The object to validate
 * @param maxDepth - Maximum allowed depth (default: METADATA_MAX_DEPTH)
 * @returns true if within depth limits, false otherwise
 */
export function validateMetadataDepth(
    obj: unknown,
    maxDepth: number = METADATA_MAX_DEPTH
): boolean {
    return checkDepth(obj, 0, maxDepth);
}

function checkDepth(value: unknown, currentDepth: number, maxDepth: number): boolean {
    // Null, undefined, or primitives don't add depth
    if (value === null || value === undefined) {
        return true;
    }

    if (typeof value !== 'object') {
        return true;
    }

    // We've entered an object or array, so increment depth
    const newDepth = currentDepth + 1;

    if (newDepth > maxDepth) {
        return false;
    }

    if (Array.isArray(value)) {
        for (const item of value) {
            if (!checkDepth(item, newDepth, maxDepth)) {
                return false;
            }
        }
        return true;
    }

    // Plain object
    for (const key of Object.keys(value)) {
        if (!checkDepth((value as Record<string, unknown>)[key], newDepth, maxDepth)) {
            return false;
        }
    }

    return true;
}

/**
 * Gets the UTF-8 byte length of a string.
 * Prefers Buffer.byteLength (Node/Bun) with TextEncoder fallback (browser).
 */
function getUtf8ByteLength(str: string): number {
    if (typeof Buffer !== 'undefined') {
        return Buffer.byteLength(str, 'utf8');
    }
    // Fallback for browser environments
    return new TextEncoder().encode(str).length;
}

/**
 * Validates that the serialized size of an object does not exceed the maximum.
 * Uses UTF-8 byte length for accurate size measurement.
 *
 * @param obj - The object to validate
 * @param maxSize - Maximum allowed size in bytes (default: METADATA_MAX_SIZE_BYTES)
 * @returns true if within size limits, false otherwise
 */
export function validateMetadataSize(
    obj: unknown,
    maxSize: number = METADATA_MAX_SIZE_BYTES
): boolean {
    if (obj === null || obj === undefined) {
        return true;
    }

    try {
        const serialized = JSON.stringify(obj);
        return getUtf8ByteLength(serialized) <= maxSize;
    } catch {
        // If serialization fails, consider it invalid
        return false;
    }
}

/**
 * Validates metadata against both depth and size limits.
 * Checks depth first, then size.
 *
 * @param obj - The object to validate
 * @returns Validation result with reason if invalid
 */
export function validateMetadata(obj: unknown): MetadataValidationResult {
    if (obj === null || obj === undefined) {
        return { valid: true };
    }

    // Check depth first
    if (!validateMetadataDepth(obj)) {
        return {
            valid: false,
            reason: 'depth',
            message: `Metadata exceeds maximum depth of ${METADATA_MAX_DEPTH} levels`,
        };
    }

    // Then check size
    if (!validateMetadataSize(obj)) {
        return {
            valid: false,
            reason: 'size',
            message: `Metadata exceeds maximum size of ${METADATA_MAX_SIZE_BYTES} bytes`,
        };
    }

    return { valid: true };
}
