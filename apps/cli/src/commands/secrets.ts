import { readFileSync } from "node:fs";

import * as p from "@clack/prompts";
import { SecretsService, type ProjectSecret } from "@primora/api-client";

import { loadConfig } from "../config.js";
import { CliError, configureClient, requireAuth, requireProject } from "../http.js";
import { dim, formatDate, isJson, printJson, printTable, success, withSpinner } from "../out.js";
import { saveVault } from "../vault.js";
import { unlockVault, type VaultPasswordOptions } from "./vault.js";

// Env-safe names only: `inject` and `stack --vault` place entries into a child
// environment, so a name that is not a valid env var would fail there anyway.
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

function checkName(name: string): void {
  if (!NAME_RE.test(name)) {
    throw new CliError(
      `Invalid secret name "${name}".`,
      "Use env-var-safe names: [A-Za-z_][A-Za-z0-9_]*",
    );
  }
}

// Remote secrets live in the project's server-side store (AES-256-GCM at rest).
// `--remote` switches every secrets:* verb to it; no vault password is needed.
export interface RemoteOptions {
  remote?: boolean;
  project?: string;
}

function remoteProject(options: RemoteOptions): string {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);
  return requireProject(cfg, options.project);
}

function remoteRow(s: ProjectSecret): string[] {
  return [s.name, s.url || "—", s.notes || "—", formatDate(s.updated_at)];
}

export interface SetOptions extends VaultPasswordOptions, RemoteOptions {
  value?: string;
  url?: string;
  notes?: string;
}

