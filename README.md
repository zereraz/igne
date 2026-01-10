# Igne

A fast, extensible knowledge base application with Obsidian plugin compatibility.

## Features

- **Fast & Lightweight**: Built with Rust (Tauri) backend and React frontend
- **Plugin System**: Compatible with Obsidian plugin API
- **Wikilinks**: Full support for `[[wikilinks]]` with autocomplete
- **Search**: Powerful full-text search with MiniSearch
- **Markdown**: Complete Markdown support with CodeMirror editor
- **Live Preview**: Real-time markdown rendering
- **Backlinks**: See all backlinks to your notes
- **Tags**: Organize notes with tags
- **File Tree**: Navigate your vault with a file tree
- **Quick Switcher**: Fast file switching with keyboard shortcut (Cmd+P)
- **Tab Management**: Multiple files open in tabs
- **Customizable**: Extensible with plugins

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/zereraz/igne.git
cd igne

# Install dependencies
bun install

# Run development server
bun run dev
```

### Building

```bash
# Build for development
bun run build

# Build Tauri app
bun run tauri:build
```

## Development

### Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run test` - Run unit tests
- `bun run test:ui` - Run tests with UI
- `bun run test:e2e` - Run E2E tests with Playwright
- `bun run tauri:dev` - Run Tauri development mode

### Testing

```bash
# Unit tests
bun run test

# E2E tests
bun run test:e2e

# Performance benchmarks
bun run test tests/performance/benchmark.test.ts
```

## Plugin Development

Igne supports plugins compatible with the Obsidian plugin API. See the [Plugin Development Guide](docs/plugin-development.md) for details.

### Example Plugin

```typescript
import { Plugin, Notice } from 'igne';

export default class MyPlugin extends Plugin {
  async onload() {
    this.addCommand({
      id: 'my-command',
      name: 'My Command',
      callback: () => {
        new Notice('Hello from Igne!');
      }
    });
  }
}
```

See [examples/](examples/) for more plugin examples.

## Documentation

- **[Plugin Development Guide](docs/plugin-development.md)** - Create plugins
- **[Plugin Compatibility](docs/PLUGIN_COMPATIBILITY.md)** - Check plugin compatibility
- **[Documentation Index](docs/README.md)** - All documentation

## Architecture

- **Backend**: Rust with Tauri
- **Frontend**: React with TypeScript
- **Editor**: CodeMirror 6
- **Styling**: TailwindCSS
- **Testing**: Vitest + Playwright

## Key Technologies

- **Tauri** - Cross-platform desktop framework
- **React** - UI framework
- **CodeMirror** - Markdown editor
- **MiniSearch** - Full-text search
- **Fuse.js** - Fuzzy search
- **Vitest** - Unit testing
- **Playwright** - E2E testing

## Performance

Igne is optimized for large vaults:

- **Startup**: < 2 seconds for 1000 files
- **File Switch**: < 100ms
- **Search**: < 500ms for 1000 files
- **Memory**: < 500MB for 1000 files

See [Performance Utilities](src/utils/performance.ts) for benchmarking tools.

## Project Status

This is an active development project. See [Issues](https://github.com/zereraz/igne/issues) for roadmap and known issues.

### Completed Features

- [x] Markdown editing with CodeMirror
- [x] Wikilink support with autocomplete
- [x] File tree navigation
- [x] Full-text search
- [x] Backlinks panel
- [x] Tab management
- [x] Quick switcher
- [x] Obsidian plugin API compatibility
- [x] E2E testing with Playwright
- [x] Performance optimization utilities
- [x] Plugin documentation

### In Progress

- [ ] Enhanced plugin compatibility
- [ ] Additional editor features
- [ ] Theme support
- [ ] Mobile support

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Inspired by [Obsidian](https://obsidian.md)
- Built with [Tauri](https://tauri.app)
- Editor powered by [CodeMirror](https://codemirror.net)
