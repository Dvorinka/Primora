import { Show, For, createSignal } from "solid-js";
import { Button, Card, Input, Textarea, Badge, EmptyState, Message, Modal } from "../components";
import type { ProjectSummary } from "@primora/api-client";

interface ProjectsPageProps {
  projects: ProjectSummary[];
  selectedProjectID?: string;
  projectInput: { name: string; slug: string; description: string };
  projectEditInput: { name: string; slug: string; description: string };
  projectMessage: string;
  projectPending: boolean;
  canUpdateProject: boolean;
  onProjectInputChange: (field: string, value: string) => void;
  onProjectEditInputChange: (field: string, value: string) => void;
  onCreateProject: (e: SubmitEvent) => void;
  onUpdateProject: (e: SubmitEvent) => void;
  onDeleteProject: () => void;
  onSelectProject: (id: string) => void;
  onNavigateToDashboard: () => void;
}

export function ProjectsPage(props: ProjectsPageProps) {
  const [showCreateModal, setShowCreateModal] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");

  const filteredProjects = () => {
    const query = searchQuery().toLowerCase();
    if (!query) return props.projects;
    return props.projects.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.slug.toLowerCase().includes(query) ||
      p.description?.toLowerCase().includes(query)
    );
  };

  const handleCreateSubmit = (e: SubmitEvent) => {
    props.onCreateProject(e);
    setShowCreateModal(false);
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Projects</h1>
          <p class="text-gray-600 mt-1">Manage your organization's projects</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </Button>
      </div>

      {/* Search Bar */}
      <Card class="p-4">
        <Input
          placeholder="Search projects by name, slug, or description..."
          value={searchQuery()}
          onInput={(e) => setSearchQuery(e.currentTarget.value)}
          class="w-full"
        />
      </Card>

      {/* Projects Grid */}
      <Show
        when={filteredProjects().length > 0}
        fallback={
          <EmptyState
            icon={
              <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
            title="No projects found"
            description={searchQuery() ? "Try adjusting your search" : "Create your first project to get started"}
            action={
              <Show when={!searchQuery()}>
                <Button onClick={() => setShowCreateModal(true)}>Create Project</Button>
              </Show>
            }
          />
        }
      >
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <For each={filteredProjects()}>
            {(project) => (
              <Card 
                class={`p-6 cursor-pointer transition-all hover:shadow-lg hover:border-blue-500 ${
                  props.selectedProjectID === project.id ? 'border-blue-500 bg-blue-50' : ''
                }`}
                onClick={() => {
                  props.onSelectProject(project.id);
                  props.onNavigateToDashboard();
                }}
              >
                <div class="flex items-start justify-between mb-4">
                  <div class="flex-1">
                    <h3 class="text-lg font-semibold text-gray-900 mb-1">{project.name}</h3>
                    <Badge variant="secondary" class="text-xs">{project.slug}</Badge>
                  </div>
                  <Show when={project.membershipRole}>
                    <Badge variant={project.membershipRole === 'admin' ? 'primary' : 'secondary'}>
                      {project.membershipRole}
                    </Badge>
                  </Show>
                </div>
                
                <Show when={project.description}>
                  <p class="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>
                </Show>

                <div class="flex items-center justify-between pt-4 border-t border-gray-200">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      props.onSelectProject(project.id);
                      props.onNavigateToDashboard();
                    }}
                    class="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Dashboard →
                  </button>
                  <Show when={project.membershipRole === 'admin'}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onSelectProject(project.id);
                      }}
                      class="text-sm text-gray-600 hover:text-gray-700"
                    >
                      <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>
                  </Show>
                </div>
              </Card>
            )}
          </For>
        </div>
      </Show>

      {/* Selected Project Settings */}
      <Show when={props.selectedProjectID && props.canUpdateProject}>
        <Card class="p-6">
          <h2 class="text-xl font-semibold mb-4">Project Settings</h2>
          <form class="space-y-4" onSubmit={props.onUpdateProject}>
            <Input
              label="Project Name"
              placeholder="Enter project name"
              value={props.projectEditInput.name}
              onInput={(e) => props.onProjectEditInputChange('name', e.currentTarget.value)}
              disabled={props.projectPending}
            />
            <Input
              label="Project Slug"
              placeholder="project-slug"
              value={props.projectEditInput.slug}
              onInput={(e) => props.onProjectEditInputChange('slug', e.currentTarget.value)}
              disabled={props.projectPending}
            />
            <Textarea
              label="Description"
              placeholder="Describe your project..."
              value={props.projectEditInput.description}
              onInput={(e) => props.onProjectEditInputChange('description', e.currentTarget.value)}
              disabled={props.projectPending}
              rows={3}
            />
            <div class="flex gap-3">
              <Button type="submit" variant="primary" disabled={props.projectPending}>
                {props.projectPending ? "Updating..." : "Update Project"}
              </Button>
              <Button type="button" variant="danger" onClick={props.onDeleteProject} disabled={props.projectPending}>
                Delete Project
              </Button>
            </div>
          </form>
          <Show when={props.projectMessage}>
            <Message variant="neutral" class="mt-4">{props.projectMessage}</Message>
          </Show>
        </Card>
      </Show>

      {/* Create Project Modal */}
      <Modal open={showCreateModal()} onClose={() => setShowCreateModal(false)} title="Create New Project">
        <form class="space-y-4" onSubmit={handleCreateSubmit}>
          <Input
            label="Project Name"
            placeholder="My Awesome Project"
            value={props.projectInput.name}
            onInput={(e) => {
              const name = e.currentTarget.value;
              props.onProjectInputChange('name', name);
              // Auto-generate slug
              const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
              props.onProjectInputChange('slug', slug);
            }}
            disabled={props.projectPending}
            required
          />
          <Input
            label="Project Slug"
            placeholder="my-awesome-project"
            value={props.projectInput.slug}
            onInput={(e) => props.onProjectInputChange('slug', e.currentTarget.value)}
            disabled={props.projectPending}
            required
          />
          <Textarea
            label="Description (Optional)"
            placeholder="What is this project about?"
            value={props.projectInput.description}
            onInput={(e) => props.onProjectInputChange('description', e.currentTarget.value)}
            disabled={props.projectPending}
            rows={3}
          />
          <div class="flex gap-3 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={props.projectPending}>
              {props.projectPending ? "Creating..." : "Create Project"}
            </Button>
          </div>
        </form>
        <Show when={props.projectMessage}>
          <Message variant="neutral" class="mt-4">{props.projectMessage}</Message>
        </Show>
      </Modal>
    </div>
  );
}
