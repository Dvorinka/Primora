# Changelog

All notable changes to Primora. Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Added

- **Connector framework** — `core.integrations` (migration 00005) stores per-project external services with type, base URL, `has_credentials` flag, health status/`last_health_at`. Credentials are AES-256-GCM encrypted at rest (`PRIMORA_ENCRYPTION_KEY`, hex/base64, 32 bytes; dev fallback outside production) and are never serialized to the client. Endpoints under `/projects/:id/integrations`: list, create, delete, `POST …/test` (5s health check against the base URL with stored credentials).
- **Rybbit connector** — `GET …/integrations/:id/analytics` proxies a self-hosted Rybbit instance server-side (`/api/organizations` site discovery, `/api/sites/:site/overview`, time series, top pages/referrers) and returns a normalized shape. The API key never leaves the server; read-only, no tracking proxy. Site selection via `?site=` or the integration's configured `site_id`.
- **Outbound webhooks** — `core.webhooks` + `core.webhook_deliveries`. Endpoints: list/create/update/delete under `/projects/:id/webhooks`, `GET …/deliveries`, `POST …/test`. Events: `issue.created` (new error fingerprint on ingest), `deploy.marker` (`POST …/deploy-markers`, records version/ref/environment/note in the audit log), `webhook.test`. HTTPS required for public targets; plain HTTP allowed for private/self-hosted sinks. Deliveries are signed `X-Primora-Signature: sha256=<hmac-sha256(body)>` and retried by an in-process dispatcher (buffered queue, 3 attempts, quadratic backoff, 10s timeout, crash recovery on boot). Generated secrets are returned exactly once.
- **Integrations page** — SolidJS view (Connectors + Webhooks tabs): connector table with status/test/inline Rybbit analytics panel, webhook table with per-endpoint delivery log, secret-shown-once banner, deploy-marker form. Demo-mode stubs included.
- **New `primora_*` MCP tools** — `primora_list_integrations`, `primora_create_integration`, `primora_delete_integration`, `primora_test_integration`, `primora_integration_analytics`, `primora_list_webhooks`, `primora_create_webhook`, `primora_update_webhook`, `primora_delete_webhook`, `primora_list_webhook_deliveries`, `primora_test_webhook`, `primora_create_deploy_marker`.
- **Telemetry (IMS merge)** — `POST /api/v1/ingest` accepts a single event or a ≤500-event batch, authenticated by existing project `prm_` API keys via `X-Primora-Key` (or `X-API-Key`); `OPTIONS` preflight + permissive CORS for browser SDKs. Components auto-register on first use (`frontend`, `backend`, `database`, `android`, `desktop`, `web`, `other`). Event types: `error`, `metric`, `log`, `heartbeat`, `event`; missing fingerprints are derived from component + first message line.
- **Issue grouping** — `GET /projects/:id/issues` groups errors by fingerprint (count, severity, first/last seen, latest component).
- **Telemetry read APIs** — `GET …/events` (type/component/fingerprint filters, `before` cursor), `GET …/components`, `DELETE …/components/:id`, `GET …/telemetry/stats` (bucketed series + component health + totals + metric names over 1h/24h/7d/30d), `GET …/telemetry/metrics/series` (avg/p50/p95/max per bucket).
- **Live SSE stream** — `GET …/telemetry/stream` pushes inserted events through an in-process hub (buffered subs, drop-on-slow, 25s keepalives). `?api_key=`/`?token=` query auth for `EventSource` clients.
- **Telemetry page** — SolidJS view: health tab (totals, activity histogram, component status table), issues with drill-through to filtered events, event list with payload modal, metric series table, and an Integrate tab with SDK/cURL snippets. Live badge driven by the SSE stream; demo-mode stubs included.
- **`@primora/client` SDK** — `createPrimoraClient({ endpoint, key, component, kind, base })` with `captureError`, `captureMetric`, `captureLog`, `captureEvent`, `heartbeat`, `installAuto`, queued batching and `keepalive` flushes.
- **New `primora_*` MCP tools** — `primora_list_issues`, `primora_list_events`, `primora_telemetry_stats`, `primora_metric_series`.

