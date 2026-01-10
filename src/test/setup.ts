// =============================================================================
// Test Setup - DOM Polyfills and Global Configuration
// =============================================================================

import { vi } from 'vitest';
import { JSDOM } from 'jsdom';

// Setup jsdom
const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
  url: 'http://localhost:3000',
  pretendToBeVisual: true,
});

// Copy globals from jsdom to global scope
global.document = dom.window.document;
global.window = dom.window as any;
global.navigator = dom.window.navigator;
global.HTMLElement = dom.window.HTMLElement;
global.HTMLDivElement = dom.window.HTMLDivElement;
global.HTMLSpanElement = dom.window.HTMLSpanElement;
global.MutationObserver = dom.window.MutationObserver;
global.MouseEvent = dom.window.MouseEvent;
global.KeyboardEvent = dom.window.KeyboardEvent;
global.InputEvent = dom.window.InputEvent;

// Copy document methods
global.document.createElement = dom.window.document.createElement;
global.document.createTextNode = dom.window.document.createTextNode;

// Mock Tauri internals
(global.window as any).__TAURI_INTERNALS__ = {
  invoke: vi.fn(() => Promise.resolve({})),
};

// Extend global HTMLElement with Obsidian-compatible methods
declare global {
  interface HTMLElement {
    createDiv(opts?: { cls?: string; attr?: Record<string, string> }): HTMLDivElement;
    createEl<K extends keyof HTMLElementTagNameMap>(
      tag: K,
      opts?: { cls?: string; attr?: Record<string, string> }
    ): HTMLElementTagNameMap[K];
    addClass(cls: string): void;
    removeClass(cls: string): void;
    hasClass(cls: string): boolean;
    toggleClass(cls: string, force?: boolean): boolean;
    setAttr(key: string, value: string): void;
  }
}

// Add createDiv method to HTMLElement prototype
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.createDiv = function(opts?: { cls?: string; attr?: Record<string, string> }) {
    const div = document.createElement('div');
    if (opts?.cls) {
      div.className = opts.cls;
    }
    if (opts?.attr) {
      Object.entries(opts.attr).forEach(([key, value]) => {
        div.setAttribute(key, value);
      });
    }
    this.appendChild(div);
    return div;
  };

  // Add createEl method to HTMLElement prototype
  HTMLElement.prototype.createEl = function<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    opts?: { cls?: string; attr?: Record<string, string> }
  ): HTMLElementTagNameMap[K] {
    const el = document.createElement(tag);
    if (opts?.cls) {
      el.className = opts.cls;
    }
    if (opts?.attr) {
      Object.entries(opts.attr).forEach(([key, value]) => {
        el.setAttribute(key, value);
      });
    }
    this.appendChild(el);
    return el;
  };

  // Add hasClass method to HTMLElement prototype
  HTMLElement.prototype.hasClass = function(cls: string): boolean {
    return this.classList.contains(cls);
  };

  // Add toggleClass method to HTMLElement prototype
  HTMLElement.prototype.toggleClass = function(cls: string, force?: boolean): boolean {
    return this.classList.toggle(cls, force);
  };

  // Add addClass method to HTMLElement prototype
  HTMLElement.prototype.addClass = function(cls: string): void {
    this.classList.add(cls);
  };

  // Add removeClass method to HTMLElement prototype
  HTMLElement.prototype.removeClass = function(cls: string): void {
    this.classList.remove(cls);
  };

  // Add setAttr method to HTMLElement prototype
  HTMLElement.prototype.setAttr = function(key: string, value: string): void {
    this.setAttribute(key, value);
  };
}

// Mock window.matchMedia
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

export {};
