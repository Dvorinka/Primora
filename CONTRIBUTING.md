# Contributing

## Setup

See [QUICK_START.md](QUICK_START.md). The short version:

```bash
cp .env.example .env
docker compose up -d --build
```

For native development run only the infrastructure in Docker and start the
three services yourself:

```bash
docker compose up -d postgres dragonfly mailpit   # infrastructure only
cd apps/backend && go run ./cmd/server            # API on :8080
npm run dev:auth                                  # auth on :3001
npm run dev:frontend                              # dashboard (Vite)
```

Point the frontend at the stack via `apps/frontend/.env.local`:

```env
VITE_API_BASE_URL=http://localhost/api/v1
VITE_AUTH_BASE_URL=http://localhost/auth
```

Or skip the backend entirely: `?demo=true` runs a fully client-side workspace.

## Workflow

1. Fork, branch from `main`, keep changes scoped.
2. Run the quality gate before opening a PR:

   ```bash
   npm run check
   ```

   This runs backend tests, the frontend typecheck, all workspace builds, and
   verifies generated code has not drifted.

3. If you changed database queries or migrations, run `npm run generate:sqlc`.
   If you changed `apps/backend/openapi/openapi.yaml`, run
   `npm run generate:client`. Commit the regenerated output with your change.

## Repository layout

```
apps/
  backend/     Go + Gin API, sqlc, migrations, object storage
  auth/        Better Auth on Hono (sessions, JWT, OAuth, mail)
  frontend/    SolidJS + Tailwind dashboard
  cli/         `primora` CLI - login, context, projects, buckets, objects, keys, audit
  mcp/         `@primora/mcp` - MCP stdio server exposing `primora_*` tools
  desktop/     Tauri 2 shell - connects to a deployment URL, tray presence
packages/
  api-client/  OpenAPI-generated TypeScript client (do not hand-edit)
  shared-types/
infra/nginx/   Reverse proxy config
scripts/       setup.sh, verify-production-ready.sh
```

## Conventions

- **Generated code is never hand-edited** — `packages/api-client/src/generated`
  and `apps/backend/internal/database/db` are outputs, not sources.
- **Go** — `gofmt`, `go vet` clean; table-driven tests where they fit.
- **SolidJS** — Composition via signals, `<Show>`/`<For>` control flow, no
  manual DOM manipulation. Styles come from the design tokens in
  `apps/frontend/src/index.css` — new colors/surfaces belong there, not in
  ad-hoc hex values.
- **API changes** — update `openapi.yaml` first, then implement. The spec is
  the contract.
- Keep commits focused; describe *why*, not *what*.

## Reporting bugs

Open an issue with the failing endpoint or view, what you expected, what you
got, and `docker compose logs` output for the relevant service.

## Security

Do not open public issues for vulnerabilities — see
[SECURITY.md](SECURITY.md).
