import { For, Show, createEffect, createSignal, onCleanup } from "solid-js";
import {
  AutomationService,
  FunctionsService,
  OpenAPI,
  type ScheduledJob,
  type ScheduledJobRun,
  type Function as PrimoraFunction,
} from "@primora/api-client";
import { fetchApiToken } from "../lib/auth-client";
import { demoService } from "../lib/demo-mode";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { Input, Textarea } from "../components/Input";
import { errorMessage } from "../lib/api";
import {
  IconPlus,
  IconRefresh,
  IconTrash,
  IconPlay,
  IconChevronRight,
  IconCheck,
  IconCopy,
  IconZap,
} from "../components/Icons";

interface AutomationPageProps {
  projectID?: string;
  canManage: boolean;
  demoMode: boolean;
}

type Tab = "schedules" | "events";

interface RealtimeEvent {
  type: string;
  occurred_at: string;
  data: Record<string, unknown>;
}

const err = (e: unknown) => errorMessage(e, String(e));
const svc = (demo: boolean) =>
  (demo ? (demoService as unknown as typeof AutomationService) : AutomationService);

const fmtTime = (ts?: string | null) => (ts ? new Date(ts).toLocaleString() : "—");

const statusVariant = (s?: string | null) =>
  s === "success" ? "success" : s === "failed" ? "error" : s === "running" ? "warning" : "neutral";

const eventVariant = (t?: string) =>
  t?.startsWith("document.")
    ? "primary"
    : t?.startsWith("object.")
      ? "success"
      : t === "job.run"
        ? "warning"
        : t === "issue.created"
          ? "error"
          : "neutral";

const DEMO_EVENT_TYPES = ["document.created", "object.created", "job.run", "deploy.marker", "issue.created"];

