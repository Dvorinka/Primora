import { For, Show, createSignal } from "solid-js";
import type { ProjectSummary } from "@primora/api-client";
import { Badge } from "../components/Badge";
import { Modal, ModalFooter } from "../components/Modal";
import { Input, Textarea } from "../components/Input";
import { IconPlus, IconProjects, IconArrowRight, IconEdit, IconTrash } from "../components/Icons";

interface ProjectInput {
  name: string;
  slug: string;
  description: string;
}

interface ProjectEditInput extends ProjectInput {
  retentionEventsDays: string;
  retentionAuditDays: string;
  retentionWebhookDays: string;
}

interface ProjectsPageProps {
  projects: ProjectSummary[];
  selectedProjectID?: string;
  projectInput: ProjectInput;
  projectEditInput: ProjectEditInput;
  projectMessage: string;
  projectPending: boolean;
  canUpdateProject: boolean;
  onProjectInputChange: (field: keyof ProjectInput, value: string) => void;
  onProjectEditInputChange: (field: keyof ProjectEditInput, value: string) => void;
  onCreateProject: (event: SubmitEvent) => void;
  onUpdateProject: (event: SubmitEvent) => void;
  onDeleteProject: () => void;
  onSelectProject: (id: string) => void;
  onNavigateToDashboard: () => void;
}

