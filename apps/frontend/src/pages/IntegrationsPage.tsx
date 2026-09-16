import { For, Show, createEffect, createSignal } from "solid-js";
import {
  CreateIntegrationRequest,
  IntegrationsService,
  WebhooksService,
  type Integration,
  type IntegrationAnalytics,
  type Webhook,
  type WebhookDelivery,
} from "@primora/api-client";
import { demoService } from "../lib/demo-mode";
import { Badge } from "../components/Badge";
import { Modal } from "../components/Modal";
import { Input, Select } from "../components/Input";
import {
  IconPlus,
  IconRefresh,
  IconTrash,
  IconPlay,
  IconChevronRight,
  IconCheck,
  IconCopy,
} from "../components/Icons";

interface IntegrationsPageProps {
  projectID?: string;
  canManage: boolean;
  demoMode: boolean;
}

type Tab = "integrations" | "webhooks";

const err = (e: unknown) => (e instanceof Error ? e.message : String(e));
const intSvc = (demo: boolean) =>
  (demo ? (demoService as unknown as typeof IntegrationsService) : IntegrationsService);
const hookSvc = (demo: boolean) =>
  (demo ? (demoService as unknown as typeof WebhooksService) : WebhooksService);

const fmtTime = (ts?: string | null) => (ts ? new Date(ts).toLocaleString() : "—");
const fmtNum = (n?: number) => (n == null ? "—" : n.toLocaleString());

const statusVariant = (s?: string) =>
  s === "ok" || s === "delivered"
    ? "success"
    : s === "error" || s === "failed"
      ? "error"
      : s === "pending"
        ? "warning"
        : "neutral";

const EVENT_TYPES = ["issue.created", "deploy.marker", "webhook.test"] as const;

