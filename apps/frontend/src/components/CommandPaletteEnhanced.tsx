import { Show, For, createSignal, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";
import { IconSearch } from "./Icons";

export interface PaletteCommand {
  id: string;
  label: string;
  description?: string;
  icon?: any;
  keywords?: string[];
  action: () => void;
  category?: string;
}

interface CommandPaletteEnhancedProps {
  commands: PaletteCommand[];
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPaletteEnhanced(props: CommandPaletteEnhancedProps) {
  const [search, setSearch] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;

  const filteredCommands = () => {
    const query = search().toLowerCase().trim();
    if (!query) return props.commands;

    return props.commands.filter((cmd) => {
      const searchText =
        `${cmd.label} ${cmd.description || ""} ${cmd.keywords?.join(" ") || ""}`.toLowerCase();
      return searchText.includes(query);
    });
  };

  const groupedCommands = () => {
    const groups: Record<string, PaletteCommand[]> = {};
    for (const cmd of filteredCommands()) {
      const category = cmd.category || "General";
      (groups[category] ??= []).push(cmd);
    }
    return groups;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isOpen) return;
    const commands = filteredCommands();

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, commands.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (commands[selectedIndex()]) {
          commands[selectedIndex()].action();
          props.onClose();
        }
        break;
      case "Escape":
        e.preventDefault();
        props.onClose();
        break;
    }
  };

  createEffect(() => {
    if (props.isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      setSearch("");
      setSelectedIndex(0);
      queueMicrotask(() => inputRef?.focus());
    }

    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
  });

  createEffect(() => {
    search();
    setSelectedIndex(0);
  });

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 animate-fade-in">
          <div
            class="absolute inset-0"
            style="background:rgba(0,0,0,0.55);backdrop-filter:blur(3px)"
            onClick={props.onClose}
          />

          <div
            class="relative w-full animate-scale-in"
            style="max-width:34rem;background:var(--surface);border:1px solid var(--border-strong);border-radius:var(--radius-lg);box-shadow:var(--shadow-overlay);overflow:hidden"
            role="dialog"
            aria-label="Command palette"
          >
            {/* search */}
            <div
              class="flex items-center gap-3 px-4"
              style="border-bottom:1px solid var(--border);height:3.25rem"
            >
              <IconSearch class="w-4 h-4 text-text-3" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a command or search…"
                value={search()}
                onInput={(e) => setSearch(e.currentTarget.value)}
                class="flex-1 bg-transparent border-none outline-none text-sm"
                style="color:var(--text-1)"
              />
              <kbd class="kbd">ESC</kbd>
            </div>

            {/* results */}
            <div style="max-height:20rem;overflow-y:auto">
              <Show
                when={filteredCommands().length > 0}
                fallback={
                  <div class="empty-state" style="padding:2.5rem 1.5rem">
                    <p class="empty-state-title">No results</p>
                    <p class="empty-state-description">
                      Nothing matches “{search()}”.
                    </p>
                  </div>
                }
              >
                <For each={Object.entries(groupedCommands())}>
                  {([category, commands]) => (
                    <div>
                      <div
                        class="px-4 py-1.5"
                        style="font-size:0.625rem;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--text-3)"
                      >
                        {category}
                      </div>
                      <For each={commands}>
                        {(command) => {
                          const globalIndex = () =>
                            filteredCommands().indexOf(command);
                          return (
                            <button
                              class="w-full flex items-center gap-3 px-4 text-left"
                              style={`padding-top:0.55rem;padding-bottom:0.55rem;background:${
                                selectedIndex() === globalIndex()
                                  ? "var(--accent-muted)"
                                  : "transparent"
                              };border:none;cursor:pointer`}
                              onClick={() => {
                                command.action();
                                props.onClose();
                              }}
                              onMouseEnter={() => setSelectedIndex(globalIndex())}
                            >
                              <Show when={command.icon}>
                                <span
                                  class="flex items-center justify-center rounded-md flex-shrink-0"
                                  style="width:1.75rem;height:1.75rem;background:var(--surface-2);color:var(--text-2)"
                                >
                                  {command.icon}
                                </span>
                              </Show>
                              <span class="flex-1 min-w-0">
                                <span
                                  class="block truncate"
                                  style="font-size:0.8125rem;font-weight:500;color:var(--text-1)"
                                >
                                  {command.label}
                                </span>
                                <Show when={command.description}>
                                  <span
                                    class="block truncate"
                                    style="font-size:0.75rem;color:var(--text-3)"
                                  >
                                    {command.description}
                                  </span>
                                </Show>
                              </span>
                              <Show when={selectedIndex() === globalIndex()}>
                                <kbd class="kbd">↵</kbd>
                              </Show>
                            </button>
                          );
                        }}
                      </For>
                    </div>
                  )}
                </For>
              </Show>
            </div>

            {/* footer */}
            <div
              class="flex items-center justify-between px-4 text-xs"
              style="height:2.5rem;border-top:1px solid var(--border);color:var(--text-3)"
            >
              <div class="flex items-center gap-3">
                <span class="flex items-center gap-1">
                  <kbd class="kbd">↑</kbd>
                  <kbd class="kbd">↓</kbd>
                  navigate
                </span>
                <span class="flex items-center gap-1">
                  <kbd class="kbd">↵</kbd>
                  select
                </span>
              </div>
              <span>{filteredCommands().length} commands</span>
            </div>
          </div>
        </div>
      </Portal>
    </Show>
  );
}
