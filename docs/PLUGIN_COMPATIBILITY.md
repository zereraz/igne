# Obsidian API Compatibility Status

This document tracks the implementation status of the Obsidian API in Igne.

## Implementation Status

| API Component | Status | Notes |
|---------------|--------|-------|
| Events System | ✅ Implemented | Full event bus with on/off/trigger |
| Metadata Cache | ✅ Implemented | Markdown parsing, headings, links, tags |
| Vault API | ✅ Implemented | File CRUD, enumeration |
| Workspace API | ✅ Partial | Basic layout, needs full split pane |
| Plugin API | ✅ Partial | Base class exists, loader incomplete |
| Settings API | ✅ Implemented | Setting components, tabs |
| Commands API | ✅ Implemented | Add/remove/execute commands |
| Editor API | ✅ Implemented | CodeMirror wrapper |
| Menu API | ✅ Implemented | Context menus |
| Notice API | ✅ Implemented | Toast notifications |
| Modal API | ✅ Implemented | Modal system |
| Theme System | 🚧 In Progress | CSS variables defined, loader incomplete |

## API Method Compatibility

### MetadataCache

| Method | Status | Notes |
|--------|--------|-------|
| `getCache(path)` | ✅ | Full support |
| `getFileCache(file)` | ✅ | Full support |
| `on('changed')` | ✅ | Event support |
| `getLinks()` | ✅ | Extracted from cache |
| `getTags()` | ✅ | Extracted from cache |
| `getFrontmatter()` | ✅ | YAML parsing |
| `getHeadings()` | ✅ | Heading extraction |

### Vault

| Method | Status | Notes |
|--------|--------|-------|
| `create(path, data)` | ✅ | Full support |
| `read(file)` | ✅ | Full support |
| `write(file, data)` | ✅ | Full support (via adapter) |
| `delete(file)` | ✅ | Full support |
| `rename(file, newPath)` | ✅ | Full support |
| `createFolder(path)` | ✅ | Full support |
| `getAbstractFileByPath(path)` | ✅ | Full support |
| `getMarkdownFiles()` | ✅ | Full support |
| `getFiles()` | ✅ | Full support |

### Workspace

| Method | Status | Notes |
|--------|--------|-------|
| `getActiveFile()` | ✅ | Full support |
| `getActiveViewOfType(type)` | ✅ | Generic implementation |
| `openLinkText(linkText, sourcePath)` | ✅ | Full support |
| `split()` | 🚧 | Basic support, needs refinement |
| `toggleSplit()` | 🚧 | Limited support |
| `getLeaf(newLeaf)` | 🚧 | Partial implementation |

### Commands

| Method | Status | Notes |
|--------|--------|-------|
| `addCommand(command)` | ✅ | Full support |
| `removeCommand(id)` | ✅ | Full support |
| `executeCommandById(id)` | ✅ | Full support |
| `findCommand(id)` | ✅ | Full support |
| `listCommands()` | ✅ | Full support |

### Plugin

| Method | Status | Notes |
|--------|--------|-------|
| `onload()` | ✅ | Called on load |
| `onunload()` | ✅ | Called on unload |
| `loadData()` | ✅ | JSON storage |
| `saveData(data)` | ✅ | JSON storage |
| `addCommand(command)` | ✅ | Via app.commands |
| `addSettingTab(tab)` | ✅ | Full support |
| `registerView(type, creator)` | 🚧 | API exists, needs testing |

## Known Limitations

### Plugin Loading
- **Missing**: Dynamic plugin loading from `.obsidian/plugins/`
- **Missing**: Plugin manifest validation
- **Missing**: Plugin enable/disable UI
- **Missing**: Community plugin marketplace integration

### Workspace
- Split panes work but need refinement
- View state persistence incomplete
- Leaf management needs improvement

### Themes
- CSS variables defined but theme loader incomplete
- Community theme loading not implemented
- Theme switching UI not built

### Settings
- Plugin settings tabs work
- Hotkey customization UI incomplete

## Testing Status

### Unit Tests
- ✅ MetadataCache parsing tests
- ✅ Plugin API basic tests
- ✅ Workspace basic tests

### E2E Tests
- 🚧 Test infrastructure exists
- ❌ Tests need dev server running
- ❌ Not CI-ready

## Popular Plugin Compatibility

These are theoretical compatibility estimates based on API implementation. Actual testing needed.

| Plugin | Est. Compatibility | Notes |
|--------|------------------|-------|
| Dataview | ⚠️ 30% | Metadata cache works, query language missing |
| Calendar | ⚠️ 40% | Daily notes work, UI not implemented |
| Templater | ⚠️ 20% | Template syntax supported, execution engine missing |
| Obsidian Git | ✅ 80% | File operations work, needs testing |
| Advanced Tables | ⚠️ 50% | Tables parse, editor extensions need work |
| Kanban | ❌ 10% | Metadata only, UI completely missing |
| Tasks | ⚠️ 30% | Task parsing works, querying/filtering missing |

## Priority Improvements

1. **Plugin Loader** (High)
   - Load plugins from `.obsidian/plugins/`
   - Validate manifests
   - Enable/disable UI

2. **Workspace Refinement** (High)
   - Proper split pane handling
   - View state persistence
   - Leaf management

3. **Theme System** (Medium)
   - Load community themes
   - Theme switching UI
   - CSS snippets

4. **Settings UI** (Medium)
   - Hotkey editor
   - About panel
   - Plugin management UI

## Contributing

Want to help improve plugin compatibility?

1. **Test a plugin**: Load a plugin and document what works/doesn't
2. **Implement missing APIs**: Check the obsidian/ folder for incomplete implementations
3. **Write tests**: Add tests for API methods
4. **Report bugs**: File issues with plugin compatibility problems

## Notes

- This compatibility layer is a work in progress
- The goal is full Obsidian API compatibility
- Community contributions welcome
- See `src/obsidian/` for implementation details
- See `examples/` for example plugins
