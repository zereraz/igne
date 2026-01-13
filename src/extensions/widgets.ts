import { WidgetType } from '@codemirror/view';

export class WikilinkWidget extends WidgetType {
  constructor(
    readonly target: string,
    readonly display: string,
    readonly exists: boolean,
    readonly onClick: (target: string) => void,
    readonly onCmdClick?: (target: string) => void
  ) { super(); }

  toDOM() {
    const span = document.createElement('span');
    span.className = `cm-wikilink ${this.exists ? 'cm-wikilink-exists' : 'cm-wikilink-missing'}`;
    span.textContent = this.display;
    span.dataset.target = this.target;
    span.dataset.wikilink = 'true';

    span.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey) {
        // Cmd+click: open in new tab (or switch if already open)
        if (this.onCmdClick) {
          this.onCmdClick(this.target);
        }
      } else {
        // Regular click: open in same tab
        if (this.onClick) {
          this.onClick(this.target);
        }
      }
    });

    return span;
  }

  eq(other: WidgetType) {
    if (!(other instanceof WikilinkWidget)) return false;
    return this.target === (other as WikilinkWidget).target &&
           this.display === (other as WikilinkWidget).display &&
           this.exists === (other as WikilinkWidget).exists;
  }

  ignoreEvent(event: Event): boolean {
    // Let CodeMirror handle cursor positioning, but we still get click events
    return event.type !== 'click';
  }
}

export class EmbedWidget extends WidgetType {
  constructor(
    readonly target: string,
    readonly content: string | null,
    readonly onOpen: (target: string) => void
  ) { super(); }

  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-embed';

    const header = document.createElement('div');
    header.className = 'cm-embed-header';
    header.innerHTML = `<span class="cm-embed-icon">📄</span><span class="cm-embed-title">${this.target}</span>`;
    header.addEventListener('click', () => this.onOpen(this.target));

    const body = document.createElement('div');
    body.className = 'cm-embed-body';

    if (this.content) {
      body.textContent = this.content;
    } else {
      body.innerHTML = '<span class="cm-embed-missing">Note not found</span>';
    }

    container.appendChild(header);
    container.appendChild(body);
    return container;
  }

  eq(other: EmbedWidget) {
    return this.target === other.target && this.content === other.content;
  }

  ignoreEvent() { return false; }
}

export class TagWidget extends WidgetType {
  constructor(
    readonly tag: string,
    readonly onClick: (tag: string) => void
  ) { super(); }

  toDOM() {
    const span = document.createElement('span');
    span.className = 'cm-tag-pill';
    span.textContent = `#${this.tag}`;
    span.addEventListener('click', (e) => {
      e.preventDefault();
      this.onClick(this.tag);
    });
    return span;
  }

  eq(other: TagWidget) {
    return this.tag === other.tag;
  }

  ignoreEvent() { return false; }
}

export class CheckboxWidget extends WidgetType {
  constructor(
    readonly checked: boolean,
    readonly pos: number,
    readonly onToggle: (pos: number, checked: boolean) => void
  ) { super(); }

  toDOM() {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = this.checked;
    input.className = 'cm-task-checkbox';
    input.addEventListener('change', (e) => {
      this.onToggle(this.pos, (e.target as HTMLInputElement).checked);
    });
    return input;
  }

  eq(other: CheckboxWidget) {
    return this.checked === other.checked && this.pos === other.pos;
  }

  ignoreEvent() { return false; }
}

export class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
    readonly width?: number,
    readonly height?: number
  ) { super(); }

  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-image-container';

    const img = document.createElement('img');
    img.src = this.src;
    img.alt = this.alt;
    img.className = 'cm-image';
    if (this.width) img.style.width = `${this.width}px`;
    if (this.height) img.style.height = `${this.height}px`;

    img.onerror = () => {
      container.innerHTML = `<span class="cm-image-error">Image not found: ${this.alt || this.src}</span>`;
    };

    container.appendChild(img);
    return container;
  }

  eq(other: ImageWidget) {
    return this.src === other.src;
  }

  ignoreEvent() { return true; }
}

export class MathWidget extends WidgetType {
  constructor(
    readonly latex: string,
    readonly display: boolean // block vs inline
  ) { super(); }

  toDOM() {
    const span = document.createElement(this.display ? 'div' : 'span');
    span.className = this.display ? 'cm-math-block' : 'cm-math-inline';

    // Try to use KaTeX if available
    try {
      if ((window as any).katex) {
        (window as any).katex.render(this.latex, span, {
          displayMode: this.display,
          throwOnError: false,
        });
      } else {
        span.textContent = this.latex;
        span.classList.add('cm-math-fallback');
      }
    } catch {
      span.textContent = this.latex;
      span.classList.add('cm-math-error');
    }

    return span;
  }

  eq(other: MathWidget) {
    return this.latex === other.latex && this.display === other.display;
  }

  ignoreEvent() { return true; }
}

export class CodeBlockWidget extends WidgetType {
  constructor(
    readonly code: string,
    readonly language: string
  ) { super(); }

