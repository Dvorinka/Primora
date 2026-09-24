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

## Phase 1 — Surface area & release plumbing ✅

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

## Phase 2 — Databases (DBX) ✅

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
- **DB-to-DB links** ✅ — `POST …/db-connections/:id/transfer` runs a query
  on the source connection and writes rows to a SQL target (`target_table`)
  or a Redis target (`key_pattern` + `value_column`, optional TTL). Bounded
  at 1000 rows; credentials stay server-side.

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
- ~~Desktop bundle signing + auto-updater~~ ✅ — `tauri-plugin-updater`
  wired: signed updater artifacts (`createUpdaterArtifacts`), minisign
  keypair, `latest.json` manifest assembled on release, in-app
  "Update & restart" on the connect screen. macOS/Windows OS-level code
  signing (notarization/Authenticode) still open — needs paid certs.

## Phase 6 — Production hardening (v0.6.0) ✅

The v1 feature surface is essentially complete; what remains is the
difference between "works" and "safe to run other people's data". Roughly
three-quarters of the distance is travelled — this phase is the rest.

Foundations already in place: liveness/readiness probes with dependency
checks, per-key and per-user rate limiting, CORS locked to `PUBLIC_URL`,
AES-256-GCM credential encryption (`PRIMORA_ENCRYPTION_KEY` enforced in
production), audit log on mutations, org/project roles, SMTP + Resend in
the auth service, migrations on boot, single-command compose deploy,
release pipeline with images + binaries + desktop bundles.

### Security

- ~~**Graceful shutdown**~~ ✅ — `http.Server` + `signal.NotifyContext`,
  10 s drain; verified via SIGTERM on the running container.
- ~~**Security headers**~~ ✅ — `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` on every response; CSP scoped to
  the SPA location only (verified live).
- ~~**TLS story**~~ ✅ — documented Caddy/Traefik front-proxy setups in
  DEPLOYMENT_GUIDE.md; no embedded cert manager.
- ~~**Scoped API keys**~~ ✅ — `scopes` column (migration 00006), enforced
  in auth middleware (`requiredAPIKeyScope`), UI checkboxes in Settings;
  keys without stored scopes behave as `admin` (legacy). Verified live: a
  `read`-only key gets 403 on ingest.
- ~~**Dev-surface isolation**~~ ✅ — Mailpit moved to
  `docker-compose.dev.yml`; the base compose file cannot expose it.
- ~~**Auth brute-force**~~ ✅ — Better Auth's built-in rate limiting is now
  enabled unconditionally (it previously followed `NODE_ENV`, which the
  shipped `.env` sets to development); the IP-level 60 req/min limiter on
  `/auth/*` stays in front.
- ~~**Setup ergonomics**~~ ✅ — `setup.sh` generates
  `PRIMORA_ENCRYPTION_KEY` via `openssl rand -hex 32` alongside the other
  secrets.

### Reliability & operations

- ~~**Backups + restore runbook**~~ ✅ — `scripts/backup.sh` (pg_dump -Fc +
  storage volume tar) and `scripts/restore.sh`; restore verified against a
  scratch postgres + volume. Cron/systemd examples in the docs.
- ~~**Retention**~~ ✅ — per-project `retention_{events,audit,webhook}_days`
  (migration 00007, 0 = disabled) + hourly `RetentionSweeper`; settings
  exposed in the project edit dialog.
- ~~**Platform metrics export**~~ ✅ — `GET /api/v1/metrics` renders
  Prometheus text exposition (requests, errors, active, duration sum).
- ~~**Production compose profile**~~ ✅ — healthchecks + `restart:
  unless-stopped` on every service, `depends_on: service_healthy`,
  Dragonfly pinned to `v2.0.0`.
- ~~**Upgrade runbook**~~ ✅ — DEPLOYMENT_GUIDE.md documents backup → pull →
  migrate-on-boot → verify, plus rollback via `goose down`.

### Correctness

- ~~**Pagination audit**~~ ✅ — every `:many` query audited; time-series and
  entity lists are naturally bounded; `ListComponents` capped at 500
  (auto-registers from ingest).
- ~~**DB-to-DB links**~~ ✅ — implemented and verified live (postgres →
  dragonfly transfer, key templating, TTL).
- ~~**External object storage**~~ ✅ — constraint documented in
  DEPLOYMENT_GUIDE.md / PRODUCTION_READINESS.md; S3 backend deferred.

### Testing

- ~~**E2E smoke in CI**~~ ✅ — `scripts/smoke-e2e.sh` + `e2e-smoke` job:
  health, signup, token, bootstrap/org+project, scoped key create, ingest,
  read-only key rejection, metrics. Verified locally against the stack.
- ~~**Migration tests**~~ ✅ — `migrations` job runs goose up → reset → up
  against scratch postgres; verified locally.
- ~~**Load sanity**~~ ✅ — `scripts/load-sanity.js` (k6): ingest + events
  read, 15 VUs / 30 s. Local run: 6650 requests, ~217 req/s, 0 real
  failures, p95 221 ms — most requests beyond the configured 600/min cap
  correctly returned 429.

