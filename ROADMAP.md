# Primora Roadmap

Primora is a self-hosted backend platform — the open, ownable alternative to
Supabase and Appwrite. One binary deployment gives you auth, Postgres-backed
APIs, object storage, document collections, API keys, an audit log, database
tooling, observability, and integrations — all behind one dashboard.

Design docs: [project_backend.md](project_backend.md) · [project_frontend.md](project_frontend.md)

---

## Phase 0 — Foundation (done)

- SolidJS dashboard, dark-first design system, demo mode
- Go + Gin API, sqlc, migrations, local object storage
- Better Auth service (email/password + OAuth), JWT via JWKS
- Docker Compose stack, nginx proxy, OpenAPI-generated client
- MIT license, CONTRIBUTING, SECURITY, rewritten README/QUICK_START

## Phase 1 — Surface area & release plumbing

Everything an operator touches that isn't in the box yet.

- **`primora` CLI** (TypeScript, `apps/cli`) — login, org/project context,
  projects, buckets, objects up/download, keys, audit tail. `cac` for parsing,
  `@clack/prompts` for interactive UX, `picocolors` for colour. Wraps the
  generated `@primora/api-client` directly — one contract, zero duplication.
  Ships as `@primora/cli` on npm (`npx primora …`) and as standalone binaries
  via `bun build --compile` in the release pipeline (the opencode pattern).
- **`@primora/mcp` server** (`apps/mcp`) — MCP stdio server exposing
  `primora_*` tools (list/create projects, keys, audit query, storage ops) so
  agents can operate the platform directly. Ported from IMS's `apps/mcp`.
- **Auth users panel** — Supabase-style `Authentication → Users` view backed by
  the auth service (list users, disable, reset). Requires a small admin
  read endpoint on the auth service.
- **Release pipeline** — semver tags, CHANGELOG.md, GitHub Actions: build
  matrix → GitHub Release + ghcr.io images (`primora/backend`,
  `primora/auth`, `primora/frontend`, `primora/cli`).
- **Responsive pass** — sidebar already collapses; audit every page at
  390px for table/card overflow.

## Phase 2 — Databases (DBX)

The "any database" story, via [DBX](https://github.com/t8y2/dbx) — 90+ drivers
in a 25 MB MCP server. Primora does not embed DBX; the Go backend keeps
`@dbx-app/mcp-server` as a persistent stdio subprocess and exposes its tools
as REST (pattern already proven in IMS's `internal/app/dbx.go`).

- **Connection registry** ✅ — per-project saved connections (Postgres, MySQL,
  SQLite, Redis, MongoDB, …). Credentials stored server-side, never sent to
  the browser. `core.db_connections` table + endpoints.
- **Databases page** ✅ — connection list → database/schema/table browser →
  column/type/key inspector.
- **SQL editor** ✅ — query editor with ⌘/Ctrl+Enter, result grid, row detail.
- **Redis console** ✅ — command input + output history for redis-type
  connections.
- **Visual overview** ✅ — schema graph: tables as nodes, foreign keys as edges.
- **First-party connections** ✅ — the platform's own Postgres and Dragonfly
  auto-register as connections on every project, so "put Postgres in it and
  it runs Postgres" works out of the box.
- **DB-to-DB links** — DBX data transfer between two saved connections
  (e.g. Postgres → Dragonfly cache warm), plus documented patterns for
  pairing them.

## Phase 3 — Observability (IMS merge) ✅

IMS (`~/Desktop/PROG+HTML/IMS`) is discontinued and folded in — same stack
(Gin + pgx + Postgres), ~2k lines to port.

- **Ingest API** — `POST /api/v1/ingest` authenticated by project `prm_` API keys
  (`X-Primora-Key` or `X-API-Key`); event types: error, metric, log, heartbeat,
  event; component auto-registration; single event or ≤500-event batch;
  permissive CORS so browser SDKs can post directly.
- **Issues** — error groups by fingerprint (count, first/last seen, severity,
  stack payload) — the Firebase Crashlytics-shaped view.
- **Telemetry views** — health overview (totals, activity histogram, component
  health), issues, events, metric series (avg/p50/p95/max), Integrate tab;
  live updates over SSE (`GET …/telemetry/stream`, `?api_key=`/`?token=` for
  EventSource auth).
- **`@primora/client` SDK** — port of `@ims/client`: queued batching,
  `keepalive` flush, `installAuto()` for browser error capture.
- **Agent tooling** — `primora_list_issues`, `primora_list_events`,
  `primora_telemetry_stats`, `primora_metric_series` in `apps/mcp`.
- Migration note in IMS repo README → archive, point at Primora.

## Phase 4 — Integrations ✅

- ~~**Connector framework**~~ — `core.integrations` (migration 00005): type,
  base URL, AES-256-GCM-encrypted credentials (`PRIMORA_ENCRYPTION_KEY`),
  health check (`POST …/test`). `has_credentials` only — secrets never
  serialized.
- ~~**Rybbit connector**~~ — self-hosted URL + API key;
  `GET …/integrations/:id/analytics` normalizes overview/series/top
  pages/referrers server-side. Integrations page carries the per-connector
  analytics panel. Read-only, no tracking proxy.
- ~~**Webhooks**~~ — `core.webhooks` + `core.webhook_deliveries`; events
  `issue.created` (new fingerprint on ingest), `deploy.marker`
  (`POST …/deploy-markers`), `webhook.test`. HMAC-SHA256 signature header
  (`X-Primora-Signature`), in-process dispatcher with backoff retries, HTTPS
  for public targets (HTTP allowed for private/self-hosted sinks).

## Phase 5 — Distribution ✅

- ~~**Desktop app**~~ — `apps/desktop`, a Tauri 2 shell (Linux/Windows/macOS).
  Thin client: asks for the deployment URL on first run, renders the same
  SolidJS bundle, keeps a system-tray presence (Show / Change Server / Quit,
  close-to-tray, single-instance). No embedded stack — self-hosted model
  preserved.
- ~~**Phone**~~ — PWA shipped: `manifest.webmanifest` + Workbox service worker
  precache the shell (`/api`, `/auth`, `/mailpit` stay `NetworkOnly`), plus an
  in-app install banner on `beforeinstallprompt`. Native shells via Capacitor
  remain deferred until push notifications are a real requirement.
- ~~**Versioning**~~ — `v0.x` minor-per-phase until the API surface stabilizes.
  `v0.5.0` tagged and pushed; the release pipeline now also ships desktop
  bundles: tag → GitHub Release notes + ghcr.io images + CLI/MCP binaries +
  desktop installers.
- **Docs site** — deferred on purpose. README stays canonical; the OpenAPI
  contract is the machine-readable source. The API still changes every phase —
  a docs site now would document a moving target. Revisit when `v1.0.0` lands.

Follow-ups:

- Verify the macOS/Windows desktop bundles produced by the `v0.5.0` CI run
  (host-verified on Linux only).
- Desktop bundle signing + auto-updater — unsigned artifacts today; add when
  distribution matures.

---

## What is deliberately out of scope

- Managed/hosted tier — the product is the self-hosted thing.
- Realtime subscriptions, edge functions, generated REST/GraphQL per-table
  (Supabase PostgREST-style). Revisit after Phase 3 if wanted — Collections
  already cover the common case.
- Embedding DBX's desktop UI — we use its MCP server as a library, not its app.
