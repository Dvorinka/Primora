import { For, Show, createEffect, createSignal, onCleanup, onMount } from "solid-js";
import {
  SecretsService,
  type ProjectSecret,
} from "@primora/api-client";
import { Modal } from "../components/Modal";
import { Input, Select, Textarea } from "../components/Input";
import { IconPlus, IconTrash, IconCopy, IconRefresh, IconKey } from "../components/Icons";

interface VaultPageProps {
  projectID?: string;
  canManage: boolean;
  demoMode: boolean;
}

const err = (e: unknown) => (e instanceof Error ? e.message : String(e));
const fmtTime = (ts?: string) => (ts ? new Date(ts).toLocaleString() : "—");

const DEMO_SECRETS: ProjectSecret[] = [
  { id: "d1", name: "STRIPE_SECRET", url: "https://dashboard.stripe.com", notes: "prod", created_at: "", updated_at: "2026-09-18T10:00:00Z" },
  { id: "d2", name: "SLACK_WEBHOOK", url: "https://hooks.slack.com", notes: "alerts channel", created_at: "", updated_at: "2026-09-10T08:00:00Z" },
];

// Inside the Tauri shell, __TAURI__ is injected into every webview — the same
// IPC commands the dedicated vault window uses. Absent in a plain browser.
const tauri = () =>
  (window as unknown as {
    __TAURI__?: { core: { invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown> } };
  }).__TAURI__;

interface LocalSecret {
  name: string;
  url: string | null;
  notes: string | null;
  updated_at: string;
}
interface LocalStatus {
  exists: boolean;
  unlocked: boolean;
  expires_at: number | null;
  secrets: number | null;
  path: string;
}

