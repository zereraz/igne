/**
 * Command Registry for Phase D: Command Registry + Tool Layer
 *
 * Central registry for all commands in the application.
 * UI, plugins, and AI agents all use the same command registry.
 */

import type {
  Command,
  EventRef,
  CommandExecutedEvent,
  CommandExecutedListener,
} from './types';
import type { CommandSource } from '../tools/types';
import { AuditLog } from './audit';

// =============================================================================
// Command Registry Class
// =============================================================================

class CommandRegistryClass {
  private commands = new Map<string, Command>();
  private listeners: Array<{ id: string; listener: CommandExecutedListener }> = [];
  private nextListenerId = 0;

  /**
   * Register a command
   * @throws Error if a command with the same ID already exists
   */
  register(command: Command): void {
    if (this.commands.has(command.id)) {
      throw new Error(`Command with id "${command.id}" already registered`);
    }
    this.commands.set(command.id, command);
  }

  /**
   * Unregister a command by ID
   * @returns true if the command was found and removed
   */
  unregister(id: string): boolean {
    return this.commands.delete(id);
  }

  /**
   * Execute a command by ID
   * @param id Command ID
   * @param source Source of the command execution
   * @param args Arguments to pass to the command callback
   * @returns The result of the command callback
   */
  async execute(
    id: string,
    source: CommandSource = 'ui',
    ...args: unknown[]
  ): Promise<unknown> {
    const command = this.commands.get(id);

    if (!command) {
      const event: CommandExecutedEvent = {
        commandId: id,
        source,
        timestamp: Date.now(),
        success: false,
      };
      this.notifyListeners(event);
      AuditLog.log({
        timestamp: event.timestamp,
        commandId: id,
        source,
        success: false,
        error: `Command "${id}" not found`,
      });
      throw new Error(`Command "${id}" not found`);
    }

    const startTime = Date.now();
    let result: unknown;
    let success = true;
    let error: string | undefined;

    try {
      result = await command.callback(...args);
    } catch (e) {
      success = false;
      error = e instanceof Error ? e.message : String(e);
      throw e; // Re-throw to caller
    } finally {
      const event: CommandExecutedEvent = {
        commandId: id,
        source,
        timestamp: startTime,
        success,
        args,
      };
      this.notifyListeners(event);

      // Log to audit if command.audit is not explicitly false
      if (command.audit !== false) {
        AuditLog.log({
          timestamp: event.timestamp,
          commandId: id,
          source,
          success,
          error,
          metadata: args.length > 0 ? { args } : undefined,
        });
      }
    }

    return result;
  }

  /**
   * Get a command by ID
   */
  get(id: string): Command | undefined {
    return this.commands.get(id);
  }

  /**
   * Check if a command exists
   */
  has(id: string): boolean {
    return this.commands.has(id);
  }

  /**
   * Get all registered commands
   */
  getAll(): Command[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get commands by category
   */
  getByCategory(category: string): Command[] {
    return this.getAll().filter(c => c.category === category);
  }

  /**
   * Clear all commands (mainly for testing)
   */
  clear(): void {
    this.commands.clear();
  }

  /**
   * Register a listener for command execution events
   * @returns EventRef with unregister method
   */
  onCommandExecuted(listener: CommandExecutedListener): EventRef {
    const id = `listener-${this.nextListenerId++}`;
    this.listeners.push({ id, listener });

    return {
      id,
      unregister: () => {
        this.listeners = this.listeners.filter(l => l.id !== id);
      },
    };
  }

  /**
   * Notify all listeners of a command execution event
   */
  private notifyListeners(event: CommandExecutedEvent): void {
    for (const { listener } of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('[CommandRegistry] Listener error:', e);
      }
    }
  }

  /**
   * Get command statistics
   */
  getStats(): {
    totalCommands: number;
    commandsByCategory: Record<string, number>;
    commandsWithHotkeys: number;
  } {
    const commandsByCategory: Record<string, number> = {};
    let commandsWithHotkeys = 0;

    for (const command of this.commands.values()) {
      if (command.category) {
        commandsByCategory[command.category] =
          (commandsByCategory[command.category] || 0) + 1;
      }
      if (command.hotkeys && command.hotkeys.length > 0) {
        commandsWithHotkeys++;
      }
    }

    return {
      totalCommands: this.commands.size,
      commandsByCategory,
      commandsWithHotkeys,
    };
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const CommandRegistry = new CommandRegistryClass();

// Re-export types for convenience
export type { Command, EventRef, CommandExecutedEvent, CommandExecutedListener };
