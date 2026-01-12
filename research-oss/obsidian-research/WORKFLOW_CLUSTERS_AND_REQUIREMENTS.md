# Workflow clusters → Drop-in requirements (derived from top plugins)

This is a requirements document: it translates observed Obsidian ecosystem demand (via top plugin adoption) into concrete “drop-in” capabilities Igne must support.

See also: `docs/OBSIDIAN_COMPATIBILITY_AI_FIRST_ROADMAP.md` (implementation plan).

## Cluster 1: Visual thinking (diagrams, whiteboards, canvas)

Signals:
- `obsidian-excalidraw-plugin` (very top by downloads)
- `advanced-canvas`, `link-exploder`, `obsidian-mind-map`, `drawio-obsidian`, `obsidian-markmind`

Drop-in requirements:
- Attachments + binary I/O (PNG/SVG/PDF/etc) with correct vault-relative links.
- View types beyond markdown (canvas/whiteboard), including embeddable views.
- Robust embed semantics (`![[file]]`, `![[file#heading]]`, transclusions).
- Plugin runtime compatibility for heavy UI plugins (CodeMirror extensions + custom views).

## Cluster 2: Structured knowledge + dashboards (queries over vault metadata)

Signals:
- `dataview`, `datacore`, `tracker`, `metadata-menu`, `obsidian-meta-bind-plugin`

Drop-in requirements:
- Accurate MetadataCache parity (frontmatter, inline fields, links, headings, blocks).
- Stable file IDs + incremental indexing (avoid full rescans on every change).
- Query execution engine + rendering primitives (tables, lists, inline fields).
- Performance envelope for “large vault” dashboards.

## Cluster 3: Automation + templates (capture, macros, scripted workflows)

Signals:
- `templater-obsidian`, `quickadd`, `cmdr`, `editing-toolbar`, `obsidian-advanced-uri`, `obsidian-local-rest-api`

Drop-in requirements:
- A first-class “command/tool” surface (commands + hotkeys + palette).
- A scriptable runtime for plugins (sandboxed JS + controlled capabilities).
- URI / external automation entrypoints (open note, run command, create note).
- Deterministic file/path semantics matching Obsidian (vault paths, not OS paths).

## Cluster 4: Tasks + time (task extraction, calendars, boards)

Signals:
- `obsidian-tasks-plugin`, `calendar`, `obsidian-kanban`, `periodic-notes`, `obsidian-day-planner`, `obsidian-reminder-plugin`

Drop-in requirements:
- Fast global task extraction (across vault) + metadata (due/recurrence/completion).
- Calendar views and daily note workflows (date-based navigation, templates).
- Markdown-backed board formats (Kanban) and stable rendering.
- Plugin UI embedding and persistence (workspaces, saved views).

## Cluster 5: Sync/backup + “my vault is my data”

Signals:
- `obsidian-git`, `remotely-save`, `obsidian-livesync`

Drop-in requirements:
- Non-destructive filesystem behavior (preserve unknown files, avoid clobbering).
- Reliable change detection (watchers + debounced indexing + conflict awareness).
- If supporting these plugins: allow controlled network + filesystem access.

## Cluster 6: Search & retrieval (including PDFs/OCR)

Signals:
- `omnisearch`, `text-extractor`, `various-complements`

Drop-in requirements:
- Full-text search with operators, incremental updates, and ranking.
- Attachment indexing story (PDF text extraction and optional OCR).
- Pluggable search providers so community solutions can work.

## Cluster 7: Publishing/export + presentations

Signals:
- `obsidian-pandoc`, `obsidian-advanced-slides`, `obsidian-enhancing-export`, `better-export-pdf`

Drop-in requirements:
- Export pipeline (HTML/PDF) and/or plugin ability to run converters.
- If using external binaries (pandoc): a permission + packaging story.

## Cluster 8: Research workflows (PDFs, citations, highlights)

Signals:
- `obsidian-annotator`, `pdf-plus`, `obsidian-zotero-desktop-connector`, `obsidian-citation-plugin`, `readwise-official`

Drop-in requirements:
- Attachment support as first-class (PDF viewer, annotation storage formats).
- Integrations need safe local APIs + permissions (Zotero DB, browser bridges).

## Cluster 9: Editor ergonomics (tables, outliner, lint, toolbars)

Signals:
- `table-editor-obsidian`, `obsidian-outliner`, `obsidian-linter`, `editing-toolbar`, `obsidian-quiet-outline`, `typewriter-mode`

Drop-in requirements:
- CodeMirror extension injection from plugins (editor API fidelity).
- Settings UI primitives so plugins can expose configuration.
- Stable command + hotkey integration.

## Cluster 10: AI (chat, semantic search, agent actions)

Signals:
- `copilot`, `smart-connections`, `obsidian-textgenerator-plugin`, `mcp-tools`, `local-gpt`, `ollama-chat`

Drop-in requirements:
- A searchable “vault context” layer (full-text + embeddings) with clear privacy controls.
- An auditable tool surface for write actions (create/modify/rename) + undo.
- Capability gating (network, filesystem write, attachment read) for AI and plugins.

## Immediate Igne blockers (must-fix to even begin parity)

These are “foundational” blockers: without them, most of the above clusters cannot work.

- Directory listing currently excludes non-`.md` files (breaks snippets, attachments, plugin assets).
- Binary I/O is not implemented (image paste/drop cannot work reliably).
- `.obsidian` and vault path semantics need to be treated as a compatibility contract.
- The Obsidian API shim must match the pinned `obsidian.d.ts` baseline (types + behavior).
