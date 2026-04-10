import { Show, For, createSignal } from "solid-js";
import { Button, Card, Input, Select, Badge, Table, EmptyState, Message, Modal, FileInput } from "../components";
import type { Bucket, BucketObject } from "@primora/api-client";

interface StoragePageProps {
  buckets?: Bucket[];
  objects?: BucketObject[];
  selectedBucketID?: string;
  selectedObjectKey?: string;
  bucketInput: { name: string; slug: string; visibility: string };
  bucketEditInput: { name: string; slug: string; visibility: string };
  storageMessage: string;
  storagePending: boolean;
  canUpdateBucket: boolean;
  objectsPage?: { items: BucketObject[]; total: number; limit: number; offset: number };
  objectPreview?: any;
  onBucketInputChange: (field: string, value: string) => void;
  onBucketEditInputChange: (field: string, value: string) => void;
  onCreateBucket: (e: SubmitEvent) => void;
  onUpdateBucket: (e: SubmitEvent) => void;
  onDeleteBucket: () => void;
  onSelectBucket: (id: string) => void;
  onSelectObject: (key: string) => void;
  onUploadObject: (file: File) => void;
  onDeleteObject: (key: string) => void;
  onDownloadObject: (bucketId: string, key: string) => void;
  onObjectPageChange: (offset: number) => void;
  formatBytes: (bytes: number) => string;
  formatDate: (date?: string | null) => string;
}

