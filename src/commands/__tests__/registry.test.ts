// =============================================================================
// Command Registry Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../test/setup';

import { CommandRegistry } from '../registry';
import { AuditLog } from '../audit';
import type { Command } from '../types';

describe('CommandRegistry', () => {
  beforeEach(() => {
    // Clear registry and audit log before each test
    CommandRegistry.clear();
    AuditLog.clear();
  });

  describe('Registration', () => {
    it('should register a command', () => {
      const command: Command = {
        id: 'test.command',
        name: 'Test Command',
        callback: vi.fn(),
      };

      CommandRegistry.register(command);

      expect(CommandRegistry.has('test.command')).toBe(true);
      expect(CommandRegistry.get('test.command')).toEqual(command);
    });

    it('should be idempotent when registering duplicate command ID', () => {
      const command: Command = {
        id: 'test.command',
        name: 'Test Command',
        callback: vi.fn(),
      };

      CommandRegistry.register(command);

      // Should not throw - idempotent for React StrictMode compatibility
      expect(() => {
        CommandRegistry.register(command);
      }).not.toThrow();

      // Should still only have one command
      expect(CommandRegistry.getAll().filter(c => c.id === 'test.command')).toHaveLength(1);
    });

    it('should unregister a command', () => {
      const command: Command = {
        id: 'test.command',
        name: 'Test Command',
        callback: vi.fn(),
      };

      CommandRegistry.register(command);
      expect(CommandRegistry.has('test.command')).toBe(true);

      const result = CommandRegistry.unregister('test.command');

      expect(result).toBe(true);
      expect(CommandRegistry.has('test.command')).toBe(false);
    });

    it('should return false when unregistering non-existent command', () => {
      const result = CommandRegistry.unregister('non.existent');
      expect(result).toBe(false);
    });
  });

  describe('Execution', () => {
    it('should execute a command callback', async () => {
      const callback = vi.fn().mockResolvedValue('result');
      const command: Command = {
        id: 'test.command',
        name: 'Test Command',
        callback,
      };

      CommandRegistry.register(command);
      const result = await CommandRegistry.execute('test.command', 'ui');

      expect(callback).toHaveBeenCalled();
      expect(result).toBe('result');
    });

    it('should pass arguments to command callback', async () => {
      const callback = vi.fn().mockResolvedValue('result');
      const command: Command = {
        id: 'test.command',
        name: 'Test Command',
        callback,
      };

      CommandRegistry.register(command);
      await CommandRegistry.execute('test.command', 'ui', 'arg1', 'arg2', 42);

      expect(callback).toHaveBeenCalledWith('arg1', 'arg2', 42);
    });

    it('should throw when executing non-existent command', async () => {
      await expect(CommandRegistry.execute('non.existent', 'ui'))
        .rejects.toThrow('Command "non.existent" not found');
    });

    it('should log successful command execution to audit', async () => {
      const callback = vi.fn().mockResolvedValue('result');
      const command: Command = {
        id: 'test.command',
        name: 'Test Command',
        callback,
        audit: true,
      };

      CommandRegistry.register(command);
      await CommandRegistry.execute('test.command', 'ui');

      const events = AuditLog.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].commandId).toBe('test.command');
      expect(events[0].source).toBe('ui');
      expect(events[0].success).toBe(true);
    });

    it('should log failed command execution to audit', async () => {
      const callback = vi.fn().mockRejectedValue(new Error('Test error'));
      const command: Command = {
        id: 'test.command',
        name: 'Test Command',
        callback,
        audit: true,
      };

      CommandRegistry.register(command);

      await expect(CommandRegistry.execute('test.command', 'ui'))
        .rejects.toThrow('Test error');

      const events = AuditLog.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].commandId).toBe('test.command');
      expect(events[0].success).toBe(false);
      expect(events[0].error).toBe('Test error');
    });

    it('should not log to audit when audit is false', async () => {
      const callback = vi.fn().mockResolvedValue('result');
      const command: Command = {
        id: 'test.command',
        name: 'Test Command',
        callback,
        audit: false,
      };

      CommandRegistry.register(command);
      await CommandRegistry.execute('test.command', 'ui');

      const events = AuditLog.getEvents();
      expect(events).toHaveLength(0);
    });
  });

  describe('Querying', () => {
    beforeEach(() => {
      CommandRegistry.register({
        id: 'file.new',
        name: 'New File',
        callback: vi.fn(),
        category: 'file',
      });
      CommandRegistry.register({
        id: 'file.save',
        name: 'Save File',
        callback: vi.fn(),
        category: 'file',
        hotkeys: [{ key: 's', modifiers: { meta: true } }],
      });
      CommandRegistry.register({
        id: 'edit.undo',
        name: 'Undo',
        callback: vi.fn(),
        category: 'edit',
      });
    });

    it('should get all commands', () => {
      const commands = CommandRegistry.getAll();
      expect(commands).toHaveLength(3);
    });

    it('should get command by ID', () => {
      const command = CommandRegistry.get('file.new');
      expect(command?.id).toBe('file.new');
      expect(command?.name).toBe('New File');
    });

    it('should return undefined for non-existent command', () => {
      const command = CommandRegistry.get('non.existent');
      expect(command).toBeUndefined();
    });

    it('should check if command exists', () => {
      expect(CommandRegistry.has('file.new')).toBe(true);
      expect(CommandRegistry.has('non.existent')).toBe(false);
    });

    it('should get commands by category', () => {
      const fileCommands = CommandRegistry.getByCategory('file');
      expect(fileCommands).toHaveLength(2);
      expect(fileCommands.every(c => c.category === 'file')).toBe(true);

      const editCommands = CommandRegistry.getByCategory('edit');
      expect(editCommands).toHaveLength(1);
      expect(editCommands[0].category).toBe('edit');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      CommandRegistry.register({
        id: 'file.new',
        name: 'New File',
        callback: vi.fn(),
        category: 'file',
      });
      CommandRegistry.register({
        id: 'file.save',
        name: 'Save File',
        callback: vi.fn(),
        category: 'file',
        hotkeys: [{ key: 's', modifiers: { meta: true } }],
      });
      CommandRegistry.register({
        id: 'edit.undo',
        name: 'Undo',
        callback: vi.fn(),
        category: 'edit',
        hotkeys: [{ key: 'z', modifiers: { meta: true } }],
      });
    });

    it('should get command statistics', () => {
      const stats = CommandRegistry.getStats();

      expect(stats.totalCommands).toBe(3);
      expect(stats.commandsWithHotkeys).toBe(2);
      expect(stats.commandsByCategory).toEqual({
        file: 2,
        edit: 1,
      });
    });
  });

  describe('Event Listeners', () => {
    it('should notify listeners on command execution', async () => {
      const listener = vi.fn();
      const callback = vi.fn().mockResolvedValue('result');
      const command: Command = {
        id: 'test.command',
        name: 'Test Command',
        callback,
      };

      const eventRef = CommandRegistry.onCommandExecuted(listener);
      CommandRegistry.register(command);

      await CommandRegistry.execute('test.command', 'ui', 'arg1');

      expect(listener).toHaveBeenCalledWith({
        commandId: 'test.command',
        source: 'ui',
        timestamp: expect.any(Number),
        success: true,
        args: ['arg1'],
      });

      // Unregister listener
      eventRef.unregister();
      listener.mockClear();

      await CommandRegistry.execute('test.command', 'ui');

      expect(listener).not.toHaveBeenCalled();
    });

    it('should notify listeners on failed command execution', async () => {
      const listener = vi.fn();
      const callback = vi.fn().mockRejectedValue(new Error('Test error'));
      const command: Command = {
        id: 'test.command',
        name: 'Test Command',
        callback,
      };

      CommandRegistry.onCommandExecuted(listener);
      CommandRegistry.register(command);

      try {
        await CommandRegistry.execute('test.command', 'ui');
      } catch (e) {
        // Expected to throw
      }

      expect(listener).toHaveBeenCalledWith({
        commandId: 'test.command',
        source: 'ui',
        timestamp: expect.any(Number),
        success: false,
        args: [],
      });
    });
  });
});
