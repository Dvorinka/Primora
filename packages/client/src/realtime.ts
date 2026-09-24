// Realtime subscriptions over the project's SSE domain-event stream
// (GET /api/v1/projects/:id/realtime/stream). EventSource can't send auth
// headers, so the stream is consumed via fetch + ReadableStream.
//
// Presence: the server broadcasts `presence.update` {online: n} on every
// subscriber join/leave — subscribe via channel("presence").on("update").
// Client-broadcast: publish() emits a custom.* event through the server
// fan-out (webhooks and event_pattern functions fire too).

export interface RealtimeEvent {
  /** e.g. "document.created", "object.deleted", "issue.created", "deploy.marker" */
  type: string;
  occurred_at: string;
  data: Record<string, unknown>;
}

export type RealtimeState = "connecting" | "open" | "reconnecting" | "closed";

export interface RealtimeClientOptions {
  /** Primora deployment origin, e.g. http://localhost:8090 */
  endpoint: string;
  /** project API key (prm_…) — sent as X-API-Key */
  key: string;
  projectId: string;
  onStateChange?: (state: RealtimeState) => void;
}

export type RealtimeHandler = (event: RealtimeEvent) => void;

export interface RealtimeChannel {
  /**
   * `on("created", cb)` matches `<channel>.created`; `on("*")` every event in
   * the channel; a full type like `"document.created"` also works.
   * Returns an unsubscribe function.
   */
  on(event: string, handler: RealtimeHandler): () => void;
}

export interface RealtimeClient {
  /**
   * Channel names are event namespaces — "document", "object", "issue",
   * "deploy", or "*" for everything. A trailing "s" is dropped so
   * `channel("documents")` and `channel("document")` are equivalent.
   */
  channel(name: string): RealtimeChannel;
  /**
   * Publishes a `custom.*` event to the project — realtime subscribers,
   * matching webhooks, and event_pattern functions all receive it.
   */
  publish(type: string, data?: Record<string, unknown>): Promise<void>;
  /** Current count of clients subscribed to the project's realtime stream. */
  presence(): Promise<number>;
  close(): void;
  readonly state: RealtimeState;
}

interface Listener {
  prefix: string;
  pattern: string;
  handler: RealtimeHandler;
}

export function createRealtimeClient(opts: RealtimeClientOptions): RealtimeClient {
  const url =
    opts.endpoint.replace(/\/$/, "") +
    `/api/v1/projects/${encodeURIComponent(opts.projectId)}/realtime/stream`;

  const listeners = new Set<Listener>();
  const abort = new AbortController();
  let state: RealtimeState = "connecting";

  const setState = (s: RealtimeState) => {
    state = s;
    opts.onStateChange?.(s);
  };

  const dispatch = (evt: RealtimeEvent) => {
    for (const l of listeners) {
      const match =
        l.pattern === "*"
          ? evt.type.startsWith(l.prefix)
          : l.pattern.includes(".")
            ? evt.type === l.pattern
            : evt.type === l.prefix + l.pattern;
      if (match) {
        try {
          l.handler(evt);
        } catch {
          // a throwing listener must not kill the stream
        }
      }
    }
  };

  // Minimal SSE frame parser — we only need `data:` lines.
  async function readStream(res: Response): Promise<void> {
    if (!res.body) throw new Error("no response body");
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      buf += dec.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) >= 0) {
        const frame = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        for (const line of frame.split("\n")) {
          if (!line.startsWith("data:")) continue;
          try {
            dispatch(JSON.parse(line.slice(5).trim()) as RealtimeEvent);
          } catch {
            // keepalive pings and malformed frames are ignored
          }
        }
      }
    }
  }

  (async () => {
    let attempt = 0;
    while (!abort.signal.aborted) {
      try {
        setState(attempt === 0 ? "connecting" : "reconnecting");
        const res = await fetch(url, {
          headers: { "X-API-Key": opts.key, Accept: "text/event-stream" },
          signal: abort.signal,
        });
        if (!res.ok) throw new Error(`realtime stream: HTTP ${res.status}`);
        setState("open");
        attempt = 0;
        await readStream(res);
      } catch (err) {
        if (abort.signal.aborted) break;
      }
      // stream ended or failed — back off, capped at 30 s
      const delay = Math.min(1000 * 2 ** attempt++, 30000);
      await new Promise((r) => setTimeout(r, delay));
    }
  })().finally(() => setState("closed"));

  return {
    channel(name) {
      const prefix = name === "*" ? "" : name.replace(/s$/, "") + ".";
      return {
        on(event, handler) {
          const l: Listener = { prefix, pattern: event, handler };
          listeners.add(l);
          return () => listeners.delete(l);
        },
      };
    },
    async publish(type, data = {}) {
      const res = await fetch(
        opts.endpoint.replace(/\/$/, "") +
          `/api/v1/projects/${encodeURIComponent(opts.projectId)}/events`,
        {
          method: "POST",
          headers: { "X-API-Key": opts.key, "Content-Type": "application/json" },
          body: JSON.stringify({ type, data }),
        },
      );
      if (!res.ok) throw new Error(`publish event: HTTP ${res.status}`);
    },
    async presence() {
      const res = await fetch(
        opts.endpoint.replace(/\/$/, "") +
          `/api/v1/projects/${encodeURIComponent(opts.projectId)}/realtime/presence`,
        { headers: { "X-API-Key": opts.key } },
      );
      if (!res.ok) throw new Error(`presence: HTTP ${res.status}`);
      return ((await res.json()) as { online: number }).online;
    },
    close: () => abort.abort(),
    get state() {
      return state;
    },
  };
}
