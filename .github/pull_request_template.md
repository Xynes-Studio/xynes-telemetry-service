## Summary
<!-- One-paragraph description of what this PR does and why. -->

## Linked work
- Plan / issue: <!-- link -->
- Related repos: <!-- link any PRs that depend on or are depended on by this one -->

## Quality gates
- [ ] `lint` passes locally
- [ ] `test` passes locally
- [ ] Coverage ≥ ADR-001 80% floor (or justified exception below)
- [ ] `typecheck` / `build` passes (where applicable)
- [ ] Docs updated (`README.md`, `DEVELOPER.md`, `AGENTS.md`, repo memory)
- [ ] Migration added (if schema change) — forward-only, expand/contract
- [ ] QA PII scrub updated (if migration adds PII)
- [ ] Release doc set updated (if release contract changed)

## Security
- [ ] No secrets in code, logs, error messages, or test fixtures
- [ ] No raw API keys forwarded to downstream services
- [ ] No PII added to telemetry or access logs

## Deployment notes
<!-- e.g. "Requires migration run before service rollout", "Requires xynes-platform-contracts vX.Y.Z first". -->

## Rollback plan
<!-- For risky changes only. -->

---

## Repo-specific items (xynes-telemetry-service)

This is a **Bun + Hono + Drizzle + Vitest** service. Use `bun`, never `npm`.

- [ ] Lint: `bun run lint` — note: this repo uses **`bunx tsc --noEmit`** as its lint command (per AGENTS.md §7: "telemetry uses `tsc --noEmit`"). There is no eslint or biome config in the repo. The `tsc --noEmit` baseline on `develop` is currently **clean (exit 0)** — any new TypeScript error introduced by your PR MUST be fixed before merge.
- [ ] Tests: `bun run test` (vitest run) — default env file `.env.dev`
- [ ] Coverage: `bun run test:coverage` (vitest + @vitest/coverage-v8) — overall must stay at or above the **ADR-001 80% lines + branches floor**
- [ ] If touching `src/db/schema/index.ts` (or any file under `src/db/schema/`): add the matching forward-only Drizzle migration under `src/db/migrations/` (per `drizzle.config.ts` `out`). Run `bun run db:generate` to scaffold and `bun run db:migrate` (which uses `drizzle-kit push` — NOT a forward-only `migrate`) to apply against a local DB. The `telemetry` schema is owned by this service exclusively (per `drizzle.config.ts` `schemaFilter: ['telemetry']` AND `xynes-infra/docs/DATABASE.md` §3); avoid touching `platform.*` / `identity.*` / `authz.*` / `cms.*` / `docs.*` tables — they are owned by `xynes-infra` / `xynes-authz-service` / `xynes-cms-core` / `xynes-doc-service` respectively.
- [ ] **PII redaction is non-negotiable (STORAGE-9 §3 + gateway Task 5 + Task 6 parity).** Telemetry payloads landing in `telemetry.events` and `telemetry.gateway_request_logs` MUST go through the existing redaction surface (`FORBIDDEN_TELEMETRY_FIELDS`, `RAW_API_KEY_REDACTION_PATTERN` for `xynes_live_<hex>`, `RAW_RESEND_KEY_REDACTION_PATTERN` for `re_<hex>`, the SigV4 signature parameter sweep). PRs that ingest a new payload kind MUST extend the redaction config — adding a new field name to the allowlist AND adding a regex sweep test that asserts the pattern is rejected. **`apiKeyId` / `keyPrefix` (8-char hex) are PUBLIC audit handles — keep them readable. Raw API keys, signatures, hashes, and request bodies are not.**
- [ ] **Actor surface (PFU-1 + gateway Task 5 parity).** The gateway populates `HttpRequestTelemetryEvent` with `actorType: 'user' | 'api_key' | 'anonymous'`, `userId | null`, `apiKeyId | null`, `keyPrefix | null`. Telemetry handlers MUST preserve mutually-exclusive id semantics (an `api_key` actor MUST have `userId = null`; a `user` actor MUST have `apiKeyId = null` AND `keyPrefix = null`). Any new actor kind extends the closed-set `TelemetryActorType` union — never a free-form string.
- [ ] **Closed-set error codes only.** Provider / postgres / Drizzle / authz-client error text MUST NOT propagate into envelope `error.message` or `error.details`. New error paths land as additions to the existing closed-set unions (e.g. `src/errors/authorization.error.ts`) — never a free-form string.
- [ ] If adding a new gateway-reachable action: open the matching `xynes-infra/supabase/migrations/20251229100001_seed_platform_routes.sql` route seed PR (action endpoint must be `/internal/telemetry-actions`) AND the `xynes-authz-service` permission catalog PR in lockstep. Merge order: contracts/authz first, then this PR. Action keys MUST follow the `telemetry.<domain>.<verb>` pattern (e.g. `telemetry.events.listRecentForWorkspace`, `telemetry.stats.summaryByRoute`).
- [ ] **Retention windows MUST be config-driven, not hardcoded.** `src/retention/gateway-request-logs-retention.ts` reads its TTL from env. PRs that change retention semantics MUST update `.env.example` AND the ENV reference in `xynes-infra/ENV_GUIDE.md`.
- [ ] No raw credentials in any test fixture or handler. No `xynes_live_*` / `AKIA*` / `re_*` / `X-Amz-Signature` substrings anywhere — telemetry redaction is defense in depth on top of the gateway, not the only line.
