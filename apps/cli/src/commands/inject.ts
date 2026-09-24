import { spawnSync } from "node:child_process";

import { CliError } from "../http.js";
import { dim } from "../out.js";
import { parseEnvFile } from "./secrets.js";
import { unlockVault, type VaultPasswordOptions } from "./vault.js";

const REF_RE = /^primora:\/\/(.+)$/;

/**
 * `primora inject [--all] [--env-file PATH] -- <cmd>` — run one child process
 * with vault secrets in its environment. Nothing written to disk, nothing in
 * argv; the parent shell is unchanged. `primora://NAME` values inside the
 * env-file resolve against the vault; literals stay literals.
 */
export async function cmdInject(
  options: VaultPasswordOptions & { all?: boolean; envFile?: string },
): Promise<void> {
  // cac does not model `--` passthrough — slice it out of argv directly.
  const sep = process.argv.indexOf("--");
  const child = sep >= 0 ? process.argv.slice(sep + 1) : [];
  if (!child.length) {
    throw new CliError("No command given.", "Usage: primora inject [--all] [--env-file .env] -- <cmd>");
  }

  const vault = await unlockVault(options);
  const env: Record<string, string> = {};

  // Default: whole vault. --all exists for readability when --env-file is also used.
  if (options.all || !options.envFile) {
    for (const [k, e] of Object.entries(vault.data.secrets)) env[k] = e.value;
  }
  if (options.envFile) {
    for (const [key, raw] of Object.entries(parseEnvFile(options.envFile))) {
      const ref = REF_RE.exec(raw);
      if (!ref) {
        env[key] = raw;
        continue;
      }
      const entry = vault.data.secrets[ref[1]];
      if (!entry) throw new CliError(`Unresolved ref: primora://${ref[1]} in ${options.envFile}`);
      env[key] = entry.value;
    }
  }

  dim(`injecting ${Object.keys(env).length} var${Object.keys(env).length === 1 ? "" : "s"} → ${child[0]}`);
  const res = spawnSync(child[0], child.slice(1), {
    env: { ...process.env, ...env } as NodeJS.ProcessEnv,
    stdio: "inherit",
  });
  if (res.error) throw new CliError(`Failed to start ${child[0]}: ${res.error.message}`);
  process.exit(res.status ?? 1);
}

/** Used by `stack up --vault`: render all vault entries as .env lines. */
export async function vaultAsEnvFile(
  options: VaultPasswordOptions,
): Promise<Record<string, string>> {
  const vault = await unlockVault(options);
  return Object.fromEntries(Object.entries(vault.data.secrets).map(([k, e]) => [k, e.value]));
}
