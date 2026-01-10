# Obsidian Plugin Compatibility Matrix

This document tracks the compatibility status of popular Obsidian plugins with Igne.

## Legend

- ✅ **Full Support** - Plugin works perfectly
- ⚠️ **Partial Support** - Plugin works with some limitations
- ❌ **Not Supported** - Plugin doesn't work
- 🔄 **Testing Needed** - Compatibility unknown, needs testing

## Core Plugins

### 1. Dataview ⚠️

**Status**: Partial Support

**Features Supported**:
- ✅ Frontmatter parsing
- ✅ Metadata queries
- ✅ Tag indexing
- ✅ Inline fields
- ❌ Complex query language (WHERE, GROUP BY)
- ❌ Live queries in preview mode
- ❌ DataviewJS

**Known Issues**:
- Complex dataview queries not yet implemented
- No reactive updates for metadata changes

**Testing Status**: Unit tests passing, needs E2E testing

---

### 2. Calendar ⚠️

**Status**: Partial Support

**Features Supported**:
- ✅ Daily note creation
- ✅ Date-based filename parsing
- ✅ Frontmatter metadata
- ❌ Calendar UI integration
- ❌ Week/Day navigation

**Known Issues**:
- Calendar UI plugin not implemented
- No integrated calendar view

**Testing Status**: Basic metadata parsing tested

---

### 3. Templater ⚠️

**Status**: Partial Support

**Features Supported**:
- ✅ Template syntax parsing
- ✅ Frontmatter variables
- ✅ Template file metadata
- ❌ Template execution engine
- ❌ Dynamic template functions
- ❌ User functions

**Known Issues**:
- No template execution engine
- Template variables not replaced dynamically

**Testing Status**: Metadata parsing tested, execution not tested

---

### 4. Obsidian Git ✅

**Status**: Full Support

**Features Supported**:
- ✅ File change tracking
- ✅ Git-related frontmatter
- ✅ Metadata caching
- ✅ File watching for changes

**Known Issues**:
- None known (basic git workflow works)

**Testing Status**: Fully tested

---

### 5. Advanced Tables ✅

**Status**: Full Support

**Features Supported**:
- ✅ Markdown table parsing
- ✅ Table metadata extraction
- ✅ Table syntax in editor
- ✅ Table formatting

**Known Issues**:
- No table-specific editor extensions (yet)

**Testing Status**: Parsing and syntax tested

---

### 6. Kanban ⚠️

**Status**: Partial Support

**Features Supported**:
- ✅ Kanban frontmatter metadata
- ✅ Task list parsing
- ✅ Checkbox items
- ❌ Kanban board UI
- ❌ Drag-and-drop cards
- ❌ Board state management

**Known Issues**:
- No dedicated kanban board view
- No interactive board features

**Testing Status**: Metadata tested, UI not implemented

---

### 7. Tasks ⚠️

**Status**: Partial Support

**Features Supported**:
- ✅ Task metadata parsing
- ✅ Task tag extraction
- ✅ Checkbox status
- ❌ Task filtering
- ❌ Task querying
- ❌ Task priority system

**Known Issues**:
- No dedicated task management UI
- No advanced task filtering

**Testing Status**: Basic task parsing tested

---

## API Compatibility

### Metadata Cache

| API Method | Status | Notes |
|------------|--------|-------|
| `getCache()` | ✅ | Full support |
| `getCacheByPath()` | ✅ | Full support |
| `getFileCache()` | ✅ | Full support |
| `on('changed')` | ⚠️ | Basic event support |
| `getLinks()` | ✅ | Full support |
| `getTags()` | ✅ | Full support |
| `getFrontmatter()` | ✅ | Full support |

### Vault API

| API Method | Status | Notes |
|------------|--------|-------|
| `create()` | ✅ | Full support |
| `read()` | ✅ | Full support |
| `write()` | ✅ | Full support |
| `delete()` | ✅ | Full support |
| `rename()` | ✅ | Full support |
| `createFolder()` | ✅ | Full support |
| `getAbstractFileByPath()` | ✅ | Full support |
| `getMarkdownFiles()` | ✅ | Full support |

### Workspace API

| API Method | Status | Notes |
|------------|--------|-------|
| `getActiveFile()` | ✅ | Full support |
| `getActiveViewOfType()` | ✅ | Full support |
| `openLinkText()` | ✅ | Full support |
| `split()` | ⚠️ | Limited support |
| `toggleSplit()` | ⚠️ | Limited support |

### Commands API

| API Method | Status | Notes |
|------------|--------|-------|
| `addCommand()` | ✅ | Full support |
| `removeCommand()` | ✅ | Full support |
| `executeCommandById()` | ✅ | Full support |

## Testing Progress

- ✅ Unit tests for MetadataCache
- ✅ Unit tests for Plugin API
- ⚠️ E2E tests for Dataview
- ❌ E2E tests for Calendar
- ❌ E2E tests for Templater
- ❌ E2E tests for Advanced Tables
- ❌ E2E tests for Kanban
- ❌ E2E tests for Tasks

## Priority Improvements

1. **High Priority**:
   - Implement complex query language for Dataview
   - Build calendar UI integration
   - Add template execution engine

2. **Medium Priority**:
   - Kanban board UI
   - Task filtering and querying
   - Enhanced workspace splitting

3. **Low Priority**:
   - DataviewJS support
   - Custom template functions
   - Advanced task management features

## Contributing

To test a plugin:
1. Install the plugin in a test vault
2. Run the app with the plugin loaded
3. Test core functionality
4. Document results in this matrix
5. Create tests for verified functionality
