# @primora/cli

`primora` - command-line client for a Primora deployment, plus a local
encrypted secrets vault and compose-stack operator commands.

## Build

```bash
npm run build --workspace @primora/cli   # → dist/cli.js
node dist/cli.js login                   # or: npx primora login once published
```

## Auth

- `primora login` - session sign-in against your deployment.
- `primora login --api-key prm_…` - or export `PRIMORA_API_KEY`.

Context lives in `~/.config/primora/config.json`; `primora use` picks org +
project interactively.

## Commands

`orgs`, `projects`, `buckets`, `objects` (list/upload/download/rm), `keys`,
`jobs`, `events:send`, `audit list --follow`. Every command accepts `--json`.

```sh
primora events:send custom.deploy.done --data '{"sha":"abc123"}'
```

`events:send` publishes a `custom.*` event — realtime subscribers, matching
webhooks, and `event_pattern` functions all fire.

```sh
primora documents list --collection users \
  --filter "status.eq.active,age.gt.18" --order "age.desc"
```

`--filter` takes comma-separated `field.op.value` terms — ops `eq neq gt gte lt
lte like in is`; dotted paths index into document data (`meta.city.eq.Prague`),
`id`/`created_at`/`updated_at` are also filterable. `--order` is a
`field.asc|field.desc` list.

## Vault

A local encrypted vault for secrets the CLI holds - API keys, deployment `.env`
values, anything you would otherwise leave in a dotfile or shell history.

```bash
primora vault init                    # create ~/.config/primora/vault.bin
primora secrets set STRIPE_KEY        # value prompted, or --value / stdin
primora secrets set OPENAI --value sk-… --url https://platform.openai.com --notes "prod"
primora secrets import .env           # import KEY=value pairs
primora secrets list                  # names + urls + timestamps, never values
primora secrets get STRIPE_KEY        # prints the value (scriptable)
primora secrets rm STRIPE_KEY --yes
```

Format: Argon2id (64 MiB / 3 / 4) → XChaCha20-Poly1305 over a single JSON
payload; the parameter header is the AEAD's AAD, atomic tmp+rename writes.
Clean-room implementation - compatible with nothing but itself.

Password source order: live session → `PRIMORA_VAULT_PASSWORD` →
`--password-file` → hidden prompt. `PRIMORA_VAULT` overrides the file
location.

## Project vault (server)

`--remote` targets the project's server-side vault instead of the local file —
AES-256-GCM at rest in Postgres, shared with the team and the web dashboard's
Vault page. No vault password; it uses your `primora login` session or
`PRIMORA_API_KEY`.

```bash
primora secrets set STRIPE_KEY --value sk-… --remote
primora secrets list --remote          # metadata only — names, urls, notes
primora secrets get STRIPE_KEY --remote  # explicit reveal, audit-logged
primora secrets rm STRIPE_KEY --remote --yes
primora secrets import .env --remote --overwrite
```

Job payloads reference secrets as `secret://NAME`; the scheduler resolves them
at delivery, so payloads on disk never contain plaintext:

```json
{"auth": "secret://STRIPE_KEY"}
```

## Sessions

`primora vault unlock --ttl 900` proves the password once, then writes a
TTL'd session key (`vault.session`, 0600) so agents and scripts use the
vault without ever seeing the password. `primora vault lock` revokes
immediately; expiry does it on its own. The session file is same-user
readable for its lifetime — that is the trade, bounded by the TTL.

## Agent broker

`primora agent` wraps one process: the child gets dummy tokens and a
loopback base URL; the broker attaches the real secret on the wire.

```bash
primora agent --anthropic CLAUDE_KEY --openai OAI_KEY --ttl 900 -- claude
primora agent --upstream stripe=https://api.stripe.com -- npm test
```

Presets: `anthropic`, `openai`, `openrouter`, `groq`, `deepseek`, `xai`,
`github`, `npm`. Each flag takes a vault secret name; `--upstream
name=https://…` adds any Bearer API (vault key `<NAME>_KEY`).

The child environment contains `*_API_KEY=primora-brokered` and a
`*_BASE_URL` pointing at the broker — so the tool must honor a base-URL
override. `gh` hardcodes api.github.com and cannot be brokered this way.
This is a base-URL broker, not a TLS MITM; no CA trust needed.

## Inject

Run one process with vault secrets in its environment - nothing on disk,
nothing in argv, parent shell unchanged:

```bash
primora inject -- npm run dev                      # all vault secrets
primora inject --env-file .env -- npm start        # resolve primora:// refs
```

An env-file can mix literals and refs:

```dotenv
DATABASE_URL=postgres://localhost/app
STRIPE_KEY=primora://STRIPE_KEY
```

## Stack

Operator surface for a compose deployment (`--dir`, defaults to cwd):

```bash
primora stack up                  # docker compose up -d
primora stack up --vault          # materialize .env from the vault, remove after
primora stack status | logs [svc] | down | pull
primora stack backup              # pg_dump → ./backups (storage: scripts/backup.sh)
```

`stack up --vault` refuses to overwrite an existing `.env` without `--force`
(the original is restored after the run). For a full backup including the
storage volume, `scripts/backup.sh` remains the tool.

## For AI agents

Two safe paths, no secret ever in the agent's context:

- **Wrapped** — launch the agent under `primora agent … -- claude`. It holds
  dummy tokens; the broker attaches real ones on the wire.
- **MCP** — `primora_vault_status`, `primora_vault_list` (metadata only),
  `primora_vault_exec` (runs `primora` commands with a secret injected into
  the process env; vault/secrets/inject/agent/login and `keys:create` are
  denied, so output can never carry a credential). Requires an unlocked
  vault session on the host.
- **MCP project vault** — `primora_secrets_list` (metadata only) and
  `primora_secrets_set` (write-only). No reveal, no delete: agents reference
  `secret://NAME` in job payloads without ever holding the value.
