# Igne Documentation

Welcome to the Igne documentation! Igne is a fast, extensible knowledge base application with Obsidian plugin compatibility.

**Current Status**: MVP features implemented, state persistence in progress.

## Documentation

### For Users

- **[Quick Start](../README.md#quick-start)** - Get started with Igne
- **[Features](../README.md#features)** - Discover Igne's capabilities

### For Plugin Developers

- **[Plugin Development Guide](./plugin-development.md)** - Create your first plugin
- **[Plugin Compatibility Matrix](./PLUGIN_COMPATIBILITY.md)** - Check API compatibility status
- **[Example Plugins](../examples/)** - Sample plugins to learn from

### For Contributors

- **[Contributing Guide](../CONTRIBUTING.md)** - How to contribute to Igne
- **[Development](../README.md#development)** - Set up development environment

## Quick Links

### Getting Started

1. **Install Igne**: See the [Quick Start](../README.md#quick-start)
2. **Learn the Basics**: Read the [Features](../README.md#features)

### Plugin Development

1. **Your First Plugin**: Start with the [Plugin Development Guide](./plugin-development.md)
2. **API Status**: Check the [Compatibility Matrix](./PLUGIN_COMPATIBILITY.md)
3. **Examples**: Browse [example plugins](../examples/)

## Implementation Status

### ✅ Completed Features

**Editor & Markdown**
- CodeMirror 6 editor with markdown support
- Wikilink `[[link]]` autocomplete
- Live preview with inline formatting
- Enhanced markdown: Math (KaTeX), Mermaid, Callouts, Footnotes
- Image paste & drag-drop
- Syntax highlighting

**Navigation**
- File tree with folders
- Quick switcher (Cmd+P)
- Tab management
- Backlinks panel
- Outline/TOC panel
- Tags panel
- Graph view (D3.js)

**Productivity**
- Daily notes with templates
- Template system
- Advanced search (`tag:`, `file:`, `path:`)
- Split view
- Command palette

**Obsidian Compatibility**
- Plugin API layer
- `.obsidian` folder support
- Metadata cache
- Workspace management
- Settings system

### 🚧 In Progress

- State persistence (vaults, workspace, settings)
- Plugin loader for community plugins
- E2E test suite
- Performance optimization

### 📋 Planned

- Theme system
- Enhanced plugin compatibility
- Additional editor features
- Mobile support

## Key Features

- **Fast & Lightweight**: Rust backend with React frontend
- **Plugin System**: Obsidian plugin API compatibility
- **Wikilinks**: Full support for `[[wikilinks]]`
- **Search**: Powerful full-text search with operators
- **Markdown**: Complete markdown with live preview
- **Backlinks**: See all backlinks to your notes
- **Tags**: Organize with tags
- **Graph**: Visualize connections
- **Customizable**: Extensible with plugins and themes

## Documentation Structure

```
docs/
├── README.md                    # This file - documentation index
├── plugin-development.md        # Plugin development guide
├── PLUGIN_COMPATIBILITY.md      # API compatibility matrix

examples/
├── hello-world-plugin.ts        # Simple example
├── word-counter-plugin.ts       # Word counter
├── daily-note-plugin.ts         # Daily notes
└── test-vault/                  # Example vault
    ├── Daily Notes/
    ├── Templates/
    └── Welcome.md
```

## Development Resources

### Testing

```bash
# Unit tests
bun run test

# E2E tests (requires dev server running)
bun run tauri:dev  # In another terminal
bun run test:e2e
```

### Performance

- Target: < 2s startup for 1000 files
- Target: < 100ms file switch
- Target: < 500ms search for 1000 files

*Note: Performance targets are aspirational. Actual benchmarks pending optimization work.*

## Community

- **GitHub**: https://github.com/zereraz/igne
- **Issues**: https://github.com/zereraz/igne/issues
- **Discussions**: https://github.com/zereraz/igne/discussions

## License

MIT License - see [LICENSE](../LICENSE) file for details.