  toDOM() {
    const pre = document.createElement('pre');
    pre.className = `cm-codeblock cm-codeblock-${this.language}`;

    const code = document.createElement('code');
    code.className = `language-${this.language}`;
    code.textContent = this.code;

    // Use Prism if available
    const Prism = (window as any).Prism;
    if (Prism && Prism.languages[this.language]) {
      code.innerHTML = Prism.highlight(this.code, Prism.languages[this.language], this.language);
    }

    pre.appendChild(code);
    return pre;
  }

  eq(other: CodeBlockWidget) {
    return this.code === other.code && this.language === other.language;
  }

  ignoreEvent() { return true; }
}

export class CalloutWidget extends WidgetType {
  constructor(
    readonly type: string,
    readonly title: string,
    readonly content: string,
    readonly folded: boolean,
    readonly onToggle: () => void
  ) { super(); }

  toDOM() {
    const container = document.createElement('div');
    container.className = `cm-callout cm-callout-${this.type}`;

    const header = document.createElement('div');
    header.className = 'cm-callout-header';
    header.innerHTML = `
      <span class="cm-callout-icon">${this.getIcon()}</span>
      <span class="cm-callout-title">${this.title || this.type}</span>
      <span class="cm-callout-fold">${this.folded ? '▶' : '▼'}</span>
    `;
    header.addEventListener('click', this.onToggle);

    const body = document.createElement('div');
    body.className = 'cm-callout-body';
    body.style.display = this.folded ? 'none' : 'block';
    body.textContent = this.content;

    container.appendChild(header);
    container.appendChild(body);
    return container;
  }

  getIcon(): string {
    const icons: Record<string, string> = {
      note: '📝', info: 'ℹ️', tip: '💡', hint: '💡',
      important: '❗', success: '✅', check: '✅', done: '✅',
      warning: '⚠️', caution: '⚠️', attention: '⚠️',
      danger: '🔥', error: '❌', failure: '❌', bug: '🐛',
      example: '📋', quote: '💬', cite: '💬',
      question: '❓', faq: '❓',
      abstract: '🔖', summary: '🔖', tldr: '🔖',
    };
    return icons[this.type] || '📌';
  }

  eq(other: CalloutWidget) {
    return this.type === other.type &&
           this.title === other.title &&
           this.content === other.content &&
           this.folded === other.folded;
  }

  ignoreEvent() { return false; }
}

export class MermaidWidget extends WidgetType {
  constructor(readonly code: string) { super(); }

  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-mermaid';
    container.textContent = 'Loading diagram...';

    // Render Mermaid asynchronously
    const mermaid = (window as any).mermaid;
    if (mermaid) {
      const id = `mermaid-${Math.random().toString(36).slice(2)}`;
      mermaid.render(id, this.code)
        .then(({ svg }: { svg: string }) => {
          container.innerHTML = svg;
        })
        .catch(() => {
          container.innerHTML = `<pre class="cm-mermaid-error">${this.code}</pre>`;
        });
    } else {
      container.innerHTML = `<pre class="cm-mermaid-error">${this.code}</pre>`;
    }

    return container;
  }

  eq(other: MermaidWidget) {
    return this.code === other.code;
  }

  ignoreEvent() { return true; }
}

export class HeadingEmbedWidget extends WidgetType {
  constructor(
    readonly target: string,
    readonly heading: string,
    readonly content: string | null,
    readonly headingLevel: number,
    readonly onOpen: (target: string) => void
  ) { super(); }

  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-embed cm-heading-embed';

    const header = document.createElement('div');
    header.className = 'cm-embed-header';

    // Use appropriate heading icon based on level
    const levelIcon = this.getHeadingIcon(this.headingLevel);
    header.innerHTML = `<span class="cm-embed-icon">${levelIcon}</span><span class="cm-embed-title">${this.target} → ${this.heading}</span>`;
    header.addEventListener('click', () => this.onOpen(this.target));

    const body = document.createElement('div');
    body.className = 'cm-embed-body cm-heading-embed-body';

    if (this.content !== null) {
      // Create a wrapper for the heading
      const headingEl = document.createElement(`h${Math.min(this.headingLevel, 6)}`);
      headingEl.className = `cm-heading cm-heading-${this.headingLevel}`;
      headingEl.textContent = this.heading;
      body.appendChild(headingEl);

      // Add content
      const contentEl = document.createElement('div');
      contentEl.className = 'cm-heading-embed-content';
      contentEl.textContent = this.content;
      body.appendChild(contentEl);
    } else {
      body.innerHTML = `<span class="cm-embed-missing">Heading "${this.heading}" not found in ${this.target}</span>`;
    }

    container.appendChild(header);
    container.appendChild(body);
    return container;
  }

  getHeadingIcon(level: number): string {
    const icons: Record<number, string> = {
      1: '📄',
      2: '📋',
      3: '📝',
      4: '📌',
      5: '📎',
      6: '🔖',
    };
    return icons[level] || '📄';
  }

  eq(other: HeadingEmbedWidget) {
    return this.target === other.target &&
           this.heading === other.heading &&
           this.content === other.content &&
           this.headingLevel === other.headingLevel;
  }

  ignoreEvent() { return false; }
}
