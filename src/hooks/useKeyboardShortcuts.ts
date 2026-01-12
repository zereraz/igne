/**
 * useKeyboardShortcuts Hook
 *
 * Manages global keyboard shortcuts for the application.
 * Provides a centralized way to register and handle keyboard events.
 */

import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: (e: KeyboardEvent) => void;
  description?: string;
}

interface UseKeyboardShortcutsOptions {
  onSave?: () => void;
  onQuickSwitcher?: () => void;
  onOpenDailyNote?: () => void;
  onOpenTemplateModal?: () => void;
  onOpenSettings?: () => void;
  onCloseSettings?: () => void;
  isSettingsOpen?: boolean;
}

/**
 * Hook for registering global keyboard shortcuts
 */
export function useKeyboardShortcuts({
  onSave,
  onQuickSwitcher,
  onOpenDailyNote,
  onOpenTemplateModal,
  onOpenSettings,
  onCloseSettings,
  isSettingsOpen = false,
}: UseKeyboardShortcutsOptions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S - Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        onSave?.();
      }
      // Cmd/Ctrl + P - Quick switcher
      else if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        onQuickSwitcher?.();
      }
      // Cmd/Ctrl + Shift + D - Daily note
      else if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        onOpenDailyNote?.();
      }
      // Cmd/Ctrl + T - Template modal
      else if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        onOpenTemplateModal?.();
      }
      // Cmd/Ctrl + , - Settings
      else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        onOpenSettings?.();
      }
      // Escape - Close settings
      else if (e.key === 'Escape' && isSettingsOpen) {
        e.preventDefault();
        onCloseSettings?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onQuickSwitcher, onOpenDailyNote, onOpenTemplateModal, onOpenSettings, onCloseSettings, isSettingsOpen]);
}

/**
 * Hook for registering custom keyboard shortcuts
 */
export function useCustomShortcuts(shortcuts: KeyboardShortcut[]) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = e.key === shortcut.key;
        const ctrlMatch = shortcut.ctrlKey ? e.ctrlKey || e.metaKey : !e.ctrlKey && !e.metaKey;
        const metaMatch = shortcut.metaKey ? e.metaKey : !e.metaKey;
        const shiftMatch = shortcut.shiftKey ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.altKey ? e.altKey : !e.altKey;

        if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.handler(e);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}
