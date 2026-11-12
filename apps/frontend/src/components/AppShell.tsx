import { type JSX, For, Show, createSignal, onCleanup, onMount } from "solid-js";
import type { OrganizationSummary, ProjectSummary } from "@primora/api-client";
import { type ViewType } from "../lib/views";
import {
  LogoMark,
  IconOverview,
  IconProjects,
  IconMembers,
  IconStorage,
  IconCollections,
  IconDatabases,
  IconTelemetry,
  IconIntegrations,
  IconZap,
  IconTerminal,
  IconKey,
  IconAudit,
  IconAuth,
  IconSettings,
  IconSearch,
  IconLogout,
  IconMenu,
  IconSun,
  IconMoon,
  IconX,
} from "./Icons";

export type { ViewType };

interface NavEntry {
  id: ViewType;
  label: string;
  shortLabel?: string;
  keywords: string[];
  icon: (p: { class?: string }) => JSX.Element;
}

const projectNav: NavEntry[] = [
  { id: "dashboard", label: "Overview", icon: IconOverview, keywords: ["home", "dashboard"] },
  { id: "databases", label: "Databases", icon: IconDatabases, keywords: ["db", "sql", "query", "tables", "redis"] },
  { id: "telemetry", label: "Telemetry", icon: IconTelemetry, keywords: ["errors", "metrics", "logs", "observability", "issues"] },
  { id: "integrations", label: "Integrations", icon: IconIntegrations, keywords: ["webhooks", "rybbit", "connectors", "alerts"] },
  { id: "automation", label: "Automation", icon: IconZap, keywords: ["cron", "jobs", "schedule", "events", "realtime"] },
  { id: "functions", label: "Functions", icon: IconTerminal, keywords: ["serverless", "code", "lambda", "invoke"] },
  { id: "vault", label: "Vault", icon: IconKey, keywords: ["secrets", "env", "credentials"] },
  { id: "storage", label: "Storage", icon: IconStorage, keywords: ["files", "buckets", "upload"] },
  { id: "collections", label: "Collections", icon: IconCollections, keywords: ["documents", "json"] },
  { id: "auth", label: "Authentication", icon: IconAuth, keywords: ["users", "sign in", "ban"] },
  { id: "audit", label: "Audit log", icon: IconAudit, keywords: ["logs", "events", "history"] },
];

const workspaceNav: NavEntry[] = [
  { id: "projects", label: "Projects", icon: IconProjects, keywords: ["project"] },
  { id: "members", label: "Members", icon: IconMembers, keywords: ["team", "users", "invite"] },
  { id: "settings", label: "Settings", icon: IconSettings, keywords: ["api keys", "organization"] },
];

// Sidebar order. The command palette is built from this, so a new page cannot be unreachable from search.
export const shellNav: NavEntry[] = [...projectNav, ...workspaceNav];

// Five slots: four destinations plus Menu. Everything else stays in the drawer.
const BOTTOM_NAV_IDS: ViewType[] = ["dashboard", "databases", "storage", "telemetry"];
const bottomNav: NavEntry[] = BOTTOM_NAV_IDS.flatMap((id) => {
  const entry = projectNav.find((item) => item.id === id);
  return entry ? [entry] : [];
});

interface AppShellProps {
  view: ViewType;
  onNavigate: (view: ViewType) => void;
  organizations: OrganizationSummary[];
  projects: ProjectSummary[];
  selectedOrgId: string | null;
  selectedProjectId: string | null;
  onSelectOrg: (id: string) => void;
  onSelectProject: (id: string) => void;
  userName?: string;
  userEmail?: string;
  onLogout: () => void;
  onOpenPalette: () => void;
  demoMode: boolean;
  onExitDemo: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  health: "ok" | "warn" | "err";
  healthLabel: string;
  children?: JSX.Element;
}

const viewTitle: Record<ViewType, string> = Object.fromEntries(
  shellNav.map((entry) => [entry.id, entry.label]),
) as Record<ViewType, string>;

