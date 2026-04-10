import { Show, For, createSignal } from "solid-js";
import { Button, Card, Input, Select, Badge, Table, EmptyState, Message, Modal, Tabs, TabPanel } from "../components";
import type { OrganizationMember, OrganizationInvitation, ProjectMember } from "@primora/api-client";

interface MembersPageProps {
  organizationMembers?: OrganizationMember[];
  organizationInvitations?: OrganizationInvitation[];
  projectMembers?: ProjectMember[];
  invitationInput: {
    email: string;
    orgRole: string;
    attachProject: boolean;
    projectRole: string;
  };
  inviteMessage: string;
  memberMessage: string;
  invitationPending: boolean;
  membersPending: boolean;
  canManageMembers: boolean;
  hasActiveProject: boolean;
  onInvitationInputChange: (field: string, value: any) => void;
  onSendInvitation: (e: SubmitEvent) => void;
  onRevokeInvitation: (id: string) => void;
  onRemoveMember: (id: string, type: 'org' | 'project') => void;
  onUpdateMemberRole: (id: string, role: string, type: 'org' | 'project') => void;
}

export function MembersPage(props: MembersPageProps) {
  const [showInviteModal, setShowInviteModal] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<'organization' | 'project'>('organization');
  const [searchQuery, setSearchQuery] = createSignal("");

  const filteredOrgMembers = () => {
    const query = searchQuery().toLowerCase();
    if (!query || !props.organizationMembers) return props.organizationMembers || [];
    return props.organizationMembers.filter(m => 
      m.user_name?.toLowerCase().includes(query) || 
      m.user_email?.toLowerCase().includes(query)
    );
  };

  const filteredProjectMembers = () => {
    const query = searchQuery().toLowerCase();
    if (!query || !props.projectMembers) return props.projectMembers || [];
    return props.projectMembers.filter(m => 
      m.user_name?.toLowerCase().includes(query) || 
      m.user_email?.toLowerCase().includes(query)
    );
  };

  const handleInviteSubmit = (e: SubmitEvent) => {
    props.onSendInvitation(e);
    setShowInviteModal(false);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'primary';
      case 'admin': return 'success';
      default: return 'secondary';
    }
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Team Members</h1>
          <p class="text-gray-600 mt-1">Manage organization and project access</p>
        </div>
        <Show when={props.canManageMembers}>
          <Button onClick={() => setShowInviteModal(true)}>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Invite Member
          </Button>
        </Show>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'organization', label: 'Organization Members' },
          { id: 'project', label: 'Project Members', disabled: !props.hasActiveProject },
        ]}
        activeTab={activeTab()}
        onChange={(id) => setActiveTab(id as 'organization' | 'project')}
      />

      {/* Search Bar */}
      <Card class="p-4">
        <Input
          placeholder="Search members by name or email..."
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          class="w-full"
        />
      </Card>

      {/* Organization Members Tab */}
      <Show when={activeTab() === 'organization'}>
        <div class="space-y-6">
          {/* Pending Invitations */}
          <Show when={(props.organizationInvitations?.length ?? 0) > 0}>
            <Card class="p-6">
              <h2 class="text-lg font-semibold mb-4 flex items-center gap-2">
                <svg class="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Pending Invitations
              </h2>
              <div class="space-y-3">
                <For each={props.organizationInvitations}>
                  {(invitation) => (
                    <div class="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div class="flex-1">
                        <p class="font-medium text-gray-900">{invitation.email}</p>
                        <div class="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">{invitation.org_role}</Badge>
                          <Show when={invitation.project_id}>
                            <Badge variant="secondary">Project: {invitation.project_role}</Badge>
                          </Show>
                          <span class="text-xs text-gray-500">
                            Invited {new Date(invitation.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Show when={props.canManageMembers}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => props.onRevokeInvitation(invitation.id)}
                          disabled={props.invitationPending}
                        >
                          Revoke
                        </Button>
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </Card>
          </Show>

          {/* Members List */}
          <Card>
            <Show
              when={filteredOrgMembers().length > 0}
              fallback={
                <div class="p-12">
                  <EmptyState
                    icon={
                      <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    }
                    title="No members found"
                    description={searchQuery() ? "Try adjusting your search" : "Invite team members to collaborate"}
                  />
                </div>
              }
            >
              <Table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th class="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={filteredOrgMembers()}>
                    {(member) => (
                      <tr>
                        <td>
                          <div class="flex items-center gap-3">
                            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                              {member.user_name?.charAt(0).toUpperCase() ?? '?'}
                            </div>
                            <div>
                              <p class="font-medium text-gray-900">{member.user_name}</p>
                              <p class="text-sm text-gray-600">{member.user_email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <Show
                            when={props.canManageMembers && member.role !== 'owner'}
                            fallback={<Badge variant={getRoleBadgeVariant(member.role)}>{member.role}</Badge>}
                          >
                            <Select
                              value={member.role}
                              onChange={(e) => props.onUpdateMemberRole(member.user_id, e.currentTarget.value, 'org')}
                              disabled={props.membersPending}
                              class="w-32"
                            >
                              <option value="member">Member</option>
                              <option value="admin">Admin</option>
                              <option value="owner">Owner</option>
                            </Select>
                          </Show>
                        </td>
                        <td class="text-sm text-gray-600">
                          {new Date(member.created_at).toLocaleDateString()}
                        </td>
                        <td class="text-right">
                          <Show when={props.canManageMembers && member.role !== 'owner'}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => props.onRemoveMember(member.user_id, 'org')}
                              disabled={props.membersPending}
                            >
                              Remove
                            </Button>
                          </Show>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </Table>
            </Show>
          </Card>
        </div>
      </Show>

      {/* Project Members Tab */}
      <Show when={activeTab() === 'project'}>
        <Card>
          <Show
            when={filteredProjectMembers().length > 0}
            fallback={
              <div class="p-12">
                <EmptyState
                  icon={
                    <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  }
                  title="No project members"
                  description="Add members to this project to collaborate"
                />
              </div>
            }
          >
            <Table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Added</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={filteredProjectMembers()}>
                  {(member) => (
                    <tr>
                      <td>
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white font-semibold">
                            {member.user_name?.charAt(0).toUpperCase() ?? '?'}
                          </div>
                          <div>
                            <p class="font-medium text-gray-900">{member.user_name}</p>
                            <p class="text-sm text-gray-600">{member.user_email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <Show
                          when={props.canManageMembers}
                          fallback={<Badge variant={getRoleBadgeVariant(member.role)}>{member.role}</Badge>}
                        >
                          <Select
                            value={member.role}
                            onChange={(e) => props.onUpdateMemberRole(member.user_id, e.currentTarget.value, 'project')}
                            disabled={props.membersPending}
                            class="w-32"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="developer">Developer</option>
                            <option value="admin">Admin</option>
                          </Select>
                        </Show>
                      </td>
                      <td class="text-sm text-gray-600">
                        {new Date(member.created_at).toLocaleDateString()}
                      </td>
                      <td class="text-right">
                        <Show when={props.canManageMembers}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => props.onRemoveMember(member.user_id, 'project')}
                            disabled={props.membersPending}
                          >
                            Remove
                          </Button>
                        </Show>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </Table>
          </Show>
        </Card>
      </Show>

      <Show when={props.memberMessage}>
        <Message variant="neutral">{props.memberMessage}</Message>
      </Show>

      {/* Invite Modal */}
      <Modal open={showInviteModal()} onClose={() => setShowInviteModal(false)} title="Invite Team Member">
        <form class="space-y-4" onSubmit={handleInviteSubmit}>
          <Input
            label="Email Address"
            type="email"
            placeholder="colleague@example.com"
            value={props.invitationInput.email}
            onInput={(e) => props.onInvitationInputChange('email', e.currentTarget.value)}
            disabled={props.invitationPending}
            required
          />
          
          <Select
            label="Organization Role"
            value={props.invitationInput.orgRole}
            onChange={(e) => props.onInvitationInputChange('orgRole', e.currentTarget.value)}
            disabled={props.invitationPending}
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </Select>

          <Show when={props.hasActiveProject}>
            <div class="flex items-center gap-2">
              <input
                type="checkbox"
                id="attachProject"
                checked={props.invitationInput.attachProject}
                onChange={(e) => props.onInvitationInputChange('attachProject', e.currentTarget.checked)}
                disabled={props.invitationPending}
                class="rounded border-gray-300"
              />
              <label for="attachProject" class="text-sm text-gray-700">
                Add to current project
              </label>
            </div>

            <Show when={props.invitationInput.attachProject}>
              <Select
                label="Project Role"
                value={props.invitationInput.projectRole}
                onChange={(e) => props.onInvitationInputChange('projectRole', e.currentTarget.value)}
                disabled={props.invitationPending}
              >
                <option value="viewer">Viewer</option>
                <option value="developer">Developer</option>
                <option value="admin">Admin</option>
              </Select>
            </Show>
          </Show>

          <div class="flex gap-3 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowInviteModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={props.invitationPending}>
              {props.invitationPending ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
        <Show when={props.inviteMessage}>
          <Message variant="neutral" class="mt-4">{props.inviteMessage}</Message>
        </Show>
      </Modal>
    </div>
  );
}
