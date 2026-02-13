/**
 * EditorWebView — contenteditable editor in a React Native WebView.
 *
 * Content is baked into the HTML once on mount. Edits happen inside
 * the WebView and are sent back via postMessage. The WebView is never
 * remounted during editing.
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
  // Capture initial content once — never changes after mount
  const initialContentRef = useRef(content);

  const bg = theme === 'dark' ? '#1e1e2e' : '#ffffff';
  const fg = theme === 'dark' ? '#cdd6f4' : '#1e1e2e';

  const escaped = initialContentRef.current
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');

  const html = `<!DOCTYPE html><html><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
<style>
body { background:${bg}; color:${fg}; font-family:-apple-system,system-ui,sans-serif; margin:0; padding:16px; font-size:16px; line-height:1.6; -webkit-text-size-adjust:100%; }
#ed { outline:none; min-height:100%; white-space:pre-wrap; word-wrap:break-word; }
</style>
</head><body>
<div id="ed" contenteditable="true">${escaped}</div>
<script>
var ed = document.getElementById('ed');
ed.addEventListener('input', function() {
  if (window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'contentChange', content: ed.innerText }));
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