export function VaultPage(props: VaultPageProps) {
  const [secrets, setSecrets] = createSignal<ProjectSecret[]>([]);
  const [message, setMessage] = createSignal("");
  const [error, setError] = createSignal("");
  const [busy, setBusy] = createSignal<string>();
  const [showCreate, setShowCreate] = createSignal(false);
  const [showImport, setShowImport] = createSignal(false);
  const [form, setForm] = createSignal({ name: "", value: "", url: "", notes: "" });
  const [importText, setImportText] = createSignal("");

  const [localStatus, setLocalStatus] = createSignal<LocalStatus>();
  const [localSecrets, setLocalSecrets] = createSignal<LocalSecret[]>([]);
  const [localErr, setLocalErr] = createSignal("");
  const [localPw, setLocalPw] = createSignal("");
  const [localTtl, setLocalTtl] = createSignal("900");
  const [now, setNow] = createSignal(Math.floor(Date.now() / 1000));
  const timer = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
  onCleanup(() => clearInterval(timer));

  const refresh = async () => {
    if (!props.projectID) return;
    if (props.demoMode) {
      setSecrets(DEMO_SECRETS);
      return;
    }
    try {
      const res = await SecretsService.listProjectSecrets({ projectId: props.projectID });
      setSecrets(res.items);
    } catch (e) {
      setError(err(e));
    }
  };

  const refreshLocal = async () => {
    const t = tauri();
    if (!t) return;
    try {
      const st = (await t.core.invoke("vault_status")) as LocalStatus;
      setLocalStatus(st);
      setLocalSecrets(st.unlocked ? ((await t.core.invoke("vault_secrets")) as LocalSecret[]) : []);
    } catch (e) {
      setLocalErr(err(e));
    }
  };

  onMount(() => {
    void refresh();
    void refreshLocal();
  });
  createEffect(() => void refresh());

  const run = async (key: string, task: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    setError("");
    setMessage("");
    try {
      await task();
      if (done) setMessage(done);
      await refresh();
    } catch (e) {
      setError(err(e));
    } finally {
      setBusy(undefined);
    }
  };

  const runLocal = async (task: () => Promise<unknown>) => {
    setLocalErr("");
    try {
      await task();
    } catch (e) {
      setLocalErr(err(e));
    } finally {
      await refreshLocal();
    }
  };

  const copy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMessage(`${label} copied to clipboard`);
    } catch {
      setError("Clipboard unavailable — check browser permissions.");
    }
  };

  const reveal = (name: string) =>
    run(`reveal-${name}`, async () => {
      if (props.demoMode) {
        await copy(`demo-${name.toLowerCase()}`, name);
        return;
      }
      const res = await SecretsService.revealProjectSecret({ projectId: props.projectID!, name });
      await copy(res.value, name);
    });

  const revealLocal = (name: string) =>
    runLocal(async () => {
      const value = (await tauri()!.core.invoke("vault_reveal", { name })) as string;
      await copy(value.trimEnd(), name);
    });

  const createSecret = (e: Event) => {
    e.preventDefault();
    const f = form();
    void run("create", async () => {
      if (props.demoMode) {
        setSecrets([...secrets(), { id: `d${Date.now()}`, name: f.name, url: f.url, notes: f.notes, created_at: "", updated_at: new Date().toISOString() }]);
        return;
      }
      await SecretsService.setProjectSecret({
        projectId: props.projectID!,
        name: f.name.trim(),
        requestBody: { value: f.value, url: f.url.trim() || undefined, notes: f.notes.trim() || undefined },
      });
      setShowCreate(false);
      setForm({ name: "", value: "", url: "", notes: "" });
    }, `Secret ${f.name} stored`);
  };

  const removeSecret = (name: string) =>
    run(`del-${name}`, async () => {
      if (props.demoMode) {
        setSecrets(secrets().filter((s) => s.name !== name));
        return;
      }
      await SecretsService.deleteProjectSecret({ projectId: props.projectID!, name });
    }, `Secret ${name} deleted`);

  const importEnv = (e: Event) => {
    e.preventDefault();
    const pairs = importText()
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim().replace(/^export\s+/, ""), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")] as const;
      })
      .filter(([k]) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(k));
    if (!pairs.length) {
      setError("No valid KEY=value lines found.");
      return;
    }
    void run("import", async () => {
      for (const [name, value] of pairs) {
        await SecretsService.setProjectSecret({ projectId: props.projectID!, name, requestBody: { value } });
      }
      setShowImport(false);
      setImportText("");
    }, `Imported ${pairs.length} secret${pairs.length === 1 ? "" : "s"}`);
  };

  const localRemaining = () => {
    const st = localStatus();
    return st?.expires_at ? Math.max(0, st.expires_at - now()) : 0;
  };

  return (
    <div class="page">
      <div class="page-header">
        <div class="flex-1 min-w-0">
          <h1 class="page-title">Vault</h1>
          <p class="page-description">
            Encrypted project secrets — reference them in job payloads as <code>secret://NAME</code>, resolved at
            delivery. Values are never included in lists.
          </p>
        </div>
        <div class="flex gap-2 flex-wrap">
          <Show when={props.canManage}>
            <button class="btn btn-ghost btn-sm" onClick={() => setShowImport(true)}>Import .env</button>
            <button class="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
              <IconPlus class="w-4 h-4" /> New secret
            </button>
          </Show>
          <button class="btn btn-ghost btn-sm" onClick={() => void refresh()} title="Refresh">
            <IconRefresh class="w-4 h-4" />
          </button>
        </div>
      </div>

      <Show when={message()}><div class="message message-success mb-4">{message()}</div></Show>
      <Show when={error()}><div class="message message-error mb-4">{error()}</div></Show>

      <div class="card card-flush">
        <div class="card-header">
          <div class="flex-1">
            <div class="card-header-title">Project secrets</div>
            <div class="card-header-description">
              Stored AES-256-GCM encrypted in this deployment. Copy goes to your clipboard and is audit-logged.
            </div>
          </div>
        </div>
        <Show
          when={secrets().length > 0}
          fallback={<p class="text-text-2 text-sm p-4">No secrets yet — create one or import a .env file.</p>}
        >
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>URL</th>
                  <th>Notes</th>
                  <th>Updated</th>
                  <th class="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <For each={secrets()}>
                  {(s) => (
                    <tr>
                      <td class="font-mono text-sm">{s.name}</td>
                      <td class="text-sm">{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.url.replace(/^https?:\/\//, "")}</a> : "—"}</td>
                      <td class="text-sm text-text-2" title={s.notes}>{s.notes || "—"}</td>
                      <td class="text-sm text-text-2">{fmtTime(s.updated_at)}</td>
                      <td>
                        <div class="flex gap-2 justify-end">
                          <button class="btn btn-ghost btn-sm" title="Copy value (audit-logged)" onClick={() => void reveal(s.name)} disabled={busy() === `reveal-${s.name}`}>
                            <IconCopy class="w-4 h-4" />
                          </button>
                          <Show when={props.canManage}>
                            <button class="btn btn-ghost btn-sm" title="Delete" onClick={() => void removeSecret(s.name)} disabled={busy() === `del-${s.name}`}>
                              <IconTrash class="w-4 h-4" />
                            </button>
                          </Show>
                        </div>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>

      <Show when={tauri()}>
        <div class="card card-flush">
          <div class="card-header">
            <div class="flex-1">
              <div class="card-header-title flex items-center gap-2"><IconKey class="w-4 h-4" /> This machine</div>
              <div class="card-header-description">
                Local vault on this device — the same one the CLI manages. These secrets never touch the server.
              </div>
            </div>
            <Show when={localStatus()?.unlocked}>
              <span class="badge badge-success font-mono">
                unlocked — {Math.floor(localRemaining() / 60)}m {String(localRemaining() % 60).padStart(2, "0")}s
              </span>
            </Show>
          </div>

          <div class="p-4">
            <Show when={localErr()}><div class="message message-error mb-3">{localErr()}</div></Show>

            <Show
              when={localStatus()?.unlocked}
              fallback={
                <Show
                  when={localStatus()?.exists}
                  fallback={
                    <p class="text-sm text-text-2">
                      No vault on this device — create one with <code>primora vault init</code> or from the tray's
                      Secrets Vault window.
                    </p>
                  }
                >
                  <form
                    class="flex gap-2 items-end flex-wrap"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void runLocal(() => tauri()!.core.invoke("vault_unlock", { password: localPw(), ttl: Number(localTtl()) }));
                      setLocalPw("");
                    }}
                  >
                    <div class="flex-1 min-w-[10rem]">
                      <Input type="password" placeholder="Vault password" value={localPw()} onInput={(e) => setLocalPw(e.currentTarget.value)} />
                    </div>
                    <Select value={localTtl()} onChange={(e) => setLocalTtl(e.currentTarget.value)} class="w-auto">
                      <option value="900">15 minutes</option>
                      <option value="3600">1 hour</option>
                      <option value="28800">8 hours</option>
                      <option value="86400">24 hours</option>
                    </Select>
                    <button type="submit" class="btn btn-primary btn-sm">Unlock</button>
                  </form>
                </Show>
              }
            >
              <Show
                when={localSecrets().length > 0}
                fallback={<p class="text-sm text-text-2">Local vault is empty — manage it from the tray's Secrets Vault window or the CLI.</p>}
              >
                <div class="table-container">
                  <table class="table">
                    <thead>
                      <tr><th>Name</th><th>URL</th><th>Notes</th><th class="text-right">Actions</th></tr>
                    </thead>
                    <tbody>
                      <For each={localSecrets()}>
                        {(s) => (
                          <tr>
                            <td class="font-mono text-sm">{s.name}</td>
                            <td class="text-sm">{s.url ?? "—"}</td>
                            <td class="text-sm text-text-2" title={s.notes ?? ""}>{s.notes ?? "—"}</td>
                            <td>
                              <div class="flex gap-2 justify-end">
                                <button class="btn btn-ghost btn-sm" title="Copy value" onClick={() => void revealLocal(s.name)}>
                                  <IconCopy class="w-4 h-4" />
                                </button>
                                <button class="btn btn-ghost btn-sm" title="Delete" onClick={() => void runLocal(() => tauri()!.core.invoke("vault_rm", { name: s.name }))}>
                                  <IconTrash class="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </For>
                    </tbody>
                  </table>
                </div>
              </Show>
              <div class="flex justify-between items-center mt-3">
                <p class="text-xs text-text-2">
                  Injection and the credential broker stay in the CLI: <code>primora inject</code> / <code>primora agent</code>.
                </p>
                <button class="btn btn-ghost btn-sm" onClick={() => void runLocal(() => tauri()!.core.invoke("vault_lock"))}>Lock</button>
              </div>
            </Show>
          </div>
        </div>
      </Show>

      <Modal open={showCreate()} onClose={() => setShowCreate(false)} title="New secret" size="md">
        <form onSubmit={createSecret} class="space-y-4">
          <Input label="Name" placeholder="STRIPE_SECRET" value={form().name} onInput={(e) => setForm({ ...form(), name: e.currentTarget.value })} required />
          <Input label="Value" type="password" placeholder="sk_live_…" value={form().value} onInput={(e) => setForm({ ...form(), value: e.currentTarget.value })} required />
          <Input label="URL" placeholder="https://dashboard.stripe.com (optional)" value={form().url} onInput={(e) => setForm({ ...form(), url: e.currentTarget.value })} />
          <Input label="Notes" placeholder="optional" value={form().notes} onInput={(e) => setForm({ ...form(), notes: e.currentTarget.value })} />
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            <button type="submit" class="btn btn-primary" disabled={busy() === "create"}>Store secret</button>
          </div>
        </form>
      </Modal>

      <Modal open={showImport()} onClose={() => setShowImport(false)} title="Import .env" size="md">
        <form onSubmit={importEnv} class="space-y-4">
          <Textarea label="Paste .env contents" rows={8} placeholder={"KEY=value\nOTHER=…"} value={importText()} onInput={(e) => setImportText(e.currentTarget.value)} class="font-mono text-sm" />
          <p class="text-xs text-text-2">Existing names are overwritten. Keys that aren't env-var-safe are skipped.</p>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" onClick={() => setShowImport(false)}>Cancel</button>
            <button type="submit" class="btn btn-primary" disabled={busy() === "import"}>Import</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
