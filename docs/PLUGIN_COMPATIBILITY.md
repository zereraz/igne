# Obsidian API Compatibility Status

This document tracks the implementation status of the Obsidian API in Igne.

For a task-oriented “drop-in parity” view grounded in real-world Obsidian usage, see `docs/OBSIDIAN_DROP_IN_GAP_REPORT.md`.

## Pinned baseline

Igne targets a **pinned** Obsidian API baseline: `obsidian` npm `1.11.4`.

When this document says “implemented”, it refers to **API shape + expected behavior** at that baseline. If core filesystem/path semantics are off, many plugin-compatibility claims become invalid even if the TypeScript surface exists.

## Implementation Status

| API Component | Status | Notes |
|---------------|--------|-------|
| Events System | ✅ Implemented | Full event bus with on/off/trigger |
| Metadata Cache | ✅ Implemented | Markdown parsing, headings, links, tags |
| Vault API | ⚠️ Partial | API surface exists, but core vault semantics still diverge (path model + FS primitives + file-type handling) |
| Workspace API | ✅ Partial | Basic layout, needs full split pane |
| Plugin API | ✅ Partial | Base class exists, loader incomplete |
| Settings API | ✅ Implemented | Setting components, tabs |
| Commands API | ✅ Implemented | Add/remove/execute commands |
| Editor API | ✅ Implemented | CodeMirror wrapper |
| Menu API | ✅ Implemented | Context menus |
| Notice API | ✅ Implemented | Toast notifications |
| Modal API | ✅ Implemented | Modal system |
| Theme System | ⚠️ Partial | Theme loading exists; CSS snippet discovery depends on FS primitives that currently filter non-`.md` files |

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

### Foundational blockers (make most plugin estimates unreliable)

- **Directory listing is capped to a fixed recursion depth** in the backend (`read_directory`), which breaks deeper folder trees and realistic vault layouts.
- **Obsidian path semantics are not enforced** (vault-absolute vs OS absolute), so portability and plugin assumptions can break.
- **`DataAdapter` calls backend commands that don’t exist** (`get_file_meta`, `delete_directory`) and `list()` expects the wrong return shape from `read_directory`.
- **`Vault` builds plain objects but uses `instanceof TFile/TFolder` checks**, so core traversal (`getAbstractFileByPath`, `getMarkdownFiles`, etc.) is unreliable.
- **Plugin runtime is not realistically compatible yet**:
  - version gating compares against Igne app version, not the pinned Obsidian baseline,
  - dynamic `import()` of `.obsidian/plugins/*/main.js` is not a working runtime for most community plugins.

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

These are **very early** compatibility guesses based on API surface area only. Until the “Foundational blockers” above are fixed, actual compatibility will often be far lower (or impossible to assess).

| Plugin | Est. Compatibility | Notes |
|--------|------------------|-------|
| Dataview | ⚠️ 30% | Metadata cache works, query language missing |
| Calendar | ⚠️ 40% | Daily notes work, UI not implemented |
| Templater | ⚠️ 20% | Template syntax supported, execution engine missing |
| Obsidian Git | ⚠️ 20% | Git integration depends on reliable FS primitives + permissions + binary handling |
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
