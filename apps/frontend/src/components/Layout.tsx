import { type JSX, Show, createSignal, For } from "solid-js";

interface NavItem {
  id: string;
  label: string;
  icon?: JSX.Element;
  badge?: string | number;
  children?: NavItem[];
}

interface SidebarProps {
  items: NavItem[];
  activeId?: string;
  onSelect?: (id: string) => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  header?: JSX.Element;
  footer?: JSX.Element;
}

function SidebarItem(props: { item: NavItem; activeId?: string; onSelect?: (id: string) => void; collapsed?: boolean }) {
  const isActive = () => props.item.id === props.activeId;
  const hasChildren = () => (props.item.children?.length ?? 0) > 0;
  const [expanded, setExpanded] = createSignal(false);

  return (
    <div>
      <button
        class={`w-full text-left ${isActive() ? "sidebar-item-active" : "sidebar-item"}`}
        onClick={() => {
          if (hasChildren()) {
            setExpanded(!expanded());
          } else {
            props.onSelect?.(props.item.id);
          }
        }}
        aria-expanded={hasChildren() ? expanded() : undefined}
        aria-current={isActive() ? "page" : undefined}
      >
        <Show when={props.item.icon}>
          <span class="flex-shrink-0">{props.item.icon}</span>
        </Show>
        <Show when={!props.collapsed}>
          <span class="flex-1 truncate">{props.item.label}</span>
        </Show>
        <Show when={props.item.badge && !props.collapsed}>
          <span class="badge-neutral text-2xs">{props.item.badge}</span>
        </Show>
        <Show when={hasChildren() && !props.collapsed}>
          <svg
            class={`h-4 w-4 transition-transform ${expanded() ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </Show>
      </button>
      <Show when={hasChildren() && expanded() && !props.collapsed}>
        <div class="ml-4 mt-1 space-y-1">
          <For each={props.item.children}>
            {(child) => (
              <button
                class={`w-full text-left sidebar-item text-xs ${child.id === props.activeId ? "sidebar-item-active" : ""}`}
                onClick={() => props.onSelect?.(child.id)}
              >
                {child.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside
      class={`sidebar transition-all duration-fast ${props.collapsed ? "w-16" : "w-60"}`}
      role="navigation"
      aria-label="Main navigation"
    >
      <Show when={props.header}>
        <div class="border-b border-border p-4 flex items-center justify-between">
          {props.header}
        </div>
      </Show>

      <nav class="sidebar-nav">
        <div class="space-y-1">
          <For each={props.items}>
            {(item) => (
              <SidebarItem
                item={item}
                activeId={props.activeId}
                onSelect={props.onSelect}
                collapsed={props.collapsed}
              />
            )}
          </For>
        </div>
      </nav>

      <Show when={props.footer}>
        <div class="border-t border-border p-4">{props.footer}</div>
      </Show>
    </aside>
  );
}

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: JSX.Element;
  breadcrumbs?: { label: string; href?: string }[];
  onMenuToggle?: () => void;
  logo?: JSX.Element;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
}

export function Header(props: HeaderProps) {
  return (
    <header class="top-nav">
      <div class="top-nav-main">
        <div class="flex items-center gap-6">
          <Show when={props.logo}>
            {props.logo}
          </Show>
          <Show when={props.breadcrumbs}>
            <nav class="hidden items-center gap-2 text-sm sm:flex" aria-label="Breadcrumb">
              <For each={props.breadcrumbs}>
                {(crumb, index) => (
                  <>
                    <Show when={index() > 0}>
                      <span class="text-text-muted">/</span>
                    </Show>
                    <Show when={crumb.href} fallback={<span class="text-text-primary font-medium">{crumb.label}</span>}>
                      <a href={crumb.href} class="text-text-secondary hover:text-text-primary transition-colors">
                        {crumb.label}
                      </a>
                    </Show>
                  </>
                )}
              </For>
            </nav>
          </Show>
          <Show when={props.title && !props.breadcrumbs}>
            <div>
              <h1 class="text-lg font-semibold text-text-primary">{props.title}</h1>
              <Show when={props.subtitle}>
                <p class="text-xs text-text-secondary">{props.subtitle}</p>
              </Show>
            </div>
          </Show>
        </div>
        <Show when={props.actions}>
          <div class="flex items-center gap-3">{props.actions}</div>
        </Show>
      </div>
      <Show when={props.tabs && props.tabs.length > 0}>
        <div class="top-nav-tabs">
          <For each={props.tabs}>
            {(tab) => (
              <button
                class={`top-nav-tab ${props.activeTab === tab.id ? 'top-nav-tab-active' : ''}`}
                onClick={() => props.onTabChange?.(tab.id)}
              >
                {tab.label}
              </button>
            )}
          </For>
        </div>
      </Show>
    </header>
  );
}

interface LayoutProps {
  children: JSX.Element;
  sidebar?: JSX.Element;
  header?: JSX.Element;
  sidebarCollapsed?: boolean;
}

export function Layout(props: LayoutProps) {
  return (
    <div class="flex h-screen flex-col overflow-hidden bg-bg-main">
      <Show when={props.header}>
        {props.header}
      </Show>
      <div class="flex flex-1 overflow-hidden">
        <Show when={props.sidebar}>
          {props.sidebar}
        </Show>
        <main class="main-content">{props.children}</main>
      </div>
    </div>
  );
}

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: JSX.Element;
}

export function PageHeader(props: PageHeaderProps) {
  return (
    <div class="mb-6 flex flex-col gap-3 md:flex-row md:items-start md:justify-between animate-fade-in">
      <div class="space-y-1">
        <Show when={props.eyebrow}>
          <p class="text-xs font-semibold text-accent uppercase tracking-wider">{props.eyebrow}</p>
        </Show>
        <h1 class="text-2xl font-bold text-text-primary tracking-tight">{props.title}</h1>
        <Show when={props.description}>
          <p class="text-sm text-text-secondary max-w-2xl">{props.description}</p>
        </Show>
      </div>
      <Show when={props.actions}>
        <div class="flex flex-wrap gap-2">{props.actions}</div>
      </Show>
    </div>
  );
}

interface EmptyStateProps {
  icon?: JSX.Element;
  title: string;
  description?: string;
  action?: JSX.Element;
}

export function EmptyState(props: EmptyStateProps) {
  return (
    <div class="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
      <Show when={props.icon}>
        <div class="mb-4 text-text-muted opacity-40">{props.icon}</div>
      </Show>
      <h3 class="text-base font-semibold text-text-primary">{props.title}</h3>
      <Show when={props.description}>
        <p class="mt-1 text-sm text-text-secondary max-w-md">{props.description}</p>
      </Show>
      <Show when={props.action}>
        <div class="mt-6">{props.action}</div>
      </Show>
    </div>
  );
}
