import { For, Show, createMemo, createSignal } from "solid-js";
import type {
  Bucket,
  BucketObject,
  BucketObjectListResponse,
} from "@primora/api-client";
import { Badge } from "../components/Badge";
import { Modal, ModalFooter } from "../components/Modal";
import { Input, Select } from "../components/Input";
import {
  IconPlus,
  IconStorage,
  IconFile,
  IconUpload,
  IconDownload,
  IconTrash,
  IconCopy,
  IconEdit,
  IconChevronRight,
  IconEye,
  IconLink,
} from "../components/Icons";

type ObjectPreview =
  | { kind: "image"; objectURL: string }
  | { kind: "text"; text: string; truncated: boolean }
  | { kind: "unsupported"; message: string };

interface BucketInput {
  name: string;
  slug: string;
  visibility: string;
}

interface StoragePageProps {
  buckets?: Bucket[];
  objects: BucketObject[];
  selectedBucketID?: string;
  selectedObjectKey?: string;
  bucketInput: BucketInput;
  bucketEditInput: BucketInput;
  storageMessage: string;
  storagePending: boolean;
  canUpdateBucket: boolean;
  objectsPage?: BucketObjectListResponse;
  objectPreview?: ObjectPreview;
  previewLoading?: boolean;
  renameObjectKey: string;
  moveDestinationBucketID: string;
  onBucketInputChange: (field: keyof BucketInput, value: string) => void;
  onBucketEditInputChange: (field: keyof BucketInput, value: string) => void;
  onCreateBucket: () => void;
  onUpdateBucket: () => void;
  onDeleteBucket: () => void;
  onSelectBucket: (id: string) => void;
  onSelectObject: (key: string) => void;
  onUploadObject: (file: File) => void;
  onDeleteObject: (key: string) => void;
  onDownloadObject: (bucketId: string, key: string) => void;
  onCopyObjectURL: (object: BucketObject) => void;
  onMoveObject: () => void;
  onCopyObject: () => void;
  onRenameObjectKeyChange: (value: string) => void;
  onMoveDestinationChange: (value: string) => void;
  onObjectPageChange: (offset: number) => void;
  formatBytes: (bytes: number) => string;
  formatDate: (value?: string | null) => string;
}

const OBJECTS_PAGE_SIZE = 25;

