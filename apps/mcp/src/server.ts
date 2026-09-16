import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  CreateBucketRequest,
  IntegrationsService,
  OpenAPI,
  OrganizationsService,
  PlatformService,
  ProjectsService,
  StorageService,
  TelemetryService,
  WebhooksService,
} from "@primora/api-client";

import { configureClient, loadConfig, type McpConfig } from "./config.js";

const cfg = loadConfig();
configureClient(cfg);

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

function projectId(override?: string): string {
  const id = override ?? cfg.projectId;
  if (!id) {
    throw new Error("no project selected — pass projectId, run `primora use`, or set PRIMORA_PROJECT");
  }
  return id;
}

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
      const org = organizationId ?? cfg.organizationId;
      if (!org) throw new Error("no organization selected — pass organizationId or run `primora use`");
      return ok(await ProjectsService.listProjects({ organizationId: org }));
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
      const org = organizationId ?? cfg.organizationId;
      if (!org) throw new Error("no organization selected — pass organizationId or run `primora use`");
      return ok(
        await ProjectsService.createProject({
          organizationId: org,
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
      return ok(await StorageService.listBuckets({ projectId: projectId(p) }));
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
          projectId: projectId(p),
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
      const bucketId = await bucketIdFor(projectId(p), bucket);
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
      const bucketId = await bucketIdFor(projectId(p), bucket);
      let blob: Blob;
      if (contentBase64 !== undefined) {
        blob = new Blob([Buffer.from(contentBase64, "base64")], {
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
      const bucketId = await bucketIdFor(projectId(p), bucket);
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
      const bucketId = await bucketIdFor(projectId(p), bucket);
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
      return ok(await ProjectsService.listApiKeys({ projectId: projectId(p) }));
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
      return ok(await ProjectsService.createApiKey({ projectId: projectId(p), requestBody: { name } }));
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
      await ProjectsService.revokeApiKey({ projectId: projectId(p), apiKeyId });
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
        await ProjectsService.listAuditLogs({ projectId: projectId(p), q, action, limit, offset }),
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
      return ok(await TelemetryService.listTelemetryIssues({ projectId: projectId(p), days }));
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
          projectId: projectId(p),
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
      return ok(await TelemetryService.getTelemetryStats({ projectId: projectId(p), window }));
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
        await TelemetryService.getTelemetryMetricSeries({ projectId: projectId(p), name, window }),
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
      return ok(await IntegrationsService.listIntegrations({ projectId: projectId(p) }));
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
          projectId: projectId(p),
          requestBody: {
            name,
            type: "rybbit",
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
      await IntegrationsService.deleteIntegration({ projectId: projectId(p), integrationId });
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
      return ok(await IntegrationsService.testIntegration({ projectId: projectId(p), integrationId }));
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
          projectId: projectId(p),
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
  .array(z.enum(["issue.created", "deploy.marker", "webhook.test"]))
  .describe("Event filter — empty means every event");

server.registerTool(
  "primora_list_webhooks",
  {
    description: "List outbound webhooks for a project",
    inputSchema: { projectId: z.string().optional() },
  },
  async ({ projectId: p }) => {
    try {
      return ok(await WebhooksService.listWebhooks({ projectId: projectId(p) }));
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
          projectId: projectId(p),
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
          projectId: projectId(p),
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
      await WebhooksService.deleteWebhook({ projectId: projectId(p), webhookId });
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
          projectId: projectId(p),
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
      return ok(await WebhooksService.testWebhook({ projectId: projectId(p), webhookId }));
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
          projectId: projectId(p),
          requestBody: { version, ref, environment, note },
        }),
      );
    } catch (e) {
      return fail(e);
    }
  },
);

await server.connect(new StdioServerTransport());
