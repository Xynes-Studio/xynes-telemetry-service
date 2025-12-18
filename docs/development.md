# Development Guide

This guide provides standards and practices for contributing to the Telemetry Service.

## Tech Stack & Standards

- **Runtime**: [Bun](https://bun.sh/)
- **Language**: TypeScript (Strict mode)
- **Framework**: Hono
- **ORM**: Drizzle
- **Test Runner**: Vitest

## Folder Structure

We follow a clean, modular architecture:

```
src/
├── actions/        # Business logic (Command pattern)
│   ├── handlers/   # Implementation of each action
│   ├── schemas/    # Zod schemas for validation
│   └── registry.ts # Central registration
├── db/             # Database access
├── repositories/   # Data access abstraction
├── routes/         # HTTP transport layer
└── middleware/     # Cross-cutting concerns
```

**Rule**: Business logic belongs in `actions/handlers/**`, not in routes. Routes should only handle HTTP concerns (parsing, context extraction) and delegate to actions.

## Action Pattern

All business operations must be implemented as Actions.

1. **Define Key**: Add a new key to `TelemetryActionKey` in `src/actions/types.ts`.
2. **Create Schema**: Define payload/result Zod schemas in `src/actions/schemas/`.
3. **Create Handler**: Implement the handler using `createHandler` factory pattern.
4. **Register**: Register the handler in `src/actions/index.ts`.

Example:

```typescript
// definition
export const myHandler = createMyHandler(repo);

// registry
registerTelemetryAction('my.action', myHandler);
```

## Testing Standards

We follow strict TDD practices.

- **Coverage Goal**: >80% Statements/Branches.
- **Unit Tests**: Test handlers in isolation (mock repositories).
- **Integration Tests**: Test HTTP endpoints (use `app.request` and mock DB/Repo if necessary, or use test DB container).
- **Naming**: `*.test.ts`.

Run tests:
```bash
bun test
bun test:coverage
```

## Code Style

- **Linting**: Run `bun run lint` before committing.
- **Imports**: Use explicit relative imports.
- **Types**: Avoid `any`. Use `unknown` with Zod parsing for external inputs.

## Security Practices

### Input Validation

All external inputs must be validated:

1. **Zod Schema Validation**: Structure and types
2. **Metadata Limits**: Depth (max 5) and size (max 10KB) - see `src/utils/metadata-validator.ts`
3. **URL Sanitization**: Query strings stripped from URL-like values

### Error Responses

- **Do NOT expose internal details** in client-facing errors
- Log full errors server-side for debugging
- Return generic messages (e.g., `db_unavailable`) for infrastructure failures

See [ADR-002: Security Hardening](./adr/002-security-hardening.md) for rationale.

## Database Migrations

1. Modify schema in `src/db/schema`.
2. Generate migration: `bun run db:generate`
3. Apply migration: `bun run db:migrate`

## Adding New Dependencies

Use `bun add` or `bun add -d` for dev dependencies.

