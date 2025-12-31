# ADR-003: Internal Telemetry Query Actions (TELE-VIEW-1)

## Status

Accepted

## Context

Workspace owners and administrators need visibility into their telemetry data for:
1. **Debugging** - Understanding request flows and identifying errors
2. **Performance Monitoring** - Tracking response times across routes
3. **Usage Analytics** - Seeing which endpoints are most active

Without internal query actions:
- No programmatic way to retrieve telemetry data
- Cannot build admin dashboards or monitoring tools
- Limited observability for workspace owners

## Decision

### New Action Keys

We introduce two new internal actions accessible only to users with `telemetry.events.view` permission:

| Action Key | Description | Returns |
|------------|-------------|---------|
| `telemetry.events.listRecentForWorkspace` | List recent events with filtering | Paginated event list |
| `telemetry.stats.summaryByRoute` | Aggregated stats by route | Route-level metrics |

### Security Architecture

```
┌─────────────┐     ┌───────────┐     ┌─────────────────────┐
│   Client    │────▶│  Gateway  │────▶│  Telemetry Service  │
└─────────────┘     └───────────┘     └─────────────────────┘
                          │
                          ▼
                    ┌───────────┐
                    │   Authz   │ ◀── telemetry.events.view permission
                    └───────────┘
```

1. **Gateway**: Routes `/workspaces/:workspaceId/telemetry/*` to telemetry-service
2. **Authz**: Validates user has `telemetry.events.view` permission for workspace
3. **Telemetry Service**: Handler validates workspace ID matches context

### Data Sanitization

Events returned by `listRecentForWorkspace` are **sanitized** to prevent sensitive data exposure:

**Exposed Fields:**
- `id`, `source`, `eventType`, `name`, `targetType`, `targetId`, `createdAt`
- Metadata: `type`, `routeId`, `serviceKey`, `actionKey`, `method`, `path`, `statusCode`, `durationMs`

**NOT Exposed:**
- Raw request/response headers
- Request/response bodies
- Authentication tokens
- IP addresses (only hashed)
- Full error stack traces

### Role Permissions

| Role | `telemetry.events.view` |
|------|------------------|
| `super_admin` | ✅ |
| `workspace_owner` | ✅ |
| `read_only` | ❌ |

## Implementation

### New Files

```
src/actions/
├── handlers/
│   ├── events-list.handler.ts     # List events handler
│   └── stats-summary.handler.ts   # Stats aggregation handler
├── schemas/
│   ├── events-list.schema.ts      # Zod schemas for events list
│   └── stats-summary.schema.ts    # Zod schemas for stats summary
tests/unit/actions/
├── events-list.handler.test.ts
├── stats-summary.handler.test.ts
├── schemas/
│   ├── events-list.schema.test.ts
│   └── stats-summary.schema.test.ts
```

### Modified Files

- `src/actions/types.ts` - Added new action keys
- `src/actions/index.ts` - Registered new handlers
- `src/repositories/events.repository.ts` - Added `listRecent` and `aggregateByRoute` methods
- `src/routes/telemetry-actions.route.ts` - Extended action key enum
- `src/errors/authorization.error.ts` - New error class for 403 responses

### Cross-Service Changes

**xynes-authz-service:**
- Added `telemetry.events.view` permission to seed

**xynes-platform-config:**
- Added routes for telemetry query endpoints

## API Reference

### telemetry.events.listRecentForWorkspace

**Payload:**
```typescript
{
  workspaceId: string;     // UUID - required
  limit?: number;          // 1-100, default 50
  statusCode?: number;     // Filter by HTTP status
  routeId?: string;        // Filter by route
  eventType?: string;      // Filter by event type
  cursor?: string;         // ISO timestamp for pagination
}
```

**Response:**
```typescript
{
  events: EventListItem[];
  nextCursor: string | null;
}
```

### telemetry.stats.summaryByRoute

**Payload:**
```typescript
{
  workspaceId: string;     // UUID - required
  timeWindowHours?: number; // 1-168, default 24
  routeId?: string;        // Filter to specific route
}
```

**Response:**
```typescript
{
  workspaceId: string;
  timeWindowHours: number;
  fromTimestamp: string;
  toTimestamp: string;
  routes: RouteStats[];
  totals: {
    totalRequests: number;
    successCount: number;
    errorCount: number;
    avgDurationMs: number | null;
  };
}
```

## Consequences

### Positive

- **Observability**: Workspace owners can monitor their telemetry
- **Security**: Sensitive data sanitized before response
- **Extensibility**: Action pattern allows easy addition of new queries
- **Performance**: Aggregation done at SQL level for efficiency

### Negative

- **No Real-time**: These are pull-based queries, not streaming
- **Limited History**: Depends on data retention policy

## Testing

- 14 unit tests for events-list handler
- 15 unit tests for stats-summary handler
- 8 unit tests for new schemas
- 4 integration tests for HTTP endpoints

Coverage maintained at 85%+ (exceeds 80% threshold).
