# Stream‑First Editor + AI Coauthoring (Design Notes + Task Plan)

Goal: make Igne feel “stream-first” in two ways:

1) **Stream-first rendering**: AI output (and tool output) looks good while it streams token-by-token.  
2) **Stream-first editing**: AI can work *alongside* a human in the editor without destructive surprises (diffs, approvals, undo, audit).

This document is Igne-specific, but it’s grounded in Streamdown research:
- `research-oss/streamdown-research/STREAMDOWN_SUMMARY.md`
- `research-oss/streamdown-research/SOURCES.md`

## What “stream-first” means in practice

### A) Streaming UI (easy win, immediate value)
- AI messages render progressively and correctly even when markdown is incomplete.
- The UI exposes “still streaming” vs “settled” state (caret, disabled actions, etc).

### B) Streaming edits (harder, higher leverage)
- AI proposes edits as an explicit stream of operations (insert/replace/delete), not “teleporting” a final file rewrite.
- The human can:
  - see what’s being changed as it streams,
  - accept/reject in hunks,
  - undo reliably.

## Key constraint: Obsidian drop‑in must remain plain files

Obsidian vaults are plain files. Igne can’t change that contract.

So any “stream log” / operation history should live in:
- app data (default), or
- an Igne-only file under the vault config root (optional), without breaking Obsidian.

## Part 1: Stream-first rendering (use Streamdown patterns)

### Why Streamdown is relevant

Streamdown solves a real problem we will hit immediately when we add in-app AI chat:
- partial markdown causes jarring formatting changes and broken layouts
- naive `react-markdown` re-rendering is expensive during streaming

Streamdown’s key patterns to reuse:
- preprocess incomplete markdown (`remend`)
- split into stable blocks for memoized rendering
- treat “streaming” as explicit state (`isAnimating`)
- harden/sanitize AI-generated content (`rehype-sanitize` + `rehype-harden`)

### Implementation plan (tasks)

**S1.1 Add a “StreamingMarkdown” component**
- Wrap Streamdown (or copy its minimal ideas) behind a local component so the rest of Igne doesn’t take a hard dependency on one renderer.

**Acceptance**
- Agent panel (or a demo page) can render a token-by-token message without layout glitches.

**S1.2 Wire streaming state into AI UI**
- Maintain per-message state:
  - `content` (string)
  - `isStreaming` (boolean)
  - `final` (boolean)
- Render with a caret while streaming, and disable copy/export actions.

**Acceptance**
- The last assistant message shows a caret while streaming and stops when done.

**S1.3 Harden AI markdown rendering**
- Default to safe rendering for AI messages:
  - sanitize HTML or disable raw HTML
  - restrict protocols (at minimum block `javascript:`)
  - optionally restrict external links/images

**Acceptance**
- AI output containing raw `<script>` or `javascript:` links is not executed and is visibly blocked/sanitized.

## Part 2: Stream-first editing (AI + human in one editor)

### Why this is the real “AI-first” unlock

Obsidian’s plugin ecosystem (and modern AI plugins) expects:
- streaming responses
- “apply edits into the note” actions
- precise, non-destructive edits (not full rewrites)

Igne also needs this for safe agents:
- apply changes through the same tool surface as humans
- show diffs + approvals
- support undo and audit

### Principle: AI edits must be explicit operations

Instead of “AI writes a whole new file”, represent AI output as:
- insert text at a position
- replace a range
- delete a range

This maps directly to CodeMirror transactions and Obsidian’s Editor-oriented guidance.

### Implementation plan (tasks)

**S2.1 Expose an editor-level tool API**
- Add core tools that operate on the *open buffer* (not just the file on disk), e.g.:
  - `editor.getSelection()`
  - `editor.replaceSelection(text)`
  - `editor.replaceRange(text, from, to)`
  - `editor.applyChanges([{from,to,text}, ...])`

**Acceptance**
- A tool call can update the active editor without losing cursor/selection/folds.

**S2.2 “Streaming suggestion overlay” (inline ghost text)**
- Implement a CM6 extension that can show a streaming suggestion as a decoration:
  - anchored to a position (mapped through user edits)
  - updated as tokens arrive
  - accept (`Tab`) / reject (`Esc`)

**Acceptance**
- While the user types, an AI suggestion can stream in without corrupting the document.
- Accept inserts the suggestion as a normal edit (undoable).

**S2.3 “Streaming patch” mode (multi-range edits)**
- For edits that touch many parts of a note:
  - collect AI output as a patch plan (structured edits)
  - show hunks in a diff UI
  - apply hunks via editor transactions when approved

**Acceptance**
- A multi-hunk change is visible before application and can be applied partially.

**S2.4 Audit + undo integration**
- Every accepted AI edit must be logged with:
  - actor (agent id)
  - affected file/buffer
  - before/after (or diff)
- Provide at least “undo last AI action” for a buffer.

**Acceptance**
- Users can revert AI actions even after they were applied.

### Concurrency rules (simple, practical)

Start with pragmatic rules; don’t over-engineer CRDT immediately:
- AI can only stream into:
  - an explicit “insertion point”, or
  - a locked selection/range the user chose.
- If the user edits inside the locked range, AI streaming pauses and asks to rebase.

This keeps UX predictable and avoids silent conflicts.

## Part 3: Multi-agent workflows (AI working “alongside” humans)

Once the stream-first editor primitives exist, we can run “Claude Code-like” multi-step plans safely:

**S3.1 Agent executor → tool surface wiring**
- `src/agent/executor.ts` should call the same editor/vault/workspace tools as the UI.

**S3.2 Multi-agent coordination**
- Multiple agents can propose plans, but only one agent can hold a write lock per file/buffer at a time.

**Acceptance**
- Two agents can operate without interleaving writes into the same note.

## How this fits the Obsidian drop-in roadmap

- Stream-first rendering is part of “AI-first layer” but should ship early (low risk).
- Stream-first editing is part of “one tool surface” + “Editor API parity” and helps both:
  - community plugin compatibility (Editor-first editing),
  - safe agent workflows (diffs, approvals, undo).

Primary tracking docs:
- `docs/OBSIDIAN_COMPATIBILITY_AI_FIRST_ROADMAP.md`
- `docs/OBSIDIAN_DROP_IN_GAP_REPORT.md`
