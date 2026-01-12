/**
 * useVaultManager Hook
 *
 * Manages vault operations including opening vaults, loading configuration,
 * and initializing the ThemeManager.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { vaultsStore } from '../stores/VaultsStore';
import { vaultConfigStore } from '../stores/VaultConfigStore';
import { workspaceStateManager } from '../stores/WorkspaceStateManager';
import { searchStore } from '../stores/searchStore';
import { ThemeManager } from '../obsidian/ThemeManager';
import { OpenFile } from '../types';
import { FileEntry } from '../types';

// Helper function to check if a file/directory exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await invoke('read_file', { path });
    return true;
  } catch {
    return false;
  }
}

interface UseVaultManagerOptions {
  onWorkspaceRestore?: (openFiles: OpenFile[], activeTab: string | null) => void;
}

export function useVaultManager(options: UseVaultManagerOptions = {}) {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [vaultSettings, setVaultSettings] = useState<any>(null);
  const [appearanceSettings, setAppearanceSettings] = useState<any>(null);
  const [isVaultReady, setIsVaultReady] = useState(false);

  const switchingVaultRef = useRef(false);
  const themeManagerRef = useRef<ThemeManager | null>(null);
  const mockApp = useRef<{
    vault: {
      configDir: string;
      adapter: {
        read: (path: string) => Promise<string>;
      };
    };
  } | null>(null);

  // Open a vault by path
  const handleOpenVaultPath = useCallback(async (path: string) => {
    if (switchingVaultRef.current) {
      console.warn('[useVaultManager] Vault switch already in progress, ignoring');
      return;
    }
    switchingVaultRef.current = true;
    try {
      console.log('[useVaultManager] Opening vault:', path);

      // Save current workspace if we have one
      if (vaultPath) {
        await workspaceStateManager.saveNow([]);
        console.log('[useVaultManager] Saved previous workspace');
      }

      // Add to vaults registry and set as last opened
      await vaultsStore.addVault(path);

      // Load vault config
      await vaultConfigStore.init(path);
      const settings = vaultConfigStore.getSettings();
      const appearance = vaultConfigStore.getAppearance();

      console.log('[useVaultManager] Loaded vault config:', { settings, appearance });

      // Initialize ThemeManager with mock app
      const configDir = `${path}/.obsidian`;
      mockApp.current = {
        vault: {
          configDir,
          adapter: {
            read: async (filePath: string) => {
              const fullPath = filePath.startsWith('/') ? filePath : `${path}/${filePath}`;
              return await invoke<string>('read_file', { path: fullPath });
            },
          },
        },
      };

      if (!themeManagerRef.current) {
        themeManagerRef.current = new ThemeManager(mockApp.current as any);
        console.log('[useVaultManager] ThemeManager initialized');
      } else {
        // Update the mock app reference
        (themeManagerRef.current as any).app = mockApp.current;
      }

      // Load theme and snippets from appearance settings
      if (appearance.cssTheme) {
        try {
          await themeManagerRef.current.loadTheme(appearance.cssTheme);
          console.log('[useVaultManager] Loaded theme:', appearance.cssTheme);
        } catch (e) {
          console.warn('[useVaultManager] Failed to load theme:', appearance.cssTheme, e);
        }
      }

      if (appearance.enabledCssSnippets && appearance.enabledCssSnippets.length > 0) {
        for (const snippet of appearance.enabledCssSnippets) {
          try {
            await themeManagerRef.current.loadSnippet(snippet);
            console.log('[useVaultManager] Loaded snippet:', snippet);
          } catch (e) {
            console.warn('[useVaultManager] Failed to load snippet:', snippet, e);
          }
        }
      }

      // Restore workspace from saved state
      const { openFiles, activeTab } = await workspaceStateManager.restore();
      console.log('[useVaultManager] Restored workspace:', { fileCount: openFiles.length, activeTab });

      // Load file contents for restored workspace
      const openTabsWithContent = await Promise.all(
        openFiles.map(async (file) => {
          try {
            const content = await invoke<string>('read_file', { path: file.path });
            return { ...file, content };
          } catch (e) {
            console.error('[useVaultManager] Failed to load file:', file.path, e);
            return { ...file, content: '' };
          }
        })
      );

      // Update state
      setVaultPath(path);
      setVaultSettings(settings);
      setAppearanceSettings(appearance);
      setIsVaultReady(true);

      // Notify callback for workspace restoration
      if (options.onWorkspaceRestore) {
        options.onWorkspaceRestore(openTabsWithContent, activeTab);
      }
    } catch (e) {
      console.error('[useVaultManager] Failed to open vault:', e);
      throw new Error('Failed to open vault: ' + (e as Error).message);
    } finally {
      switchingVaultRef.current = false;
    }
  }, [vaultPath, options]);

  // Update appearance settings
  const updateAppearance = useCallback(async (updates: any) => {
    const updated = { ...appearanceSettings, ...updates };
    setAppearanceSettings(updated);

    // Persist to disk
    await vaultConfigStore.updateAppearance(updates);

    // Handle theme changes
    if ('cssTheme' in updates && themeManagerRef.current) {
      const newTheme = updates.cssTheme;
      const currentTheme = themeManagerRef.current.getCurrentTheme();

      // Unload current theme if there is one
      if (currentTheme && currentTheme !== newTheme) {
        themeManagerRef.current.unloadTheme();
      }

      // Load new theme if specified
      if (newTheme && newTheme !== currentTheme) {
        try {
          await themeManagerRef.current.loadTheme(newTheme);
          console.log('[useVaultManager] Loaded theme:', newTheme);
        } catch (e) {
          console.error('[useVaultManager] Failed to load theme:', newTheme, e);
        }
      }
    }

    // Handle snippet changes
    if ('enabledCssSnippets' in updates && themeManagerRef.current) {
      const currentSnippets = themeManagerRef.current.getLoadedSnippets();
      const newSnippets = updates.enabledCssSnippets || [];

      // Unload snippets that were removed
      for (const snippet of currentSnippets) {
        if (!newSnippets.includes(snippet)) {
          themeManagerRef.current.unloadSnippet(snippet);
          console.log('[useVaultManager] Unloaded snippet:', snippet);
        }
      }

      // Load newly enabled snippets
      for (const snippet of newSnippets) {
        if (!currentSnippets.includes(snippet)) {
          try {
            await themeManagerRef.current.loadSnippet(snippet);
            console.log('[useVaultManager] Loaded snippet:', snippet);
          } catch (e) {
            console.error('[useVaultManager] Failed to load snippet:', snippet, e);
          }
        }
      }
    }
  }, [appearanceSettings]);

  // Refresh file list
  const refreshFiles = useCallback(async () => {
    if (!vaultPath) return;
    try {
      const entries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
      setFiles(entries);
      await searchStore.indexFiles(vaultPath, entries);
    } catch (e) {
      console.error('[useVaultManager] Failed to refresh files:', e);
    }
  }, [vaultPath]);

  return {
    vaultPath,
    setVaultPath,
    files,
    setFiles,
    vaultSettings,
    setVaultSettings,
    appearanceSettings,
    setAppearanceSettings,
    isVaultReady,
    setIsVaultReady,
    handleOpenVaultPath,
    updateAppearance,
    refreshFiles,
    themeManagerRef,
  };
}