export function AutomationPage(props: AutomationPageProps) {
  const [tab, setTab] = createSignal<Tab>("schedules");
  const [jobs, setJobs] = createSignal<ScheduledJob[]>([]);
  const [runs, setRuns] = createSignal<Record<string, ScheduledJobRun[]>>({});
  const [expandedJob, setExpandedJob] = createSignal<string>();
  const [showCreate, setShowCreate] = createSignal(false);
  const [jobForm, setJobForm] = createSignal({ name: "", schedule: "", url: "", payload: "", secret: "", enabled: true, target: "url" as "url" | "function", function_id: "" });
  const [functions, setFunctions] = createSignal<PrimoraFunction[]>([]);
  const [createdSecret, setCreatedSecret] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [busy, setBusy] = createSignal<string>();
  const [message, setMessage] = createSignal("");
  const [error, setError] = createSignal("");

  const [events, setEvents] = createSignal<RealtimeEvent[]>([]);
  const [live, setLive] = createSignal(false);
  const [paused, setPaused] = createSignal(false);
  const [typeFilter, setTypeFilter] = createSignal("");

  const refresh = async () => {
    if (!props.projectID) return;
    setLoading(true);
    setError("");
    try {
      const res = await svc(props.demoMode).listScheduledJobs({ projectId: props.projectID });
      setJobs(res.items ?? []);
      if (!props.demoMode) {
        const fr = await FunctionsService.listFunctions({ projectId: props.projectID });
        setFunctions(fr.items ?? []);
      }
    } catch (e) {
      setError(err(e));
    } finally {
      setLoading(false);
    }
  };

  const loadRuns = async (jobID: string) => {
    if (!props.projectID) return;
    try {
      const res = await svc(props.demoMode).listScheduledJobRuns({ projectId: props.projectID, jobId: jobID, limit: 50 });
      setRuns((c) => ({ ...c, [jobID]: res.items ?? [] }));
    } catch {
      /* non-fatal */
    }
  };

  const toggleRuns = (jobID: string) => {
    if (expandedJob() === jobID) {
      setExpandedJob(undefined);
      return;
    }
    setExpandedJob(jobID);
    void loadRuns(jobID);
  };

  createEffect(() => {
    if (props.projectID) void refresh();
  });

  /* Live events — SSE against /realtime/stream; demo mode fakes a feed. */
  createEffect(() => {
    if (!props.projectID || tab() !== "events") return;
    if (props.demoMode) {
      let i = 0;
      const timer = setInterval(() => {
        if (paused()) return;
        const type = DEMO_EVENT_TYPES[i++ % DEMO_EVENT_TYPES.length];
        const data: Record<string, unknown> =
          type === "job.run"
            ? { job_name: "nightly-rollup", status: "success", duration_ms: 42 + i }
            : type.startsWith("document.")
              ? { collection_id: "demo-col-1", document_id: `doc-${i}`, document: { title: `Note ${i}` } }
              : type.startsWith("object.")
                ? { bucket_id: "demo-bucket-1", object_key: `uploads/file-${i}.png`, size_bytes: 4096 * i }
                : type === "issue.created"
                  ? { fingerprint: `fp-${i}`, message: "TypeError: demo failure", severity: "error" }
                  : { version: `0.7.${i}`, environment: "production" };
        setEvents((prev) => [{ type, occurred_at: new Date().toISOString(), data }, ...prev].slice(0, 200));
      }, 2500);
      setLive(true);
      onCleanup(() => {
        clearInterval(timer);
        setLive(false);
      });
      return;
    }

    let es: EventSource | null = null;
    let cancelled = false;
    void fetchApiToken().then((token) => {
      if (cancelled || !token || !props.projectID) return;
      const url = `${OpenAPI.BASE}/projects/${props.projectID}/realtime/stream?token=${encodeURIComponent(token)}`;
      es = new EventSource(url);
      es.addEventListener("event", (m) => {
        setLive(true);
        if (paused()) return;
        try {
          const ev = JSON.parse((m as MessageEvent).data) as RealtimeEvent;
          setEvents((prev) => [ev, ...prev].slice(0, 200));
        } catch {
          /* ignore malformed frames */
        }
      });
      es.onerror = () => setLive(false);
      es.onopen = () => setLive(true);
    });
    onCleanup(() => {
      cancelled = true;
      es?.close();
      setLive(false);
    });
  });

  const run = async (key: string, task: () => Promise<unknown>, done?: string) => {
    setBusy(key);
    setMessage("");
    setError("");
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

  const createJob = (e: Event) => {
    e.preventDefault();
    const form = jobForm();
    let payload: Record<string, unknown> | undefined;
    if (form.payload.trim()) {
      try {
        payload = JSON.parse(form.payload) as Record<string, unknown>;
      } catch {
        setError("Payload must be valid JSON");
        return;
      }
    }
    void run("create-job", async () => {
      const created = await svc(props.demoMode).createScheduledJob({
        projectId: props.projectID!,
        requestBody: {
          name: form.name.trim(),
          schedule: form.schedule.trim(),
          url: form.target === "url" ? form.url.trim() : undefined,
          function_id: form.target === "function" ? form.function_id : undefined,
          secret: form.secret.trim() || undefined,
          payload,
          enabled: form.enabled,
        },
      });
      if (created.secret) setCreatedSecret(created.secret);
      setJobForm({ name: "", schedule: "", url: "", payload: "", secret: "", enabled: true, target: "url", function_id: "" });
      setShowCreate(false);
    }, "Schedule created");
  };

  const toggleEnabled = (job: ScheduledJob) =>
    void run(`toggle-${job.id}`, () =>
      svc(props.demoMode).updateScheduledJob({
        projectId: props.projectID!,
        jobId: job.id,
        requestBody: { enabled: !job.enabled },
      }),
    );

  const runNow = (job: ScheduledJob) =>
    void run(
      `run-${job.id}`,
      () =>
        svc(props.demoMode).runScheduledJob({ projectId: props.projectID!, jobId: job.id }),
      `Run queued for ${job.name}`,
    );

  const deleteJob = (job: ScheduledJob) =>
    void run(
      `del-${job.id}`,
      () => svc(props.demoMode).deleteScheduledJob({ projectId: props.projectID!, jobId: job.id }),
      `Deleted ${job.name}`,
    );

  const filteredEvents = () => {
    const f = typeFilter();
    return f ? events().filter((e) => e.type === f) : events();
  };

  const eventTypes = () => [...new Set(events().map((e) => e.type))];

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Automation</h1>
          <p class="page-description">Scheduled jobs and the live event stream for this project.</p>
        </div>
        <button class="btn btn-secondary" onClick={() => void refresh()} disabled={loading()}>
          <IconRefresh class="w-4 h-4" />
          Refresh
        </button>
      </div>

      <Show when={message()}>
        <div class="message message-success mb-4">{message()}</div>
      </Show>
      <Show when={error()}>
        <div class="message message-error mb-4">{error()}</div>
      </Show>
      <Show when={createdSecret()}>
        <div class="message message-warning mb-4">
          <div class="flex-1 min-w-0">
            <strong>Job signing secret — shown once.</strong>
            <code class="block mt-1" style="word-break: break-all">{createdSecret()}</code>
          </div>
          <button class="btn btn-ghost btn-sm" onClick={() => navigator.clipboard?.writeText(createdSecret())} title="Copy secret">
            <IconCopy class="w-4 h-4" />
          </button>
          <button class="btn btn-ghost btn-sm" onClick={() => setCreatedSecret("")} title="Dismiss">
            <IconCheck class="w-4 h-4" />
          </button>
        </div>
      </Show>

      <div class="tabs mb-4">
        <button class={`tab ${tab() === "schedules" ? "active" : ""}`} onClick={() => setTab("schedules")}>
          Schedules
        </button>
        <button class={`tab ${tab() === "events" ? "active" : ""}`} onClick={() => setTab("events")}>
          Live events
        </button>
      </div>

      <Show when={tab() === "schedules"}>
        <div class="card card-flush">
          <div class="card-header">
            <div class="flex-1">
              <div class="card-header-title">Scheduled jobs</div>
              <div class="card-header-description">
                Cron-driven signed POSTs to your endpoints. Deliveries carry{" "}
                <code>X-Primora-Signature</code> (HMAC-SHA256) — same scheme as webhooks. Missed
                occurrences collapse into a single run.
              </div>
            </div>
            <Show when={props.canManage}>
              <button class="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
                <IconPlus class="w-4 h-4" />
                New schedule
              </button>
            </Show>
          </div>
          <Show
            when={jobs().length > 0}
            fallback={
              <p class="text-text-2 text-sm p-4">
                No schedules yet. Add one to ping an endpoint on a cron — backups, rollups, report
                generation.
              </p>
            }
          >
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Schedule</th>
                    <th>Target</th>
                    <th class="hidden md:table-cell">Next run</th>
                    <th class="hidden md:table-cell">Last run</th>
                    <th>Enabled</th>
                    <th style="text-align:right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={jobs()}>
                    {(job) => (
                      <>
                        <tr>
                          <td class="font-medium">{job.name}</td>
                          <td>
                            <code class="text-xs">{job.schedule}</code>
                          </td>
                          <td class="text-text-2" style="max-width:14rem;overflow:hidden;text-overflow:ellipsis">
                            {job.function_id
                              ? `ƒ ${functions().find((f) => f.id === job.function_id)?.name ?? "function"}`
                              : job.url}
                          </td>
                          <td class="hidden md:table-cell text-text-2">{job.enabled ? fmtTime(job.next_run_at) : "—"}</td>
                          <td class="hidden md:table-cell">
                            <Show when={job.last_run_at} fallback={<span class="text-text-2">never</span>}>
                              <Badge variant={statusVariant(job.last_status)}>{job.last_status}</Badge>{" "}
                              <span class="text-text-2 text-xs">{fmtTime(job.last_run_at)}</span>
                            </Show>
                          </td>
                          <td>
                            <Show when={props.canManage} fallback={<Badge variant={job.enabled ? "success" : "neutral"}>{job.enabled ? "on" : "off"}</Badge>}>
                              <button
                                class={`badge ${job.enabled ? "badge-success" : ""} cursor-pointer border-0`}
                                onClick={() => toggleEnabled(job)}
                                disabled={busy() === `toggle-${job.id}`}
                                title={job.enabled ? "Disable" : "Enable"}
                              >
                                {job.enabled ? "on" : "off"}
                              </button>
                            </Show>
                          </td>
                          <td style="text-align:right;white-space:nowrap">
                            <button class="btn btn-ghost btn-sm" onClick={() => toggleRuns(job.id)}>
                              <IconChevronRight class={`w-4 h-4 ${expandedJob() === job.id ? "rotate-90" : ""}`} />
                              Runs
                            </button>
                            <Show when={props.canManage}>
                              <button
                                class="btn btn-ghost btn-sm"
                                onClick={() => runNow(job)}
                                disabled={busy() === `run-${job.id}`}
                                title="Trigger a manual run now"
                              >
                                <IconPlay class="w-4 h-4" />
                                Run
                              </button>
                              <button
                                class="btn btn-ghost btn-sm"
                                onClick={() => deleteJob(job)}
                                disabled={busy() === `del-${job.id}`}
                              >
                                <IconTrash class="w-4 h-4" />
                              </button>
                            </Show>
                          </td>
                        </tr>
                        <Show when={expandedJob() === job.id}>
                          <tr>
                            <td colspan={7} style="padding:0">
                              <div class="p-4" style="background:var(--bg-subtle)">
                                <div class="text-xs text-text-2 mb-2 font-medium uppercase tracking-wide">
                                  Run history — last {(runs()[job.id] ?? []).length} of 200 kept
                                </div>
                                <Show
                                  when={(runs()[job.id] ?? []).length > 0}
                                  fallback={<p class="text-text-2 text-sm">No runs yet.</p>}
                                >
                                  <table class="table">
                                    <thead>
                                      <tr>
                                        <th>Status</th>
                                        <th>Trigger</th>
                                        <th class="hidden md:table-cell">HTTP</th>
                                        <th class="hidden md:table-cell">Duration</th>
                                        <th>Started</th>
                                        <th>Error</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      <For each={runs()[job.id] ?? []}>
                                        {(r) => (
                                          <tr>
                                            <td>
                                              <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                                            </td>
                                            <td class="text-text-2">{r.triggered_by}</td>
                                            <td class="hidden md:table-cell text-text-2">{r.status_code ?? "—"}</td>
                                            <td class="hidden md:table-cell text-text-2">
                                              {r.duration_ms != null ? `${r.duration_ms} ms` : "—"}
                                            </td>
                                            <td class="text-text-2">{fmtTime(r.started_at)}</td>
                                            <td class="text-text-2" style="max-width:16rem;overflow:hidden;text-overflow:ellipsis">
                                              {r.error || "—"}
                                            </td>
                                          </tr>
                                        )}
                                      </For>
                                    </tbody>
                                  </table>
                                </Show>
                              </div>
                            </td>
                          </tr>
                        </Show>
                      </>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </div>
      </Show>

      <Show when={tab() === "events"}>
        <div class="card card-flush">
          <div class="card-header">
            <div class="flex-1">
              <div class="card-header-title">
                Live events{" "}
                <Badge variant={live() ? "success" : "neutral"}>{live() ? "live" : "offline"}</Badge>
              </div>
              <div class="card-header-description">
                Domain events as they happen — document and object mutations, new issues, deploy
                markers, job runs. Webhooks subscribed to the same types fire in parallel.
              </div>
            </div>
            <div class="flex gap-2">
              <button class="btn btn-secondary btn-sm" onClick={() => setPaused(!paused())}>
                {paused() ? "Resume" : "Pause"}
              </button>
              <button class="btn btn-secondary btn-sm" onClick={() => setEvents([])}>
                Clear
              </button>
            </div>
          </div>
          <Show when={eventTypes().length > 1}>
            <div class="flex gap-2 p-4 pb-0 flex-wrap">
              <button
                class={`badge cursor-pointer border-0 ${typeFilter() === "" ? "badge-primary" : ""}`}
                onClick={() => setTypeFilter("")}
              >
                all
              </button>
              <For each={eventTypes()}>
                {(t) => (
                  <button
                    class={`badge cursor-pointer border-0 ${typeFilter() === t ? "badge-primary" : ""}`}
                    onClick={() => setTypeFilter(typeFilter() === t ? "" : t)}
                  >
                    {t}
                  </button>
                )}
              </For>
            </div>
          </Show>
          <Show
            when={filteredEvents().length > 0}
            fallback={
              <p class="text-text-2 text-sm p-4">
                {live()
                  ? "Listening — create a document, upload a file, or run a job and it lands here."
                  : "Connecting to the event stream…"}
              </p>
            }
          >
            <div class="table-container">
              <table class="table">
                <tbody>
                  <For each={filteredEvents()}>
                    {(ev) => (
                      <tr>
                        <td style="width:11rem">
                          <Badge variant={eventVariant(ev.type)}>{ev.type}</Badge>
                        </td>
                        <td class="text-text-2 text-xs" style="width:11rem">
                          {fmtTime(ev.occurred_at)}
                        </td>
                        <td>
                          <code
                            class="text-xs block"
                            style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:36rem"
                            title={JSON.stringify(ev.data, null, 2)}
                          >
                            {JSON.stringify(ev.data)}
                          </code>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </div>
      </Show>

      <Modal error={error()} open={showCreate()} onClose={() => setShowCreate(false)} title="New schedule" size="md">
        <form onSubmit={createJob} class="space-y-4">
          <Input
            label="Name"
            value={jobForm().name}
            onInput={(e) => setJobForm((c) => ({ ...c, name: e.currentTarget.value }))}
            placeholder="nightly-rollup"
            required
          />
          <div>
            <Input
              label="Schedule"
              value={jobForm().schedule}
              onInput={(e) => setJobForm((c) => ({ ...c, schedule: e.currentTarget.value }))}
              placeholder="*/15 * * * *  or  @every 1h"
              required
            />
            <p class="label-hint">
              Standard 5-field cron, or a descriptor: <code>@hourly</code>, <code>@daily</code>,{" "}
              <code>@every 30m</code>.
            </p>
          </div>
          <div>
            <span class="label">Target</span>
            <div class="flex gap-2 mb-2">
              <button
                type="button"
                class={`btn btn-sm ${jobForm().target === "url" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setJobForm((c) => ({ ...c, target: "url" }))}
              >
                Webhook URL
              </button>
              <button
                type="button"
                class={`btn btn-sm ${jobForm().target === "function" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setJobForm((c) => ({ ...c, target: "function" }))}
              >
                Function
              </button>
            </div>
            <Show
              when={jobForm().target === "function"}
              fallback={
                <>
                  <Input
                    label="Target URL"
                    value={jobForm().url}
                    onInput={(e) => setJobForm((c) => ({ ...c, url: e.currentTarget.value }))}
                    placeholder="https://api.example.com/jobs/rollup"
                    required
                  />
                  <p class="label-hint">
                    HTTPS for public endpoints; plain HTTP allowed for private/self-hosted targets.
                  </p>
                </>
              }
            >
              <select
                class="input"
                value={jobForm().function_id}
                onChange={(e) => setJobForm((c) => ({ ...c, function_id: e.currentTarget.value }))}
                required
              >
                <option value="">Select a function…</option>
                <For each={functions()}>
                  {(f) => <option value={f.id}>{f.name} ({f.runtime})</option>}
                </For>
              </select>
              <p class="label-hint">
                The function receives the resolved payload as JSON. Runs appear under the function's
                history.
              </p>
            </Show>
          </div>
          <Textarea
            label="Payload (optional JSON)"
            class="font-mono text-xs"
            rows={3}
            value={jobForm().payload}
            onInput={(e) => setJobForm((c) => ({ ...c, payload: e.currentTarget.value }))}
            placeholder='{"task": "rollup", "window": "24h"}'
          />
          <Input
            label="Signing secret (optional)"
            value={jobForm().secret}
            onInput={(e) => setJobForm((c) => ({ ...c, secret: e.currentTarget.value }))}
            placeholder="generated if empty"
          />
          <label class="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={jobForm().enabled}
              onChange={(e) => setJobForm((c) => ({ ...c, enabled: e.currentTarget.checked }))}
            />
            Enabled — start running on schedule immediately
          </label>
          <div class="flex gap-2 justify-end">
            <button type="button" class="btn btn-secondary" onClick={() => setShowCreate(false)}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={busy() === "create-job"}>
              <IconZap class="w-4 h-4" />
              Create schedule
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
