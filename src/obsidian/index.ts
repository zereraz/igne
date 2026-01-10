// =============================================================================
// Obsidian Compatibility Layer - Barrel Export
// =============================================================================

export { App } from './App';
export { Vault } from './Vault';
export { Workspace } from './Workspace';
export { MetadataCache } from './MetadataCache';
export { FileManager } from './FileManager';
export { Events } from './events';
export { Keymap, Scope } from './Keymap';
export { Plugins } from './Plugins';
export { Commands } from './Commands';
export { Settings } from './Settings';
export { DataAdapter } from './DataAdapter';
export { MarkdownParser } from './parser/MarkdownParser';
export { app, setVaultPath } from './appInstance';

export type { EventRef } from './eventRef';
export type * from './types';
