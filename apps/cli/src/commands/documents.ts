import { CollectionsService } from "@primora/api-client";

import { loadConfig } from "../config.js";
import { CliError, configureClient, requireAuth, requireProject } from "../http.js";
import { formatDate, isJson, printJson, printTable } from "../out.js";

interface DocumentsListOptions {
  project?: string;
  collection?: string;
  filter?: string;
  order?: string;
  limit?: number;
  offset?: number;
  json?: boolean;
}

// Accepts a collection id or slug.
async function collectionIdFor(projectId: string, ref: string): Promise<string> {
  const { items } = await CollectionsService.listCollections({ projectId });
  const match = items.find((c) => c.id === ref || c.slug === ref || c.name === ref);
  if (!match) {
    throw new CliError(
      `Collection "${ref}" not found.`,
      `Known: ${items.map((c) => c.slug).join(", ") || "(none)"}`,
    );
  }
  return match.id;
}

export async function cmdDocumentsList(options: DocumentsListOptions): Promise<void> {
  if (!options.collection) {
    throw new CliError("Missing --collection <slug|id>.");
  }
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const projectId = requireProject(cfg, options.project);
  const collectionId = await collectionIdFor(projectId, options.collection);
  const res = await CollectionsService.listDocuments({
    collectionId,
    limit: options.limit,
    offset: options.offset,
    filter: options.filter,
    order: options.order,
  });
  if (isJson(options)) {
    printJson(res);
    return;
  }
  if (!res.items.length) {
    console.log("No documents.");
    return;
  }
  printTable(
    ["ID", "DATA", "UPDATED"],
    res.items.map((d) => [
      d.id.slice(0, 8),
      JSON.stringify(d.data).slice(0, 80),
      formatDate(d.updated_at),
    ]),
  );
  console.log(`${res.items.length} of ${res.total}`);
}
