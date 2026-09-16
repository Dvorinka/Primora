import { For, Show, createMemo, createSignal } from "solid-js";
import { Badge } from "../components/Badge";
import { Input } from "../components/Input";
import {
  IconAuth,
  IconRefresh,
  IconTrash,
} from "../components/Icons";

/** Mirrors the better-auth admin `listUsers` user shape. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role?: string | null;
  banned?: boolean | null;
  createdAt: string | Date;
}

interface AuthPageProps {
  users?: AuthUser[];
  pending: boolean;
  message: string;
  error?: string;
  currentUserId?: string;
  onRefresh: () => void;
  onSetRole: (id: string, role: string) => void;
  onSetBanned: (id: string, banned: boolean) => void;
  onRemove: (id: string) => void;
}

const authRoles = ["admin", "user"] as const;

function initials(name?: string, email?: string): string {
  const src = name || email || "?";
  return src
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}

function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function AuthPage(props: AuthPageProps) {
  const [query, setQuery] = createSignal("");

  const filtered = createMemo(() => {
    const q = query().toLowerCase();
    const list = props.users ?? [];
    if (!q) return list;
    return list.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  });

  return (
    <div class="page">
      <div class="page-header">
        <div>
          <h1 class="page-title">Authentication</h1>
          <p class="page-description">
            Users who can sign in to this Primora instance.
          </p>
        </div>
        <div class="page-actions">
          <button
            class="btn btn-ghost"
            onClick={props.onRefresh}
            disabled={props.pending}
            aria-label="Refresh users"
          >
            <IconRefresh class="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      <Show when={props.message}>
        <div class="message message-neutral">{props.message}</div>
      </Show>

      <Show
        when={!props.error}
        fallback={
          <div class="card empty-state" style="min-height:16rem">
            <div class="empty-state-icon">
              <IconAuth class="w-5 h-5" />
            </div>
            <p class="empty-state-title">Admin access required</p>
            <p class="empty-state-description">{props.error}</p>
          </div>
        }
      >
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="tabs">
            <button class="tab active">
              Users
              <span class="nav-badge ml-1.5">{(props.users ?? []).length}</span>
            </button>
          </div>
          <Input
            placeholder="Filter users…"
            value={query()}
            onInput={(e) => setQuery(e.currentTarget.value)}
            class="input-sm"
            style="width:14rem"
          />
        </div>

        <div class="card card-flush">
          <Show
            when={filtered().length > 0}
            fallback={
              <div class="empty-state">
                <div class="empty-state-icon">
                  <IconAuth class="w-5 h-5" />
                </div>
                <p class="empty-state-title">No users found</p>
                <p class="empty-state-description">
                  {query() ? "No users match this filter." : "No one has signed up yet."}
                </p>
              </div>
            }
          >
            <div class="table-container">
              <table class="table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Status</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th style="width:1%" />
                  </tr>
                </thead>
                <tbody>
                  <For each={filtered()}>
                    {(user) => (
                      <tr>
                        <td>
                          <div class="flex items-center gap-2.5">
                            <span
                              class="avatar"
                              style="width:1.75rem;height:1.75rem;font-size:0.625rem"
                            >
                              {initials(user.name, user.email)}
                            </span>
                            <div>
                              <div class="font-medium text-text-1">
                                {user.name || "Unnamed"}
                                <Show when={user.id === props.currentUserId}>
                                  <span class="text-xs text-text-3"> (you)</span>
                                </Show>
                              </div>
                              <div class="text-xs text-text-3">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div class="flex items-center gap-1.5">
                            <Badge variant={user.emailVerified ? "success" : "warning"}>
                              <span class="badge-dot" />
                              {user.emailVerified ? "Verified" : "Unverified"}
                            </Badge>
                            <Show when={user.banned}>
                              <Badge variant="error">Banned</Badge>
                            </Show>
                          </div>
                        </td>
                        <td>
                          <select
                            class="select input-sm"
                            style="width:8.5rem"
                            value={user.role ?? "user"}
                            onChange={(e) => props.onSetRole(user.id, e.currentTarget.value)}
                            disabled={props.pending || user.id === props.currentUserId}
                            aria-label={`Role for ${user.email}`}
                          >
                            <For each={authRoles}>
                              {(role) => <option value={role}>{role}</option>}
                            </For>
                          </select>
                        </td>
                        <td class="text-text-3">{formatDate(user.createdAt)}</td>
                        <td style="width:1%">
                          <div class="flex items-center gap-1">
                            <button
                              class="btn btn-ghost btn-sm"
                              onClick={() => props.onSetBanned(user.id, !user.banned)}
                              disabled={props.pending || user.id === props.currentUserId}
                            >
                              {user.banned ? "Unban" : "Ban"}
                            </button>
                            <button
                              class="icon-btn"
                              title="Delete user"
                              aria-label={`Delete ${user.email}`}
                              onClick={() => props.onRemove(user.id)}
                              disabled={props.pending || user.id === props.currentUserId}
                            >
                              <IconTrash class="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </For>
                </tbody>
              </table>
            </div>
          </Show>
        </div>
      </Show>
    </div>
  );
}
