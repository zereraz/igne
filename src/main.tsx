import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
// Import the App singleton
import { app } from './obsidian/appInstance';

// Initialize the Obsidian-compatible App
app.initialize().then(() => {
  console.log('[Igne] App initialized');
}).catch(err => {
  console.error('[Igne] Failed to initialize app:', err);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
