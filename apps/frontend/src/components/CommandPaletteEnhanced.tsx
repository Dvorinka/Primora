import { Show, For, createSignal, createEffect, onCleanup } from "solid-js";
import { Portal } from "solid-js/web";

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: any;
  keywords?: string[];
  action: () => void;
  category?: string;
}

interface CommandPaletteEnhancedProps {
  commands: Command[];
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPaletteEnhanced(props: CommandPaletteEnhancedProps) {
  const [search, setSearch] = createSignal("");
  const [selectedIndex, setSelectedIndex] = createSignal(0);

  const filteredCommands = () => {
    const query = search().toLowerCase();
    if (!query) return props.commands;

    return props.commands.filter(cmd => {
      const searchText = `${cmd.label} ${cmd.description || ""} ${cmd.keywords?.join(" ") || ""}`.toLowerCase();
      return searchText.includes(query);
    });
  };

  const groupedCommands = () => {
    const commands = filteredCommands();
    const groups: Record<string, Command[]> = {};

    commands.forEach(cmd => {
      const category = cmd.category || "General";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(cmd);
    });

    return groups;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!props.isOpen) return;

    const commands = filteredCommands();

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, commands.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
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
    }

    onCleanup(() => {
      document.removeEventListener("keydown", handleKeyDown);
    });
  });

  return (
    <Show when={props.isOpen}>
      <Portal>
        <div class="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 animate-fade-in">
          {/* Backdrop */}
          <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={props.onClose}
          />

          {/* Command Palette */}
          <div class="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl animate-scale-in">
            {/* Search Input */}
            <div class="p-4 border-b border-gray-200">
              <div class="flex items-center gap-3">
                <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search commands..."
                  value={search()}
                  onInput={(e) => setSearch(e.currentTarget.value)}
                  class="flex-1 bg-transparent border-none outline-none text-lg"
                  autofocus
                />
                <kbd class="px-2 py-1 text-xs bg-gray-100 rounded border border-gray-300">ESC</kbd>
              </div>
            </div>

            {/* Commands List */}
            <div class="max-h-96 overflow-y-auto">
              <Show
                when={Object.keys(groupedCommands()).length > 0}
                fallback={
                  <div class="p-8 text-center text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>No commands found</p>
                  </div>
                }
              >
                <For each={Object.entries(groupedCommands())}>
                  {([category, commands]) => (
                    <div>
                      <div class="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                        {category}
                      </div>
                      <For each={commands}>
                        {(command, index) => {
                          const globalIndex = filteredCommands().indexOf(command);
                          return (
                            <button
                              class={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                                selectedIndex() === globalIndex
                                  ? "bg-blue-50 border-l-2 border-blue-500"
                                  : "hover:bg-gray-50"
                              }`}
                              onClick={() => {
                                command.action();
                                props.onClose();
                              }}
                              onMouseEnter={() => setSelectedIndex(globalIndex)}
                            >
                              <Show when={command.icon}>
                                <div class="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg">
                                  {command.icon}
                                </div>
                              </Show>
                              <div class="flex-1 min-w-0">
                                <div class="font-medium text-gray-900">{command.label}</div>
                                <Show when={command.description}>
                                  <div class="text-sm text-gray-600 truncate">{command.description}</div>
                                </Show>
                              </div>
                              <Show when={selectedIndex() === globalIndex}>
                                <kbd class="px-2 py-1 text-xs bg-gray-100 rounded border border-gray-300">↵</kbd>
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
            <div class="p-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-600">
              <div class="flex items-center gap-4">
                <span class="flex items-center gap-1">
                  <kbd class="px-1.5 py-0.5 bg-white rounded border border-gray-300">↑</kbd>
                  <kbd class="px-1.5 py-0.5 bg-white rounded border border-gray-300">↓</kbd>
                  Navigate
                </span>
                <span class="flex items-center gap-1">
                  <kbd class="px-1.5 py-0.5 bg-white rounded border border-gray-300">↵</kbd>
                  Select
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
