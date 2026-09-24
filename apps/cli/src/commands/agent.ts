import { spawn } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { Readable } from "node:stream";

import { CliError } from "../http.js";
import { dim } from "../out.js";
import { unlockVault, type VaultPasswordOptions } from "./vault.js";

/**
 * `primora agent` — loopback credential broker. Wraps one child process with
 * dummy tokens; the proxy attaches the real secret on the wire per grant.
 * The child (an AI agent, a script) never holds a real key.
 *
 * Transport note: this is a base-URL broker, not a TLS MITM — tools must honor
 * their *_BASE_URL / registry / api-url override (OpenAI, Anthropic, Groq,
 * DeepSeek, xAI, OpenRouter, npm do; `gh` hardcodes api.github.com). That is
 * the documented ceiling — a CA-trusted MITM is a much larger build.
 * ponytail: no standalone daemon (`agent start`) — wrap mode only.
 */

interface Grant {
  upstream: string; // e.g. https://api.anthropic.com
  header: (secret: string) => [string, string];
}

interface Preset extends Grant {
  env: (base: string) => Record<string, string>; // child env; base = http://127.0.0.1:port/<name>
}

const DUMMY = "primora-brokered";
const bearer = (s: string): [string, string] => ["authorization", `Bearer ${s}`];

const PRESETS: Record<string, Preset> = {
  anthropic: {
    upstream: "https://api.anthropic.com",
    header: (s) => ["x-api-key", s],
    env: (b) => ({ ANTHROPIC_BASE_URL: b, ANTHROPIC_API_KEY: DUMMY }),
  },
  openai: {
    upstream: "https://api.openai.com",
    header: bearer,
    env: (b) => ({ OPENAI_BASE_URL: `${b}/v1`, OPENAI_API_KEY: DUMMY }),
  },
  openrouter: {
    upstream: "https://openrouter.ai",
    header: bearer,
    env: (b) => ({ OPENROUTER_BASE_URL: `${b}/api`, OPENROUTER_API_KEY: DUMMY }),
  },
  groq: {
    upstream: "https://api.groq.com",
    header: bearer,
    env: (b) => ({ GROQ_BASE_URL: `${b}/openai`, GROQ_API_KEY: DUMMY }),
  },
  deepseek: {
    upstream: "https://api.deepseek.com",
    header: bearer,
    env: (b) => ({ DEEPSEEK_BASE_URL: b, DEEPSEEK_API_KEY: DUMMY }),
  },
  xai: {
    upstream: "https://api.x.ai",
    header: bearer,
    env: (b) => ({ XAI_BASE_URL: `${b}/v1`, XAI_API_KEY: DUMMY }),
  },
  github: {
    upstream: "https://api.github.com",
    header: bearer,
    env: (b) => ({ GITHUB_API_URL: b, GH_TOKEN: DUMMY, GITHUB_TOKEN: DUMMY }),
  },
  npm: {
    upstream: "https://registry.npmjs.org",
    header: bearer,
    env: (b) => ({ NPM_CONFIG_REGISTRY: b, NPM_TOKEN: DUMMY }),
  },
};

export const PRESET_NAMES = Object.keys(PRESETS);

export interface AgentOptions extends VaultPasswordOptions {
  ttl?: string;
  upstream?: string | string[];
  [preset: string]: unknown; // cac preset flags land here
}

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "content-length",
  "transfer-encoding",
  "keep-alive",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "upgrade",
]);

async function proxy(
  req: IncomingMessage,
  res: ServerResponse,
  grants: Map<string, { grant: Grant; secret: string }>,
): Promise<void> {
  const match = /^\/([a-z0-9_-]+)(\/.*)?$/i.exec(req.url ?? "");
  const entry = match ? grants.get(match[1].toLowerCase()) : undefined;
  if (!match || !entry) {
    res.writeHead(404, { "content-type": "text/plain" }).end("primora agent: no grant for this route");
    return;
  }
  const suffix = match[2] ?? "/";

  const headers: Record<string, string> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    const lk = k.toLowerCase();
    if (HOP_BY_HOP.has(lk) || Array.isArray(v) || v === undefined) continue;
    headers[lk] = v;
  }
  const [hk, hv] = entry.grant.header(entry.secret);
  headers[hk] = hv; // real secret attached here — the child sent a dummy

  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = chunks.length ? Buffer.concat(chunks) : undefined;

  try {
    const up = await fetch(entry.grant.upstream + suffix, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });
    const out: Record<string, string> = {};
    up.headers.forEach((v, k) => {
      if (!HOP_BY_HOP.has(k.toLowerCase())) out[k] = v;
    });
    res.writeHead(up.status, out);
    if (up.body) Readable.fromWeb(up.body as never).pipe(res);
    else res.end();
  } catch (e) {
    res.writeHead(502).end(`primora agent: upstream error — ${(e as Error).message}`);
  }
}

