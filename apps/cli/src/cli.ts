import { cac } from "cac";

import { cmdLogin, cmdLogout, cmdWhoami } from "./commands/auth.js";
import { cmdAuditList } from "./commands/audit.js";
import { cmdDocumentsList } from "./commands/documents.js";
import { cmdEventsSend } from "./commands/events.js";
import { cmdBucketsCreate, cmdBucketsList } from "./commands/buckets.js";
import { cmdContext, cmdUse } from "./commands/context.js";
import { cmdInject } from "./commands/inject.js";
import { cmdJobsCreate, cmdJobsList, cmdJobsRemove, cmdJobsRun, cmdJobsRuns } from "./commands/jobs.js";
import { cmdKeysCreate, cmdKeysList, cmdKeysRevoke } from "./commands/keys.js";
import {
  cmdObjectsDownload,
  cmdObjectsList,
  cmdObjectsRemove,
  cmdObjectsPresign,
  cmdObjectsUpload,
} from "./commands/objects.js";
import { cmdOrgsCreate, cmdOrgsList } from "./commands/orgs.js";
import { cmdProjectsCreate, cmdProjectsList } from "./commands/projects.js";
import {
  cmdSecretsGet,
  cmdSecretsImport,
  cmdSecretsList,
  cmdSecretsRemove,
  cmdSecretsSet,
} from "./commands/secrets.js";
import { cmdAgent, PRESET_NAMES } from "./commands/agent.js";
import {
  cmdStackBackup,
  cmdStackDown,
  cmdStackLogs,
  cmdStackPull,
  cmdStackStatus,
  cmdStackUp,
} from "./commands/stack.js";
import {
  cmdVaultInit,
  cmdVaultLock,
  cmdVaultStatus,
  cmdVaultUnlock,
} from "./commands/vault.js";
import { fail } from "./out.js";

const cli = cac("primora");

cli.option("--json", "Output raw JSON");

cli
  .command("login", "Sign in or store credentials")
  .option("--url <url>", "Primora base URL (default http://localhost)")
  .option("--email <email>", "Account email")
  .option("--password <password>", "Account password")
  .option("--api-key <key>", "Store a pk_live_/pk_test_ API key instead of a session")
  .action(cmdLogin);

cli.command("logout", "Remove stored credentials").action(cmdLogout);
cli.command("whoami", "Show the current identity and memberships").action(cmdWhoami);

cli
  .command("use", "Select organization and project context")
  .option("--org <id|slug>", "Organization id or slug")
  .option("--project <id|slug>", "Project id or slug")
  .action(cmdUse);

cli.command("context", "Show the current context").action(cmdContext);

cli.command("orgs:list", "List organizations (`primora orgs list`)").action(cmdOrgsList);
cli
  .command("orgs:create <name>", "Create an organization")
  .option("--slug <slug>", "URL-safe slug (derived from name if omitted)")
  .action(cmdOrgsCreate);

cli
  .command("projects:list", "List projects in the current org")
  .option("--org <id>", "Organization override")
  .option("--q <query>", "Search filter")
  .action(cmdProjectsList);
cli
  .command("projects:create <name>", "Create a project")
  .option("--org <id>", "Organization override")
  .option("--slug <slug>", "URL-safe slug (derived from name if omitted)")
  .option("--description <text>", "Description")
  .action(cmdProjectsCreate);

cli
  .command("buckets:list", "List buckets in the current project")
  .option("--project <id>", "Project override")
  .option("--q <query>", "Search filter")
  .action(cmdBucketsList);
cli
  .command("buckets:create <name>", "Create a bucket")
  .option("--project <id>", "Project override")
  .option("--slug <slug>", "URL-safe slug (derived from name if omitted)")
  .option("--public", "Public visibility (default private)")
  .action(cmdBucketsCreate);

cli
  .command("objects:list <bucket>", "List objects in a bucket (id or slug)")
  .option("--project <id>", "Project override")
  .option("--q <query>", "Search filter")
  .option("--limit <n>", "Page size (default 50)")
  .option("--offset <n>", "Page offset")
  .action(cmdObjectsList);
cli
  .command("objects:upload <bucket> <file>", "Upload a file to a bucket")
  .option("--project <id>", "Project override")
  .option("--key <key>", "Object key (default: file basename)")
  .action(cmdObjectsUpload);
cli
  .command("objects:download <bucket> <key>", "Download an object")
  .option("--project <id>", "Project override")
  .option("--out <path>", "Output path (default: key basename)")
  .action(cmdObjectsDownload);
cli
  .command("objects:rm <bucket> <key>", "Delete an object")
  .option("--project <id>", "Project override")
  .action(cmdObjectsRemove);
