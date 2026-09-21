/**
 * Demo mode — fully client-side workspace simulation.
 * Enabled via VITE_DEMO_MODE=true, ?demo=true, or the "Try demo mode" action.
 */

import {
  Integration,
  OrganizationInvitation,
  OrganizationMember,
  ProjectMember,
  ScheduledJob,
  ScheduledJobRun,
  WebhookDelivery,
} from "@primora/api-client";
import type {
  ApiKey,
  AuditLog,
  Bucket,
  BucketObject,
  Collection,
  DBConnection,
  DeployMarker,
  Document,
  IntegrationAnalytics,
  IntegrationTestResult,
  InstanceSetting,
  MeResponse,
  MetricPoint,
  OrganizationSummary,
  ProjectOverview,
  ProjectSummary,
  TelemetryComponent,
  TelemetryEvent,
  TelemetryIssue,
  TelemetryStats,
  Webhook,
  WebhookCreateResponse,
  ScheduledJobCreateResponse,
} from "@primora/api-client";

const STORAGE_KEY = "primora_demo_mode";

export const isDemoMode = () => {
  if (import.meta.env.VITE_DEMO_MODE === "true") return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") === "true") return true;
  return localStorage.getItem(STORAGE_KEY) === "true";
};

export const enableDemoMode = () => {
  localStorage.setItem(STORAGE_KEY, "true");
  window.location.search = "?demo=true";
};

export const disableDemoMode = () => {
  localStorage.removeItem(STORAGE_KEY);
  window.location.href = window.location.pathname;
};

export const demoSession = {
  user: {
    id: "demo-user-1",
    authSubject: "demo|demo-user-1",
    email: "demo@primora.dev",
    name: "Demo User",
    emailVerified: true,
  },
  session: {
    id: "demo-session-1",
    userId: "demo-user-1",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    token: "demo-token",
    ipAddress: "127.0.0.1",
    userAgent: navigator.userAgent,
  },
};

/* ------------------------------------------------------------------ */
/* mutable demo state — mutations actually persist for the session    */
/* ------------------------------------------------------------------ */

const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day).toISOString();
const inDays = (days: number) => new Date(Date.now() + days * day).toISOString();

let organizations: OrganizationSummary[] = [
  {
    id: "org-1",
    name: "Acme Corporation",
    slug: "acme-corp",
    membershipRole: "owner",
    projects: [
      {
        id: "proj-1",
        name: "Production API",
        slug: "production-api",
        description: "Main production API service",
        membershipRole: "admin",
      },
      {
        id: "proj-2",
        name: "Mobile App",
        slug: "mobile-app",
        description: "iOS and Android application",
        membershipRole: "developer",
      },
    ],
  },
];

let orgMembers: OrganizationMember[] = [
  {
    user_id: "demo-user-1",
    name: "Demo User",
    email: "demo@primora.dev",
    email_verified: true,
    role: OrganizationMember.role.OWNER,
    joined_at: ago(90),
  },
  {
    user_id: "user-2",
    name: "Alice Johnson",
    email: "alice@example.com",
    email_verified: true,
    role: OrganizationMember.role.ADMIN,
    joined_at: ago(60),
  },
  {
    user_id: "user-3",
    name: "Bob Smith",
    email: "bob@example.com",
    email_verified: false,
    role: OrganizationMember.role.MEMBER,
    joined_at: ago(30),
  },
];

let invitations: OrganizationInvitation[] = [
  {
    id: "inv-1",
    organization_id: "org-1",
    email: "charlie@example.com",
    org_role: OrganizationInvitation.org_role.MEMBER,
    project_id: null,
    project_name: null,
    project_role: null,
    status: OrganizationInvitation.status.PENDING,
    expires_at: inDays(7),
    created_at: ago(2),
    invited_by_user_id: "demo-user-1",
    accepted_at: null,
  },
  {
    id: "inv-2",
    organization_id: "org-1",
    email: "diana@example.com",
    org_role: OrganizationInvitation.org_role.MEMBER,
    project_id: "proj-1",
    project_name: "Production API",
    project_role: OrganizationInvitation.project_role.DEVELOPER,
    status: OrganizationInvitation.status.PENDING,
    expires_at: inDays(5),
    created_at: ago(1),
    invited_by_user_id: "demo-user-1",
    accepted_at: null,
  },
];

let projectMembers: ProjectMember[] = [
  {
    user_id: "demo-user-1",
    name: "Demo User",
    email: "demo@primora.dev",
    email_verified: true,
    role: ProjectMember.role.ADMIN,
    joined_at: ago(90),
  },
  {
    user_id: "user-2",
    name: "Alice Johnson",
    email: "alice@example.com",
    email_verified: true,
    role: ProjectMember.role.DEVELOPER,
    joined_at: ago(60),
  },
  {
    user_id: "user-3",
    name: "Bob Smith",
    email: "bob@example.com",
    email_verified: false,
    role: ProjectMember.role.VIEWER,
    joined_at: ago(30),
  },
];

/** Shape mirrors the better-auth admin `listUsers` response. */
export interface DemoAuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  banned: boolean;
  createdAt: string;
}

let authUsers: DemoAuthUser[] = [
  { id: "demo-user-1", name: "Demo User", email: "demo@primora.dev", emailVerified: true, role: "admin", banned: false, createdAt: ago(90) },
  { id: "user-2", name: "Alice Johnson", email: "alice@example.com", emailVerified: true, role: "user", banned: false, createdAt: ago(60) },
  { id: "user-3", name: "Bob Smith", email: "bob@example.com", emailVerified: false, role: "user", banned: false, createdAt: ago(30) },
  { id: "user-4", name: "Carol White", email: "carol@example.com", emailVerified: true, role: "user", banned: true, createdAt: ago(14) },
];

let apiKeys: ApiKey[] = [
  {
    id: "key-1",
    project_id: "proj-1",
    name: "Production key",
    prefix: "pk_live_7f2a",
    last_used_at: ago(0.2),
    revoked_at: null,
  },
  {
    id: "key-2",
    project_id: "proj-1",
    name: "CI deploy",
    prefix: "pk_test_9c41",
    last_used_at: ago(2),
    revoked_at: null,
  },
  {
    id: "key-3",
    project_id: "proj-1",
    name: "Old integration",
    prefix: "pk_old_11be",
    last_used_at: ago(45),
    revoked_at: ago(7),
  },
];

