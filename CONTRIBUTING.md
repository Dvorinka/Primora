# Contributing

## Setup

See [QUICK_START.md](QUICK_START.md). The short version:

```bash
cp .env.example .env
docker compose up -d --build
```

For native development run only the infrastructure in Docker
(`docker compose up -d postgres dragonfly mailpit`) and start the three
services yourself.

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
