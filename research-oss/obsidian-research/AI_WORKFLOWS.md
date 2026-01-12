# AI Workflows in Obsidian (real-world signals)

This document summarizes how people actually use “AI inside Obsidian” today (and where the ecosystem is heading), based on high-adoption AI plugins, community discussions, and Obsidian’s security posture.

## The dominant AI use-cases

### 1) “Chat with my vault” (RAG + links)
Users want to ask questions like:
- “What do I know about X?” and receive an answer grounded in their notes, with links back to sources.
- “Summarize what I’ve written about Y across the vault.”
- “Find relevant notes even if I don’t remember exact keywords.”

Signals:
- Forum: “Ask questions of my vault using AI?” (`topic_id=74113`).
- Copilot plugin: “Vault QA” / chat-based vault search.
- Smart Connections: semantic related-notes surfaced while you work (embeddings).

### 2) “Semantic related notes” while writing (memory + resurfacing)
Common pattern:
- While editing a note, a sidebar/panel shows semantically related notes and blocks.
- Users drag links into the current note, reducing manual linking chores.

Signals:
- `brianpetro/obsidian-smart-connections` README (Connections view, local embeddings, drag links).

### 3) “AI writing tools that apply edits back into notes”
Typical actions:
- Continue writing, summarize, rewrite, extract action items, fix grammar.
- Template-driven prompts (reusable workflows).
- One-click “apply change” / “save response as note”.

Signals:
- `logancyang/obsidian-copilot` README (composer/quick commands/apply edits).
- `nhaouari/obsidian-textgenerator-plugin` README (templates, considered context, community templates).
- Forum: “New Plugin: Vault AI Chat…” (`topic_id=109415`) (generate note, save response, append).

### 4) “Agentic” workflows (tools + file operations)
This is the “Claude Code direction” appearing in Obsidian plugins:
- AI chat can create/delete files and folders, append text, list/read files.
- AI can run templates and automate repeatable workflows.
- Tool calls are exposed either as slash commands in chat or as an external automation surface (REST/MCP).

Signals:
- Forum: `topic_id=109415` (slash commands for file/folder ops).
- `jacksteamdev/obsidian-mcp-tools` README (Claude Desktop ↔ vault bridge via MCP; template execution; semantic search).
- `coddingtonbear/obsidian-local-rest-api` README (create/update/delete notes, list notes, execute commands).

### 5) Multimedia + “non-text vault context”
High-demand capabilities include:
- Images (paste/drag/drop; “describe this screenshot”).
- PDFs (summarize; pull context via RAG).
- Web / YouTube summarization and citation.

Signals:
- Copilot README (web/YouTube/images/PDF/EPUB support).
- Local GPT README (images + PDF context as RAG).
- Forum: request for REST API to return raw image data for “image-aware automation” (`topic_id=109122`).

## How AI users set it up (recurring patterns)

### Provider strategy: “Bring your own model”
Common configuration patterns:
- Multi-provider support (OpenAI-compatible endpoints, OpenRouter, Anthropic, Gemini, local Ollama).
- A settings UI for API keys + model selection + streaming.
- Optional local embedding models for semantic search, sometimes “just works” out of the box.

Signals:
- Copilot README (multiple providers).
- Smart Connections README (ships with local embedding model; offline by default).
- Local GPT README (Ollama embedding models; depends on “AI Providers” plugin).
- Forum: `topic_id=109415` (multiple providers + API keys + test connection).

### Context selection and scoping
Users need to control what the model sees:
- “Use selection / current note / linked notes / backlinks / folder / tag scope.”
- “Project mode” or “collection mode” that bundles context for a workspace.

Signals:
- Copilot README (context via `@` reference, “Project Mode”).
- Local GPT README (context from links/backlinks/PDFs).
- Forum: `topic_id=61853` (users compare plugins; desire whole-vault answers at 10k+ notes).

### Installation friction and “one-liner install”
A strong signal is that users want simple install paths for external-agent integrations (MCP/servers).

Signals:
- Forum: “Easy to install Anthropic MCP…” (`topic_id=99231`).
- MCP Tools README (installs a local server binary; configures Claude Desktop).

## Privacy + security is a first-class concern

### Obsidian’s stance: plugins inherit app privileges
Obsidian explicitly states it cannot reliably sandbox plugin permissions; community plugins can access files, connect to the internet, and install additional programs.

Signal:
- Obsidian Help: “Plugin security” (`permalink: plugin-security`).

### Practical consequence for AI plugins
AI workflows create a new risk surface:
- Vault data could be exfiltrated via network calls if the plugin is compromised or misconfigured.
- Local-first embeddings reduce risk but don’t eliminate it (especially if chat providers are remote).
- Users want scoping, toggles, and trust boundaries (“don’t scan my entire vault”).

Signal:
- Forum: `topic_id=61853` (privacy-friendly approach that doesn’t require scanning entire vault).

## Design implications for Igne (AI-first + drop-in)

If Igne wants to be “AI-first” *and* a credible Obsidian drop-in, it needs to support:
- A vault indexing layer suitable for both full-text search and embeddings (incremental, large-vault friendly).
- A safe tool surface for agent actions (file ops, search, templates/commands), with auditing + undo.
- A compatibility story for community AI plugins **or** a native AI layer that matches their ergonomics (context menus, command palette, “apply edits” flows).
- A stronger security model than Obsidian if possible (capability gating, network permissions, per-plugin/agent scopes), without breaking core drop-in expectations.

## Source links (starting points)

- Forum: https://forum.obsidian.md/t/ask-questions-of-my-vault-using-ai/74113
- Forum: https://forum.obsidian.md/t/the-combo-of-copilot-for-obsidian-obsidian-smart-connections-and-chatgpt-ai-is-amazing/61853
- Forum: https://forum.obsidian.md/t/new-plugin-vault-ai-chat-with-rag-file-deletion-creation-ai-generated-content-ai-summarization/109415
- Forum: https://forum.obsidian.md/t/support-returning-binary-image-data-via-rest-api-for-integrated-agent-workflows/109122
- Forum: https://forum.obsidian.md/t/easy-to-install-anthropic-mcp-for-obsidian-to-let-ai-use-your-obsidian-vault-to-have-more-context-about-you-your-notes-etc/99231
- Help: https://help.obsidian.md/Extending+Obsidian/Plugin+security
- Plugin: https://github.com/logancyang/obsidian-copilot
- Plugin: https://github.com/brianpetro/obsidian-smart-connections
- Plugin: https://github.com/nhaouari/obsidian-textgenerator-plugin
- Plugin: https://github.com/pfrankov/obsidian-local-gpt
- Plugin: https://github.com/jacksteamdev/obsidian-mcp-tools
- Plugin: https://github.com/coddingtonbear/obsidian-local-rest-api
