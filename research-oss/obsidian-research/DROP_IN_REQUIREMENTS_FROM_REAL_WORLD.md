# Drop-in Requirements (derived from real-world Obsidian usage)

This document translates observed Obsidian usage (programmers + AI + automation) into concrete “drop-in replacement” requirements for Igne.

It complements:
- `research-oss/obsidian-research/WORKFLOW_CLUSTERS_AND_REQUIREMENTS.md` (signals from top plugin adoption)
- `docs/OBSIDIAN_COMPATIBILITY_AI_FIRST_ROADMAP.md` (implementation sequencing)

## What “drop-in replacement” means (practically)

For a user with an existing Obsidian vault, “drop-in” means:
- Igne can open the vault folder directly (no migration).
- Igne preserves the vault as the source of truth (no destructive rewriting).
- Igne reads and respects `.obsidian/` configuration and common vault conventions.
- Common workflows (links, embeds, daily notes, commands, plugins) behave close enough that users don’t feel forced back to Obsidian.

## Compatibility baseline and update strategy

Igne’s compatibility must be pinned to a specific Obsidian baseline (API + behavioral contract). After pinning:
- Igne is **not** required to keep up with future Obsidian changes (by design).
- Igne’s plugin installer should still handle newer plugin releases by using Obsidian’s `versions.json` fallback strategy to select the newest compatible plugin version when possible.

(See `research-oss/obsidian-research/OBSIDIAN_VERSIONING_AND_PLUGIN_COMPAT.md`.)

## P0 (“must not break real vaults”)

### P0.1 Preserve the vault as data (file semantics are the contract)
Requirements:
- Treat the vault as an arbitrary directory tree; never assume “only markdown matters”.
- Don’t drop or hide non-`.md` files when listing folders (attachments, snippets, plugin assets, `.canvas`, `.base`, PDFs, etc).
- Apply rename semantics that update links automatically (users rely on this heavily).
- Match deletion behavior options: system trash vs vault `.trash` vs permanent delete.

Signals:
- Obsidian Help: vaults are plain files; external changes must be reflected; rename updates links; deletion options exist.
- Programmer workflows: attachments and embeds are normal, and Git sync depends on not clobbering unknown files.

### P0.2 Support Obsidian’s accepted file formats + embed semantics
Requirements:
- First-class support for Obsidian’s accepted file formats in both filesystem and UI:
  - `.md`, `.canvas`, `.base`, images, audio, video, `.pdf`.
- Embed/transclusion parity:
  - `![[note]]`, `![[note#Heading]]`, `![[note#^block]]`
  - image sizing (`|100`, `|100x145`)
  - PDFs with `#page=` and `#height=`
- Robust binary I/O: paste/drop images, write attachments, read attachments for previews.

Signals:
- Obsidian Help: “Accepted file formats”, “Embed files”, “Canvas”.

### P0.3 `.obsidian/` configuration compatibility
Requirements:
- Treat `.obsidian/` as a compatibility contract:
  - Read per-vault settings from `.obsidian/`.
  - Support non-default config folder names (Obsidian “Override config folder”).
  - Preserve plugin folders and data files under `.obsidian/plugins/<id>/`.
- Be explicit about which `.obsidian` files Igne ignores or doesn’t understand, but never delete them.

Signals:
- Obsidian Help: “How Obsidian stores data”, “Configuration folder”.
- Hub guide: concrete file paths used by automation and third-party apps.

### P0.4 Core navigation: search, links, backlinks, and “context”
Requirements:
- Internal links (`[[wikilinks]]`) and backlinks are core UX; backlinks need usable context snippets.
- Search must scale to thousands of notes; incremental indexing is required (no constant full rescans).
- Metadata cache parity is foundational: headings, blocks, tags, frontmatter/properties, links.

Signals:
- Programmer thread `topic_id=56002` relies on backlinks + Dataview-style rollups for recall.
- AI workflows rely on vault indexing for RAG/semantic search.

### P0.5 Commands + hotkeys + stable IDs
Requirements:
- A first-class command system (palette + hotkeys) that plugins and automation can target.
- Stable command identifiers to support workflows and external automation tooling.

Signals:
- Obsidian Help: “Obsidian URI” and common command-driven workflows.
- Forum: Quick capture workflows depend on invoking commands via URIs and shortcuts.

### P0.6 A credible plugin runtime story (even if incomplete initially)
Requirements:
- If Igne claims Obsidian compatibility, community plugin compatibility is the cost center.
- At minimum, Igne must define a clear target:
  - either “compat layer that runs a subset of popular plugins”, or
  - “native re-implementation of ecosystem features”.
- “Restricted mode” (safe mode) and an explicit trust boundary should exist from day one.

Signals:
- Obsidian Help: plugins can’t be reliably permission-sandboxed; restricted mode exists.
- MCP Tools + Local REST API + AI plugins show that plugins increasingly ship *servers/binaries* and need careful trust handling.

