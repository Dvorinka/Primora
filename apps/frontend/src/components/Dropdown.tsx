import { type JSX, Show, For, createSignal, createEffect, onCleanup, splitProps } from "solid-js";
import { Portal } from "solid-js/web";

interface DropdownItem {
  id: string;
  label: string;
  icon?: JSX.Element;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
  onClick?: () => void;
}

interface DropdownProps {
  items: DropdownItem[];
  trigger: JSX.Element;
  placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  closeOnSelect?: boolean;
}

export function Dropdown(props: DropdownProps) {
  const [local] = splitProps(props, ["items", "trigger", "placement", "closeOnSelect"]);
  const [open, setOpen] = createSignal(false);
  const [position, setPosition] = createSignal({ x: 0, y: 0 });
  let triggerRef: HTMLDivElement | undefined;
  let menuRef: HTMLDivElement | undefined;

  const placement = () => local.placement ?? "bottom-start";
  const closeOnSelect = () => local.closeOnSelect ?? true;

  const calculatePosition = () => {
    if (!triggerRef || !menuRef) return;

    const triggerRect = triggerRef.getBoundingClientRect();
    const menuRect = menuRef.getBoundingClientRect();
    const gap = 4;

    let x = 0;
    let y = 0;

    switch (placement()) {
      case "bottom-start":
        x = triggerRect.left;
        y = triggerRect.bottom + gap;
        break;
      case "bottom-end":
        x = triggerRect.right - menuRect.width;
        y = triggerRect.bottom + gap;
        break;
      case "top-start":
        x = triggerRect.left;
        y = triggerRect.top - menuRect.height - gap;
        break;
      case "top-end":
        x = triggerRect.right - menuRect.width;
        y = triggerRect.top - menuRect.height - gap;
        break;
    }

    // Keep menu within viewport
    x = Math.max(8, Math.min(x, window.innerWidth - menuRect.width - 8));
    y = Math.max(8, Math.min(y, window.innerHeight - menuRect.height - 8));

    setPosition({ x, y });
  };

  createEffect(() => {
    if (open()) {
      requestAnimationFrame(calculatePosition);
      
      const handleClickOutside = (e: MouseEvent) => {
        if (
          triggerRef &&
          menuRef &&
          !triggerRef.contains(e.target as Node) &&
          !menuRef.contains(e.target as Node)
        ) {
          setOpen(false);
        }
      };

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === "Escape") {
          setOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);

      onCleanup(() => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscape);
      });
    }
  });

  const handleItemClick = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onClick?.();
    if (closeOnSelect()) {
      setOpen(false);
    }
  };

  return (
    <>
      <div
        ref={triggerRef}
        onClick={() => setOpen(!open())}
        class="inline-block"
      >
        {local.trigger}
      </div>
      <Show when={open()}>
        <Portal>
          <div
            ref={menuRef}
            class="fixed z-50 min-w-[200px] bg-surface-1 border border-border-strong rounded-lg shadow-elevated py-1 animate-scale-in"
            style={{
              left: `${position().x}px`,
              top: `${position().y}px`,
            }}
            role="menu"
          >
            <For each={local.items}>
              {(item) => (
                <Show
                  when={!item.divider}
                  fallback={<div class="my-1 h-px bg-border" role="separator" />}
                >
                  <button
                    class={`w-full flex items-center gap-3 px-4 py-2 text-sm text-left transition-colors ${
                      item.disabled
                        ? "opacity-50 cursor-not-allowed"
                        : item.danger
                          ? "text-error hover:bg-error-muted"
                          : "text-text-primary hover:bg-surface-2"
                    }`}
                    onClick={() => handleItemClick(item)}
                    disabled={item.disabled}
                    role="menuitem"
                  >
                    <Show when={item.icon}>
                      <span class="flex-shrink-0">{item.icon}</span>
                    </Show>
                    <span class="flex-1">{item.label}</span>
                  </button>
                </Show>
              )}
            </For>
          </div>
        </Portal>
      </Show>
    </>
  );
}
