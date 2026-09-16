import { For, Show, createMemo, createSignal } from "solid-js";
import type { Collection, Document } from "@primora/api-client";
import { Badge } from "../components/Badge";
import { Modal, ModalFooter } from "../components/Modal";
import { Input, Textarea } from "../components/Input";
import {
  IconPlus,
  IconCollections,
  IconTrash,
  IconChevronRight,
  IconFile,
} from "../components/Icons";

interface CollectionInput {
  name: string;
  slug: string;
  description: string;
}

interface CollectionsPageProps {
  collections: Collection[];
  documents: Document[];
  selectedCollectionID?: string;
  collectionInput: CollectionInput;
  collectionMessage: string;
  collectionPending: boolean;
  documentPending: boolean;
  canUpdate: boolean;
  onCollectionInputChange: (field: keyof CollectionInput, value: string) => void;
  onCreateCollection: (event: SubmitEvent) => void;
  onDeleteCollection: (id: string) => void;
  onSelectCollection: (id: string) => void;
  onCreateDocument: (data: Record<string, unknown>) => void;
  onUpdateDocument: (id: string, data: Record<string, unknown>) => void;
  onDeleteDocument: (id: string) => void;
  formatDate: (value?: string | null) => string;
}

function prettyJson(value: Record<string, unknown>): string {
  return JSON.stringify(value, null, 2);
}

