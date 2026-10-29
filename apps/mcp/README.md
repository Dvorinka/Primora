# @primora/mcp

Primora MCP stdio server - exposes the platform as `primora_*` tools to any
MCP client (Claude Desktop, Cursor, etc.).

## Build

```bash
npm run build --workspace @primora/mcp   # → dist/server.js
```

## Configure

Point your MCP client at `node dist/server.js`. The server shares the CLI's
config file - `primora login` once and both tools work. Env vars override:
`PRIMORA_BASE_URL`, `PRIMORA_API_KEY`, `PRIMORA_ORG`, `PRIMORA_PROJECT`.

## Tools

30+ `primora_*` tools covering organizations, projects, buckets, objects,
collections, API keys, integrations, webhooks, scheduled jobs, telemetry,
and audit: `primora_whoami`, `primora_list_projects`,
`primora_upload_object`, `primora_query_audit`, `primora_run_job`, …

Secrets and logins are encrypted at rest. An agent reads one named value
when it needs it, and does not paste that value into chat or a `.env` file.
Lists omit passwords. Project reveals are audit-logged.

- `primora_vault_status` / `primora_vault_list` / `primora_vault_get` —
  local vault. Get returns one secret. Requires `primora vault unlock`.
- `primora_vault_exec` — runs an allow-listed `primora` command with a
  vault secret in the child env (the secret is not in the command output).
  File/path flags are rejected. Loader hooks like `NODE_OPTIONS` are blocked.
- `primora_secrets_list` / `primora_secrets_set` / `primora_secrets_get` —
  project vault. Get reveals one secret and is audit-logged. Job payloads
  can still reference `secret://NAME`.
- `primora_logins_list` / `primora_logins_set` / `primora_logins_get` —
  username and password for a stable app id, local or `remote: true` for
  the project. The app id is not a host or a port.
