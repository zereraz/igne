// =============================================================================
// App Instance - Singleton
// =============================================================================

import { App } from './App';

// Get the vault path from Tauri
let vaultPath = './vault';

// Note: We'll initialize with a default path
// The actual vault path will be set when the user opens a vault in the UI
export const app = new App(vaultPath);

// Re-initialize the app with a new vault path when the user opens a vault
export async function setVaultPath(path: string): Promise<void> {
  // Create a new app instance with the new vault path
  const newApp = new App(path);
  await newApp.initialize();

  // Copy over the properties to the existing app instance
  Object.assign(app, newApp);
}
