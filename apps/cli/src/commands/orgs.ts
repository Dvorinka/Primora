import { OrganizationsService, PlatformService } from "@primora/api-client";

import { loadConfig } from "../config.js";
import { configureClient, requireAuth } from "../http.js";
import { isJson, printJson, printTable, success } from "../out.js";

export async function cmdOrgsList(options: { json?: boolean }): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const me = await PlatformService.getMe();
  if (isJson(options)) {
    printJson(me.organizations);
    return;
  }
  printTable(
    ["ID", "SLUG", "NAME", "ROLE"],
    me.organizations.map((o) => [o.id, o.slug, o.name, o.membershipRole]),
  );
}

export async function cmdOrgsCreate(
  name: string,
  options: { slug?: string; json?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const slug = options.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const org = await OrganizationsService.createOrganization({
    requestBody: { name, slug },
  });
  if (isJson(options)) {
    printJson(org);
    return;
  }
  success(`Organization "${org.name}" created (${org.slug})`);
}

export async function cmdOrgsRemove(
  orgRef: string,
  options: { yes?: boolean; json?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  let organizationId = orgRef;
  if (!isUuid(orgRef)) {
    const me = await PlatformService.getMe();
    const found = me.organizations.find((o) => o.id === orgRef || o.slug === orgRef || o.name === orgRef);
    if (!found) throw new Error(`Organization "${orgRef}" not found — pass its id directly.`);
    organizationId = found.id;
  }
  await confirmOrAbort(`Delete organization "${orgRef}"? Every project inside goes with it.`, options.yes);
  await OrganizationsService.deleteOrganization({ organizationId });
  if (isJson(options)) {
    printJson({ deleted: organizationId });
  } else {
    success(`deleted organization ${orgRef}`);
  }
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}