export function StoragePage(props: StoragePageProps) {
  const [showCreateBucketModal, setShowCreateBucketModal] = createSignal(false);
  const [showUploadModal, setShowUploadModal] = createSignal(false);
  const [showObjectPreview, setShowObjectPreview] = createSignal(false);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [selectedFile, setSelectedFile] = createSignal<File | undefined>();

  const filteredBuckets = () => {
    const query = searchQuery().toLowerCase();
    if (!query || !props.buckets) return props.buckets || [];
    return props.buckets.filter(b => 
      b.name.toLowerCase().includes(query) || 
      b.slug.toLowerCase().includes(query)
    );
  };

  const handleCreateBucket = (e: SubmitEvent) => {
    props.onCreateBucket(e);
    setShowCreateBucketModal(false);
  };

  const handleUpload = () => {
    const file = selectedFile();
    if (file) {
      props.onUploadObject(file);
      setSelectedFile(undefined);
      setShowUploadModal(false);
    }
  };

  const getVisibilityBadge = (visibility: string) => {
    return visibility === 'public' ? 
      <Badge variant="success">Public</Badge> : 
      <Badge variant="secondary">Private</Badge>;
  };

  return (
    <div class="space-y-6">
      {/* Header */}
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold text-gray-900">Storage</h1>
          <p class="text-gray-600 mt-1">Manage buckets and objects</p>
        </div>
        <div class="flex gap-3">
          <Show when={props.selectedBucketID}>
            <Button variant="secondary" onClick={() => setShowUploadModal(true)}>
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload File
            </Button>
          </Show>
          <Button onClick={() => setShowCreateBucketModal(true)}>
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            New Bucket
          </Button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Buckets List */}
        <div class="lg:col-span-1 space-y-4">
          <Card class="p-4">
            <Input
              placeholder="Search buckets..."
              value={searchQuery()}
              onInput={(e) => setSearchQuery(e.currentTarget.value)}
              class="w-full"
            />
          </Card>

          <Card class="p-4">
            <h2 class="text-lg font-semibold mb-4">Buckets</h2>
            <Show
              when={filteredBuckets().length > 0}
              fallback={
                <EmptyState
                  icon={
                    <svg class="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 3h4m-4 4h4" />
                    </svg>
                  }
                  title="No buckets"
                  description="Create a bucket to store files"
                />
              }
            >
              <div class="space-y-2">
                <For each={filteredBuckets()}>
                  {(bucket) => (
                    <button
                      onClick={() => props.onSelectBucket(bucket.id)}
                      class={`w-full text-left p-3 rounded-lg border transition-all ${
                        props.selectedBucketID === bucket.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <div class="flex items-center justify-between mb-1">
                        <span class="font-medium text-gray-900">{bucket.name}</span>
                        {getVisibilityBadge(bucket.visibility)}
                      </div>
                      <p class="text-xs text-gray-600">{bucket.slug}</p>
                      <p class="text-xs text-gray-500 mt-1">
                        {bucket.object_count} objects • {props.formatBytes(bucket.size_bytes)}
                      </p>
                    </button>
                  )}
                </For>
              </div>
            </Show>
          </Card>

          {/* Bucket Settings */}
          <Show when={props.selectedBucketID && props.canUpdateBucket}>
            <Card class="p-4">
              <h2 class="text-lg font-semibold mb-4">Bucket Settings</h2>
              <form class="space-y-3" onSubmit={props.onUpdateBucket}>
                <Input
                  label="Name"
                  value={props.bucketEditInput.name}
                  onInput={(e) => props.onBucketEditInputChange('name', e.currentTarget.value)}
                  disabled={props.storagePending}
                />
                <Input
                  label="Slug"
                  value={props.bucketEditInput.slug}
                  onInput={(e) => props.onBucketEditInputChange('slug', e.currentTarget.value)}
                  disabled={props.storagePending}
                />
                <Select
                  label="Visibility"
                  value={props.bucketEditInput.visibility}
                  onChange={(e) => props.onBucketEditInputChange('visibility', e.currentTarget.value)}
                  disabled={props.storagePending}
                >
                  <option value="private">Private</option>
                  <option value="public">Public</option>
                </Select>
                <div class="flex flex-col gap-2">
                  <Button type="submit" variant="primary" size="sm" disabled={props.storagePending}>
                    Update
                  </Button>
                  <Button type="button" variant="danger" size="sm" onClick={props.onDeleteBucket} disabled={props.storagePending}>
                    Delete Bucket
                  </Button>
                </div>
              </form>
            </Card>
          </Show>
        </div>

        {/* Objects List */}
        <div class="lg:col-span-2">
          <Show
            when={props.selectedBucketID}
            fallback={
              <Card class="p-12">
                <EmptyState
                  icon={
                    <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 3h4m-4 4h4" />
                    </svg>
                  }
                  title="Select a bucket"
                  description="Choose a bucket from the left to view its contents"
                />
              </Card>
            }
          >
            <Card>
              <div class="p-4 border-b border-gray-200">
                <div class="flex items-center justify-between">
                  <h2 class="text-lg font-semibold">Objects</h2>
                  <Button size="sm" onClick={() => setShowUploadModal(true)}>
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload
                  </Button>
                </div>
              </div>

              <Show
                when={(props.objects?.length ?? 0) > 0}
                fallback={
                  <div class="p-12">
                    <EmptyState
                      icon={
                        <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                      }
                      title="No objects"
                      description="Upload files to this bucket"
                      action={
                        <Button onClick={() => setShowUploadModal(true)}>Upload File</Button>
                      }
                    />
                  </div>
                }
              >
                <Table>
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Size</th>
                      <th>Type</th>
                      <th>Modified</th>
                      <th class="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <For each={props.objects}>
                      {(object) => (
                        <tr class="hover:bg-gray-50">
                          <td>
                            <button
                              onClick={() => {
                                props.onSelectObject(object.object_key);
                                setShowObjectPreview(true);
                              }}
                              class="flex items-center gap-2 text-left hover:text-blue-600"
                            >
                              <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              <span class="font-medium">{object.object_key}</span>
                            </button>
                          </td>
                          <td class="text-sm text-gray-600">{props.formatBytes(object.size_bytes)}</td>
                          <td>
                            <Badge variant="secondary" class="text-xs">
                              {object.content_type || 'unknown'}
                            </Badge>
                          </td>
                          <td class="text-sm text-gray-600">{props.formatDate(object.updated_at)}</td>
                          <td class="text-right">
                            <div class="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => props.onDownloadObject(props.selectedBucketID!, object.object_key)}
                              >
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => props.onDeleteObject(object.object_key)}
                              >
                                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </Table>

                {/* Pagination */}
                <Show when={props.objectsPage && props.objectsPage.total > props.objectsPage.limit}>
                  <div class="p-4 border-t border-gray-200 flex items-center justify-between">
                    <p class="text-sm text-gray-600">
                      Showing {props.objectsPage!.offset + 1} to {Math.min(props.objectsPage!.offset + props.objectsPage!.limit, props.objectsPage!.total)} of {props.objectsPage!.total}
                    </p>
                    <div class="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={props.objectsPage!.offset === 0}
                        onClick={() => props.onObjectPageChange(Math.max(0, props.objectsPage!.offset - props.objectsPage!.limit))}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={props.objectsPage!.offset + props.objectsPage!.limit >= props.objectsPage!.total}
                        onClick={() => props.onObjectPageChange(props.objectsPage!.offset + props.objectsPage!.limit)}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </Show>
              </Show>
            </Card>
          </Show>
        </div>
      </div>

      <Show when={props.storageMessage}>
        <Message variant="neutral">{props.storageMessage}</Message>
      </Show>

      {/* Create Bucket Modal */}
      <Modal open={showCreateBucketModal()} onClose={() => setShowCreateBucketModal(false)} title="Create New Bucket">
        <form class="space-y-4" onSubmit={handleCreateBucket}>
          <Input
            label="Bucket Name"
            placeholder="my-bucket"
            value={props.bucketInput.name}
            onInput={(e) => {
              const name = e.currentTarget.value;
              props.onBucketInputChange('name', name);
              const slug = name.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
              props.onBucketInputChange('slug', slug);
            }}
            disabled={props.storagePending}
            required
          />
          <Input
            label="Bucket Slug"
            placeholder="my-bucket"
            value={props.bucketInput.slug}
            onInput={(e) => props.onBucketInputChange('slug', e.currentTarget.value)}
            disabled={props.storagePending}
            required
          />
          <Select
            label="Visibility"
            value={props.bucketInput.visibility}
            onChange={(e) => props.onBucketInputChange('visibility', e.currentTarget.value)}
            disabled={props.storagePending}
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
          </Select>
          <div class="flex gap-3 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowCreateBucketModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={props.storagePending}>
              {props.storagePending ? "Creating..." : "Create Bucket"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload Modal */}
      <Modal open={showUploadModal()} onClose={() => setShowUploadModal(false)} title="Upload File">
        <div class="space-y-4">
          <FileInput
            label="Select File"
            onChange={(file) => setSelectedFile(file)}
            accept="*/*"
          />
          <Show when={selectedFile()}>
            <div class="p-4 bg-gray-50 rounded-lg">
              <p class="text-sm font-medium text-gray-900">{selectedFile()!.name}</p>
              <p class="text-xs text-gray-600 mt-1">
                {props.formatBytes(selectedFile()!.size)} • {selectedFile()!.type || 'unknown type'}
              </p>
            </div>
          </Show>
          <div class="flex gap-3 justify-end pt-4">
            <Button type="button" variant="ghost" onClick={() => setShowUploadModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!selectedFile() || props.storagePending}
              onClick={handleUpload}
            >
              {props.storagePending ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Object Preview Modal */}
      <Modal 
        open={showObjectPreview()} 
        onClose={() => setShowObjectPreview(false)} 
        title="Object Preview"
        size="lg"
      >
        <Show when={props.objectPreview}>
          <div class="space-y-4">
            <Show when={props.objectPreview.kind === 'image'}>
              <img src={props.objectPreview.objectURL} alt="Preview" class="w-full rounded-lg" />
            </Show>
            <Show when={props.objectPreview.kind === 'text'}>
              <pre class="p-4 bg-gray-900 text-gray-100 rounded-lg overflow-x-auto text-sm">
                {props.objectPreview.text}
              </pre>
              <Show when={props.objectPreview.truncated}>
                <p class="text-sm text-yellow-600">Preview truncated. Download to view full content.</p>
              </Show>
            </Show>
            <Show when={props.objectPreview.kind === 'unsupported'}>
              <div class="text-center p-8">
                <p class="text-gray-600">{props.objectPreview.message}</p>
              </div>
            </Show>
          </div>
        </Show>
      </Modal>
    </div>
  );
}
