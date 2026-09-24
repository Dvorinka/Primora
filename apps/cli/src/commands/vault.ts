import * as p from "@clack/prompts";

import pc from "picocolors";

import { CliError } from "../http.js";
import { dim, isJson, printJson, success, withSpinner } from "../out.js";
import {
  clearSession,
  createVault,
  loadSessionKey,
  openVault,
  openVaultWithKey,
  saveSessionKey,
  sessionExpiry,
  vaultExists,
  vaultHeader,
  vaultPath,
  type OpenVault,
} from "../vault.js";

export interface VaultPasswordOptions {
  passwordFile?: string;
}

async function promptPassword(confirm: boolean): Promise<Uint8Array> {
  const entered = await p.password({ message: "Vault password" });
  if (p.isCancel(entered)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  if (confirm) {
    const again = await p.password({ message: "Confirm vault password" });
    if (p.isCancel(again)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    if (again !== entered) throw new CliError("Passwords do not match.");
  }
  return new TextEncoder().encode(entered);
}

async function readPassword(options: VaultPasswordOptions): Promise<Uint8Array | undefined> {
  const env = process.env.PRIMORA_VAULT_PASSWORD;
  if (env) return new TextEncoder().encode(env);
  if (options.passwordFile) {
    const { readFileSync } = await import("node:fs");
    const pw = readFileSync(options.passwordFile, "utf8").replace(/\r?\n$/, "");
    return new TextEncoder().encode(pw);
  }
  return undefined;
}

/**
 * Open the vault: live session key → PRIMORA_VAULT_PASSWORD → --password-file →
 * hidden prompt. The session is how agents and scripts use the vault without
 * ever seeing the password; everything else still proves the password.
 */
export async function unlockVault(options: VaultPasswordOptions): Promise<OpenVault> {
  const session = loadSessionKey();
  if (session) return openVaultWithKey(session);

  const password = await readPassword(options);
  if (password) return withSpinner("Unlocking vault…", async () => openVault(password));

  if (!process.stdin.isTTY) {
    throw new CliError(
      "Vault is locked.",
      "Run `primora vault unlock`, or set PRIMORA_VAULT_PASSWORD / pass --password-file.",
    );
  }
  const prompted = await promptPassword(false);
  return withSpinner("Unlocking vault…", async () => openVault(prompted));
}

export async function cmdVaultInit(options: VaultPasswordOptions): Promise<void> {
  let password = await readPassword(options);
  if (!password) {
    if (!process.stdin.isTTY) {
      throw new CliError(
        "Vault password required.",
        "Set PRIMORA_VAULT_PASSWORD or pass --password-file in non-interactive mode.",
      );
    }
    password = await promptPassword(true);
  }
  await withSpinner("Creating vault…", async () => createVault(password));
  success(`Vault created at ${vaultPath()}`);
  dim("Secrets are encrypted with Argon2id + XChaCha20-Poly1305. The password is not recoverable.");
}

export async function cmdVaultUnlock(
  options: VaultPasswordOptions & { ttl?: string },
): Promise<void> {
  const session = loadSessionKey();
  if (session) {
    const exp = sessionExpiry();
    dim(`Already unlocked — expires ${exp ? new Date(exp * 1000).toISOString() : "soon"}.`);
    return;
  }
  const password =
    (await readPassword(options)) ??
    (process.stdin.isTTY
      ? await promptPassword(false)
      : (() => {
          throw new CliError(
            "Vault password required.",
            "Set PRIMORA_VAULT_PASSWORD or pass --password-file.",
          );
        })());
  const vault = await withSpinner("Unlocking vault…", async () => openVault(password)); // proves the password before stashing the key
  const ttl = saveSessionKey(vault.key, Number(options.ttl ?? 900));
  success(`Vault unlocked for ${ttl}s — secrets usable without the password until expiry.`);
  dim("`primora vault lock` revokes immediately.");
}

export async function cmdVaultLock(): Promise<void> {
  if (clearSession()) success("Vault locked — session revoked.");
  else dim("No active session.");
}

export async function cmdVaultStatus(options: { json?: boolean }): Promise<void> {
  const exists = vaultExists();
  const header = exists ? vaultHeader() : undefined;
  const exp = sessionExpiry();
  const unlocked = exp !== undefined;
  let count: number | undefined;
  if (unlocked) {
    try {
      count = Object.keys(openVaultWithKey(loadSessionKey()!).data.secrets).length;
    } catch {
      // session key no longer matches (vault re-created) — report locked
    }
  }
  if (isJson(options)) {
    printJson({
      path: vaultPath(),
      exists,
      unlocked,
      expires_at: exp ?? null,
      secrets: count ?? null,
      kdf: header ?? null,
    });
    return;
  }
  if (!exists) {
    dim(`No vault at ${vaultPath()} — run \`primora vault init\`.`);
    return;
  }
  const remaining = exp ? Math.max(0, exp - Math.floor(Date.now() / 1000)) : 0;
  const mins = Math.floor(remaining / 60);
  const state = unlocked
    ? pc.green("● unlocked") +
      pc.dim(` — ${mins ? `${mins}m ` : ""}${remaining % 60}s remaining`)
    : pc.dim("● locked");
  process.stdout.write(`vault  ${state}\n\n`);
  const rows: [string, string][] = [
    ["path", vaultPath()],
    ["kdf", `argon2id · ${header!.m} KiB · ${header!.t} passes · ${header!.p} lanes`],
  ];
  if (unlocked) rows.push(["secrets", String(count ?? "?")]);
  const width = Math.max(...rows.map(([k]) => k.length));
  for (const [k, v] of rows) {
    process.stdout.write(`${pc.dim(k.padEnd(width))}  ${v}\n`);
  }
  if (!unlocked) dim(`\n\`primora vault unlock\` opens a session for agents and scripts.`);
}
