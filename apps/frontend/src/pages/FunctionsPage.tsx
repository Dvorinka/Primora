import { For, Show, createEffect, createSignal } from "solid-js";
import {
  ApiError,
  CreateFunctionRequest,
  Function,
  FunctionsService,
  type FunctionRun,
} from "@primora/api-client";
import { Modal, ModalFooter } from "../components/Modal";
import { Input, Select, Textarea } from "../components/Input";
import { Badge } from "../components/Badge";
import { IconPlus, IconTrash, IconPlay, IconTerminal } from "../components/Icons";
import { errorMessage } from "../lib/api";

interface FunctionsPageProps {
  projectID?: string;
  canManage: boolean;
  demoMode: boolean;
}

const err = (e: unknown) => errorMessage(e, String(e));
const fmtTime = (ts?: string) => (ts ? new Date(ts).toLocaleString() : "—");

const STARTER_CODE = `// The payload arrives on stdin and as PRIMORA_PAYLOAD.
const input = JSON.parse(await new Response(Bun.stdin.stream()).text());
console.log(JSON.stringify({ echo: input }));
`;

const DEMO_FUNCTIONS: Function[] = [
  { id: "f1", name: "resize-image", runtime: Function.runtime.BUN, enabled: true, created_at: "", updated_at: "2026-09-20T09:00:00Z" },
  { id: "f2", name: "sync-billing", runtime: Function.runtime.BUN, enabled: false, created_at: "", updated_at: "2026-09-15T14:00:00Z" },
];