let buckets: Bucket[] = [
  { id: "bucket-1", project_id: "proj-1", name: "User Avatars", slug: "avatars", visibility: "public" },
  { id: "bucket-2", project_id: "proj-1", name: "Documents", slug: "documents", visibility: "private" },
  { id: "bucket-3", project_id: "proj-1", name: "Media Files", slug: "media", visibility: "public" },
];

let objects: BucketObject[] = [
  { id: "obj-1", bucket_id: "bucket-1", object_key: "profile/user-123.jpg", content_type: "image/jpeg", size_bytes: 245678, checksum_sha256: "a1b2c3", created_at: ago(30) },
  { id: "obj-2", bucket_id: "bucket-1", object_key: "profile/user-456.png", content_type: "image/png", size_bytes: 189234, checksum_sha256: "d4e5f6", created_at: ago(25) },
  { id: "obj-3", bucket_id: "bucket-1", object_key: "documents/report-2024.pdf", content_type: "application/pdf", size_bytes: 1234567, checksum_sha256: "789abc", created_at: ago(20) },
  { id: "obj-4", bucket_id: "bucket-1", object_key: "config/settings.json", content_type: "application/json", size_bytes: 4567, checksum_sha256: "def012", created_at: ago(15) },
  { id: "obj-5", bucket_id: "bucket-1", object_key: "docs/README.md", content_type: "text/markdown", size_bytes: 2048, checksum_sha256: "345fed", created_at: ago(3) },
];

let auditLogs: AuditLog[] = [
  {
    id: "log-1",
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    action: "object.uploaded",
    resource_type: "object",
    resource_id: "profile/user-123.jpg",
    request_id: "req-abc123",
    metadata: { bucket: "avatars", size_bytes: 245678, actor: "demo@primora.dev" },
  },
  {
    id: "log-2",
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    action: "api_key.created",
    resource_type: "api_key",
    resource_id: "key-2",
    request_id: "req-def456",
    metadata: { name: "CI deploy", actor: "alice@example.com" },
  },
  {
    id: "log-3",
    created_at: ago(1),
    action: "member.invited",
    resource_type: "invitation",
    resource_id: "inv-1",
    request_id: "req-ghi789",
    metadata: { email: "charlie@example.com", role: "member", actor: "demo@primora.dev" },
  },
  {
    id: "log-4",
    created_at: ago(2),
    action: "bucket.created",
    resource_type: "bucket",
    resource_id: "bucket-3",
    request_id: "req-jkl012",
    metadata: { slug: "media", visibility: "public", actor: "demo@primora.dev" },
  },
  {
    id: "log-5",
    created_at: ago(3),
    action: "api_key.revoked",
    resource_type: "api_key",
    resource_id: "key-3",
    request_id: "req-mno345",
    metadata: { name: "Old integration", actor: "alice@example.com" },
  },
];

let collections: Collection[] = [
  {
    id: "col-1",
    project_id: "proj-1",
    name: "Posts",
    slug: "posts",
    description: "Blog posts and articles",
    schema: {},
    created_at: ago(40),
    updated_at: ago(2),
  },
  {
    id: "col-2",
    project_id: "proj-1",
    name: "Feature flags",
    slug: "feature-flags",
    description: null,
    schema: {},
    created_at: ago(20),
    updated_at: ago(1),
  },
];

let documents: Document[] = [
  {
    id: "doc-1",
    collection_id: "col-1",
    data: { title: "Hello Primora", status: "published", views: 1240 },
    created_at: ago(10),
    updated_at: ago(1),
  },
  {
    id: "doc-2",
    collection_id: "col-1",
    data: { title: "Draft: storage guide", status: "draft", views: 0 },
    created_at: ago(5),
    updated_at: ago(5),
  },
];

let dbConnections: DBConnection[] = [
  {
    id: "dbc-1",
    project_id: "proj-1",
    name: "warehouse",
    db_type: "postgres",
    host: "db.example.internal",
    port: 5432,
    database: "analytics",
    username: "primora_read",
    ssl: true,
    is_managed: false,
    has_password: true,
  },
  {
    id: "dbc-2",
    project_id: "proj-1",
    name: "cache",
    db_type: "redis",
    host: "redis.example.internal",
    port: 6379,
    database: "",
    username: "",
    ssl: null,
    is_managed: false,
    has_password: false,
  },
];

const demoComponents: TelemetryComponent[] = [
  { id: "cmp-1", name: "web", kind: "frontend", last_seen_at: ago(0.02), last_status: "up", errors_24h: 0, events_24h: 88, meta: {} },
  { id: "cmp-2", name: "api", kind: "backend", last_seen_at: ago(0.014), last_status: "degraded", errors_24h: 4, events_24h: 120, meta: {} },
  { id: "cmp-3", name: "worker", kind: "backend", last_seen_at: ago(0.03), last_status: "up", errors_24h: 0, events_24h: 60, meta: {} },
];

const demoEventsSeed: TelemetryEvent[] = [
  { id: 42, project_id: "proj-1", component_id: "cmp-2", component_name: "api", type: "error", severity: "error", message: "TypeError: Cannot read properties of undefined (reading 'id')", payload: { stack: "at getUser (api/src/users.ts:41)" }, fingerprint: "a1b2c3d4e5f60718", ts: ago(0.013) },
  { id: 41, project_id: "proj-1", component_id: "cmp-2", component_name: "api", type: "metric", severity: "info", message: "", payload: { name: "http.req.ms", value: 132, route: "/projects" }, fingerprint: "", ts: ago(0.02) },
  { id: 40, project_id: "proj-1", component_id: "cmp-1", component_name: "web", type: "log", severity: "warn", message: "Slow route render: /settings", payload: { ms: 940 }, fingerprint: "", ts: ago(0.03) },
  { id: 39, project_id: "proj-1", component_id: "cmp-3", component_name: "worker", type: "heartbeat", severity: "info", message: "", payload: { status: "up" }, fingerprint: "", ts: ago(0.04) },
  { id: 38, project_id: "proj-1", component_id: "cmp-1", component_name: "web", type: "event", severity: "info", message: "checkout.completed", payload: { total: 129 }, fingerprint: "", ts: ago(0.06) },
  { id: 37, project_id: "proj-1", component_id: "cmp-2", component_name: "api", type: "error", severity: "error", message: "TypeError: Cannot read properties of undefined (reading 'id')", payload: { stack: "at getUser (api/src/users.ts:41)" }, fingerprint: "a1b2c3d4e5f60718", ts: ago(3.5) },
];

