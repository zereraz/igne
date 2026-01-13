# Changelog

All notable changes to Igne will be documented in this file.

## [0.1.0] - 2025-01-13

### Added

#### Obsidian Compatibility (v1.11.4 Baseline)
- Full Obsidian API compatibility layer (pinned to v1.11.4)
- Plugin system with tier-based compatibility detection
  - Tier 0: Browser-only APIs + Obsidian public API
  - Tier 1: Network, clipboard, notifications (with permission)
  - Tier 2: Node/Electron APIs (blocked)
- Vault-relative path support for cross-platform vaults
- Safe JSON I/O that preserves unknown fields in .obsidian settings
- Command registry with unified tool surface
- Audit logging for all file operations

#### Embed Semantics
- **PDF embeds:** `![[file.pdf#page=5]]` - embed specific pages
- **Audio embeds:** `![[audio.mp3]]` - HTML5 audio player
- **Video embeds:** `![[video.mp4]]` - HTML5 video player
- **Block transclusion:** `![[Note#^blockid]]` - embed specific blocks
- **Heading transclusion:** `![[Note#Heading]]` - embed sections by heading
- **Embed parameters:** `#width=300`, `#align=center`, `#autoplay`, etc.

#### AI-First Layer
- Agent tool API built on unified command surface
- Plan/approve/execute loop with user controls
- Scoped context controls (select folders/notes)
- Audit trail for all AI actions
- Agent panel with conversation, plan, and execution log

#### Editor Features
- Live preview with proper markdown rendering
- Wikilink support: `[[note]]` and `[[note|alias]]`
- Tag support: `#tag` and `#nested/tag`
- Code blocks with syntax highlighting
- Math blocks (KaTeX)
- Callouts and admonitions
- Task lists with checkboxes
- Image paste/drop with binary I/O
- Split panes with workspace state persistence

#### Core Features
- Vault creation and management
- File explorer with nested folders
- Search across notes
- Backlinks panel
- Graph view
- Daily notes integration
- Theme system with light/dark mode
- Settings management (appearance, hotkeys, etc.)

### Fixed
- Tag parser now correctly recognizes `#tag` at start of document
- File rename no longer loses content
- Theme toggle now works correctly in all scenarios

### Technical Details
- **570 passing tests** (unit + E2E)
- **8 roadmap phases completed** (A-H)
- **60+ files changed** for embed system
- **API cost:** ~$12 for all development work

### Known Limitations
1. **Canvas not supported** - Obsidian's visual whiteboard feature (introduced after v1.11.4)
2. **File watching** - Currently uses polling instead of native filesystem events
3. **Tier 2 plugins** - Node/Electron API plugins are not supported
4. **Directory depth** - Large vaults with deep folder structures may have issues
5. **Community plugins** - Not yet tested with real-world community plugins

### Platform Support
- macOS (Intel and Apple Silicon)
- Linux (AppImage, deb)
- Windows (msi, nsi) - build available, not extensively tested

### Development
- Built with Tauri 2.x
- React with TypeScript
- CodeMirror 6 for editor
- Vitest for unit tests
- Playwright for E2E tests
- GLM API (Z.ai) for AI agents

### Documentation
- `docs/README.md` - Documentation index
- `docs/OBSIDIAN_COMPATIBILITY_AI_FIRST_ROADMAP.md` - Roadmap
- `docs/PLUGIN_TIERS.md` - Plugin compatibility tiers
- `docs/EMBED_PARAMETERS.md` - Embed syntax guide
- `TESTING.md` - Testing guide

---

## Version Format

We follow [Semantic Versioning 2.0.0](https://semver.org/):
- **MAJOR** version: Breaking changes or major milestones
- **MINOR** version: New features (backwards compatible)
- **PATCH** version: Bug fixes (backwards compatible)

Given the pinned Obsidian baseline (v1.11.4), advancing the MINOR version will likely indicate new Igne-native features, while PATCH versions indicate compatibility fixes and minor improvements.