cli
  .command("objects:presign <bucket> <key>", "Mint a presigned URL (s3 driver)")
  .option("--project <id>", "Project override")
  .option("--upload", "PUT URL for direct upload instead of GET download")
  .option("--ttl <seconds>", "Lifetime 60-3600 (default 900)")
  .action(cmdObjectsPresign);

cli
  .command("keys:list", "List API keys for the current project")
  .option("--project <id>", "Project override")
  .action(cmdKeysList);
cli
  .command("keys:create <name>", "Create an API key (secret shown once)")
  .option("--project <id>", "Project override")
  .action(cmdKeysCreate);
cli
  .command("keys:revoke <id>", "Revoke an API key")
  .option("--project <id>", "Project override")
  .option("--yes", "Skip the confirmation prompt")
  .action(cmdKeysRevoke);

cli
  .command("jobs:list", "List scheduled jobs in the current project")
  .option("--project <id>", "Project override")
  .action(cmdJobsList);
cli
  .command("jobs:create <name>", "Create a scheduled job (secret shown once if generated)")
  .option("--project <id>", "Project override")
  .option("--schedule <cron>", "Cron or descriptor, e.g. '*/15 * * * *' or '@every 1h'")
  .option("--url <url>", "Target endpoint (HTTPS public, HTTP private)")
  .option("--payload <json>", "Static JSON payload merged into every delivery")
  .option("--secret <secret>", "HMAC signing secret (generated if omitted)")
  .option("--disabled", "Create paused — enable via the dashboard or API")
  .action(cmdJobsCreate);
cli
  .command("jobs:run <job>", "Trigger a manual run now")
  .option("--project <id>", "Project override")
  .action(cmdJobsRun);
cli
  .command("jobs:runs <job>", "List run history for a job")
  .option("--project <id>", "Project override")
  .option("--limit <n>", "Page size (default 50)")
  .action(cmdJobsRuns);
cli
  .command("jobs:rm <job>", "Delete a scheduled job")
  .option("--project <id>", "Project override")
  .option("--yes", "Skip the confirmation prompt")
  .action(cmdJobsRemove);

cli
  .command("documents:list", "List documents in a collection (PostgREST-style --filter/--order)")
  .option("--collection <slug|id>", "Collection slug or id (required)")
  .option("--project <id>", "Project override")
  .option("--filter <expr>", "field.op.value terms, comma-separated (eq neq gt gte lt lte like in is)")
  .option("--order <expr>", "field.asc|field.desc list")
  .option("--limit <n>", "Page size (default 50)")
  .option("--offset <n>", "Page offset")
  .action(cmdDocumentsList);

cli
  .command("events:send <type>", "Publish a custom.* event to realtime subscribers, webhooks, and functions")
  .option("--project <id>", "Project override")
  .option("--data <json>", "JSON object payload")
  .action(cmdEventsSend);

cli
  .command("audit:list", "List audit events for the current project")
  .option("--project <id>", "Project override")
  .option("--q <query>", "Search filter")
  .option("--action <action>", "Filter by action (e.g. object.uploaded)")
  .option("--limit <n>", "Page size (default 50)")
  .option("--offset <n>", "Page offset")
  .option("--follow", "Keep polling for new events (tail mode)")
  .option("--interval <s>", "Poll interval in seconds with --follow (default 2)")
  .action(cmdAuditList);

// Local vault — secrets on this machine, not on the server. Password source:
// live session → PRIMORA_VAULT_PASSWORD → --password-file → hidden prompt.
cli
  .command("vault:init", "Create the local secrets vault")
  .option("--password-file <path>", "Read the vault password from a file")
  .action(cmdVaultInit);
cli
  .command("vault:status", "Show vault path, KDF parameters and lock state")
  .action(cmdVaultStatus);
cli
  .command("vault:unlock", "Open a TTL'd session — agents use the vault without the password")
  .option("--ttl <s>", "Session lifetime in seconds (default 900, cap 86400)")
  .option("--password-file <path>", "Read the vault password from a file")
  .action(cmdVaultUnlock);
cli
  .command("vault:lock", "Revoke the session immediately")
  .action(cmdVaultLock);

cli
  .command("secrets:set <name>", "Store a secret in the vault")
  .option("--value <value>", "Secret value (otherwise prompted or read from stdin)")
  .option("--url <url>", "Associated URL (dashboard, docs, endpoint)")
  .option("--notes <text>", "Free-text notes")
  .option("--remote", "Target the project vault on the server instead of the local vault")
  .option("--project <id>", "Project override (with --remote)")
  .option("--password-file <path>", "Read the vault password from a file")
  .action(cmdSecretsSet);
cli
  .command("secrets:get [name]", "Print a secret's value (interactive picker if omitted)")
  .option("--remote", "Reveal from the project vault on the server (audit-logged)")
  .option("--project <id>", "Project override (with --remote)")
  .option("--password-file <path>", "Read the vault password from a file")
  .action(cmdSecretsGet);