let demoEvents: TelemetryEvent[] = [...demoEventsSeed];

const demoTables = [
  "users",
  "organizations",
  "projects",
  "api_keys",
  "audit_logs",
  "buckets",
  "bucket_objects",
  "collections",
  "documents",
];

const demoColumns: Record<string, string[][]> = {
  users: [
    ["id", "uuid", "NO", "PK"],
    ["email", "text", "NO", "UNIQUE"],
    ["name", "text", "YES", ""],
    ["created_at", "timestamptz", "NO", ""],
  ],
  projects: [
    ["id", "uuid", "NO", "PK"],
    ["organization_id", "uuid", "NO", "FK"],
    ["name", "text", "NO", ""],
    ["slug", "text", "NO", "UNIQUE"],
  ],
};

const pushAudit = (action: string, resourceType: string, resourceId: string, metadata: Record<string, unknown> = {}) => {
  auditLogs = [
    {
      id: `log-${Date.now()}`,
      created_at: new Date().toISOString(),
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      request_id: `req-demo-${Math.random().toString(36).slice(2, 8)}`,
      metadata: { actor: "demo@primora.dev", ...metadata },
    },
    ...auditLogs,
  ];
};

/* ------------------------------------------------------------------ */
/* demo service — same call shapes the app expects from the real API  */
/* ------------------------------------------------------------------ */

const demoRybbitSites = [
  { site_id: "ryb-site-1", name: "Marketing site", domain: "acme.dev" },
  { site_id: "ryb-site-2", name: "Docs", domain: "docs.acme.dev" },
];

const demoIntegrations: Integration[] = [
  {
    id: "demo-int-1",
    project_id: "demo-project-1",
    type: Integration.type.RYBBIT,
    name: "rybbit-prod",
    base_url: "https://analytics.acme.dev",
    site_id: "ryb-site-1",
    status: Integration.status.OK,
    last_health_at: new Date(Date.now() - 5 * 60_000).toISOString(),
    has_credentials: true,
    created_at: new Date(Date.now() - 14 * 86_400_000).toISOString(),
  },
];

const demoWebhooks: Webhook[] = [
  {
    id: "demo-hook-1",
    project_id: "demo-project-1",
    url: "https://hooks.acme.dev/primora/issues",
    events: ["issue.created"],
    enabled: true,
    has_secret: true,
    created_at: new Date(Date.now() - 9 * 86_400_000).toISOString(),
  },
];

const demoDeliveries: WebhookDelivery[] = [
  {
    id: "demo-del-1",
    webhook_id: "demo-hook-1",
    event_type: "issue.created",
    payload: { event: "issue.created", data: { fingerprint: "9f2a1c", message: "TypeError: x is undefined" } },
    status: WebhookDelivery.status.DELIVERED,
    attempts: 1,
    last_status_code: 200,
    delivered_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
    created_at: new Date(Date.now() - 2 * 3_600_000).toISOString(),
  },
  {
    id: "demo-del-2",
    webhook_id: "demo-hook-1",
    event_type: "deploy.marker",
    payload: { event: "deploy.marker", data: { version: "0.3.0", environment: "production" } },
    status: WebhookDelivery.status.FAILED,
    attempts: 3,
    last_status_code: 503,
    last_error: "endpoint returned 503",
    created_at: new Date(Date.now() - 26 * 3_600_000).toISOString(),
  },
];

const demoJobs: ScheduledJob[] = [
  {
    id: "demo-job-1",
    project_id: "demo-project-1",
    name: "nightly-rollup",
    schedule: "0 3 * * *",
    url: "https://api.example.com/jobs/rollup",
    payload: { task: "rollup", window: "24h" },
    enabled: true,
    has_secret: true,
    last_run_at: new Date(Date.now() - 7 * 3_600_000).toISOString(),
    last_status: ScheduledJob.last_status.SUCCESS,
    next_run_at: new Date(Date.now() + 17 * 3_600_000).toISOString(),
    created_at: new Date(Date.now() - 14 * 86_400_000).toISOString(),
  },
  {
    id: "demo-job-2",
    project_id: "demo-project-1",
    name: "healthcheck-ping",
    schedule: "@every 15m",
    url: "https://status.example.com/ping",
    payload: {},
    enabled: false,
    has_secret: false,
    last_run_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    last_status: ScheduledJob.last_status.FAILED,
    created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(),
  },
];

const demoJobRuns: Record<string, ScheduledJobRun[]> = {
  "demo-job-1": [
    {
      id: "demo-run-1",
      job_id: "demo-job-1",
      status: ScheduledJobRun.status.SUCCESS,
      triggered_by: ScheduledJobRun.triggered_by.SCHEDULE,
      status_code: 200,
      duration_ms: 214,
      started_at: new Date(Date.now() - 7 * 3_600_000).toISOString(),
      finished_at: new Date(Date.now() - 7 * 3_600_000 + 214).toISOString(),
    },
    {
      id: "demo-run-2",
      job_id: "demo-job-1",
      status: ScheduledJobRun.status.FAILED,
      triggered_by: ScheduledJobRun.triggered_by.MANUAL,
      status_code: 500,
      error: "endpoint returned 500",
      duration_ms: 1024,
      started_at: new Date(Date.now() - 31 * 3_600_000).toISOString(),
      finished_at: new Date(Date.now() - 31 * 3_600_000 + 1024).toISOString(),
    },
  ],
  "demo-job-2": [
    {
      id: "demo-run-3",
      job_id: "demo-job-2",
      status: ScheduledJobRun.status.FAILED,
      triggered_by: ScheduledJobRun.triggered_by.SCHEDULE,
      error: "connection refused",
      duration_ms: 12,
      started_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      finished_at: new Date(Date.now() - 3 * 86_400_000 + 12).toISOString(),
    },
  ],
};

