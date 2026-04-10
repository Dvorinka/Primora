import { type JSX, For, Show, createSignal, splitProps } from "solid-js";

interface Tab {
  id: string;
  label: string;
  icon?: JSX.Element;
  badge?: string | number;
  disabled?: boolean;
  content?: JSX.Element;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onChange?: (tabId: string) => void;
  variant?: "default" | "pills" | "underline";
  size?: "sm" | "md" | "lg";
}

export function Tabs(props: TabsProps) {
  const [local] = splitProps(props, ["tabs", "defaultTab", "activeTab", "onChange", "variant", "size"]);
  const [internalActiveTab, setInternalActiveTab] = createSignal(local.defaultTab ?? local.tabs[0]?.id);

  const activeTab = () => local.activeTab ?? internalActiveTab();

  const variant = () => local.variant ?? "default";
  const size = () => local.size ?? "md";

  const handleTabChange = (tabId: string) => {
    setInternalActiveTab(tabId);
    local.onChange?.(tabId);
  };

  const sizeClasses = {
    sm: "text-xs px-3 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-5 py-2.5",
  };

  const getTabClasses = (tab: Tab) => {
    const isActive = activeTab() === tab.id;
    const base = `${sizeClasses[size()]} font-medium transition-all duration-fast flex items-center gap-2`;

    if (tab.disabled) {
      return `${base} opacity-50 cursor-not-allowed`;
    }

    switch (variant()) {
      case "pills":
        return `${base} rounded-lg ${
          isActive
            ? "bg-accent text-white shadow-sm"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
        }`;
      case "underline":
        return `${base} border-b-2 ${
          isActive
            ? "border-accent text-accent"
            : "border-transparent text-text-secondary hover:text-text-primary hover:border-border-hover"
        }`;
      default:
        return `${base} rounded-lg ${
          isActive
            ? "bg-surface-2 text-text-primary"
            : "text-text-secondary hover:text-text-primary hover:bg-surface-1"
        }`;
    }
  };

  return (
    <div class="w-full">
      <div
        class={`flex gap-1 ${variant() === "underline" ? "border-b border-border" : ""}`}
        role="tablist"
      >
        <For each={local.tabs}>
          {(tab) => (
            <button
              class={getTabClasses(tab)}
              onClick={() => !tab.disabled && handleTabChange(tab.id)}
              disabled={tab.disabled}
              role="tab"
              aria-selected={activeTab() === tab.id}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
            >
              <Show when={tab.icon}>
                <span class="flex-shrink-0">{tab.icon}</span>
              </Show>
              <span>{tab.label}</span>
              <Show when={tab.badge}>
                <span class="badge-neutral text-2xs">{tab.badge}</span>
              </Show>
            </button>
          )}
        </For>
      </div>
      <div class="mt-4">
        <For each={local.tabs}>
          {(tab) => (
            <Show when={activeTab() === tab.id}>
              <div
                role="tabpanel"
                id={`panel-${tab.id}`}
                aria-labelledby={`tab-${tab.id}`}
                class="animate-fade-in"
              >
                {tab.content}
              </div>
            </Show>
          )}
        </For>
      </div>
    </div>
  );
}

interface TabPanelProps extends JSX.HTMLAttributes<HTMLDivElement> {
  value: string;
  activeValue: string;
}

export function TabPanel(props: TabPanelProps) {
  const [local, rest] = splitProps(props, ["value", "activeValue", "children", "class"]);

  return (
    <Show when={local.value === local.activeValue}>
      <div
        role="tabpanel"
        class={`animate-fade-in ${local.class ?? ""}`}
        {...rest}
      >
        {local.children}
      </div>
    </Show>
  );
}
