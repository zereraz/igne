/**
 * Command types for Phase D: Command Registry + Tool Layer
 *
 * Commands are user-facing actions that use tools to perform operations.
 * They can be invoked from UI, plugins, or AI agents.
 */

import type { CommandSource } from '../tools/types';

// =============================================================================
// Hotkey Types
// =============================================================================

export interface HotkeyModifiers {
  meta?: boolean;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
}

export interface Hotkey {
  key: string;
  modifiers?: HotkeyModifiers;
}

/**
 * Convert a Hotkey to a string representation
 */
export function hotkeyToString(hotkey: Hotkey): string {
  const parts: string[] = [];
  if (hotkey.modifiers?.meta) parts.push('Cmd');
  if (hotkey.modifiers?.ctrl) parts.push('Ctrl');
  if (hotkey.modifiers?.alt) parts.push('Alt');
  if (hotkey.modifiers?.shift) parts.push('Shift');
  parts.push(hotkey.key);
  return parts.join('+');
}

// =============================================================================
// Command Types
// =============================================================================

export type CommandCallback = (...args: unknown[]) => unknown;

export interface Command {
  /**
   * Unique identifier for this command
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Optional label for UI display
   */
  label?: string;

  /**
   * Optional icon name (lucide-react icon)
   */
  icon?: string;

  /**
   * Callback to execute when command is invoked
   */
  callback: CommandCallback;

  /**
   * Optional hotkeys for this command
   */
  hotkeys?: Hotkey[];

  /**
   * Optional category for grouping commands
   */
  category?: string;

  /**
   * Optional description
   */
  description?: string;

  /**
   * Whether this command should be logged to audit
   * @default true
   */
  audit?: boolean;
}

// =============================================================================
// Event Types
// =============================================================================

export interface EventRef {
  id: string;
  unregister: () => void;
}

export interface CommandExecutedEvent {
  commandId: string;
  source: CommandSource;
  timestamp: number;
  success: boolean;
  args?: unknown[];
}

export type CommandExecutedListener = (event: CommandExecutedEvent) => void;
