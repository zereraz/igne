# Architecture Flows (where compat “noise” enters today)

This document maps the main execution flows in the current codebase that relate to “Obsidian drop‑in replacement” vs “Igne-native” concerns. It highlights where responsibilities are duplicated or leaking across layers — the main source of future maintenance pain.

If you’re looking for *taskable gaps*, start with `docs/OBSIDIAN_DROP_IN_GAP_REPORT.md`.

## Flow 1 — Open vault → load config → load file tree → index

**Entry**
- UI: `src/hooks/useVaultManager.ts` (`handleOpenVaultPath`)

**Steps**
1. Vault path is selected and stored via `vaultsStore`.
2. Per-vault config is loaded via `vaultConfigStore` (`.obsidian/app.json`, `appearance.json`, `workspace.json`).
3. Theme/snippets are loaded via `ThemeManager` (currently via a “mock app” adapter).
4. File tree is loaded via backend `read_directory`.
5. Search index is built from `.md` files via `searchStore.indexFiles`.

**Key issues**
- There are effectively two “cores”:
  - UI core calls Tauri `invoke(...)` directly.
  - Obsidian shim (`src/obsidian/*`) defines its own Vault/Plugins/Commands, but is not used consistently by the UI.
- Vault traversal is recursive but depth-limited in the backend (`max_depth: 3`), breaking deep vaults.

**Where to look**
- Backend: `src-tauri/src/lib.rs` (`read_directory`, `read_dir_recursive`)
- UI: `src/hooks/useVaultManager.ts`, `src/stores/VaultConfigStore.ts`, `src/stores/searchStore.ts`

---

## Flow 2 — File tree → open file → edit → save → reindex

**Entry**
- UI: `src/App.tsx` (`handleFileSelect`, `handleSave`, `handleContentChange`)

**Steps**
1. File click triggers `invoke('read_file', { path })` and opens a tab.
2. Editor changes mark tab dirty.
3. Save writes via `invoke('write_file', { path, content })`.
4. File tree is refreshed via `read_directory`.
5. Search index is re-built or updated.

**Key issues**
- The UI primarily uses **OS absolute paths** for file I/O and tabs.
- Search store stores **vault-absolute paths** internally, but accepts “either” and tries to normalize.
  - This is convenient, but it’s also a footgun if path conversions are inconsistent.

**Where to look**
- `src/App.tsx`
- `src/stores/searchStore.ts`
- `src/utils/vaultPaths.ts`

---

## Flow 3 — Wikilinks / embeds → resolve → open / render

**Entry**
- Rendering: `src/components/MarkdownViewer.tsx`
- Navigation: `src/App.tsx` (wikilink click handlers)

**Steps**
1. Markdown viewer transforms:
   - `[[note]]` → `wikilink:note`
   - `![[file.png]]` → `![alt](path)` for images only
2. Clicking a wikilink resolves through `searchStore.getFilePathByName` (returns OS path).
3. Markdown image rendering converts local paths with `convertFileSrc`.

**Key issues**
- Embed semantics are incomplete vs Obsidian:
  - heading/block transclusion not implemented (`![[note#Heading]]`, `![[note#^block]]`)
  - PDF/audio/video embeds not implemented as Obsidian expects
- `src/utils/vaultPaths.ts` uses `process.platform` in frontend code (likely incorrect in a browser/webview runtime).

**Where to look**
- `src/components/MarkdownViewer.tsx`
- `src/stores/searchStore.ts`
- `src/utils/vaultPaths.ts`

---

## Flow 4 — Rename file → update incoming links (“Obsidian behavior”) → update index

**Entry**
- UI: `src/App.tsx` (rename handlers)
- Logic: `src/utils/fileManager.ts` (`renameFileWithLinkUpdates`)

**Steps**
1. Count backlinks (`searchStore.findBacklinks`) and confirm.
2. `invoke('rename_file', ...)`.
3. Update search index: remove old doc, read new file, update doc.
4. Rewrite backlink files by regex replacing `[[OldName]]` → `[[NewName]]`.

**Key issues**
- This is a good example of *Obsidian-parity logic* living in UI/core code.
- Link update rules are currently name-only; Obsidian link resolution is more complex (paths, duplicates, headings/blocks).

**Where to look**
- `src/utils/fileManager.ts`
- `src/stores/searchStore.ts`

---

## Flow 5 — Themes/snippets → list available → enable → load CSS

**Entry**
- UI: `src/components/AppearanceSettingsTab.tsx`
- Loading: `src/hooks/useVaultManager.ts` + `src/obsidian/ThemeManager.ts`

**Steps**
1. List available themes/snippets via `read_directory` under:
   - `.obsidian/themes/`
   - `.obsidian/snippets/`
2. Persist settings to `.obsidian/appearance.json`.
3. Load CSS:
   - UI uses a `ThemeManager` instance wired to a *mock* adapter that resolves to OS paths.

**Key issues**
- Obsidian shim ThemeManager expects `vault.adapter.read` to accept Obsidian-style paths, but the shim’s adapter doesn’t translate them to OS paths.
- The UI path works; the shim path doesn’t. This is another manifestation of “two cores”.

**Where to look**
- `src/components/AppearanceSettingsTab.tsx`
- `src/hooks/useVaultManager.ts`
- `src/obsidian/ThemeManager.ts`

---

## Flow 6 — Plugins → discover → enable/disable → (attempt to) load

**Entry**
- UI plugin manager tab: `src/components/PluginsTab.tsx`
- Obsidian shim plugin manager: `src/obsidian/Plugins.ts`

**Current reality**
- UI: can discover manifests and read presence of `main.js`.
- Shim: tries to `import()` `.obsidian/plugins/<id>/main.js` and uses `currentAppVersion = '1.0.0'` for gating.

**Key issues**
- Plugin runtime is not realistically compatible yet (community plugins expect `require('obsidian')` and CommonJS semantics).
- Shim uses relative `.obsidian/...` paths without translating to OS paths; backend expects OS paths.
- Version gating must be tied to “supported Obsidian compat version”, not Igne app version.

**Where to look**
- `src/components/PluginsTab.tsx`
- `src/obsidian/Plugins.ts`
- `docs/OBSIDIAN_DROP_IN_GAP_REPORT.md`

---

## Flow 7 — `.obsidian/*` settings IO

**Entry**
- `src/stores/VaultConfigStore.ts`
- `src/utils/starredFiles.ts`
- `src/utils/dailyNotes.ts`

**Key issues**
- Most config IO correctly uses `${vaultPath}/.obsidian/...`.
- `dailyNotes.ts` currently reads/writes `.obsidian/daily-notes.json` as a relative path (not per-vault).

**Where to look**
- `src/stores/VaultConfigStore.ts`
- `src/utils/dailyNotes.ts`
- `src/utils/starredFiles.ts`

---

## Conclusion: where “compat noise” is coming from

1. Duplicate “cores” (UI-core vs Obsidian-shim-core) causing inconsistent abstractions.
2. Mixed path semantics (OS paths, vault paths, relative `.obsidian/...` paths) and ad-hoc conversions.
3. Plugin runtime is a large subsystem that needs isolation; if it’s hacked in ad-hoc, it will dominate the repo.

The fix is not “less compatibility”, it’s **hard boundaries and contract tests** (see `docs/ENGINEERING_GUARDRAILS.md`).