class DemoService {
  private delay(ms = 250) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getMe(): Promise<MeResponse> {
    await this.delay();
    return { user: demoSession.user, organizations };
  }

  async getProjectOverview(): Promise<ProjectOverview> {
    await this.delay();
    const project = organizations[0].projects[0];
    return {
      project_id: project.id,
      organization_id: organizations[0].id,
      project_slug: project.slug,
      project_name: project.name,
      member_count: projectMembers.length,
      active_api_key_count: apiKeys.filter((k) => !k.revoked_at).length,
      bucket_count: buckets.length,
      object_count: objects.length,
      object_bytes_total: objects.reduce((sum, o) => sum + o.size_bytes, 0),
      pending_invitation_count: invitations.filter((i) => i.status === OrganizationInvitation.status.PENDING).length,
      audit_events_24h: auditLogs.length,
      last_audit_at: auditLogs[0]?.created_at ?? null,
      integration_count: demoIntegrations.length,
      webhook_count: demoWebhooks.filter((w) => w.enabled).length,
    };
  }

  /* list endpoints return the unwrapped items array — mirrors `.then(r => r.items)` */
  async listOrganizationMembers() { await this.delay(); return orgMembers; }
  async listOrganizationInvitations() { await this.delay(); return invitations; }
  async listProjectMembers() { await this.delay(); return projectMembers; }
  async listApiKeys() { await this.delay(); return apiKeys; }
  async listBuckets() { await this.delay(); return buckets; }
  async listProjects() {
    await this.delay();
    return organizations[0].projects.map((p) => ({
      id: p.id,
      organization_id: organizations[0].id,
      slug: p.slug,
      name: p.name,
      description: p.description ?? null,
      membership_role: p.membershipRole ?? null,
      retention_events_days: 90,
      retention_audit_days: 90,
      retention_webhook_days: 90,
    }));
  }
  async listAuthUsers() { await this.delay(); return authUsers; }

  // Mirrors InstanceService.listInstanceSettings — representative registry
  // slice so demo mode can show the Instance settings tab.
  async listInstanceSettings(): Promise<InstanceSetting[]> {
    await this.delay();
    return [
      { key: "auth.signup_enabled", type: "bool", secret: false, is_set: false, source: "default", value: false },
      { key: "mail.from", type: "string", secret: false, is_set: false, source: "env", value: "Primora <no-reply@primora.local>" },
      { key: "mail.smtp_host", type: "string", secret: false, is_set: true, source: "app", value: "mailpit" },
      { key: "mail.smtp_password", type: "string", secret: true, is_set: false, source: "default" },
      { key: "ratelimit.user_per_minute", type: "int", secret: false, is_set: false, source: "default", value: 240 },
    ] as InstanceSetting[];
  }
  async listCollections() { await this.delay(); return collections; }
  async listDocuments() { await this.delay(); return documents; }

  /* paged endpoints return the full page envelope */
  async listBucketObjects() {
    await this.delay();
    return { items: objects, total: objects.length, limit: 25, offset: 0, has_more: false };
  }

  async listAuditLogs() {
    await this.delay();
    return { items: auditLogs, total: auditLogs.length, limit: 25, offset: 0, has_more: false };
  }

  async downloadBucketObject() {
    await this.delay();
    return new Blob(
      [`# Demo object\n\nThis file was served by Primora demo mode.\n`],
      { type: "text/markdown" },
    );
  }

  /* ---------------- mutations — update in-memory state ------------- */

  async setAuthUserRole(id: string, role: string) {
    await this.delay();
    const user = authUsers.find((u) => u.id === id);
    if (user) user.role = role;
    return user;
  }

  async setAuthUserBanned(id: string, banned: boolean) {
    await this.delay();
    const user = authUsers.find((u) => u.id === id);
    if (user) user.banned = banned;
    return user;
  }

  async removeAuthUser(id: string) {
    await this.delay();
    authUsers = authUsers.filter((u) => u.id !== id);
    return {};
  }


  async createProject(data: { requestBody?: { name?: string; slug?: string; description?: string } }) {
    await this.delay();
    const project: ProjectSummary = {
      id: `proj-${Date.now()}`,
      name: data.requestBody?.name ?? "New project",
      slug: data.requestBody?.slug ?? "new-project",
      description: data.requestBody?.description ?? null,
      membershipRole: "admin",
    };
    organizations[0].projects.push(project);
    pushAudit("project.created", "project", project.id, { name: project.name });
    return project;
  }

  async updateProject(data: { requestBody?: { name?: string; slug?: string; description?: string | null } }) {
    await this.delay();
    const project = organizations[0].projects[0];
    if (data.requestBody?.name) project.name = data.requestBody.name;
    if (data.requestBody?.slug) project.slug = data.requestBody.slug;
    if (data.requestBody?.description !== undefined) project.description = data.requestBody.description;
    pushAudit("project.updated", "project", project.id);
    return project;
  }

  async deleteProject() {
    await this.delay();
    const removed = organizations[0].projects.pop();
    if (removed) pushAudit("project.deleted", "project", removed.id, { name: removed.name });
    return {};
  }

  async createOrganization(data: { requestBody?: { name?: string; slug?: string } }) {
    await this.delay();
    const org: OrganizationSummary = {
      id: `org-${Date.now()}`,
      name: data.requestBody?.name ?? "New organization",
      slug: data.requestBody?.slug ?? "new-org",
      membershipRole: "owner",
      projects: [],
    };
    organizations.push(org);
    return org;
  }

  async updateOrganization(data: { organizationId?: string; requestBody?: { name?: string; slug?: string } }) {
    await this.delay();
    const org = organizations.find((o) => o.id === data.organizationId) ?? organizations[0];
    if (data.requestBody?.name) org.name = data.requestBody.name;
    if (data.requestBody?.slug) org.slug = data.requestBody.slug;
    return org;
  }

  async deleteOrganization(data: { organizationId?: string }) {
    await this.delay();
    organizations = organizations.filter((o) => o.id !== data.organizationId);
    return {};
  }

