<p align="center">
  <img src="./primora.svg" alt="Primora" width="120">
</p>

<h1 align="center">Primora</h1>

<p align="center">
  Self-hosted backend platform for building products.<br>
  Auth, Postgres-backed APIs, object storage, and audit logs on your own hardware.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> ·
  <a href="QUICK_START.md">Documentation</a> ·
  <a href="https://github.com/Dvorinka/Primora/releases">Releases</a> ·
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
  <a href="https://github.com/Dvorinka/Primora/actions/workflows/ci.yml"><img src="https://github.com/Dvorinka/Primora/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/Dvorinka/Primora/releases"><img src="https://img.shields.io/github/v/release/Dvorinka/Primora" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/Dvorinka/Primora" alt="License"></a>
</p>

## What is Primora?

Primora is a self-hosted backend platform: organizations, projects, auth,
S3-style object storage, JSON document collections, scoped API keys, and a
full audit log behind one dashboard. Inspired by the UX of Appwrite and
Supabase, with no hosted tier - your data stays on your hardware.

## Screenshots

| Overview | Storage | Telemetry |
|:-:|:-:|:-:|
| ![Project overview](docs/screenshots/overview.png) | ![Object storage](docs/screenshots/storage.png) | ![Telemetry and component health](docs/screenshots/telemetry.png) |

<details>
<summary>More screenshots</summary>

| Collections | Automation | Audit log |
|:-:|:-:|:-:|
| ![JSON document collections](docs/screenshots/collections.png) | ![Scheduled jobs and live events](docs/screenshots/automation.png) | ![Audit log with export](docs/screenshots/audit.png) |

</details>

## Features

- **Organizations & projects** - workspaces with scoped org and project roles.
- **Auth** - email/password plus optional GitHub, Google, Discord, and Microsoft OAuth. JWTs verified by the API against JWKS.
- **Storage** - S3-style buckets on local disk or any S3-compatible backend (AWS, MinIO, Garage, R2), public or private.
- **Collections** - schema-flexible JSON documents in Postgres JSONB, with filter/order queries.
- **Functions** - project-scoped JS/TS executed by bun/deno on the host, with per-run logs. Trigger them four ways: manual invoke, cron schedules (`function_id` on a job), inbound hooks (`mode: "function"`), or domain events (`event_pattern` like `document.*`).
- **Vault** - AES-256-GCM project secrets plus an Argon2id/XChaCha20 local vault in the CLI and desktop app.
- **Automation** - scheduled jobs, inbound webhooks, telemetry alert rules, and `secret://` refs resolved at delivery.
- **Realtime** - SSE event stream with a typed client SDK (`@primora/client`).
- **API keys** - `prm_<prefix>_<secret>` credentials, shown once.
- **Audit log** - every mutating request recorded, with CSV/JSON export.
- **Demo mode** - fully client-side seeded workspace via `?demo=true`.

## Architecture

```
Browser ──▶ Nginx ──▶ Frontend (SolidJS + Vite)
                 ├──▶ Auth service (Better Auth + Hono)
                 └──▶ API (Go + Gin) ──▶ PostgreSQL
                                     ──▶ DragonflyDB (Redis-compatible cache)
                                     ──▶ Local filesystem object storage
```

## Quick Start

Prerequisites: Docker with the Compose plugin.

```bash
curl -fsSL https://raw.githubusercontent.com/Dvorinka/Primora/master/install.sh | bash
```

Installs into `./primora`, generates secrets, and starts the stack on port 80.
Or from a clone:

```bash
git clone https://github.com/Dvorinka/Primora.git && cd Primora
./scripts/setup.sh          # creates .env, generates secrets, starts the stack
```

Then open `http://localhost` - or append `?demo=true` to explore a seeded
workspace without signing up. For prebuilt images, native development, port
conflicts, and troubleshooting see [QUICK_START.md](QUICK_START.md).

## Configuration

All configuration lives in `.env` - see `.env.example` for the annotated list
and [QUICK_START.md](QUICK_START.md#configuration) for the important ones.

## Ecosystem

- **[CLI](apps/cli)** - `primora` for orgs, projects, buckets, objects, keys, jobs, and audit — plus an encrypted local secrets vault (`vault:*`, `secrets:*`, `inject`), the shared project vault (`secrets:* --remote`, `secret://NAME` refs in job payloads), an agent credential broker (`agent`), and compose-stack operator commands (`stack:*`).
- **[MCP server](apps/mcp)** - exposes `primora_*` tools to MCP clients.
- **[Desktop](apps/desktop)** - Tauri 2 shell connecting to your deployment, with tray presence and a local Secrets Vault window (drives the CLI's vault).
- **PWA** - the dashboard is installable on mobile and desktop browsers.

## Documentation

- [QUICK_START.md](QUICK_START.md) - setup, configuration, troubleshooting
- [project_backend.md](project_backend.md) / [project_frontend.md](project_frontend.md) - original design specs
- `apps/backend/openapi/openapi.yaml` - API contract

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the development workflow.

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities.

## License

[MIT](LICENSE)
