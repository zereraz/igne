/**
 * Tool types for Phase D: Command Registry + Tool Layer
 *
 * Tools are pure functions that perform operations on the vault/workspace.
 * Each tool has a defined input type and returns a Result type.
 */

// =============================================================================
// Result Type
// =============================================================================

export interface Result<T, E = Error> {
  success: boolean;
  data?: T;
  error?: E;
}

export function ok<T>(data: T): Result<T> {
  return { success: true, data };
}

export function err<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

export function tryResult<T>(fn: () => T): Result<T> {
  try {
    return ok(fn());
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

export async function tryResultAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return ok(await fn());
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)));
  }
}

// =============================================================================
// Tool Context
// =============================================================================

export type CommandSource = 'ui' | 'plugin' | 'agent';

export interface ToolContext {
  /**
   * The path to the current vault
   */
  vaultPath: string | null;

  /**
   * Where this tool invocation originated from
   */
  source: CommandSource;

  /**
   * Optional transaction ID for grouping related operations
   */
  transactionId?: string;

  /**
   * Optional metadata for audit/debugging
   */
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Tool Interface
// =============================================================================

export interface Tool<TInput, TResult = unknown> {
  /**
   * Unique identifier for this tool
   */
  id: string;

  /**
   * Human-readable name
   */
  name: string;

  /**
   * Optional description of what the tool does
   */
  description?: string;

  /**
   * Execute the tool with the given context and input
   */
  execute(context: ToolContext, input: TInput): Promise<Result<TResult>>;
}

// =============================================================================
// Tool Input Types
// =============================================================================

export interface CreateFileInput {
  path: string;
  content: string;
}

export interface ReadFileInput {
  path: string;
}

export interface WriteFileInput {
  path: string;
  content: string;
}

export interface DeleteFileInput {
  path: string;
}

export interface RenameFileInput {
  oldPath: string;
  newPath: string;
}

export interface StatPathInput {
  path: string;
}

export interface ListDirInput {
  path: string;
  recursive?: boolean;
}

export interface OpenFileInput {
  path: string;
  newTab?: boolean;
}

export interface CloseFileInput {
  path: string;
}

export interface SetActiveFileInput {
  path: string;
}
