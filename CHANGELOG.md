# Changelog

All notable changes to Primora. Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow [SemVer](https://semver.org/).

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
