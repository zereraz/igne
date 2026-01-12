# Igne — Obsidian Compatibility (Pinned) + AI-First Roadmap

**Status:** Draft plan for execution by agents  
**Pinned Obsidian API baseline:** `obsidian` npm `1.11.4` (do not advance baseline unless explicitly decided)  
**Vendored API source:** `obsidian.d.ts` snapshot (commit-pinned)  

For the “what’s supported vs what’s required” intersection view, see: `docs/OBSIDIAN_DROP_IN_GAP_REPORT.md`.

## 0) Intent and Constraints

### 0.1 What “OSS Obsidian” means for Igne
Igne must behave like Obsidian for:
- Vault format and `.obsidian/*` settings files (read/write safely, preserve unknown fields).
- Internal link semantics, embeds, attachments, and resource paths.
- Plugin developer-facing API (the public Obsidian API surface), at least for the pinned baseline.

### 0.2 Non-negotiable constraints
- **Pinned baseline:** Implement Obsidian API as of **`obsidian` npm `1.11.4`**.  
  - Plugins requiring `minAppVersion > 1.11.4` are **not supported** (hard block for that plugin build).
  - If installing from a repository, Obsidian supports **`versions.json`** fallbacks; Igne should mirror that behavior to select the newest *compatible* plugin release when available.
- **Vault portability:** All stored references must use **vault-absolute paths** (Obsidian’s term: vault-relative paths rooted at `/`), never OS absolute paths.
- **Safety:** Igne is OSS, so it must assume hostile inputs:
  - malicious vault contents (e.g., crafted markdown),
  - malicious themes/snippets (CSS),
  - malicious plugins (JS),
  - malicious prompts/actions via AI agents.

### 0.3 What “AI-first” means (without compromising parity)
AI should be a first-class *workflow* layer, not a fork of the app:
- AI uses the same command/tool surface as humans (commands, file ops, navigation).
- AI actions are observable, permissioned, and reversible (audit log + diff).
- AI is optional at runtime (app must function fully without AI).

## 1) Glossary (use these terms consistently)

- **Vault absolute path (Obsidian term):** A vault-relative path like `Folder/Note.md` or `.obsidian/app.json`.  
  - Not an OS path.
- **OS absolute path:** Full filesystem path (e.g. `/Users/.../Vault/Note.md`).  
  - Must be a boundary concern (Tauri/backend), not stored in `.obsidian/*` nor internal state.
- **Compat baseline:** The exact `obsidian.d.ts` snapshot + its implied behaviors.
- **Tool:** A programmatic capability callable by UI/commands/plugins/agents (e.g., `createFile`, `renameFile`, `openFile`).
- **Command:** A user-facing action (hotkey/palette/menu) backed by one or more tools.

## 2) Current State (Known Incompatibilities / Risks)

These are not “maybe” issues; they are concrete blockers for Obsidian parity:

### 2.1 Vault traversal is not Obsidian-grade (deep trees break)
- Backend `read_directory` returns a recursive tree but uses a fixed max depth (currently `3`), which breaks deeper vault structures and many real-world layouts.

### 2.2 Binary I/O exists, but embed semantics are still incomplete
- Binary read/write commands exist and image paste/drop uses binary writes.
- However, Obsidian embed semantics go beyond images (PDF/audio/video, heading/block transclusion, parameters like `#page=`), and these are not yet implemented.

### 2.3 Path model is not Obsidian’s
- Some persisted/workspace references use OS absolute paths.  
- Obsidian API and configs use vault-absolute paths.

### 2.4 The Obsidian API layer is internally inconsistent
- `DataAdapter` calls backend commands that don’t exist.
- `Vault` constructs plain objects but uses `instanceof` checks (will not work reliably).
- `PluginManifest` typing differs from upstream (optional vs required fields).

### 2.5 Plugin runtime is not realistically compatible yet
- Dynamic `import()` from `.obsidian/plugins/*/main.js` is not enough for real community plugins.
- There is no capability gating, trust model, or stable module resolution for `obsidian`.

## 3) Architecture Direction (Best Design)

### 3.1 One Core, many front-ends
Igne should have a single internal “core” API that everything uses:
- React UI
- Hotkeys + command palette
- Plugin system
- AI agent orchestration
- External automation (optional MCP server)

