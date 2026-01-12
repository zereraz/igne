/**
 * Workspace Tools for Phase D: Command Registry + Tool Layer
 *
 * These tools manage workspace state (open files, tabs, active file).
 * They interact with the App state through callbacks that will be registered.
 */

import type {
  ToolContext,
  Tool,
  OpenFileInput,
  CloseFileInput,
  SetActiveFileInput,
} from './types';
import { ok, err } from './types';

// =============================================================================
// Workspace State Interface
// =============================================================================

/**
 * Interface for workspace state management.
 * The App will provide an implementation of this interface.
 */
export interface WorkspaceStateManager {
  openFile(path: string, newTab?: boolean): Promise<void>;
  closeFile(path: string): Promise<void>;
  setActiveFile(path: string): Promise<void>;
  getOpenFiles(): string[];
  getActiveFile(): string | null;
}

// Global workspace state manager - will be set by App
let workspaceManager: WorkspaceStateManager | null = null;

/**
 * Set the global workspace state manager
 */
export function setWorkspaceManager(manager: WorkspaceStateManager): void {
  workspaceManager = manager;
}

/**
 * Get the global workspace state manager
 */
export function getWorkspaceManager(): WorkspaceStateManager | null {
  return workspaceManager;
}

// =============================================================================
// Workspace Tools
// =============================================================================

/**
 * Open a file in the workspace
 */
export const openFile: Tool<OpenFileInput, void> = {
  id: 'workspace.openFile',
  name: 'Open File',
  description: 'Open a file in the workspace',

  async execute(_context: ToolContext, input: OpenFileInput) {
    if (!workspaceManager) {
      return err(new Error('Workspace manager not initialized'));
    }
    try {
      await workspaceManager.openFile(input.path, input.newTab);
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  },
};

/**
 * Close a file in the workspace
 */
export const closeFile: Tool<CloseFileInput, void> = {
  id: 'workspace.closeFile',
  name: 'Close File',
  description: 'Close a file in the workspace',

  async execute(_context: ToolContext, input: CloseFileInput) {
    if (!workspaceManager) {
      return err(new Error('Workspace manager not initialized'));
    }
    try {
      await workspaceManager.closeFile(input.path);
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  },
};

/**
 * Set the active file in the workspace
 */
export const setActiveFile: Tool<SetActiveFileInput, void> = {
  id: 'workspace.setActiveFile',
  name: 'Set Active File',
  description: 'Set the active file in the workspace',

  async execute(_context: ToolContext, input: SetActiveFileInput) {
    if (!workspaceManager) {
      return err(new Error('Workspace manager not initialized'));
    }
    try {
      await workspaceManager.setActiveFile(input.path);
      return ok(undefined);
    } catch (e) {
      return err(e instanceof Error ? e : new Error(String(e)));
    }
  },
};

// =============================================================================
// Tool Registry
// =============================================================================

/**
 * All workspace tools exported as a map for easy lookup
 */
export const workspaceTools = {
  openFile,
  closeFile,
  setActiveFile,
} as const;

export type WorkspaceToolId = keyof typeof workspaceTools;