### Distribution

- ~~**arm64 images**~~ ✅ — release builds `linux/amd64,linux/arm64` via
  QEMU + buildx.
- Carried forward from Phase 5 follow-ups: macOS/Windows bundle
  verification; updater + minisign signing shipped (OS-level signing
  remains open).
- ~~Optional: SBOM~~ ✅ — CycloneDX SBOMs per published image + source
  tree, attached to every release (`anchore/sbom-action`).

### Docs

- ~~**Self-host guide**~~ ✅ — `DEPLOYMENT_GUIDE.md` (TLS, SMTP, backups,
  upgrades, env reference, storage constraint) and
  `PRODUCTION_READINESS.md` written; `verify-production-ready.sh` updated
  to check them plus the Phase 6 artifacts.

**v1.0 bar:** every Security item done, a restore test actually run, E2E
smoke green in CI, and the upgrade runbook followed once on a real
upgrade. Docs site revisited here, not before.

## Phase 7 — Automation & realtime (v0.7.0) ✅

The last Supabase/Appwrite-parity gaps: scheduled work and a live view of
what the platform is doing. One event fan-out drives webhooks and the
dashboard's live feed off the same stream.

- **Scheduled jobs** — `core.scheduled_jobs` + `core.scheduled_job_runs`
  (migration 00009). Cron expressions and descriptors (`@hourly`,
  `@daily`, `@every 30m`, `*/15 * * * *`) via robfig/cron. In-process
  `JobScheduler`: 15 s due-scan, buffered execution queue, missed
  schedules collapse into one run, run history pruned by retention.
- **Signed delivery** — jobs POST a JSON envelope (event, project/job/run
  IDs, trigger, timestamp, static payload) with
  `X-Primora-Signature: sha256=<hmac-sha256(body)>`, 10 s timeout. Secrets
  are AES-256-GCM sealed at rest and the generated value is returned
  exactly once (`has_secret` thereafter).
- **Run history** — status (running/success/failed), trigger source,
  HTTP status, duration, error text, timestamps; `POST …/jobs/:id/run`
  for manual execution. Role-gated: viewers read, admin/developer write.
- **Domain events** — `publishEvent` fans document/object/issue/deploy/
  job mutations out to realtime subscribers and matching webhooks.
  Webhook event filter extended to `job.run`, `document.*`, `object.*`.
- **Realtime stream** — `GET …/projects/:projectID/realtime/stream` SSE,
  25 s keepalives, `?token=`/`?api_key=` query auth for `EventSource`.
- **Automation page** — Schedules tab (table, create modal, run history
  expansion, manual run, enable/disable, delete, secret-shown-once) and
  Live events tab (live badge, pause, clear, reconnect). Demo-mode seeds
  and stubs included; command palette entry added.
- **Surfaces** — `primora jobs:*` CLI group (list/create/run/runs/rm),
  six new `primora_*_job*` MCP tools, `AutomationService` in the
  generated client.

### Fixes folded in

- **gzip swallowed SSE** — the compression middleware buffered every
  flush, so `EventSource` saw headers then nothing and died. `*/stream`
  paths now bypass compression (telemetry stream was equally broken).
- **Trusted origins ignored `PUBLIC_URL`** — compose hardcoded
  `http://localhost` for `BETTER_AUTH_URL`/`AUTH_BASE_URL`/`VITE_APP_URL`;
  they now read env so a non-default port/domain actually works.
- **Relative auth base URL** — better-auth rejects relative URLs;
  `auth-client` now resolves `/auth` against `window.location.origin`,
  preserving same-origin defaults without breaking split-origin dev.

## Secrets vault (unreleased)

Arca-inspired secrets management, clean-room — every surface covered.

- **Local vault** (`apps/cli`) — `PRMVLT01` format: Argon2id (64 MiB/3/4) →
  XChaCha20-Poly1305, header bound as AEAD AAD, atomic writes. `vault:*`,
  `secrets:*`, `inject` (env injection + `primora://` refs), TTL sessions,
  and the `agent` credential broker (dummy tokens in the child, real secret
  attached on the wire per grant).
- **Project vault** (`core.project_secrets`, migration 00011) — AES-256-GCM
  via the platform encryptor; metadata-only list, audit-logged reveal;
  `secret://NAME` refs in job payloads resolve at delivery and fail loudly
  when unresolved.
- **Surfaces** — dashboard Vault page (+ local-vault card under the desktop
  shell), desktop vault window via Tauri IPC → `primora` binary,
  `secrets:* --remote` CLI mode, and MCP tools that are metadata/write-only
  so agents never hold plaintext.

## Phase 11 — Document queries (unreleased)

PostgREST-style filtering and ordering on collection documents.

- `GET /collections/:id/documents?filter=…&order=…` — `filter` is a
  comma-separated `field.op.value` list (ops `eq neq gt gte lt lte like in
  is`), `order` a `field.asc|field.desc` list. Dotted paths index into
  document data (`meta.city.eq.Prague`); `id`/`created_at`/`updated_at` are
  filterable columns.
