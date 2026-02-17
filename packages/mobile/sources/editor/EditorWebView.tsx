/**
 * EditorWebView — markdown editor in a React Native WebView.
 *
 * Content is baked into the HTML once on mount. The WebView renders
 * markdown with styled HTML and handles editing via contenteditable.
 * Edits are sent back via postMessage as plain text.
 */

import { useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { Colors } from '../theme/colors';

export interface EditorWebViewHandle {
  insertText: (text: string) => void;
  replaceSelection: (text: string) => void;
  getContent: () => string | null;
}

interface EditorWebViewProps {
  content: string;
  colors: Colors & { isDark: boolean };
  onChange: (content: string) => void;
  onWikilinkClick?: (target: string) => void;
  onReady?: () => void;
  onSlashTrigger?: () => void;
  onSlashDismiss?: () => void;
  onSelectionChange?: (text: string) => void;
  style?: object;
}

export const EditorWebView = forwardRef<EditorWebViewHandle, EditorWebViewProps>(function EditorWebView(
  {
    content,
    colors,
    onChange,
    onWikilinkClick,
    onReady,
    onSlashTrigger,
    onSlashDismiss,
    onSelectionChange,
    style,
  },
  ref
) {
  const webviewRef = useRef<WebView>(null);
  const initialContentRef = useRef(content);
  const latestContentRef = useRef(content);

  useImperativeHandle(ref, () => ({
    insertText: (text: string) => {
      const escaped = JSON.stringify(text);
      webviewRef.current?.injectJavaScript(`window.__insertAtCursor(${escaped}); true;`);
    },
    replaceSelection: (text: string) => {
      const escaped = JSON.stringify(text);
      webviewRef.current?.injectJavaScript(`window.__replaceSelection(${escaped}); true;`);
    },
    getContent: () => latestContentRef.current,
  }));

  const bg = colors.bg;
  const fg = colors.text;
  const muted = colors.textSecondary;
  const faint = colors.textMuted;
  const accent = colors.accent;
  const codeBg = colors.surface;
  const border = colors.border;
  const hoverBg = colors.surfaceHover;

  // Pass raw markdown as JSON string to avoid HTML injection issues
  const contentJson = JSON.stringify(initialContentRef.current);

  const html = `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { background:${bg}; color:${fg}; font-family:-apple-system,system-ui,sans-serif; font-size:16px; line-height:1.6; -webkit-text-size-adjust:100%; -webkit-tap-highlight-color:transparent; }
#ed { outline:none; min-height:100vh; padding:16px; white-space:pre-wrap; word-wrap:break-word; }
/* Headings */
.h1 { font-size:1.7em; font-weight:700; line-height:1.2; margin:0.6em 0 0.3em; color:${fg}; }
.h2 { font-size:1.4em; font-weight:700; line-height:1.3; margin:0.5em 0 0.25em; color:${fg}; }
.h3 { font-size:1.2em; font-weight:600; line-height:1.4; margin:0.4em 0 0.2em; color:${fg}; }
.h4,.h5,.h6 { font-size:1em; font-weight:600; line-height:1.4; margin:0.3em 0 0.15em; color:${fg}; }
/* Inline */
.bold { font-weight:700; }
.italic { font-style:italic; }
.code { background:${codeBg}; color:${accent}; padding:1px 5px; border-radius:3px; font-family:ui-monospace,SFMono-Regular,"SF Mono",Menlo,monospace; font-size:0.9em; }
.strike { text-decoration:line-through; color:${faint}; }
.highlight { background:rgba(249,226,175,0.25); padding:0 2px; border-radius:2px; }
.wikilink { color:${accent}; border-bottom:1px dashed ${accent}; cursor:pointer; }
.tag { display:inline-block; background:${hoverBg}; color:${accent}; padding:0 6px; border-radius:10px; font-size:0.85em; }
.link { color:${accent}; text-decoration:underline; }
/* Block */
.blockquote { border-left:3px solid ${border}; padding-left:12px; color:${muted}; font-style:italic; }
.codeblock { background:${codeBg}; border:1px solid ${border}; border-radius:6px; padding:10px 12px; margin:8px 0; overflow-x:auto; font-family:ui-monospace,monospace; font-size:0.9em; white-space:pre; }
.hr { border:none; border-top:1px solid ${border}; margin:16px 0; }
.list-item { padding-left:1.2em; text-indent:-1.2em; }
.task { padding-left:1.5em; text-indent:-1.5em; }
.task-check { width:16px; height:16px; margin-right:6px; vertical-align:middle; accent-color:${accent}; }
</style>
</head><body>
<div id="ed" contenteditable="true"></div>
<script>
var CONTENT = ${contentJson};
var ed = document.getElementById('ed');

function esc(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderInline(line) {
  // Order matters: code first (protect from other transforms), then others
  var parts = [];
  var re = /\x60([^\x60]+)\x60/g;
  var last = 0, m;
  while ((m = re.exec(line)) !== null) {
    parts.push(inlineFormat(line.slice(last, m.index)));
    parts.push('<span class="code">' + esc(m[1]) + '</span>');
    last = re.lastIndex;
  }
  parts.push(inlineFormat(line.slice(last)));
  return parts.join('');
}

function inlineFormat(s) {
  if (!s) return '';
  s = esc(s);
  // Bold+italic
  s = s.replace(/\\*\\*\\*(.+?)\\*\\*\\*/g, '<span class="bold italic">$1</span>');
  // Bold
  s = s.replace(/\\*\\*(.+?)\\*\\*/g, '<span class="bold">$1</span>');
  // Italic
  s = s.replace(/\\*(.+?)\\*/g, '<span class="italic">$1</span>');
  // Strikethrough
  s = s.replace(/~~(.+?)~~/g, '<span class="strike">$1</span>');
  // Highlight
  s = s.replace(/==(.+?)==/g, '<span class="highlight">$1</span>');
  // Wikilinks with alias
  s = s.replace(/\\[\\[([^\\]|]+)\\|([^\\]]+)\\]\\]/g, '<span class="wikilink" data-target="$1">$2</span>');
  // Wikilinks
  s = s.replace(/\\[\\[([^\\]]+)\\]\\]/g, '<span class="wikilink" data-target="$1">$1</span>');
  // Markdown links
  s = s.replace(/\\[([^\\]]+)\\]\\(([^)]+)\\)/g, '<a class="link" href="$2">$1</a>');
  // Tags
  s = s.replace(/(^|\\s)#([a-zA-Z][\\w\\/]*)/g, '$1<span class="tag">#$2</span>');
  return s;
}

function render(md) {
  var lines = md.split('\\n');
  var html = '';
  var inCodeBlock = false;
  var codeLines = [];
  var codeLang = '';

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];

    // Code block toggle
    if (line.match(/^\x60\x60\x60/)) {
      if (inCodeBlock) {
        html += '<div class="codeblock">' + esc(codeLines.join('\\n')) + '</div>';
        codeLines = [];
        inCodeBlock = false;
      } else {
        codeLang = line.slice(3).trim();
        inCodeBlock = true;
      }
      continue;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Horizontal rule
    if (line.match(/^(---|\\*\\*\\*|___)\\s*$/)) {
      html += '<hr class="hr">';
      continue;
    }

    // Headings
    var hm = line.match(/^(#{1,6})\\s+(.+)/);
    if (hm) {
      var level = hm[1].length;
      html += '<div class="h' + level + '">' + renderInline(hm[2]) + '</div>';
      continue;
    }

    // Blockquote
    if (line.match(/^>\\s?/)) {
      html += '<div class="blockquote">' + renderInline(line.replace(/^>\\s?/, '')) + '</div>';
      continue;
    }

    // Task list
    var tm = line.match(/^\\s*[-*]\\s+\\[([ xX])\\]\\s+(.*)/);
    if (tm) {
      var checked = tm[1] !== ' ';
      html += '<div class="task"><input type="checkbox" class="task-check"' + (checked ? ' checked' : '') + ' disabled>' + renderInline(tm[2]) + '</div>';
      continue;
    }

    // Unordered list
    var um = line.match(/^\\s*[-*+]\\s+(.*)/);
    if (um) {
      html += '<div class="list-item">\\u2022 ' + renderInline(um[1]) + '</div>';
      continue;
    }

    // Ordered list
    var om = line.match(/^\\s*(\\d+)\\.\\s+(.*)/);
    if (om) {
      html += '<div class="list-item">' + om[1] + '. ' + renderInline(om[2]) + '</div>';
      continue;
    }

    // Empty line
    if (!line.trim()) {
      html += '<br>';
      continue;
    }

    // Normal paragraph
    html += '<div>' + renderInline(line) + '</div>';
  }

  // Close unclosed code block
  if (inCodeBlock) {
    html += '<div class="codeblock">' + esc(codeLines.join('\\n')) + '</div>';
  }

  return html;
}

ed.innerHTML = render(CONTENT);

// ── Cursor save/restore via character offset ──────────────────────

function getCursorOffset(container) {
  var sel = window.getSelection();
  if (!sel || !sel.focusNode || !container.contains(sel.focusNode)) return -1;
  var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  var offset = 0;
  var node;
  while ((node = walker.nextNode())) {
    if (node === sel.focusNode) return offset + sel.focusOffset;
    offset += node.textContent.length;
  }
  return offset;
}

function setCursorOffset(container, targetOffset) {
  if (targetOffset < 0) return;
  var walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  var offset = 0;
  var node;
  while ((node = walker.nextNode())) {
    var len = node.textContent.length;
    if (offset + len >= targetOffset) {
      var sel = window.getSelection();
      var range = document.createRange();
      range.setStart(node, targetOffset - offset);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    offset += len;
  }
  // If offset exceeds content, place cursor at end
  var sel = window.getSelection();
  sel.selectAllChildren(container);
  sel.collapseToEnd();
}

// ── Live re-render on input ───────────────────────────────────────

var renderPending = false;
var slashActive = false;

function getCurrentLineText() {
  var sel = window.getSelection();
  if (!sel || !sel.focusNode) return '';
  var node = sel.focusNode;
  // Walk up to the div/line container
  while (node && node !== ed && node.parentNode !== ed) {
    node = node.parentNode;
  }
  if (!node || node === ed) {
    // focusNode is a direct text child of ed
    return (sel.focusNode.textContent || '').split('\\n')[0] || '';
  }
  return (node.textContent || '').trim();
}

ed.addEventListener('input', function() {
  var text = ed.innerText;
  // Send content to RN
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'contentChange', content: text }));
  }

  // Slash command detection
  var lineText = getCurrentLineText();
  if (lineText === '/') {
    if (!slashActive) {
      slashActive = true;
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'slashTrigger' }));
      }
    }
  } else if (slashActive) {
    slashActive = false;
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'slashDismiss' }));
    }
  }

  // Schedule re-render with cursor preservation
  if (!renderPending) {
    renderPending = true;
    requestAnimationFrame(function() {
      renderPending = false;
      var off = getCursorOffset(ed);
      ed.innerHTML = render(ed.innerText);
      setCursorOffset(ed, off);
    });
  }
});

// ── Selection change tracking ─────────────────────────────────────

var selectionDebounce = null;
document.addEventListener('selectionchange', function() {
  if (selectionDebounce) clearTimeout(selectionDebounce);
  selectionDebounce = setTimeout(function() {
    var sel = window.getSelection();
    var text = sel ? sel.toString() : '';
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'selectionChange', text: text }));
    }
  }, 200);
});

// ── Insert/replace functions for AI slash commands ────────────────

window.__insertAtCursor = function(text) {
  // Delete the current line (the /command line) and insert text in its place
  var sel = window.getSelection();
  if (!sel || !sel.focusNode) return;

  // Find the line node
  var lineNode = sel.focusNode;
  while (lineNode && lineNode !== ed && lineNode.parentNode !== ed) {
    lineNode = lineNode.parentNode;
  }

  // Get the full text, find the line, replace it
  var fullText = ed.innerText;
  var lines = fullText.split('\\n');

  // Find which line the cursor is on by counting chars
  var curOff = getCursorOffset(ed);
  var charCount = 0;
  var targetLine = 0;
  for (var i = 0; i < lines.length; i++) {
    if (charCount + lines[i].length >= curOff) {
      targetLine = i;
      break;
    }
    charCount += lines[i].length + 1; // +1 for newline
  }

  // Replace the slash line with AI text
  lines[targetLine] = text;
  var newText = lines.join('\\n');
  ed.innerHTML = render(newText);

  // Place cursor at end of inserted text
  var insertEnd = charCount + text.length;
  setCursorOffset(ed, insertEnd);

  // Notify RN of change
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'contentChange', content: newText }));
  }
  slashActive = false;
};

window.__replaceSelection = function(text) {
  var sel = window.getSelection();
  if (!sel || sel.isCollapsed) return;

  // Get selection range in character offsets
  var fullText = ed.innerText;

  // Use execCommand for undo-able replacement
  document.execCommand('insertText', false, text);

  // The input event will fire and handle re-render + RN notification
  slashActive = false;
};

// Wikilink clicks
ed.addEventListener('click', function(e) {
  var el = e.target;
  if (el.classList && el.classList.contains('wikilink')) {
    e.preventDefault();
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'wikilinkClick', target: el.getAttribute('data-target') }));
    }
  }
});

if (window.ReactNativeWebView) {
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
}
</script>
</body></html>`;

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const msg = JSON.parse(event.nativeEvent.data);
        switch (msg.type) {
          case 'contentChange':
            latestContentRef.current = msg.content;
            onChange(msg.content);
            break;
          case 'wikilinkClick':
            onWikilinkClick?.(msg.target);
            break;
          case 'ready':
            onReady?.();
            break;
          case 'slashTrigger':
            onSlashTrigger?.();
            break;
          case 'slashDismiss':
            onSlashDismiss?.();
            break;
          case 'selectionChange':
            onSelectionChange?.(msg.text);
            break;
        }
      } catch (_e) {
        // Ignore
      }
    },
    [onChange, onWikilinkClick, onReady, onSlashTrigger, onSlashDismiss, onSelectionChange]
  );

  return (
    <WebView
      ref={webviewRef}
      source={{ html, baseUrl: '' }}
      onMessage={handleMessage}
      onError={(e) => console.error('[EditorWebView] error:', e.nativeEvent.description)}
      style={[{ flex: 1 }, style]}
      scrollEnabled={true}
      keyboardDisplayRequiresUserAction={false}
      hideKeyboardAccessoryView={false}
      allowsInlineMediaPlayback={true}
      originWhitelist={['*']}
      javaScriptEnabled={true}
      domStorageEnabled={true}
    />
  );
});