export async function cmdAgent(options: AgentOptions): Promise<void> {
  const sep = process.argv.indexOf("--");
  const child = sep >= 0 ? process.argv.slice(sep + 1) : [];
  if (!child.length) {
    throw new CliError(
      "No command given.",
      "Usage: primora agent --anthropic VAULT_KEY [--ttl 900] -- <cmd>",
    );
  }

  // Collect grants: --<preset> <vault-name> plus custom --upstream name=url.
  const wanted: { name: string; grant: Grant; env?: Preset["env"]; secretName: string }[] = [];
  for (const name of PRESET_NAMES) {
    const secretName = options[name];
    if (typeof secretName === "string" && secretName) {
      wanted.push({ name, grant: PRESETS[name], env: PRESETS[name].env, secretName });
    }
  }
  const customs = ([] as string[]).concat(options.upstream ?? []);
  for (const spec of customs) {
    const eq = spec.indexOf("=");
    const url = spec.slice(eq + 1);
    // HTTPS for real upstreams; HTTP only for loopback dev servers.
    const urlOk =
      /^https:\/\//.test(url) || /^http:\/\/(127\.|localhost|\[::1\])/.test(url);
    if (eq < 1 || !urlOk) {
      throw new CliError(
        `Bad --upstream "${spec}".`,
        "Format: name=https://api.host (http allowed for 127.0.0.1/localhost only) — Authorization: Bearer is attached.",
      );
    }
    const name = spec.slice(0, eq).toLowerCase();
    const upstream = spec.slice(eq + 1).replace(/\/+$/, "");
    wanted.push({
      name,
      grant: { upstream, header: bearer },
      env: (b) => ({
        [`${name.toUpperCase().replace(/-/g, "_")}_BASE_URL`]: b,
        [`${name.toUpperCase().replace(/-/g, "_")}_TOKEN`]: DUMMY,
      }),
      secretName: name.toUpperCase().replace(/-/g, "_") + "_KEY",
    });
  }
  if (!wanted.length) {
    throw new CliError(
      "No grants.",
      `Pass at least one: ${PRESET_NAMES.map((n) => `--${n} <vault-key>`).join(" ")} or --upstream name=https://…`,
    );
  }

  const vault = await unlockVault(options);
  const grants = new Map<string, { grant: Grant; secret: string }>();
  for (const w of wanted) {
    const entry = vault.data.secrets[w.secretName];
    if (!entry) {
      throw new CliError(
        `Secret "${w.secretName}" not in vault for grant "${w.name}".`,
        `Run \`primora secrets set ${w.secretName}\` first.`,
      );
    }
    grants.set(w.name, { grant: w.grant, secret: entry.value });
  }

  const server = createServer((req, res) => void proxy(req, res, grants));
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = (server.address() as { port: number }).port;
  const base = `http://127.0.0.1:${port}`;

  const ttl = Math.min(Math.max(60, Number(options.ttl ?? 900)), 3600);
  const timer = setTimeout(() => {
    server.close();
    process.stderr.write("primora agent: grant TTL expired — broker stopped\n");
    process.exit(0);
  }, ttl * 1000);

  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const w of wanted) Object.assign(env, w.env?.(`${base}/${w.name}`));
  dim(`broker on ${base} — grants: ${wanted.map((w) => w.name).join(", ")} (ttl ${ttl}s)`);

  // Async spawn — spawnSync would block the event loop and starve the proxy.
  const code = await new Promise<number>((resolve, reject) => {
    const proc = spawn(child[0], child.slice(1), { env, stdio: "inherit" });
    proc.on("error", (e) => {
      server.close();
      reject(new CliError(`Failed to start ${child[0]}: ${e.message}`));
    });
    proc.on("exit", (c) => resolve(c ?? 1));
  });
  clearTimeout(timer);
  server.close();
  process.exit(code);
}
