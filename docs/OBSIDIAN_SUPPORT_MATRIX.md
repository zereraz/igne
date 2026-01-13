# Obsidian drop‑in support matrix (Igne)

This is a quick “what works vs what’s missing” scan for agents.

For detailed, taskable gaps (with acceptance criteria), see `docs/OBSIDIAN_DROP_IN_GAP_REPORT.md`.

**Declared supported Obsidian API version:** `compat/obsidian-api/metadata.json` (`package.version`)

## Legend

- ✅ Works (usable today)
- ⚠️ Partial (works but diverges from Obsidian or incomplete)
- ❌ Missing (not implemented)
- 🧨 Broken (present but incorrect in real vaults)

## Core vault + UI

| Area | Status | Evidence (entry points) | Notes / next |
| --- | --- | --- | --- |
| Open vault, list files | ⚠️ | `src/hooks/useVaultManager.ts`, `src-tauri/src/lib.rs` (`read_directory`) | Backend is recursive and eager; needs lazy listing for large vaults. |
| Deep folder trees | ⚠️ | `src-tauri/src/lib.rs` (`read_dir_recursive`) | Depth cap removed; still eager recursion. |
| Non-markdown files (attachments, plugin assets) | ⚠️ | File explorer + backend listing | Should treat vault as arbitrary files; ensure UI doesn’t filter too aggressively. |
| Markdown editing (CM6) | ✅ | CodeMirror packages in `package.json` | Editor exists; parity with Obsidian’s editor behaviors is not complete. |
| Markdown preview | ✅ | `src/components/MarkdownViewer.tsx` | Good baseline; embed semantics still incomplete. |
| Outline | ✅ | `src/components/OutlinePanel.tsx` | Depends on heading parsing; verify parity with Obsidian folding/sections later. |
| Graph view | ⚠️ | `src/components/GraphView.tsx` | Exists; Obsidian parity (filters, groups, performance) unknown. |
| Tabs/workspace layout | ⚠️ | `src/App.tsx` | Multi-pane and `workspace.json` parity is incomplete. |

## Links, embeds, attachments

| Area | Status | Evidence (entry points) | Notes / next |
| --- | --- | --- | --- |
| Wikilinks `[[note]]` navigation | ⚠️ | `src/components/MarkdownViewer.tsx`, `src/stores/searchStore.ts` | Resolution rules differ from Obsidian (paths, duplicates, anchors). |
| Rename updates incoming links | ⚠️ | `src/utils/fileManager.ts` | Exists but is name-based; needs Obsidian-like resolution rules. |
| Backlinks | ⚠️ | `src/components/BacklinksPanel.tsx`, `src/stores/searchStore.ts` | Works but misses `#Heading` / `#^block` nuances + better context. |
| Image embeds `![[img.png]]` | ⚠️ | `src/components/MarkdownViewer.tsx` | Works for images; sizing params (`|100x145`) may be incomplete. |
| PDF embeds `![[doc.pdf#page=3]]` | ❌ | — | Needs at least “open at page” behavior; inline viewer can be later. |
| Audio/video embeds | ❌ | — | Not yet rendered as Obsidian-style players. |
| Heading/block transclusions | ❌ | — | `![[note#Heading]]`, `![[note#^block]]` are key drop-in features. |
| Binary read/write | ✅ | `src-tauri/src/lib.rs` (`read_file_binary`, `write_file_binary`) | Enables paste/drop attachments; expand usage across embed types. |

## `.obsidian/*` compatibility

| Area | Status | Evidence (entry points) | Notes / next |
| --- | --- | --- | --- |
| Vault config read/write (`app.json`, `appearance.json`, etc) | ⚠️ | `src/stores/VaultConfigStore.ts` | Works for known files; unknown key preservation needs consistency. |
| Daily notes config per vault | ✅ | `src/utils/dailyNotes.ts` | Now resolves via vault path → OS path join. |
| Override config folder | ❌ | — | Must support non-`.obsidian` config root per vault. |
| Themes/snippets | ⚠️ | `src/obsidian/ThemeManager.ts`, `src/components/AppearanceSettingsTab.tsx` | UI path works; Obsidian shim path translation still inconsistent. |

## Indexing, search, metadata

| Area | Status | Evidence (entry points) | Notes / next |
| --- | --- | --- | --- |
| Full-text search | ⚠️ | `src/stores/searchStore.ts` | Works (MiniSearch), but needs incremental updates + attachment indexing story. |
| Frontmatter parsing | ⚠️ | `src/obsidian/parser/MarkdownParser.ts`, `src/components/useTags.ts` | Exists, but modern “Properties” parity and typed indexing are incomplete. |
| MetadataCache parity | ⚠️ | `src/obsidian/MetadataCache.ts` | Partial; needed for Dataview-like and plugin expectations. |

## Commands, plugins, AI

| Area | Status | Evidence (entry points) | Notes / next |
| --- | --- | --- | --- |
| Command palette | ⚠️ | `src/components/CommandPalette.tsx` | Needs “single command surface” shared with shim/plugins/agents. |
| Hotkey persistence | ⚠️ | `src/stores/VaultConfigStore.ts` (`hotkeys.json`) | Persistence exists; editor UI + full parity incomplete. |
| Plugin discovery + enable flags | ⚠️ | `src/components/PluginsTab.tsx` | Can list/toggle plugin IDs; does not imply successful execution. |
| Plugin runtime (community plugins) | ❌ | — | Needs module system, `obsidian` injection, permissions, environment parity. |
| Claude Code-like agent execution | ⚠️ | `src/agent/executor.ts` | Executor exists; not yet connected to app tools/UI. |
| External automation (URI/MCP) | ❌ | — | Needed for “agents control the whole app” workflows. |