  async createInvitation(data: { requestBody?: { email?: string; orgRole?: OrganizationInvitation["org_role"]; projectId?: string | null; projectRole?: string | null } }) {
    await this.delay();
    const inv: OrganizationInvitation = {
      id: `inv-${Date.now()}`,
      organization_id: organizations[0].id,
      email: data.requestBody?.email ?? "invitee@example.com",
      org_role: data.requestBody?.orgRole ?? OrganizationInvitation.org_role.MEMBER,
      project_id: data.requestBody?.projectId ?? null,
      project_name: null,
      project_role: (data.requestBody?.projectRole as OrganizationInvitation["project_role"]) ?? null,
      status: OrganizationInvitation.status.PENDING,
      expires_at: inDays(7),
      created_at: new Date().toISOString(),
      invited_by_user_id: "demo-user-1",
      accepted_at: null,
    };
    invitations = [inv, ...invitations];
    pushAudit("member.invited", "invitation", inv.id, { email: inv.email });
    return { ...inv, expiresAt: inv.expires_at };
  }

  async revokeInvitation(data: { invitationId?: string }) {
    await this.delay();
    invitations = invitations.map((i) =>
      i.id === data.invitationId ? { ...i, status: OrganizationInvitation.status.EXPIRED } : i,
    );
    return {};
  }

  async acceptInvitation() { await this.delay(); return {}; }

  async updateOrganizationMemberRole(data: { userId?: string; requestBody?: { role?: OrganizationMember["role"] } }) {
    await this.delay();
    orgMembers = orgMembers.map((m) =>
      m.user_id === data.userId ? { ...m, role: data.requestBody?.role ?? m.role } : m,
    );
    pushAudit("member.role_updated", "member", data.userId ?? "");
    return {};
  }

  async removeOrganizationMember(data: { userId?: string }) {
    await this.delay();
    orgMembers = orgMembers.filter((m) => m.user_id !== data.userId);
    pushAudit("member.removed", "member", data.userId ?? "");
    return {};
  }

  async updateProjectMemberRole(data: { userId?: string; requestBody?: { role?: ProjectMember["role"] } }) {
    await this.delay();
    projectMembers = projectMembers.map((m) =>
      m.user_id === data.userId ? { ...m, role: data.requestBody?.role ?? m.role } : m,
    );
    pushAudit("member.role_updated", "member", data.userId ?? "");
    return {};
  }

  async removeProjectMember(data: { userId?: string }) {
    await this.delay();
    projectMembers = projectMembers.filter((m) => m.user_id !== data.userId);
    pushAudit("member.removed", "member", data.userId ?? "");
    return {};
  }

  async createApiKey(data: { requestBody?: { name?: string } }) {
    await this.delay();
    const key: ApiKey = {
      id: `key-${Date.now()}`,
      project_id: "proj-1",
      name: data.requestBody?.name ?? "New key",
      prefix: `pk_demo_${Math.random().toString(36).slice(2, 6)}`,
      last_used_at: null,
      revoked_at: null,
    };
    apiKeys = [key, ...apiKeys];
    pushAudit("api_key.created", "api_key", key.id, { name: key.name });
    return { ...key, secret: `sk_demo_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}` };
  }

  async revokeApiKey(data: { apiKeyId?: string }) {
    await this.delay();
    apiKeys = apiKeys.map((k) =>
      k.id === data.apiKeyId ? { ...k, revoked_at: new Date().toISOString() } : k,
    );
    pushAudit("api_key.revoked", "api_key", data.apiKeyId ?? "");
    return {};
  }

  async createBucket(data: { requestBody?: { name?: string; slug?: string; visibility?: string } }) {
    await this.delay();
    const bucket: Bucket = {
      id: `bucket-${Date.now()}`,
      project_id: "proj-1",
      name: data.requestBody?.name ?? "New bucket",
      slug: data.requestBody?.slug ?? "new-bucket",
      visibility: data.requestBody?.visibility ?? "private",
    };
    buckets = [...buckets, bucket];
    pushAudit("bucket.created", "bucket", bucket.id, { slug: bucket.slug });
    return bucket;
  }

  async updateBucket(data: { bucketId?: string; requestBody?: Partial<Bucket> }) {
    await this.delay();
    buckets = buckets.map((b) =>
      b.id === data.bucketId ? { ...b, ...data.requestBody } : b,
    );
    pushAudit("bucket.updated", "bucket", data.bucketId ?? "");
    return buckets.find((b) => b.id === data.bucketId);
  }

  async deleteBucket(data: { bucketId?: string }) {
    await this.delay();
    buckets = buckets.filter((b) => b.id !== data.bucketId);
    objects = objects.filter((o) => o.bucket_id !== data.bucketId);
    pushAudit("bucket.deleted", "bucket", data.bucketId ?? "");
    return {};
  }

  async uploadBucketObject(data: { bucketId?: string; formData?: { objectKey?: string; file?: File } }) {
    await this.delay();
    const object: BucketObject = {
      id: `obj-${Date.now()}`,
      bucket_id: data.bucketId ?? buckets[0].id,
      object_key: data.formData?.objectKey ?? data.formData?.file?.name ?? "file",
      content_type: data.formData?.file?.type || "application/octet-stream",
      size_bytes: data.formData?.file?.size ?? 0,
      checksum_sha256: Math.random().toString(16).slice(2, 8),
      created_at: new Date().toISOString(),
    };
    objects = [object, ...objects];
    pushAudit("object.uploaded", "object", object.object_key, { size_bytes: object.size_bytes });
    return object;
  }

  async updateBucketObject(data: { objectKey?: string; requestBody?: { newObjectKey?: string } }) {
    await this.delay();
    objects = objects.map((o) =>
      o.object_key === data.objectKey
        ? { ...o, object_key: data.requestBody?.newObjectKey ?? o.object_key }
        : o,
    );
    pushAudit("object.updated", "object", data.requestBody?.newObjectKey ?? data.objectKey ?? "");
    return {};
  }

  async copyBucketObject(data: { requestBody?: { objectKey?: string; newObjectKey?: string } }) {
    await this.delay();
    const source = objects.find((o) => o.object_key === data.requestBody?.objectKey);
    if (source) {
      objects = [
        { ...source, id: `obj-${Date.now()}`, object_key: data.requestBody?.newObjectKey ?? `${source.object_key}.copy`, created_at: new Date().toISOString() },
        ...objects,
      ];
    }
    pushAudit("object.uploaded", "object", data.requestBody?.newObjectKey ?? "");
    return {};
  }

