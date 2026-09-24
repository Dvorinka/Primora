import { OpenAPI, StorageService } from "@primora/api-client";

import type { CliConfig } from "./config.js";

export class CliError extends Error {
  constructor(
    message: string,
    readonly hint?: string,
  ) {
    super(message);
  }
}

async function mintSessionToken(cfg: CliConfig): Promise<string> {
  if (cfg.auth?.type !== "session") throw new CliError("No session stored.");
  const res = await fetch(`${cfg.baseUrl}/auth/token`, {
    headers: {
      accept: "application/json",
      cookie: `${cfg.auth.cookieName}=${cfg.auth.sessionToken}`,
    },
  });
  if (res.status === 401 || res.status === 403) {
    throw new CliError("Session expired.", "Run `primora login` again.");
  }
  if (!res.ok) {
    throw new CliError(`Failed to mint API token (${res.status}).`);
  }
  return ((await res.json()) as { token: string }).token;
}

/** Auth headers matching the backend's ResolveActor: Bearer JWT or X-API-Key. */
export async function authHeaders(cfg: CliConfig): Promise<Record<string, string>> {
  if (cfg.auth?.type === "apiKey") return { "X-API-Key": cfg.auth.key };
  if (cfg.auth?.type === "session") {
    return { Authorization: `Bearer ${await mintSessionToken(cfg)}` };
  }
  return {};
}

/** Raw request against the API — for binary endpoints the generated client
 *  can't serve (it decodes every non-JSON response as text). */
export async function apiFetch(cfg: CliConfig, path: string): Promise<Response> {
  const res = await fetch(`${cfg.baseUrl}/api/v1${path}`, {
    headers: await authHeaders(cfg),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as
      | { error?: { message?: string } }
      | undefined;
    throw new CliError(
      body?.error?.message ?? `Request failed (${res.status})`,
      res.status === 401 ? "Check auth — run `primora login`." : undefined,
    );
  }
  return res;
}

/** Wire the generated OpenAPI client to the saved config. */
export function configureClient(cfg: CliConfig): void {
  OpenAPI.BASE = `${cfg.baseUrl}/api/v1`;
  OpenAPI.HEADERS = undefined;
  OpenAPI.TOKEN = undefined;
  // encodeURI leaves ?#& intact in path params — smuggles query segments.
  OpenAPI.ENCODE_PATH = encodeURIComponent;

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
  }
}

export function requireAuth(cfg: CliConfig): void {
  if (!cfg.auth) {
    throw new CliError("Not authenticated.", "Run `primora login` or set PRIMORA_API_KEY.");
  }
}

export function requireOrg(cfg: CliConfig, override?: string): string {
  const id = override ?? cfg.organizationId;
  if (!id) {
    throw new CliError("No organization selected.", "Run `primora use --org <id>` or pass --org.");
  }
  return id;
}

export function requireProject(cfg: CliConfig, override?: string): string {
  const id = override ?? cfg.projectId;
  if (!id) {
    throw new CliError("No project selected.", "Run `primora use --project <id>` or pass --project.");
  }
  return id;
}

/** Resolve a bucket reference that may be an id or a slug. */
export async function resolveBucketId(projectId: string, ref: string): Promise<string> {
  const { items } = await StorageService.listBuckets({ projectId });
  const match = items.find((b) => b.id === ref || b.slug === ref || b.name === ref);
  if (!match) {
    throw new CliError(
      `Bucket "${ref}" not found.`,
      `Known buckets: ${items.map((b) => b.slug).join(", ") || "(none)"}`,
    );
  }
  return match.id;
}
