import { For, Show, createSignal } from "solid-js";
import type { AuditLog, AuditLogListResponse } from "@primora/api-client";
import { Badge } from "../components/Badge";
import { Input, Select } from "../components/Input";
import { IconAudit, IconRefresh, IconDownload } from "../components/Icons";

interface AuditPageProps {
  auditLogs: AuditLog[];
  auditSearch: string;
  auditAction: string;
  auditOffset: number;
  auditPage?: AuditLogListResponse;
  onAuditSearchChange: (value: string) => void;
  onAuditActionChange: (value: string) => void;
  onAuditPageChange: (offset: number) => void;
  onRefreshAudit: () => void;
  formatDate: (value?: string | null) => string;
}

const PAGE_SIZE = 25;

const ACTION_OPTIONS = [
  "",
  "platform.bootstrap",
  "organization.created",
  "organization.updated",
  "organization.deleted",
  "organization.member.role_updated",
  "organization.member.removed",
  "project.created",
  "project.updated",
  "project.deleted",
  "project.member.role_updated",
  "project.member.removed",
  "invitation.created",
  "invitation.accepted",
  "invitation.revoked",
  "bucket.created",
  "bucket.updated",
  "bucket.deleted",
  "object.uploaded",
  "object.updated",
  "object.deleted",
  "object.copied",
  "object.moved",
  "api_key.created",
  "api_key.revoked",
  "collection.created",
  "collection.updated",
  "collection.deleted",
  "document.created",
  "document.updated",
  "document.deleted",
  "db_connection.created",
  "db_connection.deleted",
  "db_connection.transferred",
  "secret.set",
  "secret.revealed",
  "secret.deleted",
  "function.created",
  "function.updated",
  "function.deleted",
  "function.invoked",
  "job.created",
  "job.updated",
  "job.deleted",
  "job.run",
  "webhook.created",
  "webhook.updated",
  "webhook.deleted",
  "webhook.tested",
  "inbound_hook.created",
  "inbound_hook.deleted",
  "integration.created",
  "integration.deleted",
  "integration.tested",
  "alert.created",
  "alert.updated",
  "alert.deleted",
  "deploy.marker",
];

function actionVariant(action: string): "success" | "error" | "primary" | "warning" | "neutral" {
  if (action.includes("delete") || action.includes("revoke") || action.includes("remove")) {
    return "error";
  }
  if (action.includes("create") || action.includes("upload") || action.includes("invite")) {
    return "success";
  }
  if (action.includes("update") || action.includes("role")) {
    return "primary";
  }
  return "neutral";
}

function exportLogs(logs: AuditLog[], format: "json" | "csv") {
  let content: string;
  let mime: string;
  let ext: string;

  if (format === "csv") {
    const header = "id,created_at,action,resource_type,resource_id,request_id";
    const rows = logs.map((l) =>
      [l.id, l.created_at, l.action, l.resource_type, l.resource_id, l.request_id]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    content = [header, ...rows].join("\n");
    mime = "text/csv";
    ext = "csv";
  } else {
    content = JSON.stringify(logs, null, 2);
    mime = "application/json";
    ext = "json";
  }

  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.${ext}`;
  a.click();
  URL.revokeObjectURL(url);
}

export function AuditPage(props: AuditPageProps) {
  const [expandedId, setExpandedId] = createSignal<string | null>(null);

  const total = () => props.auditPage?.total ?? props.auditLogs.length;
  const currentPage = () => Math.floor(props.auditOffset / PAGE_SIZE) + 1;
  const totalPages = () => Math.max(1, Math.ceil(total() / PAGE_SIZE));

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Audit log</h1>
          <p class="page-description">
            Every mutating request against this project, recorded with request IDs.
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-ghost" onClick={props.onRefreshAudit}>
            <IconRefresh class="w-4 h-4" />
            Refresh
          </button>
          <button class="btn btn-secondary" onClick={() => exportLogs(props.auditLogs, "csv")}>
            <IconDownload class="w-4 h-4" />
            CSV
          </button>
          <button class="btn btn-secondary" onClick={() => exportLogs(props.auditLogs, "json")}>
            <IconDownload class="w-4 h-4" />
            JSON
          </button>
        </div>
      </div>

      <div class="flex items-center gap-3 flex-wrap">
        <div style="flex:1;min-width:14rem;max-width:24rem">
          <Input
            placeholder="Search by resource, action or request ID…"
            class="input-sm"
            value={props.auditSearch}
            onInput={(e) => props.onAuditSearchChange(e.currentTarget.value)}
          />
        </div>
        <Select
          class="input-sm"
          style="width:14rem"
          value={props.auditAction}
          onChange={(e) => props.onAuditActionChange(e.currentTarget.value)}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          <For each={ACTION_OPTIONS.slice(1)}>
            {(action) => <option value={action}>{action}</option>}
          </For>
        </Select>
        <span class="text-xs text-text-3 ml-auto">
          {total()} event{total() === 1 ? "" : "s"}
        </span>
      </div>

      <div class="card card-flush">
        <Show
          when={props.auditLogs.length > 0}
          fallback={
            <div class="empty-state">
              <div class="empty-state-icon">
                <IconAudit class="w-5 h-5" />
              </div>
              <p class="empty-state-title">No audit events</p>
              <p class="empty-state-description">
                Actions on this project — uploads, key creation, member changes — will appear here.
              </p>
            </div>
          }
        >
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Resource</th>
                  <th>Request</th>
                  <th style="width:1%">Time</th>
                </tr>
              </thead>
              <tbody>
                <For each={props.auditLogs}>
                  {(log) => (
                    <>
                      <tr
                        class="clickable"
                        onClick={() =>
                          setExpandedId(expandedId() === log.id ? null : log.id)
                        }
                      >
                        <td>
                          <Badge variant={actionVariant(log.action)}>{log.action}</Badge>
                        </td>
                        <td>
                          <span class="text-text-2">{log.resource_type}</span>{" "}
                          <code class="text-xs">{log.resource_id}</code>
                        </td>
                        <td>
                          <code class="text-xs text-text-3">{log.request_id}</code>
                        </td>
                        <td class="text-xs text-text-3 whitespace-nowrap">
                          {props.formatDate(log.created_at)}
                        </td>
                      </tr>
                      <Show when={expandedId() === log.id && Object.keys(log.metadata ?? {}).length > 0}>
                        <tr>
                          <td colspan={4} style="background:var(--bg-panel);padding:0.75rem 1.25rem">
                            <pre class="code-block" style="border:0;padding:0;background:transparent">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      </Show>
                    </>
                  )}
                </For>
              </tbody>
            </table>
          </div>

          <Show when={totalPages() > 1}>
            <div
              class="flex items-center justify-between px-4 py-3"
              style="border-top:1px solid var(--border)"
            >
              <span class="text-xs text-text-3">
                Page {currentPage()} of {totalPages()}
              </span>
              <div class="flex gap-1">
                <button
                  class="btn btn-ghost btn-sm"
                  disabled={currentPage() <= 1}
                  onClick={() => props.onAuditPageChange((currentPage() - 2) * PAGE_SIZE)}
                >
                  Previous
                </button>
                <button
                  class="btn btn-ghost btn-sm"
                  disabled={!props.auditPage?.has_more}
                  onClick={() => props.onAuditPageChange(currentPage() * PAGE_SIZE)}
                >
                  Next
                </button>
              </div>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}
