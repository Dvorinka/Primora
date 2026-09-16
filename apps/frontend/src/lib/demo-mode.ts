/**
 * Demo mode — fully client-side workspace simulation.
 * Enabled via VITE_DEMO_MODE=true, ?demo=true, or the "Try demo mode" action.
 */

import {
  OrganizationInvitation,
  OrganizationMember,
  ProjectMember,
} from "@primora/api-client";
import type {
  ApiKey,
  AuditLog,
  Bucket,
  BucketObject,
  Collection,
  Document,
  MeResponse,
  OrganizationSummary,
  ProjectOverview,
  ProjectSummary,
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
    }));
  }
  async listAuthUsers() { await this.delay(); return authUsers; }
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
}

export const demoService = new DemoService();
