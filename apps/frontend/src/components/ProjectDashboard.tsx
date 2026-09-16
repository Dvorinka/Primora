import { For, Show } from "solid-js";
import type { AuditLog, ProjectOverview, ProjectSummary } from "@primora/api-client";
import {
  IconStorage,
  IconKey,
  IconMembers,
  IconAudit,
  IconCollections,
  IconChevronRight,
} from "./Icons";

interface ProjectDashboardProps {
  project: ProjectSummary;
  overview?: ProjectOverview;
  recentAudit?: AuditLog[];
  onNavigate: (view: string) => void;
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined || bytes === null) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit++;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

function formatRelative(value?: string | null): string {
  if (!value) return "never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "never";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function actionTone(action: string): string {
  if (action.includes("delet") || action.includes("revok") || action.includes("remov"))
    return "var(--error)";
  if (action.includes("creat") || action.includes("upload") || action.includes("invit"))
    return "var(--success)";
  return "var(--text-3)";
}

export function ProjectDashboard(props: ProjectDashboardProps) {
  const overview = () => props.overview;

  const metrics = () => [
    {
      label: "Members",
      icon: IconMembers,
      value: overview()?.member_count,
      sub: `${overview()?.pending_invitation_count ?? 0} pending`,
      view: "members",
    },
    {
      label: "API keys",
      icon: IconKey,
      value: overview()?.active_api_key_count,
      sub: "active credentials",
      view: "settings",
    },
    {
      label: "Objects",
      icon: IconStorage,
      value: overview()?.object_count,
      sub: `${overview()?.bucket_count ?? 0} buckets · ${formatBytes(overview()?.object_bytes_total)}`,
      view: "storage",
    },
    {
      label: "Events 24h",
      icon: IconAudit,
      value: overview()?.audit_events_24h,
      sub: `last ${formatRelative(overview()?.last_audit_at)}`,
      view: "audit",
    },
  ];

  const resources = () => [
    {
      title: "Storage",
      sub: `${overview()?.bucket_count ?? 0} buckets`,
      icon: IconStorage,
      view: "storage",
    },
    {
      title: "Collections",
      sub: "JSON documents",
      icon: IconCollections,
      view: "collections",
    },
    {
      title: "Credentials",
      sub: `${overview()?.active_api_key_count ?? 0} active keys`,
      icon: IconKey,
      view: "settings",
    },
    {
      title: "Members",
      sub: `${overview()?.member_count ?? 0} in project`,
      icon: IconMembers,
      view: "members",
    },
  ];

  const audit = () => (props.recentAudit ?? []).slice(0, 6);

  return (
    <div class="page">
      <div class="page-header">
        <div style="min-width: 0">
          <h1 class="page-title">{props.project.name}</h1>
          <p class="page-description">
            <code>{props.project.slug}</code>
            <Show when={props.project.description}>
              <span style="color: var(--border-strong)">{"  ·  "}</span>
              {props.project.description}
            </Show>
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-secondary btn-sm" onClick={() => props.onNavigate("settings")}>
            <IconKey class="w-3.5 h-3.5" />
            Keys
          </button>
          <button class="btn btn-primary btn-sm" onClick={() => props.onNavigate("storage")}>
            Open storage
          </button>
        </div>
      </div>

      {/* metric strip — hairline divided, mono numerals */}
      <div class="metric-strip">
        <For each={metrics()}>
          {(m) => (
            <div
              class="metric"
              style="cursor:pointer"
              onClick={() => props.onNavigate(m.view)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && props.onNavigate(m.view)}
            >
              <div class="metric-label">
                <m.icon />
                {m.label}
              </div>
              <Show
                when={m.value !== undefined}
                fallback={<div class="skeleton" style="height:1.75rem;width:2.5rem;margin-top:0.375rem;border-radius:4px" />}
              >
                <div class="metric-value">{m.value}</div>
              </Show>
              <div class="metric-sub">{m.sub}</div>
            </div>
          )}
        </For>
      </div>

      <div class="grid gap-8 lg:grid-cols-5" style="align-items: start">
        {/* recent activity — real audit feed */}
        <div class="lg:col-span-3" style="min-width: 0">
          <div class="flex items-center justify-between" style="margin-bottom: 0.75rem">
            <h2 class="section-title">Recent activity</h2>
            <button
              class="btn btn-ghost btn-sm"
              style="color: var(--text-3)"
              onClick={() => props.onNavigate("audit")}
            >
              All events
              <IconChevronRight class="w-3.5 h-3.5" />
            </button>
          </div>
          <Show
            when={audit().length > 0}
            fallback={
              <div class="row-list">
                <div class="row-item">
                  <div class="row-main">
                    <div class="row-sub" style="font-family: var(--font-sans)">
                      No events yet — mutations against this project will appear here.
                    </div>
                  </div>
                </div>
              </div>
            }
          >
            <div class="row-list">
              <For each={audit()}>
                {(event) => (
                  <div class="row-item">
                    <span
                      style={`width:6px;height:6px;border-radius:1.5px;flex-shrink:0;background:${actionTone(event.action)}`}
                      aria-hidden="true"
                    />
                    <div class="row-main">
                      <div class="row-title mono" style="font-weight:500;font-size:0.75rem">
                        {event.action}
                      </div>
                      <div class="row-sub">
                        {event.resource_type} · {event.resource_id}
                      </div>
                    </div>
                    <div class="row-trailing">{formatRelative(event.created_at)}</div>
                  </div>
                )}
              </For>
            </div>
          </Show>
        </div>

        {/* resources — hairline rows */}
        <div class="lg:col-span-2" style="min-width: 0">
          <h2 class="section-title" style="margin-bottom: 0.75rem">Resources</h2>
          <div class="row-list">
            <For each={resources()}>
              {(r) => (
                <div
                  class="row-item clickable"
                  onClick={() => props.onNavigate(r.view)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && props.onNavigate(r.view)}
                >
                  <span class="row-icon">
                    <r.icon class="w-4 h-4" />
                  </span>
                  <div class="row-main">
                    <div class="row-title">{r.title}</div>
                    <div class="row-sub">{r.sub}</div>
                  </div>
                  <span class="row-trailing">
                    <IconChevronRight class="w-3.5 h-3.5" />
                  </span>
                </div>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
}
