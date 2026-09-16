import { CreateBucketRequest, StorageService } from "@primora/api-client";

import { loadConfig } from "../config.js";
import { configureClient, requireAuth, requireProject } from "../http.js";
import { isJson, printJson, printTable, success } from "../out.js";

export async function cmdBucketsList(options: {
  project?: string;
  q?: string;
  json?: boolean;
}): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const projectId = requireProject(cfg, options.project);
  const { items } = await StorageService.listBuckets({
    projectId,
    q: options.q || undefined,
  });
  if (isJson(options)) {
    printJson(items);
    return;
  }
  printTable(
    ["SLUG", "NAME", "VISIBILITY", "ID"],
    items.map((b) => [b.slug, b.name, b.visibility, b.id]),
  );
}

export async function cmdBucketsCreate(
  name: string,
  options: { project?: string; slug?: string; public?: boolean; json?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const projectId = requireProject(cfg, options.project);
  const slug = options.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  const bucket = await StorageService.createBucket({
    projectId,
    requestBody: {
      name,
      slug,
      visibility: options.public
        ? CreateBucketRequest.visibility.PUBLIC
        : CreateBucketRequest.visibility.PRIVATE,
    },
  });
  if (isJson(options)) {
    printJson(bucket);
    return;
  }
  success(`Bucket "${bucket.name}" created (${bucket.slug}, ${bucket.visibility})`);
}
