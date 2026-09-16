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
