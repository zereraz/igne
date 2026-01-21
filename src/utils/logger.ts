/**
 * Logger utility with dev/prod modes and file logging
 *
 * Usage:
 *   import { logger } from './utils/logger';
 *   logger.debug('MyComponent', 'Processing data', { count: 5 });
 *   logger.info('MyComponent', 'Action completed');
 *   logger.warn('MyComponent', 'Something unexpected');
 *   logger.error('MyComponent', 'Failed to load', error);
 *
 * To enable verbose logging in production, set in console:
 *   localStorage.setItem('igne_debug', 'true')
 *   location.reload()
 *
 * Log file location: ~/Library/Application Support/com.igne.app/logs/session.log
 * (or com.igne.dev for dev builds)
 */

import { invoke } from '@tauri-apps/api/core';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
}

class Logger {
  private isDev: boolean;
  private isDebugEnabled: boolean;
  private logBuffer: LogEntry[] = [];
  private maxBufferSize = 1000;
  private logFilePath: string | null = null;
  private writeQueue: string[] = [];
  private isWriting = false;

  constructor() {
    // Check if we're in dev mode (Vite sets this)
    // Use type assertion since Vite extends ImportMeta
    this.isDev = (import.meta as any).env?.DEV ?? process.env.NODE_ENV !== 'production';

    // Allow forcing debug mode via localStorage
    this.isDebugEnabled = this.isDev || localStorage.getItem('igne_debug') === 'true';

    if (this.isDebugEnabled) {
      console.log('[Logger] Debug logging enabled (dev=' + this.isDev + ')');
    }

    // Initialize file logging
    this.initFileLogging();
  }

  private async initFileLogging() {
    try {
      const appDataDir = await invoke<string>('get_app_data_dir');
      const logsDir = `${appDataDir}/logs`;

      // Create logs directory
      await invoke('create_directory', { path: logsDir }).catch(() => {});

      // Create session log file with timestamp
      const sessionId = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      this.logFilePath = `${logsDir}/session-${sessionId}.log`;

      // Write header
      const header = `=== Igne Log Session Started ===\nTime: ${new Date().toISOString()}\nDev Mode: ${this.isDev}\n${'='.repeat(40)}\n\n`;
      await invoke('write_file', { path: this.logFilePath, content: header });

      console.log('[Logger] File logging initialized:', this.logFilePath);
    } catch (e) {
      console.error('[Logger] Failed to initialize file logging:', e);
    }
  }

  private async writeToFile(line: string) {
    if (!this.logFilePath) return;

    this.writeQueue.push(line);

    if (this.isWriting) return;
    this.isWriting = true;

    try {
      while (this.writeQueue.length > 0) {
        const lines = this.writeQueue.splice(0, this.writeQueue.length);
        const content = lines.join('\n') + '\n';

        // Read existing content and append
        try {
          const existing = await invoke<string>('read_file', { path: this.logFilePath });
          await invoke('write_file', { path: this.logFilePath, content: existing + content });
        } catch {
          // File might not exist yet, just write
          await invoke('write_file', { path: this.logFilePath, content });
        }
      }
    } catch (e) {
      console.error('[Logger] Failed to write to log file:', e);
    } finally {
      this.isWriting = false;
    }
  }

  private formatTimestamp(): string {
    const now = new Date();
    return now.toISOString().slice(11, 23); // HH:MM:SS.mmm
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === 'error' || level === 'warn') {
      return true; // Always log errors and warnings
    }
    return this.isDebugEnabled;
  }

  private log(level: LogLevel, component: string, message: string, data?: unknown) {
    if (!this.shouldLog(level)) return;

    const timestamp = this.formatTimestamp();
    const entry: LogEntry = { timestamp, level, component, message, data };

    // Add to buffer
    this.logBuffer.push(entry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // Format output
    const prefix = `[${timestamp}] [${level.toUpperCase()}] [${component}]`;
    const dataStr = data !== undefined ? ` ${JSON.stringify(data)}` : '';
    const fileLine = `${prefix} ${message}${dataStr}`;

    // Write to file
    this.writeToFile(fileLine);

    // Console output
    switch (level) {
      case 'debug':
        if (data !== undefined) {
          console.debug(prefix, message, data);
        } else {
          console.debug(prefix, message);
        }
        break;
      case 'info':
        if (data !== undefined) {
          console.info(prefix, message, data);
        } else {
          console.info(prefix, message);
        }
        break;
      case 'warn':
        if (data !== undefined) {
          console.warn(prefix, message, data);
        } else {
          console.warn(prefix, message);
        }
        break;
      case 'error':
        if (data !== undefined) {
          console.error(prefix, message, data);
        } else {
          console.error(prefix, message);
        }
        break;
    }
  }

  debug(component: string, message: string, data?: unknown) {
    this.log('debug', component, message, data);
  }

  info(component: string, message: string, data?: unknown) {
    this.log('info', component, message, data);
  }

  warn(component: string, message: string, data?: unknown) {
    this.log('warn', component, message, data);
  }

  error(component: string, message: string, data?: unknown) {
    this.log('error', component, message, data);
  }

  /**
   * Get recent log entries (useful for debugging)
   */
  getRecentLogs(count = 100): LogEntry[] {
    return this.logBuffer.slice(-count);
  }

  /**
   * Export logs as JSON string
   */
  exportLogs(): string {
    return JSON.stringify(this.logBuffer, null, 2);
  }

  /**
   * Enable debug mode at runtime
   */
  enableDebug() {
    this.isDebugEnabled = true;
    localStorage.setItem('igne_debug', 'true');
    console.log('[Logger] Debug mode enabled');
  }

  /**
   * Disable debug mode at runtime
   */
  disableDebug() {
    this.isDebugEnabled = this.isDev; // Keep enabled if dev
    localStorage.removeItem('igne_debug');
    console.log('[Logger] Debug mode disabled (still logging in dev:', this.isDev, ')');
  }

  /**
   * Check if debug logging is enabled
   */
  isDebug(): boolean {
    return this.isDebugEnabled;
  }

  /**
   * Get the current log file path
   */
  getLogFilePath(): string | null {
    return this.logFilePath;
  }
}

// Singleton instance
export const logger = new Logger();

// Make logger available globally for debugging in console
if (typeof window !== 'undefined') {
  (window as any).igneLogger = logger;
}
