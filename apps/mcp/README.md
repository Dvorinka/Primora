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
