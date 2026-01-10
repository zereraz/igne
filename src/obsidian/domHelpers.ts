// =============================================================================
// DOM Helpers - Obsidian Compatibility Functions
// =============================================================================

/**
 * Extend HTMLElement with Obsidian-style helper methods
 */
declare global {
  interface HTMLElement {
    createDiv(opts?: { cls?: string; attr?: Record<string, string> }): HTMLDivElement;
    createEl<K extends keyof HTMLElementTagNameMap>(
      tag: K,
      opts?: { cls?: string; attr?: Record<string, string> }
    ): HTMLElementTagNameMap[K];
    empty(): void;
    addClass(cls: string): void;
    removeClass(cls: string): void;
    hasClass(cls: string): boolean;
    toggleClass(cls: string, force?: boolean): boolean;
    setAttr(key: string, value: string): void;
  }
}

// Polyfill for empty method
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.empty) {
  HTMLElement.prototype.empty = function(): void {
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
  };
}

// Polyfill for createDiv method
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.createDiv) {
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
}

// Polyfill for createEl method
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.createEl) {
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
}

// Polyfill for hasClass method
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.hasClass) {
  HTMLElement.prototype.hasClass = function(cls: string): boolean {
    return this.classList.contains(cls);
  };
}

// Polyfill for toggleClass method
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.toggleClass) {
  HTMLElement.prototype.toggleClass = function(cls: string, force?: boolean): boolean {
    return this.classList.toggle(cls, force);
  };
}

// Polyfill for addClass method
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.addClass) {
  HTMLElement.prototype.addClass = function(cls: string): void {
    this.classList.add(cls);
  };
}

// Polyfill for removeClass method
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.removeClass) {
  HTMLElement.prototype.removeClass = function(cls: string): void {
    this.classList.remove(cls);
  };
}

// Polyfill for setAttr method
if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.setAttr) {
  HTMLElement.prototype.setAttr = function(key: string, value: string): void {
    this.setAttribute(key, value);
  };
}

export {};