**Rule:** If the UI can do it, it must be expressible as a tool/command. If a plugin can do it, it must be expressible as a tool/command. If an AI can do it, it must be expressible as a tool/command.

### 3.2 Strict boundary: OS paths only in backend
All frontend/core APIs operate on vault-absolute paths and abstract file IDs.
- The backend translates vault paths ⇄ OS paths.
- Persistence stores vault paths (plus stable IDs if needed).

### 3.3 Compatibility as a contract (pinned baseline)
Create a dedicated compatibility package:
- Vendored `obsidian.d.ts` and metadata (version, commit SHA).
- Adapter layer that implements those APIs using Igne core tools.

### 3.4 Security posture: “Trust but verify”
Obsidian itself trusts plugins; OSS Igne can’t blindly do that.
Adopt a **trust model**:
- By default, plugins are **disabled** unless explicitly enabled by the user per vault.
- Plugins run with restricted access unless granted (filesystem write, network, shell, etc.).
- Maintain an audit trail for plugin and AI actions.

## 4) Phased Execution Plan (Detailed Tasks Included)

This plan is written so another agent can execute it step-by-step with clear “done” criteria.

---

## Phase A — Lock the Baseline (Compatibility Contract)

### A1) Vendor the baseline API snapshot
**Tasks**
- A1.1 Add `compat/obsidian-api/obsidian.d.ts` (vendored snapshot).
- A1.2 Add `compat/obsidian-api/metadata.json` with:
  - `obsidianNpmVersion: "1.11.4"`
  - `upstreamCommitSha` (commit touching `obsidian.d.ts`)
  - `upstreamBlobSha` (file blob SHA)
  - `pinnedAtUtc`
- A1.3 Add `docs/compat/COMPAT_POLICY.md` describing:
  - we implement `1.11.4` only,
  - we do not support plugins requiring higher `minAppVersion`,
  - what “supported” means (API surface vs behavioral parity).

**Acceptance**
- The baseline version/commit is visible in repo.
- Agents can point to the exact contract being implemented.

### A2) Build a “compat gate” utility
**Tasks**
- A2.1 Implement a semver compare utility (no dependencies if possible).
- A2.2 Wire it into plugin loading:
  - block plugins whose `manifest.minAppVersion` is greater than `obsidianCompatVersion`.
- A2.3 Add user-facing error/reporting for blocked plugins.

**Acceptance**
- A plugin manifest with `minAppVersion: "1.11.5"` is reliably blocked.
- A plugin with `minAppVersion: "1.11.4"` passes the gate (still may fail for other reasons).

### A3) Mirror Obsidian’s `versions.json` fallback behavior (for installs/updates)
Obsidian’s official flow: if the installed app version is lower than `manifest.minAppVersion`, it consults `versions.json` in the plugin repository to find the newest compatible plugin release.

**Tasks**
- A3.1 When installing or updating a community plugin from a repo:
  - if the latest release requires `minAppVersion > 1.11.4`, fetch `versions.json` and select the newest plugin version whose mapped `minAppVersion <= 1.11.4`.
- A3.2 Add UI messaging showing:
  - why latest is blocked,
  - which fallback version was selected (or why none exists).
- A3.3 Cache `versions.json` and selected version per plugin (avoid repeated network calls).

**Acceptance**
- Given a plugin with latest `minAppVersion > 1.11.4` but a compatible entry in `versions.json`, Igne installs/updates to that compatible version.
- If `versions.json` is missing, Igne clearly reports “no compatible release found for pinned baseline”.

---

## Phase B — Filesystem + Path Semantics (Obsidian-Grade Vault Support)

### B1) Fix directory listing and metadata
**Tasks**
- B1.1 Replace markdown-only listing with:
  - either a new command: `read_directory_entries(path, options)`
  - or modify existing `read_directory` to include all files and the `.obsidian` directory.
- B1.2 Add file metadata command:
  - `stat_path(path)` returning `{ exists, isDir, size, mtime, ctime }`.
- B1.3 Ensure “exists” checks use metadata, not `read_file`.

