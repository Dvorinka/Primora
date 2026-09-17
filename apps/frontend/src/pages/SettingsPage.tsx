import { For, Show, createSignal } from "solid-js";
import type { ApiKey } from "@primora/api-client";
import { Badge } from "../components/Badge";
import { Modal, ModalFooter } from "../components/Modal";
import { Input } from "../components/Input";
import {
  IconPlus,
  IconKey,
  IconCopy,
  IconCheck,
  IconTrash,
  IconAlert,
} from "../components/Icons";

interface OrgInput {
  name: string;
  slug: string;
}

const API_KEY_SCOPES: Array<{ value: string; label: string; hint: string }> = [
  { value: "ingest", label: "ingest", hint: "telemetry ingest only" },
  { value: "read", label: "read", hint: "read endpoints" },
  { value: "write", label: "write", hint: "read + ingest + mutations" },
  { value: "admin", label: "admin", hint: "full access" },
];

interface SettingsPageProps {
  apiKeys?: ApiKey[];
  apiKeyName: string;
  apiKeyScopes: string[];
  apiKeySecret: string;
  apiKeyMessage: string;
  apiKeyPending: boolean;
  organizationInput: OrgInput;
  organizationEditInput: OrgInput;
  organizationMessage: string;
  canUpdateOrganization: boolean;
  workspacePending: boolean;
  hasActiveOrganization: boolean;
  onApiKeyNameChange: (name: string) => void;
  onApiKeyScopeToggle: (scope: string) => void;
  onCreateApiKey: () => void;
  onDeleteApiKey: (id: string) => void;
  onOrganizationInputChange: (field: keyof OrgInput, value: string) => void;
  onOrganizationEditInputChange: (field: keyof OrgInput, value: string) => void;
  onCreateOrganization: (event: SubmitEvent) => void;
  onUpdateOrganization: (event: SubmitEvent) => void;
  onDeleteOrganization: () => void;
  onDismissSecret: () => void;
  formatDate: (value?: string | null) => string;
}

