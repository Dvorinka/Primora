import { spawnSync } from "node:child_process";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  AutomationService,
  CreateBucketRequest,
  CreateIntegrationRequest,
  IntegrationsService,
  OpenAPI,
  OrganizationsService,
  PlatformService,
  ProjectsService,
  SecretsService,
  StorageService,
  TelemetryService,
  WebhooksService,
} from "@primora/api-client";

import { configureClient, loadConfig, type McpConfig } from "./config.js";

const cfg = loadConfig();
try {
  configureClient(cfg);
} catch (e) {
  // Missing credentials must not kill the server — initialize/tools/list
  // still work, and every call surfaces the actionable error through the
  // normal tool error path instead of an uncaught startup exception.
  OpenAPI.TOKEN = async () => {
    throw e;
  };
}

const TEXT_TYPES = /^(text\/|application\/(json|xml|yaml|javascript|x-ndjson))/;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function ok(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

function fail(error: unknown) {
  const err = error as { message?: string; body?: unknown };
  const body = err?.body as { error?: { message?: string } } | undefined;
  const message = body?.error?.message ?? err?.message ?? "unknown error";
  return { content: [{ type: "text" as const, text: `error: ${message}` }], isError: true };
}

async function projectId(override?: string): Promise<string> {
  // API keys are hard-scoped to one project — a stored `primora use`
  // selection for a different project can never authorize, so /context
  // wins. Session actors keep the stored choice (users switch projects).
  const id =
    override ??
    (cfg.auth?.type === "apiKey"
      ? ((await contextProjectId()) ?? cfg.projectId)
      : (cfg.projectId ?? (await contextProjectId())));
  if (!id) {
    throw new Error("no project selected — pass projectId, run `primora use`, or set PRIMORA_PROJECT");
  }
  return id;
}

async function orgId(override?: string): Promise<string> {
  const id =
    override ??
    (cfg.auth?.type === "apiKey"
      ? ((await contextOrgId()) ?? cfg.organizationId)
      : (cfg.organizationId ?? (await contextOrgId())));
  if (!id) {
    throw new Error("no organization selected — pass organizationId or run `primora use`");
  }
  return id;
}

// API keys are project-scoped — /context resolves the project without /me.
async function actorContext(): Promise<ActorContext | undefined> {
  if (ctxCache) return ctxCache;
  try {
    const res = await apiFetch("/context");
    ctxCache = (await res.json()) as ActorContext;
  } catch {
    return undefined;
  }
  return ctxCache;
}

async function contextProjectId(): Promise<string | undefined> {
  return (await actorContext())?.project?.id;
}

async function contextOrgId(): Promise<string | undefined> {
  return (await actorContext())?.organization?.id;
}

interface ActorContext {
  actor: string;
  scopes?: string[];
  key_prefix?: string;
  organization?: { id: string; slug: string; name: string; role?: string };
  project?: { id: string; slug: string; name: string };
}
let ctxCache: ActorContext | undefined;

async function bucketIdFor(project: string, ref: string): Promise<string> {
  const { items } = await StorageService.listBuckets({ projectId: project });
  const match = items.find((b) => b.id === ref || b.slug === ref || b.name === ref);
  if (!match) throw new Error(`bucket "${ref}" not found in project`);
  return match.id;
}

/** Raw binary-safe fetch — the generated client decodes non-JSON as text. */
async function apiFetch(path: string): Promise<Response> {
  const headers: Record<string, string> = {};
  if (cfg.auth?.type === "apiKey") {
    headers["X-API-Key"] = cfg.auth.key;
  } else if (cfg.auth?.type === "session") {
    // reuse the client's cached JWT resolver
    const token = typeof OpenAPI.TOKEN === "function" ? await OpenAPI.TOKEN({} as never) : OpenAPI.TOKEN;
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${cfg.baseUrl}/api/v1${path}`, { headers });
  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as
      | { error?: { message?: string } }
      | undefined;
    throw new Error(body?.error?.message ?? `request failed (${res.status})`);
  }
  return res;
}

const server = new McpServer({ name: "primora", version: "0.4.0" });

server.registerTool(
  "primora_whoami",
  { description: "Current identity, organizations and projects visible to the credentials" },
  async () => {
    try {
      // API keys can't call /me — /context is the actor-aware self-discovery.
      if (cfg.auth?.type === "apiKey") {
        const res = await apiFetch("/context");
        return ok(await res.json());
      }
      return ok(await PlatformService.getMe());
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_list_organizations",
  { description: "List organizations the current identity belongs to" },
  async () => {
    try {
      return ok(await OrganizationsService.listOrganizations());
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_list_projects",
  {
    description: "List projects in an organization",
    inputSchema: { organizationId: z.string().optional().describe("Defaults to configured org") },
  },
  async ({ organizationId }) => {
    try {
      return ok(await ProjectsService.listProjects({ organizationId: await orgId(organizationId) }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_create_project",
  {
    description: "Create a project in an organization",
    inputSchema: {
      name: z.string(),
      slug: z.string().optional(),
      description: z.string().optional(),
      organizationId: z.string().optional(),
    },
  },
  async ({ name, slug, description, organizationId }) => {
    try {
      return ok(
        await ProjectsService.createProject({
          organizationId: await orgId(organizationId),
          requestBody: { name, slug: slug ?? slugify(name), description },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_list_buckets",
  {
    description: "List storage buckets in a project",
    inputSchema: { projectId: z.string().optional() },
  },
  async ({ projectId: p }) => {
    try {
      return ok(await StorageService.listBuckets({ projectId: await projectId(p) }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_create_bucket",
  {
    description: "Create a storage bucket",
    inputSchema: {
      name: z.string(),
      slug: z.string().optional(),
      public: z.boolean().optional().describe("Public visibility (default private)"),
      projectId: z.string().optional(),
    },
  },
  async ({ name, slug, public: isPublic, projectId: p }) => {
    try {
      return ok(
        await StorageService.createBucket({
          projectId: await projectId(p),
          requestBody: {
            name,
            slug: slug ?? slugify(name),
            visibility: isPublic
              ? CreateBucketRequest.visibility.PUBLIC
              : CreateBucketRequest.visibility.PRIVATE,
          },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

const bucketRef = z.string().describe("Bucket id, slug or name");

server.registerTool(
  "primora_list_objects",
  {
    description: "List objects in a bucket",
    inputSchema: {
      bucket: bucketRef,
      projectId: z.string().optional(),
      q: z.string().optional().describe("Search filter"),
      limit: z.number().int().optional(),
      offset: z.number().int().optional(),
    },
  },
  async ({ bucket, projectId: p, q, limit, offset }) => {
    try {
      const bucketId = await bucketIdFor(await projectId(p), bucket);
      return ok(await StorageService.listBucketObjects({ bucketId, q, limit, offset }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_upload_object",
  {
    description: "Upload an object. Pass UTF-8 content or base64 for binary.",
    inputSchema: {
      bucket: bucketRef,
      key: z.string().describe("Object key, slashes allowed"),
      content: z.string().optional().describe("UTF-8 content"),
      contentBase64: z.string().optional().describe("Base64 content (binary-safe)"),
      contentType: z.string().optional().describe("MIME type"),
      projectId: z.string().optional(),
    },
  },
  async ({ bucket, key, content, contentBase64, contentType, projectId: p }) => {
    try {
      const bucketId = await bucketIdFor(await projectId(p), bucket);
      let blob: Blob;
      if (contentBase64 !== undefined) {
        // Buffer.from(..., "base64") silently drops invalid chars — strict-
        // validate so corrupt input can't silently store garbage bytes.
        const clean = contentBase64.replace(/\s/g, "");
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) {
          throw new Error("contentBase64 is not valid base64");
        }
        blob = new Blob([Buffer.from(clean, "base64")], {
          type: contentType ?? "application/octet-stream",
        });
      } else if (content !== undefined) {
        blob = new Blob([content], { type: contentType ?? "text/plain" });
      } else {
        throw new Error("pass content or contentBase64");
      }
      return ok(
        await StorageService.uploadBucketObject({
          bucketId,
          formData: { objectKey: key, file: blob },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_download_object",
  {
    description: "Download an object — returns text for text types, base64 otherwise",
    inputSchema: {
      bucket: bucketRef,
      key: z.string(),
      projectId: z.string().optional(),
    },
  },
  async ({ bucket, key, projectId: p }) => {
    try {
      const bucketId = await bucketIdFor(await projectId(p), bucket);
      const res = await apiFetch(`/buckets/${bucketId}/objects/${encodeURIComponent(key)}`);
      const type = res.headers.get("content-type") ?? "application/octet-stream";
      if (TEXT_TYPES.test(type)) {
        return ok({ key, contentType: type, content: await res.text() });
      }
      const buf = Buffer.from(await res.arrayBuffer());
      return ok({ key, contentType: type, base64: buf.toString("base64"), bytes: buf.length });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_delete_object",
  {
    description: "Delete an object from a bucket",
    inputSchema: {
      bucket: bucketRef,
      key: z.string(),
      projectId: z.string().optional(),
    },
  },
  async ({ bucket, key, projectId: p }) => {
    try {
      const bucketId = await bucketIdFor(await projectId(p), bucket);
      await StorageService.deleteBucketObject({ bucketId, objectKey: key });
      return ok({ deleted: key });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_list_api_keys",
  {
    description: "List API keys for a project",
    inputSchema: { projectId: z.string().optional() },
  },
  async ({ projectId: p }) => {
    try {
      return ok(await ProjectsService.listApiKeys({ projectId: await projectId(p) }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_create_api_key",
  {
    description: "Create an API key — the secret is returned once, store it",
    inputSchema: { name: z.string(), projectId: z.string().optional() },
  },
  async ({ name, projectId: p }) => {
    try {
      return ok(await ProjectsService.createApiKey({ projectId: await projectId(p), requestBody: { name } }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_revoke_api_key",
  {
    description: "Revoke an API key",
    inputSchema: { apiKeyId: z.string(), projectId: z.string().optional() },
  },
  async ({ apiKeyId, projectId: p }) => {
    try {
      await ProjectsService.revokeApiKey({ projectId: await projectId(p), apiKeyId });
      return ok({ revoked: apiKeyId });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_query_audit",
  {
    description: "Query the project audit log",
    inputSchema: {
      projectId: z.string().optional(),
      q: z.string().optional().describe("Search resource/action/request id"),
      action: z.string().optional().describe("Filter by action, e.g. object.uploaded"),
      limit: z.number().int().optional(),
      offset: z.number().int().optional(),
    },
  },
  async ({ projectId: p, q, action, limit, offset }) => {
    try {
      return ok(
        await ProjectsService.listAuditLogs({ projectId: await projectId(p), q, action, limit, offset }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

const eventType = z.enum(["error", "metric", "log", "heartbeat", "event"]);

server.registerTool(
  "primora_list_issues",
  {
    description: "Error groups by fingerprint — count, severity, first/last seen",
    inputSchema: {
      projectId: z.string().optional(),
      days: z.number().int().optional().describe("Lookback window (default 30)"),
    },
  },
  async ({ projectId: p, days }) => {
    try {
      return ok(await TelemetryService.listTelemetryIssues({ projectId: await projectId(p), days }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_list_events",
  {
    description: "Telemetry events, newest first — errors, metrics, logs, heartbeats",
    inputSchema: {
      projectId: z.string().optional(),
      type: eventType.optional(),
      component: z.string().optional(),
      fingerprint: z.string().optional().describe("Limit to one error group"),
      limit: z.number().int().optional(),
      before: z.number().int().optional().describe("Event id cursor for pagination"),
    },
  },
  async ({ projectId: p, type, component, fingerprint, limit, before }) => {
    try {
      return ok(
        await TelemetryService.listTelemetryEvents({
          projectId: await projectId(p),
          type,
          component,
          fingerprint,
          limit,
          before,
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_telemetry_stats",
  {
    description: "Aggregated telemetry: event series, component health, totals, metric names",
    inputSchema: {
      projectId: z.string().optional(),
      window: z.enum(["1h", "24h", "7d", "30d"]).optional(),
    },
  },
  async ({ projectId: p, window }) => {
    try {
      return ok(await TelemetryService.getTelemetryStats({ projectId: await projectId(p), window }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_metric_series",
  {
    description: "Time series for one metric name — avg, p50, p95, max per bucket",
    inputSchema: {
      projectId: z.string().optional(),
      name: z.string(),
      window: z.enum(["1h", "24h", "7d", "30d"]).optional(),
    },
  },
  async ({ projectId: p, name, window }) => {
    try {
      return ok(
        await TelemetryService.getTelemetryMetricSeries({ projectId: await projectId(p), name, window }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

/* ---------------------------------------------------------- */
/* integrations                                               */
/* ---------------------------------------------------------- */

const integrationRef = z.string().describe("Integration id (see primora_list_integrations)");

server.registerTool(
  "primora_list_integrations",
  {
    description: "List external service connectors attached to a project",
    inputSchema: { projectId: z.string().optional() },
  },
  async ({ projectId: p }) => {
    try {
      return ok(await IntegrationsService.listIntegrations({ projectId: await projectId(p) }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_create_integration",
  {
    description:
      "Attach an external service. Credentials are stored encrypted and never returned.",
    inputSchema: {
      name: z.string(),
      baseUrl: z.string().describe("Root URL of the self-hosted instance"),
      apiKey: z.string().optional().describe("Stored encrypted; never returned by any endpoint"),
      siteId: z.string().optional().describe("Connector-specific target (Rybbit site id)"),
      projectId: z.string().optional(),
    },
  },
  async ({ name, baseUrl, apiKey, siteId, projectId: p }) => {
    try {
      return ok(
        await IntegrationsService.createIntegration({
          projectId: await projectId(p),
          requestBody: {
            name,
            type: CreateIntegrationRequest.type.RYBBIT,
            base_url: baseUrl,
            api_key: apiKey,
            site_id: siteId,
          },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_delete_integration",
  {
    description: "Remove a connector from the project",
    inputSchema: { integrationId: integrationRef, projectId: z.string().optional() },
  },
  async ({ integrationId, projectId: p }) => {
    try {
      await IntegrationsService.deleteIntegration({ projectId: await projectId(p), integrationId });
      return ok({ deleted: integrationId });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_test_integration",
  {
    description: "Run the connector health check against its base URL and update its status",
    inputSchema: { integrationId: integrationRef, projectId: z.string().optional() },
  },
  async ({ integrationId, projectId: p }) => {
    try {
      return ok(await IntegrationsService.testIntegration({ projectId: await projectId(p), integrationId }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_integration_analytics",
  {
    description:
      "Normalized analytics from a Rybbit connector — overview, series, top pages and referrers",
    inputSchema: {
      integrationId: integrationRef,
      site: z.string().optional().describe("Rybbit site id override"),
      days: z.number().int().optional().describe("Lookback window (default 30)"),
      projectId: z.string().optional(),
    },
  },
  async ({ integrationId, site, days, projectId: p }) => {
    try {
      return ok(
        await IntegrationsService.getIntegrationAnalytics({
          projectId: await projectId(p),
          integrationId,
          site,
          days,
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

/* ---------------------------------------------------------- */
/* webhooks                                                   */
/* ---------------------------------------------------------- */

const webhookRef = z.string().describe("Webhook id (see primora_list_webhooks)");
const webhookEvents = z
  .array(
    z.enum([
      "issue.created",
      "deploy.marker",
      "webhook.test",
      "job.run",
      "document.created",
      "document.updated",
      "document.deleted",
      "object.created",
      "object.updated",
      "object.deleted",
    ]),
  )
  .describe("Event filter — empty means every event");

server.registerTool(
  "primora_list_webhooks",
  {
    description: "List outbound webhooks for a project",
    inputSchema: { projectId: z.string().optional() },
  },
  async ({ projectId: p }) => {
    try {
      return ok(await WebhooksService.listWebhooks({ projectId: await projectId(p) }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_create_webhook",
  {
    description:
      "Create an outbound webhook. Omit secret to generate one — it is returned once.",
    inputSchema: {
      url: z.string().describe("HTTPS endpoint (http allowed only for loopback sinks)"),
      secret: z.string().optional(),
      events: webhookEvents.optional(),
      enabled: z.boolean().optional(),
      projectId: z.string().optional(),
    },
  },
  async ({ url, secret, events, enabled, projectId: p }) => {
    try {
      return ok(
        await WebhooksService.createWebhook({
          projectId: await projectId(p),
          requestBody: { url, secret, events, enabled },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_update_webhook",
  {
    description:
      "Update a webhook — url, event filter, enabled flag, or rotate the secret (empty string regenerates it)",
    inputSchema: {
      webhookId: webhookRef,
      url: z.string().optional(),
      secret: z.string().optional(),
      events: webhookEvents.optional(),
      enabled: z.boolean().optional(),
      projectId: z.string().optional(),
    },
  },
  async ({ webhookId, url, secret, events, enabled, projectId: p }) => {
    try {
      return ok(
        await WebhooksService.updateWebhook({
          projectId: await projectId(p),
          webhookId,
          requestBody: { url, secret, events, enabled },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_delete_webhook",
  {
    description: "Delete a webhook and stop future deliveries",
    inputSchema: { webhookId: webhookRef, projectId: z.string().optional() },
  },
  async ({ webhookId, projectId: p }) => {
    try {
      await WebhooksService.deleteWebhook({ projectId: await projectId(p), webhookId });
      return ok({ deleted: webhookId });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_list_webhook_deliveries",
  {
    description: "Recent delivery attempts for a webhook — status, attempts, HTTP code, errors",
    inputSchema: {
      webhookId: webhookRef,
      limit: z.number().int().optional(),
      projectId: z.string().optional(),
    },
  },
  async ({ webhookId, limit, projectId: p }) => {
    try {
      return ok(
        await WebhooksService.listWebhookDeliveries({
          projectId: await projectId(p),
          webhookId,
          limit,
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_test_webhook",
  {
    description: "Queue a webhook.test delivery to verify the endpoint and signature",
    inputSchema: { webhookId: webhookRef, projectId: z.string().optional() },
  },
  async ({ webhookId, projectId: p }) => {
    try {
      return ok(await WebhooksService.testWebhook({ projectId: await projectId(p), webhookId }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_create_deploy_marker",
  {
    description:
      "Record a deployment (version/ref/environment) and fire the deploy.marker webhook event",
    inputSchema: {
      version: z.string().optional(),
      ref: z.string().optional().describe("Git sha or tag"),
      environment: z.string().optional(),
      note: z.string().optional(),
      projectId: z.string().optional(),
    },
  },
  async ({ version, ref, environment, note, projectId: p }) => {
    try {
      if (!version && !ref) throw new Error("pass version or ref");
      return ok(
        await WebhooksService.createDeployMarker({
          projectId: await projectId(p),
          requestBody: { version, ref, environment, note },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

/* ---------------------------------------------------------- */
/* automation — scheduled jobs                                */
/* ---------------------------------------------------------- */

const jobRef = z.string().describe("Scheduled job id (see primora_list_jobs)");

server.registerTool(
  "primora_list_jobs",
  {
    description: "List scheduled jobs for a project — cron schedule, target URL, last/next run",
    inputSchema: { projectId: z.string().optional() },
  },
  async ({ projectId: p }) => {
    try {
      return ok(await AutomationService.listScheduledJobs({ projectId: await projectId(p) }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_create_job",
  {
    description:
      "Create a scheduled job — cron expression or @descriptor, signed POST to url. Omit secret to generate one (returned once)",
    inputSchema: {
      name: z.string(),
      schedule: z
        .string()
        .describe('Cron (5-field, e.g. "*/15 * * * *") or descriptor: @hourly, @daily, @every 30m'),
      url: z.string().describe("HTTPS endpoint (http allowed only for private/self-hosted targets)"),
      secret: z.string().optional(),
      payload: z.record(z.string(), z.unknown()).optional().describe("Static JSON payload merged into every delivery"),
      enabled: z.boolean().optional(),
      projectId: z.string().optional(),
    },
  },
  async ({ name, schedule, url, secret, payload, enabled, projectId: p }) => {
    try {
      return ok(
        await AutomationService.createScheduledJob({
          projectId: await projectId(p),
          requestBody: { name, schedule, url, secret, payload, enabled },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_update_job",
  {
    description: "Update a scheduled job — name, schedule, url, payload, enabled flag, or rotate the secret",
    inputSchema: {
      jobId: jobRef,
      name: z.string().optional(),
      schedule: z.string().optional(),
      url: z.string().optional(),
      secret: z.string().optional(),
      payload: z.record(z.string(), z.unknown()).optional(),
      enabled: z.boolean().optional(),
      projectId: z.string().optional(),
    },
  },
  async ({ jobId, name, schedule, url, secret, payload, enabled, projectId: p }) => {
    try {
      return ok(
        await AutomationService.updateScheduledJob({
          projectId: await projectId(p),
          jobId,
          requestBody: { name, schedule, url, secret, payload, enabled },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_delete_job",
  {
    description: "Delete a scheduled job and stop future runs",
    inputSchema: { jobId: jobRef, projectId: z.string().optional() },
  },
  async ({ jobId, projectId: p }) => {
    try {
      await AutomationService.deleteScheduledJob({ projectId: await projectId(p), jobId });
      return ok({ deleted: jobId });
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_list_job_runs",
  {
    description: "Run history for a scheduled job — status, HTTP code, duration, errors",
    inputSchema: {
      jobId: jobRef,
      limit: z.number().int().optional(),
      projectId: z.string().optional(),
    },
  },
  async ({ jobId, limit, projectId: p }) => {
    try {
      return ok(
        await AutomationService.listScheduledJobRuns({ projectId: await projectId(p), jobId, limit }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_run_job",
  {
    description: "Trigger a manual run of a scheduled job now",
    inputSchema: { jobId: jobRef, projectId: z.string().optional() },
  },
  async ({ jobId, projectId: p }) => {
    try {
      return ok(await AutomationService.runScheduledJob({ projectId: await projectId(p), jobId }));
    } catch (e) {
      return fail(e);
    }
  },
);

/* ---------------------------------------------------------- */
/* local vault — metadata only, values never leave the CLI     */
/* ---------------------------------------------------------- */

const PRIMORA_CLI = process.env.PRIMORA_CLI ?? "primora";

/** Run the primora CLI; returns {code, stdout, stderr}. Values fetched via
 *  `secrets get` stay inside this process — they are never returned. */
function runCli(args: string[], env?: Record<string, string>) {
  const res = spawnSync(PRIMORA_CLI, args, {
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 60_000,
  });
  return {
    code: res.status ?? 1,
    stdout: (res.stdout ?? "").toString(),
    stderr: ((res.stderr ?? "") + (res.error ? String(res.error.message) : "")).toString(),
  };
}

server.registerTool(
  "primora_vault_status",
  {
    description:
      "Local vault state — exists, locked/unlocked, KDF parameters, secret count. Unlock with `primora vault unlock` on the host first.",
  },
  async () => {
    try {
      const r = runCli(["vault", "status", "--json"]);
      if (r.code !== 0) throw new Error(r.stderr.trim() || "vault status failed");
      return ok(JSON.parse(r.stdout));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_vault_list",
  {
    description:
      "List vault secrets — names, urls, notes, timestamps only. Secret values are never returned by any tool; they are injected at exec time.",
  },
  async () => {
    try {
      const r = runCli(["secrets", "list", "--json"]);
      if (r.code !== 0) throw new Error(r.stderr.trim() || "vault locked — run `primora vault unlock`");
      return ok(JSON.parse(r.stdout));
    } catch (e) {
      return fail(e);
    }
  },
);

// vault_exec allow-list — read/non-destructive commands an agent may run
// under an injected secret. Deny-lists lose (a colon-form `secrets:get`
// already bypassed a pair-match once); only these verbs execute.
// Commands touching host files (upload/download --out, secrets import) and
// anything that moves a secret into output are intentionally absent.
const EXEC_ALLOW = new Set([
  "whoami",
  "context",
  "orgs:list",
  "projects:list",
  "buckets:list",
  "objects:list",
  "documents:list",
  "jobs:list",
  "jobs:runs",
  "audit:list",
  "keys:list",
  "events:send",
]);

// Flags that could redirect output into host files — none of the allowed
// commands need them, so reject the whole set defensively.
const EXEC_ARG_DENY = /^--?(out|file|path|dir|env-file|output|write)\b/;

// Env names that must never carry an injected secret — preload/runtime
// hooks and interpreter variables turn an env injection into code exec
// (NODE_OPTIONS, LD_*, BASH_ENV, PYTHONPATH, …). PRIMORA_* stays allowed:
// the injected VALUE comes from the vault, and those names are its purpose.
const ENV_NAME_DENY =
  /^(NODE_|LD_|DYLD_|BASH|ENV$|IFS$|PATH$|HOME$|SHELL$|CDPATH$|SHELLOPTS$|BASHOPTS$|PYTHON|PERL|RUBY|GIT_|SSL_CERT|XDG_)/;

function execAllowed(raw: string[]): { args: string[]; verb: string } {
  // Normalize colon-form: ["objects:list","b"] ≡ ["objects","list","b"].
  const args = [...raw];
  if (args[0].includes(":") && !args[0].startsWith("-")) {
    args.splice(0, 1, ...args[0].split(":"));
  }
  const verb = args.length > 1 && !args[1].startsWith("-") ? `${args[0]}:${args[1]}` : args[0];
  if (!EXEC_ALLOW.has(verb)) {
    throw new Error(`denied: "${verb}" is not on the vault_exec allow-list (read-only commands only)`);
  }
  for (const a of args) {
    if (a.includes("\0")) throw new Error("denied: NUL byte in argument");
    if (a.includes("..") || EXEC_ARG_DENY.test(a)) {
      throw new Error(`denied: argument "${a}" could redirect to host files`);
    }
  }
  return { args, verb };
}

server.registerTool(
  "primora_vault_exec",
  {
    description:
      "Run a read-only primora CLI command with a vault secret injected into its environment (default secret: PRIMORA_API_KEY). Allow-listed commands only; the secret never appears in arguments or the response.",
    inputSchema: {
      command: z
        .array(z.string())
        .describe('primora arguments, e.g. ["objects","list","mybucket"] — allow-listed read commands only'),
      secret: z
        .string()
        .optional()
        .describe("Vault secret name to inject as itself (default PRIMORA_API_KEY)"),
    },
  },
  async ({ command, secret }) => {
    try {
      if (!command.length) throw new Error("empty command");
      const { args } = execAllowed(command);
      const secretName = secret ?? "PRIMORA_API_KEY";
      if (!/^[A-Z_][A-Z0-9_]{0,63}$/.test(secretName) || ENV_NAME_DENY.test(secretName)) {
        throw new Error(`denied: "${secretName}" is not a safe env name to inject`);
      }
      const got = runCli(["secrets", "get", secretName]);
      if (got.code !== 0) {
        throw new Error(got.stderr.trim() || `vault locked or "${secretName}" missing`);
      }
      const r = runCli(args, { [secretName]: got.stdout.trimEnd() });
      return ok({ exitCode: r.code, stdout: r.stdout, stderr: r.stderr });
    } catch (e) {
      return fail(e);
    }
  },
);

// Project vault — server-side store. Agents get metadata + write; there is no
// reveal or delete tool. To use a secret, reference it as secret://NAME in a
// scheduled-job payload and the server resolves it at delivery.
server.registerTool(
  "primora_secrets_list",
  {
    description:
      "List project vault secrets — names, urls, notes, timestamps only. Values are never returned; reference them as secret://NAME in job payloads.",
    inputSchema: { projectId: z.string().optional() },
  },
  async ({ projectId: p }) => {
    try {
      return ok(await SecretsService.listProjectSecrets({ projectId: await projectId(p) }));
    } catch (e) {
      return fail(e);
    }
  },
);

server.registerTool(
  "primora_secrets_set",
  {
    description:
      "Store a secret in the project vault (encrypted at rest, write-only). The value is sent once and can never be read back through MCP. Omitted url/notes keep existing values.",
    inputSchema: {
      name: z.string().describe("Env-var-safe name, e.g. STRIPE_SECRET — referenced as secret://NAME"),
      value: z.string().describe("Secret value — sent once, never returned"),
      url: z.string().optional().describe("Associated dashboard/console URL"),
      notes: z.string().optional().describe("Free-text notes"),
      projectId: z.string().optional(),
    },
  },
  async ({ name, value, url, notes, projectId: p }) => {
    try {
      const res = await SecretsService.setProjectSecret({
        projectId: await projectId(p),
        name,
        requestBody: { value, url, notes },
      });
      // Return metadata only — echoing the value back would put it in context.
      const { id: _, ...meta } = res;
      return ok(meta);
    } catch (e) {
      return fail(e);
    }
  },
);

await server.connect(new StdioServerTransport());