**Acceptance**
- Theme/snippet folders can be enumerated and `.css` files are visible.
- Attachments (e.g., `.png`) are visible to the app.
- No code path uses “try read_file to test directory existence”.

### B2) Implement binary read/write
**Tasks**
- B2.1 Add backend commands:
  - `read_file_binary(path) -> Vec<u8>` (base64 or raw bytes depending on Tauri IPC)
  - `write_file_binary(path, bytes)`
- B2.2 Update image paste/drop to use binary writes.
- B2.3 Update markdown rendering to correctly resolve and display images.

**Acceptance**
- Pasting an image creates a real file on disk and it renders in editor/preview.
- No corruption (file size matches original).

### B3) Canonicalize paths to vault-absolute everywhere
**Tasks**
- B3.1 Define canonical path helpers:
  - `toVaultPath(osPath, vaultRoot) -> vaultPath`
  - `toOsPath(vaultPath, vaultRoot) -> osPath`
  - normalization rules (slashes, no `..`, case behavior policy).
- B3.2 Migrate persisted workspace/state:
  - saved open tabs,
  - last opened file references,
  - backlinks/search index IDs.
- B3.3 Update file watcher/search index to operate on vault paths.

**Acceptance**
- `.obsidian/workspace.json` contains only vault paths.
- Opening the same vault on another machine path still restores tabs correctly.

---

## Phase C — `.obsidian/*` File Format Compatibility (Safe Read/Write)

### C1) Establish a settings IO policy
**Tasks**
- C1.1 “Preserve unknown keys”: when updating settings JSON, merge changes without deleting unknown fields.
- C1.2 Add migrations:
  - e.g., `appearance.json` fields (`theme` vs `baseTheme`) should be corrected safely.
- C1.3 Document supported files:
  - `app.json`, `appearance.json`, `workspace.json`, `community-plugins.json`, `hotkeys.json`.

**Acceptance**
- Igne can open an Obsidian vault and not clobber settings.
- Upgrading Igne doesn’t delete unknown Obsidian fields.

---

## Phase D — Core Tool/Command Surface (Unify UI, Plugins, and AI)

### D1) Introduce a command registry and tool layer
**Tasks**
- D1.1 Define “tools” (pure capability functions) such as:
  - vault: `createFile`, `readFile`, `writeFile`, `renamePath`, `deletePath`, `listDir`, `statPath`
  - workspace: `openFile`, `closeFile`, `setActiveFile`, `openInNewPane`, `togglePanel`
  - search: `query`, `reindex`, `findBacklinks`
- D1.2 Define “commands” as user-facing entries:
  - “Create new note”, “Open quick switcher”, “Toggle graph”, etc.
- D1.3 Route UI hotkeys and menus through commands (not ad-hoc handlers).

**Acceptance**
- A single command can be triggered by:
  - UI click,
  - hotkey,
  - plugin call,
  - agent tool call.

### D2) Instrumentation and audit log (critical for AI and plugins)
**Tasks**
- D2.1 Add a central event log:
  - command invoked,
  - tool called,
  - file changes (with diff where possible),
  - plugin/agent identity.
- D2.2 Store logs in app data (not inside vault by default), with optional vault-local log.

**Acceptance**
- Any write/delete/rename is traceable with source (UI vs plugin vs agent).

---

## Phase E — Obsidian API Layer (Pinned 1.11.4) Implemented on Top of Core

### E1) Align types and fix internal correctness
**Tasks**
- E1.1 Make `PluginManifest` match upstream optional fields and semantics.
- E1.2 Fix `Vault`:
  - ensure `TFile/TFolder` instances are real and `instanceof` checks work,
  - implement required methods for the pinned subset (text + binary + resource path).
- E1.3 Fix `DataAdapter` to match actual backend commands and return shapes.

**Acceptance**
- Core Obsidian API unit tests pass for Vault + MetadataCache + Workspace basic flows.

### E2) Fill key API gaps needed by popular plugins
**Tasks**
- E2.1 Implement `Vault.getResourcePath` behavior for images/attachments.
- E2.2 Implement enough `Workspace` leaf management to support multi-pane basics.
- E2.3 Implement `FileManager` behaviors (rename with link updates; trash semantics if supported).

