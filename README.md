# Igne

A fast, native markdown editor. Opens your Obsidian vaults.

## Download

**[Download v0.4.0](https://github.com/zereraz/igne/releases/latest)** — macOS, Windows, Linux

## Why Igne?

- **Fast** — Tauri 2 + Rust. Instant startup, tiny memory footprint.
- **Familiar** — Drop it on your existing Obsidian vault. Wikilinks, tags, frontmatter, community themes — it all works.
- **Live preview** — Typora-style editing. Markdown syntax hides as you type, renders inline. No split panes.

## Features

- CodeMirror 6 editor with live preview (bold, italic, headings, code, math, diagrams — all inline)
- Wikilinks `[[like this]]` and embeds `![[like this]]`
- Backlinks
- Quick switcher (Cmd+P)
- Graph view
- Daily notes
- KaTeX math and Mermaid diagrams
- Syntax highlighting for code blocks
- Callouts / admonitions
- Task checkboxes
- Community themes and CSS snippets
- Light / dark mode

## Mobile (iOS)

An iOS companion app lives in `packages/mobile/`. It reuses the same CodeMirror 6 editor (bundled into a WebView) so you get identical live preview rendering on your phone.

- Reads your vault from iCloud Drive — same files, no sync setup
- Search bar as primary navigation (type 2 letters, you're there)
- "Continue reading" bar remembers where you left off
- Wikilink navigation works — tap a link, it opens
- Auto-save with flush on exit (no data loss)

### Mobile development

```bash
cd packages/mobile
npm install
npm run build:editor   # bundles CM6 into WebView HTML
npx expo start --ios   # requires a development build for native modules
```

## Development

```bash
bun install
bun run tauri:dev       # desktop app (dev build)
```

### Testing

```bash
bun test                # unit tests (vitest)
bun run test:e2e        # E2E tests (playwright)
```

## Project structure

```
src/              React frontend (desktop)
src-tauri/        Rust backend (Tauri 2)
packages/mobile/  iOS app (Expo + React Native)
tests/            E2E tests
```

## License

MIT
