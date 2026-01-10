// =============================================================================
// Scope - Keyboard Event Handling
// =============================================================================

import type { KeymapEventHandler } from './Keymap';

export class Scope {
  private handlers: KeymapEventHandler[] = [];

  register(
    modifiers: string[],
    key: string | null,
    func: (evt: KeyboardEvent) => boolean | void
  ): KeymapEventHandler {
    const handler: KeymapEventHandler = { modifiers, key, func };
    this.handlers.push(handler);
    return handler;
  }

  unregister(handler: KeymapEventHandler): void {
    const index = this.handlers.indexOf(handler);
    if (index > -1) {
      this.handlers.splice(index, 1);
    }
  }

  handle(evt: KeyboardEvent): boolean | void {
    for (const handler of this.handlers) {
      if (this.matches(evt, handler)) {
        return handler.func(evt);
      }
    }
    return false;
  }

  private matches(evt: KeyboardEvent, handler: KeymapEventHandler): boolean {
    // Check key match
    if (handler.key && evt.key !== handler.key) return false;
    if (handler.key === null && evt.key !== ' ') return false;

    // Check modifiers
    for (const mod of handler.modifiers) {
      if (mod === 'Mod' && !evt.metaKey && !evt.ctrlKey) return false;
      if (mod === 'Ctrl' && !evt.ctrlKey) return false;
      if (mod === 'Meta' && !evt.metaKey) return false;
      if (mod === 'Shift' && !evt.shiftKey) return false;
      if (mod === 'Alt' && !evt.altKey) return false;
    }

    return true;
  }
}