export function CollectionsPage(props: CollectionsPageProps) {
  const [createOpen, setCreateOpen] = createSignal(false);
  const [docEditorOpen, setDocEditorOpen] = createSignal(false);
  const [editingDoc, setEditingDoc] = createSignal<Document | null>(null);
  const [docJson, setDocJson] = createSignal("{}");
  const [docError, setDocError] = createSignal("");

  const activeCollection = createMemo(() =>
    props.collections.find((c) => c.id === props.selectedCollectionID),
  );

  const openNewDoc = () => {
    setEditingDoc(null);
    setDocJson("{\n  \n}");
    setDocError("");
    setDocEditorOpen(true);
  };

  const openEditDoc = (doc: Document) => {
    setEditingDoc(doc);
    setDocJson(prettyJson(doc.data));
    setDocError("");
    setDocEditorOpen(true);
  };

  const submitDoc = (e: SubmitEvent) => {
    e.preventDefault();
    try {
      const parsed = JSON.parse(docJson());
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        setDocError("Document data must be a JSON object.");
        return;
      }
      const doc = editingDoc();
      if (doc) {
        props.onUpdateDocument(doc.id, parsed);
      } else {
        props.onCreateDocument(parsed);
      }
      setDocEditorOpen(false);
    } catch {
      setDocError("Invalid JSON. Check syntax and try again.");
    }
  };

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Collections</h1>
          <p class="page-description">
            Document collections stored in Postgres — schema-flexible records for your app.
          </p>
        </div>
        <div class="page-actions">
          <button
            class="btn btn-primary"
            onClick={() => setCreateOpen(true)}
            disabled={!props.canUpdate}
          >
            <IconPlus class="w-4 h-4" />
            New collection
          </button>
        </div>
      </div>

      <Show when={props.collectionMessage}>
        <div class="message message-neutral">{props.collectionMessage}</div>
      </Show>

      <div class="grid gap-5" style="grid-template-columns: minmax(0, 17rem) minmax(0, 1fr)">
        {/* collection list */}
        <div class="card card-flush">
          <div
            class="card-header"
            style="padding:1rem 1rem 0.75rem;margin-bottom:0;border-bottom:1px solid var(--border)"
          >
            <span class="card-header-title">Collections</span>
          </div>
          <div class="p-1.5">
            <For
              each={props.collections}
              fallback={
                <div class="p-4 text-center">
                  <p class="text-xs text-text-3">No collections yet</p>
                </div>
              }
            >
              {(collection) => (
                <button
                  class={`nav-item w-full ${collection.id === props.selectedCollectionID ? "active" : ""}`}
                  onClick={() => props.onSelectCollection(collection.id)}
                >
                  <IconCollections class="w-4 h-4" />
                  <span class="flex-1 truncate">{collection.name}</span>
                  <Show when={props.canUpdate}>
                    <span
                      class="icon-btn"
                      role="button"
                      title="Delete collection"
                      aria-label={`Delete ${collection.name}`}
                      style="width:1.5rem;height:1.5rem"
                      onClick={(e) => {
                        e.stopPropagation();
                        props.onDeleteCollection(collection.id);
                      }}
                    >
                      <IconTrash class="w-3.5 h-3.5" />
                    </span>
                  </Show>
                </button>
              )}
            </For>
          </div>
        </div>

        {/* documents */}
        <div class="card card-flush" style="min-height:28rem">
          <Show
            when={activeCollection()}
            fallback={
              <div class="empty-state" style="min-height:28rem">
                <div class="empty-state-icon">
                  <IconCollections class="w-5 h-5" />
                </div>
                <p class="empty-state-title">Select a collection</p>
                <p class="empty-state-description">
                  Choose a collection on the left, or create one to start adding documents.
                </p>
              </div>
            }
          >
            <div
              class="card-header"
              style="padding:1rem 1.25rem;margin-bottom:0;border-bottom:1px solid var(--border)"
            >
              <div class="flex items-center justify-between gap-3 w-full">
                <div class="min-w-0">
                  <span class="card-header-title">{activeCollection()!.name}</span>
                  <span class="card-header-description">
                    <code>{activeCollection()!.slug}</code>
                    <Show when={activeCollection()!.description}>
                      {" · "}{activeCollection()!.description}
                    </Show>
                  </span>
                </div>
                <button
                  class="btn btn-secondary btn-sm"
                  onClick={openNewDoc}
                  disabled={!props.canUpdate}
                >
                  <IconPlus class="w-3.5 h-3.5" />
                  New document
                </button>
              </div>
            </div>

            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Document</th>
                    <th style="width:1%">Updated</th>
                    <th style="width:1%" />
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={props.documents}
                    fallback={
                      <tr>
                        <td colspan={3} class="py-10 text-center text-text-3">
                          No documents yet. Create one as a JSON object.
                        </td>
                      </tr>
                    }
                  >
                    {(doc) => (
                      <tr class="clickable" onClick={() => openEditDoc(doc)}>
                        <td>
                          <div class="flex items-center gap-2.5 min-w-0">
                            <IconFile class="w-4 h-4 text-text-3 flex-shrink-0" />
                            <div class="min-w-0">
                              <div class="font-mono text-xs text-text-1">{doc.id}</div>
                              <div class="text-xs text-text-3 truncate" style="max-width:30rem">
                                {JSON.stringify(doc.data)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td class="text-xs text-text-3 whitespace-nowrap">
                          {props.formatDate(doc.updated_at)}
                        </td>
                        <td>
                          <IconChevronRight class="w-4 h-4 text-text-3" />
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </div>
      </div>

      {/* create collection modal */}
      <Modal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
        title="Create collection"
        description="Collections store JSON documents scoped to a project."
      >
        <form onSubmit={props.onCreateCollection} class="space-y-4">
          <Input
            label="Collection name"
            placeholder="Posts"
            value={props.collectionInput.name}
            onInput={(e) => props.onCollectionInputChange("name", e.currentTarget.value)}
            required
          />
          <Input
            label="Slug"
            placeholder="posts"
            value={props.collectionInput.slug}
            onInput={(e) => props.onCollectionInputChange("slug", e.currentTarget.value)}
            required
          />
          <Input
            label="Description"
            placeholder="Optional"
            value={props.collectionInput.description}
            onInput={(e) => props.onCollectionInputChange("description", e.currentTarget.value)}
          />
          <ModalFooter>
            <button type="button" class="btn btn-ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={props.collectionPending}>
              Create collection
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* document editor modal */}
      <Modal
        open={docEditorOpen()}
        onClose={() => setDocEditorOpen(false)}
        title={editingDoc() ? "Edit document" : "New document"}
        description="Documents are arbitrary JSON objects validated against the collection schema when one is set."
        size="lg"
      >
        <form onSubmit={submitDoc} class="space-y-4">
          <Show when={editingDoc()}>
            <div class="flex items-center gap-2 text-xs text-text-3">
              <Badge variant="neutral"><code class="border-0 bg-transparent p-0">{editingDoc()!.id}</code></Badge>
              <span>created {props.formatDate(editingDoc()!.created_at)}</span>
            </div>
          </Show>
          <Textarea
            label="Document data (JSON)"
            class="font-mono"
            style="min-height:16rem;font-size:0.75rem"
            value={docJson()}
            onInput={(e) => {
              setDocJson(e.currentTarget.value);
              setDocError("");
            }}
            spellcheck={false}
            required
          />
          <Show when={docError()}>
            <div class="message message-error">{docError()}</div>
          </Show>
          <ModalFooter align="between">
            <Show when={editingDoc()} fallback={<span />}>
              <button
                type="button"
                class="btn btn-danger"
                onClick={() => {
                  const doc = editingDoc();
                  if (doc) {
                    setDocEditorOpen(false);
                    props.onDeleteDocument(doc.id);
                  }
                }}
                disabled={!props.canUpdate || props.documentPending}
              >
                Delete document
              </button>
            </Show>
            <div class="flex gap-2">
              <button type="button" class="btn btn-ghost" onClick={() => setDocEditorOpen(false)}>
                Cancel
              </button>
              <button
                type="submit"
                class="btn btn-primary"
                disabled={!props.canUpdate || props.documentPending}
              >
                {editingDoc() ? "Save changes" : "Create document"}
              </button>
            </div>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
