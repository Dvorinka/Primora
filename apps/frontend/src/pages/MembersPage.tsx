import { For, Show, createMemo, createSignal } from "solid-js";
import type {
  OrganizationInvitation,
  OrganizationMember,
  ProjectMember,
} from "@primora/api-client";
import { Badge } from "../components/Badge";
import { Modal, ModalFooter } from "../components/Modal";
import { Input, Select } from "../components/Input";
import {
  IconPlus,
  IconMembers,
  IconTrash,
  IconMail,
} from "../components/Icons";

interface InvitationInput {
  email: string;
  orgRole: string;
  attachProject: boolean;
  projectRole: string;
}

interface MembersPageProps {
  organizationMembers?: OrganizationMember[];
  organizationInvitations?: OrganizationInvitation[];
  projectMembers?: ProjectMember[];
  invitationInput: InvitationInput;
  inviteMessage: string;
  memberMessage: string;
  invitationPending: boolean;
  membersPending: boolean;
  canManageMembers: boolean;
  hasActiveProject: boolean;
  onInvitationInputChange: (field: keyof InvitationInput, value: string | boolean) => void;
  onSendInvitation: (event: SubmitEvent) => void;
  onRevokeInvitation: (id: string) => void;
  onRemoveMember: (id: string, type: "org" | "project") => void;
  onUpdateMemberRole: (id: string, role: string, type: "org" | "project") => void;
}

const orgRoles = ["owner", "admin", "member"] as const;
const projectRoles = ["admin", "developer", "viewer"] as const;

function roleVariant(role: string): "primary" | "success" | "warning" | "neutral" {
  switch (role) {
    case "owner":
      return "primary";
    case "admin":
      return "success";
    case "developer":
      return "warning";
    default:
      return "neutral";
  }
}

