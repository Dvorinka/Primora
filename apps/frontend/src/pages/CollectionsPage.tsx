import { Show, For, createSignal, createMemo } from "solid-js";
import { 
  Button, 
  Card, 
  Input, 
  Textarea, 
  Badge, 
  EmptyState, 
  Message, 
  Modal, 
  Table, 
  DataTable 
} from "../components";
import type { Collection, Document } from "@primora/api-client";

interface CollectionsPageProps {
  collections: Collection[];
  documents: Document[];
  selectedCollectionID?: string;
  collectionInput: { name: string; slug: string; description: string };
  collectionMessage: string;
  collectionPending: boolean;
  documentPending: boolean;
  canUpdate: boolean;
  onCollectionInputChange: (field: string, value: string) => void;
  onCreateCollection: (e: SubmitEvent) => void;
  onDeleteCollection: (id: string) => void;
  onSelectCollection: (id: string) => void;
  onCreateDocument: (data: any) => void;
  onUpdateDocument: (id: string, data: any) => void;
  onDeleteDocument: (id: string) => void;
  formatDate: (date?: string | null) => string;
}

export function CollectionsPage(props: CollectionsPageProps) {
  const [showCreateCollectionModal, setShowCreateCollectionModal] = createSignal(false);
  const [showDocumentModal, setShowDocumentModal] = createSignal(false);
  const [editingDocument, setEditingDocument] = createSignal<Document | null>(null);
  const [documentData, setDocumentData] = createSignal("");

  const activeCollection = createMemo(() => 
    props.collections.find(c => c.id === props.selectedCollectionID)
  );

  const handleCreateCollection = (e: SubmitEvent) => {
    props.onCreateCollection(e);
    setShowCreateCollectionModal(false);
  };

  const handleOpenDocumentModal = (doc: Document | null = null) => {
    setEditingDocument(doc);
    setDocumentData(doc ? JSON.stringify(doc.data, null, 2) : "{\n  \n}");
    setShowDocumentModal(true);
  };

  const handleSaveDocument = (e: SubmitEvent) => {
    e.preventDefault();
    try {
      const data = JSON.parse(documentData());
      if (editingDocument()) {
        props.onUpdateDocument(editingDocument()!.id, data);
      } else {
        props.onCreateDocument(data);
      }
      setShowDocumentModal(false);
    } catch (err) {
      alert("Invalid JSON data");
    }
  };

  return (
    <div class="flex flex-col md:flex-row gap-6 h-[calc(100vh-12rem)]">
      {/* Sidebar: Collections List */}
      <div class="w-full md:w-64 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-bold">Collections</h2>
          <Button size="sm" onClick={() => setShowCreateCollectionModal(true)}>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
          </Button>
        </div>
        
        <Card class="flex-1 overflow-y-auto p-2">
          <Show 
            when={props.collections.length > 0} 
            fallback={<p class="text-sm text-gray-500 p-4 text-center">No collections</p>}
          >
            <div class="space-y-1">
              <For each={props.collections}>
                {(collection) => (
                  <button
                    onClick={() => props.onSelectCollection(collection.id)}
                    class={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      props.selectedCollectionID === collection.id 
                        ? 'bg-blue-50 text-blue-700 font-medium' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div class="flex items-center justify-between">
                      <span>{collection.name}</span>
                      <Show when={props.selectedCollectionID === collection.id}>
                        <div class="w-1.5 h-1.5 rounded-full bg-blue-600" />
                      </Show>
                    </div>
                  </button>
                )}
              </For>
            </div>
          </Show>
        </Card>
      </div>

      {/* Main Content: Documents Table */}
      <div class="flex-1 flex flex-col gap-4 min-w-0">
        <Show 
          when={activeCollection()} 
          fallback={
            <Card class="flex-1 flex items-center justify-center p-8">
              <EmptyState
                title="No collection selected"
                description="Select a collection from the sidebar to view its documents"
                icon={
                  <svg class="w-12 h-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                  </svg>
                }
              />
            </Card>
          }
        >
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-2xl font-bold text-gray-900">{activeCollection()?.name}</h2>
              <p class="text-sm text-gray-500">{activeCollection()?.slug}</p>
            </div>
            <div class="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => props.onDeleteCollection(activeCollection()!.id)}>
                Delete Collection
              </Button>
              <Button onClick={() => handleOpenDocumentModal()}>
                Add Document
              </Button>
            </div>
          </div>

          <Card class="flex-1 overflow-hidden flex flex-col">
            <Show 
              when={props.documents.length > 0} 
              fallback={
                <div class="flex-1 flex items-center justify-center p-8">
                  <EmptyState
                    title="No documents yet"
                    description="This collection is empty. Add your first document to get started."
                    action={<Button onClick={() => handleOpenDocumentModal()}>Add Document</Button>}
                  />
                </div>
              }
            >
              <div class="overflow-auto">
                <Table>
                  <thead>
                    <tr>
                      <th class="w-1/3">ID</th>
                      <th>Data</th>
                      <th class="w-48">Created At</th>
                      <th class="w-24 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={props.documents}>
                      {(doc) => (
                        <tr class="hover:bg-gray-50">
                          <td class="font-mono text-xs text-gray-500">{doc.id}</td>
                          <td>
                            <div class="max-w-md truncate text-sm">
                              {JSON.stringify(doc.data)}
                            </div>
                          </td>
                          <td class="text-sm text-gray-500">{props.formatDate(doc.created_at)}</td>
                          <td class="text-right">
                            <div class="flex justify-end gap-1">
                              <button 
                                onClick={() => handleOpenDocumentModal(doc)}
                                class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                              >
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button 
                                onClick={() => props.onDeleteDocument(doc.id)}
                                class="p-1 text-gray-400 hover:text-red-600 transition-colors"
                              >
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </Table>
              </div>
            </Show>
          </Card>
        </Show>
      </div>

      {/* Create Collection Modal */}
      <Modal 
        open={showCreateCollectionModal()} 
        onClose={() => setShowCreateCollectionModal(false)} 
        title="Create New Collection"
      >
        <form class="space-y-4" onSubmit={handleCreateCollection}>
          <Input
            label="Collection Name"
            placeholder="Users, Products, etc."
            value={props.collectionInput.name}
            onInput={(e) => {
              const name = e.currentTarget.value;
              props.onCollectionInputChange('name', name);
              const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
              props.onCollectionInputChange('slug', slug);
            }}
            required
          />
          <Input
            label="Collection Slug"
            placeholder="users"
            value={props.collectionInput.slug}
            onInput={(e) => props.onCollectionInputChange('slug', e.currentTarget.value)}
            required
          />
          <Textarea
            label="Description"
            placeholder="What's in this collection?"
            value={props.collectionInput.description}
            onInput={(e) => props.onCollectionInputChange('description', e.currentTarget.value)}
            rows={3}
          />
          <div class="flex gap-3 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowCreateCollectionModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={props.collectionPending}>
              {props.collectionPending ? "Creating..." : "Create Collection"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Document Editor Modal */}
      <Modal 
        open={showDocumentModal()} 
        onClose={() => setShowDocumentModal(false)} 
        title={editingDocument() ? "Edit Document" : "New Document"}
      >
        <form class="space-y-4" onSubmit={handleSaveDocument}>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">JSON Data</label>
            <div class="font-mono text-sm border rounded-md overflow-hidden bg-gray-50">
              <textarea
                value={documentData()}
                onInput={(e) => setDocumentData(e.currentTarget.value)}
                class="w-full h-64 p-4 bg-transparent outline-none focus:ring-2 focus:ring-blue-500"
                spellcheck={false}
              />
            </div>
          </div>
          <div class="flex gap-3 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowDocumentModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={props.documentPending}>
              {props.documentPending ? "Saving..." : "Save Document"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
