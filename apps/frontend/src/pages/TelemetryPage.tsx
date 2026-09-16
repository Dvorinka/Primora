import { For, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";
import {
  OpenAPI,
  TelemetryService,
  type MetricPoint,
  type TelemetryEvent,
  type TelemetryIssue,
  type TelemetryStats,
} from "@primora/api-client";
import { fetchApiToken } from "../lib/auth-client";
import { demoService } from "../lib/demo-mode";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { Select } from "../components/Input";
import {
  IconChevronRight,
  IconRefresh,
} from "../components/Icons";

interface TelemetryPageProps {
  projectID?: string;
  canManage: boolean;
  demoMode: boolean;
}

type Tab = "health" | "issues" | "events" | "metrics" | "integrate";

const err = (e: unknown) => (e instanceof Error ? e.message : String(e));
const svc = (demo: boolean) =>
  (demo ? (demoService as unknown as typeof TelemetryService) : TelemetryService);

const sevVariant = (s?: string) =>
  s === "error" || s === "fatal" ? "error" : s === "warn" || s === "warning" ? "warning" : s === "info" ? "primary" : "neutral";

const fmtTime = (ts?: string | null) => (ts ? new Date(ts).toLocaleString() : "—");

const snippetWeb = `import { createPrimoraClient } from "@primora/client";

const primora = createPrimoraClient({
  endpoint: window.location.origin,   // your Primora deployment
  key: "prm_…",                       // project API key
  component: "web",
  kind: "frontend",
});

primora.installAuto();                // window.onerror + unhandledrejection
primora.captureMetric({ name: "app.start.ms", value: performance.now() });`;

const snippetNode = `import { createPrimoraClient } from "@primora/client";

const primora = createPrimoraClient({
  endpoint: "https://primora.example.com",
  key: process.env.PRIMORA_KEY!,      // X-Primora-Key
  component: "api",
  kind: "backend",
});

setInterval(() => primora.heartbeat("up"), 30_000);
process.on("uncaughtException", (e) => primora.captureError(e));`;

const snippetCurl = `curl -X POST "$ORIGIN/api/v1/ingest" \\
  -H "Content-Type: application/json" \\
  -H "X-Primora-Key: prm_…" \\
  -d '{"type":"event","component":"cli","message":"deploy.done","payload":{"sha":"abc123"}}'`;

export function TelemetryPage(props: TelemetryPageProps) {
  const [tab, setTab] = createSignal<Tab>("health");
  const [windowSel, setWindowSel] = createSignal("24h");
  const [stats, setStats] = createSignal<TelemetryStats | null>(null);
  const [issues, setIssues] = createSignal<TelemetryIssue[]>([]);
  const [events, setEvents] = createSignal<TelemetryEvent[]>([]);
  const [typeFilter, setTypeFilter] = createSignal("");
  const [fpFilter, setFpFilter] = createSignal("");
  const [metricName, setMetricName] = createSignal("");
  const [metricPoints, setMetricPoints] = createSignal<MetricPoint[]>([]);
  const [detail, setDetail] = createSignal<TelemetryEvent | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [error, setError] = createSignal("");
  const [live, setLive] = createSignal(false);

  const refresh = async () => {
    if (!props.projectID) return;
    setLoading(true);
    setError("");
    try {
      const s = svc(props.demoMode);
      const [st, iss, ev] = await Promise.all([
        s.getTelemetryStats({ projectId: props.projectID, window: windowSel() as "1h" | "24h" | "7d" | "30d" }),
        s.listTelemetryIssues({ projectId: props.projectID }),
        s.listTelemetryEvents({
          projectId: props.projectID,
          type: (typeFilter() || undefined) as "error" | "metric" | "log" | "heartbeat" | "event" | undefined,
          fingerprint: fpFilter() || undefined,
          limit: 100,
        }),
      ]);
      setStats(st);
      setIssues(iss.items ?? []);
      setEvents(ev.items ?? []);
      if (!metricName() && st.metric_names?.length) setMetricName(st.metric_names[0]);
    } catch (e) {
      setError(err(e));
    } finally {
      setLoading(false);
    }
  };

  const refreshMetric = async (name: string) => {
    if (!props.projectID || !name) {
      setMetricPoints([]);
      return;
    }
    try {
      const res = await svc(props.demoMode).getTelemetryMetricSeries({
        projectId: props.projectID,
        name,
        window: windowSel() as "1h" | "24h" | "7d" | "30d",
      });
      setMetricPoints(res.items ?? []);
    } catch {
      setMetricPoints([]);
    }
  };

  createEffect(() => {
    if (!props.projectID) return;
    void refresh();

    if (props.demoMode) return;
    let es: EventSource | null = null;
    let cancelled = false;
    void fetchApiToken().then((token) => {
      if (cancelled || !token || !props.projectID) return;
      const url = `${OpenAPI.BASE}/projects/${props.projectID}/telemetry/stream?token=${encodeURIComponent(token)}`;
      es = new EventSource(url);
      es.addEventListener("event", (m) => {
        setLive(true);
        try {
          const ev = JSON.parse((m as MessageEvent).data) as TelemetryEvent;
          const tf = typeFilter();
          const ff = fpFilter();
          if ((!tf || ev.type === tf) && (!ff || ev.fingerprint === ff)) {
            setEvents((prev) => [ev, ...prev].slice(0, 200));
          }
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
    });
  });

  createEffect(() => {
    void refreshMetric(metricName());
  });

  const typeCounts = createMemo(() => {
    const totals: Record<string, number> = {};
    for (const b of stats()?.series ?? []) {
      for (const [t, n] of Object.entries(b.counts ?? {})) {
        totals[t] = (totals[t] ?? 0) + n;
      }
    }
    return totals;
  });

  const maxBucket = createMemo(() =>
    Math.max(1, ...(stats()?.series ?? []).map((b) => Object.values(b.counts ?? {}).reduce((a, n) => a + n, 0))),
  );

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Telemetry</h1>
          <p class="page-description">Errors, metrics, logs, and heartbeats across your components.</p>
        </div>
        <div class="flex items-center gap-2">
          <Show when={live()}>
            <Badge variant="success">Live</Badge>
          </Show>
          <Select
            value={windowSel()}
            onChange={(e) => {
              setWindowSel(e.currentTarget.value);
              void refresh();
            }}
          >
            <option value="1h">1h</option>
            <option value="24h">24h</option>
            <option value="7d">7d</option>
            <option value="30d">30d</option>
          </Select>
          <button class="btn btn-secondary" onClick={() => void refresh()} disabled={loading()}>
            <IconRefresh class="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <Show when={error()}>
        <div class="message message-error">{error()}</div>
      </Show>

      <div class="flex gap-1 mb-4 flex-wrap">
        <For each={["health", "issues", "events", "metrics", "integrate"] as Tab[]}>
          {(t) => (
            <button
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab() === t ? "bg-surface-2 text-text-1" : "text-text-2 hover:text-text-1"}`}
              onClick={() => setTab(t)}
            >
              {t === "issues" ? `Issues (${issues().length})` : t[0].toUpperCase() + t.slice(1)}
            </button>
          )}
        </For>
      </div>

      <Show when={tab() === "health"}>
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr))">
          <div class="card p-4">
            <div class="text-xs text-text-2">Errors</div>
            <div class="text-2xl font-semibold">{stats()?.errors ?? 0}</div>
          </div>
          <div class="card p-4">
            <div class="text-xs text-text-2">Events</div>
            <div class="text-2xl font-semibold">{stats()?.events ?? 0}</div>
          </div>
          <div class="card p-4">
            <div class="text-xs text-text-2">Metrics</div>
            <div class="text-2xl font-semibold">{stats()?.metrics ?? 0}</div>
          </div>
        </div>

        <div class="card card-flush mt-4">
          <div class="card-header">
            <span class="card-header-title">Activity</span>
          </div>
          <div class="p-4 flex items-end gap-1 overflow-x-auto" style="min-height: 6rem">
            <For each={stats()?.series ?? []}>
              {(b) => {
                const total = () => Object.values(b.counts ?? {}).reduce((a, n) => a + n, 0);
                return (
                  <div
                    class="flex-1 rounded-sm"
                    style={{
                      "min-width": "6px",
                      height: `${Math.max(4, (total() / maxBucket()) * 80)}px`,
                      background: (b.counts?.error ?? 0) > 0 ? "var(--error, #e5484d)" : "var(--accent)",
                      opacity: 0.85,
                    }}
                    title={`${new Date(b.ts).toLocaleString()} — ${total()} events`}
                  />
                );
              }}
            </For>
          </div>
          <div class="px-4 pb-3 flex gap-3 flex-wrap text-xs text-text-2">
            <For each={Object.entries(typeCounts())}>
              {([t, n]) => (
                <span>
                  {t}: {n}
                </span>
              )}
            </For>
          </div>
        </div>

        <div class="card card-flush mt-4">
          <div class="card-header">
            <span class="card-header-title">Components</span>
          </div>
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kind</th>
                  <th>Status</th>
                  <th>Errors 24h</th>
                  <th>Events 24h</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                <For
                  each={stats()?.components ?? []}
                  fallback={
                    <tr>
                      <td colspan={6} class="text-center text-text-2 py-6">
                        No components yet — send an event with a `component` field.
                      </td>
                    </tr>
                  }
                >
                  {(c) => (
                    <tr>
                      <td class="font-medium">{c.name}</td>
                      <td>{c.kind}</td>
                      <td>
                        <Badge variant={c.last_status === "up" ? "success" : c.last_status === "down" ? "error" : c.last_status === "degraded" ? "warning" : "neutral"}>
                          {c.last_status || "unknown"}
                        </Badge>
                      </td>
                      <td>{c.errors_24h}</td>
                      <td>{c.events_24h}</td>
                      <td class="text-text-2">{fmtTime(c.last_seen_at)}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      <Show when={tab() === "issues"}>
        <div class="card card-flush">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Error</th>
                  <th>Component</th>
                  <th>Count</th>
                  <th>Severity</th>
                  <th>Last seen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <For
                  each={issues()}
                  fallback={
                    <tr>
                      <td colspan={6} class="text-center text-text-2 py-6">
                        No error groups in the last 30 days.
                      </td>
                    </tr>
                  }
                >
                  {(i) => (
                    <tr>
                      <td class="max-w-0 truncate" style="max-width: 24rem" title={i.message}>
                        {i.message}
                      </td>
                      <td>{i.component_name || "—"}</td>
                      <td>{i.count}</td>
                      <td>
                        <Badge variant={sevVariant(i.severity)}>{i.severity}</Badge>
                      </td>
                      <td class="text-text-2">{fmtTime(i.last_seen)}</td>
                      <td>
                        <button
                          class="btn btn-secondary btn-sm"
                          onClick={() => {
                            setFpFilter(i.fingerprint);
                            setTab("events");
                            void refresh();
                          }}
                        >
                          <IconChevronRight class="w-4 h-4" />
                          Events
                        </button>
                      </td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      <Show when={tab() === "events"}>
        <div class="flex gap-2 mb-3 flex-wrap items-center">
          <For each={["", "error", "metric", "log", "heartbeat", "event"]}>
            {(t) => (
              <button
                class={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${typeFilter() === t ? "bg-accent text-white" : "bg-surface-2 text-text-2 hover:text-text-1"}`}
                onClick={() => {
                  setTypeFilter(t);
                  void refresh();
                }}
              >
                {t || "all"}
              </button>
            )}
          </For>
          <Show when={fpFilter()}>
            <button
              class="px-3 py-1 rounded-lg text-xs font-medium bg-surface-2 text-text-1"
              onClick={() => {
                setFpFilter("");
                void refresh();
              }}
            >
              fingerprint: {fpFilter().slice(0, 8)}… ✕
            </button>
          </Show>
        </div>
        <div class="card card-flush">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Severity</th>
                  <th>Message</th>
                  <th>Component</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                <For
                  each={events()}
                  fallback={
                    <tr>
                      <td colspan={5} class="text-center text-text-2 py-6">
                        No events.
                      </td>
                    </tr>
                  }
                >
                  {(e) => (
                    <tr class="cursor-pointer" onClick={() => setDetail(e)}>
                      <td>
                        <Badge variant={e.type === "error" ? "error" : "neutral"}>{e.type}</Badge>
                      </td>
                      <td>
                        <Badge variant={sevVariant(e.severity)}>{e.severity}</Badge>
                      </td>
                      <td class="max-w-0 truncate" style="max-width: 22rem" title={e.message}>
                        {e.message || <span class="text-text-2">{e.payload?.name ? `${e.payload.name} = ${e.payload.value}` : JSON.stringify(e.payload)}</span>}
                      </td>
                      <td>{e.component_name || "—"}</td>
                      <td class="text-text-2 whitespace-nowrap">{fmtTime(e.ts)}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      <Show when={tab() === "metrics"}>
        <div class="flex gap-2 mb-3 flex-wrap">
          <For
            each={stats()?.metric_names ?? []}
            fallback={<span class="text-text-2 text-sm">No metric names seen yet.</span>}
          >
            {(n) => (
              <button
                class={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${metricName() === n ? "bg-accent text-white" : "bg-surface-2 text-text-2 hover:text-text-1"}`}
                onClick={() => setMetricName(n)}
              >
                {n}
              </button>
            )}
          </For>
        </div>
        <div class="card card-flush">
          <div class="table-container">
            <table class="table">
              <thead>
                <tr>
                  <th>Bucket</th>
                  <th>Avg</th>
                  <th>p50</th>
                  <th>p95</th>
                  <th>Max</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                <For
                  each={metricPoints()}
                  fallback={
                    <tr>
                      <td colspan={6} class="text-center text-text-2 py-6">
                        Select a metric name.
                      </td>
                    </tr>
                  }
                >
                  {(p) => (
                    <tr>
                      <td class="text-text-2 whitespace-nowrap">{fmtTime(p.ts)}</td>
                      <td>{p.avg?.toFixed(1) ?? "—"}</td>
                      <td>{p.p50?.toFixed(1) ?? "—"}</td>
                      <td>{p.p95?.toFixed(1) ?? "—"}</td>
                      <td>{p.max?.toFixed(1) ?? "—"}</td>
                      <td>{p.count}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </div>
      </Show>

      <Show when={tab() === "integrate"}>
        <div class="grid gap-4" style="grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr))">
          <For each={[{ title: "Web / browser", code: snippetWeb }, { title: "Node / server", code: snippetNode }, { title: "cURL", code: snippetCurl }]}>
            {(s) => (
              <div class="card card-flush">
                <div class="card-header">
                  <span class="card-header-title">{s.title}</span>
                </div>
                <pre class="p-4 text-xs overflow-x-auto" style="white-space: pre">{s.code}</pre>
              </div>
            )}
          </For>
        </div>
        <p class="text-sm text-text-2 mt-4">
          Create a project API key under Settings, then pass it as <code>X-Primora-Key</code> to <code>POST /api/v1/ingest</code>. Batches of up to 500 events are accepted.
        </p>
      </Show>

      <Modal
        open={detail() !== null}
        onClose={() => setDetail(null)}
        title={detail()?.message || detail()?.type || "Event"}
      >
        <Show when={detail()}>
          {(e) => (
            <div class="flex flex-col gap-3">
              <div class="flex gap-2 flex-wrap">
                <Badge variant={e().type === "error" ? "error" : "neutral"}>{e().type}</Badge>
                <Badge variant={sevVariant(e().severity)}>{e().severity}</Badge>
                <Show when={e().component_name}>
                  <Badge variant="neutral">{e().component_name}</Badge>
                </Show>
                <Show when={e().fingerprint}>
                  <Badge variant="neutral">fp {e().fingerprint!.slice(0, 8)}</Badge>
                </Show>
              </div>
              <div class="text-xs text-text-2">{fmtTime(e().ts)}</div>
              <pre class="text-xs p-3 rounded-lg bg-surface-2 overflow-x-auto" style="white-space: pre-wrap">
                {JSON.stringify(e().payload, null, 2)}
              </pre>
            </div>
          )}
        </Show>
      </Modal>
    </div>
  );
}
