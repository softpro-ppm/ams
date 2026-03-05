import { useEffect } from "react";

export type KeyboardShortcut = {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: () => void;
  description: string;
};

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const metaMatch = shortcut.metaKey !== undefined 
          ? (event.ctrlKey || event.metaKey) === shortcut.metaKey
          : !event.ctrlKey && !event.metaKey;
        const ctrlMatch = shortcut.ctrlKey !== undefined 
          ? event.ctrlKey === shortcut.ctrlKey
          : true;
        const shiftMatch = shortcut.shiftKey === undefined 
          ? true 
          : event.shiftKey === shortcut.shiftKey;
        const altMatch = shortcut.altKey === undefined 
          ? true 
          : event.altKey === shortcut.altKey;

        if (keyMatch && metaMatch && ctrlMatch && shiftMatch && altMatch) {
          event.preventDefault();
          shortcut.action();
          break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [shortcuts]);
}

export const SHORTCUTS: Record<string, string> = {
  "⌘K": "Open command palette",
  "⌘N": "New transaction",
  "⌘L": "New loan",
  "⌘P": "New project",
  "⌘/": "Show keyboard shortcuts",
  "⌘1": "Go to Dashboard",
  "⌘2": "Go to Transactions",
  "⌘3": "Go to Loans",
  "⌘4": "Go to Reports",
  "⌘,": "Go to Settings",
  "Esc": "Close dialogs",
};