**Acceptance**
- A curated set of “simple” plugins (no Node/Electron) can run end-to-end.

---

## Phase F — Plugin System (Realistic Compatibility, Safe Defaults)

### F1) Define plugin compatibility tiers (explicit)
**Tasks**
- F1.1 Document tiers:
  - Tier 0: runs with browser-only APIs + Obsidian public API
  - Tier 1: needs limited extra capabilities (network, clipboard, notifications)
  - Tier 2: expects Node/Electron APIs (not supported under pinned design)
- F1.2 Add UI showing why a plugin is blocked (tier/minAppVersion/capability missing).

**Acceptance**
- Users understand “why not” instead of silent failures.

### F2) Plugin runtime and module resolution
**Tasks**
- F2.1 Provide the `obsidian` module to plugins (host-injected).
- F2.2 Support common plugin bundling formats:
  - ESM default export,
  - CommonJS `module.exports`.
- F2.3 Load `styles.css` if present and scope appropriately.

**Acceptance**
- Example plugin can be dropped into `.obsidian/plugins/<id>/` and enabled without rebuilding Igne.

### F3) Permissions / trust model (must ship before enabling arbitrary plugins)
**Tasks**
- F3.1 Add per-plugin permissions stored in `.obsidian/igne-plugin-permissions.json` (Igne-only file).
- F3.2 Prompt on first use (e.g., network access).
- F3.3 Add “disable all third-party plugins” safe mode.

**Acceptance**
- A malicious plugin cannot silently exfiltrate data if network permission is denied.

---

## Phase G — Obsidian UX Parity (Workspace + Panels + Performance)

### G1) Workspace parity
**Tasks**
- G1.1 Implement true splits (layout state, multiple panes) and persistence in `workspace.json`.
- G1.2 Ensure open file behavior matches Obsidian: new tab vs reuse, pinned behavior, history.

**Acceptance**
- Users can create, close, and restore multi-pane layouts consistently.

### G2) Performance + file watching
**Tasks**
- G2.1 Replace polling with filesystem watch (or hybrid) so nested changes trigger reindex.
- G2.2 Incremental search indexing (update only changed files).

**Acceptance**
- Adding/removing a file in a nested folder updates search and file tree without manual reload.

---

## Phase H — AI-First Layer (Claude-Code-like Planning + Multi-Agent)

### H1) Agent tool API (built on the same tool layer as commands/plugins)
**Tasks**
- H1.1 Define an internal tool schema:
  - read note, write note, create note, rename, search, list files, open note, etc.
- H1.2 Add “plan → approvals → execution” loop:
  - agent proposes steps (plan)
  - user approves step-by-step or batch
  - each tool call is logged and diffed

**Acceptance**
- AI can safely automate vault refactors without hidden side effects.

### H2) In-app agent UI
**Tasks**
- H2.1 Add an Agent panel:
  - conversation,
  - plan checklist,
  - tool execution log,
  - diff viewer for edits.
- H2.2 Add “scoped context” controls:
  - select folders/notes,
  - attach open note,
  - limit to read-only mode.

**Acceptance**
- Users can understand and control what AI is about to do.

### H3) External agent integration (optional): MCP server
**Tasks**
- H3.1 Expose the same tool surface via a local automation protocol (MCP).
- H3.2 Require explicit user enablement and show active sessions.

**Acceptance**
- External tools (like coding agents) can drive Igne’s vault and UI safely.

---

## 5) Definition of Done (Project-Level)

Igne is “OSS Obsidian (Pinned) + AI-first” when:
- Vaults remain portable and compatible with Obsidian’s file formats.
- Attachments, themes, and snippets work with correct filesystem support.
- The pinned Obsidian API baseline (`1.11.4`) is implemented with tests.
- Plugins are gated by `minAppVersion` and run under an explicit trust/permission model.
- AI automation uses the same tool/command layer with approvals and audit logs.

## 6) Execution Notes for Agents

- Do not “fix” by hacking UI state; build tools and route UI through them.
- Treat every file write as an auditable event.
- Preserve unknown fields in `.obsidian/*.json` files.
- Prefer adding missing backend commands over frontend workarounds.
