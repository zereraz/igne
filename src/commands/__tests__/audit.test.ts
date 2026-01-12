// =============================================================================
// Audit Log Tests
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import '../../test/setup';

import { AuditLog } from '../audit';
import type { AuditEvent } from '../audit';

describe('AuditLog', () => {
  beforeEach(() => {
    // Clear audit log before each test
    AuditLog.clear();
  });

  describe('Logging', () => {
    it('should log an event', () => {
      const event: AuditEvent = {
        timestamp: Date.now(),
        commandId: 'test.command',
        source: 'ui',
        success: true,
      };

      AuditLog.log(event);

      const events = AuditLog.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toEqual(event);
    });

    it('should log multiple events', () => {
      const event1: AuditEvent = {
        timestamp: Date.now(),
        commandId: 'file.new',
        source: 'ui',
        success: true,
      };

      const event2: AuditEvent = {
        timestamp: Date.now() + 100,
        commandId: 'file.save',
        source: 'ui',
        success: true,
      };

      AuditLog.log(event1);
      AuditLog.log(event2);

      const events = AuditLog.getEvents();
      expect(events).toHaveLength(2);
    });

    it('should trim old events when exceeding max limit', () => {
      // The max is 1000, but we can test the trimming logic
      // Log more events than the limit
      for (let i = 0; i < 1500; i++) {
        AuditLog.log({
          timestamp: Date.now() + i,
          commandId: `command.${i}`,
          source: 'ui',
          success: true,
        });
      }

      // Should have trimmed to maxEvents (1000)
      const count = AuditLog.getCount();
      expect(count).toBeLessThanOrEqual(1000);
    });
  });

  describe('Retrieving Events', () => {
    beforeEach(() => {
      const now = Date.now();
      AuditLog.log({
        timestamp: now,
        commandId: 'file.new',
        source: 'ui',
        success: true,
      });
      AuditLog.log({
        timestamp: now + 100,
        commandId: 'file.save',
        source: 'plugin',
        success: true,
      });
      AuditLog.log({
        timestamp: now + 200,
        commandId: 'edit.undo',
        source: 'agent',
        success: false,
        error: 'Nothing to undo',
      });
    });

    it('should get all events (most recent first)', () => {
      const events = AuditLog.getEvents();

      expect(events).toHaveLength(3);
      expect(events[0].commandId).toBe('edit.undo');
      expect(events[1].commandId).toBe('file.save');
      expect(events[2].commandId).toBe('file.new');
    });

    it('should get events with limit', () => {
      const events = AuditLog.getEvents(2);

      expect(events).toHaveLength(2);
      expect(events[0].commandId).toBe('edit.undo');
      expect(events[1].commandId).toBe('file.save');
    });

    it('should get events filtered by command ID', () => {
      const events = AuditLog.getEvents(undefined, 'file.save');

      expect(events).toHaveLength(1);
      expect(events[0].commandId).toBe('file.save');
    });

    it('should get events filtered by command ID with limit', () => {
      // Add more events with same command ID
      AuditLog.log({
        timestamp: Date.now() + 300,
        commandId: 'file.save',
        source: 'ui',
        success: true,
      });

      const events = AuditLog.getEvents(1, 'file.save');

      expect(events).toHaveLength(1);
      expect(events[0].commandId).toBe('file.save');
    });
  });

  describe('Filtering by Source', () => {
    beforeEach(() => {
      const now = Date.now();
      AuditLog.log({ timestamp: now, commandId: 'cmd1', source: 'ui', success: true });
      AuditLog.log({ timestamp: now + 100, commandId: 'cmd2', source: 'plugin', success: true });
      AuditLog.log({ timestamp: now + 200, commandId: 'cmd3', source: 'agent', success: true });
      AuditLog.log({ timestamp: now + 300, commandId: 'cmd4', source: 'ui', success: false });
    });

    it('should get events by source', () => {
      const uiEvents = AuditLog.getEventsBySource('ui');
      expect(uiEvents).toHaveLength(2);
      expect(uiEvents.every(e => e.source === 'ui')).toBe(true);

      const pluginEvents = AuditLog.getEventsBySource('plugin');
      expect(pluginEvents).toHaveLength(1);
      expect(pluginEvents[0].source).toBe('plugin');

      const agentEvents = AuditLog.getEventsBySource('agent');
      expect(agentEvents).toHaveLength(1);
      expect(agentEvents[0].source).toBe('agent');
    });

    it('should get events by source with limit', () => {
      const uiEvents = AuditLog.getEventsBySource('ui', 1);
      expect(uiEvents).toHaveLength(1);
      expect(uiEvents[0].commandId).toBe('cmd4'); // Most recent UI event
    });
  });

  describe('Failed Events', () => {
    beforeEach(() => {
      const now = Date.now();
      AuditLog.log({ timestamp: now, commandId: 'cmd1', source: 'ui', success: true });
      AuditLog.log({ timestamp: now + 100, commandId: 'cmd2', source: 'ui', success: false, error: 'Error 1' });
      AuditLog.log({ timestamp: now + 200, commandId: 'cmd3', source: 'ui', success: false, error: 'Error 2' });
    });

    it('should get only failed events', () => {
      const failedEvents = AuditLog.getFailedEvents();

      expect(failedEvents).toHaveLength(2);
      expect(failedEvents.every(e => !e.success)).toBe(true);
      expect(failedEvents[0].error).toBe('Error 2');
      expect(failedEvents[1].error).toBe('Error 1');
    });

    it('should get failed events with limit', () => {
      const failedEvents = AuditLog.getFailedEvents(1);

      expect(failedEvents).toHaveLength(1);
      expect(failedEvents[0].error).toBe('Error 2');
    });
  });

  describe('Clearing', () => {
    it('should clear all events', () => {
      AuditLog.log({
        timestamp: Date.now(),
        commandId: 'test.command',
        source: 'ui',
        success: true,
      });

      expect(AuditLog.getCount()).toBe(1);

      AuditLog.clear();

      expect(AuditLog.getCount()).toBe(0);
      expect(AuditLog.getEvents()).toHaveLength(0);
    });
  });

  describe('Count', () => {
    it('should return count of events', () => {
      expect(AuditLog.getCount()).toBe(0);

      AuditLog.log({
        timestamp: Date.now(),
        commandId: 'cmd1',
        source: 'ui',
        success: true,
      });

      expect(AuditLog.getCount()).toBe(1);

      AuditLog.log({
        timestamp: Date.now(),
        commandId: 'cmd2',
        source: 'ui',
        success: true,
      });

      expect(AuditLog.getCount()).toBe(2);
    });
  });

  describe('JSON Export/Import', () => {
    it('should export events to JSON', () => {
      const event: AuditEvent = {
        timestamp: 1234567890,
        commandId: 'test.command',
        source: 'ui',
        success: true,
        metadata: { key: 'value' },
      };

      AuditLog.log(event);

      const json = AuditLog.exportToJson();
      const parsed = JSON.parse(json) as AuditEvent[];

      expect(parsed).toHaveLength(1);
      expect(parsed[0]).toEqual(event);
    });

    it('should import events from JSON', () => {
      const events: AuditEvent[] = [
        {
          timestamp: 1234567890,
          commandId: 'cmd1',
          source: 'ui',
          success: true,
        },
        {
          timestamp: 1234567891,
          commandId: 'cmd2',
          source: 'plugin',
          success: false,
          error: 'Failed',
        },
      ];

      const json = JSON.stringify(events);
      AuditLog.importFromJson(json);

      expect(AuditLog.getCount()).toBe(2);

      const retrievedEvents = AuditLog.getEvents();
      expect(retrievedEvents[0].commandId).toBe('cmd2');
      expect(retrievedEvents[1].commandId).toBe('cmd1');
    });

    it('should handle invalid JSON import gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      AuditLog.importFromJson('invalid json');

      expect(consoleSpy).toHaveBeenCalled();
      expect(AuditLog.getCount()).toBe(0);

      consoleSpy.mockRestore();
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      const now = Date.now();
      AuditLog.log({ timestamp: now, commandId: 'file.new', source: 'ui', success: true });
      AuditLog.log({ timestamp: now + 100, commandId: 'file.new', source: 'ui', success: true });
      AuditLog.log({ timestamp: now + 200, commandId: 'file.save', source: 'plugin', success: true });
      AuditLog.log({ timestamp: now + 300, commandId: 'file.new', source: 'agent', success: false });
      AuditLog.log({ timestamp: now + 400, commandId: 'edit.undo', source: 'ui', success: false });
    });

    it('should get statistics', () => {
      const stats = AuditLog.getStats();

      expect(stats.total).toBe(5);
      expect(stats.bySource.ui).toBe(3);
      expect(stats.bySource.plugin).toBe(1);
      expect(stats.bySource.agent).toBe(1);
      expect(stats.successRate).toBe(3 / 5);
    });

    it('should calculate top commands', () => {
      const stats = AuditLog.getStats();

      expect(stats.topCommands).toHaveLength(3);
      expect(stats.topCommands[0]).toEqual({ commandId: 'file.new', count: 3 });
      expect(stats.topCommands[1]).toEqual({ commandId: 'file.save', count: 1 });
      expect(stats.topCommands[2]).toEqual({ commandId: 'edit.undo', count: 1 });
    });

    it('should return zero success rate for empty log', () => {
      AuditLog.clear();
      const stats = AuditLog.getStats();

      expect(stats.total).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.topCommands).toEqual([]);
    });
  });
});
