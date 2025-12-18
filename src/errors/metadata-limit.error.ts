/**
 * Error thrown when metadata exceeds validation limits.
 */
export class MetadataLimitError extends Error {
    public readonly reason: 'depth' | 'size';

    constructor(reason: 'depth' | 'size', message: string) {
        super(message);
        this.name = 'MetadataLimitError';
        this.reason = reason;
    }
}
