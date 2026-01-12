import { getCurrentWindow, LogicalPosition, LogicalSize } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';
import type { WindowState } from '../types';

// Helper function to check if a file exists
async function fileExists(path: string): Promise<boolean> {
  try {
    await invoke('read_file', { path });
    return true;
  } catch {
    return false;
  }
}

// Helper function to get app data directory
async function getAppDataDir(): Promise<string> {
  try {
    const dir = await invoke<string>('get_app_data_dir');
    return dir;
  } catch {
    // Fallback to a default location
    return '';
  }
}

class WindowStateStore {
  private state: WindowState = {
    version: 1,
    x: 100,
    y: 100,
    width: 1200,
    height: 800,
    isMaximized: false,
    isFullscreen: false,
  };

  private saveDebounceTimer: number | null = null;
  private appWindow: ReturnType<typeof getCurrentWindow> | null = null;
  private statePath: string = '';
  private stateCheckInterval: number | null = null;

  async init(): Promise<void> {
    try {
      this.appWindow = getCurrentWindow();
      const appData = await getAppDataDir();
      this.statePath = `${appData}/window-state.json`;

      await this.load();
      await this.restore();
      this.setupListeners();
    } catch (e) {
      console.error('[WindowStateStore] Failed to initialize:', e);
    }
  }

  private async load(): Promise<void> {
    try {
      if (this.statePath && await fileExists(this.statePath)) {
        const content = await invoke<string>('read_file', { path: this.statePath });
        const loaded = JSON.parse(content) as Partial<WindowState>;

        // Merge with defaults
        this.state = {
          ...this.state,
          ...loaded,
        };

        console.log('[WindowStateStore] Loaded window state:', {
          x: this.state.x,
          y: this.state.y,
          width: this.state.width,
          height: this.state.height,
          isMaximized: this.state.isMaximized,
        });
      }
    } catch (e) {
      console.error('[WindowStateStore] Failed to load window state:', e);
    }
  }

  private async save(): Promise<void> {
    try {
      if (!this.statePath) {
        const appData = await getAppDataDir();
        this.statePath = `${appData}/window-state.json`;
      }

      await invoke('write_file', {
        path: this.statePath,
        content: JSON.stringify(this.state, null, 2),
      });
      console.log('[WindowStateStore] Saved window state');
    } catch (e) {
      console.error('[WindowStateStore] Failed to save window state:', e);
    }
  }

  // Debounced save to avoid excessive writes during resize
  private queueSave(): void {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
    }
    this.saveDebounceTimer = window.setTimeout(() => {
      this.save();
      this.saveDebounceTimer = null;
    }, 500);
  }

  async restore(): Promise<void> {
    if (!this.appWindow) return;

    try {
      // Don't restore position/size if window should start maximized or fullscreen
      if (this.state.isMaximized) {
        await this.appWindow.maximize();
        console.log('[WindowStateStore] Restored window as maximized');
        return;
      }

      if (this.state.isFullscreen) {
        await this.appWindow.setFullscreen(true);
        console.log('[WindowStateStore] Restored window as fullscreen');
        return;
      }

      // Restore position and size
      await this.appWindow.setPosition(new LogicalPosition(this.state.x, this.state.y));
      await this.appWindow.setSize(new LogicalSize(this.state.width, this.state.height));
      console.log('[WindowStateStore] Restored window position and size');
    } catch (e) {
      console.error('[WindowStateStore] Failed to restore window state:', e);
    }
  }

  private setupListeners(): void {
    if (!this.appWindow) return;

    // Listen for window move
    this.appWindow.onMoved(async ({ payload }) => {
      this.state.x = payload.x;
      this.state.y = payload.y;
      this.queueSave();
    });

    // Listen for window resize
    this.appWindow.onResized(async ({ payload }) => {
      this.state.width = payload.width;
      this.state.height = payload.height;
      this.queueSave();
    });

    // Listen for maximize/unmaximize and fullscreen changes
    // Note: In Tauri 2, we need to check these states periodically or on specific events
    this.setupStateMonitoring();
  }

  private setupStateMonitoring(): void {
    if (!this.appWindow) return;

    // Poll for state changes every second when window is active
    const checkState = async () => {
      try {
        const isMaximized = await this.appWindow!.isMaximized();
        const isFullscreen = await this.appWindow!.isFullscreen();

        if (isMaximized !== this.state.isMaximized || isFullscreen !== this.state.isFullscreen) {
          this.state.isMaximized = isMaximized;
          this.state.isFullscreen = isFullscreen;
          this.queueSave();
        }
      } catch (e) {
        console.error('[WindowStateStore] Failed to check window state:', e);
      }
    };

    // Check state every second and store the interval ID so we can clear it later
    this.stateCheckInterval = window.setInterval(checkState, 1000);
  }

  // Cleanup method to clear the interval
  destroy(): void {
    if (this.stateCheckInterval) {
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
    }
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }
  }

  // Save immediately (call before app close)
  async saveNow(): Promise<void> {
    if (this.saveDebounceTimer) {
      clearTimeout(this.saveDebounceTimer);
      this.saveDebounceTimer = null;
    }

    if (!this.appWindow) return;

    try {
      // Get current state
      const position = await this.appWindow.outerPosition();
      const size = await this.appWindow.outerSize();

      this.state = {
        ...this.state,
        x: position.x,
        y: position.y,
        width: size.width,
        height: size.height,
        isMaximized: await this.appWindow.isMaximized(),
        isFullscreen: await this.appWindow.isFullscreen(),
      };

      await this.save();
      console.log('[WindowStateStore] Saved window state immediately');
    } catch (e) {
      console.error('[WindowStateStore] Failed to save window state immediately:', e);
    }
  }
}

export const windowStateStore = new WindowStateStore();
