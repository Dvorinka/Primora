import * as p from "@clack/prompts";
import { ProjectsService } from "@primora/api-client";

import { loadConfig } from "../config.js";
import { configureClient, requireAuth, requireProject } from "../http.js";
import { dim, formatDate, isJson, printJson, printTable, success } from "../out.js";

export async function cmdKeysList(options: { project?: string; json?: boolean }): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const projectId = requireProject(cfg, options.project);
  const { items } = await ProjectsService.listApiKeys({ projectId });
  if (isJson(options)) {
    printJson(items);
    return;
  }
  printTable(
    ["ID", "PREFIX", "NAME", "LAST USED", "STATUS"],
    items.map((k) => [
      k.id,
      k.prefix,
      k.name,
      formatDate(k.last_used_at),
      k.revoked_at ? "revoked" : "active",
    ]),
  );
}

export async function cmdKeysCreate(
  name: string,
  options: { project?: string; json?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const projectId = requireProject(cfg, options.project);
  const key = await ProjectsService.createApiKey({ projectId, requestBody: { name } });
  if (isJson(options)) {
    printJson(key);
    return;
  }
  success(`API key "${key.name}" created (${key.prefix})`);
  process.stdout.write(`${key.secret}\n`);
  dim("Store it now — the secret is shown once.");
}

export async function cmdKeysRevoke(
  apiKeyId: string,
  options: { project?: string; yes?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const projectId = requireProject(cfg, options.project);
  if (!options.yes && process.stdin.isTTY) {
    const confirmed = await p.confirm({ message: `Revoke API key ${apiKeyId}?` });
    if (p.isCancel(confirmed) || !confirmed) return;
  }
  await ProjectsService.revokeApiKey({ projectId, apiKeyId });
  success(`Revoked ${apiKeyId}`);
}
