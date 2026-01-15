import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { listen } from '@tauri-apps/api/event';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';
// Import the App singleton
import { app } from './obsidian/appInstance';

// Global error handler for uncaught errors
window.onerror = (message, source, lineno, colno, error) => {
  console.error('[Global Error]', { message, source, lineno, colno, error });
  // Show error in UI if app hasn't loaded
  const root = document.getElementById('root');
  if (root && !root.hasChildNodes()) {
    root.innerHTML = `
      <div style="padding: 40px; color: #f87171; font-family: monospace; background: #18181b; height: 100vh;">
        <h1>Startup Error</h1>
        <pre>${message}\n${source}:${lineno}:${colno}\n${error?.stack || ''}</pre>
      </div>
    `;
  }
};

// Catch unhandled promise rejections
window.onunhandledrejection = (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason);
};

// Queue to hold events that arrive before React is ready
const pendingEvents: string[] = [];
let reactReady = false;
let standaloneHandler: ((path: string) => void) | null = null;

// Start listening for standalone file events IMMEDIATELY (before React renders)
// This prevents the race condition where the event arrives before the listener is set up
listen<string>('open-standalone-file', (event) => {
  console.log('[main.tsx] Received open-standalone-file event:', event.payload);
  if (reactReady && standaloneHandler) {
    standaloneHandler(event.payload);
  } else {
    console.log('[main.tsx] React not ready, queueing event');
    pendingEvents.push(event.payload);
  }
}).catch(err => {
  console.error('[main.tsx] Failed to set up event listener:', err);
});

// Export function for App to register its handler
export function registerStandaloneHandler(handler: (path: string) => void) {
  standaloneHandler = handler;
  reactReady = true;
  // Process any pending events
  while (pendingEvents.length > 0) {
    const path = pendingEvents.shift()!;
    console.log('[main.tsx] Processing queued event:', path);
    handler(path);
  }
}

console.log('[main.tsx] Starting Igne...');

// Initialize the Obsidian-compatible App
app.initialize().then(() => {
  console.log('[main.tsx] Obsidian app initialized');
}).catch(err => {
  console.error('[main.tsx] Failed to initialize obsidian app:', err);
  // Don't fail - the main app can still work without the obsidian layer
});

try {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    throw new Error('Root element not found');
  }

  console.log('[main.tsx] Rendering React app...');

  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );

  console.log('[main.tsx] React app rendered');
} catch (err) {
  console.error('[main.tsx] Failed to render:', err);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="padding: 40px; color: #f87171; font-family: monospace; background: #18181b; height: 100vh;">
        <h1>Failed to Start</h1>
        <pre>${err instanceof Error ? err.message : String(err)}\n${err instanceof Error ? err.stack : ''}</pre>
      </div>
    `;
  }
}
