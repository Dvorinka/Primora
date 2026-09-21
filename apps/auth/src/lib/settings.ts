import crypto from "node:crypto";

import { authPool } from "./db.js";
import { env } from "./env.js";

// Instance settings live in core.settings, written by the backend. A row
// overrides the matching env var; no row means env (or the caller's default).
// Secret values are AES-256-GCM ciphertext (base64, nonce || ct || tag)
// encrypted by the backend with PRIMORA_ENCRYPTION_KEY.

const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { value: unknown; at: number }>();

export async function getSetting(key: string): Promise<unknown> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const { rows } = await authPool.query(
    `select value, secret from core.settings where key = $1`,
    [key],
  );
  let value: unknown;
  if (rows[0]) {
    const raw = rows[0].value as unknown; // JSONB arrives parsed — a string
    value = rows[0].secret ? decryptSetting(String(raw)) : raw;
  }
  cache.set(key, { value, at: Date.now() });
  return value;
}

export async function getBoolSetting(key: string, fallback: boolean): Promise<boolean> {
  const v = await getSetting(key);
  if (v === undefined) return fallback;
  return v === true || v === "true";
}

export async function getStringSetting(key: string, fallback: string | undefined): Promise<string | undefined> {
  const v = await getSetting(key);
  if (v === undefined || v === "") return fallback;
  return String(v);
}

function decryptSetting(ciphertextB64: string): string {
  const key = decodeEncryptionKey(env.PRIMORA_ENCRYPTION_KEY);
  const buf = Buffer.from(ciphertextB64, "base64");
  const nonce = buf.subarray(0, 12);
  const body = buf.subarray(12);
  const tag = body.subarray(body.length - 16);
  const ciphertext = body.subarray(0, body.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// Same key formats as the Go Encryptor: 32 bytes as hex or base64.
function decodeEncryptionKey(raw: string | undefined): Buffer {
  if (!raw) throw new Error("PRIMORA_ENCRYPTION_KEY is required to read secret settings");
  const trimmed = raw.trim();
  for (const decoded of [
    Buffer.from(trimmed, "hex"),
    Buffer.from(trimmed, "base64"),
    Buffer.from(trimmed, "base64url"),
  ]) {
    if (decoded.length === 32) return decoded;
  }
  throw new Error("PRIMORA_ENCRYPTION_KEY must decode to 32 bytes (hex or base64)");
}
