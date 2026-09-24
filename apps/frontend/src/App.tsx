import {
  CollectionsService,
  CreateBucketRequest,
  CreateInvitationRequest,
  CreateOrganizationRequest,
  HealthService,
  InstanceService,
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
  CreateApiKeyRequest,
  CopyBucketObjectRequest,
  type Bucket,
  type BucketObject,
  type InstanceSetting,
  type OrganizationSummary,
  type ProjectSummary,
} from "@primora/api-client";
import { Show, createEffect, createMemo, createResource, createSignal, onCleanup } from "solid-js";

import { authClient, fetchApiToken } from "./lib/auth-client";
import { configureApiToken } from "./lib/api";
import { isDemoMode, disableDemoMode, enableDemoMode, demoSession, demoService } from "./lib/demo-mode";
import {
  AppShell,
  CommandPaletteEnhanced,
  NetworkError,
  OnboardingModal,
  ProjectDashboard,
  PwaInstallBanner,
  type PaletteCommand,
  type ViewType,
} from "./components";
import {
  AuditPage,
  AuthPage,
  AutomationPage,
  type AuthUser,
  CollectionsPage,
  DatabasesPage,
  TelemetryPage,
  IntegrationsPage,
  VaultPage,
  LoginPage,
  MembersPage,
  ProjectsPage,
  SettingsPage,
  StoragePage,
} from "./pages";
import { Input } from "./components/Input";
import {
  IconOverview,
  IconProjects,
  IconMembers,
  IconStorage,
  IconDatabases,
  IconTelemetry,
  IconZap,
  IconCollections,
  IconAudit,
  IconAuth,
  IconSettings,
  IconPlus,
  IconKey,
  IconUpload,
} from "./components/Icons";

const OBJECTS_PAGE_SIZE = 25;
const AUDIT_PAGE_SIZE = 25;
const MAX_TEXT_PREVIEW_BYTES = 2 * 1024 * 1024;

type ObjectPreview =
  | { kind: "image"; objectURL: string }
  | { kind: "text"; text: string; truncated: boolean }
  | { kind: "unsupported"; message: string };

function getErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.length > 0) return message;
  }
  return fallback;
}

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value < 0) return "0 B";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value;
  let unit = -1;
  do {
    size /= 1024;
    unit++;
  } while (size >= 1024 && unit < units.length - 1);
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function getObjectDownloadURL(bucketID: string, objectKey: string) {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(/\/$/, "");
  return `${base}/storage/buckets/${bucketID}/objects/${encodeURIComponent(objectKey)}/download`;
}

