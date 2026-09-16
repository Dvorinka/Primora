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

## Phase 3 — Observability (IMS merge)

IMS (`~/Desktop/PROG+HTML/IMS`) is discontinued and folded in — same stack
(Gin + pgx + Postgres), ~2k lines to port.

- **Ingest API** — `POST /v1/ingest` with per-project ingest keys
  (`X-Primora-Key`); event types: error, metric, log, heartbeat, event;
  component auto-registration.
- **Issues** — error groups by fingerprint (count, first/last seen, severity,
  stack payload) — the Firebase Crashlytics-shaped view.
- **Telemetry views** — metrics, logs, heartbeats per component; live updates
  over SSE (port `sse.go`).
- **`@primora/client` SDK** — port of `@ims/client`: one-line web/node
  integration, platform snippets in a new project **Integrate** tab.
- **Agent tooling** — `primora_*` MCP tools for issues/events (merge into
  `apps/mcp` from Phase 1).
- Migration note in IMS repo → archive, point at Primora.

## Phase 4 — Integrations

- **Connector framework** — per-project external services: type, base URL,
  credentials (encrypted at rest), health check. `core.integrations` table.
- **Rybbit connector** — user supplies their self-hosted Rybbit URL + API key;
  Primora pulls site stats into a project **Analytics** page and dashboard
  widgets. Read-only, no tracking proxy.
- **Webhooks** — outbound events (issue created, deploy marker) to arbitrary
  URLs, so Primora can push into other self-hosted tools.

## Phase 5 — Distribution

- **Desktop app** — Tauri 2 shell (Linux/Windows/macOS). Thin client: asks for
  the deployment URL on first run, renders the same SolidJS bundle, keeps a
  system-tray presence. No embedded stack — self-hosted model preserved.
- **Phone** — PWA (manifest, service worker, install prompt) first; native
  shells via Capacitor only if push notifications become a requirement.
- **Versioning** — `v0.x` minor-per-phase until API surface stabilizes,
  `v1.0.0` when Phase 3 lands. Every release: GitHub Release notes +
  tagged images + CLI binaries.
- **Docs site** — README stays canonical; a docs/ folder or site once the API
  settles.

---

## What is deliberately out of scope

- Managed/hosted tier — the product is the self-hosted thing.
- Realtime subscriptions, edge functions, generated REST/GraphQL per-table
  (Supabase PostgREST-style). Revisit after Phase 3 if wanted — Collections
  already cover the common case.
- Embedding DBX's desktop UI — we use its MCP server as a library, not its app.
