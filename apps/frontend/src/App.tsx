import {
  ApiError,
  CollectionsService,
  CopyBucketObjectRequest,
  CreateBucketRequest,
  CreateInvitationRequest,
  CreateOrganizationRequest,
  HealthService,
  OrganizationsService,
  PlatformService,
  ProjectsService,
  StorageService,
  UpdateBucketObjectRequest,
  UpdateBucketRequest,
  UpdateOrganizationMemberRoleRequest,
  UpdateOrganizationRequest,
  UpdateProjectMemberRoleRequest,
  UpdateProjectRequest,
  type ApiKey,
  type AuditLog,
  type Bucket,
  type BucketObject,
  type Collection,
  type Document,
  type OrganizationMember,
  type OrganizationInvitation,
  type OrganizationSummary,
  type ProjectMember,
  type ProjectOverview,
  type ProjectSummary,
} from "@primora/api-client";
import { For, Show, createEffect, createMemo, createResource, createSignal, onCleanup } from "solid-js";

import { authClient, fetchApiToken } from "./lib/auth-client";
import { configureApiToken } from "./lib/api";
import { isDemoMode, disableDemoMode, demoSession, demoService } from "./lib/demo-mode";
import {
  Button,
  Card,
  CardHeader,
  StatCard,
  Input,
  Textarea,
  Select,
  FileInput,
  Badge,
  StatusBadge,
  Layout,
  Sidebar,
  Header,
  PageHeader,
  EmptyState,
  Message,
  Loading,
  NetworkError,
  DemoBanner,
  OnboardingModal,
  ProjectDashboard,
} from "./components";
import {
  ProjectsPage,
  MembersPage,
  StoragePage,
  SettingsPage,
  AuditPage,
  CollectionsPage,
} from "./pages";

const OBJECTS_PAGE_SIZE = 25;
const AUDIT_PAGE_SIZE = 25;
const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;

type ObjectPreview =
  | { kind: "image"; objectURL: string }
  | { kind: "text"; text: string; truncated: boolean }
  | { kind: "unsupported"; message: string };

type ViewType = "dashboard" | "projects" | "members" | "storage" | "collections" | "audit" | "settings";

