import * as p from "@clack/prompts";
import pc from "picocolors";

export function isJson(options: { json?: boolean }): boolean {
  return Boolean(options.json);
}

export function printJson(data: unknown): void {
  process.stdout.write(JSON.stringify(data, null, 2) + "\n");
}

export function success(message: string): void {
  process.stdout.write(pc.green("✓ ") + message + "\n");
}

export function dim(message: string): void {
  process.stdout.write(pc.dim(message) + "\n");
}

export function fail(error: unknown): never {
  const err = error as { message?: string; hint?: string; status?: number; body?: unknown };
  let message = err?.message ?? "unknown error";
  // generated client throws ApiError with a parsed body
  const body = err?.body as { error?: { message?: string } } | undefined;
  if (body?.error?.message) message = body.error.message;
  if (err?.status === 401) message = `${message} (401 — check auth)`;
  process.stderr.write(pc.red("error ") + message + "\n");
  if (err?.hint) process.stderr.write(pc.dim(`hint  ${err.hint}`) + "\n");
  process.exit(1);
}

/** Spinner for multi-hundred-ms work (Argon2 derives). Silent when piped. */
export async function withSpinner<T>(message: string, work: () => Promise<T>): Promise<T> {
  if (!process.stdout.isTTY) return work();
  const s = p.spinner();
  s.start(message);
  try {
    const result = await work();
    s.stop(message);
    return result;
  } catch (error) {
    s.stop(pc.red("failed"));
    throw error;
  }
}

/** Minimal column printer — left-aligned, two-space gutter. */
export function printTable(headers: string[], rows: string[][]): void {
  const all = headers.length ? [headers, ...rows] : rows;
  const widths: number[] = [];
  for (const row of all) {
    row.forEach((cell, i) => {
      widths[i] = Math.max(widths[i] ?? 0, cell.length);
    });
  }
  const line = (row: string[]) =>
    row.map((cell, i) => cell.padEnd(widths[i])).join("  ").trimEnd();
  if (headers.length) {
    process.stdout.write(pc.dim(line(headers)) + "\n");
  }
  for (const row of rows) process.stdout.write(line(row) + "\n");
}

export function formatBytes(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value) || value < 0) return "—";
  if (value < 1024) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = value;
  let unit = -1;
  do {
    size /= 1024;
    unit++;
  } while (size >= 1024 && unit < units.length - 1);
  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toISOString().replace("T", " ").slice(0, 16);
}
