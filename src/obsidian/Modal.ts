// =============================================================================
// Modal - Base Modal Class
// =============================================================================

import { Component } from './Component';
import type { App } from './types';

/**
 * Abstract base class for modals
 */
export abstract class Modal extends Component {
  app: App;
  containerEl: HTMLElement;
  modalEl: HTMLElement;
  titleEl: HTMLElement;
  contentEl: HTMLElement;
  private shouldClose: boolean = true;
  private isOpen: boolean = false;

  constructor(app: App) {
    super();
    this.app = app;
    this.containerEl = document.createElement('div');
    this.containerEl.classList.add('modal-container');
    this.containerEl.setAttribute('aria-hidden', 'true');

    this.modalEl = document.createElement('div');
    this.modalEl.classList.add('modal');
    this.containerEl.appendChild(this.modalEl);

    this.titleEl = document.createElement('div');
    this.titleEl.classList.add('modal-title');
    this.modalEl.appendChild(this.titleEl);

    this.contentEl = document.createElement('div');
    this.contentEl.classList.add('modal-content');
    this.modalEl.appendChild(this.contentEl);

    // Close button
    const closeBtn = document.createElement('div');
    closeBtn.classList.add('modal-close-button');
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');
    this.modalEl.appendChild(closeBtn);
    closeBtn.addEventListener('click', () => this.close());

    // Close on backdrop click
    this.containerEl.addEventListener('click', (evt: Event) => {
      if (evt.target === this.containerEl) {
        this.close();
      }
    });

    // Close on Escape key
    this.scope.register(document, null, 'Escape', (evt: KeyboardEvent) => {
      if (this.isOpen) {
        this.close();
        return false;
      }
      return true;
    });
  }

  /**
   * Open the modal
   */
  open(): void {
    this.isOpen = true;
    document.body.appendChild(this.containerEl);
    this.onOpen();
  }

  /**
   * Close the modal
   */
  close(): void {
    if (!this.shouldClose) return;

    this.isOpen = false;
    this.onClose();
    this.containerEl.remove();
  }

  /**
   * Set whether the modal can be closed
   */
  setCanClose(canClose: boolean): void {
    this.shouldClose = canClose;
  }

  /**
   * Set the modal title
   */
  setTitle(title: string): this {
    this.titleEl.textContent = title;
    return this;
  }

  /**
   * Set the modal content (replaces existing content)
   */
  setContent(content: string | HTMLElement): this {
    while (this.contentEl.firstChild) {
      this.contentEl.removeChild(this.contentEl.firstChild);
    }
    if (typeof content === 'string') {
      this.contentEl.innerHTML = content;
    } else {
      this.contentEl.appendChild(content);
    }
    return this;
  }

  /**
   * Get the modal width
   */
  getWidth(): number {
    return this.modalEl.offsetWidth;
  }

  /**
   * Set the modal width
   */
  setWidth(width: number | string): this {
    this.modalEl.style.width = typeof width === 'number' ? `${width}px` : width;
    return this;
  }

  /**
   * Called when modal is opened - override this
   */
  onOpen(): void {
    // Override in subclass
  }

  /**
   * Called when modal is closed - override this
   */
  onClose(): void {
    // Override in subclass
  }

  /**
   * Clean up resources
   */
  onunload(): void {
    this.close();
    super.onunload();
  }

  /**
   * Scope for keyboard shortcuts
   */
  get scope() {
    return this.app.scope;
  }
}

/**
 * FuzzySuggestModal - Base class for suggestion modals with fuzzy search
 */
export abstract class FuzzySuggestModal<T> extends Modal {
  inputEl!: HTMLInputElement;
  resultContainerEl!: HTMLElement;
  protected suggestions: T[] = [];
  protected filteredSuggestions: T[] = [];
  protected selectedIndex: number = 0;

  constructor(app: App) {
    super(app);
    this.modalEl.classList.add('suggestion-modal');
  }

