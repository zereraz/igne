// =============================================================================
// Commands - Command Registration and Execution
// =============================================================================

import type { App, Command, MarkdownView } from './types';

export class Commands {
  private commands: Map<string, Command> = new Map();

  constructor(private app: App) {}

  /**
   * Add a command to the app
   */
  addCommand(command: Command): Command {
    this.commands.set(command.id, command);
    return command;
  }

  /**
   * Remove a command
   */
  removeCommand(commandId: string): void {
    this.commands.delete(commandId);
  }

  /**
   * Find a command by ID
   */
  findCommand(commandId: string): Command | undefined {
    return this.commands.get(commandId);
  }

  /**
   * Get all commands as an array
   */
  listCommands(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Execute a command by ID
   * Returns true if command was executed, false otherwise
   */
  executeCommandById(commandId: string): boolean {
    const cmd = this.commands.get(commandId);
    if (!cmd) return false;

    // Try callback first
    if (cmd.callback) {
      cmd.callback();
      return true;
    }

    // Try checkCallback
    if (cmd.checkCallback) {
      const result = cmd.checkCallback(false);
      if (result) return true;
    }

    // Try editorCallback
    if (cmd.editorCallback) {
      const activeView = this.getActiveMarkdownView();
      if (activeView?.editor) {
        cmd.editorCallback(activeView.editor, activeView);
        return true;
      }
    }

    // Try editorCheckCallback
    if (cmd.editorCheckCallback) {
      const activeView = this.getActiveMarkdownView();
      if (activeView?.editor) {
        const result = cmd.editorCheckCallback(activeView.editor, activeView, false);
        if (result) return true;
      }
    }

    return false;
  }

  /**
   * Check if a command can be executed (for checkCallbacks)
   */
  canExecuteCommand(commandId: string): boolean {
    const cmd = this.commands.get(commandId);
    if (!cmd) return false;

    // Regular commands with callback are always executable
    if (cmd.callback) return true;

    // Check checkCallback
    if (cmd.checkCallback) {
      const result = cmd.checkCallback(true);
      return result === true || result === undefined;
    }

    // Editor commands
    const activeView = this.getActiveMarkdownView();
    if (!activeView?.editor) return false;

    if (cmd.editorCallback) return true;
    if (cmd.editorCheckCallback) {
      const result = cmd.editorCheckCallback(activeView.editor, activeView, true);
      return result === true || result === undefined;
    }

    return false;
  }

  /**
   * Get active MarkdownView if available
   */
  private getActiveMarkdownView(): MarkdownView | null {
    // Try to get active markdown view from workspace
    const activeLeaf = this.app.workspace.activeLeaf;
    if (!activeLeaf?.view) return null;

    // Check if it's a markdown view
    const view = activeLeaf.view;
    if (view && typeof (view as any).editor === 'object') {
      return view as MarkdownView;
    }

    return null;
  }
}
