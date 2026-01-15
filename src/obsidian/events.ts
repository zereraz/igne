// =============================================================================
// Events Base Class
// =============================================================================

import type { EventRef } from './eventRef';

/**
 * Base class for event emitters.
 * Matches Obsidian's Events class for plugin compatibility.
 */
export abstract class Events {
  private events: Map<string, EventRef[]> = new Map();

  /**
   * Register an event handler
   * @param name - Event name
   * @param callback - Handler function
   * @returns EventRef that can be used to unregister
   */
  on(name: string, callback: (...args: unknown[]) => unknown): EventRef {
    const ref: EventRef = {
      registered: true,
      ctx: null,
      fn: callback,
    };

    if (!this.events.has(name)) {
      this.events.set(name, []);
    }
    this.events.get(name)!.push(ref);

    return ref;
  }

  /**
   * Unregister an event handler
   * @param name - Event name
   * @param ref - EventRef returned from on()
   */
  off(name: string, ref: EventRef): void {
    const callbacks = this.events.get(name);
    if (callbacks) {
      const index = callbacks.indexOf(ref);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Trigger an event
   * @param name - Event name
   * @param args - Arguments to pass to handlers
   */
  trigger(name: string, ...args: unknown[]): void {
    const callbacks = this.events.get(name);
    if (callbacks) {
      for (const callback of callbacks) {
        if (callback.registered) {
          callback.fn(...args);
        }
      }
    }
  }

  /**
   * Try to trigger an event (same as trigger, for Obsidian compatibility)
   */
  tryTrigger(evt: string, ...args: unknown[]): void {
    this.trigger(evt, ...args);
  }
}

export type EventName =
  | 'create'
  | 'modify'
  | 'delete'
  | 'rename'
  | 'active-leaf-change'
  | 'file-open'
  | 'layout-change'
  | 'css-change'
  | 'quit'
  | 'codemirror';