- Whitelisted field/operator parsing, parameterized values, JSONB
  extraction — no interpolated SQL. Plain lists keep the sqlc path.
- `primora documents list --collection <slug> --filter … --order …` in the
  CLI; `filter`/`order` params in the generated client.

## Phase 8 — Realtime client SDK (unreleased)

Channel subscriptions over the Phase 7 SSE stream, in `@primora/client`.

- `createRealtimeClient({ endpoint, key, projectId })` — fetch +
  ReadableStream reader (EventSource can't send `X-API-Key`), auto-reconnect
  with capped backoff, `onStateChange` lifecycle.
- `channel("documents").on("created", cb)` — namespaces `document`, `object`,
  `issue`, `deploy`, `"*"` for everything; trailing `s` optional.
- **Presence** ✅ — server tracks realtime subscribers per project;
  `presence.update` {online: n} broadcasts on every join/leave (realtime-only,
  never fans out to webhooks/functions), `GET …/realtime/presence` reads the
  count, `client.presence()` wraps it.
- **Client events** ✅ — `POST /projects/:id/events` publishes `custom.*`
  types through the standard fan-out (realtime + webhooks + functions);
  `client.publish("custom.x", data)` and `primora events:send` both reach it.
  The `custom.*` prefix is enforced so clients can't spoof system events.

## Notifications — alert rules (unreleased)

Telemetry-driven alerts delivered through the existing webhook dispatcher.

- `core.alert_rules` (migration 00012) — `heartbeat_silence` and
  `error_spike` kinds, per-component or project-wide scope, evaluated by a
  60 s backend ticker.
- Transition-based firing: `alert.fired` once on breach, `alert.resolved`
  on recovery — no notification storms. Both are webhook event types and
  realtime events, so any existing subscriber receives them signed.
- CRUD via `/projects/:id/alerts`; Integrations page manages rules next to
  webhooks and shows live `firing` state.

## Inbound webhooks (unreleased)

Project-scoped public ingest for external systems.

- `POST /api/v1/hooks/<token>` — token is the credential; optional
  `X-Primora-Signature` HMAC-SHA256 verification when a secret is set.
- `event` mode republishes the body as `inbound.received` (webhooks +
  realtime fan out for free); `job` mode enqueues a scheduled-job run with
  the received body as payload (`triggered_by: "hook"`).
- 256 KiB body cap; `last_received_at` tracked; managed from Integrations.

## HA scheduler (unreleased)

Multi-replica safety for the job scheduler and alert evaluator.

- PostgreSQL advisory locks (session-scoped, separate keys per component)
  on a dedicated pinned pool connection; only the leader scans for due work.
- Manual runs and hook-triggered runs work on any replica — the lock gates
  only the scheduled scan, so leadership loss never blocks on-demand work.
- Released on shutdown; failover verified with a live two-replica test —
  the survivor acquired leadership and fired the due job.

## Email surface (unreleased)

Reusable templates + an operational send log.

- `core.email_log` (migration 00014) — every send recorded: template,
  recipient, subject, `sent`/`failed` status, error text.
- `Mailer` stays transport-only (Resend when configured, SMTP otherwise);
  templates render subject + plaintext body. First template: `invitation`.
- `GET /projects/:id/emails` lists recent sends; Members page shows an
  "Email log" card under pending invitations.

## Future phases — candidates

Ordered loosely by leverage. None committed; each gets scoped when picked.

- **Phase 9 — Functions** — ✅ shipped: `core.functions` +
  `core.function_runs`, bun/deno exec runner (stdin payload, env injection,
  capped output, timeout), invoke API + dashboard page. Triggers shipped:
  scheduled jobs (`function_id` on a job), inbound hooks (`mode:
  "function"`), and domain events (`event_pattern`, e.g. `document.*`).
  Runs record trigger source (`manual`/`schedule`/`hook`/`event`).
  Remaining candidate: isolated runtimes (sidecar/Firecracker) for
  untrusted code — functions still execute with backend host privileges.
- **Phase 10 — Storage backends** — ✅ shipped: `BACKEND_STORAGE_DRIVER=s3`
  + `S3_*` env vars, stdlib SigV4, verified against a real S3 server.
  Presigned upload/download URLs shipped: `POST
  /buckets/:id/object-presigns` mints SigV4 query-signed GET/PUT URLs
  (`S3_PUBLIC_ENDPOINT` rewrites the client-facing host); local driver
  returns a clear error — a presigned URL needs a real object API behind it.
- **HA mode** — ✅ shipped: PostgreSQL advisory-lock leadership for the
  scheduler and alert evaluator; failover verified with two replicas.
- **Email surface** — ✅ shipped: templated sends + `core.email_log` +
  dashboard card; more templates land as new flows need them.

---

## What is deliberately out of scope

- Managed/hosted tier — the product is the self-hosted thing.
- Per-request compute billing / hosted function runtime — if the
  Functions phase lands it stays user-managed infrastructure.
- Embedding DBX's desktop UI — we use its MCP server as a library, not its app.