cli
  .command("secrets:list", "List secret names (never values)")
  .option("--remote", "List project vault secrets on the server (metadata only)")
  .option("--project <id>", "Project override (with --remote)")
  .option("--password-file <path>", "Read the vault password from a file")
  .action(cmdSecretsList);
cli
  .command("secrets:rm [name]", "Delete a secret (interactive picker if omitted)")
  .option("--remote", "Delete from the project vault on the server")
  .option("--project <id>", "Project override (with --remote)")
  .option("--password-file <path>", "Read the vault password from a file")
  .option("--yes", "Skip the confirmation prompt")
  .action(cmdSecretsRemove);
cli
  .command("secrets:import <file>", "Import a .env file into the vault")
  .option("--remote", "Import into the project vault on the server")
  .option("--project <id>", "Project override (with --remote)")
  .option("--password-file <path>", "Read the vault password from a file")
  .option("--overwrite", "Replace existing secrets")
  .action(cmdSecretsImport);

cli
  .command("inject", "Run a command with vault secrets in its environment")
  .option("--all", "Inject every vault secret (default when no --env-file)")
  .option("--env-file <path>", "env template; primora://NAME values resolve from the vault")
  .option("--password-file <path>", "Read the vault password from a file")
  .action(cmdInject);

// Agent broker — the child gets dummy tokens; the loopback proxy attaches the
// real secret per grant. One flag per preset takes a vault secret name.
const agentCmd = cli
  .command("agent", "Wrap a command with the credential broker (dummy env, real secret on the wire)")
  .option("--ttl <s>", "Grant lifetime in seconds (default 900, cap 3600)")
  .option("--upstream <name=url>", "Custom Bearer upstream, repeatable (vault key: <NAME>_KEY)")
  .option("--password-file <path>", "Read the vault password from a file");
for (const preset of PRESET_NAMES) {
  agentCmd.option(`--${preset} <name>`, `Grant ${preset} API access from vault secret <name>`);
}
agentCmd.action(cmdAgent);

// Stack — operator surface for the compose deployment in --dir (default cwd).
cli
  .command("stack:up", "docker compose up -d")
  .option("--dir <path>", "Deployment directory (default: cwd)")
  .option("--vault", "Materialize .env from the vault for this run only")
  .option("--force", "Allow --vault to temporarily swap an existing .env")
  .option("--password-file <path>", "Read the vault password from a file")
  .action(cmdStackUp);
cli
  .command("stack:down", "docker compose down")
  .option("--dir <path>", "Deployment directory (default: cwd)")
  .action(cmdStackDown);
cli
  .command("stack:status", "docker compose ps")
  .option("--dir <path>", "Deployment directory (default: cwd)")
  .action(cmdStackStatus);
cli
  .command("stack:logs [service]", "docker compose logs")
  .option("--dir <path>", "Deployment directory (default: cwd)")
  .option("--follow", "Follow log output")
  .option("--tail <n>", "Lines per service (default 200)")
  .action(cmdStackLogs);
cli
  .command("stack:pull", "Pull newer images")
  .option("--dir <path>", "Deployment directory (default: cwd)")
  .action(cmdStackPull);
cli
  .command("stack:backup", "pg_dump the platform database into ./backups")
  .option("--dir <path>", "Deployment directory (default: cwd)")
  .option("--out <path>", "Backup directory (default: <dir>/backups)")
  .action(cmdStackBackup);

cli.help();
cli.version("0.6.0");
cli.example("primora login --url https://primora.example.com");
cli.example("primora vault init");
cli.example("primora secrets import .env");
cli.example("primora secrets list --remote");
cli.example("primora inject --env-file .env -- npm run dev");
cli.example("primora agent --anthropic CLAUDE_KEY -- claude");

// cac only matches the first positional token, so "orgs list" cannot be a
// command name. Fold "group verb" pairs into "group:verb" before parsing —
// `primora orgs list` and `primora orgs:list` both work.
const GROUPS = new Set([
  "orgs",
  "projects",
  "buckets",
  "objects",
  "documents",
  "keys",
  "jobs",
  "audit",
  "vault",
  "secrets",
  "stack",
]);
const argv = process.argv.slice(2);
if (GROUPS.has(argv[0]) && argv[1] && !argv[1].startsWith("-")) {
  argv.splice(0, 2, `${argv[0]}:${argv[1]}`);
} else if (argv[0] === "vault" && !argv[1]) {
  argv[0] = "vault:status";
} else if (argv[0] === "secrets" && !argv[1]) {
  argv[0] = "secrets:list";
}

async function main() {
  try {
    cli.parse([process.argv[0], process.argv[1], ...argv], { run: false });
    await cli.runMatchedCommand();
  } catch (error) {
    fail(error);
  }
}

main();
