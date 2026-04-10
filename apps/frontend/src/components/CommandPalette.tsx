import { type JSX, For, Show, createSignal, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: JSX.Element;
  keywords?: string[];
  shortcut?: string;
  onExecute: () => void;
  category?: string;
}

interface CommandPaletteProps {
  commands: Command[];
  placeholder?: string;
  shortcut?: string;
}

export function CommandPalette(props: CommandPaletteProps) {
  const [open, setOpen] = createSignal(false);
  const [search, setSearch] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);
  let inputRef: HTMLInputElement | undefined;

  const shortcut = () => props.shortcut ?? "k";

  // Filter commands based on search
  const filteredCommands = () => {
    const query = search().toLowerCase();
    if (!query) return props.commands;

    return props.commands.filter((cmd) => {
      const searchText = [
        cmd.label,
        cmd.description,
        ...(cmd.keywords || []),
      ].join(" ").toLowerCase();
      return searchText.includes(query);
    });
  };

  // Group commands by category
  const groupedCommands = () => {
    const commands = filteredCommands();
    const groups = new Map<string, Command[]>();

    commands.forEach((cmd) => {
      const category = cmd.category || "Commands";
      if (!groups.has(category)) {
        groups.set(category, []);
      }
      groups.get(category)!.push(cmd);
    });

    return Array.from(groups.entries());
  };

  // Keyboard shortcuts
  createEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open with Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && e.key === shortcut()) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      if (!open()) return;

      // Close with Escape
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        setSearch("");
        setSelectedIndex(0);
        return;
      }

      // Navigate with arrows
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCommands().length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      }

      // Execute with Enter
      if (e.key === "Enter") {
        e.preventDefault();
        const commands = filteredCommands();
        if (commands[selectedIndex()]) {
          executeCommand(commands[selectedIndex()]);
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    onCleanup(() => document.removeEventListener("keydown", handleKeyDown));
  });

  // Focus input when opened
  createEffect(() => {
    if (open() && inputRef) {
      requestAnimationFrame(() => inputRef?.focus());
    }
  });

  // Reset selection when search changes
  createEffect(() => {
    search();
    setSelectedIndex(0);
  });

  const executeCommand = (command: Command) => {
    command.onExecute();
    setOpen(false);
    setSearch("");
    setSelectedIndex(0);
  };

  return (
    <>
      {/* Trigger button */}
      <button
        class="flex items-center gap-2 px-3 py-1.5 text-sm text-text-secondary bg-surface-1 border border-border rounded-lg hover:border-border-hover transition-colors"
        onClick={() => setOpen(true)}
      >
        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span>{props.placeholder ?? "Search..."}</span>
        <kbd class="ml-auto px-1.5 py-0.5 text-xs bg-surface-2 border border-border rounded">
          ⌘{shortcut().toUpperCase()}
        </kbd>
      </button>

      {/* Command palette modal */}
      <Show when={open()}>
        <Portal>
          <div
            class="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] animate-fade-in"
            onClick={() => setOpen(false)}
          >
            {/* Backdrop */}
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" />

            {/* Palette */}
            <div
              class="relative w-full max-w-2xl bg-surface-1 border border-border-strong rounded-xl shadow-elevated animate-scale-in"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search input */}
              <div class="flex items-center gap-3 px-4 py-3 border-b border-border">
                <svg class="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  ref={inputRef}
                  type="text"
                  class="flex-1 bg-transparent text-text-primary placeholder-text-muted outline-none"
                  placeholder={props.placeholder ?? "Type a command or search..."}
                  value={search()}
                  onInput={(e) => setSearch(e.currentTarget.value)}
                />
                <kbd class="px-2 py-1 text-xs text-text-muted bg-surface-2 border border-border rounded">
                  ESC
                </kbd>
              </div>

              {/* Commands list */}
              <div class="max-h-[400px] overflow-y-auto py-2">
                <Show
                  when={filteredCommands().length > 0}
                  fallback={
                    <div class="px-4 py-8 text-center text-text-muted">
                      <p>No commands found</p>
                    </div>
                  }
                >
                  <For each={groupedCommands()}>
                    {([category, commands]) => (
                      <div class="mb-2">
                        <div class="px-4 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
                          {category}
                        </div>
                        <For each={commands}>
                          {(command, index) => {
                            const globalIndex = filteredCommands().indexOf(command);
                            const isSelected = () => selectedIndex() === globalIndex;

                            return (
                              <button
                                class={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                  isSelected()
                                    ? "bg-accent-subtle text-accent"
                                    : "text-text-primary hover:bg-surface-2"
                                }`}
                                onClick={() => executeCommand(command)}
                                onMouseEnter={() => setSelectedIndex(globalIndex)}
                              >
                                <Show when={command.icon}>
                                  <span class="flex-shrink-0">{command.icon}</span>
                                </Show>
                                <div class="flex-1 min-w-0">
                                  <div class="font-medium">{command.label}</div>
                                  <Show when={command.description}>
                                    <div class="text-xs text-text-muted truncate">
                                      {command.description}
                                    </div>
                                  </Show>
                                </div>
                                <Show when={command.shortcut}>
                                  <kbd class="px-2 py-1 text-xs bg-surface-2 border border-border rounded">
                                    {command.shortcut}
                                  </kbd>
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

              {/* Footer */}
              <div class="flex items-center justify-between px-4 py-2 border-t border-border text-xs text-text-muted">
                <div class="flex items-center gap-4">
                  <span class="flex items-center gap-1">
                    <kbd class="px-1.5 py-0.5 bg-surface-2 border border-border rounded">↑</kbd>
                    <kbd class="px-1.5 py-0.5 bg-surface-2 border border-border rounded">↓</kbd>
                    to navigate
                  </span>
                  <span class="flex items-center gap-1">
                    <kbd class="px-1.5 py-0.5 bg-surface-2 border border-border rounded">↵</kbd>
                    to select
                  </span>
                </div>
                <span>{filteredCommands().length} commands</span>
              </div>
            </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
