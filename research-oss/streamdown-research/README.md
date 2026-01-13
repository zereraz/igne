# Streamdown Research (streaming-first UI for AI)

This folder captures research about **Streamdown** (Vercel) and how its “streaming-first Markdown rendering” ideas apply to Igne’s AI-first direction.

Why it matters:
- AI output is streamed token-by-token; normal Markdown renderers behave badly on partial syntax.
- Igne wants “Claude Code-like” agents inside the app; a good streaming UX is part of that.

## Key files

- `research-oss/streamdown-research/STREAMDOWN_SUMMARY.md` — what Streamdown does and the patterns worth copying
- `research-oss/streamdown-research/SOURCES.md` — source links

## How this connects to Igne

- Streamdown is most directly relevant for **AI conversation rendering** (Agent panel / chat / tool output).
- For a “stream-first editor” (AI + human coauthoring in the same note), Streamdown is inspiration for:
  - incremental rendering,
  - stable block boundaries,
  - safe handling of incomplete syntax.

But the editor problem also needs a **transaction/operation model** (CodeMirror transactions + diff/approval), which is separate from Markdown rendering.
