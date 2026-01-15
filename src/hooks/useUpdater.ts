import { useEffect, useState, useCallback } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateState {
  checking: boolean;
  available: boolean;
  downloading: boolean;
  error: string | null;
  version: string | null;
  progress: number;
}

export function useUpdater() {
  const [state, setState] = useState<UpdateState>({
    checking: false,
    available: false,
    downloading: false,
    error: null,
    version: null,
    progress: 0,
  });
  const [update, setUpdate] = useState<Update | null>(null);

  const checkForUpdates = useCallback(async () => {
    setState(s => ({ ...s, checking: true, error: null }));

    try {
      const result = await check();

      if (result) {
        setUpdate(result);
        setState(s => ({
          ...s,
          checking: false,
          available: true,
          version: result.version,
        }));
      } else {
        setState(s => ({
          ...s,
          checking: false,
          available: false,
        }));
      }
    } catch (err) {
      setState(s => ({
        ...s,
        checking: false,
        error: err instanceof Error ? err.message : 'Failed to check for updates',
      }));
    }
  }, []);

  const downloadAndInstall = useCallback(async () => {
    if (!update) return;

    setState(s => ({ ...s, downloading: true, error: null, progress: 0 }));

    try {
      await update.downloadAndInstall((event) => {
        if (event.event === 'Started' && event.data.contentLength) {
          setState(s => ({ ...s, progress: 0 }));
        } else if (event.event === 'Progress') {
          const progress = event.data.chunkLength;
          setState(s => ({ ...s, progress: s.progress + progress }));
        } else if (event.event === 'Finished') {
          setState(s => ({ ...s, progress: 100 }));
        }
      });

      // Relaunch the app after installing
      await relaunch();
    } catch (err) {
      setState(s => ({
        ...s,
        downloading: false,
        error: err instanceof Error ? err.message : 'Failed to install update',
      }));
    }
  }, [update]);

  // Check for updates on mount (with a small delay to not block startup)
  useEffect(() => {
    const timer = setTimeout(() => {
      checkForUpdates();
    }, 3000);

    return () => clearTimeout(timer);
  }, [checkForUpdates]);

  return {
    ...state,
    checkForUpdates,
    downloadAndInstall,
  };
}
