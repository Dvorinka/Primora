import { cac } from "cac";

import { cmdLogin, cmdLogout, cmdWhoami } from "./commands/auth.js";
import { cmdAuditList } from "./commands/audit.js";
import { cmdBucketsCreate, cmdBucketsList } from "./commands/buckets.js";
import { cmdContext, cmdUse } from "./commands/context.js";
import { cmdJobsCreate, cmdJobsList, cmdJobsRemove, cmdJobsRun, cmdJobsRuns } from "./commands/jobs.js";
import { cmdKeysCreate, cmdKeysList, cmdKeysRevoke } from "./commands/keys.js";
import {
  cmdObjectsDownload,
  cmdObjectsList,
  cmdObjectsRemove,
  cmdObjectsUpload,
} from "./commands/objects.js";
import { cmdOrgsCreate, cmdOrgsList } from "./commands/orgs.js";
import { cmdProjectsCreate, cmdProjectsList } from "./commands/projects.js";
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
  .command("audit:list", "List audit events for the current project")
  .option("--project <id>", "Project override")
  .option("--q <query>", "Search filter")
  .option("--action <action>", "Filter by action (e.g. object.uploaded)")
  .option("--limit <n>", "Page size (default 50)")
  .option("--offset <n>", "Page offset")
  .option("--follow", "Keep polling for new events (tail mode)")
  .option("--interval <s>", "Poll interval in seconds with --follow (default 2)")
  .action(cmdAuditList);

cli.help();
cli.version("0.4.0");

// cac only matches the first positional token, so "orgs list" cannot be a
// command name. Fold "group verb" pairs into "group:verb" before parsing —
// `primora orgs list` and `primora orgs:list` both work.
const GROUPS = new Set(["orgs", "projects", "buckets", "objects", "keys", "jobs", "audit"]);
const argv = process.argv.slice(2);
if (GROUPS.has(argv[0]) && argv[1] && !argv[1].startsWith("-")) {
  argv.splice(0, 2, `${argv[0]}:${argv[1]}`);
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