export default function App() {
  const isDemo = isDemoMode();

  const [mode, setMode] = createSignal<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = createSignal("");
  const [password, setPassword] = createSignal("");
  const [name, setName] = createSignal("");
  const [activeView, setActiveView] = createSignal<ViewType>("dashboard");
  const [showOnboarding, setShowOnboarding] = createSignal(false);
  const [paletteOpen, setPaletteOpen] = createSignal(false);
  const [theme, setTheme] = createSignal<"dark" | "light">(
    (localStorage.getItem("primora_theme") as "dark" | "light") ?? "dark",
  );

  const [authMessage, setAuthMessage] = createSignal("");
  const [platformMessage, setPlatformMessage] = createSignal("");
  const [organizationMessage, setOrganizationMessage] = createSignal("");
  const [projectMessage, setProjectMessage] = createSignal("");
  const [inviteMessage, setInviteMessage] = createSignal("");
  const [apiKeyMessage, setApiKeyMessage] = createSignal("");
  const [storageMessage, setStorageMessage] = createSignal("");
  const [memberMessage, setMemberMessage] = createSignal("");
  const [apiKeySecret, setApiKeySecret] = createSignal("");
  const [collectionsMessage, setCollectionsMessage] = createSignal("");
  const [instanceMessage, setInstanceMessage] = createSignal("");

  const [selectedOrganizationID, setSelectedOrganizationID] = createSignal<string | undefined>();
  const [selectedProjectID, setSelectedProjectID] = createSignal<string | undefined>();
  const [selectedBucketID, setSelectedBucketID] = createSignal<string | undefined>();
  const [selectedCollectionID, setSelectedCollectionID] = createSignal<string | undefined>();
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

  const isPendingPrefix = (prefix: string) =>
    Object.entries(pendingOperations()).some(([key, value]) => value && key.startsWith(prefix));

  async function runPending(key: string, task: () => Promise<void>) {
    setPendingOperations((current) => ({ ...current, [key]: true }));
    try {
      await task();
    } finally {
      setPendingOperations((current) => {
        const next = { ...current };
        delete next[key];
        return next;
      });
    }
  }

  const invitationToken = createMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("invitation") ?? params.get("invitationToken");
  });

  const [projectInput, setProjectInput] = createSignal({ name: "", slug: "", description: "" });
  const [projectEditInput, setProjectEditInput] = createSignal({
    name: "",
    slug: "",
    description: "",
    retentionEventsDays: "",
    retentionAuditDays: "",
    retentionWebhookDays: "",
  });
  const [organizationInput, setOrganizationInput] = createSignal({ name: "", slug: "" });
  const [organizationEditInput, setOrganizationEditInput] = createSignal({ name: "", slug: "" });
  const [invitationInput, setInvitationInput] = createSignal({
    email: "",
    orgRole: CreateInvitationRequest.orgRole.MEMBER as string,
    attachProject: false,
    projectRole: CreateInvitationRequest.projectRole.DEVELOPER as string,
  });
  const [apiKeyName, setApiKeyName] = createSignal("Frontend key");
  const [apiKeyScopes, setApiKeyScopes] = createSignal<string[]>(["admin"]);
  const [bucketInput, setBucketInput] = createSignal({
    name: "",
    slug: "",
    visibility: CreateBucketRequest.visibility.PRIVATE as string,
  });
  const [bucketEditInput, setBucketEditInput] = createSignal({
    name: "",
    slug: "",
    visibility: UpdateBucketRequest.visibility.PRIVATE as string,
  });
  const [collectionInput, setCollectionInput] = createSignal({ name: "", slug: "", description: "" });

  /* theme */
  createEffect(() => {
    document.documentElement.classList.toggle("light", theme() === "light");
    localStorage.setItem("primora_theme", theme());
  });

  /* ---------------------------------------------------------- */
  /* data loading                                               */
  /* ---------------------------------------------------------- */

  const session = isDemo
    ? () => ({ data: { user: demoSession.user, session: demoSession.session } })
    : authClient.useSession();

  const [health] = createResource(async () => {
    if (isDemo) return { status: "ok" };
    try {
      return await HealthService.getReadiness();
    } catch (error) {
      setNetworkError(getErrorMessage(error, "Failed to connect to the backend"));
      return { status: "error" };
    }
  });

  // Public instance state — fetched before login so the auth page can hide
  // sign-up/social options the instance does not offer.
  const [instancePublic] = createResource(async () => {
    if (isDemo) return { signup_enabled: true, bootstrap_required: false, social_providers: [] };
    try {
      return await InstanceService.getInstancePublic();
    } catch {
      // Endpoint unreachable (backend down or pre-migration): keep sign-in
      // visible rather than lock the page out.
      return undefined;
    }
  });

  const canSignUp = createMemo(() => {
    const cfg = instancePublic();
    if (!cfg) return true; // unknown — let the backend enforce
    return cfg.bootstrap_required || cfg.signup_enabled;
  });
  const enabledSocialProviders = createMemo(() => instancePublic()?.social_providers ?? []);

  const isPlatformAdmin = createMemo(() => {
    const role = (session()?.data?.user as { role?: string } | undefined)?.role;
    return isDemo || role === "admin";
  });

  const [instanceSettings, { refetch: refetchInstanceSettings }] = createResource(
    () => (activeView() === "settings" && isPlatformAdmin() && session()?.data ? true : null),
    async (): Promise<InstanceSetting[]> => {
      if (isDemo) return demoService.listInstanceSettings();
      return (await InstanceService.listInstanceSettings()).settings;
    },
  );

  // Clamp the auth mode to what the instance permits.
  createEffect(() => {
    const cfg = instancePublic();
    if (!cfg || isDemo) return;
    if (cfg.bootstrap_required) setMode("sign-up");
    else if (!cfg.signup_enabled) setMode("sign-in");
  });

  const [platform, { refetch: refetchPlatform }] = createResource(
    () => session()?.data?.user.id ?? null,
    async () => {
      if (isDemo) return await demoService.getMe();
      try {
        return await PlatformService.getMe();
      } catch (error) {
        setNetworkError(getErrorMessage(error, "Failed to load workspace data"));
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
      return { organizationID, query: projectSearch().trim() };
    },
    async (source) => {
      if (isDemo) return await demoService.listProjects();
      return ProjectsService.listProjects({
        organizationId: source.organizationID,
        q: source.query.length > 0 ? source.query : undefined,
      }).then((result) => result.items);
    },
  );

  type ProjectListItem = ProjectSummary & {
    retentionEventsDays?: number;
    retentionAuditDays?: number;
    retentionWebhookDays?: number;
  };

  const availableProjects = createMemo<ProjectListItem[]>(() => {
    const items = organizationProjects();
    if (!items) return activeOrganization()?.projects ?? [];
    return items.map((project) => ({
      id: project.id,
      name: project.name,
      slug: project.slug,
      description: project.description ?? undefined,
      membershipRole: project.membership_role ?? undefined,
      retentionEventsDays: project.retention_events_days,
      retentionAuditDays: project.retention_audit_days,
      retentionWebhookDays: project.retention_webhook_days,
    }));
  });

  const activeProject = createMemo<ProjectListItem | undefined>(() =>
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
  const instancePending = createMemo(() => isPendingPrefix("instance-"));

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
      return { projectID, query: bucketSearch().trim() };
    },
    async (source) => {
      if (isDemo) return await demoService.listBuckets();
      return StorageService.listBuckets({
        projectId: source.projectID,
        q: source.query.length > 0 ? source.query : undefined,
      }).then((result) => result.items);
    },
  );
  const activeBucket = createMemo<Bucket | undefined>(() =>
    (buckets() ?? []).find((item) => item.id === selectedBucketID()),
  );
  const [objectsPage, { refetch: refetchObjectsPage }] = createResource(
    () => {
      const bucketID = selectedBucketID();
      if (!bucketID) return null;
      return { bucketID, query: objectSearch().trim(), offset: objectOffset() };
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
      const declared = (source.contentType || "").toLowerCase();
      const actual = (blob.type || "").toLowerCase();
      const contentType =
        actual && actual !== "application/octet-stream" ? actual : declared || "application/octet-stream";

      if (contentType.startsWith("image/")) {
        return { kind: "image", objectURL: URL.createObjectURL(blob) };
      }

      const supportsTextPreview =
        contentType.startsWith("text/") ||
        contentType.includes("json") ||
        contentType.includes("xml") ||
        contentType.includes("yaml") ||
        contentType.includes("javascript") ||
        contentType.includes("markdown");

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
      return { kind: "text", text: content.slice(0, maxChars), truncated: content.length > maxChars };
    },
  );

  const [auditLogsPage, { refetch: refetchAuditLogs }] = createResource(
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

  const [collections, { refetch: refetchCollections }] = createResource(
    () => activeProject()?.id ?? null,
    async (projectID) => {
      if (isDemo) return await demoService.listCollections();
      return CollectionsService.listCollections({ projectId: projectID }).then((res) => res.items);
    },
  );

  const [documents, { refetch: refetchDocuments }] = createResource(
    () => selectedCollectionID() ?? null,
    async (collectionID) => {
      if (isDemo) return await demoService.listDocuments();
      return CollectionsService.listDocuments({ collectionId: collectionID }).then((res) => res.items);
    },
  );

  const [authUsersError, setAuthUsersError] = createSignal<string>();
  const [authUsersPending, setAuthUsersPending] = createSignal(false);
  const [authUsersMessage, setAuthUsersMessage] = createSignal("");
  const [authUsers, { refetch: refetchAuthUsers }] = createResource(
    () => (activeView() === "auth" ? session()?.data?.user.id ?? null : null),
    async (): Promise<AuthUser[]> => {
      if (isDemo) {
        setAuthUsersError(undefined);
        return await demoService.listAuthUsers();
      }
      const res = await authClient.admin.listUsers({ query: { limit: 100 } });
      if (res.error) {
        const message =
          res.error.status === 403
            ? "Your account needs the admin role. Set AUTH_ADMIN_EMAILS on the auth service, or grant it in the Members view."
            : res.error.message ?? "Failed to load users";
        setAuthUsersError(message);
        return [];
      }
      setAuthUsersError(undefined);
      return res.data.users as AuthUser[];
    },
  );

  async function runAuthUserAction(action: () => Promise<unknown>, done: string) {
    setAuthUsersPending(true);
    setAuthUsersMessage("");
    try {
      await action();
      setAuthUsersMessage(done);
      await refetchAuthUsers();
    } catch (error) {
      setAuthUsersMessage(getErrorMessage(error, "User action failed"));
    } finally {
      setAuthUsersPending(false);
    }
  }

  /* ---------------------------------------------------------- */
  /* effects                                                    */
  /* ---------------------------------------------------------- */

  createEffect(() => {
    if (!isDemo) {
      configureApiToken(session()?.data ? fetchApiToken : undefined);
    }
  });

  createEffect(() => {
    if (session()?.data) setAuthMessage("");
  });

  createEffect(() => {
    const orgs = platform()?.organizations ?? [];
    if (orgs.length === 0) {
      setSelectedOrganizationID(undefined);
      setSelectedProjectID(undefined);
      return;
    }
    const current = orgs.find((o) => o.id === selectedOrganizationID()) ?? orgs[0];
    setSelectedOrganizationID(current.id);
  });

  createEffect(() => {
    const projects = availableProjects();
    if (projects.length === 0) {
      setSelectedProjectID(undefined);
      return;
    }
    const current = projects.find((p) => p.id === selectedProjectID()) ?? projects[0];
    setSelectedProjectID(current?.id);
  });

  createEffect(() => {
    const org = activeOrganization();
    setOrganizationEditInput(
      org ? { name: org.name, slug: org.slug } : { name: "", slug: "" },
    );
  });

  createEffect(() => {
    const project = activeProject();
    setProjectEditInput(
      project
        ? {
            name: project.name,
            slug: project.slug,
            description: project.description ?? "",
            retentionEventsDays: project.retentionEventsDays?.toString() ?? "",
            retentionAuditDays: project.retentionAuditDays?.toString() ?? "",
            retentionWebhookDays: project.retentionWebhookDays?.toString() ?? "",
          }
        : { name: "", slug: "", description: "", retentionEventsDays: "", retentionAuditDays: "", retentionWebhookDays: "" },
    );
  });

  createEffect(() => {
    const list = buckets() ?? [];
    const current = list.find((b) => b.id === selectedBucketID()) ?? list[0];
    setSelectedBucketID(current?.id);
  });

  createEffect(() => {
    const bucket = activeBucket();
    setBucketEditInput(
      bucket
        ? {
            name: bucket.name,
            slug: bucket.slug,
            visibility: bucket.visibility as UpdateBucketRequest.visibility,
          }
        : { name: "", slug: "", visibility: UpdateBucketRequest.visibility.PRIVATE },
    );
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
    const current = list.find((c) => c.id === selectedCollectionID()) ?? list[0];
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
    const list = objects();
    if (list.length === 0) {
      setSelectedObjectKey(undefined);
      return;
    }
    const current = list.find((o) => o.object_key === selectedObjectKey()) ?? list[0];
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
    if (preview?.kind === "image") URL.revokeObjectURL(preview.objectURL);
  });

  createEffect(() => {
    if (!activeProject()?.id && invitationInput().attachProject) {
      setInvitationInput((current) => ({ ...current, attachProject: false }));
    }
  });

  /* ---------------------------------------------------------- */
  /* handlers                                                   */
  /* ---------------------------------------------------------- */

  async function refreshProjectOverviewSnapshot() {
    if (!activeProject()?.id) return;
    await refetchProjectOverview();
  }

  async function handleAuthSubmit(event: SubmitEvent) {
    event.preventDefault();
    if (isDemo) {
      setAuthMessage("Demo mode is active — authentication is simulated.");
      return;
    }
    await runPending("auth-submit", async () => {
      setAuthMessage("");
      try {
        if (mode() === "sign-up") {
          await authClient.signUp.email({ email: email(), password: password(), name: name() });
          setAuthMessage("Account created — signing you in.");
        } else {
          await authClient.signIn.email({ email: email(), password: password() });
        }
      } catch (error) {
        setAuthMessage(getErrorMessage(error, "Authentication failed"));
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
        const created = isDemo
          ? await demoService.createProject({ requestBody: projectInput() })
          : await ProjectsService.createProject({
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
        setProjectMessage(`Project "${created.name}" created.`);
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
        const trimmed = projectEditInput().description.trim();
        const parseRetention = (value: string): number | undefined => {
          const raw = value.trim();
          if (raw === "") return undefined;
          const n = Number(raw);
          return Number.isFinite(n) ? Math.min(3650, Math.max(0, Math.trunc(n))) : undefined;
        };
        if (isDemo) {
          await demoService.updateProject({ requestBody: { ...projectEditInput(), description: trimmed || null } });
        } else {
          await ProjectsService.updateProject({
            projectId: project.id,
            requestBody: {
              name: projectEditInput().name,
              slug: projectEditInput().slug,
              description: trimmed.length > 0 ? trimmed : null,
              retention_events_days: parseRetention(projectEditInput().retentionEventsDays),
              retention_audit_days: parseRetention(projectEditInput().retentionAuditDays),
              retention_webhook_days: parseRetention(projectEditInput().retentionWebhookDays),
            } as UpdateProjectRequest,
          });
        }
        await refetchPlatform();
        await refetchOrganizationProjects();
        await refetchProjectOverview();
        setProjectMessage(`Project "${projectEditInput().name}" updated.`);
      } catch (error) {
        setProjectMessage(getErrorMessage(error, "Project update failed"));
      }
    });
  }

  async function deleteActiveProject() {
    const project = activeProject();
    if (!project) return;
    await runPending("project-delete", async () => {
      setProjectMessage("");
      try {
        if (isDemo) {
          await demoService.deleteProject();
        } else {
          await ProjectsService.deleteProject({ projectId: project.id });
        }
        await refetchPlatform();
        await refetchOrganizationProjects();
        setSelectedBucketID(undefined);
        setProjectMessage(`Project "${project.name}" deleted.`);
      } catch (error) {
        setProjectMessage(getErrorMessage(error, "Project deletion failed"));
      }
    });
  }

  async function createOrganization(event: SubmitEvent) {
    event.preventDefault();
    await runPending("workspace-create-organization", async () => {
      setOrganizationMessage("");
      try {
        const created = isDemo
          ? await demoService.createOrganization({ requestBody: organizationInput() })
          : await OrganizationsService.createOrganization({
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
        if (isDemo) {
          await demoService.updateOrganization({ organizationId: organization.id, requestBody: organizationEditInput() });
        } else {
          await OrganizationsService.updateOrganization({
            organizationId: organization.id,
            requestBody: {
              name: organizationEditInput().name,
              slug: organizationEditInput().slug,
            } as UpdateOrganizationRequest,
          });
        }
        await refetchPlatform();
        setOrganizationMessage(`Organization "${organizationEditInput().name}" updated.`);
      } catch (error) {
        setOrganizationMessage(getErrorMessage(error, "Organization update failed"));
      }
    });
  }

  async function deleteActiveOrganization() {
    const organization = activeOrganization();
    if (!organization) return;
    await runPending("workspace-delete-organization", async () => {
      setPlatformMessage("");
      try {
        if (isDemo) {
          await demoService.deleteOrganization({ organizationId: organization.id });
        } else {
          await OrganizationsService.deleteOrganization({ organizationId: organization.id });
        }
        await refetchPlatform();
        setSelectedBucketID(undefined);
        setPlatformMessage(`Organization "${organization.name}" deleted.`);
      } catch (error) {
        setPlatformMessage(getErrorMessage(error, "Organization deletion failed"));
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
        const response = isDemo
          ? await demoService.createInvitation({ requestBody: { email: invitationInput().email, orgRole: invitationInput().orgRole as never, projectId: invitationInput().attachProject ? activeProject()?.id : null, projectRole: invitationInput().attachProject ? invitationInput().projectRole : null } })
          : await OrganizationsService.createInvitation({
              organizationId: organizationID,
              requestBody: {
                email: invitationInput().email,
                orgRole: invitationInput().orgRole as CreateInvitationRequest.orgRole,
                projectId: invitationInput().attachProject && activeProject()?.id ? activeProject()!.id : null,
                projectRole: invitationInput().attachProject && activeProject()?.id
                  ? (invitationInput().projectRole as CreateInvitationRequest.projectRole)
                  : null,
              },
            });
        await refetchOrganizationInvitations();
        await refreshProjectOverviewSnapshot();
        setInvitationInput((current) => ({ ...current, email: "" }));
        setInviteMessage(`Invitation sent to ${response.email}.`);
      } catch (error) {
        setInviteMessage(getErrorMessage(error, "Invitation failed"));
      }
    });
  }

  async function revokeInvitation(invitationID: string) {
    const organizationID = activeOrganization()?.id;
    if (!organizationID) return;
    await runPending(`invite-revoke-${invitationID}`, async () => {
      setInviteMessage("");
      try {
        if (isDemo) {
          await demoService.revokeInvitation({ invitationId: invitationID });
        } else {
          await OrganizationsService.revokeInvitation({ organizationId: organizationID, invitationId: invitationID });
        }
        await refetchOrganizationInvitations();
        await refreshProjectOverviewSnapshot();
        setInviteMessage("Invitation revoked.");
      } catch (error) {
        setInviteMessage(getErrorMessage(error, "Invitation revoke failed"));
      }
    });
  }

  async function updateOrganizationMemberRole(userID: string, role: string) {
    const organizationID = activeOrganization()?.id;
    if (!organizationID) return;
    await runPending(`member-org-role-${userID}`, async () => {
      setMemberMessage("");
      try {
        if (isDemo) {
          await demoService.updateOrganizationMemberRole({ userId: userID, requestBody: { role: role as never } });
        } else {
          await OrganizationsService.updateOrganizationMemberRole({
            organizationId: organizationID,
            userId: userID,
            requestBody: { role: role as UpdateOrganizationMemberRoleRequest.role },
          });
        }
        await refetchOrganizationMembers();
        await refetchPlatform();
        setMemberMessage("Member role updated.");
      } catch (error) {
        setMemberMessage(getErrorMessage(error, "Role update failed"));
      }
    });
  }

  async function removeOrganizationMember(userID: string) {
    const organizationID = activeOrganization()?.id;
    if (!organizationID) return;
    await runPending(`member-org-remove-${userID}`, async () => {
      setMemberMessage("");
      try {
        if (isDemo) {
          await demoService.removeOrganizationMember({ userId: userID });
        } else {
          await OrganizationsService.removeOrganizationMember({ organizationId: organizationID, userId: userID });
        }
        await refetchOrganizationMembers();
        await refetchProjectMembers();
        await refreshProjectOverviewSnapshot();
        await refetchPlatform();
        setMemberMessage("Member removed.");
      } catch (error) {
        setMemberMessage(getErrorMessage(error, "Member removal failed"));
      }
    });
  }

  async function updateProjectMemberRole(userID: string, role: string) {
    const projectID = activeProject()?.id;
    if (!projectID) return;
    await runPending(`member-project-role-${userID}`, async () => {
      setMemberMessage("");
      try {
        if (isDemo) {
          await demoService.updateProjectMemberRole({ userId: userID, requestBody: { role: role as never } });
        } else {
          await ProjectsService.updateProjectMemberRole({
            projectId: projectID,
            userId: userID,
            requestBody: { role: role as UpdateProjectMemberRoleRequest.role },
          });
        }
        await refetchProjectMembers();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setMemberMessage("Member role updated.");
      } catch (error) {
        setMemberMessage(getErrorMessage(error, "Role update failed"));
      }
    });
  }

  async function removeProjectMember(userID: string) {
    const projectID = activeProject()?.id;
    if (!projectID) return;
    await runPending(`member-project-remove-${userID}`, async () => {
      setMemberMessage("");
      try {
        if (isDemo) {
          await demoService.removeProjectMember({ userId: userID });
        } else {
          await ProjectsService.removeProjectMember({ projectId: projectID, userId: userID });
        }
        await refetchProjectMembers();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        await refetchPlatform();
        setMemberMessage("Member removed.");
      } catch (error) {
        setMemberMessage(getErrorMessage(error, "Member removal failed"));
      }
    });
  }

  async function acceptInvitation() {
    const token = invitationToken();
    if (!token) return;
    await runPending("invite-accept", async () => {
      setPlatformMessage("");
      try {
        if (!isDemo) {
          await OrganizationsService.acceptInvitation({ requestBody: { token } });
        }
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
        const result = isDemo
          ? await demoService.createApiKey({ requestBody: { name: apiKeyName() } })
          : await ProjectsService.createApiKey({
              projectId: projectID,
              requestBody: {
                name: apiKeyName(),
                scopes: apiKeyScopes() as CreateApiKeyRequest["scopes"],
              },
            });
        setApiKeyScopes(["admin"]);
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
        if (isDemo) {
          await demoService.revokeApiKey({ apiKeyId: apiKeyID });
        } else {
          await ProjectsService.revokeApiKey({ projectId: projectID, apiKeyId: apiKeyID });
        }
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
        if (isDemo) {
          await demoService.createBucket({ requestBody: bucketInput() });
        } else {
          await StorageService.createBucket({
            projectId: projectID,
            requestBody: bucketInput() as CreateBucketRequest,
          });
        }
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
        if (isDemo) {
          await demoService.updateBucket({ bucketId: bucket.id, requestBody: bucketEditInput() });
        } else {
          await StorageService.updateBucket({
            bucketId: bucket.id,
            requestBody: {
              name: bucketEditInput().name,
              slug: bucketEditInput().slug,
              visibility: bucketEditInput().visibility,
            } as UpdateBucketRequest,
          });
        }
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
    await runPending(`storage-delete-bucket-${bucketID}`, async () => {
      setStorageMessage("");
      try {
        if (isDemo) {
          await demoService.deleteBucket({ bucketId: bucketID });
        } else {
          await StorageService.deleteBucket({ bucketId: bucketID });
        }
        await refetchBuckets();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setStorageMessage(`Bucket "${bucket.slug}" deleted.`);
      } catch (error) {
        setStorageMessage(getErrorMessage(error, "Bucket deletion failed"));
      }
    });
  }

  async function uploadObject(file: File) {
    const bucketID = selectedBucketID();
    if (!bucketID) return;
    await runPending(`storage-upload-${bucketID}`, async () => {
      setStorageMessage("");
      try {
        if (isDemo) {
          await demoService.uploadBucketObject({ bucketId: bucketID, formData: { objectKey: file.name, file } });
        } else {
          await StorageService.uploadBucketObject({
            bucketId: bucketID,
            formData: { objectKey: file.name, file },
          });
        }
        await refetchObjects();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setSelectedObjectKey(file.name);
        setSelectedFile(undefined);
        setStorageMessage(`Uploaded ${file.name}.`);
      } catch (error) {
        setStorageMessage(getErrorMessage(error, "Upload failed"));
      }
    });
  }

  async function moveSelectedObject() {
    const sourceBucketID = selectedBucketID();
    const object = selectedObject();
    if (!sourceBucketID || !object) return;
    const nextKey = renameObjectKeyInput().trim();
    if (nextKey.length === 0) {
      setStorageMessage("New object key is required.");
      return;
    }
    const destinationBucketID = moveDestinationBucketID().trim() || sourceBucketID;

    await runPending(`storage-move-object-${object.object_key}`, async () => {
      setStorageMessage("");
      try {
        if (isDemo) {
          await demoService.updateBucketObject({ objectKey: object.object_key, requestBody: { newObjectKey: nextKey } });
        } else {
          await StorageService.updateBucketObject({
            bucketId: sourceBucketID,
            objectKey: object.object_key,
            requestBody: {
              newObjectKey: nextKey,
              destinationBucketId: destinationBucketID === sourceBucketID ? null : destinationBucketID,
            } as UpdateBucketObjectRequest,
          });
        }
        await refetchAuditLogs();
        if (destinationBucketID === sourceBucketID) {
          await refetchObjects();
          setSelectedObjectKey(nextKey);
          setStorageMessage(`Renamed to ${nextKey}.`);
        } else {
          setSelectedBucketID(destinationBucketID);
          setSelectedObjectKey(nextKey);
          setStorageMessage(`Moved to ${nextKey} in destination bucket.`);
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
    const nextKey = renameObjectKeyInput().trim();
    if (nextKey.length === 0) {
      setStorageMessage("New object key is required.");
      return;
    }
    const destinationBucketID = moveDestinationBucketID().trim() || sourceBucketID;

    await runPending(`storage-copy-object-${object.object_key}`, async () => {
      setStorageMessage("");
      try {
        if (isDemo) {
          await demoService.copyBucketObject({ requestBody: { objectKey: object.object_key, newObjectKey: nextKey } });
        } else {
          await StorageService.copyBucketObject({
            bucketId: sourceBucketID,
            requestBody: {
              objectKey: object.object_key,
              newObjectKey: nextKey,
              destinationBucketId: destinationBucketID === sourceBucketID ? null : destinationBucketID,
            } as CopyBucketObjectRequest,
          });
        }
        await refetchAuditLogs();
        if (destinationBucketID === sourceBucketID) {
          await refetchObjects();
          setSelectedObjectKey(nextKey);
          setStorageMessage(`Copied to ${nextKey}.`);
        } else {
          setSelectedBucketID(destinationBucketID);
          setSelectedObjectKey(nextKey);
          setStorageMessage(`Copied to ${nextKey} in destination bucket.`);
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
        const blob = isDemo
          ? await demoService.downloadBucketObject()
          : await StorageService.downloadBucketObject({ bucketId: bucketID, objectKey: object.object_key });
        const href = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = href;
        anchor.download = object.object_key.split("/").pop() ?? object.object_key;
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
    try {
      await navigator.clipboard.writeText(url);
      setStorageMessage(`Public URL copied for ${object.object_key}.`);
    } catch {
      setStorageMessage(`Could not copy URL — clipboard unavailable.`);
    }
  }

  async function deleteObject(object: BucketObject) {
    const bucketID = selectedBucketID();
    if (!bucketID) return;
    await runPending(`storage-delete-object-${object.object_key}`, async () => {
      setStorageMessage("");
      try {
        if (isDemo) {
          await demoService.deleteBucketObject({ objectKey: object.object_key });
        } else {
          await StorageService.deleteBucketObject({ bucketId: bucketID, objectKey: object.object_key });
        }
        await refetchObjects();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        if (selectedObjectKey() === object.object_key) setSelectedObjectKey(undefined);
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
        const result = isDemo
          ? await demoService.createCollection({ requestBody: collectionInput() })
          : await CollectionsService.createCollection({
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
    if (!projectID) return;
    await runPending(`collection-delete-${collectionID}`, async () => {
      setCollectionsMessage("");
      try {
        if (isDemo) {
          await demoService.deleteCollection({ collectionId: collectionID });
        } else {
          await CollectionsService.deleteCollection({ projectId: projectID, collectionId: collectionID });
        }
        await refetchCollections();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        if (selectedCollectionID() === collectionID) setSelectedCollectionID(undefined);
        setCollectionsMessage("Collection deleted.");
      } catch (error) {
        setCollectionsMessage(getErrorMessage(error, "Collection deletion failed"));
      }
    });
  }

  async function createDocument(data: Record<string, unknown>) {
    const collectionID = selectedCollectionID();
    if (!collectionID) return;
    await runPending("document-create", async () => {
      try {
        if (isDemo) {
          await demoService.createDocument({ collectionId: collectionID, requestBody: { data } });
        } else {
          await CollectionsService.createDocument({ collectionId: collectionID, requestBody: { data } });
        }
        await refetchDocuments();
        await refetchAuditLogs();
        setCollectionsMessage("Document created.");
      } catch (error) {
        setCollectionsMessage(getErrorMessage(error, "Document creation failed"));
      }
    });
  }

  async function updateDocument(documentID: string, data: Record<string, unknown>) {
    const collectionID = selectedCollectionID();
    if (!collectionID) return;
    await runPending(`document-update-${documentID}`, async () => {
      try {
        if (isDemo) {
          await demoService.updateDocument({ documentId: documentID, requestBody: { data } });
        } else {
          await CollectionsService.updateDocument({
            collectionId: collectionID,
            documentId: documentID,
            requestBody: { data },
          });
        }
        await refetchDocuments();
        await refetchAuditLogs();
        setCollectionsMessage("Document updated.");
      } catch (error) {
        setCollectionsMessage(getErrorMessage(error, "Document update failed"));
      }
    });
  }

  async function deleteDocument(documentID: string) {
    const collectionID = selectedCollectionID();
    if (!collectionID) return;
    await runPending(`document-delete-${documentID}`, async () => {
      try {
        if (isDemo) {
          await demoService.deleteDocument({ documentId: documentID });
        } else {
          await CollectionsService.deleteDocument({ collectionId: collectionID, documentId: documentID });
        }
        await refetchDocuments();
        await refetchAuditLogs();
        await refreshProjectOverviewSnapshot();
        setCollectionsMessage("Document deleted.");
      } catch (error) {
        setCollectionsMessage(getErrorMessage(error, "Document deletion failed"));
      }
    });
  }

  async function saveInstanceSetting(key: string, value: unknown) {
    await runPending("instance-", async () => {
      setInstanceMessage("");
      try {
        await InstanceService.updateInstanceSetting({ key, requestBody: { value } });
        await refetchInstanceSettings();
        setInstanceMessage("Setting saved.");
      } catch (error) {
        setInstanceMessage(getErrorMessage(error, "Failed to save setting"));
      }
    });
  }

  async function resetInstanceSetting(key: string) {
    await runPending("instance-", async () => {
      setInstanceMessage("");
      try {
        await InstanceService.deleteInstanceSetting({ key });
        await refetchInstanceSettings();
        setInstanceMessage(`"${key}" reverted to its env/default value.`);
      } catch (error) {
        setInstanceMessage(getErrorMessage(error, "Failed to reset setting"));
      }
    });
  }

  async function startSocial(provider: "github" | "google" | "discord" | "microsoft") {
    if (isDemo) {
      setAuthMessage("Demo mode is active — social auth is simulated.");
      return;
    }
    await runPending(`auth-social-${provider}`, async () => {
      await authClient.signIn.social({ provider, callbackURL: window.location.pathname || "/" });
    });
  }

  const handleLogout = () => {
    if (isDemo) {
      disableDemoMode();
    } else {
      authClient.signOut();
    }
  };

  /* ---------------------------------------------------------- */
  /* command palette                                            */
  /* ---------------------------------------------------------- */

  const paletteCommands = createMemo<PaletteCommand[]>(() => [
    { id: "nav-dashboard", label: "Go to Overview", category: "Navigate", icon: <IconOverview class="w-4 h-4" />, keywords: ["home", "dashboard"], action: () => setActiveView("dashboard") },
    { id: "nav-projects", label: "Go to Projects", category: "Navigate", icon: <IconProjects class="w-4 h-4" />, keywords: ["project"], action: () => setActiveView("projects") },
    { id: "nav-members", label: "Go to Members", category: "Navigate", icon: <IconMembers class="w-4 h-4" />, keywords: ["team", "users", "invite"], action: () => setActiveView("members") },
    { id: "nav-databases", label: "Go to Databases", category: "Navigate", icon: <IconDatabases class="w-4 h-4" />, keywords: ["db", "sql", "query", "tables", "redis"], action: () => setActiveView("databases") },
    { id: "nav-telemetry", label: "Go to Telemetry", category: "Navigate", icon: <IconTelemetry class="w-4 h-4" />, keywords: ["errors", "metrics", "logs", "observability", "issues"], action: () => setActiveView("telemetry") },
    { id: "nav-automation", label: "Go to Automation", category: "Navigate", icon: <IconZap class="w-4 h-4" />, keywords: ["cron", "jobs", "schedule", "events", "realtime"], action: () => setActiveView("automation") },
    { id: "nav-vault", label: "Go to Vault", category: "Navigate", icon: <IconKey class="w-4 h-4" />, keywords: ["secrets", "env", "credentials", "api key", "token"], action: () => setActiveView("vault") },
    { id: "nav-storage", label: "Go to Storage", category: "Navigate", icon: <IconStorage class="w-4 h-4" />, keywords: ["files", "buckets", "upload"], action: () => setActiveView("storage") },
    { id: "nav-collections", label: "Go to Collections", category: "Navigate", icon: <IconCollections class="w-4 h-4" />, keywords: ["documents", "database"], action: () => setActiveView("collections") },
    { id: "nav-auth", label: "Go to Authentication", category: "Navigate", icon: <IconAuth class="w-4 h-4" />, keywords: ["users", "sign in", "ban"], action: () => setActiveView("auth") },
    { id: "nav-audit", label: "Go to Audit log", category: "Navigate", icon: <IconAudit class="w-4 h-4" />, keywords: ["logs", "events"], action: () => setActiveView("audit") },
    { id: "nav-settings", label: "Go to Settings", category: "Navigate", icon: <IconSettings class="w-4 h-4" />, keywords: ["api keys", "organization"], action: () => setActiveView("settings") },
    { id: "act-theme", label: `Switch to ${theme() === "dark" ? "light" : "dark"} theme`, category: "Actions", keywords: ["dark", "light", "appearance"], action: () => setTheme(theme() === "dark" ? "light" : "dark") },
    { id: "act-new-project", label: "Create project", category: "Actions", icon: <IconPlus class="w-4 h-4" />, action: () => setActiveView("projects") },
    { id: "act-new-key", label: "Create API key", category: "Actions", icon: <IconKey class="w-4 h-4" />, action: () => setActiveView("settings") },
    { id: "act-upload", label: "Upload file", category: "Actions", icon: <IconUpload class="w-4 h-4" />, action: () => setActiveView("storage") },
    { id: "act-logout", label: isDemo ? "Exit demo mode" : "Sign out", category: "Session", action: handleLogout },
  ]);

  const healthState = () => {
    const status = health()?.status;
    if (status === "ok") return "ok" as const;
    if (status === "error" || status === "degraded") return "err" as const;
    return "warn" as const;
  };
  const healthLabel = () => {
    const status = health()?.status;
    return status === "ok" ? "Operational" : status === "degraded" ? "Degraded" : status === "error" ? "Unreachable" : "Connecting";
  };

  /* ---------------------------------------------------------- */
  /* render                                                     */
  /* ---------------------------------------------------------- */

  const user = () => session()?.data?.user;

  return (
    <Show
      when={session()?.data}
      fallback={
        <LoginPage
          mode={mode()}
          email={email()}
          password={password()}
          name={name()}
          authMessage={authMessage()}
          authPending={authPending()}
          canSignUp={canSignUp()}
          bootstrapRequired={instancePublic()?.bootstrap_required ?? false}
          enabledProviders={enabledSocialProviders()}
          onModeChange={setMode}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onNameChange={setName}
          onSubmit={handleAuthSubmit}
          onSocial={startSocial}
          onTryDemo={isDemo ? undefined : enableDemoMode}
        />
      }
    >
      <AppShell
        view={activeView()}
        onNavigate={setActiveView}
        organizations={platform()?.organizations ?? []}
        projects={availableProjects()}
        selectedOrgId={selectedOrganizationID() ?? null}
        selectedProjectId={selectedProjectID() ?? null}
        onSelectOrg={(id) => {
          setSelectedOrganizationID(id);
          setSelectedProjectID(undefined);
        }}
        onSelectProject={(id) => setSelectedProjectID(id)}
        userName={user()?.name}
        userEmail={user()?.email}
        onLogout={handleLogout}
        onOpenPalette={() => setPaletteOpen(true)}
        demoMode={isDemo}
        onExitDemo={disableDemoMode}
        theme={theme()}
        onToggleTheme={() => setTheme(theme() === "dark" ? "light" : "dark")}
        health={healthState()}
        healthLabel={healthLabel()}
      >
        {/* pending invitation banner */}
        <Show when={invitationToken()}>
          <div class="message message-info mb-5" style="display:flex;align-items:center;justify-content:space-between">
            <span>You have a pending invitation.</span>
            <button class="btn btn-primary btn-sm" onClick={acceptInvitation} disabled={invitationPending()}>
              Accept invitation
            </button>
          </div>
        </Show>
        <Show when={platformMessage()}>
          <div class="message message-neutral mb-5">{platformMessage()}</div>
        </Show>
        <PwaInstallBanner />

        <Show
          when={platform() || isDemo}
          fallback={
            <div class="page">
              <div class="skeleton" style="height:2rem;width:12rem;border-radius:8px" />
              <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div class="skeleton" style="height:6rem;border-radius:12px" />
                <div class="skeleton" style="height:6rem;border-radius:12px" />
                <div class="skeleton" style="height:6rem;border-radius:12px" />
                <div class="skeleton" style="height:6rem;border-radius:12px" />
              </div>
            </div>
          }
        >
          {/* dashboard */}
          <Show when={activeView() === "dashboard"}>
            <Show
              when={activeProject()}
              fallback={
                <div class="page">
                  <Show
                    when={(platform()?.organizations ?? []).length > 0}
                    fallback={
                      <div class="card" style="max-width:26rem;margin:4rem auto 0">
                        <div class="card-header">
                          <span class="card-header-title">Create your workspace</span>
                          <span class="card-header-description">
                            An organization is the top-level container for projects, members, and billing.
                          </span>
                        </div>
                        <form onSubmit={createOrganization} class="space-y-4">
                          <Input
                            label="Organization name"
                            placeholder="Acme Corporation"
                            value={organizationInput().name}
                            onInput={(e) => setOrganizationInput((c) => ({ ...c, name: e.currentTarget.value }))}
                            required
                          />
                          <Input
                            label="Slug"
                            placeholder="acme"
                            value={organizationInput().slug}
                            onInput={(e) => setOrganizationInput((c) => ({ ...c, slug: e.currentTarget.value }))}
                            required
                          />
                          <button type="submit" class="btn btn-primary w-full" disabled={workspacePending()}>
                            Create organization
                          </button>
                        </form>
                      </div>
                    }
                  >
                    <div class="card empty-state" style="min-height:20rem">
                      <div class="empty-state-icon">
                        <IconProjects class="w-5 h-5" />
                      </div>
                      <p class="empty-state-title">No project selected</p>
                      <p class="empty-state-description">
                        Pick a project in the sidebar, or create one to get started.
                      </p>
                      <button class="btn btn-primary mt-4" onClick={() => setActiveView("projects")}>
                        <IconPlus class="w-4 h-4" />
                        Create project
                      </button>
                    </div>
                  </Show>
                </div>
              }
            >
              <ProjectDashboard
                project={activeProject()!}
                overview={projectOverview()}
                recentAudit={auditLogs()}
                onNavigate={(view) => setActiveView(view as ViewType)}
              />
            </Show>
          </Show>

          <Show when={activeView() === "projects"}>
            <ProjectsPage
              projects={availableProjects()}
              selectedProjectID={selectedProjectID()}
              projectInput={projectInput()}
              projectEditInput={projectEditInput()}
              projectMessage={projectMessage()}
              projectPending={projectPending()}
              canUpdateProject={canUpdateProject()}
              onProjectInputChange={(field, value) => setProjectInput((c) => ({ ...c, [field]: value }))}
              onProjectEditInputChange={(field, value) => setProjectEditInput((c) => ({ ...c, [field]: value }))}
              onCreateProject={createProject}
              onUpdateProject={updateActiveProject}
              onDeleteProject={deleteActiveProject}
              onSelectProject={setSelectedProjectID}
              onNavigateToDashboard={() => setActiveView("dashboard")}
            />
          </Show>

          <Show when={activeView() === "members"}>
            <MembersPage
              projectID={activeProject()?.id}
              demoMode={isDemo}
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
              onInvitationInputChange={(field, value) => setInvitationInput((c) => ({ ...c, [field]: value }))}
              onSendInvitation={createInvitation}
              onRevokeInvitation={revokeInvitation}
              onRemoveMember={(id, type) => (type === "org" ? removeOrganizationMember(id) : removeProjectMember(id))}
              onUpdateMemberRole={(id, role, type) =>
                type === "org" ? updateOrganizationMemberRole(id, role) : updateProjectMemberRole(id, role)
              }
            />
          </Show>

          <Show when={activeView() === "databases"}>
            <DatabasesPage
              projectID={activeProject()?.id}
              canManage={canUpdateProject()}
              demoMode={isDemo}
            />
          </Show>

          <Show when={activeView() === "telemetry"}>
            <TelemetryPage
              projectID={activeProject()?.id}
              canManage={canUpdateProject()}
              demoMode={isDemo}
            />
          </Show>

          <Show when={activeView() === "integrations"}>
            <IntegrationsPage
              projectID={activeProject()?.id}
              canManage={canUpdateProject()}
              demoMode={isDemo}
            />
          </Show>

          <Show when={activeView() === "automation"}>
            <AutomationPage
              projectID={activeProject()?.id}
              canManage={canUpdateProject()}
              demoMode={isDemo}
            />
          </Show>

          <Show when={activeView() === "vault"}>
            <VaultPage
              projectID={activeProject()?.id}
              canManage={canUpdateProject()}
              demoMode={isDemo}
            />
          </Show>

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
              previewLoading={objectPreview.loading}
              renameObjectKey={renameObjectKeyInput()}
              moveDestinationBucketID={moveDestinationBucketID()}
              onBucketInputChange={(field, value) => setBucketInput((c) => ({ ...c, [field]: value }))}
              onBucketEditInputChange={(field, value) => setBucketEditInput((c) => ({ ...c, [field]: value }))}
              onCreateBucket={createBucket}
              onUpdateBucket={updateSelectedBucket}
              onDeleteBucket={deleteSelectedBucket}
              onSelectBucket={setSelectedBucketID}
              onSelectObject={setSelectedObjectKey}
              onUploadObject={uploadObject}
              onDeleteObject={(key) => {
                const obj = objects().find((o) => o.object_key === key);
                if (obj) deleteObject(obj);
              }}
              onDownloadObject={(_bucketId, key) => {
                const obj = objects().find((o) => o.object_key === key);
                if (obj) downloadObject(obj);
              }}
              onCopyObjectURL={copyObjectURL}
              onMoveObject={moveSelectedObject}
              onCopyObject={copySelectedObject}
              onRenameObjectKeyChange={setRenameObjectKeyInput}
              onMoveDestinationChange={setMoveDestinationBucketID}
              onObjectPageChange={setObjectOffset}
              formatBytes={formatBytes}
              formatDate={formatDate}
            />
          </Show>

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
              onCollectionInputChange={(field, value) => setCollectionInput((c) => ({ ...c, [field]: value }))}
              onCreateCollection={createCollection}
              onDeleteCollection={deleteCollection}
              onSelectCollection={setSelectedCollectionID}
              onCreateDocument={createDocument}
              onUpdateDocument={updateDocument}
              onDeleteDocument={deleteDocument}
              formatDate={formatDate}
            />
          </Show>

          <Show when={activeView() === "audit"}>
            <AuditPage
              auditLogs={auditLogs()}
              auditSearch={auditSearch()}
              auditAction={auditAction()}
              auditOffset={auditOffset()}
              auditPage={auditLogsPage()}
              onAuditSearchChange={setAuditSearch}
              onAuditActionChange={setAuditAction}
              onAuditPageChange={setAuditOffset}
              onRefreshAudit={refetchAuditLogs}
              formatDate={formatDate}
            />
          </Show>

          <Show when={activeView() === "auth"}>
            <AuthPage
              users={authUsers()}
              pending={authUsersPending() || authUsers.loading}
              message={authUsersMessage()}
              error={authUsersError()}
              currentUserId={session()?.data?.user.id}
              onRefresh={() => void refetchAuthUsers()}
              onSetRole={(id, role) =>
                void runAuthUserAction(async () => {
                  if (isDemo) return demoService.setAuthUserRole(id, role);
                  const res = await authClient.admin.setRole({
                    userId: id,
                    role: role as "admin" | "user",
                  });
                  if (res.error) throw new Error(res.error.message ?? "Role update failed");
                }, "Role updated")
              }
              onSetBanned={(id, banned) =>
                void runAuthUserAction(async () => {
                  if (isDemo) return demoService.setAuthUserBanned(id, banned);
                  const res = banned
                    ? await authClient.admin.banUser({ userId: id })
                    : await authClient.admin.unbanUser({ userId: id });
                  if (res.error) throw new Error(res.error.message ?? "Ban update failed");
                }, banned ? "User banned" : "User unbanned")
              }
              onRemove={(id) =>
                void runAuthUserAction(async () => {
                  if (isDemo) return demoService.removeAuthUser(id);
                  const res = await authClient.admin.removeUser({ userId: id });
                  if (res.error) throw new Error(res.error.message ?? "Delete failed");
                }, "User deleted")
              }
            />
          </Show>

          <Show when={activeView() === "settings"}>
            <SettingsPage
              isPlatformAdmin={isPlatformAdmin()}
              instanceSettings={instanceSettings()}
              instancePending={instancePending() || instanceSettings.loading}
              instanceMessage={instanceMessage()}
              onSaveInstanceSetting={(key, value) => void saveInstanceSetting(key, value)}
              onResetInstanceSetting={(key) => void resetInstanceSetting(key)}
              apiKeys={apiKeys()}
              apiKeyName={apiKeyName()}
              apiKeyScopes={apiKeyScopes()}
              apiKeySecret={apiKeySecret()}
              apiKeyMessage={apiKeyMessage()}
              apiKeyPending={apiKeyPending()}
              organizationInput={organizationInput()}
              organizationEditInput={organizationEditInput()}
              organizationMessage={organizationMessage()}
              canUpdateOrganization={canUpdateOrganization()}
              workspacePending={workspacePending()}
              hasActiveOrganization={!!activeOrganization()}
              onApiKeyNameChange={setApiKeyName}
              onApiKeyScopeToggle={(scope) =>
                setApiKeyScopes((c) => (c.includes(scope) ? c.filter((s) => s !== scope) : [...c, scope]))
              }
              onCreateApiKey={createApiKey}
              onDeleteApiKey={revokeApiKey}
              onOrganizationInputChange={(field, value) => setOrganizationInput((c) => ({ ...c, [field]: value }))}
              onOrganizationEditInputChange={(field, value) => setOrganizationEditInput((c) => ({ ...c, [field]: value }))}
              onCreateOrganization={createOrganization}
              onUpdateOrganization={updateActiveOrganization}
              onDeleteOrganization={deleteActiveOrganization}
              onDismissSecret={() => setApiKeySecret("")}
              formatDate={formatDate}
            />
          </Show>
        </Show>
      </AppShell>

      <CommandPaletteEnhanced
        commands={paletteCommands()}
        isOpen={paletteOpen()}
        onClose={() => setPaletteOpen(false)}
      />

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

      <OnboardingModal
        isOpen={showOnboarding()}
        projectName={activeProject()?.name ?? "Your project"}
        onClose={() => setShowOnboarding(false)}
      />
    </Show>
  );
}
