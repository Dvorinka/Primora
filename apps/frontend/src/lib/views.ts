// One list so the sidebar, command palette, hash, and document title cannot drift.

export const VIEWS = [
  "dashboard",
  "projects",
  "members",
  "storage",
  "collections",
  "databases",
  "telemetry",
  "integrations",
  "automation",
  "functions",
  "vault",
  "auth",
  "audit",
  "settings",
] as const;

export type ViewType = (typeof VIEWS)[number];

const viewSet = new Set<string>(VIEWS);

export function parseView(hash: string): ViewType {
  const raw = hash.replace(/^#\/?/, "").split(/[/?&#]/)[0] ?? "";
  return viewSet.has(raw) ? (raw as ViewType) : "dashboard";
}

// Empty hash is Overview, so a bare / stays a valid home URL.
export function viewHash(view: ViewType): string {
  return view === "dashboard" ? "" : `#${view}`;
}
