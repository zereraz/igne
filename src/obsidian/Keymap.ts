// =============================================================================
// Keymap - Keyboard Shortcut Management
// =============================================================================

import type { App } from './App';

export interface KeymapEventHandler {
  modifiers: string[];
  key: string | null;
  func: (evt: KeyboardEvent) => boolean | void;
}

export class Keymap {
  constructor(app: App) {
    // Store app reference for future use
    this.app = app;
  }

  // @ts-expect-error - Property 'app' is declared but its value is never read (placeholder implementation)
  private app: App;

  // Full implementation in later phase
}

// Re-export Scope from the Scope module
export { Scope } from './Scope';

export type EventName = string;
