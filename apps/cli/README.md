# @primora/cli

`primora` - command-line client for a Primora deployment.

## Build

```bash
npm run build --workspace @primora/cli   # → dist/cli.js
node dist/cli.js login                   # or: npx primora login once published
```

## Auth

- `primora login` - session sign-in against your deployment.
- `primora login --api-key prm_…` - or export `PRIMORA_API_KEY`.

Context lives in `~/.config/primora/config.json`; `primora use` picks org +
project interactively.

## Commands

`orgs`, `projects`, `buckets`, `objects` (list/upload/download/rm), `keys`,
`audit list --follow`. Every command accepts `--json`.
