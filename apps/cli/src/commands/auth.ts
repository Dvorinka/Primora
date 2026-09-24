import * as p from "@clack/prompts";
import { PlatformService } from "@primora/api-client";

import { loadConfig, saveConfig, configFilePath } from "../config.js";
import { configureClient, CliError } from "../http.js";
import { dim, fail, isJson, printJson, printTable, success } from "../out.js";

interface LoginOptions {
  url?: string;
  email?: string;
  password?: string;
  apiKey?: string;
  json?: boolean;
}

function cancel(): never {
  p.cancel("Cancelled.");
  process.exit(0);
}

export async function cmdLogin(options: LoginOptions): Promise<void> {
  const cfg = loadConfig();
  const interactive = process.stdin.isTTY;

  let baseUrl = options.url ?? process.env.PRIMORA_BASE_URL;
  if (!baseUrl) {
    if (!interactive) throw new CliError("--url is required in non-interactive mode.");
    const entered = await p.text({
      message: "Primora URL",
      initialValue: cfg.baseUrl,
      validate: (v) => (/^https?:\/\/.+/.test(v ?? "") ? undefined : "Must be a http(s) URL"),
    });
    if (p.isCancel(entered)) cancel();
    baseUrl = entered;
  }
  cfg.baseUrl = baseUrl.replace(/\/+$/, "");

  if (options.apiKey) {
    if (!/^\w+_\w+_.+/.test(options.apiKey)) {
      throw new CliError("Malformed API key.", "Expected the full key, e.g. prm_xxxx_…");
    }
    cfg.auth = { type: "apiKey", key: options.apiKey };
    // Validate the key against the instance before saving — a stored-but-
    // dead key is a worse failure than a rejected login.
    configureClient(cfg);
    const ctx = await PlatformService.getActorContext();
    if (ctx.organization) cfg.organizationId = ctx.organization.id;
    if (ctx.project) cfg.projectId = ctx.project.id;
    saveConfig(cfg);
    if (isJson(options)) {
      printJson(ctx);
      return;
    }
    success(`API key verified — ${ctx.key_prefix}… (scopes: ${ctx.scopes?.join(", ") || "none"})`);
    if (ctx.organization && ctx.project) {
      success(`Context → ${ctx.organization.slug} / ${ctx.project.slug}`);
    }
    dim(`Config written to ${configFilePath()}`);
    return;
  }

  let email = options.email;
  let password = options.password;
  if (!email || !password) {
    if (!interactive) {
      throw new CliError("--email and --password are required in non-interactive mode.");
    }
    if (!email) {
      const entered = await p.text({ message: "Email" });
      if (p.isCancel(entered)) cancel();
      email = entered;
    }
    if (!password) {
      const entered = await p.password({ message: "Password" });
      if (p.isCancel(entered)) cancel();
      password = entered;
    }
  }

  const res = await fetch(`${cfg.baseUrl}/auth/sign-in/email`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      origin: cfg.baseUrl,
    },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as { message?: string } | undefined;
    throw new CliError(body?.message ?? `Sign-in failed (${res.status}).`);
  }

  const sessionCookie = res.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .find((c) => c.includes("session_token="));
  if (!sessionCookie) {
    throw new CliError("Auth service did not return a session cookie.");
  }
  const eq = sessionCookie.indexOf("=");
  cfg.auth = {
    type: "session",
    cookieName: sessionCookie.slice(0, eq),
    sessionToken: sessionCookie.slice(eq + 1),
  };
  saveConfig(cfg);

  configureClient(cfg);
  const me = await PlatformService.getMe();
  if (isJson(options)) {
    printJson(me);
    return;
  }
  success(`Signed in as ${me.user.email}`);
  dim(`Config written to ${configFilePath()}`);
}

export async function cmdLogout(): Promise<void> {
  const cfg = loadConfig();
  delete cfg.auth;
  saveConfig(cfg);
  success("Signed out — credentials removed.");
}

export async function cmdWhoami(options: { json?: boolean }): Promise<void> {
  const cfg = loadConfig();
  configureClient(cfg);
  if (cfg.auth?.type === "apiKey") {
    const ctx = await PlatformService.getActorContext();
    if (isJson(options)) {
      printJson(ctx);
      return;
    }
    printTable(["KEY", "SCOPES", "ORGANIZATION", "PROJECT"], [
      [
        `${ctx.key_prefix}…`,
        ctx.scopes?.join(", ") || "—",
        ctx.organization?.slug ?? "—",
        ctx.project?.slug ?? "—",
      ],
    ]);
    dim(`\n${cfg.baseUrl} · auth: api_key`);
    return;
  }
  const me = await PlatformService.getMe();

  if (isJson(options)) {
    printJson(me);
    return;
  }

  printTable(["USER", "EMAIL", "VERIFIED"], [
    [me.user.name || "—", me.user.email, me.user.emailVerified ? "yes" : "no"],
  ]);
  process.stdout.write("\n");
  printTable(
    ["ORGANIZATION", "ROLE", "PROJECTS"],
    me.organizations.map((o) => [
      o.name,
      o.membershipRole,
      o.projects.map((pr) => pr.slug).join(", ") || "—",
    ]),
  );
  dim(`\n${cfg.baseUrl} · auth: ${cfg.auth?.type ?? "none"}`);
}