export function ProjectsPage(props: ProjectsPageProps) {
  const [createOpen, setCreateOpen] = createSignal(false);
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal(false);

  const activeProject = () =>
    props.projects.find((p) => p.id === props.selectedProjectID);

  const roleVariant = (role?: string | null) =>
    role === "admin" ? "primary" : role === "developer" ? "success" : "neutral";

  const handleCreate = async (e: SubmitEvent) => {
    props.onCreateProject(e);
    setCreateOpen(false);
  };

  const handleUpdate = async (e: SubmitEvent) => {
    props.onUpdateProject(e);
    setSettingsOpen(false);
  };

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Projects</h1>
          <p class="page-description">
            Projects scope storage, collections, API keys, and members.
          </p>
        </div>
        <div class="page-actions">
          <button class="btn btn-primary" onClick={() => setCreateOpen(true)}>
            <IconPlus class="w-4 h-4" />
            New project
          </button>
        </div>
      </div>

      <Show when={props.projectMessage}>
        <div class="message message-neutral">{props.projectMessage}</div>
      </Show>

      <div class="card card-flush">
        <Show
          when={props.projects.length > 0}
          fallback={
            <div class="empty-state">
              <div class="empty-state-icon">
                <IconProjects class="w-5 h-5" />
              </div>
              <p class="empty-state-title">No projects yet</p>
              <p class="empty-state-description">
                Create your first project to start storing files, collections and issuing API keys.
              </p>
              <button class="btn btn-primary mt-4" onClick={() => setCreateOpen(true)}>
                <IconPlus class="w-4 h-4" />
                Create project
              </button>
            </div>
          }
        >
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Role</th>
                  <th style="width: 1%">Status</th>
                  <th style="width: 1%" />
                </tr>
              </thead>
              <tbody>
                <For each={props.projects}>
                  {(project) => (
                    <tr
                      class="clickable"
                      onClick={() => {
                        props.onSelectProject(project.id);
                        props.onNavigateToDashboard();
                      }}
                    >
                      <td>
                        <div class="flex items-center gap-2.5">
                          <span
                            class="ctx-icon"
                            style="display:inline-flex;align-items:center;justify-content:center;width:1.5rem;height:1.5rem;border-radius:6px;background:var(--surface-3);font-size:0.625rem;font-weight:700;color:var(--text-2)"
                          >
                            {project.name[0]?.toUpperCase()}
                          </span>
                          <div>
                            <div class="font-medium text-text-1">{project.name}</div>
                            <Show when={project.description}>
                              <div class="text-xs text-text-3">{project.description}</div>
                            </Show>
                          </div>
                        </div>
                      </td>
                      <td>
                        <code>{project.slug}</code>
                      </td>
                      <td>
                        <Badge variant={roleVariant(project.membershipRole)}>
                          {project.membershipRole ?? "member"}
                        </Badge>
                      </td>
                      <td>
                        <Show when={project.id === props.selectedProjectID}>
                          <Badge variant="primary">
                            <span class="badge-dot" />
                            Active
                          </Badge>
                        </Show>
                      </td>
                      <td>
                        <IconArrowRight class="w-4 h-4 text-text-3" />
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>

      <Show when={activeProject()}>
        <div class="card">
          <div class="card-header">
            <span class="card-header-title">Project settings</span>
            <span class="card-header-description">
              Manage <strong>{activeProject()!.name}</strong>. Renaming changes the API-visible slug.
            </span>
          </div>
          <div class="flex gap-2">
            <button
              class="btn btn-secondary"
              onClick={() => setSettingsOpen(true)}
              disabled={!props.canUpdateProject}
            >
              <IconEdit class="w-4 h-4" />
              Edit project
            </button>
            <button
              class="btn btn-danger"
              onClick={() => setConfirmDelete(true)}
              disabled={!props.canUpdateProject}
            >
              <IconTrash class="w-4 h-4" />
              Delete project
            </button>
          </div>
          <Show when={!props.canUpdateProject}>
            <p class="label-hint mt-3">You need the admin role to modify this project.</p>
          </Show>
        </div>
      </Show>

      {/* Create modal */}
      <Modal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
        title="Create project"
        description="A project groups buckets, collections, API keys and members."
      >
        <form onSubmit={handleCreate} class="space-y-4">
          <Input
            label="Project name"
            placeholder="Production API"
            value={props.projectInput.name}
            onInput={(e) => props.onProjectInputChange("name", e.currentTarget.value)}
            required
          />
          <Input
            label="Slug"
            placeholder="production-api"
            value={props.projectInput.slug}
            onInput={(e) => props.onProjectInputChange("slug", e.currentTarget.value)}
            required
          />
          <Textarea
            label="Description"
            placeholder="What does this project power?"
            value={props.projectInput.description}
            onInput={(e) => props.onProjectInputChange("description", e.currentTarget.value)}
          />
          <ModalFooter>
            <button type="button" class="btn btn-ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={props.projectPending}>
              <Show when={props.projectPending} fallback="Create project">
                <span class="spinner" /> Creating…
              </Show>
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Edit modal */}
      <Modal
        open={settingsOpen()}
        onClose={() => setSettingsOpen(false)}
        title="Edit project"
        description="Update name, slug or description."
      >
        <form onSubmit={handleUpdate} class="space-y-4">
          <Input
            label="Project name"
            value={props.projectEditInput.name}
            onInput={(e) => props.onProjectEditInputChange("name", e.currentTarget.value)}
            required
          />
          <Input
            label="Slug"
            value={props.projectEditInput.slug}
            onInput={(e) => props.onProjectEditInputChange("slug", e.currentTarget.value)}
            required
          />
          <Textarea
            label="Description"
            value={props.projectEditInput.description}
            onInput={(e) => props.onProjectEditInputChange("description", e.currentTarget.value)}
          />
          <div>
            <span class="label">Data retention (days)</span>
            <p class="label-hint mb-2">
              Rows older than this are swept hourly. 0 disables a category. Max 3650.
            </p>
            <div class="grid gap-3 sm:grid-cols-3">
              <Input
                label="Telemetry events"
                type="number"
                min={0}
                max={3650}
                value={props.projectEditInput.retentionEventsDays}
                onInput={(e) => props.onProjectEditInputChange("retentionEventsDays", e.currentTarget.value)}
              />
              <Input
                label="Audit log"
                type="number"
                min={0}
                max={3650}
                value={props.projectEditInput.retentionAuditDays}
                onInput={(e) => props.onProjectEditInputChange("retentionAuditDays", e.currentTarget.value)}
              />
              <Input
                label="Webhook deliveries"
                type="number"
                min={0}
                max={3650}
                value={props.projectEditInput.retentionWebhookDays}
                onInput={(e) => props.onProjectEditInputChange("retentionWebhookDays", e.currentTarget.value)}
              />
            </div>
          </div>
          <ModalFooter>
            <button type="button" class="btn btn-ghost" onClick={() => setSettingsOpen(false)}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={props.projectPending}>
              Save changes
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={confirmDelete()}
        onClose={() => setConfirmDelete(false)}
        title="Delete project"
        size="sm"
      >
        <p class="text-sm text-text-2">
          Deleting <strong class="text-text-1">{activeProject()?.name}</strong> permanently removes
          its buckets, objects, collections, API keys, members and audit history. This cannot be undone.
        </p>
        <ModalFooter>
          <button class="btn btn-ghost" onClick={() => setConfirmDelete(false)}>
            Cancel
          </button>
          <button
            class="btn btn-danger"
            onClick={() => {
              setConfirmDelete(false);
              props.onDeleteProject();
            }}
            disabled={props.projectPending}
          >
            Delete permanently
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
