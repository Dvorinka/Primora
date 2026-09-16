import type { AuditLog } from "@primora/api-client";
import { ProjectsService } from "@primora/api-client";
import pc from "picocolors";

import { loadConfig } from "../config.js";
import { configureClient, requireAuth, requireProject } from "../http.js";
import { formatDate, isJson, printJson, printTable } from "../out.js";

interface AuditOptions {
  project?: string;
  q?: string;
  action?: string;
  limit?: string;
  offset?: string;
  follow?: boolean;
  interval?: string;
  json?: boolean;
}

function row(log: AuditLog): string[] {
  return [
    formatDate(log.created_at),
    log.action,
    `${log.resource_type} ${log.resource_id}`,
    log.request_id,
  ];
}

export async function cmdAuditList(options: AuditOptions): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const projectId = requireProject(cfg, options.project);
  const query = {
    projectId,
    q: options.q || undefined,
    action: options.action || undefined,
    limit: options.limit ? Number(options.limit) : 50,
    offset: options.offset ? Number(options.offset) : undefined,
  };

  const page = await ProjectsService.listAuditLogs(query);
  if (isJson(options)) {
    printJson(page);
  } else {
    printTable(["TIME", "ACTION", "RESOURCE", "REQUEST"], page.items.map(row));
  }

  if (!options.follow) return;

  // tail mode: poll and print newly seen ids
  const seen = new Set(page.items.map((i) => i.id));
  const interval = Math.max(1, Number(options.interval ?? 2)) * 1000;
  for (;;) {
    await new Promise((r) => setTimeout(r, interval));
    const next = await ProjectsService.listAuditLogs({ ...query, offset: undefined });
    const fresh = next.items.filter((i) => !seen.has(i.id));
    for (const id of fresh.map((i) => i.id)) seen.add(id);
    for (const log of fresh.reverse()) {
      if (isJson(options)) {
        process.stdout.write(JSON.stringify(log) + "\n");
      } else {
        const [time, action, resource, request] = row(log);
        process.stdout.write(`${pc.dim(time)}  ${action}  ${resource}  ${pc.dim(request)}\n`);
      }
    }
  }
}
