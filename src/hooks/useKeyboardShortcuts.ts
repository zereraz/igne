/**
 * useKeyboardShortcuts Hook
 *
 * Manages global keyboard shortcuts for the application.
 * Now uses CommandRegistry to execute commands (Phase D).
 */

import { useEffect, useCallback } from 'react';
import { CommandRegistry } from '../commands/registry';
import type { CommandSource } from '../tools/types';

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
 * Check if a keyboard event matches a hotkey pattern
 */
function matchesHotkey(e: KeyboardEvent, key: string, modifiers?: { meta?: boolean; ctrl?: boolean; alt?: boolean; shift?: boolean }): boolean {
  if (e.key !== key) return false;

  const hasMeta = e.metaKey || e.ctrlKey; // Treat Cmd and Ctrl as equivalent

  if (modifiers?.meta && !hasMeta) return false;
  if (modifiers?.ctrl && !e.ctrlKey) return false;
  if (modifiers?.alt && !e.altKey) return false;
  if (modifiers?.shift && !e.shiftKey) return false;

  return true;
}

/**
 * Hook for registering global keyboard shortcuts
 * Phase D: Now uses CommandRegistry for command execution
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
  // Source for command executions from keyboard
  const source: CommandSource = 'ui';

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Find all commands with matching hotkeys
      const commands = CommandRegistry.getAll();

      for (const command of commands) {
        if (!command.hotkeys) continue;

        for (const hotkey of command.hotkeys) {
          if (matchesHotkey(e, hotkey.key, hotkey.modifiers)) {
            e.preventDefault();
            // Execute command via registry
            try {
              await CommandRegistry.execute(command.id, source);
            } catch (err) {
              console.error(`[useKeyboardShortcuts] Failed to execute command ${command.id}:`, err);
            }
            return; // Only execute first matching command
          }
        }
      }

      // Handle Escape key for closing settings (not registered as a command)
      if (e.key === 'Escape' && isSettingsOpen) {
        e.preventDefault();
        onCloseSettings?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCloseSettings, isSettingsOpen, source]);
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
