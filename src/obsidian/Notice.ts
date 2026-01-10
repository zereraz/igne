// =============================================================================
// Notice - Toast Notification Component
// =============================================================================

import type { EventRef } from './eventRef';
import { Events } from './events';

/**
 * Notice - Toast notification that appears and auto-dismisses
 */
export class Notice extends Events {
  noticeEl: HTMLElement;
  private timeout: number | null = null;
  private hideTimeout: number | null = null;

  /**
   * Create a new notice
   * @param message - The message to display (string or DocumentFragment)
   * @param timeout - Duration in ms before auto-hide (0 = no auto-hide)
   */
  constructor(message: string | DocumentFragment, timeout: number = 4500) {
    super();

    this.noticeEl = document.createElement('div');
    this.noticeEl.classList.add('notice');
    this.noticeEl.setAttribute('role', 'status');
    this.noticeEl.setAttribute('aria-live', 'polite');

    this.setMessage(message);

    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.classList.add('notice-close');
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close notice');
    closeBtn.addEventListener('click', () => this.hide());
    this.noticeEl.appendChild(closeBtn);

    // Add to notices container
    this.addToContainer();

    // Auto-hide after timeout
    if (timeout > 0) {
      this.timeout = window.setTimeout(() => this.hide(), timeout);
    }
  }

  /**
   * Set the notice message
   */
  setMessage(message: string | DocumentFragment): this {
    // Clear existing content (except close button)
    const contentEl = this.noticeEl.querySelector('.notice-content');
    if (contentEl) {
      contentEl.remove();
    }

    const contentContainer = document.createElement('div');
    contentContainer.classList.add('notice-content');

    if (typeof message === 'string') {
      contentContainer.textContent = message;
    } else {
      contentContainer.appendChild(message);
    }

    // Insert before close button
    const closeBtn = this.noticeEl.querySelector('.notice-close');
    if (closeBtn) {
      this.noticeEl.insertBefore(contentContainer, closeBtn);
    } else {
      this.noticeEl.appendChild(contentContainer);
    }

    return this;
  }

  /**
   * Get the notice message
   */
  getMessage(): string {
    const contentEl = this.noticeEl.querySelector('.notice-content');
    return contentEl?.textContent || '';
  }

  /**
   * Hide the notice with fade out animation
   */
  hide(): void {
    // Clear pending timeouts
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }

    // Add fade-out class for animation
    this.noticeEl.classList.add('notice-fade-out');

    // Remove from DOM after animation
    this.hideTimeout = window.setTimeout(() => {
      this.noticeEl.remove();
      this.trigger('hide');
    }, 200) as unknown as number;
  }

  /**
   * Add notice to container
   */
  private addToContainer(): void {
    // Find or create notices container
    let container = document.querySelector('.notices-container') as HTMLElement;

    if (!container) {
      container = document.createElement('div');
      container.classList.add('notices-container');
      document.body.appendChild(container);
    }

    container.appendChild(this.noticeEl);

    // Trigger animation
    requestAnimationFrame(() => {
      this.noticeEl.classList.add('notice-visible');
    });
  }

  /**
   * Register callback for when notice is hidden
   */
  onHide(callback: () => any): EventRef {
    return this.on('hide', callback);
  }
}

/**
 * NoticeManager - Manages multiple notices
 */
export class NoticeManager {
  private maxNotices: number = 5;
  private activeNotices: Notice[] = [];

  /**
   * Show a new notice
   */
  notice(message: string | DocumentFragment, timeout?: number): Notice {
    // Remove old notices if we have too many
    while (this.activeNotices.length >= this.maxNotices) {
      const oldNotice = this.activeNotices.shift();
      if (oldNotice) {
        oldNotice.hide();
      }
    }

    const notice = new Notice(message, timeout);

    // Track this notice
    this.activeNotices.push(notice);

    // Remove from tracking when hidden
    notice.onHide(() => {
      const index = this.activeNotices.indexOf(notice);
      if (index > -1) {
        this.activeNotices.splice(index, 1);
      }
    });

    return notice;
  }

  /**
   * Set maximum number of visible notices
   */
  setMaxNotices(max: number): void {
    this.maxNotices = Math.max(1, max);
  }

  /**
   * Hide all active notices
   */
  hideAll(): void {
    for (const notice of this.activeNotices) {
      notice.hide();
    }
    this.activeNotices = [];
  }

  /**
   * Get count of active notices
   */
  getActiveCount(): number {
    return this.activeNotices.length;
  }
}
