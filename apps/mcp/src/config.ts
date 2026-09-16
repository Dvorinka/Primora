import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { OpenAPI } from "@primora/api-client";

export interface McpConfig {
  baseUrl: string;
  auth?:
    | { type: "session"; cookieName: string; sessionToken: string }
    | { type: "apiKey"; key: string };
  organizationId?: string;
  projectId?: string;
}

/** Shares the CLI's config file — `primora login` once, both tools work. */
export function loadConfig(): McpConfig {
  const dir =
    process.env.PRIMORA_CONFIG_DIR ??
    join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "primora");
  const cfg: McpConfig = { baseUrl: "http://localhost" };
  try {
    const path = join(dir, "config.json");
    if (existsSync(path)) {
      Object.assign(cfg, JSON.parse(readFileSync(path, "utf8")) as Partial<McpConfig>);
    }
  } catch {
    // unreadable config — env vars may still provide credentials
  }
  if (process.env.PRIMORA_BASE_URL) cfg.baseUrl = process.env.PRIMORA_BASE_URL;
  if (process.env.PRIMORA_API_KEY) cfg.auth = { type: "apiKey", key: process.env.PRIMORA_API_KEY };
  if (process.env.PRIMORA_ORG) cfg.organizationId = process.env.PRIMORA_ORG;
  if (process.env.PRIMORA_PROJECT) cfg.projectId = process.env.PRIMORA_PROJECT;
  cfg.baseUrl = cfg.baseUrl.replace(/\/+$/, "");
  return cfg;
}

async function mintSessionToken(cfg: McpConfig): Promise<string> {
  if (cfg.auth?.type !== "session") throw new Error("no session stored");
  const res = await fetch(`${cfg.baseUrl}/auth/token`, {
    headers: {
      accept: "application/json",
      cookie: `${cfg.auth.cookieName}=${cfg.auth.sessionToken}`,
    },
  });
  if (!res.ok) throw new Error(`token mint failed (${res.status}) — run \`primora login\` again`);
  return ((await res.json()) as { token: string }).token;
}

export function configureClient(cfg: McpConfig): void {
  OpenAPI.BASE = `${cfg.baseUrl}/api/v1`;
  if (cfg.auth?.type === "apiKey") {
    OpenAPI.HEADERS = { "X-API-Key": cfg.auth.key };
    return;
  }
  if (cfg.auth?.type === "session") {
    let cached: string | undefined;
    OpenAPI.TOKEN = async () => {
      cached ??= await mintSessionToken(cfg);
      return cached;
    };
    return;
  }
  throw new Error("no credentials — run `primora login` or set PRIMORA_API_KEY");
}
