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
  private app: App;

  constructor(app: App) {
    // Store app reference for future use
    this.app = app;
  }

  // Full implementation in later phase
}

// Re-export Scope from the Scope module
export { Scope } from './Scope';

export type EventName = string;
