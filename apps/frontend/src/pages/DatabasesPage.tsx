import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import {
  DatabasesService,
  CreateDBConnectionRequest,
  type DBConnection,
  type DBForeignKeyEdge,
  type DBMDTable,
  type DBObject,
  type DBQueryResponse,
  type DBXStatus,
} from "@primora/api-client";
import { demoService } from "../lib/demo-mode";
import { Badge } from "../components/Badge";
import { Modal, ModalFooter } from "../components/Modal";
import { Input, Select, Textarea } from "../components/Input";
import { errorMessage } from "../lib/api";
import {
  IconChevronRight,
  IconDatabases,
  IconPlay,
  IconPlus,
  IconRefresh,
  IconTerminal,
  IconTrash,
  IconZap,
} from "../components/Icons";

interface DatabasesPageProps {
  projectID?: string;
  canManage: boolean;
  demoMode: boolean;
}

type WorkspaceTab = "browse" | "query" | "graph" | "console";

interface ConnForm {
  name: string;
  db_type: string;
  host: string;
  port: string;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

const emptyForm: ConnForm = {
  name: "",
  db_type: "postgres",
  host: "",
  port: "",
  database: "",
  username: "",
  password: "",
  ssl: false,
};

const dbTypes = Object.values(CreateDBConnectionRequest.db_type);
const sqlish = (t?: string) => t !== "redis";

const err = (e: unknown) => errorMessage(e, String(e));

/* the demo service mirrors the generated DatabasesService call shapes */
const svc = (demo: boolean) =>
  (demo ? (demoService as unknown as typeof DatabasesService) : DatabasesService);

function ResultTable(props: { table: DBMDTable; onRow?: (row: string[]) => void }) {
  return (
    <div>
      <div class="table-container">
        <table class="table">
          <thead>
            <tr>
              <For each={props.table.columns}>{(col) => <th>{col}</th>}</For>
            </tr>
          </thead>
          <tbody>
            <For
              each={props.table.rows}
              fallback={
                <tr>
                  <td colspan={Math.max(1, props.table.columns.length)} class="py-8 text-center text-text-3">
                    No rows returned
                  </td>
                </tr>
              }
            >
              {(row) => (
                <tr
                  class={props.onRow ? "clickable" : ""}
                  onClick={() => props.onRow?.(row)}
                >
                  <For each={row}>
                    {(cell) => (
                      <td class="font-mono text-xs text-text-1 whitespace-nowrap" style="max-width:18rem;overflow:hidden;text-overflow:ellipsis">
                        {cell}
                      </td>
                    )}
                  </For>
                </tr>
              )}
            </For>
          </tbody>
        </table>
      </div>
      <Show when={props.table.note}>
        <p class="px-4 py-2 text-xs text-text-3">{props.table.note}</p>
      </Show>
    </div>
  );
}

/* SchemaGraph renders tables on a circle with FK edges as curved paths. */
function SchemaGraph(props: {
  nodes: string[];
  edges: DBForeignKeyEdge[];
  onPick: (table: string) => void;
}) {
  const W = 760;
  const H = 460;
  const cx = W / 2;
  const cy = H / 2;
  const [hover, setHover] = createSignal<string>();

  const positions = createMemo(() => {
    const m = new Map<string, { x: number; y: number }>();
    const n = props.nodes.length;
    const r = Math.min(195, Math.max(120, n * 18));
    props.nodes.forEach((name, i) => {
      const a = (i / n) * 2 * Math.PI - Math.PI / 2;
      m.set(name, { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    });
    return m;
  });

  const adjacent = (e: DBForeignKeyEdge) =>
    !!hover() && (e.table === hover() || e.ref_table === hover());

  const nodeW = (name: string) => Math.max(72, name.length * 7.2 + 20);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} class="w-full" style="display:block" role="img" aria-label="Schema graph">
      <defs>
        <marker
          id="fk-arrow"
          viewBox="0 0 10 10"
          refX="9"
          refY="5"
          markerWidth="7"
          markerHeight="7"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill="var(--text-3)" />
        </marker>
      </defs>
      <For each={props.edges}>
        {(e) => {
          const a = () => positions().get(e.table);
          const b = () => positions().get(e.ref_table);
          const path = () => {
            const pa = a();
            const pb = b();
            if (!pa || !pb) return "";
            if (e.table === e.ref_table) {
              return `M ${pa.x - 10} ${pa.y - 12} C ${pa.x - 34} ${pa.y - 46} ${pa.x + 34} ${pa.y - 46} ${pa.x + 10} ${pa.y - 12}`;
            }
            const mx = (pa.x + pb.x) / 2;
            const my = (pa.y + pb.y) / 2;
            const bx = mx + (my - cy) * 0.18;
            const by = my - (mx - cx) * 0.18;
            // pull the endpoint back to the node border so the arrow sits on it
            const dx = pb.x - bx;
            const dy = pb.y - by;
            const len = Math.hypot(dx, dy) || 1;
            const ex = pb.x - (dx / len) * (nodeW(e.ref_table) / 2 + 6);
            const ey = pb.y - (dy / len) * 18;
            return `M ${pa.x} ${pa.y} Q ${bx} ${by} ${ex} ${ey}`;
          };
          return (
            <Show when={a() && b()}>
              <path
                d={path()}
                fill="none"
                stroke={adjacent(e) ? "var(--accent)" : "var(--border-strong)"}
                stroke-width={adjacent(e) ? 2 : 1.2}
                marker-end="url(#fk-arrow)"
                opacity={hover() && !adjacent(e) ? 0.2 : 0.9}
              >
                <title>{`${e.table}.${e.column} → ${e.ref_table}.${e.ref_column}`}</title>
              </path>
            </Show>
          );
        }}
      </For>
      <For each={props.nodes}>
        {(name) => {
          const p = () => positions().get(name)!;
          const w = () => nodeW(name);
          return (
            <g
              transform={`translate(${p().x - w() / 2}, ${p().y - 13})`}
              style="cursor:pointer"
              onMouseEnter={() => setHover(name)}
              onMouseLeave={() => setHover(undefined)}
              onClick={() => props.onPick(name)}
            >
              <rect
                width={w()}
                height="26"
                rx="6"
                fill={hover() === name ? "var(--accent-muted)" : "var(--surface-2)"}
                stroke={hover() === name ? "var(--accent)" : "var(--border-strong)"}
                stroke-width="1"
              />
              <text
                x={w() / 2}
                y="17"
                text-anchor="middle"
                font-size="11"
                font-family="monospace"
                fill={hover() === name ? "var(--accent)" : "var(--text-1)"}
              >
                {name}
              </text>
            </g>
          );
        }}
      </For>
    </svg>
  );
}

export function DatabasesPage(props: DatabasesPageProps) {
  const [status, setStatus] = createSignal<DBXStatus | null>(null);
  const [conns, setConns] = createSignal<DBConnection[]>([]);
  const [activeID, setActiveID] = createSignal<string>();
  const [loading, setLoading] = createSignal(true);
  const [error, setError] = createSignal("");
  const [message, setMessage] = createSignal("");

  const [tab, setTab] = createSignal<WorkspaceTab>("browse");
  const [databases, setDatabases] = createSignal<string[]>([]);
  const [selectedDB, setSelectedDB] = createSignal("");
  const [schemaInput, setSchemaInput] = createSignal("");
  const [appliedSchema, setAppliedSchema] = createSignal("");
  const [tables, setTables] = createSignal<DBObject[] | null>(null);
  const [tablesRaw, setTablesRaw] = createSignal("");
  const [browseBusy, setBrowseBusy] = createSignal(false);
  const [described, setDescribed] = createSignal<{ name: string; table?: DBMDTable; raw?: string }>();
  const [describeBusy, setDescribeBusy] = createSignal(false);

  const [edges, setEdges] = createSignal<DBForeignKeyEdge[]>([]);
  const [edgesNote, setEdgesNote] = createSignal("");
  const [graphBusy, setGraphBusy] = createSignal(false);
  const [graphKey, setGraphKey] = createSignal("");

  const [sql, setSql] = createSignal("SELECT 1;");
  const [queryResult, setQueryResult] = createSignal<DBQueryResponse>();
  const [queryBusy, setQueryBusy] = createSignal(false);

  const [redisCmd, setRedisCmd] = createSignal("");
  const [consoleLog, setConsoleLog] = createSignal<{ cmd: string; out: string }[]>([]);
  const [consoleBusy, setConsoleBusy] = createSignal(false);

  const [detailRow, setDetailRow] = createSignal<{ columns: string[]; row: string[] }>();
  const [addOpen, setAddOpen] = createSignal(false);
  const [confirmDelete, setConfirmDelete] = createSignal<string>();
  const [form, setForm] = createSignal<ConnForm>({ ...emptyForm });
  const [addBusy, setAddBusy] = createSignal(false);
  const [testBusy, setTestBusy] = createSignal("");

  const active = createMemo(() => conns().find((c) => c.id === activeID()));

  const load = async () => {
    if (!props.projectID) return;
    setLoading(true);
    setError("");
    try {
      const [st, list] = await Promise.all([
        svc(props.demoMode).getDbxStatus(),
        svc(props.demoMode).listDbConnections({ projectId: props.projectID }),
      ]);
      setStatus(st);
      setConns(list.items);
      const first = list.items.find((c) => c.id === activeID()) ?? list.items[0];
      if (first) void select(first.id);
    } catch (e) {
      setError(err(e));
    } finally {
      setLoading(false);
    }
  };

  const loadTables = async (conn: DBConnection, database: string, schema: string) => {
    setBrowseBusy(true);
    try {
      const r = await svc(props.demoMode).listDbTables({
        projectId: props.projectID!,
        connectionId: conn.id,
        database: database || undefined,
        schema: schema || undefined,
      });
      setTables(r.tables ?? null);
      setTablesRaw(r.raw ?? "");
    } catch (e) {
      setError(err(e));
      setTables(null);
    } finally {
      setBrowseBusy(false);
    }
  };

  const select = async (id: string) => {
    setActiveID(id);
    setError("");
    setDatabases([]);
    setSelectedDB("");
    setSchemaInput("");
    setAppliedSchema("");
    setTables(null);
    setTablesRaw("");
    setDescribed(undefined);
    setQueryResult(undefined);
    setConsoleLog([]);
    setEdges([]);
    setEdgesNote("");
    setGraphKey("");
    const conn = conns().find((c) => c.id === id);
    if (!conn) return;
    if (!sqlish(conn.db_type)) {
      setTab("console");
      return;
    }
    setTab("browse");
    setBrowseBusy(true);
    try {
      const dbs = await svc(props.demoMode).listDbDatabases({
        projectId: props.projectID!,
        connectionId: conn.id,
      });
      setDatabases(dbs.databases);
      const db =
        conn.database && dbs.databases.includes(conn.database)
          ? conn.database
          : (dbs.databases[0] ?? conn.database ?? "");
      setSelectedDB(db);
      await loadTables(conn, db, "");
    } catch (e) {
      setError(err(e));
    } finally {
      setBrowseBusy(false);
    }
  };

  const describe = async (name: string) => {
    const conn = active();
    if (!conn) return;
    setDescribeBusy(true);
    try {
      const r = await svc(props.demoMode).describeDbTable({
        projectId: props.projectID!,
        connectionId: conn.id,
        table: name,
        database: selectedDB() || undefined,
        schema: appliedSchema() || undefined,
      });
      setDescribed({ name, table: r.table, raw: r.raw });
    } catch (e) {
      setError(err(e));
    } finally {
      setDescribeBusy(false);
    }
  };

  const loadGraph = async () => {
    const conn = active();
    if (!conn) return;
    const key = `${conn.id}|${selectedDB()}|${appliedSchema()}`;
    if (graphKey() === key) return;
    setGraphBusy(true);
    setError("");
    try {
      if (!tables()) {
        await loadTables(conn, selectedDB(), appliedSchema());
      }
      const r = await svc(props.demoMode).listDbForeignKeys({
        projectId: props.projectID!,
        connectionId: conn.id,
        database: selectedDB() || undefined,
        schema: appliedSchema() || undefined,
      });
      setEdges(r.edges ?? []);
      setEdgesNote(r.note ?? r.raw ?? "");
      setGraphKey(key);
    } catch (e) {
      setError(err(e));
    } finally {
      setGraphBusy(false);
    }
  };

  const graphNodes = createMemo(() => {
    const names = new Set<string>((tables() ?? []).map((t) => t.name));
    for (const e of edges()) {
      names.add(e.table);
      names.add(e.ref_table);
    }
    return [...names].sort();
  });

  const runQuery = async () => {
    const conn = active();
    if (!conn || !sql().trim()) return;
    setQueryBusy(true);
    setError("");
    try {
      const r = await svc(props.demoMode).executeDbQuery({
        projectId: props.projectID!,
        connectionId: conn.id,
        requestBody: { sql: sql(), database: selectedDB() || undefined },
      });
      setQueryResult(r);
    } catch (e) {
      setError(err(e));
    } finally {
      setQueryBusy(false);
    }
  };

  const runRedis = async () => {
    const conn = active();
    const cmd = redisCmd().trim();
    if (!conn || !cmd) return;
    setConsoleBusy(true);
    setError("");
    try {
      const r = await svc(props.demoMode).executeDbRedisCommand({
        projectId: props.projectID!,
        connectionId: conn.id,
        requestBody: { command: cmd },
      });
      setConsoleLog((l) => [{ cmd, out: r.output }, ...l]);
      setRedisCmd("");
    } catch (e) {
      setError(err(e));
    } finally {
      setConsoleBusy(false);
    }
  };

  const createConnection = async () => {
    const f = form();
    if (!f.name.trim() || !f.host.trim()) return;
    setAddBusy(true);
    try {
      await svc(props.demoMode).createDbConnection({
        projectId: props.projectID!,
        requestBody: {
          name: f.name.trim(),
          db_type: f.db_type as CreateDBConnectionRequest.db_type,
          host: f.host.trim(),
          port: f.port ? Number(f.port) : undefined,
          database: f.database.trim() || undefined,
          username: f.username.trim() || undefined,
          password: f.password || undefined,
          ssl: f.ssl || undefined,
        },
      });
      setAddOpen(false);
      setForm({ ...emptyForm });
      setMessage("Connection added");
      await load();
    } catch (e) {
      setError(err(e));
    } finally {
      setAddBusy(false);
    }
  };

  const removeConnection = async (id: string) => {
    try {
      await svc(props.demoMode).deleteDbConnection({
        projectId: props.projectID!,
        connectionId: id,
      });
      setMessage("Connection removed");
      if (activeID() === id) setActiveID(undefined);
      await load();
    } catch (e) {
      setError(err(e));
    }
  };

  const testConnection = async (conn: DBConnection) => {
    setTestBusy(conn.id);
    setError("");
    setMessage("");
    try {
      const r = await svc(props.demoMode).testDbConnection({
        projectId: props.projectID!,
        connectionId: conn.id,
      });
      if (r.ok) setMessage(`${conn.name}: connection OK`);
      else setError(`${conn.name}: ${r.error ?? "connection failed"}`);
    } catch (e) {
      setError(`${conn.name}: ${err(e)}`);
    } finally {
      setTestBusy("");
    }
  };

  createEffect(() => {
    if (props.projectID) void load();
  });

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Databases</h1>
          <p class="page-description">
            Saved connections backed by DBX — browse schemas, inspect tables, and run queries.
          </p>
        </div>
        <div class="page-actions">
          <button
            class="btn btn-primary"
            onClick={() => setAddOpen(true)}
            disabled={!props.canManage}
          >
            <IconPlus class="w-4 h-4" />
            Add connection
          </button>
        </div>
      </div>

      <Show when={status() && !status()!.available}>
        <div class="message message-error">
          DBX is not available: {status()!.reason ?? "unknown reason"}
          <Show when={status()!.install}>
            <span> — install: {status()!.install}</span>
          </Show>
        </div>
      </Show>
      <Show when={error()}>
        <div class="message message-error">{error()}</div>
      </Show>
      <Show when={message()}>
        <div class="message message-neutral">{message()}</div>
      </Show>

      <div class="storage-grid">
        {/* connections */}
        <div class="card card-flush">
          <div
            class="card-header"
            style="padding:1rem 1rem 0.75rem;margin-bottom:0;border-bottom:1px solid var(--border)"
          >
            <span class="card-header-title">Connections</span>
          </div>
          <div class="p-1.5">
            <For
              each={conns()}
              fallback={
                <div class="p-4 text-center">
                  <p class="text-xs text-text-3">
                    {loading() ? "Loading…" : "No connections yet"}
                  </p>
                </div>
              }
            >
              {(conn) => (
                <button
                  class={`nav-item w-full ${conn.id === activeID() ? "active" : ""}`}
                  onClick={() => void select(conn.id)}
                >
                  <IconDatabases class="w-4 h-4" />
                  <span class="flex-1 truncate">{conn.name}</span>
                  <Badge variant={conn.is_managed ? "primary" : "neutral"}>{conn.db_type}</Badge>
                </button>
              )}
            </For>
          </div>
        </div>

        {/* workspace */}
        <div class="card card-flush" style="min-height:28rem">
          <Show
            when={active()}
            fallback={
              <div class="empty-state" style="min-height:28rem">
                <div class="empty-state-icon">
                  <IconDatabases class="w-5 h-5" />
                </div>
                <p class="empty-state-title">Select a connection</p>
                <p class="empty-state-description">
                  Choose a connection on the left to browse its databases and tables.
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
                    <span class="card-header-title">{active()!.name}</span>
                    <Show when={active()!.is_managed}>
                      <Badge variant="primary">managed</Badge>
                    </Show>
                  </div>
                  <span class="card-header-description">
                    {active()!.db_type}
                    {active()!.host ? ` · ${active()!.host}` : ""}
                    {active()!.port ? `:${active()!.port}` : ""}
                    {active()!.database ? ` / ${active()!.database}` : ""}
                  </span>
                </div>
                <div class="flex items-center gap-2">
                  <button
                    class="btn btn-secondary btn-sm"
                    onClick={() => void testConnection(active()!)}
                    disabled={testBusy() === active()!.id}
                  >
                    <IconZap class="w-3.5 h-3.5" />
                    {testBusy() === active()!.id ? "Testing…" : "Test"}
                  </button>
                  <Show when={!active()!.is_managed}>
                    <button
                      class="icon-btn"
                      title="Delete connection"
                      onClick={() => setConfirmDelete(active()!.id)}
                      disabled={!props.canManage}
                    >
                      <IconTrash class="w-4 h-4" />
                    </button>
                  </Show>
                </div>
              </div>
            </div>

            {/* tabs */}
            <div class="flex items-center gap-1 px-4 pt-3 border-b" style="border-color:var(--border)">
              <Show when={sqlish(active()!.db_type)}>
                <button
                  class={`btn btn-ghost btn-sm ${tab() === "browse" ? "text-accent" : ""}`}
                  onClick={() => setTab("browse")}
                >
                  Browse
                </button>
                <button
                  class={`btn btn-ghost btn-sm ${tab() === "query" ? "text-accent" : ""}`}
                  onClick={() => setTab("query")}
                >
                  Query
                </button>
                <button
                  class={`btn btn-ghost btn-sm ${tab() === "graph" ? "text-accent" : ""}`}
                  onClick={() => {
                    setTab("graph");
                    void loadGraph();
                  }}
                >
                  Graph
                </button>
              </Show>
              <Show when={!sqlish(active()!.db_type)}>
                <button class="btn btn-ghost btn-sm text-accent">
                  <IconTerminal class="w-3.5 h-3.5" />
                  Console
                </button>
              </Show>
            </div>

            {/* browse tab */}
            <Show when={tab() === "browse" && sqlish(active()!.db_type)}>
              <div class="flex items-end gap-2 px-4 pt-3 flex-wrap">
                <div style="min-width:10rem">
                  <span class="label">Database</span>
                  <Select
                    class="input-sm"
                    value={selectedDB()}
                    onChange={(e) => {
                      setSelectedDB(e.currentTarget.value);
                      setDescribed(undefined);
                      void loadTables(active()!, e.currentTarget.value, appliedSchema());
                    }}
                  >
                    <For each={databases()}>{(d) => <option value={d}>{d}</option>}</For>
                  </Select>
                </div>
                <div style="width:9rem">
                  <span class="label">Schema</span>
                  <Input
                    class="input-sm"
                    placeholder="default"
                    value={schemaInput()}
                    onInput={(e) => setSchemaInput(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        setAppliedSchema(schemaInput().trim());
                        setDescribed(undefined);
                        void loadTables(active()!, selectedDB(), schemaInput().trim());
                      }
                    }}
                  />
                </div>
                <button
                  class="icon-btn"
                  title="Refresh tables"
                  disabled={browseBusy()}
                  onClick={() => {
                    setAppliedSchema(schemaInput().trim());
                    setDescribed(undefined);
                    void loadTables(active()!, selectedDB(), schemaInput().trim());
                  }}
                >
                  <IconRefresh class="w-4 h-4" />
                </button>
              </div>

              <div class="table-container mt-2">
                <table class="table">
                  <thead>
                    <tr>
                      <th>Table</th>
                      <th style="width:1%">Kind</th>
                      <th style="width:1%" />
                    </tr>
                  </thead>
                  <tbody>
                    <For
                      each={tables() ?? []}
                      fallback={
                        <tr>
                          <td colspan={3} class="py-10 text-center text-text-3">
                            {browseBusy()
                              ? "Loading…"
                              : tablesRaw() ||
                                "No tables found. Pick a database or enter a schema name."}
                          </td>
                        </tr>
                      }
                    >
                      {(t) => (
                        <tr
                          class={`clickable ${described()?.name === t.name ? "bg-surface-2" : ""}`}
                          onClick={() => void describe(t.name)}
                        >
                          <td class="font-mono text-xs text-text-1">{t.name}</td>
                          <td class="text-xs text-text-3 whitespace-nowrap">{t.kind}</td>
                          <td>
                            <IconChevronRight class="w-4 h-4 text-text-3" />
                          </td>
                        </tr>
                      )}
                    </For>
                  </tbody>
                </table>
              </div>

              <Show when={described()}>
                <div class="px-4 py-3 border-t" style="border-color:var(--border)">
                  <div class="flex items-center gap-2 mb-2">
                    <span class="text-sm font-medium text-text-1">{described()!.name}</span>
                    <Show when={describeBusy()}>
                      <span class="text-xs text-text-3">loading…</span>
                    </Show>
                  </div>
                  <Show
                    when={described()!.table}
                    fallback={
                      <pre class="text-xs text-text-2 whitespace-pre-wrap font-mono">
                        {described()!.raw ?? "No column metadata returned."}
                      </pre>
                    }
                  >
                    {(t) => <ResultTable table={t()} />}
                  </Show>
                </div>
              </Show>
            </Show>

            {/* schema graph tab */}
            <Show when={tab() === "graph" && sqlish(active()!.db_type)}>
              <Show
                when={!graphBusy()}
                fallback={<p class="p-6 text-xs text-text-3">Building graph…</p>}
              >
                <Show
                  when={graphNodes().length > 0}
                  fallback={
                    <p class="p-6 text-xs text-text-3">
                      {edgesNote() || "No tables in scope — pick a database first."}
                    </p>
                  }
                >
                  <SchemaGraph
                    nodes={graphNodes()}
                    edges={edges()}
                    onPick={(t) => {
                      setTab("browse");
                      void describe(t);
                    }}
                  />
                  <p class="px-4 pb-3 text-xs text-text-3">
                    {edges().length} foreign key{edges().length === 1 ? "" : "s"} · click a table to inspect it
                    <Show when={edgesNote()}> · {edgesNote()}</Show>
                  </p>
                </Show>
              </Show>
            </Show>

            {/* query tab */}
            <Show when={tab() === "query" && sqlish(active()!.db_type)}>
              <div class="px-4 pt-3">
                <Textarea
                  class="font-mono text-sm"
                  rows={5}
                  value={sql()}
                  onInput={(e) => setSql(e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                      e.preventDefault();
                      void runQuery();
                    }
                  }}
                  placeholder="SELECT * FROM …"
                />
                <div class="flex items-center gap-2 mt-2">
                  <button
                    class="btn btn-primary btn-sm"
                    onClick={() => void runQuery()}
                    disabled={queryBusy() || !sql().trim()}
                  >
                    <IconPlay class="w-3.5 h-3.5" />
                    {queryBusy() ? "Running…" : "Run query"}
                  </button>
                  <span class="text-xs text-text-3">⌘/Ctrl + Enter</span>
                </div>
              </div>
              <Show when={queryResult()}>
                <div class="mt-3 border-t" style="border-color:var(--border)">
                  <Show
                    when={queryResult()!.table}
                    fallback={
                      <pre class="p-4 text-xs text-text-2 whitespace-pre-wrap font-mono">
                        {queryResult()!.raw ?? "No result returned."}
                      </pre>
                    }
                  >
                    {(t) => (
                      <ResultTable
                        table={t()}
                        onRow={(row) => setDetailRow({ columns: t().columns, row })}
                      />
                    )}
                  </Show>
                </div>
              </Show>
            </Show>