export function FunctionsPage(props: FunctionsPageProps) {
  const [functions, setFunctions] = createSignal<Function[]>([]);
  const [selected, setSelected] = createSignal<Function>();
  const [code, setCode] = createSignal("");
  const [codeDirty, setCodeDirty] = createSignal(false);
  const [runs, setRuns] = createSignal<FunctionRun[]>([]);
  const [payload, setPayload] = createSignal("{}");
  const [lastRun, setLastRun] = createSignal<FunctionRun>();
  const [message, setMessage] = createSignal("");
  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal<string>();
  const [showCreate, setShowCreate] = createSignal(false);
  const [createForm, setCreateForm] = createSignal({ name: "", runtime: "bun", event_pattern: "" });
  const [eventPattern, setEventPattern] = createSignal("");
  const [patternDirty, setPatternDirty] = createSignal(false);

  const refresh = async () => {
    if (!props.projectID) return;
    if (props.demoMode) {
      setFunctions(DEMO_FUNCTIONS);
      return;
    }
    try {
      const res = await FunctionsService.listFunctions({ projectId: props.projectID });
      setFunctions(res.items ?? []);
    } catch (e) {
      setError(err(e));
    }
  };

  const refreshRuns = async (fn: Function) => {
    if (!props.projectID || props.demoMode) return;
    try {
      const res = await FunctionsService.listFunctionRuns({ projectId: props.projectID, functionId: fn.id, limit: 20 });
      setRuns(res.items ?? []);
    } catch {
      /* run history is best-effort */
    }
  };

  const select = async (fn: Function) => {
    setSelected(fn);
    setCodeDirty(false);
    setEventPattern(fn.event_pattern ?? "");
    setPatternDirty(false);
    setLastRun(undefined);
    if (props.demoMode) {
      setCode(STARTER_CODE);
      return;
    }
    try {
      const res = await FunctionsService.getFunction({ projectId: props.projectID!, functionId: fn.id });
      setCode(res.code);
      await refreshRuns(fn);
    } catch (e) {
      setError(err(e));
    }
  };

  createEffect(() => void refresh());

  const create = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!props.projectID || props.demoMode) return;
    setBusy("create");
    try {
      const fn = await FunctionsService.createFunction({
        projectId: props.projectID,
        requestBody: {
          name: createForm().name,
          runtime: createForm().runtime as CreateFunctionRequest.runtime,
          code: STARTER_CODE,
          event_pattern: createForm().event_pattern.trim() || undefined,
        },
      });
      setShowCreate(false);
      setCreateForm({ name: "", runtime: "bun", event_pattern: "" });
      setMessage(`Function "${fn.name}" created.`);
      await refresh();
      await select(fn);
    } catch (e2) {
      setError(err(e2));
    } finally {
      setBusy(undefined);
    }
  };

  const save = async () => {
    const fn = selected();
    if (!fn || !props.projectID || props.demoMode) return;
    setBusy("save");
    try {
      await FunctionsService.updateFunction({
        projectId: props.projectID,
        functionId: fn.id,
        requestBody: { code: code(), event_pattern: eventPattern().trim() },
      });
      setCodeDirty(false);
      setPatternDirty(false);
      setSelected({ ...fn, event_pattern: eventPattern().trim() });
      setFunctions((list) => list.map((f) => (f.id === fn.id ? { ...f, event_pattern: eventPattern().trim() } : f)));
      setMessage(`Saved "${fn.name}".`);
    } catch (e) {
      setError(err(e));
    } finally {
      setBusy(undefined);
    }
  };

  const invoke = async () => {
    const fn = selected();
    if (!fn || !props.projectID || props.demoMode) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload() || "{}");
    } catch {
      setError("Payload is not valid JSON.");
      return;
    }
    setBusy("invoke");
    setError("");
    try {
      const run = await FunctionsService.invokeFunction({
        projectId: props.projectID,
        functionId: fn.id,
        requestBody: { payload: parsed },
      });
      setLastRun(run);
    } catch (e) {
      // 502 still returns a FunctionRun body — the run is recorded either way.
      if (e instanceof ApiError && e.body && typeof e.body === "object" && "status" in e.body) {
        setLastRun(e.body as FunctionRun);
      } else {
        setError(err(e));
      }
    } finally {
      setBusy(undefined);
      await refreshRuns(fn);
    }
  };

  const toggleEnabled = async (fn: Function) => {
    if (!props.projectID || props.demoMode) return;
    try {
      await FunctionsService.updateFunction({ projectId: props.projectID, functionId: fn.id, requestBody: { enabled: !fn.enabled } });
      await refresh();
      if (selected()?.id === fn.id) setSelected({ ...fn, enabled: !fn.enabled });
    } catch (e) {
      setError(err(e));
    }
  };

  const remove = async (fn: Function) => {
    if (!props.projectID || props.demoMode) return;
    setBusy(fn.id);
    try {
      await FunctionsService.deleteFunction({ projectId: props.projectID, functionId: fn.id });
      if (selected()?.id === fn.id) setSelected(undefined);
      setMessage(`Deleted "${fn.name}".`);
      await refresh();
    } catch (e) {
      setError(err(e));
    } finally {
      setBusy(undefined);
    }
  };

  const runBadge = (status: string) =>
    status === "success" ? "success" : status === "timeout" ? "warning" : "error";

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Functions</h1>
          <p class="page-description">
            Serverless JS/TS executed by a runtime on this instance (<code>bun</code> or <code>deno</code>).
            The payload arrives on stdin and as <code>PRIMORA_PAYLOAD</code>; stdout is captured per run.
          </p>
        </div>
        <Show when={props.canManage && !props.demoMode}>
          <button class="btn btn-primary" onClick={() => setShowCreate(true)}>
            <IconPlus class="w-4 h-4" /> New function
          </button>
        </Show>
      </div>

      <Show when={message()}>
        <div class="message message-success" onClick={() => setMessage("")}>{message()}</div>
      </Show>
      <Show when={error()}>
        <div class="message message-error" onClick={() => setError("")}>{error()}</div>
      </Show>

      <Show
        when={!props.projectID && !props.demoMode ? false : true}
        fallback={<div class="card card-flush empty-state">Select a project to manage functions.</div>}
      >
        <Show
          when={functions().length > 0}
          fallback={
            <div class="card card-flush empty-state">
              <IconTerminal class="w-8 h-8" />
              <p>No functions yet.</p>
              <p class="text-text-3" style="font-size:0.85rem">
                Functions run your code on demand — invoke them from the dashboard, the API, or wire them to schedules and hooks.
              </p>
            </div>
          }
        >
          <div class="card card-flush">
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Runtime</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th style="width:1%"> </th>
                  </tr>
                </thead>
                <tbody>
                  <For each={functions()}>
                    {(fn) => (
                      <tr
                        style={selected()?.id === fn.id ? "background:var(--bg-3)" : "cursor:pointer"}
                        onClick={() => void select(fn)}
                      >
                        <td class="font-medium text-text-1">{fn.name}</td>
                        <td><Badge variant="neutral">{fn.runtime}</Badge></td>
                        <td>
                          <Badge variant={fn.enabled ? "success" : "neutral"}>{fn.enabled ? "enabled" : "disabled"}</Badge>
                        </td>
                        <td class="text-text-3">{fmtTime(fn.updated_at)}</td>
                        <td>
                          <Show when={props.canManage && !props.demoMode}>
                            <div class="flex gap-1">
                              <button
                                class="btn btn-ghost btn-sm"
                                title={fn.enabled ? "Disable" : "Enable"}
                                onClick={(e) => { e.stopPropagation(); void toggleEnabled(fn); }}
                              >
                                {fn.enabled ? "⏸" : "▶"}
                              </button>
                              <button
                                class="btn btn-ghost btn-sm text-danger"
                                disabled={busy() === fn.id}
                                onClick={(e) => { e.stopPropagation(); void remove(fn); }}
                              >
                                <IconTrash class="w-4 h-4" />
                              </button>
                            </div>
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
      </Show>

      <Show when={selected()}>
        {(fn) => (
          <div class="card card-flush" style="margin-top:1.25rem">
            <div class="card-header" style="padding:1.25rem 1.25rem 1rem;margin-bottom:0;border-bottom:1px solid var(--border)">
              <div class="flex items-center justify-between" style="width:100%">
                <span class="card-header-title">
                  {fn().name} <Badge variant="neutral">{fn().runtime}</Badge>
                  <Show when={fn().event_pattern}>
                    <Badge variant="warning">on {fn().event_pattern}</Badge>
                  </Show>
                </span>
                <div class="flex gap-2 items-center">
                  <Show when={props.canManage && !props.demoMode}>
                    <button class="btn btn-secondary btn-sm" disabled={(!codeDirty() && !patternDirty()) || busy() === "save"} onClick={() => void save()}>
                      {busy() === "save" ? "Saving…" : "Save"}
                    </button>
                    <button class="btn btn-primary btn-sm" disabled={busy() === "invoke" || !fn().enabled} onClick={() => void invoke()}>
                      <IconPlay class="w-3.5 h-3.5" /> {busy() === "invoke" ? "Running…" : "Invoke"}
                    </button>
                  </Show>
                </div>
              </div>
            </div>
            <div style="padding:1rem 1.25rem 0">
              <Input
                label="Event trigger (optional)"
                placeholder='document.*  ·  *  ·  deploy.marker'
                value={eventPattern()}
                onInput={(e) => { setEventPattern(e.currentTarget.value); setPatternDirty(true); }}
                disabled={!props.canManage || props.demoMode}
              />
              <p class="text-text-3" style="font-size:0.78rem;margin-top:0.3rem">
                Runs whenever a project event matching this pattern is published — e.g.{" "}
                <code>document.*</code>, <code>object.created</code>, or <code>*</code> for all. The
                function receives {"{ event, data, occurred_at }"}. Schedules and inbound hooks can
                also target functions.
              </p>
            </div>
            <div style="padding:1rem 1.25rem;display:grid;gap:1rem;grid-template-columns:1fr 1fr">
              <div>
                <label class="text-text-3" style="font-size:0.8rem;display:block;margin-bottom:0.35rem">Code</label>
                <Textarea
                  rows={14}
                  value={code()}
                  onInput={(e) => { setCode(e.currentTarget.value); setCodeDirty(true); }}
                  disabled={!props.canManage || props.demoMode}
                  style="font-family:var(--font-mono);font-size:0.8rem"
                />
              </div>
              <div>
                <label class="text-text-3" style="font-size:0.8rem;display:block;margin-bottom:0.35rem">Payload (JSON)</label>
                <Textarea
                  rows={5}
                  value={payload()}
                  onInput={(e) => setPayload(e.currentTarget.value)}
                  disabled={!props.canManage || props.demoMode}
                  style="font-family:var(--font-mono);font-size:0.8rem"
                />
                <Show when={lastRun()}>
                  {(run) => (
                    <div style="margin-top:0.75rem">
                      <div class="flex items-center gap-2" style="margin-bottom:0.35rem">
                        <Badge variant={runBadge(run().status)}>{run().status}</Badge>
                        <span class="text-text-3" style="font-size:0.8rem">
                          {run().duration_ms} ms{run().exit_code != null ? ` · exit ${run().exit_code}` : ""}
                        </span>
                      </div>
                      <Show when={run().stdout}>
                        <pre class="text-text-2" style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:0.6rem;font-size:0.78rem;max-height:10rem;overflow:auto;white-space:pre-wrap">{run().stdout}</pre>
                      </Show>
                      <Show when={run().stderr}>
                        <pre class="text-danger" style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:0.6rem;font-size:0.78rem;max-height:10rem;overflow:auto;white-space:pre-wrap">{run().stderr}</pre>
                      </Show>
                    </div>
                  )}
                </Show>
              </div>
            </div>
          </div>
        )}
      </Show>

      <Show when={selected() && runs().length > 0}>
        <div class="card card-flush" style="margin-top:1.25rem">
          <div class="card-header" style="padding:1.25rem 1.25rem 1rem;margin-bottom:0;border-bottom:1px solid var(--border)">
            <span class="card-header-title">Recent runs</span>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Trigger</th>
                  <th>Duration</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                <For each={runs()}>
                  {(run) => (
                    <tr>
                      <td><Badge variant={runBadge(run.status)}>{run.status}</Badge></td>
                      <td class="text-text-2">{run.trigger}</td>
                      <td class="text-text-3">{run.duration_ms} ms</td>
                      <td class="text-text-3">{fmtTime(run.created_at)}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      <Modal error={error()} open={showCreate()} onClose={() => setShowCreate(false)} title="New function">
        <form onSubmit={create}>
          <div class="modal-body">
            <Input
              label="Name"
              placeholder="resize-image"
              value={createForm().name}
              onInput={(e) => setCreateForm((f) => ({ ...f, name: e.currentTarget.value }))}
              required
            />
            <Select
              label="Runtime"
              value={createForm().runtime}
              onChange={(e) => setCreateForm((f) => ({ ...f, runtime: e.currentTarget.value }))}
            >
              <option value="bun">bun</option>
              <option value="deno">deno</option>
            </Select>
            <Input
              label="Event trigger (optional)"
              placeholder="document.*"
              value={createForm().event_pattern}
              onInput={(e) => setCreateForm((f) => ({ ...f, event_pattern: e.currentTarget.value }))}
            />
            <p class="text-text-3" style="font-size:0.8rem">
              Starts from a stdin-echo template — edit the code after creating.
            </p>
          </div>
          <ModalFooter>
            <button type="button" class="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" class="btn btn-primary" disabled={busy() === "create" || !createForm().name.trim()}>
              {busy() === "create" ? "Creating…" : "Create function"}
            </button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