export async function cmdSecretsSet(name: string, options: SetOptions): Promise<void> {
  checkName(name);
  let value = options.value;
  if (value === undefined && !process.stdin.isTTY) {
    value = readFileSync(0, "utf8").replace(/\r?\n$/, "");
  }
  if (value === undefined) {
    const entered = await p.password({ message: `Value for ${name}` });
    if (p.isCancel(entered)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    value = entered;
  }
  if (options.remote) {
    const projectId = remoteProject(options);
    await SecretsService.setProjectSecret({
      projectId,
      name,
      requestBody: { value, url: options.url, notes: options.notes },
    });
    success(`Set ${name} in the project vault`);
    return;
  }
  const vault = await unlockVault(options);
  const now = new Date().toISOString();
  const existing = vault.data.secrets[name];
  vault.data.secrets[name] = {
    value,
    url: options.url ?? existing?.url,
    notes: options.notes ?? existing?.notes,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await withSpinner("Encrypting vault…", async () => saveVault(vault));
  success(`${existing ? "Updated" : "Set"} ${name}`);
}

async function pickRemote(projectId: string, message: string): Promise<string> {
  const { items } = await SecretsService.listProjectSecrets({ projectId });
  if (!items.length) {
    dim("Project vault is empty — `primora secrets set NAME --remote`.");
    process.exit(0);
  }
  const picked = await p.select({
    message,
    options: items.map((s) => ({ value: s.name, label: s.name, hint: s.url || s.notes || undefined })),
  });
  if (p.isCancel(picked)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  return picked;
}

export async function cmdSecretsGet(
  name: string | undefined,
  options: VaultPasswordOptions & RemoteOptions & { json?: boolean },
): Promise<void> {
  if (options.remote) {
    const projectId = remoteProject(options);
    name ??= await pickRemote(projectId, "Secret to reveal");
    const res = await SecretsService.revealProjectSecret({ projectId, name });
    if (isJson(options)) {
      printJson({ name, value: res.value });
      return;
    }
    process.stdout.write(res.value + "\n");
    return;
  }
  const vault = await unlockVault(options);
  if (!name) {
    if (!process.stdin.isTTY) throw new CliError("Usage: primora secrets get <name>");
    const names = Object.keys(vault.data.secrets).sort();
    if (!names.length) {
      dim("Vault is empty — `primora secrets set NAME`.");
      return;
    }
    const picked = await p.select({
      message: "Secret to print",
      options: names.map((n) => ({
        value: n,
        label: n,
        hint: vault.data.secrets[n].url ?? vault.data.secrets[n].notes ?? undefined,
      })),
    });
    if (p.isCancel(picked)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    name = picked;
  }
  const entry = vault.data.secrets[name];
  if (!entry) throw new CliError(`Secret "${name}" not found.`);
  if (isJson(options)) {
    printJson({
      name,
      value: entry.value,
      url: entry.url ?? null,
      notes: entry.notes ?? null,
      created_at: entry.created_at,
      updated_at: entry.updated_at,
    });
    return;
  }
  process.stdout.write(entry.value + "\n");
}

export async function cmdSecretsList(
  options: VaultPasswordOptions & RemoteOptions & { json?: boolean },
): Promise<void> {
  if (options.remote) {
    const projectId = remoteProject(options);
    const { items } = await SecretsService.listProjectSecrets({ projectId });
    if (isJson(options)) {
      printJson(items);
      return;
    }
    if (!items.length) {
      dim("Project vault is empty — `primora secrets set NAME --remote`.");
      return;
    }
    printTable(["NAME", "URL", "NOTES", "UPDATED"], items.map(remoteRow));
    return;
  }
  const vault = await unlockVault(options);
  const rows = Object.entries(vault.data.secrets).sort(([a], [b]) => a.localeCompare(b));
  if (isJson(options)) {
    printJson(
      rows.map(([name, e]) => ({
        name,
        url: e.url ?? null,
        notes: e.notes ?? null,
        created_at: e.created_at,
        updated_at: e.updated_at,
      })),
    );
    return;
  }
  if (!rows.length) {
    dim("Vault is empty — `primora secrets set NAME` or `primora secrets import .env`.");
    return;
  }
  printTable(
    ["NAME", "URL", "UPDATED"],
    rows.map(([name, e]) => [name, e.url ?? "—", formatDate(e.updated_at)]),
  );
}

export async function cmdSecretsRemove(
  name: string | undefined,
  options: VaultPasswordOptions & RemoteOptions & { yes?: boolean },
): Promise<void> {
  if (options.remote) {
    const projectId = remoteProject(options);
    name ??= await pickRemote(projectId, "Secret to delete");
    if (!options.yes && process.stdin.isTTY) {
      const confirmed = await p.confirm({ message: `Delete project secret ${name}?` });
      if (p.isCancel(confirmed) || !confirmed) return;
    }
    await SecretsService.deleteProjectSecret({ projectId, name });
    success(`Deleted ${name}`);
    return;
  }
  const vault = await unlockVault(options);
  if (!name) {
    if (!process.stdin.isTTY) throw new CliError("Usage: primora secrets rm <name>");
    const names = Object.keys(vault.data.secrets).sort();
    if (!names.length) {
      dim("Vault is empty.");
      return;
    }
    const picked = await p.select({
      message: "Secret to delete",
      options: names.map((n) => ({ value: n, label: n })),
    });
    if (p.isCancel(picked)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    name = picked;
  }
  if (!vault.data.secrets[name]) throw new CliError(`Secret "${name}" not found.`);
  if (!options.yes && process.stdin.isTTY) {
    const confirmed = await p.confirm({ message: `Delete secret ${name}?` });
    if (p.isCancel(confirmed) || !confirmed) return;
  }
  delete vault.data.secrets[name];
  await withSpinner("Encrypting vault…", async () => saveVault(vault));
  success(`Deleted ${name}`);
}

/** Parse a .env file: KEY=value lines, optional `export`, quotes stripped. */
export function parseEnvFile(path: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of readFileSync(path, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim().replace(/^export\s+/, "");
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

export async function cmdSecretsImport(
  file: string,
  options: VaultPasswordOptions & RemoteOptions & { overwrite?: boolean },
): Promise<void> {
  const parsed = parseEnvFile(file);
  const entries = Object.entries(parsed).filter(([k]) => NAME_RE.test(k));
  if (!entries.length) throw new CliError(`No valid KEY=value pairs in ${file}.`);

  if (options.remote) {
    const projectId = remoteProject(options);
    const { items } = await SecretsService.listProjectSecrets({ projectId });
    const existing = new Set(items.map((s) => s.name));
    let added = 0;
    let skipped = 0;
    for (const [key, value] of entries) {
      if (existing.has(key) && !options.overwrite) {
        skipped++;
        continue;
      }
      await SecretsService.setProjectSecret({ projectId, name: key, requestBody: { value } });
      added++;
    }
    success(`Imported ${added} secret${added === 1 ? "" : "s"} into the project vault`);
    if (skipped) dim(`Skipped ${skipped} existing (pass --overwrite to replace).`);
    if (entries.length < Object.keys(parsed).length) {
      dim("Skipped keys that are not env-var-safe.");
    }
    return;
  }

  const vault = await unlockVault(options);
  const now = new Date().toISOString();
  let added = 0;
  let skipped = 0;
  for (const [key, value] of entries) {
    const existing = vault.data.secrets[key];
    if (existing && !options.overwrite) {
      skipped++;
      continue;
    }
    vault.data.secrets[key] = {
      value,
      url: existing?.url,
      notes: existing?.notes,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };
    added++;
  }
  await withSpinner("Encrypting vault…", async () => saveVault(vault));
  success(`Imported ${added} secret${added === 1 ? "" : "s"} from ${file}`);
  if (skipped) dim(`Skipped ${skipped} existing (pass --overwrite to replace).`);
  if (entries.length < Object.keys(parsed).length) {
    dim("Skipped keys that are not env-var-safe.");
  }
}