function initials(name?: string, email?: string): string {
  const src = name || email || "?";
  return src
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function MembersPage(props: MembersPageProps) {
  const [tab, setTab] = createSignal<"org" | "project">("org");
  const [inviteOpen, setInviteOpen] = createSignal(false);
  const [query, setQuery] = createSignal("");

  const filteredOrgMembers = createMemo(() => {
    const q = query().toLowerCase();
    const list = props.organizationMembers ?? [];
    if (!q) return list;
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  });

  const filteredProjectMembers = createMemo(() => {
    const q = query().toLowerCase();
    const list = props.projectMembers ?? [];
    if (!q) return list;
    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q),
    );
  });

  const pendingInvitations = createMemo(() =>
    (props.organizationInvitations ?? []).filter((i) => i.status === "pending"),
  );

  const handleInvite = (e: SubmitEvent) => {
    props.onSendInvitation(e);
    setInviteOpen(false);
  };

  const MemberRow = (p: {
    member: OrganizationMember | ProjectMember;
    type: "org" | "project";
    roles: readonly string[];
  }) => (
    <tr>
      <td>
        <div class="flex items-center gap-2.5">
          <span
            class="avatar"
            style="width:1.75rem;height:1.75rem;font-size:0.625rem"
          >
            {initials(p.member.name, p.member.email)}
          </span>
          <div>
            <div class="font-medium text-text-1">{p.member.name || "Unnamed"}</div>
            <div class="text-xs text-text-3">{p.member.email}</div>
          </div>
        </div>
      </td>
      <td>
        <Badge variant={p.member.email_verified ? "success" : "warning"}>
          <span class="badge-dot" />
          {p.member.email_verified ? "Verified" : "Unverified"}
        </Badge>
      </td>
      <td>
        <Show
          when={props.canManageMembers}
          fallback={<Badge variant={roleVariant(p.member.role)}>{p.member.role}</Badge>}
        >
          <select
            class="select input-sm"
            style="width:8.5rem"
            value={p.member.role}
            onChange={(e) =>
              props.onUpdateMemberRole(p.member.user_id, e.currentTarget.value, p.type)
            }
            disabled={props.membersPending}
            aria-label={`Role for ${p.member.email}`}
          >
            <For each={p.roles}>
              {(role) => <option value={role}>{role}</option>}
            </For>
          </select>
        </Show>
      </td>
      <td class="text-text-3">{formatDate(p.member.joined_at)}</td>
      <td style="width:1%">
        <Show when={props.canManageMembers}>
          <button
            class="icon-btn"
            title="Remove member"
            aria-label={`Remove ${p.member.email}`}
            onClick={() => props.onRemoveMember(p.member.user_id, p.type)}
            disabled={props.membersPending}
          >
            <IconTrash class="w-4 h-4" />
          </button>
        </Show>
      </td>
    </tr>
  );

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Members</h1>
          <p class="page-description">
            Organization members share workspace access; project members get scoped roles.
          </p>
        </div>
        <div class="page-actions">
          <button
            class="btn btn-primary"
            onClick={() => setInviteOpen(true)}
            disabled={!props.canManageMembers}
          >
            <IconPlus class="w-4 h-4" />
            Invite member
          </button>
        </div>
      </div>

      <Show when={props.inviteMessage}>
        <div class="message message-info">{props.inviteMessage}</div>
      </Show>
      <Show when={props.memberMessage}>
        <div class="message message-neutral">{props.memberMessage}</div>
      </Show>

      <div class="flex items-center justify-between gap-3 flex-wrap">
        <div class="tabs">
          <button
            class={`tab ${tab() === "org" ? "active" : ""}`}
            onClick={() => setTab("org")}
          >
            Organization
            <span class="nav-badge ml-1.5">{(props.organizationMembers ?? []).length}</span>
          </button>
          <button
            class={`tab ${tab() === "project" ? "active" : ""}`}
            onClick={() => setTab("project")}
            disabled={!props.hasActiveProject}
          >
            Project
            <span class="nav-badge ml-1.5">{(props.projectMembers ?? []).length}</span>
          </button>
        </div>
        <Input
          placeholder="Filter members…"
          value={query()}
          onInput={(e) => setQuery(e.currentTarget.value)}
          class="input-sm"
          style="width:14rem"
        />
      </div>

      <div class="card card-flush">
        <Show when={tab() === "org"}>
          <Show
            when={filteredOrgMembers().length > 0}
            fallback={
              <div class="empty-state">
                <div class="empty-state-icon">
                  <IconMembers class="w-5 h-5" />
                </div>
                <p class="empty-state-title">No members found</p>
                <p class="empty-state-description">
                  Invite teammates to collaborate on this organization.
                </p>
              </div>
            }
          >
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th style="width:1%" />
                  </tr>
                </thead>
                <tbody>
                  <For each={filteredOrgMembers()}>
                    {(member) => <MemberRow member={member} type="org" roles={orgRoles} />}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>

        <Show when={tab() === "project"}>
          <Show
            when={filteredProjectMembers().length > 0}
            fallback={
              <div class="empty-state">
                <div class="empty-state-icon">
                  <IconMembers class="w-5 h-5" />
                </div>
                <p class="empty-state-title">No project members</p>
                <p class="empty-state-description">
                  Invite someone with a project role to grant scoped access.
                </p>
              </div>
            }
          >
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th style="width:1%" />
                  </tr>
                </thead>
                <tbody>
                  <For each={filteredProjectMembers()}>
                    {(member) => (
                      <MemberRow member={member} type="project" roles={projectRoles} />
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </Show>
      </div>

      <Show when={pendingInvitations().length > 0}>
        <div class="card card-flush">
          <div class="card-header" style="padding:1.25rem 1.25rem 1rem;margin-bottom:0;border-bottom:1px solid var(--border)">
            <span class="card-header-title">Pending invitations</span>
            <span class="card-header-description">
              Invites that have been sent but not yet accepted.
            </span>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Org role</th>
                  <th>Project role</th>
                  <th>Expires</th>
                  <th style="width:1%" />
                </tr>
              </thead>
              <tbody>
                <For each={pendingInvitations()}>
                  {(inv) => (
                    <tr>
                      <td>
                        <div class="flex items-center gap-2.5">
                          <span class="avatar" style="width:1.75rem;height:1.75rem;font-size:0.625rem;background:var(--surface-3);color:var(--text-2);border-color:var(--border)">
                            <IconMail class="w-3.5 h-3.5" />
                          </span>
                          <span class="font-medium text-text-1">{inv.email}</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant={roleVariant(inv.org_role)}>{inv.org_role}</Badge>
                      </td>
                      <td>
                        <Show when={inv.project_role} fallback={<span class="text-text-3">—</span>}>
                          <Badge variant="neutral">
                            {inv.project_role}
                            <Show when={inv.project_name}> · {inv.project_name}</Show>
                          </Badge>
                        </Show>
                      </td>
                      <td class="text-text-3">{formatDate(inv.expires_at)}</td>
                      <td>
                        <Show when={props.canManageMembers}>
                          <button
                            class="btn btn-ghost btn-sm"
                            onClick={() => props.onRevokeInvitation(inv.id)}
                            disabled={props.invitationPending}
                          >
                            Revoke
                          </button>
                        </Show>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      {/* Invite modal */}
      <Modal
        open={inviteOpen()}
        onClose={() => setInviteOpen(false)}
        title="Invite member"
        description="Send an email invitation with an organization role, optionally scoped to the active project."
      >
        <form onSubmit={handleInvite} class="space-y-4">
          <Input
            label="Email address"
            type="email"
            placeholder="teammate@example.com"
            value={props.invitationInput.email}
            onInput={(e) => props.onInvitationInputChange("email", e.currentTarget.value)}
            required
          />
          <Select
            label="Organization role"
            value={props.invitationInput.orgRole}
            onChange={(e) => props.onInvitationInputChange("orgRole", e.currentTarget.value)}
          >
            <For each={orgRoles}>
              {(role) => <option value={role}>{role}</option>}
            </For>
          </Select>
          <Show when={props.hasActiveProject}>
            <label class="flex items-center gap-2.5 text-sm text-text-2 cursor-pointer">
              <input
                type="checkbox"
                class="checkbox"
                checked={props.invitationInput.attachProject}
                onChange={(e) =>
                  props.onInvitationInputChange("attachProject", e.currentTarget.checked)
                }
              />
              Also grant access to the active project
            </label>
            <Show when={props.invitationInput.attachProject}>
              <Select
                label="Project role"
                value={props.invitationInput.projectRole}
                onChange={(e) =>
                  props.onInvitationInputChange("projectRole", e.currentTarget.value)
                }
              >
                <For each={projectRoles}>
                  {(role) => <option value={role}>{role}</option>}
                </For>
              </Select>
            </Show>
          </Show>
          <ModalFooter>
            <button type="button" class="btn btn-ghost" onClick={() => setInviteOpen(false)}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={props.invitationPending}>
              <Show when={props.invitationPending} fallback="Send invitation">
                <span class="spinner" /> Sending…
              </Show>
            </button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
