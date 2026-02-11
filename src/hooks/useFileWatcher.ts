/**
 * useFileWatcher Hook
 *
 * Manages file system watching using native file system watchers.
 * This replaces polling with event-driven file change detection.
 */

import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { FileEntry } from '../types';
import { searchStore } from '../stores/searchStore';
import { filterHiddenFiles } from '../utils/fileFilters';

interface UseFileWatcherOptions {
  vaultPath: string | null;
  onFilesChange: (entries: FileEntry[]) => void;
  onError?: (error: string) => void;
}

/**
 * Hook for watching a directory for changes using native file system watchers.
 * This is much more efficient than polling and provides real-time updates.
 */
export function useFileWatcher({
  vaultPath,
  onFilesChange,
  onError,
}: UseFileWatcherOptions) {
  const [isWatching, setIsWatching] = useState(false);
  const isIndexingRef = useRef(false);
  const unlistenRef = useRef<UnlistenFn | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!vaultPath) return;

    const reindexVault = async () => {
      // Skip if already indexing (avoid race condition)
      if (isIndexingRef.current) {
        return;
      }

      try {
        const rawEntries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
        const entries = filterHiddenFiles(rawEntries);

        onFilesChange(entries);
        isIndexingRef.current = true;
        try {
          await searchStore.indexFiles(vaultPath, entries);
        } finally {
          isIndexingRef.current = false;
        }
      } catch (e) {
        console.error('[useFileWatcher] Failed to refresh files:', e);
        onError?.('Failed to load files. Click to retry.');
      }
    };

    const setupWatcher = async () => {
      try {
        // Start native file watching on the Rust side
        await invoke('watch_directory', { path: vaultPath });
        console.log('[useFileWatcher] Native watcher started for:', vaultPath);
        setIsWatching(true);

        // Listen for file system change events from Rust
        // Debounce: coalesce rapid changes (e.g. 10 saves in 1s) into a single reindex
        const unlisten = await listen('fs-change', () => {
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }
          debounceTimerRef.current = setTimeout(reindexVault, 500);
        });

        unlistenRef.current = unlisten;
      } catch (e) {
        console.error('[useFileWatcher] Failed to start native watcher:', e);
        onError?.('File watcher unavailable. Using fallback polling.');
        setIsWatching(false);
      }
    };

    setupWatcher();

    return () => {
      // Cleanup: stop listening and cancel pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (unlistenRef.current) {
        unlistenRef.current();
        unlistenRef.current = null;
      }
      setIsWatching(false);
    };
  }, [vaultPath]);

  return {
    isIndexing: isIndexingRef.current,
    isWatching,
  };
}

/**
 * Hook for initial directory load and indexing
 */
export function useDirectoryLoader({
  vaultPath,
  onFilesLoaded,
  onError,
}: {
  vaultPath: string | null;
  onFilesLoaded: (entries: FileEntry[], signal?: AbortSignal) => Promise<void>;
  onError?: (error: string) => void;
}) {
  const isIndexingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!vaultPath) return;

    const loadDirectory = async () => {
      // Cancel any previous indexing
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      // Guard against concurrent indexing
      if (isIndexingRef.current) return;
      isIndexingRef.current = true;

      try {
        const rawEntries = await invoke<FileEntry[]>('read_directory', { path: vaultPath });
        const entries = filterHiddenFiles(rawEntries);

        // Check if aborted after async operation
        if (abortControllerRef.current.signal.aborted) {
          console.log('[useDirectoryLoader] Loading aborted');
          return;
        }

        await onFilesLoaded(entries, abortControllerRef.current.signal);
      } catch (e) {
        // Ignore AbortError
        if ((e as Error).name !== 'AbortError') {
          console.error('[useDirectoryLoader] Failed to load vault:', e);
          onError?.('Failed to load files. Click to retry.');
        }
      } finally {
        isIndexingRef.current = false;
      }
    };

    loadDirectory();

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [vaultPath]);

  return {
    isIndexing: isIndexingRef.current,
  };
}
