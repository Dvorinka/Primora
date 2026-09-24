import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import { CliError } from "../http.js";
import { dim, success } from "../out.js";
import { vaultAsEnvFile } from "./inject.js";
import { parseEnvFile } from "./secrets.js";
import type { VaultPasswordOptions } from "./vault.js";

interface StackOptions extends VaultPasswordOptions {
  dir?: string;
}

function projectDir(options: StackOptions): string {
  const dir = options.dir ?? process.cwd();
  for (const name of ["docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml"]) {
    if (existsSync(join(dir, name))) return dir;
  }
  throw new CliError(
    `No compose file in ${dir}.`,
    "Run from a Primora deployment directory or pass --dir.",
  );
}

function compose(dir: string, args: string[], env?: NodeJS.ProcessEnv): number {
  const res = spawnSync("docker", ["compose", ...args], {
    cwd: dir,
    stdio: "inherit",
    env: env ?? process.env,
  });
  if (res.error) {
    throw new CliError(
      `Failed to run docker compose: ${res.error.message}`,
      "Docker with the Compose plugin is required.",
    );
  }
  return res.status ?? 1;
}

export async function cmdStackUp(
  options: StackOptions & { vault?: boolean; force?: boolean; detach?: boolean },
): Promise<void> {
  const dir = projectDir(options);
  const envPath = join(dir, ".env");

  if (!options.vault) {
    const code = compose(dir, ["up", "-d"]);
    if (code !== 0) process.exit(code);
    success("Stack is up.");
    return;
  }

  // Vault mode: materialize .env for the duration of compose, then remove it.
  // `env_file:` directives make compose require the file on disk — there is no
  // flag to feed it via the process environment alone.
  const secrets = await vaultAsEnvFile(options);
  const hadEnv = existsSync(envPath);
  if (hadEnv && !options.force) {
    throw new CliError(
      `${envPath} already exists.`,
      "Import it (`primora secrets import .env --overwrite`), remove it, or pass --force to swap it for the vault during this run.",
    );
  }
  const prior = hadEnv ? readFileSync(envPath) : undefined;
  // compose env_file parsing is literal — write raw KEY=value lines.
  const lines = Object.entries(secrets).map(([k, v]) => {
    if (v.includes("\n")) throw new CliError(`Secret ${k} contains a newline — cannot be an env var.`);
    return `${k}=${v}`;
  });
  try {
    writeFileSync(envPath, lines.join("\n") + "\n", { mode: 0o600 });
    const code = compose(dir, ["up", "-d"]);
    if (code !== 0) process.exit(code);
    success("Stack is up — .env restored/removed; secrets live in the vault only.");
  } finally {
    if (prior) writeFileSync(envPath, prior, { mode: 0o600 });
    else if (existsSync(envPath)) unlinkSync(envPath);
  }
}

export async function cmdStackDown(options: StackOptions): Promise<void> {
  const dir = projectDir(options);
  const code = compose(dir, ["down"]);
  if (code !== 0) process.exit(code);
  success("Stack stopped.");
}

export async function cmdStackStatus(options: StackOptions): Promise<void> {
  const code = compose(projectDir(options), ["ps"]);
  if (code !== 0) process.exit(code);
}

export async function cmdStackLogs(
  service: string | undefined,
  options: StackOptions & { follow?: boolean; tail?: string },
): Promise<void> {
  const args = ["logs", "--tail", options.tail ?? "200"];
  if (options.follow) args.push("--follow");
  if (service) args.push(service);
  const code = compose(projectDir(options), args);
  if (code !== 0) process.exit(code);
}

export async function cmdStackPull(options: StackOptions): Promise<void> {
  const dir = projectDir(options);
  const code = compose(dir, ["pull"]);
  if (code !== 0) process.exit(code);
  success("Images updated — run `primora stack up` to apply.");
}

/** Postgres dump via `compose exec`; for a full backup (DB + storage volume)
 *  use scripts/backup.sh — it covers both. ponytail: no storage tar here. */
export async function cmdStackBackup(
  options: StackOptions & { out?: string },
): Promise<void> {
  const dir = projectDir(options);
  const envFile = join(dir, ".env");
  const env = existsSync(envFile) ? parseEnvFile(envFile) : {};
  const user = env.POSTGRES_USER ?? "primora";
  const db = env.POSTGRES_DB ?? "primora";

  const outDir = options.out ?? join(dir, "backups");
  mkdirSync(outDir, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outPath = join(outDir, `primora-${stamp}.dump`);

  const res = spawnSync(
    "docker",
    ["compose", "exec", "-T", "postgres", "pg_dump", "-U", user, "-Fc", db],
    { cwd: dir, encoding: "buffer", maxBuffer: 1024 * 1024 * 1024 },
  );
  if (res.error || res.status !== 0) {
    throw new CliError(
      `pg_dump failed: ${res.error?.message ?? res.stderr?.toString().slice(0, 300) ?? `exit ${res.status}`}`,
      "Is the stack running? `primora stack status`",
    );
  }
  writeFileSync(outPath, res.stdout as Buffer, { mode: 0o600 });
  success(`Backup written to ${outPath}`);
  dim("Postgres only — scripts/backup.sh also archives the storage volume.");
}
