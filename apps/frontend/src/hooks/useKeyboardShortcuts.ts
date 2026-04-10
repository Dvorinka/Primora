import { onCleanup, onMount } from "solid-js";

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description?: string;
  action: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = (event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatches = shortcut.ctrl === undefined || event.ctrlKey === shortcut.ctrl;
      const shiftMatches = shortcut.shift === undefined || event.shiftKey === shortcut.shift;
      const altMatches = shortcut.alt === undefined || event.altKey === shortcut.alt;
      const metaMatches = shortcut.meta === undefined || event.metaKey === shortcut.meta;

      if (keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.action(event);
        break;
      }
    }
  };

  onMount(() => {
    document.addEventListener("keydown", handleKeyDown);
  });

  onCleanup(() => {
    document.removeEventListener("keydown", handleKeyDown);
  });
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];
  
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  
  if (shortcut.ctrl) parts.push(isMac ? "⌃" : "Ctrl");
  if (shortcut.alt) parts.push(isMac ? "⌥" : "Alt");
  if (shortcut.shift) parts.push(isMac ? "⇧" : "Shift");
  if (shortcut.meta) parts.push(isMac ? "⌘" : "Win");
  
  parts.push(shortcut.key.toUpperCase());
  
  return parts.join(isMac ? "" : "+");
}

/**
 * Common keyboard shortcuts
 */
export const commonShortcuts = {
  save: { key: "s", ctrl: true, meta: true, description: "Save" },
  copy: { key: "c", ctrl: true, meta: true, description: "Copy" },
  paste: { key: "v", ctrl: true, meta: true, description: "Paste" },
  cut: { key: "x", ctrl: true, meta: true, description: "Cut" },
  undo: { key: "z", ctrl: true, meta: true, description: "Undo" },
  redo: { key: "z", ctrl: true, meta: true, shift: true, description: "Redo" },
  selectAll: { key: "a", ctrl: true, meta: true, description: "Select All" },
  find: { key: "f", ctrl: true, meta: true, description: "Find" },
  newTab: { key: "t", ctrl: true, meta: true, description: "New Tab" },
  closeTab: { key: "w", ctrl: true, meta: true, description: "Close Tab" },
  refresh: { key: "r", ctrl: true, meta: true, description: "Refresh" },
  commandPalette: { key: "k", ctrl: true, meta: true, description: "Command Palette" },
  settings: { key: ",", ctrl: true, meta: true, description: "Settings" },
  escape: { key: "Escape", description: "Cancel/Close" },
  enter: { key: "Enter", description: "Confirm/Submit" },
  arrowUp: { key: "ArrowUp", description: "Move Up" },
  arrowDown: { key: "ArrowDown", description: "Move Down" },
  arrowLeft: { key: "ArrowLeft", description: "Move Left" },
  arrowRight: { key: "ArrowRight", description: "Move Right" },
};
