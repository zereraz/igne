# Igne

A fast, extensible knowledge base application with Obsidian compatibility.

> **Status**: Active Development - State persistence and theme system complete.

## Features

### Currently Implemented

**Editor & Markdown**
- CodeMirror 6 editor with markdown support
- Wikilink support `[[link]]` with autocomplete
- Live preview with inline formatting
- Enhanced markdown: Math (KaTeX), Mermaid diagrams, Callouts, Footnotes, Definition Lists
- Image paste & drag-drop support
- Syntax highlighting for code blocks

**Navigation & Organization**
- File tree with folder structure
- Quick switcher (Cmd+P)
- Tab management for multiple open files
- Backlinks panel
- Outline/TOC panel with heading tracking
- Tags panel with nested tag support
- Graph view (D3.js force-directed layout)

**Productivity**
- Daily notes with templates and date navigation
- Template system with variable substitution
- Advanced search with operators (`tag:`, `file:`, `path:`)
- Split view support
- Command palette (Cmd+Shift+P)

**Obsidian Compatibility**
- Plugin API compatibility layer
- `.obsidian` folder structure support
- Metadata cache for markdown parsing
- Workspace layout management
- Settings system

**State Persistence**
- Vault registry and management
- Window state persistence (position, size)
- Global settings storage
- Vault-level settings (.obsidian/app.json, appearance.json)
- Workspace and tab persistence across sessions
- Auto-open last vault on startup

**Theme System**
- Settings modal (Cmd/Ctrl+, to open)
- Appearance settings with live preview
- Light/dark theme toggle
- Accent color picker
- Font size slider (12-24px)
- Font family selection (interface, text, monospace)
- Community theme selector (scans .obsidian/themes/)
- CSS snippet toggles (scans .obsidian/snippets/)

### Planned Features

- [ ] Enhanced plugin loader (load community plugins)
- [ ] Performance optimization for large vaults
- [ ] Mobile support

## Quick Start

### Prerequisites

- Node.js 18+ and [Bun](https://bun.sh)
- Rust (for Tauri desktop app)

### Installation

```bash
# Clone the repository
git clone https://github.com/zereraz/igne.git
cd igne

# Install dependencies
bun install

# Run development server
bun run tauri:dev
```

### Building

```bash
# Build for development
bun run build

# Build Tauri app for production
bun run tauri:build
```

## Development

### Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server (web only) |
| `bun run tauri:dev` | Run full Tauri desktop app |
| `bun run build` | Build frontend for production |
| `bun run tauri:build` | Build desktop app bundle |
| `bun run test` | Run unit tests with Vitest |
| `bun run test:ui` | Run tests with Vitest UI |
| `bun run test:run` | Run unit tests (no watch) |
| `npm run test:e2e` | Run E2E tests (CI/Linux only) |

### Project Structure

```
igne/
├── src/
│   ├── components/      # React components (Editor, FileTree, etc.)
│   ├── obsidian/        # Obsidian API compatibility layer
│   ├── stores/          # State management
│   ├── extensions/      # CodeMirror extensions
│   └── utils/           # Utility functions
├── src-tauri/           # Rust backend (Tauri)
├── tests/               # Unit and E2E tests
├── docs/                # Documentation
└── examples/            # Example plugins
```

## Documentation

- **[Plugin Development Guide](docs/plugin-development.md)** - Create plugins
- **[Plugin Compatibility](docs/PLUGIN_COMPATIBILITY.md)** - API compatibility status
- **[Documentation Index](docs/README.md)** - All documentation

## Architecture

- **Backend**: Rust with Tauri (file system, native dialogs)
- **Frontend**: React with TypeScript
- **Editor**: CodeMirror 6
- **State**: React hooks + Zustand stores
- **Styling**: CSS variables + custom design system

## Key Technologies

| Technology | Purpose |
|------------|---------|
| [Tauri](https://tauri.app) | Cross-platform desktop framework |
| [React](https://react.dev) | UI framework |
| [CodeMirror](https://codemirror.net) | Markdown editor |
| [MiniSearch](https://lucaong.github.io/minisearch/) | Full-text search |
| [D3.js](https://d3js.org) | Graph visualization |
| [Vitest](https://vitest.dev) | Unit testing |
| [Playwright](https://playwright.dev) | E2E testing |
| [KaTeX](https://katex.org) | Math rendering |
| [Mermaid](https://mermaid.js.org) | Diagrams |

## Testing

### Unit Tests (227 tests)
```bash
npm run test:run     # Run all tests
npm run test:ui      # Open Vitest UI
```

### E2E Tests (43 tests)
E2E tests run on GitHub Actions (Linux only - Tauri WebDriver requirement):
```bash
npm run test:e2e   # Runs on CI (Linux)
```
See [TESTING.md](TESTING.md) for details.

## Development Status

### ✅ Completed (MVP)

- Markdown editing with CodeMirror 6
- Wikilink support with autocomplete
- File tree navigation
- Full-text search with operators
- Backlinks panel
- Tab management
- Quick switcher
- Obsidian API compatibility layer
- Enhanced markdown (Math, Mermaid, Callouts)
- Outline/TOC panel
- Tags panel
- Graph view
- Daily notes with templates
- Template system
- Inline format preview
- Image paste & drop
- Advanced search
- Split view
- State persistence (vaults, workspace, settings)
- Theme system (settings, themes, CSS snippets)
- E2E test suite (43 tests via Playwright + Tauri WebDriver)

### 🚧 In Progress

- Plugin loader for community plugins
- Performance optimizations

### 📋 Planned

- Enhanced plugin compatibility
- Additional editor features
- Mobile support

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- Inspired by [Obsidian](https://obsidian.md)
- Built with [Tauri](https://tauri.app)
- Editor powered by [CodeMirror](https://codemirror.net)
