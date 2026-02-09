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
    const icon = document.createElement('span');
    icon.className = 'cm-embed-icon';
    icon.textContent = '📄';
    const title = document.createElement('span');
    title.className = 'cm-embed-title';
    title.textContent = this.target;
    header.appendChild(icon);
    header.appendChild(title);
    header.addEventListener('click', () => this.onOpen(this.target));

    const body = document.createElement('div');
    body.className = 'cm-embed-body';

    if (this.content) {
      body.textContent = this.content;
    } else {
      const missing = document.createElement('span');
      missing.className = 'cm-embed-missing';
      missing.textContent = 'Note not found';
      body.appendChild(missing);
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

export interface ImageEmbedParams {
  width?: string | number;
  height?: string | number;
  alt?: string;
  title?: string;
  align?: 'left' | 'center' | 'right';
}

export class ImageWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly alt: string,
    readonly width?: string | number,
    readonly height?: string | number,
    readonly title?: string,
    readonly align?: 'left' | 'center' | 'right'
  ) { super(); }

  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-image-container';

    // Apply alignment classes
    if (this.align) {
      container.classList.add(`cm-image-align-${this.align}`);
    }

    const img = document.createElement('img');
    img.src = this.src;
    img.alt = this.alt || this.title || '';
    img.className = 'cm-image';

    // Apply width (supports both pixel numbers and percentage strings)
    if (this.width) {
      img.style.width = typeof this.width === 'number' ? `${this.width}px` : this.width;
    }

    // Apply height (supports both pixel numbers and percentage strings)
    if (this.height) {
      img.style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
    }

    // Apply title attribute
    if (this.title) {
      img.title = this.title;
    }

    img.onerror = () => {
      const errorSpan = document.createElement('span');
      errorSpan.className = 'cm-image-error';
      errorSpan.textContent = `Image not found: ${this.alt || this.title || this.src}`;
      container.replaceChildren(errorSpan);
    };

    container.appendChild(img);
    return container;
  }

  eq(other: ImageWidget) {
    return this.src === other.src &&
           this.width === other.width &&
           this.height === other.height &&
           this.alt === other.alt &&
           this.title === other.title &&
           this.align === other.align;
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
    const iconSpan = document.createElement('span');
    iconSpan.className = 'cm-callout-icon';
    iconSpan.textContent = this.getIcon();
    const titleSpan = document.createElement('span');
    titleSpan.className = 'cm-callout-title';
    titleSpan.textContent = this.title || this.type;
    const foldSpan = document.createElement('span');
    foldSpan.className = 'cm-callout-fold';
    foldSpan.textContent = this.folded ? '▶' : '▼';
    header.appendChild(iconSpan);
    header.appendChild(titleSpan);
    header.appendChild(foldSpan);
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
          const pre = document.createElement('pre');
          pre.className = 'cm-mermaid-error';
          pre.textContent = this.code;
          container.replaceChildren(pre);
        });
    } else {
      const pre = document.createElement('pre');
      pre.className = 'cm-mermaid-error';
      pre.textContent = this.code;
      container.replaceChildren(pre);
    }

    return container;
  }

  eq(other: MermaidWidget) {
    return this.code === other.code;
  }

  ignoreEvent() { return true; }
}

export class VideoWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly width?: string | number,
    readonly height?: string | number,
    readonly autoplay?: boolean,
    readonly loop?: boolean,
    readonly muted?: boolean,
    readonly controls?: boolean,
    readonly align?: 'left' | 'center' | 'right'
  ) { super(); }

  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-video-container';

    // Apply alignment classes
    if (this.align) {
      container.classList.add(`cm-video-align-${this.align}`);
    }

    const video = document.createElement('video');
    video.src = this.src;
    video.className = 'cm-video';

    // Apply width (supports both pixel numbers and percentage strings)
    if (this.width) {
      video.style.width = typeof this.width === 'number' ? `${this.width}px` : this.width;
    }

    // Apply height (supports both pixel numbers and percentage strings)
    if (this.height) {
      video.style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
    }

    // Apply video parameters
    if (this.autoplay) video.autoplay = true;
    if (this.loop) video.loop = true;
    if (this.muted) video.muted = true;
    if (this.controls !== false) video.controls = true; // Default to showing controls

    video.onerror = () => {
      const errorSpan = document.createElement('span');
      errorSpan.className = 'cm-video-error';
      errorSpan.textContent = `Video not found: ${this.src}`;
      container.replaceChildren(errorSpan);
    };

    container.appendChild(video);
    return container;
  }

  eq(other: VideoWidget) {
    return this.src === other.src &&
           this.width === other.width &&
           this.height === other.height &&
           this.autoplay === other.autoplay &&
           this.loop === other.loop &&
           this.muted === other.muted &&
           this.controls === other.controls &&
           this.align === other.align;
  }

  ignoreEvent() { return true; }
}

export class PdfWidget extends WidgetType {
  constructor(
    readonly src: string,
    readonly page?: number,
    readonly width?: string | number,
    readonly height?: string | number,
    readonly toolbar?: boolean,
    readonly align?: 'left' | 'center' | 'right'
  ) { super(); }

  toDOM() {
    const container = document.createElement('div');
    container.className = 'cm-pdf-container';

    // Apply alignment classes
    if (this.align) {
      container.classList.add(`cm-pdf-align-${this.align}`);
    }

    const iframe = document.createElement('iframe');
    iframe.className = 'cm-pdf';

    // Build PDF URL with parameters
    let pdfUrl = this.src;
    const params: string[] = [];

    // Add page parameter if specified
    if (this.page) {
      params.push(`page=${this.page}`);
    }

    // Add toolbar parameter (pagemode=none hides toolbar)
    if (this.toolbar === false) {
      params.push('pagemode=none');
    }

    if (params.length > 0) {
      pdfUrl += '#' + params.join('&');
    }

    iframe.src = pdfUrl;

    // Apply width (supports both pixel numbers and percentage strings)
    if (this.width) {
      iframe.style.width = typeof this.width === 'number' ? `${this.width}px` : this.width;
    } else {
      iframe.style.width = '100%';
    }

    // Apply height (supports both pixel numbers and percentage strings)
    if (this.height) {
      iframe.style.height = typeof this.height === 'number' ? `${this.height}px` : this.height;
    } else {
      iframe.style.height = '600px';
    }

    iframe.style.border = 'none';
    iframe.style.borderRadius = '0.5rem';

    iframe.onerror = () => {
      const errorSpan = document.createElement('span');
      errorSpan.className = 'cm-pdf-error';
      errorSpan.textContent = `PDF not found: ${this.src}`;
      container.replaceChildren(errorSpan);
    };

    container.appendChild(iframe);
    return container;
  }

  eq(other: PdfWidget) {
    return this.src === other.src &&
           this.page === other.page &&
           this.width === other.width &&
           this.height === other.height &&
           this.toolbar === other.toolbar &&
           this.align === other.align;
  }

  ignoreEvent() { return true; }
}