// Icon components
const Icons = {
  Dashboard: () => (
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  Projects: () => (
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
  Users: () => (
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  Storage: () => (
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 3h4m-4 4h4" />
    </svg>
  ),
  Audit: () => (
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  Collections: () => (
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  Settings: () => (
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Logout: () => (
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  Plus: () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
  ),
  Refresh: () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  Download: () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  ),
  Trash: () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  Copy: () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  Eye: () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  Check: () => (
    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
    </svg>
  ),
  AlertCircle: () => (
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Menu: () => (
    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    const message = error.body?.error?.message;
    if (typeof message === "string" && message.length > 0) {
      return message;
    }
    return `${fallback} (${error.status})`;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "n/a";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "n/a";
  return date.toLocaleString();
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 1024) return `${Math.max(0, Math.round(value))} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = value / 1024;
  let unitIndex = 0;
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024;
    unitIndex += 1;
  }
  return `${amount.toFixed(amount >= 100 ? 0 : amount >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

function encodeObjectKeyPath(objectKey: string) {
  return objectKey
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function getObjectDownloadURL(bucketID: string, objectKey: string) {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(/\/+$/, "");
  const path = `${base}/buckets/${bucketID}/objects/${encodeObjectKeyPath(objectKey)}`;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${window.location.origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

export default function App() {
  const isDemo = isDemoMode();
  const session = isDemo ? () => ({ data: demoSession, isPending: false, error: null }) : authClient.useSession();
  const [mode, setMode] = createSignal<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [name, setName] = createSignal("");
  const [activeView, setActiveView] = createSignal<ViewType>("dashboard");
  const [showOnboarding, setShowOnboarding] = createSignal(false);
  const [authMessage, setAuthMessage] = createSignal("");
  const [platformMessage, setPlatformMessage] = createSignal("");
  const [organizationMessage, setOrganizationMessage] = createSignal("");
  const [bootstrapMessage, setBootstrapMessage] = createSignal("");
  const [projectMessage, setProjectMessage] = createSignal("");
  const [inviteMessage, setInviteMessage] = createSignal("");
  const [apiKeyMessage, setApiKeyMessage] = createSignal("");
  const [storageMessage, setStorageMessage] = createSignal("");
  const [memberMessage, setMemberMessage] = createSignal("");
  const [apiKeySecret, setApiKeySecret] = createSignal("");
  const [collectionsMessage, setCollectionsMessage] = createSignal("");
  const [selectedOrganizationID, setSelectedOrganizationID] = createSignal<string | undefined>();
  const [selectedProjectID, setSelectedProjectID] = createSignal<string | undefined>();
  const [selectedBucketID, setSelectedBucketID] = createSignal<string | undefined>();
  const [selectedCollectionID, setSelectedCollectionID] = createSignal<string | undefined>();
  const [collectionInput, setCollectionInput] = createSignal({
    name: "",
    slug: "",
    description: "",
  });
  const [selectedObjectKey, setSelectedObjectKey] = createSignal<string | undefined>();
  const [objectOffset, setObjectOffset] = createSignal(0);
  const [objectSearch, setObjectSearch] = createSignal("");
  const [projectSearch, setProjectSearch] = createSignal("");
  const [bucketSearch, setBucketSearch] = createSignal("");
  const [auditOffset, setAuditOffset] = createSignal(0);
  const [auditSearch, setAuditSearch] = createSignal("");
  const [auditAction, setAuditAction] = createSignal("");
  const [selectedFile, setSelectedFile] = createSignal<File | undefined>();
  const [moveDestinationBucketID, setMoveDestinationBucketID] = createSignal("");
  const [renameObjectKeyInput, setRenameObjectKeyInput] = createSignal("");
  const [pendingOperations, setPendingOperations] = createSignal<Record<string, boolean>>({});
  const [networkError, setNetworkError] = createSignal<string | null>(null);

  function isPending(key: string) {
    return pendingOperations()[key] === true;
  }

  function isPendingPrefix(prefix: string) {
    return Object.keys(pendingOperations()).some((key) => key.startsWith(prefix));
  }

  async function runPending<T>(key: string, operation: () => Promise<T>): Promise<T | undefined> {
    if (isPending(key)) return undefined;
    setPendingOperations((current) => ({ ...current, [key]: true }));
    try {
      return await operation();
    } finally {
      setPendingOperations((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  const invitationToken = createMemo(() => {
    const match = window.location.pathname.match(/^\/invite\/([^/?#]+)/);
    if (!match?.[1]) {
      return null;
    }
    return decodeURIComponent(match[1]);
  });

  const [bootstrapInput, setBootstrapInput] = createSignal({
    organizationName: "Primora Lab",
    organizationSlug: "primora-lab",
    projectName: "Core",
    projectSlug: "core",
    description: "Initial Primora control project",
  });

  const [projectInput, setProjectInput] = createSignal({
    name: "",
    slug: "",
    description: "",
  });
  const [projectEditInput, setProjectEditInput] = createSignal({
    name: "",
    slug: "",
    description: "",
  });
  const [organizationInput, setOrganizationInput] = createSignal({
    name: "",
    slug: "",
  });
  const [organizationEditInput, setOrganizationEditInput] = createSignal({
    name: "",
    slug: "",
  });

  const [invitationInput, setInvitationInput] = createSignal({
    email: "",
    orgRole: CreateInvitationRequest.orgRole.MEMBER,
    attachProject: false,
    projectRole: CreateInvitationRequest.projectRole.DEVELOPER,
  });

  const [apiKeyName, setApiKeyName] = createSignal("Frontend key");
  const [bucketInput, setBucketInput] = createSignal({
    name: "assets",
    slug: "assets",
    visibility: CreateBucketRequest.visibility.PRIVATE,
  });
  const [bucketEditInput, setBucketEditInput] = createSignal({
    name: "",
    slug: "",
    visibility: UpdateBucketRequest.visibility.PRIVATE,
  });

  const [health] = createResource(async () => {
    if (isDemo) return { status: 'ok' };
    try {
      return await HealthService.getReadiness();
    } catch (error) {
      setNetworkError(getErrorMessage(error, "Failed to connect to server"));
      return { status: 'error' };
    }
  });
  const [platform, { refetch: refetchPlatform }] = createResource(
    () => session()?.data?.user.id ?? null,
    async () => {
      if (isDemo) return await demoService.getMe();
      try {
        return await PlatformService.getMe();
      } catch (error) {
        setNetworkError(getErrorMessage(error, "Failed to load platform data"));
        throw error;
      }
    },
  );

  const activeOrganization = createMemo<OrganizationSummary | undefined>(() =>
    platform()?.organizations.find((item) => item.id === selectedOrganizationID()),
  );
  const [organizationProjects, { refetch: refetchOrganizationProjects }] = createResource(
    () => {
      const organizationID = activeOrganization()?.id;
      if (!organizationID) return null;
      return {
        organizationID,
        query: projectSearch().trim(),
      };
    },
    async (source) => {
      if (isDemo) return await demoService.listProjects();
      return ProjectsService.listProjects({
        organizationId: source.organizationID,
        q: source.query.length > 0 ? source.query : undefined,
      }).then((result) => result.items);
    },
  );
  const availableProjects = createMemo<ProjectSummary[]>(() => {
    const items = organizationProjects();
    if (!items) {
      return activeOrganization()?.projects ?? [];
    }
    return items.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description ?? undefined,
      membershipRole: project.membership_role ?? undefined,
    }));
  });
  const activeProject = createMemo<ProjectSummary | undefined>(() =>
    availableProjects().find((item) => item.id === selectedProjectID()),
  );
  const canUpdateOrganization = createMemo(() => {
    const role = activeOrganization()?.membershipRole;
    return role === "owner" || role === "admin";
  });
  const canUpdateProject = createMemo(() => activeProject()?.membershipRole === "admin");
  const canUpdateBucket = createMemo(() => {
    const role = activeProject()?.membershipRole;
    return role === "admin" || role === "developer";
  });
  const authPending = createMemo(() => isPendingPrefix("auth-"));
  const workspacePending = createMemo(() => isPendingPrefix("workspace-"));
  const projectPending = createMemo(() => isPendingPrefix("project-"));
  const invitationPending = createMemo(() => isPendingPrefix("invite-"));
  const membersPending = createMemo(() => isPendingPrefix("member-"));
  const apiKeyPending = createMemo(() => isPendingPrefix("apikey-"));
  const storagePending = createMemo(() => isPendingPrefix("storage-"));
  const collectionPending = createMemo(() => isPendingPrefix("collection-"));
  const documentPending = createMemo(() => isPendingPrefix("document-"));

  const [apiKeys, { refetch: refetchAPIKeys }] = createResource(
    () => activeProject()?.id ?? null,
    async (projectID) => {
      if (isDemo) return await demoService.listApiKeys();
      return ProjectsService.listApiKeys({ projectId: projectID }).then((result) => result.items);
    },
  );
  const [projectOverview, { refetch: refetchProjectOverview }] = createResource(
    () => activeProject()?.id ?? null,
    async (projectID) => {
      if (isDemo) return await demoService.getProjectOverview();
      return ProjectsService.getProjectOverview({ projectId: projectID });
    },
  );
  const [organizationMembers, { refetch: refetchOrganizationMembers }] = createResource(
    () => activeOrganization()?.id ?? null,
    async (organizationID) => {
      if (isDemo) return await demoService.listOrganizationMembers();
      return OrganizationsService.listOrganizationMembers({ organizationId: organizationID }).then((result) => result.items);
    },
  );
  const [organizationInvitations, { refetch: refetchOrganizationInvitations }] = createResource(
    () => activeOrganization()?.id ?? null,
    async (organizationID) => {
      if (isDemo) return await demoService.listOrganizationInvitations();
      return OrganizationsService.listOrganizationInvitations({ organizationId: organizationID }).then((result) => result.items);
    },
  );
  const [projectMembers, { refetch: refetchProjectMembers }] = createResource(
    () => activeProject()?.id ?? null,
    async (projectID) => {
      if (isDemo) return await demoService.listProjectMembers();
      return ProjectsService.listProjectMembers({ projectId: projectID }).then((result) => result.items);
    },
  );
  const [buckets, { refetch: refetchBuckets }] = createResource(
    () => {
      const projectID = activeProject()?.id;
      if (!projectID) return null;
      return {
        projectID,
        query: bucketSearch().trim(),
      };
    },
    async (source) => {
      if (isDemo) return await demoService.listBuckets();
      return StorageService.listBuckets({
        projectId: source.projectID,
        q: source.query.length > 0 ? source.query : undefined,
      }).then((result) => result.items);
    },
  );
  const activeBucket = createMemo<Bucket | undefined>(() => (buckets() ?? []).find((item) => item.id === selectedBucketID()));
  const [objectsPage, { refetch: refetchObjectsPage }] = createResource(
    () => {
      const bucketID = selectedBucketID();
      if (!bucketID) return null;
      return {
        bucketID,
        query: objectSearch().trim(),
        offset: objectOffset(),
      };
    },
    async (source) => {
      if (isDemo) return await demoService.listBucketObjects();
      return StorageService.listBucketObjects({
        bucketId: source.bucketID,
        q: source.query.length > 0 ? source.query : undefined,
        limit: OBJECTS_PAGE_SIZE,
        offset: source.offset,
      });
    },
  );
  const objects = createMemo(() => objectsPage()?.items ?? []);
  const selectedObject = createMemo<BucketObject | undefined>(() =>
    objects().find((item) => item.object_key === selectedObjectKey()),
  );
  const [objectPreview] = createResource(
    () => {
      const bucketID = selectedBucketID();
      const object = selectedObject();
      if (!bucketID || !object) return null;
      return {
        bucketID,
        objectKey: object.object_key,
        contentType: object.content_type,
        sizeBytes: object.size_bytes,
      };
    },
    async (source): Promise<ObjectPreview> => {
      const blob = isDemo 
        ? await demoService.downloadBucketObject()
        : await StorageService.downloadBucketObject({
            bucketId: source.bucketID,
            objectKey: source.objectKey,
          });
      const contentType = (source.contentType || blob.type || "application/octet-stream").toLowerCase();

      if (contentType.startsWith("image/")) {
        return {
          kind: "image",
          objectURL: URL.createObjectURL(blob),
        };
      }

      const supportsTextPreview =
        contentType.startsWith("text/") ||
        contentType.includes("json") ||
        contentType.includes("xml") ||
        contentType.includes("yaml") ||
        contentType.includes("javascript");

      if (!supportsTextPreview) {
        return {
          kind: "unsupported",
          message: `No inline preview for ${source.contentType || "this content type"}.`,
        };
      }

      if (source.sizeBytes > MAX_TEXT_PREVIEW_BYTES) {
        return {
          kind: "unsupported",
          message: `Text preview disabled for files larger than ${formatBytes(MAX_TEXT_PREVIEW_BYTES)}.`,
        };
      }

      const content = await blob.text();
      const maxChars = 12000;
      return {
        kind: "text",
        text: content.slice(0, maxChars),
        truncated: content.length > maxChars,
      };
    },
  );
  const [auditLogsPage, { refetch: refetchAuditLogsPage }] = createResource(
    () => {
      const projectID = activeProject()?.id;
      if (!projectID) return null;
      return {
        projectID,
        query: auditSearch().trim(),
        action: auditAction().trim(),
        offset: auditOffset(),
      };
    },
    async (source) => {
      if (isDemo) return await demoService.listAuditLogs();
      return ProjectsService.listAuditLogs({
        projectId: source.projectID,
        q: source.query.length > 0 ? source.query : undefined,
        action: source.action.length > 0 ? source.action : undefined,
        limit: AUDIT_PAGE_SIZE,
        offset: source.offset,
      });
    },
  );
  const auditLogs = createMemo(() => auditLogsPage()?.items ?? []);
  const refetchObjects = refetchObjectsPage;
  const refetchAuditLogs = refetchAuditLogsPage;

  const [collections, { refetch: refetchCollections }] = createResource(
    () => activeProject()?.id ?? null,
    async (projectID) => {
      if (isDemo) return [];
      return CollectionsService.listCollections({ projectId: projectID }).then(res => res.items);
    }
  );

  const [documents, { refetch: refetchDocuments }] = createResource(
    () => selectedCollectionID() ?? null,
    async (collectionID) => {
      if (isDemo) return [];
      return CollectionsService.listDocuments({ collectionId: collectionID }).then(res => res.items);
    }
  );

  createEffect(() => {
    if (!isDemo) {
      configureApiToken(session()?.data ? fetchApiToken : undefined);
    }
  });

  createEffect(() => {
    if (session()?.data) {
      setAuthMessage("");
    }
  });

  createEffect(() => {
    const organizations = platform()?.organizations ?? [];
    if (organizations.length === 0) {
      setSelectedOrganizationID(undefined);
      setSelectedProjectID(undefined);
      return;
    }

    const currentOrganization = organizations.find((item) => item.id === selectedOrganizationID()) ?? organizations[0];
    setSelectedOrganizationID(currentOrganization.id);
  });

  createEffect(() => {
    const projects = availableProjects();
    if (projects.length === 0) {
      setSelectedProjectID(undefined);
      return;
    }
    const currentProject = projects.find((item) => item.id === selectedProjectID()) ?? projects[0];
    setSelectedProjectID(currentProject?.id);
  });

  createEffect(() => {
    const organization = activeOrganization();
    if (!organization) {
      setOrganizationEditInput({ name: "", slug: "" });
      return;
    }
    setOrganizationEditInput({
      name: organization.name,
      slug: organization.slug,
    });
  });

  createEffect(() => {
    const project = activeProject();
    if (!project) {
      setProjectEditInput({ name: "", slug: "", description: "" });
      return;
    }
    setProjectEditInput({
      name: project.name,
      slug: project.slug,
      description: project.description ?? "",
    });
  });

  createEffect(() => {
    const bucketList = buckets() ?? [];
    const currentBucket = bucketList.find((item) => item.id === selectedBucketID()) ?? bucketList[0];
    setSelectedBucketID(currentBucket?.id);
  });

  createEffect(() => {
    const bucket = activeBucket();
    if (!bucket) {
      setBucketEditInput({
        name: "",
        slug: "",
        visibility: UpdateBucketRequest.visibility.PRIVATE,
      });
      return;
    }
    setBucketEditInput({
      name: bucket.name,
      slug: bucket.slug,
      visibility: bucket.visibility as UpdateBucketRequest.visibility,
    });
  });

  createEffect(() => {
    selectedBucketID();
    setObjectOffset(0);
    setSelectedObjectKey(undefined);
  });

  createEffect(() => {
    objectSearch();
    setObjectOffset(0);
  });

  createEffect(() => {
    projectSearch();
    setSelectedProjectID(undefined);
  });

  createEffect(() => {
    bucketSearch();
    setSelectedBucketID(undefined);
  });

  createEffect(() => {
    activeProject()?.id;
    setSelectedCollectionID(undefined);
  });

  createEffect(() => {
    const list = collections() ?? [];
    const current = list.find((item) => item.id === selectedCollectionID()) ?? list[0];
    setSelectedCollectionID(current?.id);
  });

  createEffect(() => {
    activeProject()?.id;
    setAuditOffset(0);
  });

  createEffect(() => {
    auditSearch();
    setAuditOffset(0);
  });

  createEffect(() => {
    auditAction();
    setAuditOffset(0);
  });

  createEffect(() => {
    const objectList = objects();
    if (objectList.length === 0) {
      setSelectedObjectKey(undefined);
      return;
    }
    const current = objectList.find((item) => item.object_key === selectedObjectKey()) ?? objectList[0];
    setSelectedObjectKey(current?.object_key);
  });

  createEffect(() => {
    const current = selectedObject();
    setRenameObjectKeyInput(current?.object_key ?? "");
    setMoveDestinationBucketID(selectedBucketID() ?? "");
  });

  createEffect((previousImageURL: string | undefined) => {
    const preview = objectPreview();
    const nextImageURL = preview?.kind === "image" ? preview.objectURL : undefined;
    if (previousImageURL && previousImageURL !== nextImageURL) {
      URL.revokeObjectURL(previousImageURL);
    }
    return nextImageURL;
  });

  onCleanup(() => {
    const preview = objectPreview();
    if (preview?.kind === "image") {
      URL.revokeObjectURL(preview.objectURL);
    }
  });

  createEffect(() => {
    const hasActiveProject = Boolean(activeProject()?.id);
    if (!hasActiveProject && invitationInput().attachProject) {
      setInvitationInput((current) => ({ ...current, attachProject: false }));
    }
  });

  async function refreshContext() {
    await runPending("workspace-refresh", async () => {
      setPlatformMessage("");
      await refetchPlatform();
      await refetchOrganizationProjects();
    });
  }

  async function refreshProjectOverviewSnapshot() {
    if (!activeProject()?.id) return;
    await refetchProjectOverview();
  }

  async function handleAuthSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (isDemo) {
      setAuthMessage("Demo mode is active - authentication is simulated");
      return;
    }
    await runPending("auth-submit", async () => {
      setAuthMessage("");

      try {
        if (mode() === "sign-up") {
          await authClient.signUp.email({
            email: email(),
            password: password(),
            name: name(),
          });
          setAuthMessage("Account created. Check Mailpit or your email provider for verification.");
        } else {
          await authClient.signIn.email({
            email: email(),
            password: password(),
          });
        }
      } catch (error) {
        setAuthMessage(getErrorMessage(error, "Authentication failed"));
      }
    });
  }

  async function bootstrapPlatform(event: SubmitEvent) {
    event.preventDefault();
    await runPending("workspace-bootstrap", async () => {
      setBootstrapMessage("");

      try {
        await PlatformService.bootstrapPlatform({
          requestBody: bootstrapInput(),
        });
        await refetchPlatform();
        setBootstrapMessage("Platform bootstrapped.");
      } catch (error) {
        setBootstrapMessage(getErrorMessage(error, "Bootstrap failed"));
      }
    });
  }

  async function createProject(event: SubmitEvent) {
    event.preventDefault();
    const organizationID = activeOrganization()?.id;
    if (!organizationID) return;
    await runPending("project-create", async () => {
      setProjectMessage("");
      try {
        const created = await ProjectsService.createProject({
          organizationId: organizationID,
          requestBody: {
            name: projectInput().name,
            slug: projectInput().slug,
            description: projectInput().description || undefined,
          },
        });
        await refetchPlatform();
        await refetchOrganizationProjects();
        setSelectedProjectID(created.id);
        setProjectInput({ name: "", slug: "", description: "" });
        await refetchProjectMembers();
        await refreshProjectOverviewSnapshot();
        setProjectMessage("Project created.");
        setShowOnboarding(true);
      } catch (error) {
        setProjectMessage(getErrorMessage(error, "Project creation failed"));
      }
    });
  }

  async function updateActiveProject(event: SubmitEvent) {
    event.preventDefault();
    const project = activeProject();
    if (!project) return;

    await runPending("project-update", async () => {
      setProjectMessage("");
      try {
        const trimmedDescription = projectEditInput().description.trim();
        await ProjectsService.updateProject({
          projectId: project.id,
          requestBody: {
            name: projectEditInput().name,
            slug: projectEditInput().slug,
            description: trimmedDescription.length > 0 ? trimmedDescription : null,
          } as UpdateProjectRequest,
        });
        await refetchPlatform();
        await refetchOrganizationProjects();
        await refetchProjectOverview();
        setProjectMessage(`Project "${projectEditInput().name}" updated.`);
      } catch (error) {
        setProjectMessage(getErrorMessage(error, "Project update failed"));
      }
    });
  }

  async function deleteActiveOrganization() {
    const organization = activeOrganization();
    if (!organization) return;
    if (
      !window.confirm(
        `Delete organization "${organization.name}"? This permanently removes all projects, members, API keys, buckets, objects, invitations, and audit logs.`,
      )
    ) {
      return;
    }

    await runPending("workspace-delete-organization", async () => {
      setPlatformMessage("");
      try {
        await OrganizationsService.deleteOrganization({
          organizationId: organization.id,
        });
        await refetchPlatform();
        setSelectedBucketID(undefined);
        setPlatformMessage(`Organization "${organization.name}" deleted.`);
      } catch (error) {
        setPlatformMessage(getErrorMessage(error, "Organization deletion failed"));
      }
    });
  }

  async function createOrganization(event: SubmitEvent) {
    event.preventDefault();
    await runPending("workspace-create-organization", async () => {
      setOrganizationMessage("");
      try {
        const created = await OrganizationsService.createOrganization({
          requestBody: {
            name: organizationInput().name,
            slug: organizationInput().slug,
          } as CreateOrganizationRequest,
        });
        await refetchPlatform();
        setSelectedOrganizationID(created.id);
        setSelectedProjectID(undefined);
        setOrganizationInput({ name: "", slug: "" });
        setOrganizationMessage(`Organization "${created.name}" created.`);
      } catch (error) {
        setOrganizationMessage(getErrorMessage(error, "Organization creation failed"));
      }
    });
  }

  async function updateActiveOrganization(event: SubmitEvent) {
    event.preventDefault();
    const organization = activeOrganization();
    if (!organization) return;

    await runPending("workspace-update-organization", async () => {
      setOrganizationMessage("");
      try {
        await OrganizationsService.updateOrganization({
          organizationId: organization.id,
          requestBody: {
            name: organizationEditInput().name,
            slug: organizationEditInput().slug,
          } as UpdateOrganizationRequest,
        });
        await refetchPlatform();
        setOrganizationMessage(`Organization "${organizationEditInput().name}" updated.`);
      } catch (error) {
        setOrganizationMessage(getErrorMessage(error, "Organization update failed"));
      }
    });
  }

  async function deleteActiveProject() {
    const project = activeProject();
    if (!project) return;
    if (!window.confirm(`Delete project "${project.name}"? This permanently removes memberships, API keys, buckets, objects, and audit history.`)) {
      return;
    }

    await runPending("project-delete", async () => {
      setProjectMessage("");
      try {
        await ProjectsService.deleteProject({
          projectId: project.id,
        });
        await refetchPlatform();
        await refetchOrganizationProjects();
        setSelectedBucketID(undefined);
        setProjectMessage(`Project "${project.name}" deleted.`);
      } catch (error) {
        setProjectMessage(getErrorMessage(error, "Project deletion failed"));
      }
    });
  }

  async function createInvitation(event: SubmitEvent) {
    event.preventDefault();
    const organizationID = activeOrganization()?.id;
    if (!organizationID) return;

    await runPending("invite-create", async () => {
      setInviteMessage("");
      try {
        const response = await OrganizationsService.createInvitation({
          organizationId: organizationID,
          requestBody: {
            email: invitationInput().email,
            orgRole: invitationInput().orgRole,
            projectId: invitationInput().attachProject && activeProject()?.id ? activeProject()?.id ?? null : null,
            projectRole: invitationInput().attachProject && activeProject()?.id ? invitationInput().projectRole : null,
          },
        });
        await refetchOrganizationInvitations();
        await refreshProjectOverviewSnapshot();
        setInvitationInput((current) => ({ ...current, email: "" }));
        setInviteMessage(`Invitation sent to ${response.email}. Expires ${formatDate(response.expiresAt)}.`);
      } catch (error) {
        setInviteMessage(getErrorMessage(error, "Invitation failed"));
      }
    });
  }

  async function revokeInvitation(invitationID: string) {
    const organizationID = activeOrganization()?.id;
    if (!organizationID) return;
    if (!window.confirm("Revoke this invitation? The invite link will stop working.")) return;

    await runPending(`invite-revoke-${invitationID}`, async () => {
      setInviteMessage("");
      try {
        await OrganizationsService.revokeInvitation({
          organizationId: organizationID,
          invitationId: invitationID,
        });
        await refetchOrganizationInvitations();
        await refreshProjectOverviewSnapshot();
        setInviteMessage("Invitation revoked.");
      } catch (error) {
        setInviteMessage(getErrorMessage(error, "Invitation revoke failed"));
      }
    });
  }

  async function updateOrganizationMemberRole(userID: string, role: UpdateOrganizationMemberRoleRequest.role) {
    const organizationID = activeOrganization()?.id;
    if (!organizationID) return;

    await runPending(`member-org-role-${userID}`, async () => {
      setMemberMessage("");
      try {
        await OrganizationsService.updateOrganizationMemberRole({
          organizationId: organizationID,
          userId: userID,
          requestBody: { role },
        });
        await refetchOrganizationMembers();
        await refetchPlatform();
        setMemberMessage("Organization member role updated.");
      } catch (error) {
        setMemberMessage(getErrorMessage(error, "Organization role update failed"));
      }
    });
  }

  async function removeOrganizationMember(userID: string) {
    const organizationID = activeOrganization()?.id;
    if (!organizationID) return;
    if (!window.confirm("Remove this member from the organization?")) return;

    await runPending(`member-org-remove-${userID}`, async () => {
      setMemberMessage("");
      try {
        await OrganizationsService.removeOrganizationMember({
          organizationId: organizationID,
          userId: userID,
        });
        await refetchOrganizationMembers();
        await refetchProjectMembers();
        await refreshProjectOverviewSnapshot();
        await refetchPlatform();
        setMemberMessage("Organization member removed.");
      } catch (error) {
        setMemberMessage(getErrorMessage(error, "Organization member removal failed"));
      }
    });
  }

  async function updateProjectMemberRole(userID: string, role: UpdateProjectMemberRoleRequest.role) {
    const projectID = activeProject()?.id;
    if (!projectID) return;

    await runPending(`member-project-role-${userID}`, async () => {
      setMemberMessage("");
      try {
        await ProjectsService.updateProjectMemberRole({
          projectId: projectID,
          userId: userID,
          requestBody: { role },
        });
        await refetchProjectMembers();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setMemberMessage("Project member role updated.");
      } catch (error) {
        setMemberMessage(getErrorMessage(error, "Project role update failed"));
      }
    });
  }

  async function removeProjectMember(userID: string) {
    const projectID = activeProject()?.id;
    if (!projectID) return;
    if (!window.confirm("Remove this member from the project?")) return;

    await runPending(`member-project-remove-${userID}`, async () => {
      setMemberMessage("");
      try {
        await ProjectsService.removeProjectMember({
          projectId: projectID,
          userId: userID,
        });
        await refetchProjectMembers();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        await refetchPlatform();
        setMemberMessage("Project member removed.");
      } catch (error) {
        setMemberMessage(getErrorMessage(error, "Project member removal failed"));
      }
    });
  }

  async function acceptInvitation() {
    const token = invitationToken();
    if (!token) return;
    await runPending("invite-accept", async () => {
      setPlatformMessage("");
      try {
        await OrganizationsService.acceptInvitation({
          requestBody: { token },
        });
        await refetchPlatform();
        await refetchOrganizationProjects();
        await refetchOrganizationInvitations();
        await refetchOrganizationMembers();
        await refetchProjectMembers();
        await refreshProjectOverviewSnapshot();
        setPlatformMessage("Invitation accepted.");
        window.history.replaceState({}, "", "/");
      } catch (error) {
        setPlatformMessage(getErrorMessage(error, "Invitation acceptance failed"));
      }
    });
  }

  async function createApiKey() {
    const projectID = activeProject()?.id;
    if (!projectID) return;

    await runPending("apikey-create", async () => {
      setApiKeyMessage("");
      setApiKeySecret("");
      try {
        const result = await ProjectsService.createApiKey({
          projectId: projectID,
          requestBody: { name: apiKeyName() },
        });
        await refetchAPIKeys();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setApiKeySecret(result.secret);
        setApiKeyMessage(`API key ${result.prefix} created.`);
      } catch (error) {
        setApiKeyMessage(getErrorMessage(error, "API key creation failed"));
      }
    });
  }

  async function revokeApiKey(apiKeyID: string) {
    const projectID = activeProject()?.id;
    if (!projectID) return;

    await runPending(`apikey-revoke-${apiKeyID}`, async () => {
      setApiKeyMessage("");
      try {
        await ProjectsService.revokeApiKey({
          projectId: projectID,
          apiKeyId: apiKeyID,
        });
        await refetchAPIKeys();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setApiKeyMessage("API key revoked.");
      } catch (error) {
        setApiKeyMessage(getErrorMessage(error, "API key revoke failed"));
      }
    });
  }

  async function createBucket() {
    const projectID = activeProject()?.id;
    if (!projectID) return;

    await runPending("storage-create-bucket", async () => {
      setStorageMessage("");
      try {
        await StorageService.createBucket({
          projectId: projectID,
          requestBody: bucketInput(),
        });
        await refetchBuckets();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setStorageMessage("Bucket created.");
      } catch (error) {
        setStorageMessage(getErrorMessage(error, "Bucket creation failed"));
      }
    });
  }

  async function updateSelectedBucket() {
    const bucket = activeBucket();
    if (!bucket) return;

    await runPending(`storage-update-bucket-${bucket.id}`, async () => {
      setStorageMessage("");
      try {
        await StorageService.updateBucket({
          bucketId: bucket.id,
          requestBody: {
            name: bucketEditInput().name,
            slug: bucketEditInput().slug,
            visibility: bucketEditInput().visibility,
          } as UpdateBucketRequest,
        });
        await refetchBuckets();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setStorageMessage(`Bucket "${bucketEditInput().slug}" updated.`);
      } catch (error) {
        setStorageMessage(getErrorMessage(error, "Bucket update failed"));
      }
    });
  }

  async function deleteSelectedBucket() {
    const bucketID = selectedBucketID();
    const bucket = (buckets() ?? []).find((item) => item.id === bucketID);
    if (!bucketID || !bucket) return;
    if (!window.confirm(`Delete bucket "${bucket.slug}" and all stored objects?`)) return;

    await runPending(`storage-delete-bucket-${bucketID}`, async () => {
      setStorageMessage("");
      try {
        await StorageService.deleteBucket({
          bucketId: bucketID,
        });
        await refetchBuckets();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setStorageMessage(`Bucket "${bucket.slug}" deleted.`);
      } catch (error) {
        setStorageMessage(getErrorMessage(error, "Bucket deletion failed"));
      }
    });
  }

  async function uploadObject(event: SubmitEvent) {
    event.preventDefault();
    const bucketID = selectedBucketID();
    const file = selectedFile();
    if (!bucketID || !file) return;

    await runPending(`storage-upload-${bucketID}`, async () => {
      setStorageMessage("");
      try {
        await StorageService.uploadBucketObject({
          bucketId: bucketID,
          formData: {
            objectKey: file.name,
            file,
          },
        });
        await refetchObjects();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setSelectedObjectKey(file.name);
        setSelectedFile(undefined);
        setStorageMessage("File uploaded.");
      } catch (error) {
        setStorageMessage(getErrorMessage(error, "Upload failed"));
      }
    });
  }

  async function moveSelectedObject() {
    const sourceBucketID = selectedBucketID();
    const object = selectedObject();
    if (!sourceBucketID || !object) return;
    const nextObjectKey = renameObjectKeyInput().trim();
    if (nextObjectKey.length === 0) {
      setStorageMessage("New object key is required.");
      return;
    }
    const destinationBucketID = moveDestinationBucketID().trim() || sourceBucketID;

    await runPending(`storage-move-object-${object.object_key}`, async () => {
      setStorageMessage("");
      try {
        await StorageService.updateBucketObject({
          bucketId: sourceBucketID,
          objectKey: object.object_key,
          requestBody: {
            newObjectKey: nextObjectKey,
            destinationBucketId: destinationBucketID === sourceBucketID ? null : destinationBucketID,
          } as UpdateBucketObjectRequest,
        });
        await refetchAuditLogs();
        if (destinationBucketID === sourceBucketID) {
          await refetchObjects();
          setSelectedObjectKey(nextObjectKey);
          setStorageMessage(`Renamed object to ${nextObjectKey}.`);
        } else {
          setSelectedBucketID(destinationBucketID);
          setSelectedObjectKey(nextObjectKey);
          setStorageMessage(`Moved object to ${nextObjectKey} in selected destination bucket.`);
        }
      } catch (error) {
        setStorageMessage(getErrorMessage(error, "Move failed"));
      }
    });
  }

  async function copySelectedObject() {
    const sourceBucketID = selectedBucketID();
    const object = selectedObject();
    if (!sourceBucketID || !object) return;
    const nextObjectKey = renameObjectKeyInput().trim();
    if (nextObjectKey.length === 0) {
      setStorageMessage("New object key is required.");
      return;
    }
    const destinationBucketID = moveDestinationBucketID().trim() || sourceBucketID;

    await runPending(`storage-copy-object-${object.object_key}`, async () => {
      setStorageMessage("");
      try {
        await StorageService.copyBucketObject({
          bucketId: sourceBucketID,
          requestBody: {
            objectKey: object.object_key,
            newObjectKey: nextObjectKey,
            destinationBucketId: destinationBucketID === sourceBucketID ? null : destinationBucketID,
          } as CopyBucketObjectRequest,
        });
        await refetchAuditLogs();
        if (destinationBucketID === sourceBucketID) {
          await refetchObjects();
          setSelectedObjectKey(nextObjectKey);
          setStorageMessage(`Copied object to ${nextObjectKey}.`);
        } else {
          setSelectedBucketID(destinationBucketID);
          setSelectedObjectKey(nextObjectKey);
          setStorageMessage(`Copied object to ${nextObjectKey} in selected destination bucket.`);
        }
      } catch (error) {
        setStorageMessage(getErrorMessage(error, "Copy failed"));
      }
    });
  }

  async function downloadObject(object: BucketObject) {
    const bucketID = selectedBucketID();
    if (!bucketID) return;

    await runPending(`storage-download-${object.object_key}`, async () => {
      setStorageMessage("");
      try {
        const blob = await StorageService.downloadBucketObject({
          bucketId: bucketID,
          objectKey: object.object_key,
        });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.download = object.object_key;
        anchor.click();
        URL.revokeObjectURL(href);
        setStorageMessage(`Downloaded ${object.object_key}.`);
      } catch (error) {
        setStorageMessage(getErrorMessage(error, "Download failed"));
      }
    });
  }

  async function copyObjectURL(object: BucketObject) {
    const bucket = activeBucket();
    if (!bucket || bucket.visibility !== "public") return;

    const url = getObjectDownloadURL(bucket.id, object.object_key);
    await runPending(`storage-copy-url-${object.object_key}`, async () => {
      setStorageMessage("");
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(url);
        } else {
          const input = document.createElement("input");
          input.value = url;
          document.body.appendChild(input);
          input.select();
          document.execCommand("copy");
          document.body.removeChild(input);
        }
        setStorageMessage(`Public URL copied for ${object.object_key}.`);
      } catch (error) {
        setStorageMessage(getErrorMessage(error, "Copy URL failed"));
      }
    });
  }

  async function deleteObject(object: BucketObject) {
    const bucketID = selectedBucketID();
    if (!bucketID) return;

    await runPending(`storage-delete-object-${object.object_key}`, async () => {
      setStorageMessage("");
      try {
        await StorageService.deleteBucketObject({
          bucketId: bucketID,
          objectKey: object.object_key,
        });
        await refetchObjects();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        if (selectedObjectKey() === object.object_key) {
          setSelectedObjectKey(undefined);
        }
        setStorageMessage(`Deleted ${object.object_key}.`);
      } catch (error) {
        setStorageMessage(getErrorMessage(error, "Delete failed"));
      }
    });
  }

  async function createCollection(event: SubmitEvent) {
    event.preventDefault();
    const projectID = activeProject()?.id;
    if (!projectID) return;

    await runPending("collection-create", async () => {
      setCollectionsMessage("");
      try {
        const result = await CollectionsService.createCollection({
          projectId: projectID,
          requestBody: {
            name: collectionInput().name,
            slug: collectionInput().slug,
            description: collectionInput().description || undefined,
            schema: {},
          },
        });
        await refetchCollections();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setSelectedCollectionID(result.id);
        setCollectionInput({ name: "", slug: "", description: "" });
        setCollectionsMessage("Collection created.");
      } catch (error) {
        setCollectionsMessage(getErrorMessage(error, "Collection creation failed"));
      }
    });
  }

  async function deleteCollection(collectionID: string) {
    const projectID = activeProject()?.id;
    if (!projectID || !window.confirm("Delete this collection and all its documents?")) return;

    await runPending(`collection-delete-${collectionID}`, async () => {
      setCollectionsMessage("");
      try {
        await CollectionsService.deleteCollection({
          projectId: projectID,
          collectionId: collectionID,
        });
        await refetchCollections();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        if (selectedCollectionID() === collectionID) {
          setSelectedCollectionID(undefined);
        }
        setCollectionsMessage("Collection deleted.");
      } catch (error) {
        setCollectionsMessage(getErrorMessage(error, "Collection deletion failed"));
      }
    });
  }

  async function createDocument(data: any) {
    const collectionID = selectedCollectionID();
    if (!collectionID) return;

    await runPending("document-create", async () => {
      try {
        await CollectionsService.createDocument({
          collectionId: collectionID,
          requestBody: { data },
        });
        await refetchDocuments();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
      } catch (error) {
        alert(getErrorMessage(error, "Document creation failed"));
      }
    });
  }

  async function updateDocument(documentID: string, data: any) {
    const collectionID = selectedCollectionID();
    if (!collectionID) return;

    await runPending(`document-update-${documentID}`, async () => {
      try {
        await CollectionsService.updateDocument({
          collectionId: collectionID,
          documentId: documentID,
          requestBody: { data },
        });
        await refetchDocuments();
        await refetchAuditLogs();
      } catch (error) {
        alert(getErrorMessage(error, "Document update failed"));
      }
    });
  }

  async function deleteDocument(documentID: string) {
    const collectionID = selectedCollectionID();
    if (!collectionID || !window.confirm("Delete this document?")) return;

    await runPending(`document-delete-${documentID}`, async () => {
      try {
        await CollectionsService.deleteDocument({
          collectionId: collectionID,
          documentId: documentID,
        });
        await refetchDocuments();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
      } catch (error) {
        alert(getErrorMessage(error, "Document deletion failed"));
      }
    });
  }

  async function startSocial(provider: "github" | "google" | "discord" | "microsoft") {
    if (isDemo) {
      setAuthMessage("Demo mode is active - social authentication is simulated");
      return;
    }
    await runPending(`auth-social-${provider}`, async () => {
      await authClient.signIn.social({
        provider,
        callbackURL: window.location.pathname || "/",
      });
    });
  }

  const [sidebarOpen, setSidebarOpen] = createSignal(false);

  return (
    <Layout
      header={
        <Show when={session()?.data}>
          <Header
            logo={
              <div class="flex items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-accent to-accent-hover text-white font-bold text-base shadow-lg">
                  P
                </div>
                <span class="font-bold text-lg text-text-primary">Primora</span>
              </div>
            }
            tabs={[
              { id: "dashboard", label: "Dashboard" },
              { id: "projects", label: "Projects" },
              { id: "members", label: "Members" },
              { id: "storage", label: "Storage" },
              { id: "collections", label: "Collections" },
              { id: "audit", label: "Audit" },
              { id: "settings", label: "Settings" },
            ]}
            activeTab={activeView()}
            onTabChange={(id) => setActiveView(id as ViewType)}
            actions={
              <div class="flex items-center gap-3">
                <Select
                  value={selectedOrganizationID() ?? ""}
                  onChange={(e) => {
                    setSelectedOrganizationID(e.currentTarget.value || undefined);
                    setSelectedProjectID(undefined);
                  }}
                  disabled={platform.loading}
                  class="w-40 input-sm"
                >
                  <For each={platform()?.organizations ?? []}>
                    {(org) => <option value={org.id}>{org.name}</option>}
                  </For>
                  <Show when={(platform()?.organizations?.length ?? 0) === 0}>
                    <option value="">No organizations</option>
                  </Show>
                </Select>
                <span class="text-gray-400">/</span>
                <Select
                  value={selectedProjectID() ?? ""}
                  onChange={(e) => setSelectedProjectID(e.currentTarget.value || undefined)}
                  disabled={!activeOrganization()?.id || availableProjects().length === 0}
                  class="w-40 input-sm"
                >
                  <For each={availableProjects()}>
                    {(project) => <option value={project.id}>{project.name}</option>}
                  </For>
                  <Show when={availableProjects().length === 0}>
                    <option value="">No projects</option>
                  </Show>
                </Select>
                <div class="hidden sm:flex items-center gap-2 rounded-lg border border-border bg-surface-1 px-3 py-1.5">
                  <div class={`h-2 w-2 rounded-full ${health()?.status === "ok" ? "bg-success" : "bg-warning"}`} />
                  <span class="text-xs text-text-secondary">
                    {health()?.status ?? "connecting"}
                  </span>
                </div>
                <button
                  class="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-text-secondary hover:bg-surface-1 hover:text-text-primary transition-colors"
                  onClick={() => isDemo ? disableDemoMode() : authClient.signOut()}
                >
                  <div class="h-8 w-8 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center text-sm font-medium text-white shadow-lg">
                    {session()?.data?.user.name?.charAt(0) ?? "?"}
                  </div>
                  <Icons.Logout />
                </button>
              </div>
            }
          />
        </Show>
      }
    >
      <Show when={!session()?.data} fallback={
        // Authenticated content
        <div class="space-y-6">
          {/* Dashboard View */}
          <Show when={activeView() === "dashboard"}>
            <Show 
              when={activeProject()} 
              fallback={
                <div>
                  <PageHeader
                    title="Dashboard"
                    description="Select a project to view its dashboard"
                  />
                  <Card class="p-8">
                    <div class="text-center">
                      <div class="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                        <Icons.Projects />
                      </div>
                      <h3 class="text-lg font-semibold mb-2">No Project Selected</h3>
                      <p class="text-gray-600 mb-4">Select a project from the dropdown above or create a new one</p>
                      <Button onClick={() => setActiveView("projects")}>
                        <Icons.Plus /> Create Project
                      </Button>
                    </div>
                  </Card>
                </div>
              }
            >
              <ProjectDashboard 
                project={activeProject()!}
                overview={projectOverview()}
                onNavigate={(view) => setActiveView(view as ViewType)}
              />
            </Show>
          </Show>

          {/* Projects View */}
          <Show when={activeView() === "projects"}>
            <ProjectsPage
              projects={availableProjects()}
              selectedProjectID={selectedProjectID()}
              projectInput={projectInput()}
              projectEditInput={projectEditInput()}
              projectMessage={projectMessage()}
              projectPending={projectPending()}
              canUpdateProject={canUpdateProject()}
              onProjectInputChange={(field, value) => setProjectInput(c => ({ ...c, [field]: value }))}
              onProjectEditInputChange={(field, value) => setProjectEditInput(c => ({ ...c, [field]: value }))}
              onCreateProject={createProject}
              onUpdateProject={updateActiveProject}
              onDeleteProject={deleteActiveProject}
              onSelectProject={(id) => setSelectedProjectID(id)}
              onNavigateToDashboard={() => setActiveView("dashboard")}
            />
          </Show>

          {/* Members View */}
          <Show when={activeView() === "members"}>
            <MembersPage
              organizationMembers={organizationMembers()}
              organizationInvitations={organizationInvitations()}
              projectMembers={projectMembers()}
              invitationInput={invitationInput()}
              inviteMessage={inviteMessage()}
              memberMessage={memberMessage()}
              invitationPending={invitationPending()}
              membersPending={membersPending()}
              canManageMembers={canUpdateOrganization()}
              hasActiveProject={!!activeProject()?.id}
              onInvitationInputChange={(field, value) => setInvitationInput(c => ({ ...c, [field]: value }))}
              onSendInvitation={createInvitation}
              onRevokeInvitation={revokeInvitation}
              onRemoveMember={(id, type) => type === 'org' ? removeOrganizationMember(id) : removeProjectMember(id)}
              onUpdateMemberRole={(id, role, type) => 
                type === 'org' 
                  ? updateOrganizationMemberRole(id, role as any) 
                  : updateProjectMemberRole(id, role as any)
              }
            />
          </Show>

          {/* Storage View */}
          <Show when={activeView() === "storage"}>
            <StoragePage
              buckets={buckets()}
              objects={objects()}
              selectedBucketID={selectedBucketID()}
              selectedObjectKey={selectedObjectKey()}
              bucketInput={bucketInput()}
              bucketEditInput={bucketEditInput()}
              storageMessage={storageMessage()}
              storagePending={storagePending()}
              canUpdateBucket={canUpdateBucket()}
              objectsPage={objectsPage()}
              objectPreview={objectPreview()}
              onBucketInputChange={(field, value) => setBucketInput(c => ({ ...c, [field]: value }))}
              onBucketEditInputChange={(field, value) => setBucketEditInput(c => ({ ...c, [field]: value }))}
              onCreateBucket={createBucket}
              onUpdateBucket={updateSelectedBucket}
              onDeleteBucket={deleteSelectedBucket}
              onSelectBucket={(id) => setSelectedBucketID(id)}
              onSelectObject={(key) => setSelectedObjectKey(key)}
              onUploadObject={(file) => {
                setSelectedFile(file);
                const event = new Event('submit') as any;
                uploadObject(event);
              }}
              onDeleteObject={(key) => {
                const obj = objects().find(o => o.object_key === key);
                if (obj) deleteObject(obj);
              }}
              onDownloadObject={(bucketId, key) => {
                const obj = objects().find(o => o.object_key === key);
                if (obj) downloadObject(obj);
              }}
              onObjectPageChange={(offset) => setObjectOffset(offset)}
              formatBytes={formatBytes}
              formatDate={formatDate}
            />
          </Show>

          {/* Collections View */}
          <Show when={activeView() === "collections"}>
            <CollectionsPage
              collections={collections() ?? []}
              documents={documents() ?? []}
              selectedCollectionID={selectedCollectionID()}
              collectionInput={collectionInput()}
              collectionMessage={collectionsMessage()}
              collectionPending={collectionPending()}
              documentPending={documentPending()}
              canUpdate={canUpdateProject()}
              onCollectionInputChange={(field, value) => setCollectionInput(c => ({ ...c, [field]: value }))}
              onCreateCollection={createCollection}
              onDeleteCollection={deleteCollection}
              onSelectCollection={(id) => setSelectedCollectionID(id)}
              onCreateDocument={createDocument}
              onUpdateDocument={updateDocument}
              onDeleteDocument={deleteDocument}
              formatDate={formatDate}
            />
          </Show>

          {/* Audit View */}
          <Show when={activeView() === "audit"}>
            <AuditPage
              auditLogs={auditLogs()}
              auditSearch={auditSearch()}
              auditAction={auditAction()}
              auditOffset={auditOffset()}
              auditPage={auditLogsPage()}
              onAuditSearchChange={(value) => setAuditSearch(value)}
              onAuditActionChange={(value) => setAuditAction(value)}
              onAuditPageChange={(offset) => setAuditOffset(offset)}
              onRefreshAudit={refetchAuditLogs}
              formatDate={formatDate}
            />
          </Show>

          {/* Settings View */}
          <Show when={activeView() === "settings"}>
            <SettingsPage
              apiKeys={apiKeys()}
              apiKeyName={apiKeyName()}
              apiKeySecret={apiKeySecret()}
              apiKeyMessage={apiKeyMessage()}
              apiKeyPending={apiKeyPending()}
              organizationInput={organizationInput()}
              organizationEditInput={organizationEditInput()}
              organizationMessage={platformMessage()}
              canUpdateOrganization={canUpdateOrganization()}
              workspacePending={workspacePending()}
              onApiKeyNameChange={(name) => setApiKeyName(name)}
              onCreateApiKey={createApiKey}
              onDeleteApiKey={revokeApiKey}
              onOrganizationInputChange={(field, value) => setOrganizationInput(c => ({ ...c, [field]: value }))}
              onOrganizationEditInputChange={(field, value) => setOrganizationEditInput(c => ({ ...c, [field]: value }))}
              onCreateOrganization={createOrganization}
              onUpdateOrganization={updateActiveOrganization}
              onDeleteOrganization={deleteActiveOrganization}
              formatDate={formatDate}
            />
          </Show>
        </div>
      }>
        {/* Unauthenticated - Login view */}
        <div class="login-container">
          <div class="login-background-glow" />
          <div class="login-card-wrapper animate-fade-in">
            <div class="login-card glass">
              <div class="login-header">
                <div class="login-logo-wrapper">
                  <div class="login-logo">
                    <span class="login-logo-text">P</span>
                    <div class="login-logo-glow" />
                  </div>
                </div>
                <h1 class="login-title">Welcome to Primora</h1>
                <p class="login-subtitle">
                  {mode() === "sign-in" ? "Sign in to access your workspace" : "Create your account to get started"}
                </p>
              </div>

              <form class="login-form" onSubmit={handleAuthSubmit}>
                <div class="login-mode-toggle">
                  <button
                    type="button"
                    class={`login-mode-btn ${mode() === "sign-in" ? "login-mode-btn-active" : ""}`}
                    onClick={() => setMode("sign-in")}
                  >
                    <span>Sign In</span>
                  </button>
                  <button
                    type="button"
                    class={`login-mode-btn ${mode() === "sign-up" ? "login-mode-btn-active" : ""}`}
                    onClick={() => setMode("sign-up")}
                  >
                    <span>Sign Up</span>
                  </button>
                  <div class={`login-mode-indicator ${mode() === "sign-up" ? "login-mode-indicator-right" : ""}`} />
                </div>

                <div class="login-inputs">
                  <Show when={mode() === "sign-up"}>
                    <div class="login-input-group animate-slide-in-left">
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={name()}
                        onInput={(e) => setName(e.currentTarget.value)}
                        class="login-input"
                      />
                    </div>
                  </Show>
                  <div class="login-input-group">
                    <input
                      type="email"
                      placeholder="Email Address"
                      value={email()}
                      onInput={(e) => setEmail(e.currentTarget.value)}
                      class="login-input"
                    />
                  </div>
                  <div class="login-input-group">
                    <input
                      type="password"
                      placeholder="Password"
                      value={password()}
                      onInput={(e) => setPassword(e.currentTarget.value)}
                      class="login-input"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  class="login-submit-btn" 
                  disabled={authPending()}
                >
                  <Show when={authPending()} fallback={
                    <>
                      <span>{mode() === "sign-in" ? "Sign In" : "Create Account"}</span>
                      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  }>
                    <div class="spinner" />
                    <span>Working...</span>
                  </Show>
                </button>

                <div class="login-divider">
                  <div class="login-divider-line" />
                  <span class="login-divider-text">or continue with</span>
                  <div class="login-divider-line" />
                </div>

                <div class="login-social-buttons">
                  <button 
                    type="button" 
                    onClick={() => startSocial("github")} 
                    disabled={authPending()}
                    class="login-social-btn"
                    title="Sign in with GitHub"
                  >
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => startSocial("google")} 
                    disabled={authPending()}
                    class="login-social-btn"
                    title="Sign in with Google"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => startSocial("discord")} 
                    disabled={authPending()}
                    class="login-social-btn"
                    title="Sign in with Discord"
                  >
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027C.533 9.048-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                    </svg>
                  </button>
                  <button 
                    type="button" 
                    onClick={() => startSocial("microsoft")} 
                    disabled={authPending()}
                    class="login-social-btn"
                    title="Sign in with Microsoft"
                  >
                    <svg width="20" height="20" viewBox="0 0 23 23">
                      <path fill="#f3f3f3" d="M0 0h23v23H0z"/>
                      <path fill="#f35325" d="M1 1h10v10H1z"/>
                      <path fill="#81bc06" d="M12 1h10v10H12z"/>
                      <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                      <path fill="#ffba08" d="M12 12h10v10H12z"/>
                    </svg>
                  </button>
                </div>

                <Show when={authMessage()}>
                  <div class="login-message animate-slide-up">
                    <Message variant="neutral">{authMessage()}</Message>
                  </div>
                </Show>
              </form>

              <div class="login-footer">
                <p class="login-footer-text">
                  {mode() === "sign-in" ? "Don't have an account?" : "Already have an account?"}
                  {" "}
                  <button
                    type="button"
                    class="login-footer-link"
                    onClick={() => setMode(mode() === "sign-in" ? "sign-up" : "sign-in")}
                  >
                    {mode() === "sign-in" ? "Sign up" : "Sign in"}
                  </button>
                </p>
              </div>
            </div>
          </div>
        </div>
      </Show>
      
      {/* Network Error Toast */}
      <Show when={networkError()}>
        <NetworkError 
          error={networkError()!} 
          onRetry={() => {
            setNetworkError(null);
            window.location.reload();
          }}
          onDismiss={() => setNetworkError(null)}
        />
      </Show>
      
      {/* Demo Mode Banner */}
      <Show when={isDemo}>
        <DemoBanner onExit={disableDemoMode} />
      </Show>

      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={showOnboarding()}
        projectName={activeProject()?.name ?? "Your Project"}
        onClose={() => setShowOnboarding(false)}
      />
    </Layout>
  );
}
