/**
 * Audit Log for Phase D: Command Registry + Tool Layer
 *
 * Tracks all command executions for audit trail and debugging.
 */

import type { CommandSource } from '../tools/types';

// =============================================================================
// Audit Event Types
// =============================================================================

export interface AuditEvent {
  /**
   * Timestamp when the event occurred
   */
  timestamp: number;

  /**
   * ID of the command that was executed
   */
  commandId: string;

  /**
   * Where the command originated from
   */
  source: CommandSource;

  /**
   * Whether the command executed successfully
   */
  success: boolean;

  /**
   * Error message if the command failed
   */
  error?: string;

  /**
   * Optional metadata for additional context
   */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Audit Log Class
// =============================================================================

class AuditLogClass {
  private events: AuditEvent[] = [];
  private maxEvents = 1000; // Limit memory usage

  /**
   * Log an event to the audit log
   */
  log(event: AuditEvent): void {
    this.events.push(event);

    // Trim old events if we exceed the limit
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  /**
   * Get events from the audit log
   * @param limit Maximum number of events to return (most recent first)
   * @param commandId Optional filter by command ID
   */
  getEvents(limit?: number, commandId?: string): AuditEvent[] {
    let events = [...this.events];

    if (commandId) {
      events = events.filter(e => e.commandId === commandId);
    }

    // Return most recent first
    events.reverse();

    if (limit) {
      events = events.slice(0, limit);
    }

    return events;
  }

  /**
   * Get events by source
   */
  getEventsBySource(source: CommandSource, limit?: number): AuditEvent[] {
    const events = this.events.filter(e => e.source === source);
    const result = [...events].reverse();
    return limit ? result.slice(0, limit) : result;
  }

  /**
   * Get only failed events
   */
  getFailedEvents(limit?: number): AuditEvent[] {
    const events = this.events.filter(e => !e.success);
    const result = [...events].reverse();
    return limit ? result.slice(0, limit) : result;
  }

  /**
   * Clear all events from the audit log
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Get the count of events
   */
  getCount(): number {
    return this.events.length;
  }

  /**
   * Export events to JSON string
   */
  exportToJson(): string {
    return JSON.stringify(this.events, null, 2);
  }

  /**
   * Import events from JSON string
   */
  importFromJson(json: string): void {
    try {
      const events = JSON.parse(json) as AuditEvent[];
      if (Array.isArray(events)) {
        this.events = events;
      }
    } catch (e) {
      console.error('Failed to import audit log:', e);
    }
  }

  /**
   * Get statistics about the audit log
   */
  getStats(): {
    total: number;
    bySource: Record<CommandSource, number>;
    successRate: number;
    topCommands: Array<{ commandId: string; count: number }>;
  } {
    const bySource: Record<CommandSource, number> = {
      ui: 0,
      plugin: 0,
      agent: 0,
    };

    const commandCounts: Record<string, number> = {};
    let successCount = 0;

    for (const event of this.events) {
      bySource[event.source]++;
      commandCounts[event.commandId] = (commandCounts[event.commandId] || 0) + 1;
      if (event.success) successCount++;
    }

    const topCommands = Object.entries(commandCounts)
      .map(([commandId, count]) => ({ commandId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: this.events.length,
      bySource,
      successRate: this.events.length > 0 ? successCount / this.events.length : 0,
      topCommands,
    };
  }
}

// =============================================================================
// Singleton Export
// =============================================================================

export const AuditLog = new AuditLogClass();

// AuditEvent is already exported as an interface above