            {/* redis console */}
            <Show when={tab() === "console" || !sqlish(active()!.db_type)}>
              <div class="px-4 pt-3">
                <div class="flex items-center gap-2">
                  <Input
                    class="input-sm font-mono flex-1"
                    placeholder="PING, GET key, INFO…"
                    value={redisCmd()}
                    onInput={(e) => setRedisCmd(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void runRedis();
                    }}
                  />
                  <button
                    class="btn btn-primary btn-sm"
                    onClick={() => void runRedis()}
                    disabled={consoleBusy() || !redisCmd().trim()}
                  >
                    <IconPlay class="w-3.5 h-3.5" />
                    Run
                  </button>
                </div>
              </div>
              <div class="p-4 space-y-3">
                <For
                  each={consoleLog()}
                  fallback={<p class="text-xs text-text-3">Run a command to see output here.</p>}
                >
                  {(entry) => (
                    <div>
                      <div class="font-mono text-xs text-accent">$ {entry.cmd}</div>
                      <pre class="font-mono text-xs text-text-2 whitespace-pre-wrap mt-1">
                        {entry.out}
                      </pre>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </div>
      </div>

      {/* row detail */}
      <Modal
        open={!!detailRow()}
        onClose={() => setDetailRow(undefined)}
        title="Row detail"
        size="lg"
      >
        <div class="table-container">
          <table class="table">
            <tbody>
              <For each={detailRow()?.columns ?? []}>
                {(col, i) => (
                  <tr>
                    <td class="font-mono text-xs text-text-3 whitespace-nowrap">{col}</td>
                    <td class="font-mono text-xs text-text-1 whitespace-pre-wrap">
                      {detailRow()!.row[i()]}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Modal>

      {/* add connection */}
      <Modal
        open={addOpen()}
        onClose={() => setAddOpen(false)}
        error={error()}
        title="Add connection"
        description="Credentials are stored server-side and never sent back to the browser."
      >
        <div class="space-y-4">
          <div>
            <span class="label">Name</span>
            <Input
              placeholder="analytics-replica"
              value={form().name}
              onInput={(e) => setForm((f) => ({ ...f, name: e.currentTarget.value }))}
            />
          </div>
          <div>
            <span class="label">Type</span>
            <Select
              value={form().db_type}
              onChange={(e) => setForm((f) => ({ ...f, db_type: e.currentTarget.value }))}
            >
              <For each={dbTypes}>{(t) => <option value={t}>{t}</option>}</For>
            </Select>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div class="col-span-2">
              <span class="label">{form().db_type === "sqlite" ? "File path" : "Host"}</span>
              <Input
                placeholder={form().db_type === "sqlite" ? "/data/app.db" : "db.internal"}
                value={form().host}
                onInput={(e) => setForm((f) => ({ ...f, host: e.currentTarget.value }))}
              />
            </div>
            <div>
              <span class="label">Port</span>
              <Input
                placeholder="5432"
                inputmode="numeric"
                value={form().port}
                onInput={(e) => setForm((f) => ({ ...f, port: e.currentTarget.value }))}
              />
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <span class="label">Database</span>
              <Input
                value={form().database}
                onInput={(e) => setForm((f) => ({ ...f, database: e.currentTarget.value }))}
              />
            </div>
            <div>
              <span class="label">Username</span>
              <Input
                value={form().username}
                onInput={(e) => setForm((f) => ({ ...f, username: e.currentTarget.value }))}
              />
            </div>
          </div>
          <div>
            <span class="label">Password</span>
            <Input
              type="password"
              value={form().password}
              onInput={(e) => setForm((f) => ({ ...f, password: e.currentTarget.value }))}
            />
          </div>
          <label class="flex items-center gap-2 text-sm text-text-2">
            <input
              type="checkbox"
              checked={form().ssl}
              onChange={(e) => setForm((f) => ({ ...f, ssl: e.currentTarget.checked }))}
            />
            Require SSL
          </label>
        </div>
        <ModalFooter>
          <button class="btn btn-ghost" onClick={() => setAddOpen(false)}>
            Cancel
          </button>
          <button
            class="btn btn-primary"
            onClick={() => void createConnection()}
            disabled={addBusy() || !form().name.trim() || !form().host.trim()}
          >
            {addBusy() ? "Adding…" : "Add connection"}
          </button>
        </ModalFooter>
      </Modal>

      {/* delete confirm */}
      <Modal
        open={!!confirmDelete()}
        onClose={() => setConfirmDelete(undefined)}
        error={error()}
        title="Delete connection"
        size="sm"
      >
        <p class="text-sm text-text-2">
          This removes the saved connection and its DBX profile. This cannot be undone.
        </p>
        <ModalFooter>
          <button class="btn btn-ghost" onClick={() => setConfirmDelete(undefined)}>
            Cancel
          </button>
          <button
            class="btn btn-danger"
            onClick={() => {
              const id = confirmDelete();
              setConfirmDelete(undefined);
              if (id) void removeConnection(id);
            }}
          >
            Delete permanently
          </button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
