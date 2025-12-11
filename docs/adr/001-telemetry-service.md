# ADR-001: Telemetry Service Design

## Status

Accepted

## Context

We need a centralized telemetry service to collect events from all applications (UI, backend, performance monitoring, user behavior tracking). This data will later be used for:

- Analytics dashboards
- Anomaly detection
- User behavior analysis
- Performance monitoring

## Decision

### Architecture

We implement a standalone telemetry service using:

- **Bun + Hono**: Lightweight, fast runtime and web framework
- **PostgreSQL + Drizzle ORM**: Reliable storage with type-safe queries
- **Action-based API**: Consistent pattern with other Xynes services

### Action Registry Pattern

The service uses an action registry pattern (similar to doc-service and cms-core) for:

1. **Consistency**: Same pattern across all services
2. **Extensibility**: Easy to add new telemetry actions
3. **Discoverability**: Single endpoint for all operations
4. **Validation**: Zod schemas per action

### Event Schema Design

```
telemetry.events
├── id (uuid, PK)
├── workspaceId (uuid, nullable) - for workspace scoping
├── userId (uuid, nullable) - for user attribution
├── source (text) - web, mobile, backend, cli, extension
├── eventType (text) - ui.interaction, perf.metric, error, custom
├── name (text) - specific event identifier
├── targetType (text, nullable) - entity type being acted upon
├── targetId (text, nullable) - entity identifier
├── metadata (jsonb, nullable) - flexible additional data
└── createdAt (timestamptz)
```

#### Nullable Fields Rationale

- **workspaceId**: System events may not be workspace-scoped
- **userId**: Anonymous events (e.g., pre-authentication) are valid
- **targetType/targetId**: Not all events target specific entities
- **metadata**: Simple events may not need additional data

### Indexes

1. `(workspaceId, createdAt)`: Primary query pattern for workspace analytics
2. `(eventType, name)`: Event type filtering and aggregation

### Fire-and-Forget Pattern

The event ingestion endpoint is designed for high-volume, low-latency writes:

- Returns minimal response `{ id, createdAt }`
- No synchronous validation beyond schema
- No cascading operations

## Consequences

### Positive

- **Decoupled**: Telemetry collection separate from business logic
- **Extensible**: New event types require no schema changes
- **Performant**: Simple insert operations, optimized indexes
- **Consistent**: Same patterns as other services

### Negative

- **Storage growth**: Events accumulate indefinitely (future: retention policies)
- **No real-time**: No streaming or WebSocket support (future: event streaming)
- **Limited validation**: Metadata structure not enforced

## Future Considerations

1. **Retention policies**: Auto-archive or delete old events
2. **Event streaming**: Kafka/Redis Streams for real-time processing
3. **Query APIs**: Analytics endpoints with aggregation
4. **Rate limiting**: Prevent abuse from high-volume sources
5. **Batching**: Accept multiple events in single request
