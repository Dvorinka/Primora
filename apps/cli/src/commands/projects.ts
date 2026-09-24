import { ProjectsService } from "@primora/api-client";

import { loadConfig } from "../config.js";
import { configureClient, requireAuth, requireOrg } from "../http.js";
import { isJson, printJson, printTable, success } from "../out.js";

interface ListOptions {
  org?: string;
  q?: string;
  json?: boolean;
}

export async function cmdProjectsList(options: ListOptions): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const organizationId = requireOrg(cfg, options.org);
  const { items } = await ProjectsService.listProjects({
    organizationId,
    q: options.q || undefined,
  });
  if (isJson(options)) {
    printJson(items);
    return;
  }
  printTable(
    ["ID", "SLUG", "NAME", "ROLE"],
    items.map((pr) => [pr.id, pr.slug, pr.name, pr.membership_role ?? "—"]),
  );
}

export async function cmdProjectsCreate(
  name: string,
  options: { org?: string; slug?: string; description?: string; json?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const organizationId = requireOrg(cfg, options.org);
  const slug = options.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const project = await ProjectsService.createProject({
    organizationId,
    requestBody: { name, slug, description: options.description },
  });
  if (isJson(options)) {
    printJson(project);
    return;
  }
  success(`Project "${project.name}" created (${project.slug})`);
}

export async function cmdProjectsRemove(
  projectRef: string,
  options: { org?: string; yes?: boolean; json?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  let projectId = projectRef;
  if (!isUuid(projectRef)) {
    const me = await PlatformService.getMe();
    const orgs = cfg.auth?.type === "apiKey" ? [] : me.organizations;
    const found = orgs
      .flatMap((o) => o.projects.map((pr) => ({ ...pr, orgId: o.id })))
      .find((pr) => pr.id === projectRef || pr.slug === projectRef || pr.name === projectRef);
    if (!found) throw new Error(`Project "${projectRef}" not found — pass its id directly.`);
    projectId = found.id;
  }
  await confirmOrAbort(`Delete project "${projectRef}"? Buckets, secrets, and functions go with it.`, options.yes);
  await ProjectsService.deleteProject({ projectId });
  if (isJson(options)) {
    printJson({ deleted: projectId });
  } else {
    success(`deleted project ${projectRef}`);
  }
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
