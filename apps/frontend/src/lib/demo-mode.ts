/**
 * Demo Mode - Provides mock data for testing without backend
 */

import type {
  OrganizationSummary,
  ProjectSummary,
  ProjectOverview,
  OrganizationMember,
  OrganizationInvitation,
  ProjectMember,
  ApiKey,
  Bucket,
  BucketObject,
  AuditLog,
} from "@primora/api-client";

// Check if demo mode is enabled
export const isDemoMode = () => {
  // Check environment variable first
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    return true;
  }
  
  // Check URL parameter
  const params = new URLSearchParams(window.location.search);
  if (params.get('demo') === 'true') {
    return true;
  }
  
  // Check localStorage
  return localStorage.getItem('primora_demo_mode') === 'true';
};

export const enableDemoMode = () => {
  localStorage.setItem('primora_demo_mode', 'true');
  window.location.search = '?demo=true';
};

export const disableDemoMode = () => {
  localStorage.removeItem('primora_demo_mode');
  window.location.href = window.location.pathname;
};

// Demo user session
export const demoSession = {
  user: {
    id: 'demo-user-1',
    email: 'demo@primora.dev',
    name: 'Demo User',
    emailVerified: true,
    image: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  session: {
    id: 'demo-session-1',
    userId: 'demo-user-1',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    token: 'demo-token',
    ipAddress: '127.0.0.1',
    userAgent: navigator.userAgent,
  },
};

// Demo organizations
export const demoOrganizations: OrganizationSummary[] = [
  {
    id: 'org-1',
    name: 'Acme Corporation',
    slug: 'acme-corp',
    membershipRole: 'owner',
    projects: [
      {
        id: 'proj-1',
        name: 'Production API',
        slug: 'production-api',
        description: 'Main production API service',
        membershipRole: 'admin',
      },
      {
        id: 'proj-2',
        name: 'Mobile App',
        slug: 'mobile-app',
        description: 'iOS and Android mobile application',
        membershipRole: 'developer',
      },
    ],
  },
  {
    id: 'org-2',
    name: 'Demo Workspace',
    slug: 'demo-workspace',
    membershipRole: 'admin',
    projects: [
      {
        id: 'proj-3',
        name: 'Test Project',
        slug: 'test-project',
        description: 'Testing and development',
        membershipRole: 'admin',
      },
    ],
  },
];

// Demo project overview
export const demoProjectOverview: ProjectOverview = {
  member_count: 5,
  active_api_key_count: 3,
  bucket_count: 4,
  object_count: 127,
  object_bytes_total: 45678901,
  pending_invitation_count: 2,
};

// Demo organization members
export const demoOrganizationMembers: OrganizationMember[] = [
  {
    user_id: 'demo-user-1',
    name: 'Demo User',
    email: 'demo@primora.dev',
    role: 'owner',
    joined_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    user_id: 'user-2',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'admin',
    joined_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    user_id: 'user-3',
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'member',
    joined_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo invitations
export const demoInvitations: OrganizationInvitation[] = [
  {
    id: 'inv-1',
    email: 'charlie@example.com',
    orgRole: 'member',
    projectId: null,
    projectRole: null,
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'inv-2',
    email: 'diana@example.com',
    orgRole: 'admin',
    projectId: 'proj-1',
    projectRole: 'developer',
    status: 'pending',
    expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo project members
export const demoProjectMembers: ProjectMember[] = [
  {
    user_id: 'demo-user-1',
    name: 'Demo User',
    email: 'demo@primora.dev',
    role: 'admin',
    joined_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    user_id: 'user-2',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'developer',
    joined_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    user_id: 'user-3',
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'viewer',
    joined_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo API keys
export const demoApiKeys: ApiKey[] = [
  {
    id: 'key-1',
    name: 'Production Key',
    prefix: 'pk_live_',
    revoked_at: null,
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'key-2',
    name: 'Development Key',
    prefix: 'pk_test_',
    revoked_at: null,
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'key-3',
    name: 'Old Key',
    prefix: 'pk_old_',
    revoked_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo buckets
export const demoBuckets: Bucket[] = [
  {
    id: 'bucket-1',
    name: 'User Avatars',
    slug: 'avatars',
    visibility: 'public',
    created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'bucket-2',
    name: 'Documents',
    slug: 'documents',
    visibility: 'private',
    created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'bucket-3',
    name: 'Media Files',
    slug: 'media',
    visibility: 'public',
    created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo objects
export const demoObjects: BucketObject[] = [
  {
    object_key: 'profile/user-123.jpg',
    size_bytes: 245678,
    content_type: 'image/jpeg',
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    object_key: 'profile/user-456.png',
    size_bytes: 189234,
    content_type: 'image/png',
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    object_key: 'documents/report-2024.pdf',
    size_bytes: 1234567,
    content_type: 'application/pdf',
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    object_key: 'config/settings.json',
    size_bytes: 4567,
    content_type: 'application/json',
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo audit logs
export const demoAuditLogs: AuditLog[] = [
  {
    id: 'log-1',
    action: 'object.created',
    resource_type: 'object',
    resource_id: 'profile/user-123.jpg',
    actor_id: 'demo-user-1',
    actor_name: 'Demo User',
    request_id: 'req-abc123',
    metadata: { bucket_id: 'bucket-1', size_bytes: 245678 },
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-2',
    action: 'api_key.created',
    resource_type: 'api_key',
    resource_id: 'key-2',
    actor_id: 'user-2',
    actor_name: 'Alice Johnson',
    request_id: 'req-def456',
    metadata: { key_name: 'Development Key' },
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-3',
    action: 'member.invited',
    resource_type: 'invitation',
    resource_id: 'inv-1',
    actor_id: 'demo-user-1',
    actor_name: 'Demo User',
    request_id: 'req-ghi789',
    metadata: { email: 'charlie@example.com', role: 'member' },
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'log-4',
    action: 'bucket.created',
    resource_type: 'bucket',
    resource_id: 'bucket-3',
    actor_id: 'demo-user-1',
    actor_name: 'Demo User',
    request_id: 'req-jkl012',
    metadata: { bucket_name: 'Media Files', visibility: 'public' },
    created_at: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  },
];

// Demo service - simulates API calls with delays
export class DemoService {
  private delay(ms: number = 300) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async getMe() {
    await this.delay();
    return {
      user: demoSession.user,
      organizations: demoOrganizations,
    };
  }

  async getProjectOverview() {
    await this.delay();
    return demoProjectOverview;
  }

  async listOrganizationMembers() {
    await this.delay();
    return { items: demoOrganizationMembers };
  }

  async listOrganizationInvitations() {
    await this.delay();
    return { items: demoInvitations };
  }

  async listProjectMembers() {
    await this.delay();
    return { items: demoProjectMembers };
  }

  async listApiKeys() {
    await this.delay();
    return { items: demoApiKeys };
  }

  async listBuckets() {
    await this.delay();
    return { items: demoBuckets };
  }

  async listBucketObjects() {
    await this.delay();
    return {
      items: demoObjects,
      total: demoObjects.length,
      has_more: false,
    };
  }

  async listAuditLogs() {
    await this.delay();
    return {
      items: demoAuditLogs,
      total: demoAuditLogs.length,
      has_more: false,
    };
  }

  async listProjects() {
    await this.delay();
    return { items: demoOrganizations[0].projects };
  }

  // Mock mutation methods
  async createProject(data: any) {
    await this.delay();
    return {
      id: `proj-${Date.now()}`,
      ...data,
    };
  }

  async updateProject(data: any) {
    await this.delay();
    return data;
  }

  async deleteProject() {
    await this.delay();
    return { success: true };
  }

  async createInvitation(data: any) {
    await this.delay();
    return {
      id: `inv-${Date.now()}`,
      ...data,
      status: 'pending',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
  }

  async createApiKey(data: any) {
    await this.delay();
    return {
      id: `key-${Date.now()}`,
      prefix: 'pk_demo_',
      secret: 'sk_demo_1234567890abcdefghijklmnopqrstuvwxyz',
      ...data,
      revoked_at: null,
      created_at: new Date().toISOString(),
    };
  }

  async createBucket(data: any) {
    await this.delay();
    return {
      id: `bucket-${Date.now()}`,
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async uploadBucketObject(data: any) {
    await this.delay();
    return {
      object_key: data.objectKey,
      size_bytes: data.file?.size || 0,
      content_type: data.file?.type || 'application/octet-stream',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  // Other mock methods that just return success
  async updateOrganization(data: any) {
    await this.delay();
    return {
      id: data.organizationId || 'org-1',
      name: data.requestBody?.name || 'Updated Org',
      slug: data.requestBody?.slug || 'updated-org',
      membershipRole: 'owner',
      projects: [],
    };
  }

  async deleteOrganization() {
    await this.delay();
    return { success: true };
  }

  async createOrganization(data: any) {
    await this.delay();
    return {
      id: `org-${Date.now()}`,
      name: data.requestBody?.name || 'New Organization',
      slug: data.requestBody?.slug || 'new-org',
      membershipRole: 'owner',
      projects: [],
    };
  }

  async revokeInvitation() {
    await this.delay();
    return { success: true };
  }

  async acceptInvitation() {
    await this.delay();
    return { success: true };
  }

  async updateOrganizationMemberRole() {
    await this.delay();
    return { success: true };
  }

  async removeOrganizationMember() {
    await this.delay();
    return { success: true };
  }

  async updateProjectMemberRole() {
    await this.delay();
    return { success: true };
  }

  async removeProjectMember() {
    await this.delay();
    return { success: true };
  }

  async revokeApiKey() {
    await this.delay();
    return { success: true };
  }

  async updateBucket(data: any) {
    await this.delay();
    return {
      id: data.bucketId || 'bucket-1',
      ...data.requestBody,
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async deleteBucket() {
    await this.delay();
    return { success: true };
  }

  async updateBucketObject() {
    await this.delay();
    return { success: true };
  }

  async copyBucketObject() {
    await this.delay();
    return { success: true };
  }

  async deleteBucketObject() {
    await this.delay();
    return { success: true };
  }

  async downloadBucketObject() {
    await this.delay();
    // Return a mock blob
    return new Blob(['Demo file content'], { type: 'text/plain' });
  }

  async bootstrapPlatform(data: any) {
    await this.delay();
    return {
      organization: {
        id: 'org-bootstrap',
        name: data.requestBody?.organizationName || 'Bootstrap Org',
        slug: data.requestBody?.organizationSlug || 'bootstrap-org',
      },
      project: {
        id: 'proj-bootstrap',
        name: data.requestBody?.projectName || 'Bootstrap Project',
        slug: data.requestBody?.projectSlug || 'bootstrap-project',
      },
    };
  }
}

export const demoService = new DemoService();