  async deleteBucketObject(data: { objectKey?: string }) {
    await this.delay();
    objects = objects.filter((o) => o.object_key !== data.objectKey);
    pushAudit("object.deleted", "object", data.objectKey ?? "");
    return {};
  }

  async createCollection(data: { requestBody?: { name?: string; slug?: string; description?: string } }) {
    await this.delay();
    const collection: Collection = {
      id: `col-${Date.now()}`,
      project_id: "proj-1",
      name: data.requestBody?.name ?? "New collection",
      slug: data.requestBody?.slug ?? "new-collection",
      description: data.requestBody?.description ?? null,
      schema: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    collections = [...collections, collection];
    pushAudit("collection.created", "collection", collection.id, { slug: collection.slug });
    return collection;
  }

  async deleteCollection(data: { collectionId?: string }) {
    await this.delay();
    collections = collections.filter((c) => c.id !== data.collectionId);
    documents = documents.filter((d) => d.collection_id !== data.collectionId);
    pushAudit("collection.deleted", "collection", data.collectionId ?? "");
    return {};
  }

  async createDocument(data: { collectionId?: string; requestBody?: { data?: Record<string, unknown> } }) {
    await this.delay();
    const doc: Document = {
      id: `doc-${Date.now()}`,
      collection_id: data.collectionId ?? collections[0]?.id ?? "",
      data: data.requestBody?.data ?? {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    documents = [doc, ...documents];
    pushAudit("document.created", "document", doc.id);
    return doc;
  }

  async updateDocument(data: { documentId?: string; requestBody?: { data?: Record<string, unknown> } }) {
    await this.delay();
    documents = documents.map((d) =>
      d.id === data.documentId
        ? { ...d, data: data.requestBody?.data ?? d.data, updated_at: new Date().toISOString() }
        : d,
    );
    pushAudit("document.updated", "document", data.documentId ?? "");
    return documents.find((d) => d.id === data.documentId);
  }

  async deleteDocument(data: { documentId?: string }) {
    await this.delay();
    documents = documents.filter((d) => d.id !== data.documentId);
    pushAudit("document.deleted", "document", data.documentId ?? "");
    return {};
  }

  async bootstrapPlatform() { await this.delay(); return {}; }

  /* ---- databases (DBX) ---- */

  async getDbxStatus() {
    await this.delay();
    return { available: true, command: "dbx-mcp" };
  }

  async listDbConnections() {
    await this.delay();
    return { items: dbConnections };
  }

  async createDbConnection(data: { requestBody?: { name?: string; db_type?: string; host?: string; port?: number; database?: string; username?: string; password?: string; ssl?: boolean } }) {
    await this.delay();
    const req = data.requestBody ?? {};
    const conn: DBConnection = {
      id: `dbc-${Date.now()}`,
      project_id: "proj-1",
      name: req.name ?? "connection",
      db_type: req.db_type ?? "postgres",
      host: req.host ?? "",
      port: req.port ?? null,
      database: req.database ?? "",
      username: req.username ?? "",
      ssl: req.ssl ?? null,
      is_managed: false,
      has_password: !!req.password,
    };
    dbConnections = [...dbConnections, conn];
    pushAudit("db_connection.created", "db_connection", conn.id);
    return conn;
  }

  async deleteDbConnection(data: { connectionId?: string }) {
    await this.delay();
    dbConnections = dbConnections.filter((c) => c.id !== data.connectionId);
    pushAudit("db_connection.deleted", "db_connection", data.connectionId ?? "");
    return {};
  }

  async testDbConnection() {
    await this.delay();
    return { ok: true };
  }

  async listDbDatabases() {
    await this.delay();
    return { databases: ["primora", "postgres"] };
  }

  async listDbTables() {
    await this.delay();
    return {
      tables: demoTables.map((t) => ({ name: t, kind: "BASE TABLE" })),
    };
  }

  async describeDbTable(data: { table?: string }) {
    await this.delay();
    return {
      table: {
        columns: ["Column", "Type", "Nullable", "Key"],
        rows: demoColumns[data.table ?? ""] ?? [
          ["id", "uuid", "NO", "PK"],
          ["created_at", "timestamptz", "NO", ""],
        ],
      },
    };
  }

  async listDbForeignKeys() {
    await this.delay();
    return {
      edges: [
        { schema: "core", table: "projects", column: "organization_id", ref_schema: "core", ref_table: "organizations", ref_column: "id" },
        { schema: "core", table: "api_keys", column: "project_id", ref_schema: "core", ref_table: "projects", ref_column: "id" },
        { schema: "core", table: "audit_logs", column: "project_id", ref_schema: "core", ref_table: "projects", ref_column: "id" },
        { schema: "core", table: "audit_logs", column: "organization_id", ref_schema: "core", ref_table: "organizations", ref_column: "id" },
        { schema: "core", table: "bucket_objects", column: "bucket_id", ref_schema: "core", ref_table: "buckets", ref_column: "id" },
        { schema: "core", table: "documents", column: "collection_id", ref_schema: "core", ref_table: "collections", ref_column: "id" },
      ],
    };
  }

  async getDbSchemaContext() {
    await this.delay();
    return { context: "## users\nType: BASE TABLE\n- id uuid NOT NULL PK\n- email text NOT NULL" };
  }

  async executeDbQuery() {
    await this.delay();
    return {
      table: {
        columns: ["id", "email", "created_at"],
        rows: [
          ["a4f3…", "demo@primora.dev", "2024-01-01 00:00:00"],
          ["b8c1…", "alice@example.com", "2024-01-02 00:00:00"],
        ],
        note: "2 rows in 4ms (demo)",
      },
    };
  }

  async executeDbRedisCommand(data: { requestBody?: { command?: string } }) {
    await this.delay();
    const cmd = data.requestBody?.command ?? "";
    return { output: cmd.trim().toUpperCase() === "PING" ? "PONG" : "OK" };
  }

  /* ---- telemetry ---- */

  async ingestTelemetry(data: { requestBody?: { events?: Array<Record<string, unknown>> } }) {
    await this.delay();
    const events = data.requestBody?.events ?? [];
    events.forEach((e) => {
      demoEvents = [
        {
          id: (demoEvents[0]?.id ?? 0) + 1,
          project_id: "proj-1",
          component_id: demoComponents.find((c) => c.name === e.component)?.id ?? null,
          component_name: String(e.component ?? ""),
          type: String(e.type ?? "event"),
          severity: String(e.severity ?? "info"),
          message: String(e.message ?? ""),
          payload: (e.payload as Record<string, unknown>) ?? {},
          fingerprint: String(e.fingerprint ?? ""),
          ts: String(e.ts ?? new Date().toISOString()),
        },
        ...demoEvents,
      ];
    });
    return { accepted: events.length };
  }

  async listTelemetryEvents(data: { type?: string; component?: string; fingerprint?: string; limit?: number }) {
    await this.delay();
    let items = demoEvents;
    if (data.type) items = items.filter((e) => e.type === data.type);
    if (data.component) items = items.filter((e) => e.component_name === data.component);
    if (data.fingerprint) items = items.filter((e) => e.fingerprint === data.fingerprint);
    return { items: items.slice(0, data.limit ?? 100) };
  }

  async listTelemetryIssues() {
    await this.delay();
    const groups = new Map<string, TelemetryIssue>();
    for (const e of demoEvents.filter((e) => e.type === "error" && e.fingerprint)) {
      const fp = e.fingerprint!;
      const g = groups.get(fp);
      if (g) {
        g.count += 1;
        if (e.ts < g.first_seen) g.first_seen = e.ts;
        if (e.ts > g.last_seen) g.last_seen = e.ts;
      } else {
        groups.set(fp, {
          fingerprint: fp,
          message: e.message,
          component_id: e.component_id,
          component_name: e.component_name,
          count: 1,
          first_seen: e.ts,
          last_seen: e.ts,
          severity: e.severity,
        });
      }
    }
    return { items: [...groups.values()] };
  }

  async listTelemetryComponents() {
    await this.delay();
    return { items: demoComponents };
  }

  async deleteTelemetryComponent(data: { componentId?: string }) {
    await this.delay();
    return {};
  }

  async getTelemetryStats(data: { window?: string }): Promise<TelemetryStats> {
    await this.delay();
    const now = Date.now();
    const bucket = 900_000;
    const series = Array.from({ length: 12 }, (_, i) => ({
      ts: new Date(now - (11 - i) * bucket).toISOString(),
      counts: {
        error: i === 9 ? 2 : i % 5 === 0 ? 1 : 0,
        event: i % 3,
        metric: i * 2 + 4,
        log: i % 4,
        heartbeat: 4,
      },
    }));
    return {
      window: 86400,
      bucket_sec: 900,
      series,
      components: demoComponents,
      errors: demoEvents.filter((e) => e.type === "error").length,
      events: demoEvents.length,
      metrics: 46,
      metric_names: ["http.req.ms", "db.query.ms"],
    };
  }

  async getTelemetryMetricSeries(): Promise<{ items: MetricPoint[] }> {
    await this.delay();
    const now = Date.now();
    return {
      items: Array.from({ length: 12 }, (_, i) => {
        const avg = 110 + Math.sin(i / 2) * 40;
        return {
          ts: new Date(now - (11 - i) * 900_000).toISOString(),
          avg,
          p50: avg * 0.9,
          p95: avg * 1.8,
          max: avg * 2.2,
          count: 12 + i,
        };
      }),
    };
  }

  /* ---------------------------------------------------------- */
  /* integrations + webhooks                                    */
  /* ---------------------------------------------------------- */

  async listIntegrations(): Promise<{ items: Integration[] }> {
    await this.delay();
    return { items: demoIntegrations };
  }

  async createIntegration(data: {
    requestBody?: { name?: string; type?: string; base_url?: string; api_key?: string; site_id?: string };
  }): Promise<Integration> {
    await this.delay();
    const item: Integration = {
      id: `demo-int-${demoIntegrations.length + 1}`,
      project_id: "demo-project-1",
      type: Integration.type.RYBBIT,
      name: data.requestBody?.name ?? "connector",
      base_url: data.requestBody?.base_url ?? "https://analytics.example.com",
      site_id: data.requestBody?.site_id || undefined,
      status: Integration.status.UNKNOWN,
      has_credentials: !!data.requestBody?.api_key,
      created_at: new Date().toISOString(),
    };
    demoIntegrations.push(item);
    return item;
  }

  async deleteIntegration(data: { integrationId?: string }) {
    await this.delay();
    const idx = demoIntegrations.findIndex((i) => i.id === data.integrationId);
    if (idx >= 0) demoIntegrations.splice(idx, 1);
    return {};
  }

  async testIntegration(data: { integrationId?: string }): Promise<IntegrationTestResult> {
    await this.delay();
    const item = demoIntegrations.find((i) => i.id === data.integrationId);
    if (item) {
      item.status = Integration.status.OK;
      item.last_health_at = new Date().toISOString();
    }
    return { ok: true, status_code: 200 };
  }

  async getIntegrationAnalytics(data: { integrationId?: string; site?: string; days?: number }): Promise<IntegrationAnalytics> {
    await this.delay();
    const days = data.days ?? 30;
    const site = demoRybbitSites.find((s) => s.site_id === data.site) ?? demoRybbitSites[0];
    return {
      integration_id: data.integrationId ?? "demo-int-1",
      site,
      sites: demoRybbitSites,
      overview: {
        sessions: 18_432,
        pageviews: 61_908,
        users: 12_077,
        pages_per_session: 3.4,
        bounce_rate: 41.2,
        session_duration: 187,
      },
      series: Array.from({ length: days }, (_, i) => ({
        time: new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString(),
        sessions: 480 + Math.round(Math.sin(i / 3) * 120),
        pageviews: 1600 + Math.round(Math.sin(i / 3) * 500),
        users: 320 + Math.round(Math.sin(i / 4) * 90),
        bounce_rate: 38 + Math.sin(i / 5) * 6,
      })),
      top_pages: [
        { value: "/", count: 14_203 },
        { value: "/pricing", count: 6_811 },
        { value: "/docs/getting-started", count: 5_902 },
        { value: "/blog/launch", count: 3_114 },
      ],
      top_referrers: [
        { value: "google.com", count: 7_540 },
        { value: "news.ycombinator.com", count: 2_307 },
        { value: "github.com", count: 1_882 },
      ],
      window_days: days,
    };
  }

  async listWebhooks(): Promise<{ items: Webhook[] }> {
    await this.delay();
    return { items: demoWebhooks };
  }

  async createWebhook(data: {
    requestBody?: { url?: string; secret?: string; events?: string[]; enabled?: boolean };
  }): Promise<WebhookCreateResponse> {
    await this.delay();
    const generated = !data.requestBody?.secret;
    const hook: Webhook = {
      id: `demo-hook-${demoWebhooks.length + 1}`,
      project_id: "demo-project-1",
      url: data.requestBody?.url ?? "https://hooks.example.com/primora",
      events: data.requestBody?.events ?? [],
      enabled: data.requestBody?.enabled ?? true,
      has_secret: true,
      created_at: new Date().toISOString(),
    };
    demoWebhooks.push(hook);
    return { ...hook, secret: generated ? "demo-secret-" + Math.random().toString(36).slice(2, 18) : undefined };
  }

  async updateWebhook(data: { webhookId?: string; requestBody?: Partial<Webhook> & { secret?: string } }): Promise<WebhookCreateResponse> {
    await this.delay();
    const hook = demoWebhooks.find((w) => w.id === data.webhookId);
    if (hook && data.requestBody) {
      if (data.requestBody.url !== undefined) hook.url = data.requestBody.url;
      if (data.requestBody.events !== undefined) hook.events = data.requestBody.events;
      if (data.requestBody.enabled !== undefined) hook.enabled = data.requestBody.enabled;
      if (data.requestBody.secret !== undefined) hook.has_secret = true;
    }
    return { ...(hook as Webhook) };
  }

  async deleteWebhook(data: { webhookId?: string }) {
    await this.delay();
    const idx = demoWebhooks.findIndex((w) => w.id === data.webhookId);
    if (idx >= 0) demoWebhooks.splice(idx, 1);
    return {};
  }

  async listWebhookDeliveries(data: { webhookId?: string }): Promise<{ items: WebhookDelivery[] }> {
    await this.delay();
    return { items: demoDeliveries.filter((d) => d.webhook_id === data.webhookId) };
  }

  async testWebhook(data: { webhookId?: string }): Promise<WebhookDelivery> {
    await this.delay();
    const delivery: WebhookDelivery = {
      id: `demo-del-${Date.now()}`,
      webhook_id: data.webhookId ?? "demo-hook-1",
      event_type: "webhook.test",
      status: WebhookDelivery.status.DELIVERED,
      attempts: 1,
      last_status_code: 200,
      delivered_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    };
    demoDeliveries.unshift(delivery);
    return delivery;
  }

  async listScheduledJobs(): Promise<{ items: ScheduledJob[] }> {
    await this.delay();
    return { items: demoJobs };
  }

  async createScheduledJob(data: {
    requestBody?: { name?: string; schedule?: string; url?: string; secret?: string; payload?: Record<string, unknown>; enabled?: boolean };
  }): Promise<ScheduledJobCreateResponse> {
    await this.delay();
    const generated = !data.requestBody?.secret;
    const job: ScheduledJob = {
      id: `demo-job-${demoJobs.length + 1}`,
      project_id: "demo-project-1",
      name: data.requestBody?.name ?? "untitled",
      schedule: data.requestBody?.schedule ?? "0 * * * *",
      url: data.requestBody?.url ?? "https://example.com",
      payload: (data.requestBody?.payload ?? {}) as Record<string, never>,
      enabled: data.requestBody?.enabled ?? true,
      has_secret: true,
      last_status: null,
      next_run_at: new Date(Date.now() + 3_600_000).toISOString(),
      created_at: new Date().toISOString(),
    };
    demoJobs.push(job);
    return { ...job, secret: generated ? "demo-secret-" + Math.random().toString(36).slice(2, 18) : undefined };
  }

  async updateScheduledJob(data: { jobId?: string; requestBody?: Partial<ScheduledJob> }): Promise<ScheduledJob> {
    await this.delay();
    const job = demoJobs.find((j) => j.id === data.jobId);
    if (job && data.requestBody) {
      Object.assign(job, data.requestBody);
    }
    return job as ScheduledJob;
  }

  async deleteScheduledJob(data: { jobId?: string }) {
    await this.delay();
    const idx = demoJobs.findIndex((j) => j.id === data.jobId);
    if (idx >= 0) demoJobs.splice(idx, 1);
    return {};
  }

  async listScheduledJobRuns(data: { jobId?: string; limit?: number }): Promise<{ items: ScheduledJobRun[] }> {
    await this.delay();
    return { items: (demoJobRuns[data.jobId ?? ""] ?? []).slice(0, data.limit ?? 50) };
  }

  async runScheduledJob(data: { jobId?: string }): Promise<ScheduledJobRun> {
    await this.delay();
    const jobID = data.jobId ?? "demo-job-1";
    const run: ScheduledJobRun = {
      id: `demo-run-${Date.now()}`,
      job_id: jobID,
      status: ScheduledJobRun.status.SUCCESS,
      triggered_by: ScheduledJobRun.triggered_by.MANUAL,
      status_code: 200,
      duration_ms: Math.floor(Math.random() * 800) + 50,
      started_at: new Date().toISOString(),
      finished_at: new Date().toISOString(),
    };
    (demoJobRuns[jobID] ??= []).unshift(run);
    const job = demoJobs.find((j) => j.id === jobID);
    if (job) {
      job.last_run_at = run.started_at;
      job.last_status = ScheduledJob.last_status.SUCCESS;
    }
    return run;
  }

  async createDeployMarker(data: {
    requestBody?: { version?: string; ref?: string; environment?: string; note?: string };
  }): Promise<DeployMarker> {
    await this.delay();
    return { ...(data.requestBody ?? {}), recorded_at: new Date().toISOString() };
  }
}

export const demoService = new DemoService();
