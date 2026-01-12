/**
 * useWorkspaceSync Hook
 *
 * Manages workspace state persistence and restoration.
 * Handles debounced saving of open tabs and active tab state.
 */

import { useEffect, useRef } from 'react';
import { OpenFile } from '../types';
import { workspaceStateManager } from '../stores/WorkspaceStateManager';

interface UseWorkspaceSyncOptions {
  vaultPath: string | null;
  openTabs: OpenFile[];
  activeTabPath: string | null;
}

/**
 * Hook for syncing workspace state to disk with debouncing
 */
export function useWorkspaceSync({
  vaultPath,
  openTabs,
  activeTabPath,
}: UseWorkspaceSyncOptions) {
  const openTabsRef = useRef(openTabs);
  const lastOpenFilesRef = useRef<string[]>([]);

  // Keep openTabsRef in sync with openTabs state
  useEffect(() => {
    openTabsRef.current = openTabs;
  }, [openTabs]);

  // Auto-save workspace when tabs change (debounced)
  useEffect(() => {
    if (!vaultPath || openTabs.length === 0) return;

    // Debounce workspace save
    const timer = window.setTimeout(async () => {
      const currentTabs = openTabsRef.current;
      const lastOpenFiles = currentTabs.map(t => t.path);
      workspaceStateManager.queueSave(currentTabs, activeTabPath, lastOpenFiles);
      lastOpenFilesRef.current = lastOpenFiles;
    }, 1000);

    return () => clearTimeout(timer);
  }, [openTabs, activeTabPath, vaultPath]);

  // Save workspace state before window close
  useEffect(() => {
    const handleBeforeUnload = async () => {
      console.log('[useWorkspaceSync] Saving state before close...');

      // Save workspace state if vault open
      if (vaultPath && openTabs.length > 0) {
        const lastOpenFiles = openTabs.map(t => t.path);
        await workspaceStateManager.saveNow(lastOpenFiles);
        console.log('[useWorkspaceSync] Saved workspace state');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [vaultPath, openTabs, activeTabPath]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      workspaceStateManager.destroy();
    };
  }, []);

  return {
    lastOpenFiles: lastOpenFilesRef.current,
  };
}
