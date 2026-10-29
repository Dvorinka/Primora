import { readFileSync } from "node:fs";

import * as p from "@clack/prompts";
import { SecretsService, type ProjectLogin } from "@primora/api-client";

import { loadConfig } from "../config.js";
import { CliError, configureClient, requireAuth, requireProject } from "../http.js";
import { confirmOrAbort, dim, formatDate, isJson, printJson, printTable, success, withSpinner } from "../out.js";
import { saveVault, type LoginEntry } from "../vault.js";
import { APP_RE } from "../login-id.js";
import { unlockVault, type VaultPasswordOptions } from "./vault.js";
import { type RemoteOptions } from "./secrets.js";

export { APP_RE };

export function checkApp(app: string): void {
  if (!APP_RE.test(app)) {
    throw new CliError(
      `Invalid app id "${app}".`,
      "Use a stable name like my-app or stripe.dashboard - not a URL or a port.",
    );
  }
}

function remoteProject(options: RemoteOptions): string {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);
  return requireProject(cfg, options.project);
}

function loginsOf(vault: { data: { logins?: Record<string, LoginEntry> } }): Record<string, LoginEntry> {
  vault.data.logins ??= {};
  return vault.data.logins;
}

export interface LoginSetOptions extends VaultPasswordOptions, RemoteOptions {
  username?: string;
  password?: string;
  origin?: string;
  notes?: string;
}