export function IntegrationsPage(props: IntegrationsPageProps) {
  const [tab, setTab] = createSignal<Tab>("integrations");
  const [integrations, setIntegrations] = createSignal<Integration[]>([]);
  const [webhooks, setWebhooks] = createSignal<Webhook[]>([]);
  const [deliveries, setDeliveries] = createSignal<Record<string, WebhookDelivery[]>>({});
  const [analytics, setAnalytics] = createSignal<Record<string, IntegrationAnalytics>>({});
  const [analyticsSite, setAnalyticsSite] = createSignal<Record<string, string>>({});
  const [expandedIntegration, setExpandedIntegration] = createSignal<string>();
  const [expandedWebhook, setExpandedWebhook] = createSignal<string>();
  const [showCreateIntegration, setShowCreateIntegration] = createSignal(false);
  const [showCreateWebhook, setShowCreateWebhook] = createSignal(false);
  const [integrationForm, setIntegrationForm] = createSignal({ name: "", base_url: "", api_key: "", site_id: "" });
  const [webhookForm, setWebhookForm] = createSignal({ url: "", secret: "", events: [] as string[], enabled: true });
  const [markerForm, setMarkerForm] = createSignal({ version: "", ref: "", environment: "", note: "" });
  const [createdSecret, setCreatedSecret] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  const [busy, setBusy] = createSignal<string>();
  const [message, setMessage] = createSignal("");
  const [error, setError] = createSignal("");

  const refresh = async () => {
    if (!props.projectID) return;
    setLoading(true);
    setError("");
    try {
      const [int, hooks] = await Promise.all([
        intSvc(props.demoMode).listIntegrations({ projectId: props.projectID }),
        hookSvc(props.demoMode).listWebhooks({ projectId: props.projectID }),
      ]);
      setIntegrations(int.items ?? []);
      setWebhooks(hooks.items ?? []);
    } catch (e) {
      setError(err(e));
    } finally {
      setLoading(false);
    }
  };

  createEffect(() => {
    if (props.projectID) void refresh();
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

  const createIntegration = (e: Event) => {
    e.preventDefault();
    const form = integrationForm();
    void run("create-integration", async () => {
      await intSvc(props.demoMode).createIntegration({
        projectId: props.projectID!,
        requestBody: {
          name: form.name.trim(),
          type: CreateIntegrationRequest.type.RYBBIT,
          base_url: form.base_url.trim(),
          api_key: form.api_key.trim() || undefined,
          site_id: form.site_id.trim() || undefined,
        },
      });
      setShowCreateIntegration(false);
      setIntegrationForm({ name: "", base_url: "", api_key: "", site_id: "" });
    }, "Integration created");
  };

  const testIntegration = (id: string) =>
    run(`test-${id}`, async () => {
      const res = await intSvc(props.demoMode).testIntegration({ projectId: props.projectID!, integrationId: id });
      setMessage(res.ok ? `Health check passed (${res.status_code ?? "—"})` : `Health check failed: ${res.error ?? "unknown"}`);
    });

  const deleteIntegration = (id: string) =>
    run(
      `del-int-${id}`,
      () => intSvc(props.demoMode).deleteIntegration({ projectId: props.projectID!, integrationId: id }),
      "Integration deleted",
    );

  const loadAnalytics = async (integration: Integration, site?: string) => {
    if (!props.projectID) return;
    setBusy(`analytics-${integration.id}`);
    setError("");
    try {
      const res = await intSvc(props.demoMode).getIntegrationAnalytics({
        projectId: props.projectID,
        integrationId: integration.id,
        site: site || analyticsSite()[integration.id] || integration.site_id || undefined,
        days: 30,
      });
      setAnalytics((c) => ({ ...c, [integration.id]: res }));
    } catch (e) {
      setError(err(e));
    } finally {
      setBusy(undefined);
    }
  };

  const toggleAnalytics = (integration: Integration) => {
    if (expandedIntegration() === integration.id) {
      setExpandedIntegration(undefined);
      return;
    }
    setExpandedIntegration(integration.id);
    void loadAnalytics(integration);
  };

  const createWebhook = (e: Event) => {
    e.preventDefault();
    const form = webhookForm();
    void run("create-webhook", async () => {
      const res = await hookSvc(props.demoMode).createWebhook({
        projectId: props.projectID!,
        requestBody: {
          url: form.url.trim(),
          secret: form.secret.trim() || undefined,
          events: form.events as Array<"issue.created" | "deploy.marker" | "webhook.test">,
          enabled: form.enabled,
        },
      });
      if (res.secret) setCreatedSecret(res.secret);
      setShowCreateWebhook(false);
      setWebhookForm({ url: "", secret: "", events: [], enabled: true });
    }, "Webhook created");
  };

  const toggleWebhook = (hook: Webhook) =>
    run(
      `toggle-${hook.id}`,
      () =>
        hookSvc(props.demoMode).updateWebhook({
          projectId: props.projectID!,
          webhookId: hook.id,
          requestBody: { enabled: !hook.enabled },
        }),
      hook.enabled ? "Webhook disabled" : "Webhook enabled",
    );

  const deleteWebhook = (id: string) =>
    run(
      `del-hook-${id}`,
      () => hookSvc(props.demoMode).deleteWebhook({ projectId: props.projectID!, webhookId: id }),
      "Webhook deleted",
    );

  const testWebhook = (id: string) =>
    run(
      `test-hook-${id}`,
      async () => {
        await hookSvc(props.demoMode).testWebhook({ projectId: props.projectID!, webhookId: id });
        await loadDeliveries(id);
      },
      "Test delivery queued",
    );

  const loadDeliveries = async (webhookId: string) => {
    if (!props.projectID) return;
    try {
      const res = await hookSvc(props.demoMode).listWebhookDeliveries({ projectId: props.projectID, webhookId, limit: 25 });
      setDeliveries((c) => ({ ...c, [webhookId]: res.items ?? [] }));
    } catch (e) {
      setError(err(e));
    }
  };

  const toggleDeliveries = (hook: Webhook) => {
    if (expandedWebhook() === hook.id) {
      setExpandedWebhook(undefined);
      return;
    }
    setExpandedWebhook(hook.id);
    void loadDeliveries(hook.id);
  };

  const recordMarker = (e: Event) => {
    e.preventDefault();
    const form = markerForm();
    void run(
      "marker",
      async () => {
        await hookSvc(props.demoMode).createDeployMarker({
          projectId: props.projectID!,
          requestBody: {
            version: form.version.trim() || undefined,
            ref: form.ref.trim() || undefined,
            environment: form.environment.trim() || undefined,
            note: form.note.trim() || undefined,
          },
        });
        setMarkerForm({ version: "", ref: "", environment: "", note: "" });
      },
      "Deploy marker recorded — deploy.marker fired",
    );
  };

  const toggleEvent = (ev: string) =>
    setWebhookForm((c) => ({
      ...c,
      events: c.events.includes(ev) ? c.events.filter((x) => x !== ev) : [...c.events, ev],
    }));

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Integrations</h1>
          <p class="page-description">External connectors and outbound webhooks for this project.</p>
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
            <strong>Webhook secret — shown once.</strong>
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
        <button class={`tab ${tab() === "integrations" ? "active" : ""}`} onClick={() => setTab("integrations")}>
          Connectors
        </button>
        <button class={`tab ${tab() === "webhooks" ? "active" : ""}`} onClick={() => setTab("webhooks")}>
          Webhooks
        </button>
      </div>

      <Show when={tab() === "integrations"}>
        <div class="card card-flush">
          <div class="card-header">
            <div class="flex-1">
              <div class="card-header-title">Connectors</div>
              <div class="card-header-description">
                External services attached to this project. Credentials are encrypted at rest and never leave the server.
              </div>
            </div>
            <Show when={props.canManage}>
              <button class="btn btn-primary btn-sm" onClick={() => setShowCreateIntegration(true)}>
                <IconPlus class="w-4 h-4" />
                Add connector
              </button>
            </Show>
          </div>
          <Show
            when={integrations().length > 0}
            fallback={
              <p class="text-text-2 text-sm p-4">
                No connectors yet. Add a Rybbit instance to pull analytics into this project.
              </p>
            }
          >
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Base URL</th>
                    <th>Status</th>
                    <th class="hidden md:table-cell">Last check</th>
                    <th style="text-align:right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={integrations()}>
                    {(item) => (
                      <>
                        <tr>
                          <td class="font-medium">{item.name}</td>
                          <td>
                            <Badge variant="primary">{item.type}</Badge>
                          </td>
                          <td class="text-text-2" style="max-width:12rem;overflow:hidden;text-overflow:ellipsis">{item.base_url}</td>
                          <td>
                            <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
                          </td>
                          <td class="hidden md:table-cell text-text-2">{fmtTime(item.last_health_at)}</td>
                          <td style="text-align:right;white-space:nowrap">
                            <Show when={item.type === "rybbit"}>
                              <button
                                class="btn btn-ghost btn-sm"
                                onClick={() => toggleAnalytics(item)}
                                disabled={busy() === `analytics-${item.id}`}
                              >
                                <IconChevronRight class={`w-4 h-4 ${expandedIntegration() === item.id ? "rotate-90" : ""}`} />
                                Analytics
                              </button>
                            </Show>
                            <button
                              class="btn btn-ghost btn-sm"
                              onClick={() => void testIntegration(item.id)}
                              disabled={busy() === `test-${item.id}`}
                            >
                              <IconPlay class="w-4 h-4" />
                              Test
                            </button>
                            <Show when={props.canManage}>
                              <button
                                class="btn btn-ghost btn-sm"
                                onClick={() => void deleteIntegration(item.id)}
                                disabled={busy() === `del-int-${item.id}`}
                              >
                                <IconTrash class="w-4 h-4" />
                              </button>
                            </Show>
                          </td>
                        </tr>
                        <Show when={expandedIntegration() === item.id}>
                          <tr>
                            <td colspan={6} style="padding:0">
                              <AnalyticsPanel
                                analytics={analytics()[item.id]}
                                loading={busy() === `analytics-${item.id}`}
                                site={analyticsSite()[item.id] ?? item.site_id ?? ""}
                                onSiteChange={(site) => {
                                  setAnalyticsSite((c) => ({ ...c, [item.id]: site }));
                                  void loadAnalytics(item, site);
                                }}
                              />
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

      <Show when={tab() === "webhooks"}>
        <div class="card card-flush">
          <div class="card-header">
            <div class="flex-1">
              <div class="card-header-title">Outbound webhooks</div>
              <div class="card-header-description">
                Primora signs each delivery with <code>X-Primora-Signature</code> (HMAC-SHA256 over the raw body).
              </div>
            </div>
            <Show when={props.canManage}>
              <button class="btn btn-primary btn-sm" onClick={() => setShowCreateWebhook(true)}>
                <IconPlus class="w-4 h-4" />
                Add webhook
              </button>
            </Show>
          </div>
          <Show
            when={webhooks().length > 0}
            fallback={
              <p class="text-text-2 text-sm p-4">
                No webhooks yet. Add an HTTPS endpoint to receive issue.created and deploy.marker events.
              </p>
            }
          >
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>Endpoint</th>
                    <th>Events</th>
                    <th>State</th>
                    <th style="text-align:right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <For each={webhooks()}>
                    {(hook) => (
                      <>
                        <tr>
                          <td class="font-medium" style="max-width:14rem;overflow:hidden;text-overflow:ellipsis">{hook.url}</td>
                          <td>
                            <Show when={hook.events.length > 0} fallback={<span class="text-text-2">all</span>}>
                              <For each={hook.events}>{(ev) => <Badge variant="neutral" class="mr-1">{ev}</Badge>}</For>
                            </Show>
                          </td>
                          <td>
                            <Badge variant={hook.enabled ? "success" : "neutral"}>
                              {hook.enabled ? "enabled" : "disabled"}
                            </Badge>
                          </td>
                          <td style="text-align:right;white-space:nowrap">
                            <button class="btn btn-ghost btn-sm" onClick={() => toggleDeliveries(hook)}>
                              <IconChevronRight class={`w-4 h-4 ${expandedWebhook() === hook.id ? "rotate-90" : ""}`} />
                              Deliveries
                            </button>
                            <button
                              class="btn btn-ghost btn-sm"
                              onClick={() => void testWebhook(hook.id)}
                              disabled={busy() === `test-hook-${hook.id}`}
                            >
                              <IconPlay class="w-4 h-4" />
                              Test
                            </button>
                            <Show when={props.canManage}>
                              <button
                                class="btn btn-ghost btn-sm"
                                onClick={() => void toggleWebhook(hook)}
                                disabled={busy() === `toggle-${hook.id}`}
                              >
                                {hook.enabled ? "Disable" : "Enable"}
                              </button>
                              <button
                                class="btn btn-ghost btn-sm"
                                onClick={() => void deleteWebhook(hook.id)}
                                disabled={busy() === `del-hook-${hook.id}`}
                              >
                                <IconTrash class="w-4 h-4" />
                              </button>
                            </Show>
                          </td>
                        </tr>
                        <Show when={expandedWebhook() === hook.id}>
                          <tr>
                            <td colspan={4} style="padding:0">
                              <DeliveriesPanel deliveries={deliveries()[hook.id]} />
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

        <Show when={props.canManage}>
          <div class="card mt-4">
            <div class="card-header">
              <div class="flex-1">
                <div class="card-header-title">Deploy marker</div>
                <div class="card-header-description">
                  Record a deployment and fire <code>deploy.marker</code> to subscribed webhooks.
                </div>
              </div>
            </div>
            <form onSubmit={recordMarker} class="grid gap-3 sm:grid-cols-2 p-4">
              <Input
                label="Version"
                placeholder="1.4.2"
                value={markerForm().version}
                onInput={(e) => setMarkerForm((c) => ({ ...c, version: e.currentTarget.value }))}
              />
              <Input
                label="Ref"
                placeholder="git sha or tag"
                value={markerForm().ref}
                onInput={(e) => setMarkerForm((c) => ({ ...c, ref: e.currentTarget.value }))}
              />
              <Input
                label="Environment"
                placeholder="production"
                value={markerForm().environment}
                onInput={(e) => setMarkerForm((c) => ({ ...c, environment: e.currentTarget.value }))}
              />
              <Input
                label="Note"
                placeholder="optional"
                value={markerForm().note}
                onInput={(e) => setMarkerForm((c) => ({ ...c, note: e.currentTarget.value }))}
              />
              <div class="sm:col-span-2">
                <button
                  type="submit"
                  class="btn btn-secondary"
                  disabled={busy() === "marker" || (!markerForm().version.trim() && !markerForm().ref.trim())}
                >
                  Record deploy marker
                </button>
              </div>
            </form>
          </div>
        </Show>
      </Show>

      <Modal open={showCreateIntegration()} onClose={() => setShowCreateIntegration(false)} title="Add connector" size="md">
        <form onSubmit={createIntegration} class="space-y-4">
          <Select label="Type" value="rybbit" disabled options={[{ value: "rybbit", label: "Rybbit — web analytics" }]} />
          <Input
            label="Name"
            placeholder="marketing-site"
            required
            value={integrationForm().name}
            onInput={(e) => setIntegrationForm((c) => ({ ...c, name: e.currentTarget.value }))}
          />
          <Input
            label="Base URL"
            placeholder="https://analytics.example.com"
            required
            value={integrationForm().base_url}
            onInput={(e) => setIntegrationForm((c) => ({ ...c, base_url: e.currentTarget.value }))}
          />
          <Input
            label="API key"
            type="password"
            placeholder="Stored encrypted — never shown again"
            value={integrationForm().api_key}
            onInput={(e) => setIntegrationForm((c) => ({ ...c, api_key: e.currentTarget.value }))}
          />
          <Input
            label="Site ID"
            placeholder="optional — defaults to the first site"
            value={integrationForm().site_id}
            onInput={(e) => setIntegrationForm((c) => ({ ...c, site_id: e.currentTarget.value }))}
          />
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" onClick={() => setShowCreateIntegration(false)}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={busy() === "create-integration"}>
              Create
            </button>
          </div>
        </form>
      </Modal>

      <Modal open={showCreateWebhook()} onClose={() => setShowCreateWebhook(false)} title="Add webhook" size="md">
        <form onSubmit={createWebhook} class="space-y-4">
          <Input
            label="Endpoint URL"
            placeholder="https://hooks.example.com/primora"
            required
            value={webhookForm().url}
            onInput={(e) => setWebhookForm((c) => ({ ...c, url: e.currentTarget.value }))}
          />
          <Input
            label="Secret"
            type="password"
            placeholder="Leave empty to generate"
            value={webhookForm().secret}
            onInput={(e) => setWebhookForm((c) => ({ ...c, secret: e.currentTarget.value }))}
          />
          <div>
            <span class="label">Events</span>
            <div class="flex gap-2 flex-wrap mt-1">
              <For each={EVENT_TYPES}>
                {(ev) => (
                  <button
                    type="button"
                    class={`btn btn-sm ${webhookForm().events.includes(ev) ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => toggleEvent(ev)}
                  >
                    {ev}
                  </button>
                )}
              </For>
            </div>
            <p class="text-text-2 text-xs mt-1">No selection means the endpoint receives every event.</p>
          </div>
          <div class="flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" onClick={() => setShowCreateWebhook(false)}>
              Cancel
            </button>
            <button type="submit" class="btn btn-primary" disabled={busy() === "create-webhook"}>
              Create
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function AnalyticsPanel(props: {
  analytics?: IntegrationAnalytics;
  loading: boolean;
  site: string;
  onSiteChange: (site: string) => void;
}) {
  const stats = () => props.analytics?.overview;
  const stat = (label: string, value?: number) => (
    <div class="stat-card">
      <span class="stat-label">{label}</span>
      <span class="stat-value">{fmtNum(value)}</span>
    </div>
  );
  return (
    <div class="p-4" style="background: var(--surface-2)">
      <Show when={props.loading}>
        <p class="text-text-2 text-sm">Loading analytics…</p>
      </Show>
      <Show when={!props.loading && props.analytics}>
        <Show when={(props.analytics?.sites?.length ?? 0) > 1}>
          <div class="mb-3" style="max-width:20rem">
            <Select label="Site" value={props.site} onChange={(e) => props.onSiteChange(e.currentTarget.value)}>
              <For each={props.analytics?.sites ?? []}>
                {(s) => (
                  <option value={s.site_id}>
                    {s.name}
                    {s.domain ? ` (${s.domain})` : ""}
                  </option>
                )}
              </For>
            </Select>
          </div>
        </Show>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {stat("Sessions", stats()?.sessions)}
          {stat("Pageviews", stats()?.pageviews)}
          {stat("Users", stats()?.users)}
          {stat("Pages/session", stats()?.pages_per_session)}
          {stat("Bounce %", stats()?.bounce_rate)}
          {stat("Session (s)", stats()?.session_duration)}
        </div>
        <div class="grid gap-3 sm:grid-cols-2 mt-3">
          <MetricTable title="Top pages" items={props.analytics?.top_pages} />
          <MetricTable title="Top referrers" items={props.analytics?.top_referrers} />
        </div>
      </Show>
      <Show when={!props.loading && !props.analytics}>
        <p class="text-text-2 text-sm">No analytics loaded.</p>
      </Show>
    </div>
  );
}

function MetricTable(props: { title: string; items?: { value: string; count: number; percentage?: number }[] }) {
  return (
    <div class="card card-flush">
      <div class="card-header">
        <div class="card-header-title">{props.title}</div>
      </div>
      <Show when={(props.items?.length ?? 0) > 0} fallback={<p class="text-text-2 text-sm p-3">No data in window.</p>}>
        <table class="table">
          <tbody>
            <For each={props.items}>
              {(item) => (
                <tr>
                  <td style="word-break:break-all">{item.value}</td>
                  <td class="text-text-2" style="text-align:right;white-space:nowrap">
                    {item.count.toLocaleString()}
                  </td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </div>
  );
}

function DeliveriesPanel(props: { deliveries?: WebhookDelivery[] }) {
  return (
    <div class="p-4" style="background: var(--surface-2)">
      <Show when={(props.deliveries?.length ?? 0) > 0} fallback={<p class="text-text-2 text-sm">No deliveries yet.</p>}>
        <table class="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Status</th>
              <th>Attempts</th>
              <th>HTTP</th>
              <th class="hidden md:table-cell">Error</th>
              <th class="hidden md:table-cell">Time</th>
            </tr>
          </thead>
          <tbody>
            <For each={props.deliveries}>
              {(d) => (
                <tr>
                  <td>
                    <code>{d.event_type}</code>
                  </td>
                  <td>
                    <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                  </td>
                  <td>{d.attempts}</td>
                  <td>{d.last_status_code ?? "—"}</td>
                  <td class="hidden md:table-cell text-text-2" style="max-width:16rem;overflow:hidden;text-overflow:ellipsis">
                    {d.last_error || "—"}
                  </td>
                  <td class="hidden md:table-cell text-text-2">{fmtTime(d.delivered_at ?? d.created_at)}</td>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </Show>
    </div>
  );
}
