# Primora Deployment Guide

Primora ships as a Docker Compose stack: nginx (edge), frontend (static SPA),
auth (Better Auth / Hono), backend (Go API), postgres, and dragonfly
(Redis-compatible cache). The base `docker-compose.yml` is the production
surface — dev-only services like Mailpit live in `docker-compose.dev.yml`.

## Prerequisites

- Docker Engine 24+ with the Compose plugin
- A host with 2 GB free RAM minimum (postgres + dragonfly + services)
- A domain pointing at the host if you want TLS

## Quick start

```bash
git clone <repo> && cd Primora
./scripts/setup.sh            # writes .env with generated secrets
docker compose up -d          # production surface only
```

For local development (includes Mailpit at `/mailpit/`):

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
```

`setup.sh` generates `JWT_SECRET`, `BETTER_AUTH_SECRET`, and
`PRIMORA_ENCRYPTION_KEY`. Do not reuse the example values anywhere public.

## Environment reference

| Variable | Purpose | Required |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | database credentials | yes |
| `DATABASE_URL` | backend → postgres DSN | yes |
| `DRAGONFLY_URL` | backend → cache DSN | yes |
| `JWT_SECRET` | signs API JWTs (`JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_TTL_SECONDS` tune tokens) | yes |
| `BETTER_AUTH_SECRET` | auth session/signing secret | yes |
| `PRIMORA_ENCRYPTION_KEY` | AES-256 key (64 hex chars) for integration credentials + webhook secrets at rest | production |
| `AUTH_BASE_URL` / `BETTER_AUTH_URL` | public auth URL (`https://host/auth`) | yes |
| `AUTH_INTERNAL_BASE_URL` | backend → auth internal URL (`http://auth:3001`) | yes |
| `VITE_APP_URL` / `VITE_AUTH_BASE_URL` / `VITE_API_BASE_URL` | frontend public URLs — **baked into the frontend image at build time** | yes |
| `BACKEND_STORAGE_ROOT` | object storage directory inside the backend container | yes |
| `AUTH_ADMIN_EMAILS` | comma-separated emails promoted to auth admin on boot | no |
| `USER_RATE_LIMIT_PER_MINUTE` / `API_KEY_RATE_LIMIT_PER_MINUTE` | per-identity API rate limits (defaults 240 / 600) | no |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `SMTP_SECURE` / `MAIL_FROM` | transactional mail; without it verification/reset emails go nowhere | production |
| `RESEND_API_KEY` | alternative to SMTP — Resend API | no |
| `*_CLIENT_ID` / `*_CLIENT_SECRET` | GitHub / Google / Discord / Microsoft OAuth | no |
| `NGINX_PORT` | host port for the edge (default 80) | no |

## TLS

Primora does not terminate TLS itself — put a reverse proxy in front of
nginx's port 80. The nginx config sets `X-Forwarded-*`-aware headers; pass
them through.

**Caddy** (`Caddyfile`):

```
primora.example.com {
    reverse_proxy localhost:80
}
```

**Traefik** (compose labels on the nginx service):

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.primora.rule=Host(`primora.example.com`)
  - traefik.http.routers.primora.entrypoints=websecure
  - traefik.http.routers.primora.tls.certresolver=letsencrypt
```

Once TLS is live, update `VITE_APP_URL`, `VITE_AUTH_BASE_URL`,
`AUTH_BASE_URL`, `BETTER_AUTH_URL`, and `COOKIE_DOMAIN` to the https origin
and rebuild the frontend image (`docker compose build frontend`).

## SMTP / email

Auth sends verification and password-reset email through SMTP
(`SMTP_*` + `MAIL_FROM`) or Resend (`RESEND_API_KEY`). In development the
`docker-compose.dev.yml` overlay runs Mailpit; mail is captured at
`http://localhost/mailpit/` and nothing leaves the host. **The production
compose file contains no mail sink — configure real SMTP before inviting
users.**

## Backups

`scripts/backup.sh` produces a tarball with a `pg_dump -Fc` of the database
and a tar of the `backend_storage` volume:

```bash
./scripts/backup.sh            # → backups/primora-<stamp>.tar.gz
```

Restore (destructive — stops writes):

```bash
docker compose stop backend auth
./scripts/restore.sh backups/primora-<stamp>.tar.gz
docker compose up -d
```

Cron example (nightly, keep 14):

```cron
17 3 * * * cd /opt/primora && ./scripts/backup.sh && \
  ls -1t backups/primora-*.tar.gz | tail -n +15 | xargs -r rm
```

systemd timer example is in `PRODUCTION_READINESS.md`.

## Upgrades

Migrations run automatically on backend boot (goose). Safe order:

```bash
./scripts/backup.sh                       # 1. snapshot first
docker compose pull && docker compose build   # 2. new images
docker compose up -d                      # 3. rolling recreate; backend migrates on boot
./scripts/smoke-e2e.sh                    # 4. verify health, auth, ingest
```

`goose` migrations include `Down` sections; `goose -dir apps/backend/db/migrations postgres "$DATABASE_URL" down` rolls back one version if a release misbehaves.

## Storage constraint

Object storage is the **local filesystem** (`backend_storage` volume). There
is no S3-compatible backend yet — the volume must be on durable, backed-up
disk, and a single host serves all objects. Plan capacity accordingly;
multi-node deployments need an external object store first.

## Observability

- `GET /api/v1/metrics` — Prometheus exposition (unauthenticated; restrict at
  the edge if the instance is public — see the commented rule in
  `infra/nginx/default.conf`).
- `GET /api/v1/health/liveness` / `readiness` — compose healthchecks use the
  same endpoints.
- Structured JSON logs on stdout for every service — ship with your normal
  docker log driver.

## API key scopes

Keys are created with scopes: `ingest`, `read`, `write`, `admin`.
`admin` unlocks everything; `write` unlocks read + ingest + non-admin
mutations; `read`/`ingest` are single-purpose. Keys without stored scopes
(pre-scope keys) behave as `admin` for backwards compatibility — rotate them
into scoped keys at your leisure.