### Fixed

- Workspace dependency pins updated to `0.3.0` (`@primora/api-client`, `@primora/shared-types`) — `npm ci` in the frontend image was resolving the unpublished `0.2.0` spec from the registry.

## [0.3.0] - 2026-09-16

### Added

- **Databases (DBX integration)** — the Go backend keeps `dbx-mcp` as a persistent stdio subprocess (`internal/dbx`, lazy start, one retry on failure) and exposes its tools as REST under `/projects/:id/db-connections/*` (list/create/delete/test, databases, tables, describe, schema context, SQL query, Redis command). DBX tool/subprocess failures surface as 502.
- **Connection registry** — `core.db_connections` (migration 00003). Credentials are stored server-side and never serialized to the browser (`has_password` flag only). Non-default `ssl`, `driver_profile` supported.
- **First-party connections** — `platform-postgres` and `platform-dragonfly` auto-register on every project (derived from `DATABASE_URL`/`DRAGONFLY_URL`) and cannot be deleted (409 `managed_connection`).
- **Databases page** — SolidJS view with connection list, database/schema/table browser, column inspector, SQL editor (⌘/Ctrl+Enter), result grid with row-detail modal, and a Redis console. Demo mode stubs included.
- **Backend image now Debian-based** — `dbx-mcp` requires glibc; the Dockerfile installs the pinned `packages-v0.4.88` release with SHA256 verification.

## [0.2.0] - 2026-09-15

### Added

- **`primora` CLI** (`apps/cli`) — `cac`-parsed, `@clack/prompts` interactive UX. Login (session or API key), org/project context, `orgs`, `projects`, `buckets`, `objects` (list/upload/download/rm), `keys`, `audit list --follow`. Every command accepts `--json`. Both `primora orgs list` and `primora orgs:list` spellings.
- **`@primora/mcp` server** (`apps/mcp`) — stdio MCP server exposing 14 `primora_*` tools (whoami, orgs, projects, buckets, objects up/download/delete, API keys, audit query) over the generated client. Shares the CLI's `~/.config/primora/config.json` credentials.
- **Authentication → Users panel** — better-auth `admin` plugin on the auth service (list/set-role/ban/unban/remove users) plus a dashboard view with search, role selects, and ban/delete actions. Bootstrap admins with `AUTH_ADMIN_EMAILS` in `.env`.
- **Mobile bottom navigation** — Instagram-style tab bar below 1024px (Overview · Storage · Collections · Auth · Menu), safe-area aware; Menu opens the full drawer. Fixes a dead-navigation gap at 768–1023px.
- **Release pipeline** — semver tag → GitHub Release with changelog notes, GHCR images (`primora-backend`/`auth`/`frontend`), compiled `primora`/`primora-mcp` binaries for Linux/macOS/Windows, npm tarballs, optional `npm publish` via `NPM_TOKEN` secret.

### Fixed

- **Object downloads broken for all gzip-negotiating clients** — the compression middleware left the handler's `Content-Length` (raw size) on gzipped bodies, so undici/browsers saw truncated streams. `gzipWriter.Write` now drops `Content-Length`.
- **nginx 502s after every container restart** — upstreams were resolved once at startup. nginx now resolves `backend`/`auth`/`frontend`/`mailpit` through Docker's embedded DNS (`127.0.0.11`) per request.

### Changed

- API keys now document the real `prm_<prefix>_<secret>` format (README previously claimed `pk_live_`).

## [0.1.0] - Initial commit

- Phase 0 foundation: Go/Gin backend, Better Auth service, SolidJS dashboard, Postgres + Dragonfly, nginx gateway, Docker Compose stack.
