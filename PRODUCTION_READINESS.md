# Primora Production Readiness

Status checklist for self-hosted production use. Everything listed under
"Hardened" is implemented and verified; "Known limits" is the honest
remainder.

## Hardened

- **Graceful shutdown** — the backend drains in-flight requests for up to
  10 s on SIGTERM/SIGINT (`internal/app`).
- **Scoped API keys** — `ingest` / `read` / `write` / `admin`, enforced in
  auth middleware before handlers run. Legacy keys without stored scopes act
  as `admin`.
- **Brute-force protection** — Better Auth rate limiting is enabled
  unconditionally (3 attempts / 10 s on sign-in, sign-up, password change);
  an IP-level limiter caps `/auth/*` at 60 req/min, and per-identity API
  rate limits apply via `USER_RATE_LIMIT_PER_MINUTE` /
  `API_KEY_RATE_LIMIT_PER_MINUTE` in Dragonfly.
- **Metrics** — `GET /api/v1/metrics` in Prometheus text format.
- **Retention** — per-project sweeper for telemetry events, audit log rows,
  and webhook deliveries (`retention_*_days`, 0 = disabled, default 90).
- **Edge security** — nginx emits `X-Frame-Options`, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy`, and a CSP scoped to the SPA only.
- **Compose hygiene** — all services have healthchecks and
  `restart: unless-stopped`; Dragonfly is pinned to `v2.0.0`; Mailpit lives
  only in `docker-compose.dev.yml`.
- **Secrets** — `setup.sh` generates `JWT_SECRET`, `BETTER_AUTH_SECRET`, and
  `PRIMORA_ENCRYPTION_KEY`; credentials and webhook secrets are AES-256
  encrypted at rest.
- **Release images** — GitHub release builds `linux/amd64` + `linux/arm64`
  via buildx/QEMU.
- **CI coverage** — Go tests, frontend tests + typecheck, all three Docker
  builds, golangci-lint, migration up/reset/up round-trip, and a compose E2E
  smoke (`scripts/smoke-e2e.sh`).
- **Backups** — `scripts/backup.sh` / `scripts/restore.sh` cover the database
  (custom-format dump) and the storage volume.

## Known limits

- **Storage is local filesystem only.** No S3 backend — the
  `backend_storage` volume is the durability boundary.
- **Single host.** Compose topology is single-node; postgres and dragonfly
  are not clustered. HA is out of scope for v0.x.
- **No TLS inside the stack.** Terminate at a front proxy (Caddy/Traefik);
  see DEPLOYMENT_GUIDE.md.
- **Metrics are in-memory counters.** `/api/v1/metrics` covers request
  totals/errors/duration — not per-route histograms or DB pool stats yet.
- **`/api/v1/metrics` is unauthenticated.** Scrape-only design; block it at
  the edge for public instances (commented rule in `infra/nginx/default.conf`).

## systemd timer for backups

`/etc/systemd/system/primora-backup.service`:

```ini
[Unit]
Description=Primora backup

[Service]
Type=oneshot
WorkingDirectory=/opt/primora
ExecStart=/opt/primora/scripts/backup.sh
```

`/etc/systemd/system/primora-backup.timer`:

```ini
[Unit]
Description=Nightly Primora backup

[Timer]
OnCalendar=*-*-* 03:17:00
Persistent=true

[Install]
WantedBy=timers.target
```

## Verification

```bash
./scripts/verify-production-ready.sh   # structural check
./scripts/smoke-e2e.sh                 # live E2E against a running stack
npm run check                          # typecheck + tests + generated-code drift
```
