import { Show, For } from "solid-js";
import { Card, StatCard, Badge, Button } from "./index";
import type { ProjectOverview } from "@primora/api-client";

interface ProjectDashboardProps {
  project: { id: string; name: string; slug: string; description?: string };
  overview?: ProjectOverview;
  onNavigate: (view: string) => void;
}

export function ProjectDashboard(props: ProjectDashboardProps) {
  const stats = () => [
    {
      label: "Storage",
      value: props.overview?.storage_buckets_count ?? 0,
      unit: "buckets",
      icon: (
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 3h4m-4 4h4" />
        </svg>
      ),
    },
    {
      label: "API Keys",
      value: props.overview?.api_keys_count ?? 0,
      unit: "keys",
      icon: (
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
    },
    {
      label: "Members",
      value: props.overview?.project_members_count ?? 0,
      unit: "users",
      icon: (
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
    },
    {
      label: "Audit Logs",
      value: props.overview?.audit_logs_count ?? 0,
      unit: "events",
      icon: (
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
    },
  ];

  return (
    <div class="space-y-6">
      {/* Project Header */}
      <div class="flex items-start justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-900">{props.project.name}</h1>
          <Show when={props.project.description}>
            <p class="text-gray-600 mt-1">{props.project.description}</p>
          </Show>
          <div class="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{props.project.slug}</Badge>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <For each={stats()}>
          {(stat) => (
            <Card class="p-6">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p class="text-3xl font-bold text-gray-900">{stat.value}</p>
                  <p class="text-xs text-gray-500 mt-1">{stat.unit}</p>
                </div>
                <div class="text-gray-400">{stat.icon}</div>
              </div>
            </Card>
          )}
        </For>
      </div>

      {/* Usage Charts */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card class="p-6">
          <h3 class="text-lg font-semibold mb-4">Bandwidth</h3>
          <div class="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
            <div class="text-center text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p class="text-sm">No data to show</p>
            </div>
          </div>
        </Card>

        <Card class="p-6">
          <h3 class="text-lg font-semibold mb-4">Requests</h3>
          <div class="h-48 flex items-center justify-center bg-gray-50 rounded-lg">
            <div class="text-center text-gray-500">
              <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <p class="text-sm">No data to show</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card class="p-6">
        <h3 class="text-lg font-semibold mb-4">Quick Start</h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => props.onNavigate("storage")}
            class="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
          >
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 3h4m-4 4h4" />
                </svg>
              </div>
              <h4 class="font-semibold">Create Bucket</h4>
            </div>
            <p class="text-sm text-gray-600">Set up storage for your files and assets</p>
          </button>

          <button
            onClick={() => props.onNavigate("settings")}
            class="p-4 border border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-colors text-left"
          >
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h4 class="font-semibold">Generate API Key</h4>
            </div>
            <p class="text-sm text-gray-600">Create keys to authenticate your apps</p>
          </button>

          <button
            onClick={() => props.onNavigate("members")}
            class="p-4 border border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-colors text-left"
          >
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <svg class="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
              <h4 class="font-semibold">Invite Members</h4>
            </div>
            <p class="text-sm text-gray-600">Add team members to collaborate</p>
          </button>
        </div>
      </Card>

      {/* Documentation Link */}
      <Card class="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-lg font-semibold mb-1">Need Help Getting Started?</h3>
            <p class="text-sm text-gray-600">Check out our documentation and guides</p>
          </div>
          <Button variant="outline">View Docs</Button>
        </div>
      </Card>
    </div>
  );
}