function initials(name?: string, email?: string): string {
  const src = name || email || "?";
  return src
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

export function AppShell(props: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = createSignal(false);

  const currentOrg = () =>
    props.organizations.find((o) => o.id === props.selectedOrgId);
  const currentProject = () =>
    props.projects.find((p) => p.id === props.selectedProjectId);

  const navigate = (view: ViewType) => {
    props.onNavigate(view);
    setSidebarOpen(false);
  };

  const handleKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      props.onOpenPalette();
    }
  };

  onMount(() => window.addEventListener("keydown", handleKey));
  onCleanup(() => window.removeEventListener("keydown", handleKey));

  const NavButton = (entry: NavEntry) => (
    <button
      class={`nav-item ${props.view === entry.id ? "active" : ""}`}
      data-testid={`nav-${entry.id}`}
      onClick={() => navigate(entry.id)}
      aria-current={props.view === entry.id ? "page" : undefined}
    >
      <entry.icon class="w-4 h-4" />
      {entry.label}
    </button>
  );

  return (
    <div class="shell">
      <Show when={sidebarOpen()}>
        <div class="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      </Show>

      <aside class={`sidebar ${sidebarOpen() ? "open" : ""}`}>
        <div class="sidebar-brand">
          <LogoMark class="brand-mark" />
          <span class="brand-name">Primora</span>
          <button
            class="icon-btn md:hidden ml-auto"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <IconX class="w-4 h-4" />
          </button>
        </div>

        <div class="sidebar-context">
          <div class="context-select">
            <span class="ctx-icon">{(currentOrg()?.name ?? "?")[0]?.toUpperCase()}</span>
            <span class="ctx-label">{currentOrg()?.name ?? "Select organization"}</span>
            <select
              aria-label="Select organization"
              value={props.selectedOrgId ?? ""}
              onChange={(e) => props.onSelectOrg(e.currentTarget.value)}
            >
              <For each={props.organizations}>
                {(org) => <option value={org.id}>{org.name}</option>}
              </For>
            </select>
          </div>
          <div class="context-select">
            <span class="ctx-icon" style="background: var(--accent-muted); color: var(--accent);">
              {(currentProject()?.name ?? "?")[0]?.toUpperCase()}
            </span>
            <span class="ctx-label">{currentProject()?.name ?? "Select project"}</span>
            <select
              aria-label="Select project"
              value={props.selectedProjectId ?? ""}
              onChange={(e) => props.onSelectProject(e.currentTarget.value)}
            >
              <For each={props.projects}>
                {(project) => <option value={project.id}>{project.name}</option>}
              </For>
            </select>
          </div>
        </div>

        <nav class="sidebar-nav" aria-label="Primary">
          <div class="nav-section">Project</div>
          <For each={projectNav}>{NavButton}</For>
          <div class="nav-section">Workspace</div>
          <For each={workspaceNav}>{NavButton}</For>
        </nav>

        <div class="sidebar-footer">
          <div class="user-card">
            <span class="avatar" style="width: 1.75rem; height: 1.75rem; font-size: 0.625rem;">
              {initials(props.userName, props.userEmail)}
            </span>
            <div class="flex-1 min-w-0">
              <div class="user-name">{props.userName ?? "Account"}</div>
              <div class="user-email">{props.userEmail ?? ""}</div>
            </div>
            <button
              class="icon-btn"
              onClick={props.onLogout}
              aria-label="Sign out"
              title="Sign out"
            >
              <IconLogout class="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <div class="main-col">
        <header class="topbar">
          <button
            class="icon-btn md:hidden"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu class="w-5 h-5" />
          </button>

          <nav class="topbar-breadcrumb" aria-label="Breadcrumb">
            <span class="crumb">{currentOrg()?.name ?? "Workspace"}</span>
            <span class="crumb-sep">/</span>
            <span class="crumb">{currentProject()?.name ?? "—"}</span>
            <span class="crumb-sep">/</span>
            <span class="crumb current">{viewTitle[props.view]}</span>
          </nav>

          <div class="flex-1" />

          <button class="topbar-search hidden sm:flex" onClick={props.onOpenPalette}>
            <IconSearch class="w-3.5 h-3.5" />
            <span>Search</span>
            <span class="kbd">⌘K</span>
          </button>

          <div class="health-pill" title={`Backend ${props.healthLabel}`}>
            <span class={`health-dot ${props.health}`} />
            <span class="hidden md:inline">{props.healthLabel}</span>
          </div>

          <Show when={props.demoMode}>
            <button class="demo-pill" onClick={props.onExitDemo} title="Exit demo mode">
              <span class="health-dot warn" />
              Demo — exit
            </button>
          </Show>

          <button
            class="icon-btn"
            onClick={props.onToggleTheme}
            aria-label="Toggle theme"
            title={props.theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          >
            <Show when={props.theme === "dark"} fallback={<IconMoon class="w-4 h-4" />}>
              <IconSun class="w-4 h-4" />
            </Show>
          </button>
        </header>

        <main class="main-content">{props.children}</main>

        <nav class="bottom-nav" aria-label="Primary">
          <For each={bottomNav}>
            {(entry) => (
              <button
                class={`bottom-nav-item ${props.view === entry.id ? "active" : ""}`}
                data-testid={`bottom-nav-${entry.id}`}
                onClick={() => navigate(entry.id)}
                aria-current={props.view === entry.id ? "page" : undefined}
              >
                <entry.icon class="w-5 h-5" />
                <span>{entry.shortLabel ?? entry.label}</span>
              </button>
            )}
          </For>
          <button
            class={`bottom-nav-item ${bottomNav.some((e) => e.id === props.view) ? "" : "active"}`}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <IconMenu class="w-5 h-5" />
            <span>Menu</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
