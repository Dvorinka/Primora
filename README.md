# Primora

A self-hosted backend platform for building products — auth, Postgres-backed APIs, object storage, JSON document collections, API keys, and a full audit log behind one dashboard. Inspired by the UX of Appwrite and Supabase, with no hosted tier: your data stays on your hardware.

```
Browser ──▶ Nginx ──▶ Frontend (SolidJS + Vite)
                 ├──▶ Auth service (Better Auth + Hono)
                 └──▶ API (Go + Gin) ──▶ PostgreSQL
                                     ──▶ DragonflyDB (Redis-compatible cache)
                                     ──▶ Local filesystem object storage
```

## What you get

- **Organizations & projects** — top-level workspaces containing projects, members, and scoped roles (`owner`/`admin`/`member` org roles, `admin`/`developer`/`viewer` project roles).
- **Auth** — email/password plus optional GitHub, Google, Discord, and Microsoft OAuth via Better Auth. JWTs minted by the auth service are verified by the Go API against JWKS.
- **Storage** — S3-style buckets and objects backed by your local filesystem, with public/private visibility and downloadable URLs.
- **Collections** — schema-flexible JSON documents stored in Postgres JSONB.
- **API keys** — `prm_<prefix>_<secret>` credentials; secrets are shown once.
- **Audit log** — every mutating request recorded with actor, resource, request ID, and timestamp; CSV/JSON export from the dashboard.
- **Generated client** — the TypeScript client is generated from `apps/backend/openapi/openapi.yaml`, so the API contract is the source of truth.
- **Demo mode** — a fully client-side workspace (`?demo=true` or `VITE_DEMO_MODE=true`) for trying the UI without a backend.

## Install

Prerequisites: Docker with the Compose plugin.

### One-liner (no clone)

```bash
curl -fsSL https://raw.githubusercontent.com/Dvorinka/Primora/master/install.sh | bash
```

Installs into `./primora`, generates secrets, and starts the stack on port 80.
Non-interactive — configure with env vars:

```bash
DOMAIN=example.com NGINX_PORT=8080 PRIMORA_DIR=/opt/primora bash install.sh
```

The installer pulls prebuilt images from GHCR when they are published;
otherwise it downloads the source tarball and builds locally.

### From a clone

```bash
git clone https://github.com/Dvorinka/Primora.git && cd Primora
./scripts/setup.sh          # creates .env, generates secrets, starts the stack
```

or manually:

```bash
cp .env.example .env        # fill JWT_SECRET and BETTER_AUTH_SECRET
docker compose up -d        # builds the three app images from source
```

To run published images instead of building:

```bash
docker pull ghcr.io/dvorinka/primora-{backend,auth,frontend}:latest
docker compose up -d --no-build
```

Then open `http://localhost`. For local email capture, add the dev overlay
(`-f docker-compose.dev.yml`) and Mailpit is at `http://localhost/mailpit/`.

If ports `5432` or `6379` are already in use on your machine, set `POSTGRES_PORT` and `DRAGONFLY_PORT` in `.env` — only the host bindings change.

### Useful commands

```bash
docker compose ps                  # service status + health
docker compose logs -f backend     # follow one service
docker compose pull && docker compose up -d   # update to latest release
docker compose down                # stop (data persists in volumes)
docker compose down -v             # stop and delete all data
```

## Verification

| Check | Endpoint |
|---|---|
| Frontend | `http://localhost/` |
| Backend liveness | `http://localhost/api/v1/health/liveness` |
| Backend readiness | `http://localhost/api/v1/health/readiness` |
| Auth health | `http://localhost/auth-health` |
| OpenAPI spec | `http://localhost/api/v1/openapi.yaml` |

## Local development

```bash
docker compose up -d postgres dragonfly mailpit   # infrastructure only
cd apps/backend && go run ./cmd/server            # API on :8080
npm run dev:auth                                  # auth on :3001
npm run dev:frontend                              # dashboard (Vite)
```

Point the frontend at the stack by adding to `apps/frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost/api/v1
VITE_AUTH_BASE_URL=http://localhost/auth
```

Or skip all of it: `http://localhost:<vite-port>/?demo=true` runs entirely in the browser.

## CLI

```bash
npm run build --workspace @primora/cli   # → apps/cli/dist/cli.js
node apps/cli/dist/cli.js login          # or: npx primora login once published
```

Supports session sign-in (`primora login`) and API-key mode (`primora login --api-key prm_…` or `PRIMORA_API_KEY`). Context lives in `~/.config/primora/config.json`; `primora use` picks org + project interactively. Commands: `orgs`, `projects`, `buckets`, `objects` (list/upload/download/rm), `keys`, `audit list --follow`. Every command accepts `--json`.

## Desktop & phone

- **Desktop** — `apps/desktop` is a Tauri 2 shell (Linux/Windows/macOS). First
  run asks for your deployment URL, then renders the same dashboard in a
  webview with a system-tray presence. Nothing is bundled; your server does the
  work. See [apps/desktop/README.md](apps/desktop/README.md).
- **Phone / PWA** — the dashboard ships a web manifest and service worker.
  Open your deployment in a mobile browser and "Add to Home Screen"; the shell
  is precached, API traffic always goes to the network. Chromium desktop
  browsers get an in-app install banner.

## Quality gate

```bash
npm run check        # backend tests + frontend typecheck + build + generated-code drift check
npm test             # workspace tests
npm run generate:sqlc    # regenerate sqlc after changing queries/schema
npm run generate:client  # regenerate the TS client after changing openapi.yaml
```

## Repository layout

```
apps/
  backend/     Go + Gin API, sqlc, migrations, object storage
  auth/        Better Auth on Hono (sessions, JWT, OAuth, mail)
  frontend/    SolidJS + Tailwind dashboard
  cli/         `primora` CLI — login, context, projects, buckets, objects, keys, audit
  mcp/         `@primora/mcp` — MCP stdio server exposing `primora_*` tools
  desktop/     Tauri 2 shell — connects to a deployment URL, tray presence
packages/
  api-client/  OpenAPI-generated TypeScript client (do not hand-edit)
  shared-types/
infra/nginx/   Reverse proxy config
scripts/       setup.sh, verify-production-ready.sh
```

## Documentation

- [QUICK_START.md](QUICK_START.md) — setup, configuration, troubleshooting
- [project_backend.md](project_backend.md) / [project_frontend.md](project_frontend.md) — original design specs
- [CONTRIBUTING.md](CONTRIBUTING.md) — development workflow
- `apps/backend/openapi/openapi.yaml` — API contract

## License

[MIT](LICENSE)