  onOpen(): void {
    while (this.contentEl.firstChild) {
      this.contentEl.removeChild(this.contentEl.firstChild);
    }

    // Input container
    const promptContainer = document.createElement('div');
    promptContainer.classList.add('prompt-input-container');
    this.contentEl.appendChild(promptContainer);

    this.inputEl = document.createElement('input');
    this.inputEl.type = 'text';
    this.inputEl.classList.add('prompt-input');
    this.inputEl.placeholder = 'Type to filter...';
    promptContainer.appendChild(this.inputEl);

    // Result container
    this.resultContainerEl = document.createElement('div');
    this.resultContainerEl.classList.add('suggestion-container');
    this.contentEl.appendChild(this.resultContainerEl);

    // Event listeners
    this.inputEl.addEventListener('input', () => {
      this.renderSuggestions();
    });

    this.inputEl.addEventListener('keydown', (evt) => {
      this.handleKeydown(evt);
    });

    // Focus input and render initial suggestions
    this.inputEl.focus();
    this.renderSuggestions();
  }

  /**
   * Render the suggestion list
   */
  renderSuggestions(): void {
    const query = this.inputEl.value.toLowerCase();
    this.suggestions = this.getItems();
    this.filteredSuggestions = this.filterItems(this.suggestions, query);

    while (this.resultContainerEl.firstChild) {
      this.resultContainerEl.removeChild(this.resultContainerEl.firstChild);
    }
    this.selectedIndex = 0;

    if (this.filteredSuggestions.length === 0) {
      const emptyEl = document.createElement('div');
      emptyEl.classList.add('suggestion-item');
      emptyEl.classList.add('is-disabled');
      emptyEl.textContent = 'No results found';
      this.resultContainerEl.appendChild(emptyEl);
      return;
    }

    for (const item of this.filteredSuggestions) {
      const el = document.createElement('div');
      el.classList.add('suggestion-item');
      const itemText = this.getItemText(item);
      el.textContent = itemText;

      el.addEventListener('click', (evt) => {
        evt.preventDefault();
        this.onChooseItem(item, evt);
        this.close();
      });

      this.resultContainerEl.appendChild(el);
    }

    this.updateSelected();
  }

  /**
   * Filter items based on query
   */
  filterItems(items: T[], query: string): T[] {
    if (!query) return items;

    return items.filter(item => {
      const text = this.getItemText(item).toLowerCase();
      return text.includes(query);
    });
  }

  /**
   * Update the selected item highlight
   */
  updateSelected(): void {
    const items = this.resultContainerEl.querySelectorAll('.suggestion-item');
    items.forEach((item, index) => {
      if (index === this.selectedIndex) {
        (item as HTMLElement).classList.add('is-selected');
      } else {
        (item as HTMLElement).classList.remove('is-selected');
      }
    });
  }

  /**
   * Handle keyboard navigation
   */
  handleKeydown(evt: KeyboardEvent): void {
    if (evt.key === 'ArrowDown') {
      evt.preventDefault();
      this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredSuggestions.length - 1);
      this.updateSelected();
    } else if (evt.key === 'ArrowUp') {
      evt.preventDefault();
      this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
      this.updateSelected();
    } else if (evt.key === 'Enter') {
      evt.preventDefault();
      const selectedItem = this.filteredSuggestions[this.selectedIndex];
      if (selectedItem) {
        this.onChooseItem(selectedItem, evt);
        this.close();
      }
    } else if (evt.key === 'Escape') {
      evt.preventDefault();
      this.close();
    }
  }

  /**
   * Get items to suggest - must override
   */
  abstract getItems(): T[];

  /**
   * Get text for an item - must override
   */
  abstract getItemText(item: T): string;

  /**
   * Handle item selection - must override
   */
  abstract onChooseItem(item: T, evt: MouseEvent | KeyboardEvent): void;
}
