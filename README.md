# Xynes Telemetry Service

A telemetry service for ingesting generic events from all apps (UI, backend, performance, user behaviour) via a simple action-based API.

## Features

- **Event Ingestion**: Generic event collection from multiple sources (web, mobile, backend, CLI)
- **Gateway Audit Log Ingestion**: Canonical structured gateway access logs (`telemetry.gateway.logs.ingest`)
- **Action-Based API**: Simple, consistent action pattern for all operations
- **Extensible Schema**: JSONB metadata field for arbitrary event properties
- **Context-Aware**: Workspace and user scoping for multi-tenant support

## Tech Stack

- **Runtime**: [Bun](https://bun.sh/)
- **Framework**: [Hono](https://hono.dev/)
- **Database**: PostgreSQL with [Drizzle ORM](https://orm.drizzle.team/)
- **Validation**: [Zod](https://zod.dev/)
- **Testing**: [Vitest](https://vitest.dev/)

## Project Structure

```
src/
├── actions/          # Action handlers and registry
│   ├── handlers/     # Individual action implementations
│   ├── schemas/      # Zod validation schemas
│   ├── registry.ts   # Action registration and execution
│   └── types.ts      # Type definitions
├── db/               # Database layer
│   ├── schema/       # Drizzle schema definitions
│   ├── migrations/   # SQL migrations
│   └── client.ts     # Database client
├── repositories/     # Data access layer
├── retention/        # Scheduled retention jobs (advisory-lock protected)
├── routes/           # HTTP route definitions
├── middleware/       # Request/response middleware
├── errors/           # Custom error classes
├── config/           # Environment configuration
├── app.ts            # Hono app setup
└── index.ts          # Entry point
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) v1.0+
- PostgreSQL database with SSH tunnel (see [infrastructure docs](../infra/SSH_TUNNEL_SUPABASE_DB.md))

### Installation

```bash
# Install dependencies
bun install

# Copy environment file
cp .env.example .env

# Edit .env with your database URL
```

### Configuration

Provide env vars directly, or use one of the repo env files:
- `.env.localhost`: running on host with SSH tunnel
- `.env.dev`: running in Docker with `db.local` host mapping

The service scripts default to `.env.dev`. Override with:
```bash
XYNES_ENV_FILE=.env.localhost bun run test
```

Environment variables:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/database"
PORT=3000
NODE_ENV=development
INTERNAL_SERVICE_TOKEN=change-me-to-a-long-random-secret
TELEMETRY_GATEWAY_LOG_RETENTION_DAYS=180
TELEMETRY_RETENTION_RUN_INTERVAL_MS=86400000
```

### Database Setup

```bash
# Generate migrations (after schema changes)
bun run db:generate

# Apply migrations to database
bun run db:migrate

# Open Drizzle Studio (database browser)
bun run db:studio
```

### Running the Service

```bash
# Development mode
bun run dev

# Production mode
bun run start
```

### Testing

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

## API Reference

### Health Check

```http
GET /health
```

**Response**
```json
{
  "status": "ok",
  "service": "xynes-telemetry-service"
}
```

### Readiness Check

```http
GET /ready
```

**Response**
```json
{
  "status": "ready"
}
```

### Telemetry Actions

```http
POST /internal/telemetry-actions
Content-Type: application/json
X-Workspace-Id: <workspace-uuid>  (optional)
X-XS-User-Id: <user-uuid>         (optional)
```

#### telemetry.event.ingest

Ingest a telemetry event.

**Security**:
- Query strings/fragments are stripped from URL-like values in `metadata` and `targetId` to avoid storing secrets
- Metadata is validated for depth (max 5 levels) and size (max 10KB)

**Request Body**
```json
{
  "actionKey": "telemetry.event.ingest",
  "payload": {
    "source": "web",
    "eventType": "ui.interaction",
    "name": "button.clicked",
    "targetType": "button",
    "targetId": "submit-form",
    "metadata": {
      "buttonId": "submit-btn",
      "page": "/checkout"
    }
  }
}
```

**Response (201 Created)**
```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

**Error Response (413 Payload Too Large)**

Returned when metadata exceeds limits:

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

#### telemetry.events.ingest (TELE-GW-1)

Canonical action key for gateway HTTP request telemetry events. This is the preferred action key for structured telemetry ingestion.

**Request Body**
```json
{
  "actionKey": "telemetry.events.ingest",
  "payload": {
    "source": "gateway",
    "eventType": "http_request",
    "name": "gateway.http_request",
    "targetType": "service",
    "targetId": "doc-service",
    "metadata": {
      "type": "http_request",
      "routeId": "route-123",
      "serviceKey": "doc-service",
      "actionKey": "docs.document.create",
      "method": "POST",
      "path": "/workspaces/ws-1/documents",
      "statusCode": 201,
      "durationMs": 45,
      "workspaceId": "ws-1",
      "userId": "user-456",
      "clientIpHash": "abc123def456",
      "timestamp": "2024-01-01T00:00:00.000Z",
      "meta": {
        "userAgent": "Mozilla/5.0 (Macintosh...)",
        "pathPattern": "/workspaces/:workspaceId/documents"
      }
    }
  }
}
```

**Security Notes:**
- `path` must not contain query strings (blocked by schema validation)
- `clientIpHash` should be a one-way hash, not the raw IP
- `meta.userAgent` is limited to 256 characters

#### telemetry.gateway.logs.ingest (GATEWAY-AUDIT-1)

Canonical gateway access-log action used by `xynes-gateway` middleware/dispatcher.

**Storage target:**
- `telemetry.gateway_request_logs` table
- `telemetry.v_gateway_request_logs` view

**Payload highlights:**
- requestId, method, path, pathPattern, route/service/action metadata
- statusCode, durationMs, workspace/user context
- hashed client IP (`clientIpHash`) only
- coarse geo/device fields
- redacted request/response snippets with size metadata

## Event Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| source | string | Yes | Event source (web, mobile, backend, cli, extension) |
| eventType | string | Yes | Event category (ui.interaction, perf.metric, error, custom) |
| name | string | Yes | Specific event name (e.g., editor.block.added) |
| targetType | string | No | Target entity type (doc, cms.entry, crm.lead) |
| targetId | string | No | Target entity identifier |
| metadata | object | No | Arbitrary key-value data (max 5 levels deep, max 10KB) |

## Architecture

See the following ADRs for architectural decisions:

- [ADR-001: Telemetry Service Design](./docs/adr/001-telemetry-service.md)
- [ADR-002: Security Hardening](./docs/adr/002-security-hardening.md)

## License

Proprietary - Xynes
