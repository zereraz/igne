// =============================================================================
// Event Reference Interface
// =============================================================================

/**
 * Reference to an event registration.
 * Matches Obsidian's EventRef interface for plugin compatibility.
 */
export interface EventRef {
  /** Whether the event handler is still registered */
  registered: boolean;
  /** Context object (this binding) - null if not bound */
  ctx: unknown;
  /** The callback function */
  fn: (...args: unknown[]) => unknown;
}
