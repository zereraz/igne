/**
 * EditorWebView — markdown editor in a React Native WebView.
 *
 * Content is baked into the HTML once on mount. The WebView renders
 * markdown with styled HTML and handles editing via contenteditable.
 * Edits are sent back via postMessage as plain text.
 */

import { useRef, useCallback } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

interface EditorWebViewProps {
  content: string;
  theme: 'dark' | 'light';
  onChange: (content: string) => void;
  onWikilinkClick?: (target: string) => void;
  onReady?: () => void;
  style?: object;
}

export function EditorWebView({
  content,
  theme,
  onChange,
  onWikilinkClick,
  onReady,
  style,
}: EditorWebViewProps) {
  const webviewRef = useRef<WebView>(null);
  const initialContentRef = useRef(content);

  const isDark = theme === 'dark';
  const bg = isDark ? '#1e1e2e' : '#ffffff';
  const fg = isDark ? '#cdd6f4' : '#1e1e2e';
  const muted = isDark ? '#a6adc8' : '#5c5f77';
  const faint = isDark ? '#6c7086' : '#9399b2';
  const accent = isDark ? '#89b4fa' : '#1e66f5';
  const codeBg = isDark ? '#313244' : '#f5f5f5';
  const border = isDark ? '#45475a' : '#e6e6e6';
  const hoverBg = isDark ? '#313244' : '#f0f0f0';

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

// On edit, send plain text back
ed.addEventListener('input', function() {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'contentChange', content: ed.innerText }));
  }
});

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
            onChange(msg.content);
            break;
          case 'wikilinkClick':
            onWikilinkClick?.(msg.target);
            break;
          case 'ready':
            onReady?.();
            break;
        }
      } catch (_e) {
        // Ignore
      }
    },
    [onChange, onWikilinkClick, onReady]
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
}
