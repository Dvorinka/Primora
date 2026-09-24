import * as p from "@clack/prompts";
import { PlatformService } from "@primora/api-client";

import { loadConfig, saveConfig } from "../config.js";
import { configureClient, requireAuth } from "../http.js";
import { dim, isJson, printJson, success } from "../out.js";

interface UseOptions {
  org?: string;
  project?: string;
}

/** Match an id or slug against a {id, slug, name} record. */
function matchRef<T extends { id: string; slug: string; name: string }>(
  items: T[],
  ref: string,
): T | undefined {
  return items.find((i) => i.id === ref || i.slug === ref || i.name === ref);
}

export async function cmdUse(options: UseOptions): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  // API keys are bound to one org+project — resolve the scope directly.
  if (cfg.auth?.type === "apiKey") {
    const ctx = await PlatformService.getActorContext();
    if (options.org && ctx.organization && options.org !== ctx.organization.id && options.org !== ctx.organization.slug) {
      throw new Error(`API key is scoped to ${ctx.organization.slug} — cannot switch to "${options.org}".`);
    }
    if (options.project && ctx.project && options.project !== ctx.project.id && options.project !== ctx.project.slug) {
      throw new Error(`API key is scoped to ${ctx.project.slug} — cannot switch to "${options.project}".`);
    }
    if (ctx.organization) cfg.organizationId = ctx.organization.id;
    if (ctx.project) cfg.projectId = ctx.project.id;
    saveConfig(cfg);
    success(`Context → ${ctx.organization?.slug ?? "—"} / ${ctx.project?.slug ?? "—"}`);
    return;
  }

  const me = await PlatformService.getMe();
  const orgs = me.organizations;
  if (orgs.length === 0) {
    dim("No organizations yet — create one with `primora orgs create <name>`.");
    return;
  }

  if (options.org) {
    const org = matchRef(orgs, options.org);
    if (!org) throw new Error(`Organization "${options.org}" not found.`);
    cfg.organizationId = org.id;
    if (!org.projects.some((pr) => pr.id === cfg.projectId)) delete cfg.projectId;
  } else if (process.stdin.isTTY) {
    const picked = await p.select({
      message: "Organization",
      options: orgs.map((o) => ({ value: o.id, label: o.name, hint: o.slug })),
      initialValue: cfg.organizationId,
    });
    if (p.isCancel(picked)) return;
    cfg.organizationId = picked;
    if (!orgs.find((o) => o.id === picked)?.projects.some((pr) => pr.id === cfg.projectId)) {
      delete cfg.projectId;
    }
  }

  const org = orgs.find((o) => o.id === cfg.organizationId);
  if (!org) throw new Error("No organization selected.");

  if (options.project) {
    const project = matchRef(org.projects, options.project);
    if (!project) throw new Error(`Project "${options.project}" not found in ${org.name}.`);
    cfg.projectId = project.id;
  } else if (process.stdin.isTTY && org.projects.length > 0) {
    const picked = await p.select({
      message: "Project",
      options: org.projects.map((pr) => ({ value: pr.id, label: pr.name, hint: pr.slug })),
      initialValue: cfg.projectId,
    });
    if (p.isCancel(picked)) {
      saveConfig(cfg);
      return;
    }
    cfg.projectId = picked;
  }

  saveConfig(cfg);
  success(`Context → ${org.slug}${cfg.projectId ? ` / ${org.projects.find((pr) => pr.id === cfg.projectId)?.slug ?? cfg.projectId}` : ""}`);
}

export async function cmdContext(options: { json?: boolean }): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  if (cfg.auth?.type === "apiKey") {
    const ctx = await PlatformService.getActorContext();
    if (isJson(options)) {
      printJson({ baseUrl: cfg.baseUrl, auth: "apiKey", ...ctx });
      return;
    }
    dim(`url      ${cfg.baseUrl}`);
    dim(`auth     api_key (${ctx.key_prefix}…, scopes: ${ctx.scopes?.join(", ") || "none"})`);
    process.stdout.write(`org      ${ctx.organization ? `${ctx.organization.name} (${ctx.organization.slug})` : "—"}\n`);
    process.stdout.write(`project  ${ctx.project ? `${ctx.project.name} (${ctx.project.slug})` : "—"}\n`);
    return;
  }

  const me = await PlatformService.getMe();
  const org = me.organizations.find((o) => o.id === cfg.organizationId);
  const project = org?.projects.find((pr) => pr.id === cfg.projectId);

  if (isJson(options)) {
    printJson({
      baseUrl: cfg.baseUrl,
      auth: cfg.auth?.type ?? null,
      organization: org ?? null,
      project: project ?? null,
    });
    return;
  }

  dim(`url      ${cfg.baseUrl}`);
  dim(`auth     ${cfg.auth?.type ?? "none"}`);
  process.stdout.write(`org      ${org ? `${org.name} (${org.slug})` : "—"}\n`);
  process.stdout.write(`project  ${project ? `${project.name} (${project.slug})` : "—"}\n`);
}
