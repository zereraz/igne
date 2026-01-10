// =============================================================================
// Menu - Context Menu Component
// =============================================================================

import { Component } from './Component';
import type { IconName } from './types';

// Helper function to create a div with class
function createDiv(cls: string): HTMLDivElement {
  const div = document.createElement('div');
  div.classList.add(cls);
  return div;
}

export interface MenuItemCallback {
  (evt: MouseEvent | KeyboardEvent): any;
}

/**
 * MenuItem - A single item in a menu
 */
export class MenuItem extends Component {
  dom: HTMLElement;
  private titleEl: HTMLElement;
  private iconEl: HTMLElement | null = null;
  private callback: MenuItemCallback | null = null;

  constructor() {
    super();
    this.dom = createDiv('menu-item');
    this.dom.setAttribute('tabindex', '0');
    this.dom.setAttribute('role', 'menuitem');

    this.titleEl = document.createElement('div');
    this.titleEl.classList.add('menu-item-title');
    this.dom.appendChild(this.titleEl);

    // Handle click events
    this.dom.addEventListener('click', (evt) => {
      if (this.callback) {
        this.callback(evt);
        // Close menu after item is clicked
        const menu = this.dom.closest('.menu') as HTMLElement;
        if (menu) {
          menu.remove();
        }
      }
    });

    // Handle keyboard events
    this.dom.addEventListener('keydown', (evt) => {
      if (evt.key === 'Enter' || evt.key === ' ') {
        evt.preventDefault();
        if (this.callback) {
          this.callback(evt);
          const menu = this.dom.closest('.menu') as HTMLElement;
          if (menu) {
            menu.remove();
          }
        }
      }
    });
  }

  setTitle(title: string | DocumentFragment): this {
    // Clear existing content
    if (typeof this.titleEl.empty === 'function') {
      this.titleEl.empty();
    } else {
      while (this.titleEl.firstChild) {
        this.titleEl.removeChild(this.titleEl.firstChild);
      }
    }

    if (typeof title === 'string') {
      this.titleEl.textContent = title;
    } else {
      this.titleEl.appendChild(title);
    }
    return this;
  }

  setIcon(icon: IconName | null): this {
    if (this.iconEl) {
      this.iconEl.remove();
      this.iconEl = null;
    }

    if (icon) {
      this.iconEl = document.createElement('span');
      this.iconEl.classList.add('menu-item-icon');
      this.iconEl.textContent = icon;
      this.dom.insertBefore(this.iconEl, this.titleEl);
    }
    return this;
  }

  setSubtext(subtext: string): this {
    let subtextEl = this.dom.querySelector('.menu-item-subtext') as HTMLElement;
    if (!subtextEl) {
      subtextEl = document.createElement('div');
      subtextEl.classList.add('menu-item-subtext');
      this.dom.appendChild(subtextEl);
    }
    subtextEl.textContent = subtext;
    return this;
  }

  onClick(callback: MenuItemCallback): this {
    this.callback = callback;
    return this;
  }

  setDisabled(disabled: boolean): this {
    if (disabled) {
      this.dom.classList.add('is-disabled');
      this.dom.setAttribute('aria-disabled', 'true');
    } else {
      this.dom.classList.remove('is-disabled');
      this.dom.removeAttribute('aria-disabled');
    }
    return this;
  }

  setActive(active: boolean): this {
    if (active) {
      this.dom.classList.add('is-active');
    } else {
      this.dom.classList.remove('is-active');
    }
    return this;
  }

  cleanup(): void {
    this.callback = null;
    this.onunload();
  }
}

/**
 * Menu - Context menu component
 */
export class Menu extends Component {
  dom: HTMLElement;
  private items: MenuItem[] = [];

  constructor() {
    super();
    this.dom = createDiv('menu');
    this.dom.setAttribute('role', 'menu');

    // Handle escape key to close
    this.dom.addEventListener('keydown', (evt) => {
      if (evt.key === 'Escape') {
        this.hide();
      }
    });

    // Handle click outside to close
    document.addEventListener('click', (evt) => {
      if (this.dom.isConnected && !this.dom.contains(evt.target as Node)) {
        this.hide();
      }
    }, { once: true });
  }

  addItem(cb: (item: MenuItem) => any): this {
    const item = new MenuItem();
    this.items.push(item);
    cb(item);
    this.dom.appendChild(item.dom);
    return this;
  }

  addSeparator(): this {
    const sep = createDiv('menu-separator');
    sep.setAttribute('role', 'separator');
    this.dom.appendChild(sep);
    return this;
  }

  /**
   * Show menu at a specific position
   */
  showAtPosition(x: number, y: number): this {
    this.dom.style.position = 'fixed';
    this.dom.style.left = `${x}px`;
    this.dom.style.top = `${y}px`;
    this.dom.style.zIndex = '10000';
    document.body.appendChild(this.dom);

    // Ensure menu is within viewport
    this.adjustPosition();

    return this;
  }

  /**
   * Show menu at mouse event position
   */
  showAtMouseEvent(evt: MouseEvent): this {
    return this.showAtPosition(evt.clientX, evt.clientY);
  }

  /**
   * Show menu attached to a DOM element
   */
  showAtElement(el: HTMLElement, position: 'left' | 'right' | 'bottom' | 'top' = 'bottom'): this {
    const rect = el.getBoundingClientRect();

    let x = rect.left;
    let y = rect.bottom;

    if (position === 'left') {
      x = rect.left - this.dom.offsetWidth;
      y = rect.top;
    } else if (position === 'right') {
      x = rect.right;
      y = rect.top;
    } else if (position === 'top') {
      x = rect.left;
      y = rect.top - this.dom.offsetHeight;
    }

    return this.showAtPosition(x, y);
  }

  /**
   * Hide and remove menu
   */
  hide(): this {
    this.dom.remove();
    return this;
  }

  /**
   * Adjust menu position to stay within viewport
   */
  private adjustPosition(): void {
    const rect = this.dom.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let x = parseFloat(this.dom.style.left);
    let y = parseFloat(this.dom.style.top);

    // Adjust horizontal position
    if (x + rect.width > viewportWidth) {
      x = viewportWidth - rect.width - 10;
    }
    if (x < 10) {
      x = 10;
    }

    // Adjust vertical position
    if (y + rect.height > viewportHeight) {
      y = viewportHeight - rect.height - 10;
    }
    if (y < 10) {
      y = 10;
    }

    this.dom.style.left = `${x}px`;
    this.dom.style.top = `${y}px`;
  }

  /**
   * Set menu width
   */
  setWidth(width: number): this {
    this.dom.style.width = `${width}px`;
    return this;
  }

  /**
   * Clear all items
   */
  clear(): this {
    for (const item of this.items) {
      item.cleanup();
    }
    this.items = [];
    while (this.dom.firstChild) {
      this.dom.removeChild(this.dom.firstChild);
    }
    return this;
  }

  onunload(): void {
    this.clear();
    this.dom.remove();
    super.onunload();
  }
}