export async function cmdLoginsSet(app: string, options: LoginSetOptions): Promise<void> {
  checkApp(app);
  let username = options.username?.trim();
  let password = options.password;
  if (password === undefined && !process.stdin.isTTY) {
    password = readFileSync(0, "utf8").replace(/\r?\n$/, "");
  }
  if (!username || password === undefined) {
    if (!process.stdin.isTTY) {
      throw new CliError("Usage: primora logins set <app> --username <user> --password <password>");
    }
  }
  if (!username) {
    const entered = await p.text({ message: "Username" });
    if (p.isCancel(entered)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    username = entered.trim();
  }
  if (!username) throw new CliError("Username is required.");
  if (password === undefined) {
    const entered = await p.password({ message: `Password for ${username}` });
    if (p.isCancel(entered)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    password = entered;
  }
  if (!password) throw new CliError("Password is required.");

  if (options.remote) {
    const projectId = remoteProject(options);
    await SecretsService.setProjectLogin({
      projectId,
      app,
      requestBody: {
        username,
        password,
        origin: options.origin,
        notes: options.notes,
      },
    });
    success(`Stored login ${app} in the project vault`);
    return;
  }

  const vault = await unlockVault(options);
  const now = new Date().toISOString();
  const logins = loginsOf(vault);
  const existing = logins[app];
  logins[app] = {
    username,
    password,
    origin: options.origin ?? existing?.origin,
    notes: options.notes ?? existing?.notes,
    created_at: existing?.created_at ?? now,
    updated_at: now,
  };
  await withSpinner("Encrypting vault…", async () => saveVault(vault));
  success(`${existing ? "Updated" : "Stored"} login ${app}`);
}

async function pickRemote(projectId: string, message: string): Promise<string> {
  const { items } = await SecretsService.listProjectLogins({ projectId });
  if (!items.length) {
    dim("No project logins — `primora logins set <app> --remote`.");
    process.exit(0);
  }
  const picked = await p.select({
    message,
    options: items.map((s) => ({
      value: s.app,
      label: s.app,
      hint: s.username + (s.origin ? ` · ${s.origin}` : ""),
    })),
  });
  if (p.isCancel(picked)) {
    p.cancel("Cancelled.");
    process.exit(0);
  }
  return picked;
}

function localPublic(app: string, entry: LoginEntry) {
  return {
    app,
    username: entry.username,
    origin: entry.origin ?? "",
    notes: entry.notes ?? "",
    created_at: entry.created_at,
    updated_at: entry.updated_at,
  };
}

export async function cmdLoginsGet(
  app: string | undefined,
  options: VaultPasswordOptions & RemoteOptions & { json?: boolean },
): Promise<void> {
  if (options.remote) {
    const projectId = remoteProject(options);
    app ??= await pickRemote(projectId, "Login to reveal");
    checkApp(app);
    const res = await SecretsService.revealProjectLogin({ projectId, app });
    emitLogin(res, isJson(options));
    return;
  }
  const vault = await unlockVault(options);
  const logins = loginsOf(vault);
  if (!app) {
    if (!process.stdin.isTTY) throw new CliError("Usage: primora logins get <app>");
    const names = Object.keys(logins).sort();
    if (!names.length) {
      dim("No logins — `primora logins set <app>`.");
      return;
    }
    const picked = await p.select({
      message: "Login to reveal",
      options: names.map((n) => ({ value: n, label: n, hint: logins[n].username })),
    });
    if (p.isCancel(picked)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    app = picked;
  }
  checkApp(app);
  const entry = logins[app];
  if (!entry) throw new CliError(`Login "${app}" not found.`);
  emitLogin(
    {
      app,
      username: entry.username,
      password: entry.password,
      origin: entry.origin ?? "",
    },
    isJson(options),
  );
}

function emitLogin(
  row: { app: string; username: string; password: string; origin: string },
  json: boolean,
): void {
  if (json) {
    printJson(row);
    return;
  }
  process.stdout.write(`app: ${row.app}\nusername: ${row.username}\norigin: ${row.origin || "—"}\n${row.password}\n`);
}

export async function cmdLoginsList(
  options: VaultPasswordOptions & RemoteOptions & { json?: boolean },
): Promise<void> {
  if (options.remote) {
    const projectId = remoteProject(options);
    const { items } = await SecretsService.listProjectLogins({ projectId });
    if (isJson(options)) {
      printJson(items);
      return;
    }
    if (!items.length) {
      dim("No project logins — `primora logins set <app> --remote`.");
      return;
    }
    printTable(["APP", "USERNAME", "ORIGIN", "UPDATED"], items.map(remoteRow));
    return;
  }
  const vault = await unlockVault(options);
  const rows = Object.entries(loginsOf(vault)).sort(([a], [b]) => a.localeCompare(b));
  if (isJson(options)) {
    printJson(rows.map(([app, e]) => localPublic(app, e)));
    return;
  }
  if (!rows.length) {
    dim("No logins — `primora logins set <app>`.");
    return;
  }
  printTable(
    ["APP", "USERNAME", "ORIGIN", "UPDATED"],
    rows.map(([app, e]) => [app, e.username, e.origin ?? "—", formatDate(e.updated_at)]),
  );
}

function remoteRow(s: ProjectLogin): string[] {
  return [s.app, s.username, s.origin || "—", formatDate(s.updated_at)];
}

export async function cmdLoginsRemove(
  app: string | undefined,
  options: VaultPasswordOptions & RemoteOptions & { yes?: boolean },
): Promise<void> {
  if (options.remote) {
    const projectId = remoteProject(options);
    app ??= await pickRemote(projectId, "Login to delete");
    checkApp(app);
    await confirmOrAbort(`Delete project login ${app}?`, options.yes);
    await SecretsService.deleteProjectLogin({ projectId, app });
    success(`Deleted login ${app}`);
    return;
  }
  const vault = await unlockVault(options);
  const logins = loginsOf(vault);
  if (!app) {
    if (!process.stdin.isTTY) throw new CliError("Usage: primora logins rm <app>");
    const names = Object.keys(logins).sort();
    if (!names.length) {
      dim("No logins.");
      return;
    }
    const picked = await p.select({
      message: "Login to delete",
      options: names.map((n) => ({ value: n, label: n })),
    });
    if (p.isCancel(picked)) {
      p.cancel("Cancelled.");
      process.exit(0);
    }
    app = picked;
  }
  checkApp(app);
  if (!logins[app]) throw new CliError(`Login "${app}" not found.`);
  await confirmOrAbort(`Delete login ${app}?`, options.yes);
  delete logins[app];
  await withSpinner("Encrypting vault…", async () => saveVault(vault));
  success(`Deleted login ${app}`);
}
