// =============================================================================
// Events Base Class
// =============================================================================

import type { EventRef } from './eventRef';

export abstract class Events {
  private events: Map<string, EventRef[]> = new Map();

  on(name: string, callback: (...args: any[]) => any): EventRef {
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

  off(name: string, ref: EventRef): void {
    const callbacks = this.events.get(name);
    if (callbacks) {
      const index = callbacks.indexOf(ref);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  trigger(name: string, ...args: any[]): void {
    const callbacks = this.events.get(name);
    if (callbacks) {
      for (const callback of callbacks) {
        if (callback.registered) {
          callback.fn(...args);
        }
      }
    }
  }

  tryTrigger(evt: string, ...args: any[]): void {
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