## P1 (“mainstream workflows people expect”)

### P1.1 Daily notes + templates + capture flows
Requirements:
- Daily note creation/opening based on date; configurable folder + date format; templating.
- Template engine compatibility sufficient for common patterns (core Templates + Templater-like capabilities if possible).
- Support for “append under heading” capture workflows (QuickAdd-style).

Signals:
- Obsidian Help: “Daily notes”.
- Forum `topic_id=74664`: QuickAdd capture appends under heading and is triggered externally.

### P1.2 Automation entrypoints (URI + local API)
Requirements:
- Implement Obsidian URI scheme actions (`open`, `new`, `daily`, `search`) with correct encoding semantics.
- Provide a secure, local automation API (REST and/or MCP) so external tools can:
  - open notes, create notes, append content, run commands.
- Include binary access for agent workflows (at least base64 download of referenced images) if AI/agents are first-class.

Signals:
- Obsidian Help: “Obsidian URI”.
- Local REST API plugin: automation primitives (read/create/update/delete/append/commands).
- Forum `topic_id=109122`: explicit need for image/binary access for Claude-like integrations.

### P1.3 Git and “my vault is mine” ergonomics
Requirements:
- Never fight Git users: avoid noisy background rewrites, preserve timestamps when possible, and allow users to ignore churny workspace layout files.
- Acknowledge that many users use Git (or other sync) and have expectations around diffs and conflicts.

Signals:
- Obsidian Help: suggests `.gitignore` for workspace layout files.
- `Vinzent03/obsidian-git` plugin adoption and feature set.

## P2 (“ecosystem-complete”)

### P2.1 Canvas, whiteboards, and rich views
Requirements:
- `.canvas` editing and viewing (JSON Canvas) as a first-class view type.
- Plugin view embedding: complex UI plugins need panes, saved workspaces, and persistent state.

Signals:
- Obsidian Help: “Canvas”.
- Top plugin adoption: Excalidraw and canvas-related plugins dominate usage.

### P2.2 Attachment indexing (PDF text, OCR, etc)
Requirements:
- Optional indexing of PDFs and other attachments for search and AI context.
- Pluggable extraction pipeline (so community solutions can extend it).

Signals:
- Top plugin adoption: Omnisearch, text extractor, PDF workflows.
- AI workflows: RAG over PDFs is increasingly expected.

## “Claude Code-like” integration requirements (as a drop-in extension, not a fork)

Obsidian’s ecosystem shows two dominant patterns:
1) In-app AI plugins (Copilot/Smart Connections/etc) calling tools internally.
2) External AI apps controlling Obsidian via URIs/REST/MCP bridges.

If Igne wants a Claude Code-like experience *without* breaking drop-in parity:
- Build a single, auditable “tool surface” (file ops, search, workspace navigation, templates/commands).
- Expose it via:
  - internal agent runtime (in-app), and
  - an external protocol (MCP recommended, since Claude Desktop already speaks it).
- Include explicit permissioning (read-only vs write; vault allowlist; network gating) and action logs/undo.

Signals:
- MCP Tools plugin architecture (Obsidian plugin + local server; requires REST API + semantic search + templates).
- Obsidian Help: plugin security warns that plugins inherit app privileges.

## Source links (starting points)

- Help: https://help.obsidian.md/Files+and+folders/How+Obsidian+stores+data
- Help: https://help.obsidian.md/Files+and+folders/Configuration+folder
- Help: https://help.obsidian.md/Files+and+folders/Accepted+file+formats
- Help: https://help.obsidian.md/Linking+notes+and+files/Embed+files
- Help: https://help.obsidian.md/Plugins/Canvas
- Help: https://help.obsidian.md/Files+and+folders/Manage+notes
- Help: https://help.obsidian.md/Extending+Obsidian/Obsidian+URI
- Help: https://help.obsidian.md/Extending+Obsidian/Plugin+security
- Hub: https://publish.obsidian.md/hub/04%20-%20Guides%2C%20Workflows%2C%20%26%20Courses/Guides/Controlling%20Obsidian%20via%20a%20Third-party%20App
- Forum: https://forum.obsidian.md/t/workflow-for-developers/1474
- Forum: https://forum.obsidian.md/t/pkm-for-programmers-software-engineers-etc/56002
- Forum: https://forum.obsidian.md/t/quick-add-workflow-into-daily-notes-using-quickadd-advanced-uri-and-shortcuts-ios-and-macos/74664
- Forum: https://forum.obsidian.md/t/new-plugin-vault-ai-chat-with-rag-file-deletion-creation-ai-generated-content-ai-summarization/109415
- Forum: https://forum.obsidian.md/t/support-returning-binary-image-data-via-rest-api-for-integrated-agent-workflows/109122
- Plugin: https://github.com/Vinzent03/obsidian-git
- Plugin: https://github.com/coddingtonbear/obsidian-local-rest-api
- Plugin: https://github.com/jacksteamdev/obsidian-mcp-tools
