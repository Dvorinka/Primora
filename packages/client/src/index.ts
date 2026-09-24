export type PrimoraEventType = "error" | "metric" | "log" | "heartbeat" | "event";

export {
  createRealtimeClient,
  type RealtimeChannel,
  type RealtimeClient,
  type RealtimeClientOptions,
  type RealtimeEvent,
  type RealtimeHandler,
  type RealtimeState,
} from "./realtime.js";
export type PrimoraComponentKind =
  | "frontend" | "backend" | "database" | "android" | "desktop" | "web" | "other";

export interface PrimoraClientOptions {
  /** Primora deployment origin, e.g. http://localhost — /api/v1/ingest is appended */
  endpoint: string;
  /** project API key (prm_…) sent as X-Primora-Key */
  key: string;
  /** component name reported with every event */
  component: string;
  /** component kind used when auto-registering */
  kind?: PrimoraComponentKind;
  /** extra fields merged into every event payload (release, env, user opt-in flags…) */
  base?: Record<string, unknown>;
  /** batch flush interval ms (default 5000) */
  flushInterval?: number;
}

interface QueuedEvent {
  type: PrimoraEventType;
  severity?: string;
  message?: string;
  payload?: Record<string, unknown>;
  ts: string;
}

export interface PrimoraClient {
  captureError(err: unknown, extra?: Record<string, unknown>): void;
  captureMetric(m: { name: string; value: number; unit?: string } & Record<string, unknown>): void;
  captureLog(level: string, message: string, attrs?: Record<string, unknown>): void;
  captureEvent(message: string, payload?: Record<string, unknown>): void;
  heartbeat(status?: "up" | "degraded" | "down", meta?: Record<string, unknown>): void;
  /** attach window.onerror + unhandledrejection (browser only) */
  installAuto(): void;
  flush(): void;
}

export function createPrimoraClient(opts: PrimoraClientOptions): PrimoraClient {
  const endpoint = opts.endpoint.replace(/\/$/, "") + "/api/v1/ingest";
  const queue: QueuedEvent[] = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  const push = (e: QueuedEvent) => {
    queue.push(e);
    if (!timer) {
      timer = setTimeout(flush, opts.flushInterval ?? 5000);
    }
  };

  function flush() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (!queue.length) return;
    const events = queue.splice(0, queue.length).map((e) => ({
      ...e,
      component: opts.component,
      kind: opts.kind,
      payload: { ...opts.base, ...e.payload },
    }));
    const body = JSON.stringify({ events });
    // fetch + keepalive survives page unload; sendBeacon can't set X-Primora-Key so it isn't used.
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Primora-Key": opts.key },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  const client: PrimoraClient = {
    captureError(err, extra) {
      const e = err instanceof Error ? err : new Error(String(err));
      push({
        type: "error",
        severity: "error",
        message: e.message,
        payload: { stack: e.stack, name: e.name, ...extra },
        ts: new Date().toISOString(),
      });
    },
    captureMetric(m) {
      const { name, value, unit, ...rest } = m;
      push({ type: "metric", payload: { name, value, unit, ...rest }, ts: new Date().toISOString() });
    },
    captureLog(level, message, attrs) {
      push({ type: "log", severity: level, message, payload: attrs, ts: new Date().toISOString() });
    },
    captureEvent(message, payload) {
      push({ type: "event", message, payload, ts: new Date().toISOString() });
    },
    heartbeat(status = "up", meta) {
      push({ type: "heartbeat", payload: { status, ...meta }, ts: new Date().toISOString() });
      flush();
    },
    installAuto() {
      if (typeof window === "undefined") return;
      window.addEventListener("error", (ev) => client.captureError(ev.error ?? ev.message));
      window.addEventListener("unhandledrejection", (ev) => client.captureError(ev.reason));
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "hidden") flush();
      });
    },
    flush,
  };
  return client;
}