export function StoragePage(props: StoragePageProps) {
  const [createOpen, setCreateOpen] = createSignal(false);
  const [bucketSettingsOpen, setBucketSettingsOpen] = createSignal(false);
  const [objectSearch, setObjectSearch] = createSignal("");
  const [dragging, setDragging] = createSignal(false);

  const activeBucket = createMemo(() =>
    (props.buckets ?? []).find((b) => b.id === props.selectedBucketID),
  );

  const selectedObject = createMemo(() =>
    props.objects.find((o) => o.object_key === props.selectedObjectKey),
  );

  const filteredObjects = createMemo(() => {
    const q = objectSearch().toLowerCase();
    if (!q) return props.objects;
    return props.objects.filter((o) => o.object_key.toLowerCase().includes(q));
  });

  const pageMeta = () => props.objectsPage;
  const currentPage = () => Math.floor((pageMeta()?.offset ?? 0) / OBJECTS_PAGE_SIZE) + 1;
  const totalPages = () =>
    Math.max(1, Math.ceil((pageMeta()?.total ?? props.objects.length) / OBJECTS_PAGE_SIZE));

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (file) props.onUploadObject(file);
  };

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Storage</h1>
          <p class="page-description">
            Buckets hold files on your own filesystem — no external object store required.
          </p>
        </div>
        <div class="page-actions">
          <button
            class="btn btn-primary"
            onClick={() => setCreateOpen(true)}
            disabled={!props.canUpdateBucket}
          >
            <IconPlus class="w-4 h-4" />
            New bucket
          </button>
        </div>
      </div>

      <Show when={props.storageMessage}>
        <div class="message message-neutral">{props.storageMessage}</div>
      </Show>

      <div class="storage-grid">
        {/* Bucket list */}
        <div class="card card-flush">
          <div
            class="card-header"
            style="padding:1rem 1rem 0.75rem;margin-bottom:0;border-bottom:1px solid var(--border)"
          >
            <span class="card-header-title">Buckets</span>
          </div>
          <div class="p-1.5">
            <For
              each={props.buckets ?? []}
              fallback={
                <div class="p-4 text-center">
                  <p class="text-xs text-text-3">No buckets yet</p>
                </div>
              }
            >
              {(bucket) => (
                <button
                  class={`nav-item w-full ${bucket.id === props.selectedBucketID ? "active" : ""}`}
                  onClick={() => props.onSelectBucket(bucket.id)}
                >
                  <IconStorage class="w-4 h-4" />
                  <span class="flex-1 truncate">{bucket.name}</span>
                  <Badge variant={bucket.visibility === "public" ? "success" : "neutral"}>
                    {bucket.visibility}
                  </Badge>
                </button>
              )}
            </For>
          </div>
        </div>

        {/* Objects */}
        <div class="card card-flush" style="min-height:28rem">
          <Show
            when={activeBucket()}
            fallback={
              <div class="empty-state" style="min-height:28rem">
                <div class="empty-state-icon">
                  <IconStorage class="w-5 h-5" />
                </div>
                <p class="empty-state-title">Select a bucket</p>
                <p class="empty-state-description">
                  Choose a bucket on the left to browse and manage its objects.
                </p>
              </div>
            }
          >
            <div
              class="card-header"
              style="padding:1rem 1.25rem;margin-bottom:0;border-bottom:1px solid var(--border)"
            >
              <div class="flex items-center justify-between gap-3 w-full flex-wrap">
                <div class="min-w-0">
                  <div class="flex items-center gap-2">
                    <span class="card-header-title">{activeBucket()!.name}</span>
                    <Badge variant={activeBucket()!.visibility === "public" ? "success" : "neutral"}>
                      {activeBucket()!.visibility}
                    </Badge>
                  </div>
                  <span class="card-header-description">
                    <code>{activeBucket()!.slug}</code> · {pageMeta()?.total ?? props.objects.length} objects
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="icon-btn"
                    title="Bucket settings"
                    onClick={() => setBucketSettingsOpen(true)}
                    disabled={!props.canUpdateBucket}
                  >
                    <IconEdit class="w-4 h-4" />
                  </button>
                  <label class="btn btn-secondary btn-sm" style="cursor:pointer">
                    <IconUpload class="w-3.5 h-3.5" />
                    Upload
                    <input
                      type="file"
                      class="hidden"
                      onChange={(e) => handleFiles(e.currentTarget.files)}
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* drop zone */}
            <div
              class={`mx-4 mt-3 rounded-lg border border-dashed px-4 py-3 text-center text-xs transition-colors ${
                dragging() ? "text-accent" : "text-text-3"
              }`}
              style={`border-color:${dragging() ? "var(--accent)" : "var(--border-strong)"};background:${dragging() ? "var(--accent-muted)" : "transparent"}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                handleFiles(e.dataTransfer?.files ?? null);
              }}
            >
              Drag & drop a file here to upload it to <code>{activeBucket()!.slug}</code>
            </div>

            <div class="px-4 pt-3">
              <Input
                placeholder="Filter objects…"
                class="input-sm"
                value={objectSearch()}
                onInput={(e) => setObjectSearch(e.currentTarget.value)}
              />
            </div>

            <div class="table-container mt-1">
              <table class="table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th style="width:1%">Type</th>
                    <th style="width:1%">Size</th>
                    <th style="width:1%">Created</th>
                    <th style="width:1%" />
                  </tr>
                </thead>
                <tbody>
                  <For
                    each={filteredObjects()}
                    fallback={
                      <tr>
                        <td colspan={5} class="py-10 text-center text-text-3">
                          This bucket is empty. Upload your first object.
                        </td>
                      </tr>
                    }
                  >
                    {(object) => (
                      <tr
                        class={`clickable ${object.object_key === props.selectedObjectKey ? "bg-surface-2" : ""}`}
                        onClick={() => props.onSelectObject(object.object_key)}
                      >
                        <td>
                          <div class="flex items-center gap-2.5">
                            <IconFile class="w-4 h-4 text-text-3 flex-shrink-0" />
                            <span class="font-mono text-xs text-text-1 truncate" style="max-width:22rem">
                              {object.object_key}
                            </span>
                          </div>
                        </td>
                        <td class="text-xs text-text-3 whitespace-nowrap">{object.content_type}</td>
                        <td class="text-xs text-text-2 whitespace-nowrap">{props.formatBytes(object.size_bytes)}</td>
                        <td class="text-xs text-text-3 whitespace-nowrap">{props.formatDate(object.created_at)}</td>
                        <td>
                          <IconChevronRight class="w-4 h-4 text-text-3" />
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>

            <Show when={totalPages() > 1}>
              <div class="flex items-center justify-between px-4 py-3 border-t" style="border-color:var(--border)">
                <span class="text-xs text-text-3">
                  Page {currentPage()} of {totalPages()}
                </span>
                <div class="flex gap-1">
                  <button
                    class="btn btn-ghost btn-sm"
                    disabled={currentPage() <= 1}
                    onClick={() => props.onObjectPageChange((currentPage() - 2) * OBJECTS_PAGE_SIZE)}
                  >
                    Previous
                  </button>
                  <button
                    class="btn btn-ghost btn-sm"
                    disabled={!pageMeta()?.has_more}
                    onClick={() => props.onObjectPageChange(currentPage() * OBJECTS_PAGE_SIZE)}
                  >
                    Next
                  </button>
                </div>
              </div>
            </Show>
          </Show>
        </div>
      </div>

      {/* Object inspector */}
      <Show when={selectedObject()}>
        <div class="card">
          <div class="card-header">
            <div class="flex items-center justify-between w-full gap-3 flex-wrap">
              <div class="min-w-0">
                <div class="card-header-title font-mono" style="font-size:0.875rem">
                  {selectedObject()!.object_key}
                </div>
                <div class="card-header-description">
                  {selectedObject()!.content_type} · {props.formatBytes(selectedObject()!.size_bytes)} ·{" "}
                  {props.formatDate(selectedObject()!.created_at)}
                </div>
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="btn btn-secondary btn-sm"
                  onClick={() =>
                    props.onDownloadObject(props.selectedBucketID!, selectedObject()!.object_key)
                  }
                >
                  <IconDownload class="w-3.5 h-3.5" />
                  Download
                </button>
                <Show when={activeBucket()?.visibility === "public"}>
                  <button
                    class="btn btn-secondary btn-sm"
                    onClick={() => props.onCopyObjectURL(selectedObject()!)}
                  >
                    <IconLink class="w-3.5 h-3.5" />
                    Copy URL
                  </button>
                </Show>
                <button
                  class="btn btn-danger btn-sm"
                  onClick={() => props.onDeleteObject(selectedObject()!.object_key)}
                  disabled={!props.canUpdateBucket}
                >
                  <IconTrash class="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            {/* preview */}
            <div>
              <p class="label">Preview</p>
              <div class="card card-flush flex items-center justify-center" style="min-height:12rem;background:var(--bg-panel)">
                <Show
                  when={!props.previewLoading}
                  fallback={<span class="spinner" />}
                >
                  <Show
                    when={props.objectPreview?.kind === "image"}
                    fallback={
                      <Show
                        when={props.objectPreview?.kind === "text"}
                        fallback={
                          <div class="p-6 text-center">
                            <IconEye class="w-6 h-6 mx-auto text-text-3 mb-2" />
                            <p class="text-xs text-text-3">
                              {props.objectPreview?.kind === "unsupported"
                                ? props.objectPreview.message
                                : "Select an object to preview"}
                            </p>
                          </div>
                        }
                      >
                        <pre class="code-block w-full border-0" style="max-height:20rem;overflow:auto;border-radius:0">
                          {(props.objectPreview as { kind: "text"; text: string }).text}
                        </pre>
                      </Show>
                    }
                  >
                    <img
                      src={(props.objectPreview as { kind: "image"; objectURL: string }).objectURL}
                      alt={selectedObject()!.object_key}
                      style="max-height:20rem;max-width:100%;object-fit:contain"
                    />
                  </Show>
                </Show>
              </div>
            </div>

            {/* move/copy */}
            <Show when={props.canUpdateBucket}>
              <div>
                <p class="label">Rename, move or copy</p>
                <div class="space-y-3">
                  <Input
                    label="New object key"
                    value={props.renameObjectKey}
                    onInput={(e) => props.onRenameObjectKeyChange(e.currentTarget.value)}
                  />
                  <Select
                    label="Destination bucket"
                    value={props.moveDestinationBucketID}
                    onChange={(e) => props.onMoveDestinationChange(e.currentTarget.value)}
                  >
                    <For each={props.buckets ?? []}>
                      {(bucket) => (
                        <option value={bucket.id}>{bucket.name}</option>
                      )}
                    </For>
                  </Select>
                  <div class="flex gap-2">
                    <button class="btn btn-secondary btn-sm" onClick={props.onMoveObject}>
                      Move / rename
                    </button>
                    <button class="btn btn-ghost btn-sm" onClick={props.onCopyObject}>
                      <IconCopy class="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      {/* Create bucket modal */}
      <Modal
        open={createOpen()}
        onClose={() => setCreateOpen(false)}
        title="Create bucket"
        description="Buckets are folders on the server's filesystem with metadata in Postgres."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onCreateBucket();
            setCreateOpen(false);
          }}
          class="space-y-4"
        >
          <Input
            label="Bucket name"
            placeholder="User avatars"
            value={props.bucketInput.name}
            onInput={(e) => props.onBucketInputChange("name", e.currentTarget.value)}
            required
          />
          <Input
            label="Slug"
            placeholder="avatars"
            value={props.bucketInput.slug}
            onInput={(e) => props.onBucketInputChange("slug", e.currentTarget.value)}
            required
          />
          <Select
            label="Visibility"
            value={props.bucketInput.visibility}
            onChange={(e) => props.onBucketInputChange("visibility", e.currentTarget.value)}
          >
            <option value="private">private — authenticated download only</option>
            <option value="public">public — anyone with the URL can download</option>
          </Select>
          <ModalFooter>
            <button type="button" class="btn btn-ghost" onClick={() => setCreateOpen(false)}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={props.storagePending}>
              Create bucket
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Bucket settings modal */}
      <Modal
        open={bucketSettingsOpen()}
        onClose={() => setBucketSettingsOpen(false)}
        title="Bucket settings"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            props.onUpdateBucket();
            setBucketSettingsOpen(false);
          }}
          class="space-y-4"
        >
          <Input
            label="Bucket name"
            value={props.bucketEditInput.name}
            onInput={(e) => props.onBucketEditInputChange("name", e.currentTarget.value)}
            required
          />
          <Input
            label="Slug"
            value={props.bucketEditInput.slug}
            onInput={(e) => props.onBucketEditInputChange("slug", e.currentTarget.value)}
            required
          />
          <Select
            label="Visibility"
            value={props.bucketEditInput.visibility}
            onChange={(e) => props.onBucketEditInputChange("visibility", e.currentTarget.value)}
          >
            <option value="private">private</option>
            <option value="public">public</option>
          </Select>
          <ModalFooter align="between">
            <button
              type="button"
              class="btn btn-danger"
              onClick={() => {
                setBucketSettingsOpen(false);
                props.onDeleteBucket();
              }}
            >
              Delete bucket
            </button>
            <div class="flex gap-2">
              <button type="button" class="btn btn-ghost" onClick={() => setBucketSettingsOpen(false)}>
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" disabled={props.storagePending}>
                Save
              </button>
            </div>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
