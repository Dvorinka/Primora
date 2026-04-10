import { Show, For } from "solid-js";
import { Button, Card, Input, Select, Badge, Table, EmptyState } from "../components";
import type { AuditLog } from "@primora/api-client";

interface AuditPageProps {
  auditLogs?: AuditLog[];
  auditSearch: string;
  auditAction: string;
  auditOffset: number;
  auditPage?: { items: AuditLog[]; total: number; limit: number; offset: number };
  onAuditSearchChange: (value: string) => void;
  onAuditActionChange: (value: string) => void;
  onAuditPageChange: (offset: number) => void;
  onRefreshAudit: () => void;
  formatDate: (date?: string | null) => string;
}

export function AuditPage(props: AuditPageProps) {
  const getActionBadgeVariant = (action: string) => {
    if (action.includes('create')) return 'success';
    if (action.includes('delete')) return 'danger';
    if (action.includes('update')) return 'primary';
    return 'secondary';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create')) {
      return (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      );
    }
    if (action.includes('delete')) {
      return (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      );
    }
    if (action.includes('update')) {
      return (
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      );
    }
    return (
      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  const formatResourceType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Audit Logs</h1>
          <p class="text-gray-600 mt-1">Track all activities and changes in your project</p>
        </div>
        <Button variant="secondary" onClick={props.onRefreshAudit}>
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card class="p-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Search by resource, actor, or details..."
            value={props.auditSearch}
            onInput={(e) => props.onAuditSearchChange(e.currentTarget.value)}
          />
          <Select
            value={props.auditAction}
            onChange={(e) => props.onAuditActionChange(e.currentTarget.value)}
          >
            <option value="">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="upload">Upload</option>
            <option value="download">Download</option>
          </Select>
        </div>
      </Card>

      {/* Stats Cards */}
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">{props.auditPage?.total ?? 0}</p>
              <p class="text-sm text-gray-600">Total Events</p>
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">
                {props.auditLogs?.filter(log => log.action.includes('create')).length ?? 0}
              </p>
              <p class="text-sm text-gray-600">Creates</p>
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">
                {props.auditLogs?.filter(log => log.action.includes('update')).length ?? 0}
              </p>
              <p class="text-sm text-gray-600">Updates</p>
            </div>
          </div>
        </Card>

        <Card class="p-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <svg class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <p class="text-2xl font-bold text-gray-900">
                {props.auditLogs?.filter(log => log.action.includes('delete')).length ?? 0}
              </p>
              <p class="text-sm text-gray-600">Deletes</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Audit Logs Table */}
      <Card>
        <Show
          when={(props.auditLogs?.length ?? 0) > 0}
          fallback={
            <div class="p-12">
              <EmptyState
                icon={
                  <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                }
                title="No audit logs"
                description={props.auditSearch || props.auditAction ? "No logs match your filters" : "Activity will appear here as you use the platform"}
              />
            </div>
          }
        >
          <div class="overflow-x-auto">
            <Table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Actor</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                <For each={props.auditLogs}>
                  {(log) => (
                    <tr class="hover:bg-gray-50">
                      <td class="text-sm text-gray-600 whitespace-nowrap">
                        {props.formatDate(log.created_at)}
                      </td>
                      <td>
                        <div class="flex items-center gap-2">
                          <Badge variant={getActionBadgeVariant(log.action)} class="flex items-center gap-1">
                            {getActionIcon(log.action)}
                            {log.action}
                          </Badge>
                        </div>
                      </td>
                      <td>
                        <div>
                          <p class="font-medium text-gray-900">{formatResourceType(log.resource_type)}</p>
                          <Show when={log.resource_id}>
                            <code class="text-xs text-gray-500">{log.resource_id}</code>
                          </Show>
                        </div>
                      </td>
                      <td>
                        <div class="flex items-center gap-2">
                          <div class="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-semibold">
                            {log.actor_name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p class="text-sm font-medium text-gray-900">{log.actor_name}</p>
                            <p class="text-xs text-gray-500">{log.actor_email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Show when={log.details}>
                          <details class="text-sm">
                            <summary class="cursor-pointer text-blue-600 hover:text-blue-700">
                              View details
                            </summary>
                            <pre class="mt-2 p-2 bg-gray-50 rounded text-xs overflow-x-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </pre>
                          </details>
                        </Show>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </Table>
          </div>

          {/* Pagination */}
          <Show when={props.auditPage && props.auditPage.total > props.auditPage.limit}>
            <div class="p-4 border-t border-gray-200 flex items-center justify-between">
              <p class="text-sm text-gray-600">
                Showing {props.auditPage!.offset + 1} to {Math.min(props.auditPage!.offset + props.auditPage!.limit, props.auditPage!.total)} of {props.auditPage!.total}
              </p>
              <div class="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={props.auditPage!.offset === 0}
                  onClick={() => props.onAuditPageChange(Math.max(0, props.auditPage!.offset - props.auditPage!.limit))}
                >
                  Previous
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={props.auditPage!.offset + props.auditPage!.limit >= props.auditPage!.total}
                  onClick={() => props.onAuditPageChange(props.auditPage!.offset + props.auditPage!.limit)}
                >
                  Next
                </Button>
              </div>
            </div>
          </Show>
        </Show>
      </Card>

      {/* Export Section */}
      <Card class="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold mb-1">Export Audit Logs</h3>
            <p class="text-sm text-gray-600">Download audit logs for compliance and analysis</p>
          </div>
          <div class="flex gap-2">
            <Button variant="outline">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </Button>
            <Button variant="outline">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export JSON
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
