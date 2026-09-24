import { statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";

import { PresignObjectRequest, StorageService } from "@primora/api-client";

import { loadConfig } from "../config.js";
import {
  apiFetch,
  CliError,
  configureClient,
  requireAuth,
  requireProject,
  resolveBucketId,
} from "../http.js";
import { formatBytes, formatDate, isJson, printJson, printTable, success } from "../out.js";

const MIME_BY_EXT: Record<string, string> = {
  ".json": "application/json",
  ".txt": "text/plain",
  ".md": "text/markdown",
  ".csv": "text/csv",
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".ts": "text/typescript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".yaml": "application/yaml",
  ".yml": "application/yaml",
  ".xml": "application/xml",
};

function guessType(path: string): string {
  const dot = path.lastIndexOf(".");
  if (dot < 0) return "application/octet-stream";
  return MIME_BY_EXT[path.slice(dot).toLowerCase()] ?? "application/octet-stream";
}

async function bucketIdFor(cfg: ReturnType<typeof loadConfig>, bucketRef: string, projectOverride?: string) {
  const projectId = requireProject(cfg, projectOverride);
  return resolveBucketId(projectId, bucketRef);
}

export async function cmdObjectsList(
  bucketRef: string,
  options: { project?: string; q?: string; limit?: string; offset?: string; json?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const bucketId = await bucketIdFor(cfg, bucketRef, options.project);
  const page = await StorageService.listBucketObjects({
    bucketId,
    q: options.q || undefined,
    limit: options.limit ? Number(options.limit) : 50,
    offset: options.offset ? Number(options.offset) : undefined,
  });
  if (isJson(options)) {
    printJson(page);
    return;
  }
  printTable(
    ["KEY", "TYPE", "SIZE", "CREATED"],
    page.items.map((o) => [o.object_key, o.content_type, formatBytes(o.size_bytes), formatDate(o.created_at)]),
  );
}

export async function cmdObjectsUpload(
  bucketRef: string,
  file: string,
  options: { project?: string; key?: string; json?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const bucketId = await bucketIdFor(cfg, bucketRef, options.project);
  const stat = statSync(file); // throws ENOENT with a clear message
  if (!stat.isFile()) throw new CliError(`Not a file: ${file}`);

  const objectKey = options.key ?? basename(file);
  const buffer = await readFile(file);
  const blob = new Blob([buffer], { type: guessType(file) });
  const object = await StorageService.uploadBucketObject({
    bucketId,
    formData: { objectKey, file: blob },
  });
  if (isJson(options)) {
    printJson(object);
    return;
  }
  success(`Uploaded ${object.object_key} (${formatBytes(object.size_bytes)})`);
}

export async function cmdObjectsDownload(
  bucketRef: string,
  objectKey: string,
  options: { project?: string; out?: string },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const bucketId = await bucketIdFor(cfg, bucketRef, options.project);
  const res = await apiFetch(
    cfg,
    `/buckets/${bucketId}/objects/${encodeURIComponent(objectKey)}`,
  );
  const outPath = options.out ?? basename(objectKey);
  const bytes = Buffer.from(await res.arrayBuffer());
  await writeFile(outPath, bytes);
  success(`Downloaded ${objectKey} → ${outPath} (${formatBytes(bytes.length)})`);
}

export async function cmdObjectsRemove(
  bucketRef: string,
  objectKey: string,
  options: { project?: string },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const bucketId = await bucketIdFor(cfg, bucketRef, options.project);
  await StorageService.deleteBucketObject({ bucketId, objectKey });
  success(`Deleted ${objectKey}`);
}

export async function cmdObjectsPresign(
  bucketRef: string,
  objectKey: string,
  options: { project?: string; upload?: boolean; ttl?: string; json?: boolean },
): Promise<void> {
  const cfg = loadConfig();
  requireAuth(cfg);
  configureClient(cfg);

  const bucketId = await bucketIdFor(cfg, bucketRef, options.project);
  const presigned = await StorageService.presignBucketObject({
    bucketId,
    requestBody: {
      key: objectKey,
      op: options.upload
        ? PresignObjectRequest.op.UPLOAD
        : PresignObjectRequest.op.DOWNLOAD,
      ttl_seconds: options.ttl ? Number(options.ttl) : undefined,
    },
  });
  if (isJson(options)) {
    printJson(presigned);
    return;
  }
  console.log(presigned.url);
  console.error(`# ${presigned.method} — expires ${presigned.expires_at}`);
}
