import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type AuthConfig =
  | { type: "session"; cookieName: string; sessionToken: string }
  | { type: "apiKey"; key: string };

export interface CliConfig {
  baseUrl: string;
  auth?: AuthConfig;
  organizationId?: string;
  projectId?: string;
}

const configDir =
  process.env.PRIMORA_CONFIG_DIR ??
  join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "primora");
const configPath = join(configDir, "config.json");

export function configFilePath(): string {
  return configPath;
}

export function loadConfig(): CliConfig {
  const cfg: CliConfig = { baseUrl: "http://localhost" };
  try {
    if (existsSync(configPath)) {
      Object.assign(cfg, JSON.parse(readFileSync(configPath, "utf8")) as Partial<CliConfig>);
    }
  } catch {
    // corrupt config — start from defaults rather than crashing every command
  }
  if (process.env.PRIMORA_BASE_URL) cfg.baseUrl = process.env.PRIMORA_BASE_URL;
  if (process.env.PRIMORA_API_KEY) cfg.auth = { type: "apiKey", key: process.env.PRIMORA_API_KEY };
  if (process.env.PRIMORA_ORG) cfg.organizationId = process.env.PRIMORA_ORG;
  if (process.env.PRIMORA_PROJECT) cfg.projectId = process.env.PRIMORA_PROJECT;
  cfg.baseUrl = cfg.baseUrl.replace(/\/+$/, "");
  return cfg;
}

export function saveConfig(cfg: CliConfig): void {
  mkdirSync(configDir, { recursive: true });
  writeFileSync(configPath, JSON.stringify(cfg, null, 2) + "\n");
  chmodSync(configPath, 0o600);
}
