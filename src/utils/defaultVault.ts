// =============================================================================
// Default Vault Utilities
// =============================================================================

import { invoke } from '@tauri-apps/api/core';

/**
 * Get the default vault path (~/Documents/Igne)
 */
export async function getDefaultVaultPath(): Promise<string> {
  return invoke<string>('get_default_vault_path');
}

/**
 * Ensure the default vault exists, creating it if necessary
 * Returns the vault path
 */
export async function ensureDefaultVault(): Promise<string> {
  return invoke<string>('ensure_default_vault');
}
