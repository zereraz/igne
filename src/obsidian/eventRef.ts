// =============================================================================
// Event Reference Interface
// =============================================================================

export interface EventRef {
  registered: boolean;
  ctx: any;
  fn: (...args: any[]) => any;
}