export function SettingsPage(props: SettingsPageProps) {
  const [tab, setTab] = createSignal<"api-keys" | "organization">("api-keys");
  const [copied, setCopied] = createSignal(false);
  const [createOrgOpen, setCreateOrgOpen] = createSignal(false);
  const [confirmDeleteOrg, setConfirmDeleteOrg] = createSignal(false);

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(props.apiKeySecret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  const activeKeys = () => (props.apiKeys ?? []).filter((k) => !k.revoked_at);
  const revokedKeys = () => (props.apiKeys ?? []).filter((k) => k.revoked_at);

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Settings</h1>
          <p class="page-description">
            API credentials and organization management.
          </p>
        </div>
      </div>

      <div class="tabs">
        <button
          class={`tab ${tab() === "api-keys" ? "active" : ""}`}
          onClick={() => setTab("api-keys")}
        >
          API keys
          <span class="nav-badge ml-1.5">{activeKeys().length}</span>
        </button>
        <button
          class={`tab ${tab() === "organization" ? "active" : ""}`}
          onClick={() => setTab("organization")}
        >
          Organization
        </button>
      </div>

      {/* ---------------- API keys ---------------- */}
      <Show when={tab() === "api-keys"}>
        <Show when={props.apiKeyMessage}>
          <div class="message message-neutral">{props.apiKeyMessage}</div>
        </Show>

        <div class="card">
          <div class="card-header">
            <span class="card-header-title">Create API key</span>
            <span class="card-header-description">
              Keys authenticate requests with the <code>X-API-Key</code> header. The secret is shown once.
            </span>
          </div>
          <div class="flex items-end gap-2 flex-wrap">
            <div style="flex:1;min-width:14rem;max-width:24rem">
              <Input
                label="Key name"
                placeholder="Frontend key"
                value={props.apiKeyName}
                onInput={(e) => props.onApiKeyNameChange(e.currentTarget.value)}
              />
            </div>
            <button
              class="btn btn-primary"
              onClick={props.onCreateApiKey}
              disabled={props.apiKeyPending || !props.apiKeyName.trim() || props.apiKeyScopes.length === 0}
            >
              <IconPlus class="w-4 h-4" />
              Create key
            </button>
          </div>
          <div class="mt-4">
            <span class="label">Scopes</span>
            <div class="flex flex-wrap gap-x-5 gap-y-2 mt-1">
              <For each={API_KEY_SCOPES}>
                {(scope) => (
                  <label class="flex items-center gap-2 text-sm text-text-2">
                    <input
                      type="checkbox"
                      class="accent-[var(--accent)]"
                      checked={props.apiKeyScopes.includes(scope.value)}
                      disabled={props.apiKeyScopes.length === 1 && props.apiKeyScopes.includes(scope.value)}
                      onChange={() => props.onApiKeyScopeToggle(scope.value)}
                    />
                    <span>
                      <code>{scope.label}</code>
                      <span class="text-text-3"> — {scope.hint}</span>
                    </span>
                  </label>
                )}
              </For>
            </div>
          </div>
        </div>

        <div class="card card-flush">
          <Show
            when={(props.apiKeys ?? []).length > 0}
            fallback={
              <div class="empty-state">
                <div class="empty-state-icon">
                  <IconKey class="w-5 h-5" />
                </div>
                <p class="empty-state-title">No API keys</p>
                <p class="empty-state-description">
                  Create a key to authenticate API requests from your application.
                </p>
              </div>
            }
          >
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Prefix</th>
                    <th>Scopes</th>
                    <th>Last used</th>
                    <th>Status</th>
                    <th style="width:1%" />
                  </tr>
                </thead>
                <tbody>
                  <For each={props.apiKeys ?? []}>
                    {(key) => (
                      <tr>
                        <td class="font-medium text-text-1">{key.name}</td>
                        <td>
                          <code>{key.prefix}…</code>
                        </td>
                        <td>
                          <div class="flex flex-wrap gap-1">
                            <For each={key.scopes && key.scopes.length > 0 ? key.scopes : ["admin"]}>
                              {(scope) => <Badge variant="neutral">{scope}</Badge>}
                            </For>
                          </div>
                        </td>
                        <td class="text-text-3 text-xs">
                          {key.last_used_at ? props.formatDate(key.last_used_at) : "Never"}
                        </td>
                        <td>
                          <Badge variant={key.revoked_at ? "neutral" : "success"}>
                            <span class="badge-dot" />
                            {key.revoked_at ? "Revoked" : "Active"}
                          </Badge>
                        </td>
                        <td>
                          <Show when={!key.revoked_at}>
                            <button
                              class="icon-btn"
                              title="Revoke key"
                              aria-label={`Revoke ${key.name}`}
                              onClick={() => props.onDeleteApiKey(key.id)}
                              disabled={props.apiKeyPending}
                            >
                              <IconTrash class="w-4 h-4" />
                            </button>
                          </Show>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
            <Show when={revokedKeys().length > 0}>
              <div class="px-4 py-2.5 text-xs text-text-3" style="border-top:1px solid var(--border)">
                {revokedKeys().length} revoked key{revokedKeys().length === 1 ? "" : "s"} retained for audit.
              </div>
            </Show>
          </Show>
        </div>
      </Show>

      {/* ---------------- Organization ---------------- */}
      <Show when={tab() === "organization"}>
        <Show when={props.organizationMessage}>
          <div class="message message-neutral">{props.organizationMessage}</div>
        </Show>

        <Show when={props.hasActiveOrganization}>
          <div class="card">
            <div class="card-header">
              <span class="card-header-title">Organization settings</span>
              <span class="card-header-description">
                Rename the active organization or change its slug.
              </span>
            </div>
            <form onSubmit={props.onUpdateOrganization} class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <Input
                  label="Name"
                  value={props.organizationEditInput.name}
                  onInput={(e) =>
                    props.onOrganizationEditInputChange("name", e.currentTarget.value)
                  }
                  disabled={!props.canUpdateOrganization}
                  required
                />
                <Input
                  label="Slug"
                  value={props.organizationEditInput.slug}
                  onInput={(e) =>
                    props.onOrganizationEditInputChange("slug", e.currentTarget.value)
                  }
                  disabled={!props.canUpdateOrganization}
                  required
                />
              </div>
              <div class="flex gap-2">
                <button
                  type="submit"
                  class="btn btn-primary"
                  disabled={!props.canUpdateOrganization || props.workspacePending}
                >
                  Save changes
                </button>
              </div>
              <Show when={!props.canUpdateOrganization}>
                <p class="label-hint">You need the owner or admin role to edit this organization.</p>
              </Show>
            </form>
          </div>
        </Show>

        <div class="card">
          <div class="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <span class="card-header-title">New organization</span>
              <p class="card-header-description mt-1">
                Organizations are top-level workspaces containing projects and members.
              </p>
            </div>
            <button class="btn btn-secondary" onClick={() => setCreateOrgOpen(true)}>
              <IconPlus class="w-4 h-4" />
              Create organization
            </button>
          </div>
        </div>

        <Show when={props.hasActiveOrganization && props.canUpdateOrganization}>
          <div class="card" style="border-color:rgba(248,113,113,0.35)">
            <div class="flex items-start gap-3">
              <span class="icon-btn" style="color:var(--error);cursor:default">
                <IconAlert class="w-5 h-5" />
              </span>
              <div class="flex-1">
                <span class="card-header-title" style="color:var(--error)">Danger zone</span>
                <p class="card-header-description mt-1">
                  Deleting the organization permanently removes all projects, buckets, objects,
                  members, invitations, API keys and audit history.
                </p>
                <button
                  class="btn btn-danger mt-3"
                  onClick={() => setConfirmDeleteOrg(true)}
                  disabled={props.workspacePending}
                >
                  <IconTrash class="w-4 h-4" />
                  Delete organization
                </button>
              </div>
            </div>
          </div>
        </Show>
      </Show>

      {/* API key secret modal — shown while App holds a fresh secret */}
      <Show when={props.apiKeySecret}>
        <Modal
          open={true}
          onClose={props.onDismissSecret}
          title="API key created"
          description="Store this secret securely — it will not be shown again."
          size="sm"
        >
          <div class="space-y-4">
            <div class="code-block break-all select-all" style="user-select:all">
              {props.apiKeySecret}
            </div>
            <button class="btn btn-secondary w-full" onClick={copySecret}>
              <Show when={copied()} fallback={<IconCopy class="w-4 h-4" />}>
                <IconCheck class="w-4 h-4" />
              </Show>
              {copied() ? "Copied" : "Copy secret"}
            </button>
          </div>
        </Modal>
      </Show>

      {/* create organization modal */}
      <Modal
        open={createOrgOpen()}
        onClose={() => setCreateOrgOpen(false)}
        title="Create organization"
      >
        <form
          onSubmit={(e) => {
            props.onCreateOrganization(e);
            setCreateOrgOpen(false);
          }}
          class="space-y-4"
        >
          <Input
            label="Organization name"
            placeholder="Acme Corporation"
            value={props.organizationInput.name}
            onInput={(e) => props.onOrganizationInputChange("name", e.currentTarget.value)}
            required
          />
          <Input
            label="Slug"
            placeholder="acme-corp"
            value={props.organizationInput.slug}
            onInput={(e) => props.onOrganizationInputChange("slug", e.currentTarget.value)}
            required
          />
          <ModalFooter>
            <button type="button" class="btn btn-ghost" onClick={() => setCreateOrgOpen(false)}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={props.workspacePending}>
              Create organization
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* delete org confirm */}
      <Modal
        open={confirmDeleteOrg()}
        onClose={() => setConfirmDeleteOrg(false)}
        title="Delete organization"
        size="sm"
      >
        <p class="text-sm text-text-2">
          This permanently deletes the organization and everything inside it. This cannot be undone.
        </p>
        <ModalFooter>
          <button class="btn btn-ghost" onClick={() => setConfirmDeleteOrg(false)}>
            Cancel
          </button>
          <button
            class="btn btn-danger"
            onClick={() => {
              setConfirmDeleteOrg(false);
              props.onDeleteOrganization();
            }}
            disabled={props.workspacePending}
          >
            Delete permanently
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
