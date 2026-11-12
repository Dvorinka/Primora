import type { Document } from "@primora/api-client";

// Same PostgREST-lite grammar as apps/backend/internal/services/documents_query.go.
// The server stays the authority for real projects; demo mode runs this locally.

const OPS = ["eq", "neq", "gt", "gte", "lt", "lte", "like", "in", "is"] as const;
const COLUMNS = new Set(["id", "created_at", "updated_at"]);
const FIELD_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

type Term = { field: string; op: (typeof OPS)[number]; value: string };
type OrderKey = { field: string; dir: "asc" | "desc" };

function invalidField(field: string): string | undefined {
  for (const part of field.split(".")) {
    if (!FIELD_RE.test(part)) {
      return `invalid field name "${field}" — use [A-Za-z_][A-Za-z0-9_]* segments`;
    }
  }
  return undefined;
}

function parseFilter(filter: string): Term[] | string {
  const terms: Term[] = [];
  for (const raw of filter.split(",")) {
    const term = raw.trim();
    if (!term) continue;
    let best = -1;
    let field = "";
    let op: Term["op"] | "" = "";
    let value = "";
    for (const candidate of OPS) {
      const needle = `.${candidate}.`;
      const at = term.indexOf(needle);
      if (at > 0 && (best < 0 || at < best)) {
        best = at;
        field = term.slice(0, at);
        op = candidate;
        value = term.slice(at + needle.length);
      }
    }
    if (!field || !op) {
      return `invalid filter "${term}" — expected field.op.value (ops: ${OPS.join(", ")})`;
    }
    const fieldError = invalidField(field);
    if (fieldError) return fieldError;
    if ((op === "gt" || op === "gte" || op === "lt" || op === "lte") && !isNumeric(value)) {
      return `filter "${term}": ${op} requires a numeric value`;
    }
    if (op === "is" && value !== "null" && value !== "true" && value !== "false") {
      return `filter "${term}": is accepts null|true|false`;
    }
    terms.push({ field, op, value });
  }
  return terms;
}

function parseOrder(order: string): OrderKey[] | string {
  if (!order.trim()) return [{ field: "created_at", dir: "desc" }];
  const keys: OrderKey[] = [];
  for (const raw of order.split(",")) {
    const term = raw.trim();
    if (!term) continue;
    let field = term;
    let dir: OrderKey["dir"] = "asc";
    if (term.endsWith(".desc")) {
      field = term.slice(0, -5);
      dir = "desc";
    } else if (term.endsWith(".asc")) {
      field = term.slice(0, -4);
    }
    if (!field) return `invalid order "${term}"`;
    const fieldError = invalidField(field);
    if (fieldError) return fieldError;
    keys.push({ field, dir });
  }
  return keys.length > 0 ? keys : [{ field: "created_at", dir: "desc" }];
}

function isNumeric(value: string): boolean {
  return value.trim() !== "" && Number.isFinite(Number(value));
}

function textOf(doc: Document, field: string): string | null {
  if (COLUMNS.has(field)) {
    const column = doc[field as "id" | "created_at" | "updated_at"];
    return column == null || column === "" ? null : String(column);
  }
  let current: unknown = doc.data;
  for (const part of field.split(".")) {
    if (current == null || typeof current !== "object" || Array.isArray(current)) return null;
    current = (current as Record<string, unknown>)[part];
  }
  if (current == null) return null;
  if (typeof current === "object") return JSON.stringify(current);
  return String(current);
}

function likePattern(pattern: string): RegExp {
  const body = pattern
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/%/g, ".*")
    .replace(/_/g, ".");
  return new RegExp(`^${body}$`, "i");
}

function matches(doc: Document, term: Term): boolean {
  const text = textOf(doc, term.field);
  switch (term.op) {
    case "eq":
      return text === term.value;
    case "neq":
      return text !== null && text !== term.value;
    case "like":
      return text !== null && likePattern(term.value).test(text);
    case "in":
      return text !== null && term.value.split("|").map((item) => item.trim()).includes(text);
    case "is":
      return term.value === "null" ? text === null : text === term.value;
    case "gt":
    case "gte":
    case "lt":
    case "lte": {
      if (text === null || !isNumeric(text)) return false;
      const left = Number(text);
      const right = Number(term.value);
      if (term.op === "gt") return left > right;
      if (term.op === "gte") return left >= right;
      if (term.op === "lt") return left < right;
      return left <= right;
    }
    default:
      return false;
  }
}

export function queryDocuments(
  docs: Document[],
  filter: string,
  order: string,
): { items: Document[] } | { error: string } {
  const terms = parseFilter(filter);
  if (typeof terms === "string") return { error: terms };
  const keys = parseOrder(order);
  if (typeof keys === "string") return { error: keys };
  const items = docs.filter((doc) => terms.every((term) => matches(doc, term)));
  items.sort((a, b) => {
    for (const key of keys) {
      const left = textOf(a, key.field);
      const right = textOf(b, key.field);
      if (left === right) continue;
      // shortcut: nulls sort last; Postgres uses NULLS FIRST on DESC
      if (left === null) return 1;
      if (right === null) return -1;
      const cmp = left < right ? -1 : 1;
      return key.dir === "asc" ? cmp : -cmp;
    }
    return 0;
  });
  return { items };
}

export function documentQueryError(filter: string, order: string): string | undefined {
  const result = queryDocuments([], filter, order);
  return "error" in result ? result.error : undefined;
}
