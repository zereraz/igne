# Obsidian setup patterns (what “normal” vaults look like)

This is a practical inventory of how people tend to set up Obsidian in the real world, with emphasis on programmer and AI-heavy vaults.

It’s meant to prevent “drop-in replacement” work from being driven only by theory: these are the setup defaults that features and plugins implicitly depend on.

## Vault structure conventions (common, not mandatory)

### Folders used as “buckets”, not as strict taxonomy
A recurring pattern is:
- shallow high-level buckets (work/personal, projects/areas/resources),
- special-purpose folders for high-churn content:
  - daily notes,
  - templates,
  - attachments.

Programmers often avoid deep folder trees and rely on links, tags, and index/MOC notes once a vault grows.

### Attachments are first-class
Even text-focused users quickly accumulate:
- screenshots,
- PDFs,
- audio/video snippets,
- diagrams/whiteboards (often via plugins like Excalidraw).

This makes “treat the vault as arbitrary files” a hard requirement, not an edge case.

## Configuration folder patterns (`.obsidian` and overrides)

### The config folder is part of the vault contract
Obsidian stores vault-specific settings under a config folder, defaulting to `.obsidian/`.

Users often sync the vault directory (including `.obsidian/`) between machines, so:
- the config folder contents must be preserved exactly,
- unknown files/keys must not be destroyed by a replacement app.

### Profiles in one vault (Override config folder)
Obsidian supports changing the config folder name (“Override config folder”):
- often used to test profiles,
- sometimes used to keep multiple setups in the same vault.

Drop-in implication: a replacement must not hardcode `.obsidian/` as the only config folder name.

## Mainstream plugin sets (what many vaults implicitly expect)

From download-ranked community plugins, a typical “power user” setup often includes:
- querying/dashboards: Dataview
- capture/automation: Templater, QuickAdd
- tasks/time: Tasks, Calendar, Periodic Notes, Day Planner
- backup/sync: Obsidian Git (desktop), Remotely Save
- UI customization: Style Settings, Iconize, Minimal theme settings
- editor ergonomics: Advanced Tables, Outliner, Linter
- visual thinking: Excalidraw, Kanban

Drop-in implication: if the app can’t run community plugins with high fidelity, it must re-implement the above categories natively (high cost). A plugin runtime story is usually cheaper than rebuilding the ecosystem.

## Automation entrypoints people rely on

### Command palette + hotkeys are “the API surface”
Users build habits around:
- command IDs (plugins add commands),
- hotkeys (often exported/imported via config files),
- command-driven workflows (capture, navigation, refactors).

### External automation (URIs, REST, MCP)
Programmers and AI users frequently drive Obsidian from outside the app:
- Obsidian URI scheme for open/create/search flows,
- local REST APIs or MCP bridges so external agents can read/write notes and run commands.

Drop-in implication: the replacement needs a stable, auditable command/tool surface, and it should expose it externally (MCP is a good default if “Claude Code-like” is a goal).

## AI setup patterns (high-adoption behaviors)

Common AI configurations in Obsidian today:
- provider abstraction (OpenAI-compatible endpoints, Anthropic, Gemini, OpenRouter, local Ollama),
- vault-aware chat (RAG) with links back to source notes,
- “apply edits back into notes” as a first-class interaction,
- semantic related-note surfacing while writing (embeddings + context panels).

Drop-in implication: AI-first requires an indexing layer that supports both:
- incremental full-text search, and
- optional embeddings (with explicit privacy/scoping controls).

## Source links (starting points)

- Help — Configuration folder / overrides: https://help.obsidian.md/Files+and+folders/Configuration+folder
- Help — Properties (frontmatter): https://help.obsidian.md/Editing+and+formatting/Properties
- Help — Embeds (images/audio/PDF page/height): https://help.obsidian.md/Linking+notes+and+files/Embed+files
- Help — Obsidian URI (automation): https://help.obsidian.md/Extending+Obsidian/Obsidian+URI
- Forum — Programmer workflows: https://forum.obsidian.md/t/pkm-for-programmers-software-engineers-etc/56002
- Plugin adoption snapshot: `research-oss/obsidian-research/TOP_PLUGINS_BY_DOWNLOADS.md`
- AI adoption snapshot: `research-oss/obsidian-research/TOP_AI_PLUGINS_BY_DOWNLOADS.md`
