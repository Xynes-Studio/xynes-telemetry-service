# ADR-002: Security Hardening - Metadata Limits & Error Sanitization

## Status

Accepted

## Context

Telemetry ingestion needs protection against:
1. **DoS attacks** via deeply nested or oversized metadata payloads
2. **Information leakage** through detailed error messages on readiness endpoints

Without these protections:
- An attacker could submit events with extremely deep nested metadata, causing stack overflows
- Large metadata payloads could exhaust memory and slow processing
- Readiness endpoint errors might leak internal hostnames, schema names, or connection details

## Decision

### Metadata Validation

We implement validation before processing telemetry events:

```typescript
// Configurable limits
METADATA_MAX_DEPTH = 5;      // Max nesting levels
METADATA_MAX_SIZE_BYTES = 10240;  // 10KB serialized

// Validation order
1. Zod schema validation (structure)
2. Metadata limit validation (depth & size)  // NEW
3. URL query string sanitization
4. Database insert
```

**Rationale for limits**:
- **5 levels**: Sufficient for most telemetry use cases (e.g., `{ user: { preferences: { theme: { colors: { primary: "#000" } } } } }`)
- **10KB**: Allows rich metadata while preventing abuse; typical events are <1KB

### Error Response

Failed validation returns HTTP 413 (Payload Too Large):

```json
{
  "ok": false,
  "error": {
    "code": "METADATA_LIMIT_EXCEEDED",
    "message": "Metadata exceeds maximum depth of 5 levels",
    "details": { "reason": "depth" }
  }
}
```

### Readiness Endpoint Sanitization

The `/ready` endpoint now returns generic errors:

| Before | After |
|--------|-------|
| `"error": "connection to 84.247.176.134:5432 refused"` | `"error": "db_unavailable"` |
| `"error": "FATAL: password auth failed for user \"xynes\""` | `"error": "db_unavailable"` |

Full errors are logged server-side for debugging.

## Implementation

### New Files

- `src/utils/metadata-validator.ts` - Pure validation functions
- `src/errors/metadata-limit.error.ts` - Custom error class

### Modified Files

- `src/actions/handlers/event-ingest.handler.ts` - Validation integration
- `src/middleware/error-handler.middleware.ts` - 413 response handling
- `src/routes/ready.route.ts` - Error sanitization

## Consequences

### Positive

- **DoS Protection**: Large/deep payloads rejected before processing
- **Security**: No internal details leaked in error responses
- **Observability**: Full errors logged for debugging
- **Performance**: Early rejection reduces unnecessary processing

### Negative

- **Breaking Change**: Clients sending deep/large metadata will receive 413 errors
- **Debugging**: Clients see less detail in error messages (trade-off for security)

## Testing

- 26 unit tests for metadata validator
- 5 new tests for event-ingest handler metadata limits
- 5 new tests for ready endpoint error sanitization
- 2 new tests for error handler middleware

Coverage maintained at 89%+ (exceeds 80% threshold).
