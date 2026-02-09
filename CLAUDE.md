# Igne Project Guidelines

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Tauri 2 (Rust)
- **Editor**: CodeMirror 6
- **Styling**: CSS Variables for Obsidian theme compatibility

## Development Commands
```bash
npm run tauri:dev          # Dev build with "Igne Dev" name/icon
npm run tauri:dev:prod     # Dev build with production name/icon
npm run tauri:build        # Production build
npm run tauri:build:dev    # Dev-branded production build
```

## Critical Learning: Always Verify with Official Docs

**For rapidly-evolving frameworks like Tauri, ALWAYS use WebSearch to verify the correct API before implementing.**

### Why This Matters
- Tauri 2 has significant API changes from Tauri 1
- Training data may be outdated or mix versions
- Plugin APIs (like `tauri-plugin-global-shortcut`) have specific patterns that differ between versions

### Example: Global Shortcut Implementation
**Wrong approach**: Implementing based on memory/training data
- Led to using non-existent methods like `.on_shortcut()`
- Caused compilation errors and wasted iterations

**Correct approach**: WebSearch first
```
WebSearch: "tauri 2 global shortcut plugin example"
```
Then verify the official docs show:
- Correct Builder pattern with `.with_handler()`
- Proper registration in setup with `app.global_shortcut().register()`

### Rule
When implementing features using:
- Tauri plugins
- New framework versions
- APIs that may have changed

**Always WebSearch the official documentation first**, even if you think you know the API.

## Project Structure
- `src/` - React frontend
- `src-tauri/` - Rust backend
- `src-tauri/icons/` - Production icons (purple)
- `src-tauri/icons-dev/` - Dev icons (orange with DEV badge)
- `.obsidian/` patterns - Obsidian vault compatibility

## CodeMirror 6 Architecture (critical for editor work)

### Decoration Patterns
- **ViewPlugin**: For inline/mark decorations (bold, italic, heading styles, wikilink widgets, tag pills). These are "indirect" — CM6 reads them after viewport computation. Can use `view.visibleRanges` to scope work.
- **StateField**: For block-affecting decorations (embeds, code block widgets, callout widgets, mermaid). These are "direct" — CM6 needs them before viewport computation. Provided via `EditorView.decorations.from(field)`.
- **Never mix**: Block-replacing decorations in a ViewPlugin will silently break layout.

### Update Performance Rules
- `update.docChanged` — content changed, must rebuild decorations
- `update.viewportChanged` — user scrolled, may need new decorations for newly-visible ranges
- `update.selectionSet` — cursor moved (NO content change). This fires on every keystroke and arrow press. **Do NOT do full rebuilds on selectionSet alone.** Instead, map existing decorations and only recalculate cursor-sensitive ones (mark hiding, widget↔raw toggling).
- `syntaxTree(update.startState) !== syntaxTree(update.state)` — async parse completed, tree may have new nodes
- Full syntax tree iteration + regex scans on every selectionSet is O(n) per keystroke — unacceptable for large docs.

### Incremental Update Patterns
- `MatchDecorator` with `createDeco`/`updateDeco` — automatically handles incremental updates for regex-based decorations
- `DecorationSet.map(tr.changes)` — carries decorations forward through document changes without rebuilding
- `syntaxTree(state).iterate({ from, to })` — scope tree walk to visible ranges

### Current Architecture (livePreview.ts)
- `buildAllDecorations()` walks full syntax tree + runs 4 regex scans (code blocks, math, mermaid, callouts)
- ViewPlugin handles inline decorations, dispatches block decorations to StateField via `requestAnimationFrame` + `StateEffect`
- The rAF dispatch causes double-render per update (first frame: stale block decos, second frame: correct)
- Block scans (`findCodeBlocks`, `findMathBlocks`, etc.) use line-by-line or full-doc regex — should be cached and invalidated only on `docChanged`

### Widget Reuse
All widgets implement `eq()` — CM6 compares old vs new widgets and reuses DOM when they match. This is correct and important for avoiding DOM thrash.

### Lezer Markdown Parser
- Custom inline parsers in `markdownExtensions.ts`: Wikilink, Embed, BlockID, Tag, Highlight
- GFM extensions from `@lezer/markdown`: Table, TaskList, Strikethrough
- Lezer handles `Escape` nodes natively (backslash escapes) — custom parsers run after escape handling
- CodeMirror normalizes CRLF→LF internally (`DefaultSplit = /\r\n?|\n/`)
- `@codemirror/lang-markdown` has `pasteURLAsLink: true` by default

### Testing
- Tests in `src/extensions/__tests__/` — run with `npx vitest run`
- `livePreview.test.ts` uses data-driven specs from `fixtures.ts` + focused test suites
- `createEditor(doc, cursorPos)` helper creates EditorView with markdown language + livePreview plugin
- `getHiddenRanges(view)` extracts replace decorations with `isHidden: true`
- `hasWikilinkWidget(view, from, to)` / `hasTagWidget(view, from, to)` check for widget decorations at positions
- Static `livePreview` export (no config) is used by tests — only returns inline decorations
- 621 tests pass, 46 skipped (media type detection not yet implemented)
