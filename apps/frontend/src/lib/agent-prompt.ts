/**
 * Builds the copy-paste prompt that hands an AI coding agent everything it
 * needs to wire a repository into a Primora project: telemetry ingest,
 * database connections, and agent-facing access (MCP/CLI). Pure function so
 * it can be unit-tested and reused by any surface.
 */

export interface AgentPromptInput {
  /** Deployment origin, e.g. http://localhost — /api/v1 is appended here. */
  baseUrl: string;
  projectId: string;
  projectName: string;
  projectSlug: string;
  /** Full prm_… key shown once at mint time. */
  apiKey: string;
  /** Optional absolute path to a local Primora source checkout (enables the MCP build step). */
  primoraSourcePath?: string;
}

export function buildAgentPrompt(input: AgentPromptInput): string {
  const base = input.baseUrl.replace(/\/+$/, "");
  const api = `${base}/api/v1`;
  const p = input.projectId;

  const mcpSection = input.primoraSourcePath
    ? `A Primora source checkout exists at \`${input.primoraSourcePath}\`. Build the MCP server once:

\`\`\`bash
cd ${input.primoraSourcePath} && npm run build --workspace @primora/mcp   # → apps/mcp/dist/server.js
\`\`\`

Then register a stdio MCP server named \`primora\` in your client's MCP config:
\`\`\`json
{
  "mcpServers": {
    "primora": {
      "command": "node",
      "args": ["${input.primoraSourcePath}/apps/mcp/dist/server.js"],
      "env": {
        "PRIMORA_BASE_URL": "${base}",
        "PRIMORA_API_KEY": "$PRIMORA_API_KEY",
        "PRIMORA_PROJECT": "${p}"
      }
    }
  }
}
\`\`\`
This exposes 30+ \`primora_*\` tools (telemetry query, collections, storage, jobs, audit) to every agent that loads the config.`
    : `If a Primora source checkout is available on this machine, build \`@primora/mcp\` and register it as a stdio MCP server with env \`PRIMORA_BASE_URL=${base}\`, \`PRIMORA_API_KEY\`, \`PRIMORA_PROJECT=${p}\`. Otherwise skip — the REST API above covers the same surface.`;

  return `You are an AI agent. Wire this repository into the Primora project "${input.projectName}" so it reports telemetry, tracks its databases, and is reachable by future agents. Work through every section; do not stop after the first.

## Credentials

\`\`\`bash
PRIMORA_BASE_URL=${base}
PRIMORA_API_KEY=${input.apiKey}
PRIMORA_PROJECT=${p}
\`\`\`

- API base: \`${api}\`
- Send the key as header \`X-Primora-Key\` (alias \`X-API-Key\` also accepted).
- Key scope is \`write\`: it covers telemetry ingest, reads, and non-admin mutations (connections, buckets, collections, webhooks). It cannot mint keys or manage members — that is intentional.
- Put these in the project's \`.env\` (add to \`.env.example\` with placeholders) and reference them via env vars in code. Never hardcode or commit the literal key.

## 1. Monitoring — instrument every component

All telemetry goes to one endpoint; components self-register on first event:

\`\`\`
POST ${api}/ingest
X-Primora-Key: $PRIMORA_API_KEY
Content-Type: application/json

{"events":[{"type":"error","component":"${input.projectSlug}-api","kind":"backend","severity":"error","message":"…","payload":{"stack":"…"},"ts":"<RFC3339>"}]}
\`\`\`

- \`type\`: \`error\` | \`metric\` | \`log\` | \`heartbeat\` | \`event\`. Batches up to 500 events.
- \`kind\`: \`frontend\` | \`backend\` | \`database\` | \`web\` | \`android\` | \`desktop\` | \`other\`.
- Errors with the same \`message\` (or explicit \`fingerprint\`) group into Issues.

Detect this repo's stack and instrument each deployable unit — frontend, backend, workers, landing page, all of them:

- **Browser / React / any web frontend**: add a small telemetry module that batches to /ingest (fetch + \`keepalive: true\`), hooks \`window.onerror\` + \`unhandledrejection\`, and flushes on \`visibilitychange\`. Component kind \`frontend\` or \`web\`.
- **Node / TypeScript backends**: hook the framework's error middleware and \`process.on("uncaughtException")\`; send \`heartbeat "up"\` every 30s. Kind \`backend\`.
- **Go / Python / Rust / other**: same HTTP contract — wrap panic/recover or global exception handlers and a periodic heartbeat. Any language works; there is no required SDK.
- Name components \`${input.projectSlug}-frontend\`, \`${input.projectSlug}-api\`, \`${input.projectSlug}-worker\`, etc.

Verify now: send one test event and confirm it lands (see §4).

## 2. Databases — register what this app uses

Ask the user for the connection details of each database this project uses — never fabricate credentials, never commit them. Register each one so it appears under Primora → Databases (schema browser, query console):

\`\`\`
POST ${api}/projects/${p}/db-connections
X-Primora-Key: $PRIMORA_API_KEY

{"name":"primary","db_type":"postgres","host":"…","port":5432,"database":"…","username":"…","password":"…","ssl":true}
\`\`\`

Supported \`db_type\`: postgres, mysql, sqlite, redis, mongodb, sqlserver, duckdb, clickhouse, cassandra. After creating each connection verify it:

\`\`\`
POST ${api}/projects/${p}/db-connections/{connectionID}/test → {"ok":true|false,"error":"…"}
\`\`\`

Report per-database status to the user. If a database is unreachable, say so — do not silently skip it.

## 3. Agent access — let future agents manage this project

${mcpSection}

Optional CLI path: \`primora login --api-key $PRIMORA_API_KEY\`, then \`primora use\`. For wrapping third-party agents with brokered credentials (the agent never holds real keys), use \`primora agent --<provider> <vault-secret> -- <cmd>\`.

## 4. Prove it works

1. \`curl -sS -X POST ${api}/ingest -H "X-Primora-Key: $PRIMORA_API_KEY" -H "Content-Type: application/json" -d '{"events":[{"type":"event","component":"setup","message":"primora.setup.done"}]}'\` — expect \`{"accepted":1}\`.
2. Record a deploy marker: \`curl -sS -X POST ${api}/projects/${p}/deploy-markers -H "X-Primora-Key: $PRIMORA_API_KEY" -H "Content-Type: application/json" -d '{"ref":"<git sha>","environment":"dev","note":"agent setup"}'\`.
3. Finish with a short summary: components instrumented, database connections tested, and where the data lands (${base} → Telemetry, Databases, Integrations).
`;
}
