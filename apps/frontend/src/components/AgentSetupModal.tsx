import { Show, createEffect, createSignal } from "solid-js";
import { ProjectsService } from "@primora/api-client";
import { demoService } from "../lib/demo-mode";
import { buildAgentPrompt } from "../lib/agent-prompt";
import { errorMessage } from "../lib/api";
import { Modal, ModalFooter } from "./Modal";
import { IconCheck, IconCopy, IconKey, IconRefresh } from "./Icons";

export interface AgentSetupProject {
  id: string;
  name: string;
  slug: string;
}

interface AgentSetupModalProps {
  open: boolean;
  onClose: () => void;
  project?: AgentSetupProject;
  canManage: boolean;
  demoMode: boolean;
  /** called after a key is minted so the app can refetch keys/audit/overview */
  onKeyCreated?: () => void;
}

export function AgentSetupModal(props: AgentSetupModalProps) {
  const [prompt, setPrompt] = createSignal("");
  const [keyPrefix, setKeyPrefix] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");
  const [copied, setCopied] = createSignal(false);

  const generate = async () => {
    const project = props.project;
    if (!project || busy()) return;
    setBusy(true);
    setError("");
    setCopied(false);
    try {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "");
      const result = props.demoMode
        ? await demoService.createApiKey({ requestBody: { name: `agent-setup-${stamp}` } })
        : await ProjectsService.createApiKey({
            projectId: project.id,
            requestBody: { name: `agent-setup-${stamp}`, scopes: ["write"] },
          });
      setKeyPrefix(result.prefix);
      setPrompt(
        buildAgentPrompt({
          baseUrl: window.location.origin,
          projectId: project.id,
          projectName: project.name,
          projectSlug: project.slug,
          apiKey: result.secret,
        }),
      );
      props.onKeyCreated?.();
    } catch (e) {
      setError(errorMessage(e, "Could not create an API key"));
    } finally {
      setBusy(false);
    }
  };

  // Mint a fresh write-scoped key each time the modal opens — secrets are
  // shown once, so a cached prompt would carry a dead credential. The error
  // guard prevents a retry loop when minting fails; the user retries manually.
  createEffect(() => {
    if (props.open && props.project && props.canManage && !prompt() && !busy() && !error()) {
      void generate();
    }
    if (!props.open) {
      setPrompt("");
      setKeyPrefix("");
      setError("");
      setCopied(false);
    }
  });

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(prompt());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — the text is selectable instead */
    }
  };

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title="Set up with an AI agent"
      description="Paste this prompt into a coding agent (Claude Code, Cursor, Devin…) working in your repository. It instruments monitoring, registers your databases, and connects agent tooling — end to end."
      size="xl"
      error={error()}
    >
      <Show
        when={props.canManage}
        fallback={
          <p class="text-sm text-text-2">
            Generating credentials requires the project <strong>admin</strong> role. Ask a project
            admin to open this dialog and copy the prompt for you.
          </p>
        }
      >
        <Show
          when={prompt()}
          fallback={
            <div class="flex items-center gap-3 py-8 justify-center text-sm text-text-2">
              <Show when={busy()}>
                <span class="spinner" /> Creating a write-scoped API key…
              </Show>
              <Show when={!busy() && error()}>
                <button class="btn btn-secondary btn-sm" onClick={() => void generate()}>
                  Try again
                </button>
              </Show>
            </div>
          }
        >
          <div class="message message-warning mb-3">
            <div class="flex-1 min-w-0">
              <strong>Fresh key {keyPrefix()}… minted — shown only inside this prompt.</strong>{" "}
              It grants write access to this project; revoke it under Settings → API keys if the
              prompt leaks or the agent finishes.
            </div>
          </div>
          <pre
            class="text-xs rounded-lg border border-border bg-surface-2 p-4 overflow-y-auto"
            style="max-height: 22rem; white-space: pre-wrap; word-break: break-word"
          >
            {prompt()}
          </pre>
          <ModalFooter class="px-0 pb-0 pt-4" align="between">
            <button class="btn btn-ghost btn-sm" onClick={() => void generate()} disabled={busy()}>
              <IconRefresh class="w-4 h-4" />
              New key &amp; prompt
            </button>
            <div class="flex gap-2">
              <button class="btn btn-secondary" onClick={props.onClose}>
                <IconKey class="w-4 h-4" />
                Done
              </button>
              <button class="btn btn-primary" onClick={() => void copyPrompt()}>
                <Show when={!copied()} fallback={<><IconCheck class="w-4 h-4" /> Copied</>}>
                  <IconCopy class="w-4 h-4" /> Copy prompt
                </Show>
              </button>
            </div>
          </ModalFooter>
        </Show>
      </Show>
    </Modal>
  );
}
