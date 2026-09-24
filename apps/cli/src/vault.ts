// Local encrypted vault for CLI-held secrets (API keys, deployment .env values).
// Clean-room format — inspired by arca-core's design goals, not its code (AGPL).
//
// File layout (all multi-byte ints little-endian):
//   8B  magic "PRMVLT01"
//   1B  kdf id      (0x01 = argon2id)
//   4B  m (KiB)     4B  t   4B  p
//   1B  aead id     (0x01 = xchacha20poly1305)
//   16B salt        24B nonce
//   …   ciphertext+tag of JSON payload; the full header is the AEAD AAD,
//       so no parameter can be altered without failing decryption.
//
// Session: `vault unlock` writes vault.session (0600, TTL'd) holding the
// derived key, so agents/scripts use the vault without the password.
// `vault lock` or expiry removes it. The session file is the same-user risk
// equivalent of a plaintext .env for its lifetime — bounded by the TTL.
//
// ponytail: single credential slot, no duress/decoy, no Shamir — those are
// coercion-resistance features, not a CLI secrets problem.
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { argon2id } from "@noble/hashes/argon2.js";

import { CliError } from "./http.js";

export interface SecretEntry {
  value: string;
  url?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface VaultData {
  v: 1;
  secrets: Record<string, SecretEntry>;
}

const MAGIC = "PRMVLT01";
const KDF_ARGON2ID = 0x01;
const AEAD_XCHACHA = 0x01;
const HEADER_LEN = 8 + 1 + 4 + 4 + 4 + 1 + 16 + 24; // 62

// Floors, not targets — matching argon2id's current recommended memory cost.
const KDF = { m: 65536, t: 3, p: 4 } as const;

const enc = new TextEncoder();
const dec = new TextDecoder();

export function configDir(): string {
  return (
    process.env.PRIMORA_CONFIG_DIR ??
    join(process.env.XDG_CONFIG_HOME ?? join(homedir(), ".config"), "primora")
  );
}

export function vaultPath(): string {
  return process.env.PRIMORA_VAULT ?? join(configDir(), "vault.bin");
}

export function vaultExists(): boolean {
  return existsSync(vaultPath());
}

/* ------------------------------------------------------------------ */
/* session                                                             */
/* ------------------------------------------------------------------ */

const SESSION_MAX_TTL = 86400; // 24 h ceiling

interface SessionFile {
  key: string; // base64 data key
  exp: number; // epoch seconds
}

function sessionPath(): string {
  return process.env.PRIMORA_VAULT_SESSION ?? join(configDir(), "vault.session");
}

/** Session key if one exists and is unexpired; expired files are removed. */
export function loadSessionKey(): Uint8Array | undefined {
  const path = sessionPath();
  if (!existsSync(path)) return undefined;
  try {
    const s = JSON.parse(readFileSync(path, "utf8")) as SessionFile;
    if (typeof s.key !== "string" || typeof s.exp !== "number") throw new Error("shape");
    if (s.exp <= Date.now() / 1000) {
      unlinkSync(path);
      return undefined;
    }
    const key = Buffer.from(s.key, "base64");
    if (key.length !== 32) throw new Error("bad key length");
    return new Uint8Array(key);
  } catch {
    unlinkSync(path);
    return undefined;
  }
}

export function saveSessionKey(key: Uint8Array, ttlSeconds: number): number {
  const ttl = Math.min(Math.max(60, ttlSeconds), SESSION_MAX_TTL);
  const exp = Math.floor(Date.now() / 1000) + ttl;
  mkdirSync(dirname(sessionPath()), { recursive: true });
  writeFileSync(sessionPath(), JSON.stringify({ key: Buffer.from(key).toString("base64"), exp }), {
    mode: 0o600,
  });
  return ttl;
}

export function clearSession(): boolean {
  const path = sessionPath();
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

export function sessionExpiry(): number | undefined {
  const path = sessionPath();
  if (!existsSync(path)) return undefined;
  try {
    const s = JSON.parse(readFileSync(path, "utf8")) as SessionFile;
    return s.exp > Date.now() / 1000 ? s.exp : undefined;
  } catch {
    return undefined;
  }
}

/* ------------------------------------------------------------------ */
/* format                                                              */
/* ------------------------------------------------------------------ */

/** Header fields readable without the password (for `vault status`). */
export function vaultHeader(): { m: number; t: number; p: number } | undefined {
  const path = vaultPath();
  if (!existsSync(path)) return undefined;
  const buf = readFileSync(path);
  if (buf.length < HEADER_LEN || buf.subarray(0, 8).toString("latin1") !== MAGIC) {
    throw new CliError(`Not a primora vault: ${path}`);
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return { m: dv.getUint32(9, true), t: dv.getUint32(13, true), p: dv.getUint32(17, true) };
}

interface ParsedFile {
  buf: Buffer;
  header: Buffer;
  salt: Buffer;
  nonce: Buffer;
  params: { m: number; t: number; p: number };
}

function parseFile(): ParsedFile {
  const path = vaultPath();
  if (!existsSync(path)) {
    throw new CliError("No vault found.", "Run `primora vault init` first.");
  }
  const buf = readFileSync(path);
  if (buf.length < HEADER_LEN + 16 || buf.subarray(0, 8).toString("latin1") !== MAGIC) {
    throw new CliError(`Not a primora vault: ${path}`);
  }
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (dv.getUint8(8) !== KDF_ARGON2ID || dv.getUint8(21) !== AEAD_XCHACHA) {
    throw new CliError("Unsupported vault parameters — newer format version?");
  }
  const params = { m: dv.getUint32(9, true), t: dv.getUint32(13, true), p: dv.getUint32(17, true) };
  if (params.m < 8192 || params.t < 1 || params.p < 1) {
    throw new CliError("Vault KDF parameters below floor — file is suspect.");
  }
  return {
    buf,
    header: buf.subarray(0, HEADER_LEN),
    salt: buf.subarray(22, 38),
    nonce: buf.subarray(38, 62),
    params,
  };
}

export interface OpenVault {
  data: VaultData;
  key: Uint8Array;
  salt: Uint8Array;
  params: { m: number; t: number; p: number };
}

function decrypt(f: ParsedFile, key: Uint8Array): VaultData {
  try {
    const plain = xchacha20poly1305(key, f.nonce, f.header).decrypt(f.buf.subarray(HEADER_LEN));
    const data = JSON.parse(dec.decode(plain)) as VaultData;
    if (data.v !== 1 || typeof data.secrets !== "object") throw new Error("shape");
    return data;
  } catch {
    throw new CliError("Wrong password or corrupt vault.");
  }
}

export function openVault(password: Uint8Array): OpenVault {
  const f = parseFile();
  const key = argon2id(password, f.salt, { ...f.params, dkLen: 32 });
  return { data: decrypt(f, key), key, salt: f.salt, params: f.params };
}

/** Open with a session key — skips Argon2 entirely. */
export function openVaultWithKey(key: Uint8Array): OpenVault {
  const f = parseFile();
  return { data: decrypt(f, key), key, salt: f.salt, params: f.params };
}

/** Re-encrypt with the same salt/params and a fresh nonce. Atomic via tmp+rename. */
export function saveVault(open: OpenVault): void {
  const path = vaultPath();
  const nonce = crypto.getRandomValues(new Uint8Array(24));

  const header = new Uint8Array(HEADER_LEN);
  header.set(enc.encode(MAGIC), 0);
  const dv = new DataView(header.buffer);
  dv.setUint8(8, KDF_ARGON2ID);
  dv.setUint32(9, open.params.m, true);
  dv.setUint32(13, open.params.t, true);
  dv.setUint32(17, open.params.p, true);
  dv.setUint8(21, AEAD_XCHACHA);
  header.set(open.salt, 22);
  header.set(nonce, 38);

  const plain = enc.encode(JSON.stringify(open.data));
  const ct = xchacha20poly1305(open.key, nonce, header).encrypt(plain);

  const tmp = `${path}.${process.pid}.tmp`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(tmp, Buffer.concat([header, Buffer.from(ct)]), { mode: 0o600 });
  renameSync(tmp, path);
}

export function createVault(password: Uint8Array): void {
  const path = vaultPath();
  if (existsSync(path)) {
    throw new CliError(
      `Vault already exists: ${path}`,
      "Use `primora secrets:*` — or remove the file to start over.",
    );
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = argon2id(password, salt, { ...KDF, dkLen: 32 });
  saveVault({ data: { v: 1, secrets: {} }, key, salt, params: KDF });
}
