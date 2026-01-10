// =============================================================================
// Obsidian Compatibility Layer - Barrel Export
// =============================================================================

export { App } from './App';
export { Vault } from './Vault';
export { Workspace } from './Workspace';
export { WorkspaceLeaf } from './WorkspaceLeaf';
export { WorkspaceItem } from './WorkspaceItem';
export { WorkspaceRoot } from './WorkspaceRoot';
export { WorkspaceSidedock } from './WorkspaceSidedock';
export { WorkspaceRibbon, type RibbonAction } from './WorkspaceRibbon';
export { MetadataCache } from './MetadataCache';
export { FileManager } from './FileManager';
export { Events } from './events';
export { Keymap, Scope } from './Keymap';
export { Plugins } from './Plugins';
export { Plugin, type PluginConstructor, type ViewCreator, type Extension } from './Plugin';
export { Commands } from './Commands';
export { CommandPalette } from './CommandPalette';
export { Settings } from './Settings';
export { ThemeManager } from './ThemeManager';
export { DataAdapter } from './DataAdapter';
export { MarkdownParser } from './parser/MarkdownParser';
export { View, ItemView, FileView, TextFileView, type ViewStateResult } from './View';
export { Component } from './Component';
export { Editor, createEditor, isEditor } from './Editor';
export { Modal, FuzzySuggestModal } from './Modal';
export { Setting, ToggleComponent, TextComponent, TextAreaComponent, ButtonComponent, DropdownComponent, SliderComponent, ColorComponent } from './Setting';
export { Menu, MenuItem } from './Menu';
export { Notice, NoticeManager } from './Notice';
export { app, setVaultPath } from './appInstance';

// Import DOM helpers to polyfill HTMLElement methods
import './domHelpers';

export type { EventRef } from './eventRef';
export type * from './types';
