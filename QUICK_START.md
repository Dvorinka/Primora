# Primora — Quick Start

## Prerequisites

- Docker with the Compose plugin (recommended path), or
- Go 1.26+, Node.js 20+, and a local PostgreSQL + Redis-compatible instance

## Docker (recommended)

```bash
./scripts/setup.sh
```

The script creates `.env` from `.env.example`, generates `JWT_SECRET` and
`BETTER_AUTH_SECRET`, prompts for a domain (default `localhost`), and runs
`docker compose up -d`.

Manual equivalent:

```bash
cp .env.example .env
# edit .env: set JWT_SECRET and BETTER_AUTH_SECRET
docker compose up -d --build
```

Open `http://localhost`. Sign up, create an organization, create a project.

Mailpit (local email capture) is at `http://localhost/mailpit/`.

### Port conflicts

Only host bindings are configurable. If `5432`/`6379`/`80` are taken:

```env
POSTGRES_PORT=5433
DRAGONFLY_PORT=6380
NGINX_PORT=8081
```

Internal service addresses (`postgres:5432`, `dragonfly:6379`) never change.

## Demo mode (no backend required)

- Append `?demo=true` to the dashboard URL, or
- set `VITE_DEMO_MODE=true`, or
- click **launch demo mode** on the login page.

Demo mode is fully client-side: organizations, projects, members, buckets,
objects, collections, API keys, and audit events all work and persist for the
session. A "Demo — exit" pill in the topbar leaves demo mode.

## Configuration

All configuration lives in `.env` (see `.env.example` for the annotated list).
The important ones:

| Variable | Purpose |
|---|---|
| `JWT_SECRET` | Signing secret for API tokens — required, generate with `openssl rand -base64 32` |
| `BETTER_AUTH_SECRET` | Better Auth secret — required, same generation |
| `POSTGRES_*` / `DATABASE_URL` | Postgres connection |
| `DRAGONFLY_URL` | Cache/rate-limit store |
| `SMTP_*` / `MAIL_FROM` | Transactional email (Mailpit in dev, or Resend via `RESEND_API_KEY`) |
| `PRIMORA_ENCRYPTION_KEY` | AES-256 key (64 hex chars, `openssl rand -hex 32`) — encrypts the project vault, integration credentials and webhook secrets at rest. Without it the Vault page and `secret://` job refs are unavailable |
| `SIGNUP_ENABLED` | Open public sign-up after bootstrap — default `false`; admins override in-app |
| `PRIMORA_MANAGED` | Managed tier flag — enables OAuth providers when `true`; self-hosted is email/password only |
| `USER_RATE_LIMIT_PER_MINUTE` / `API_KEY_RATE_LIMIT_PER_MINUTE` | Throttling defaults — overridable in-app |
| `BACKEND_STORAGE_DRIVER` | `local` (default, `BACKEND_STORAGE_ROOT`) or `s3` — S3-compatible object storage |
| `S3_ENDPOINT` / `S3_BUCKET` / `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | S3 backend config (with `S3_REGION`, `S3_PREFIX`, `S3_PATH_STYLE`) |
| `FUNCTIONS_RUNTIME` / `FUNCTIONS_TIMEOUT_SECONDS` | JS runtime for Functions — `auto` (default, resolves `bun`/`deno` from PATH) or a binary path; 30 s default timeout |
| `VITE_DEMO_MODE` | Enable the client-side demo workspace |

### Instance administration

The **first public sign-up becomes the instance admin** — on a fresh database the
login page only offers sign-up. After that, public sign-up is closed and the
admin can reopen it in-app.

Admins get a **Settings → Instance** tab that manages the instance without a
restart: public sign-up, mail transport (Resend or SMTP), and rate limits.
Every setting resolves in the order **in-app value → `.env` → built-in
default**; resetting a key reverts to env/default. Secrets (SMTP password,
Resend key) are stored AES-256-GCM-encrypted and never displayed back.

API equivalents:

```bash
GET    /api/v1/instance/public           # unauthenticated — login page state
GET    /api/v1/instance/settings         # platform admin
PUT    /api/v1/instance/settings/{key}   # platform admin — {"value": ...}
DELETE /api/v1/instance/settings/{key}   # platform admin — revert to env/default
```

## Verification

```bash
curl http://localhost/api/v1/health/liveness     # {"status":"ok"}
curl http://localhost/api/v1/health/readiness    # db + cache + storage checks
curl http://localhost/auth-health                # auth service + db + cache
```

## Quality checks

```bash
npm run check            # everything: go test, tsc, builds, codegen drift
npm test                 # vitest across workspaces
cd apps/backend && go test ./...
cd apps/frontend && npx tsc -p tsconfig.json --noEmit
```

## Regenerating code

Generated code is checked in but must never be hand-edited.

```bash
npm run generate:sqlc      # after changing db queries/migrations
npm run generate:client    # after changing apps/backend/openapi/openapi.yaml
```

`npm run check` fails CI if generated output drifts from the sources.

## Troubleshooting

**`docker compose up` fails on port binding** — another service owns the port.
Set `POSTGRES_PORT`/`DRAGONFLY_PORT`/`NGINX_PORT` in `.env`.

**Login works but every API call 401s** — the backend can't reach the auth
service's JWKS. Confirm `AUTH_INTERNAL_BASE_URL=http://auth:3001` and that the
auth container is up (`docker compose ps`).

**Emails never arrive** — they go to Mailpit in development:
`http://localhost/mailpit/`. For real delivery configure `SMTP_*` or
`RESEND_API_KEY`.

**Frontend dev server can't reach the API** — Vite does not proxy. Either run
the full compose stack and use `http://localhost`, or set
`VITE_API_BASE_URL=http://localhost/api/v1` and
`VITE_AUTH_BASE_URL=http://localhost/auth` in `apps/frontend/.env.local`.

**`npm run check` reports generated drift** — run `npm run generate:sqlc`
and/or `npm run generate:client` and commit the regenerated files.
