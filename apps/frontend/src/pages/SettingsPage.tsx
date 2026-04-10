import { Show, For, createSignal } from "solid-js";
import { Button, Card, Input, Badge, Table, EmptyState, Message, Modal, Tabs, TabPanel } from "../components";
import type { ApiKey } from "@primora/api-client";

interface SettingsPageProps {
  apiKeys?: ApiKey[];
  apiKeyName: string;
  apiKeySecret: string;
  apiKeyMessage: string;
  apiKeyPending: boolean;
  organizationInput: { name: string; slug: string };
  organizationEditInput: { name: string; slug: string };
  organizationMessage: string;
  canUpdateOrganization: boolean;
  workspacePending: boolean;
  onApiKeyNameChange: (name: string) => void;
  onCreateApiKey: (e: SubmitEvent) => void;
  onDeleteApiKey: (id: string) => void;
  onOrganizationInputChange: (field: string, value: string) => void;
  onOrganizationEditInputChange: (field: string, value: string) => void;
  onCreateOrganization: (e: SubmitEvent) => void;
  onUpdateOrganization: (e: SubmitEvent) => void;
  onDeleteOrganization: () => void;
  formatDate: (date?: string | null) => string;
}

export function SettingsPage(props: SettingsPageProps) {
  const [activeTab, setActiveTab] = createSignal<'api-keys' | 'organization' | 'general'>('api-keys');
  const [showCreateKeyModal, setShowCreateKeyModal] = createSignal(false);
  const [showKeySecret, setShowKeySecret] = createSignal(false);
  const [copiedKey, setCopiedKey] = createSignal(false);

  const handleCreateKey = (e: SubmitEvent) => {
    props.onCreateApiKey(e);
    setShowCreateKeyModal(false);
    setShowKeySecret(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Settings</h1>
        <p class="text-gray-600 mt-1">Manage API keys, organization, and project settings</p>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'api-keys', label: 'API Keys' },
          { id: 'organization', label: 'Organization' },
          { id: 'general', label: 'General' },
        ]}
        activeTab={activeTab()}
        onChange={(id) => setActiveTab(id as any)}
      />

      {/* API Keys Tab */}
      <Show when={activeTab() === 'api-keys'}>
        <div class="space-y-6">
          <Card class="p-6">
            <div class="flex items-center justify-between mb-6">
              <div>
                <h2 class="text-xl font-semibold">API Keys</h2>
                <p class="text-sm text-gray-600 mt-1">Manage authentication keys for your project</p>
              </div>
              <Button onClick={() => setShowCreateKeyModal(true)}>
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Create API Key
              </Button>
            </div>

            <Show
              when={(props.apiKeys?.length ?? 0) > 0}
              fallback={
                <EmptyState
                  icon={
                    <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  }
                  title="No API keys"
                  description="Create an API key to authenticate your applications"
                  action={
                    <Button onClick={() => setShowCreateKeyModal(true)}>Create API Key</Button>
                  }
                />
              }
            >
              <Table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Key ID</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Last Used</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={props.apiKeys}>
                    {(key) => (
                      <tr>
                        <td class="font-medium text-gray-900">{key.name}</td>
                        <td>
                          <code class="text-xs bg-gray-100 px-2 py-1 rounded">
                            {key.key_id}
                          </code>
                        </td>
                        <td>
                          <Badge variant={key.is_active ? 'success' : 'secondary'}>
                            {key.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td class="text-sm text-gray-600">{props.formatDate(key.created_at)}</td>
                        <td class="text-sm text-gray-600">
                          {key.last_used_at ? props.formatDate(key.last_used_at) : 'Never'}
                        </td>
                        <td class="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => props.onDeleteApiKey(key.id)}
                            disabled={props.apiKeyPending}
                          >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </Button>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </Table>
            </Show>
          </Card>

          <Card class="p-6 bg-blue-50 border-blue-200">
            <div class="flex gap-4">
              <div class="flex-shrink-0">
                <svg class="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-blue-900 mb-1">Keep your API keys secure</h3>
                <p class="text-sm text-blue-800">
                  API keys provide full access to your project. Never share them publicly or commit them to version control.
                  Store them securely using environment variables or secret management services.
                </p>
              </div>
            </div>
          </Card>

          <Show when={props.apiKeyMessage}>
            <Message variant="neutral">{props.apiKeyMessage}</Message>
          </Show>
        </div>
      </Show>

      {/* Organization Tab */}
      <Show when={activeTab() === 'organization'}>
        <div class="space-y-6">
          <Card class="p-6">
            <h2 class="text-xl font-semibold mb-4">Organization Settings</h2>
            <form class="space-y-4" onSubmit={props.onUpdateOrganization}>
              <Input
                label="Organization Name"
                placeholder="My Organization"
                value={props.organizationEditInput.name}
                onInput={(e) => props.onOrganizationEditInputChange('name', e.currentTarget.value)}
                disabled={props.workspacePending || !props.canUpdateOrganization}
              />
              <Input
                label="Organization Slug"
                placeholder="my-organization"
                value={props.organizationEditInput.slug}
                onInput={(e) => props.onOrganizationEditInputChange('slug', e.currentTarget.value)}
                disabled={props.workspacePending || !props.canUpdateOrganization}
              />
              <Show when={props.canUpdateOrganization}>
                <div class="flex gap-3">
                  <Button type="submit" variant="primary" disabled={props.workspacePending}>
                    {props.workspacePending ? "Updating..." : "Update Organization"}
                  </Button>
                  <Button type="button" variant="danger" onClick={props.onDeleteOrganization} disabled={props.workspacePending}>
                    Delete Organization
                  </Button>
                </div>
              </Show>
            </form>
            <Show when={props.organizationMessage}>
              <Message variant="neutral" class="mt-4">{props.organizationMessage}</Message>
            </Show>
          </Card>

          <Card class="p-6 bg-red-50 border-red-200">
            <div class="flex gap-4">
              <div class="flex-shrink-0">
                <svg class="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 class="font-semibold text-red-900 mb-1">Danger Zone</h3>
                <p class="text-sm text-red-800">
                  Deleting an organization is permanent and cannot be undone. All projects, members, API keys, buckets, and data will be permanently deleted.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </Show>

      {/* General Tab */}
      <Show when={activeTab() === 'general'}>
        <div class="space-y-6">
          <Card class="p-6">
            <h2 class="text-xl font-semibold mb-4">General Settings</h2>
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <select class="input w-full max-w-xs">
                  <option>Light</option>
                  <option>Dark</option>
                  <option>System</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select class="input w-full max-w-xs">
                  <option>English</option>
                  <option>Spanish</option>
                  <option>French</option>
                  <option>German</option>
                </select>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <select class="input w-full max-w-xs">
                  <option>UTC</option>
                  <option>America/New_York</option>
                  <option>America/Los_Angeles</option>
                  <option>Europe/London</option>
                  <option>Asia/Tokyo</option>
                </select>
              </div>
            </div>
          </Card>

          <Card class="p-6">
            <h2 class="text-xl font-semibold mb-4">Notifications</h2>
            <div class="space-y-3">
              <label class="flex items-center gap-3">
                <input type="checkbox" class="rounded border-gray-300" checked />
                <div>
                  <p class="font-medium text-gray-900">Email notifications</p>
                  <p class="text-sm text-gray-600">Receive email updates about your projects</p>
                </div>
              </label>
              <label class="flex items-center gap-3">
                <input type="checkbox" class="rounded border-gray-300" checked />
                <div>
                  <p class="font-medium text-gray-900">Security alerts</p>
                  <p class="text-sm text-gray-600">Get notified about security events</p>
                </div>
              </label>
              <label class="flex items-center gap-3">
                <input type="checkbox" class="rounded border-gray-300" />
                <div>
                  <p class="font-medium text-gray-900">Product updates</p>
                  <p class="text-sm text-gray-600">Stay informed about new features</p>
                </div>
              </label>
            </div>
          </Card>
        </div>
      </Show>

      {/* Create API Key Modal */}
      <Modal open={showCreateKeyModal()} onClose={() => setShowCreateKeyModal(false)} title="Create API Key">
        <form class="space-y-4" onSubmit={handleCreateKey}>
          <Input
            label="Key Name"
            placeholder="Production API Key"
            value={props.apiKeyName}
            onInput={(e) => props.onApiKeyNameChange(e.currentTarget.value)}
            disabled={props.apiKeyPending}
            required
          />
          <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p class="text-sm text-yellow-800">
              <strong>Important:</strong> The API key secret will only be shown once. Make sure to copy and store it securely.
            </p>
          </div>
          <div class="flex gap-3 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowCreateKeyModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={props.apiKeyPending}>
              {props.apiKeyPending ? "Creating..." : "Create Key"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* API Key Secret Modal */}
      <Modal open={showKeySecret()} onClose={() => setShowKeySecret(false)} title="API Key Created">
        <div class="space-y-4">
          <div class="bg-green-50 border border-green-200 rounded-lg p-4">
            <p class="text-sm text-green-800 mb-2">
              <strong>Success!</strong> Your API key has been created.
            </p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">API Key Secret</label>
            <div class="flex gap-2">
              <code class="flex-1 p-3 bg-gray-900 text-gray-100 rounded-lg text-sm font-mono break-all">
                {props.apiKeySecret}
              </code>
              <Button
                variant="outline"
                onClick={() => copyToClipboard(props.apiKeySecret)}
              >
                {copiedKey() ? (
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </Button>
            </div>
          </div>

          <div class="bg-red-50 border border-red-200 rounded-lg p-4">
            <p class="text-sm text-red-800">
              <strong>Warning:</strong> This is the only time you'll see this secret. Copy it now and store it securely.
            </p>
          </div>

          <div class="flex justify-end pt-4">
            <Button onClick={() => setShowKeySecret(false)}>
              I've Saved the Key
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
