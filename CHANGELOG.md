# Changelog

All notable changes to Primora. Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Added

- **Scheduled jobs** — `core.scheduled_jobs` + `core.scheduled_job_runs` (migration 00009). Cron expressions and descriptors (`@hourly`, `@daily`, `@every 30m`, `*/15 * * * *`) parsed via robfig/cron; an in-process `JobScheduler` scans every 15 s, queues due jobs through a buffered channel, and collapses missed schedules into a single run. Endpoints under `/projects/:id/jobs`: list/create/update/delete, `GET …/jobs/:id/runs`, `POST …/jobs/:id/run` (manual execution). Jobs deliver a JSON envelope (event type, project/job/run IDs, trigger source, timestamp, static payload) via POST with `X-Primora-Signature: sha256=<hmac-sha256(body)>`, `X-Primora-Event`, `X-Primora-Job`, `X-Primora-Run` headers and a 10 s timeout. Secrets are AES-256-GCM sealed at rest; a generated secret is returned exactly once on create/rotate (`has_secret` thereafter). Run records carry status, trigger, HTTP status, duration, error text, and timestamps; history is pruned by retention. Reads require viewer+, writes admin/developer.
- **Domain events + realtime stream** — `PlatformService.publishEvent` fans project mutations out to realtime subscribers and matching webhooks through one path. New webhook event types: `job.run`, `document.created`/`updated`/`deleted`, `object.created`/`updated`/`deleted`. `GET …/projects/:projectID/realtime/stream` serves an SSE feed with 25 s keepalives and `?token=`/`?api_key=` query auth for `EventSource` clients.
- **Automation page** — SolidJS view with a Schedules tab (job table, create modal with schedule helper text, expandable run history, manual Run, enable/disable, delete, secret-shown-once banner) and a Live events tab (live/offline badge, pause, clear, auto-reconnect). Sidebar + command palette entries; demo-mode seeds and stubs included.
- **`primora jobs:*` CLI group** — `jobs:list`, `jobs:create <name> --schedule --url [--payload --secret --disabled]`, `jobs:run <job>`, `jobs:runs <job> --limit`, `jobs:rm <job> --yes`. Both `jobs list` and `jobs:list` spellings.
- **New `primora_*` MCP tools** — `primora_list_jobs`, `primora_create_job`, `primora_update_job`, `primora_delete_job`, `primora_list_job_runs`, `primora_run_job`. Webhook event schema extended to all new event types.

### Fixed

- **SSE broken by gzip middleware** — `Compression()` wrapped every `Accept-Encoding: gzip` response, and the gzip buffer swallowed each `Flush()`, so `EventSource` received headers then silence and closed. Paths ending in `/stream` now bypass compression; this repaired the pre-existing telemetry stream too.
- **Event payloads serialized as base64** — `document`/`object` fields inside domain-event envelopes were `json.RawMessage` placed into `map[string]any`, which marshals as base64. They're now wrapped so the raw document embeds in the event JSON.
- **Auth trusted origins ignored the configured public URL** — `docker-compose.yml` hardcoded `http://localhost` for `BETTER_AUTH_URL`, `AUTH_BASE_URL`, and `VITE_APP_URL`, so any non-default `NGINX_PORT` or domain broke sign-in with a 403. All three now read `.env` with localhost defaults.
- **Frontend auth base URL on non-default ports** — the bundled default baked `http://localhost`; `auth-client` now resolves `/auth` against `window.location.origin` (absolute, as better-auth requires) when `VITE_AUTH_BASE_URL` is unset.

### Security

- **Managed platform connections removed** — `platform-postgres`/`platform-dragonfly` seeds carried the backend's own `DATABASE_URL`/`DRAGONFLY_URL` into every project, where any member could run arbitrary queries through DBX against `core` tables. The seeds are gone and migration 00008 deletes existing managed rows. Operators keep direct `psql`/`redis-cli` access.
- **Connection passwords encrypted at rest** — `core.db_connections.config.password` is now AES-256-GCM sealed (`enc:v1:` marker) via `PRIMORA_ENCRYPTION_KEY`; decrypted only when registering the connection with DBX. Migration 00008 strips pre-existing plaintext passwords.
- **DBX naming** — connection names now prefix the full project UUID; the previous 8-hex prefix could collide across projects and alias the wrong credentials.

## [0.5.0] - 2026-09-16

### Added

- **Desktop app** (`apps/desktop`) — Tauri 2 thin shell for Linux/Windows/macOS. First run shows a connect screen asking for the deployment URL (validated, stored in `~/.config/dev.tdvorak.primora/config.json`); the webview then renders the same SolidJS bundle the server serves. System-tray icon (Show / Change Server / Quit), close-to-tray, single-instance. No embedded backend or database — the self-hosted model is preserved.
- **PWA support** — `vite-plugin-pwa` generates a Workbox service worker and `manifest.webmanifest` in every frontend build. The app shell (JS/CSS/icons/index.html) is precached; `/api`, `/auth`, and `/mailpit` are `NetworkOnly` and excluded from the SPA navigation fallback; Google Fonts assets are cached for a year. Installability icons (192/512/maskable + apple-touch-icon) rasterized from the existing SVG mark.
- **Install prompt** — `PwaInstallBanner` captures `beforeinstallprompt` and offers an in-app install action inside the shell; dismissal persists in `localStorage`.
- **Desktop release artifacts** — `release.yml` gains a `desktop` job (ubuntu/macos/windows matrix) producing AppImage/deb/rpm, dmg, and msi/nsis bundles, attached to the GitHub Release alongside the existing images and CLI binaries.

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
