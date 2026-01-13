# Current Setup & Direction (Igne)

This document records what we learned about the repo *as it exists today*, why the current direction was chosen, and what to do next. It’s written so another coding agent can continue work without re-discovering the same constraints.

## What Igne is trying to be

- **Obsidian drop‑in (OSS)**: open real Obsidian vaults safely, preserve user data, and match core behaviors.
- **AI-first**: planning + tool execution (Claude Code-like) should be a first-class workflow, not bolted on.
- **Maintainable**: compatibility work must not turn the repo into an un-auditable pile of ad-hoc glue.

## The repo’s current “three contracts”

Treat these as separate workstreams with separate tests:

1. **Vault contract** (must not break real vaults)
   - vault is arbitrary files + folders
   - `.obsidian` (or overridden config folder) is user data
   - links/embeds should resolve like Obsidian
2. **API contract** (what plugins import as `obsidian`)
   - vendored `obsidian.d.ts` + metadata defines the declared surface
3. **Runtime contract** (actually executing community plugins)
   - module resolution + environment + permissions/capabilities

Reality today: we’re strongest on (1), partial on (2), and not yet viable on (3).

## What’s already good (foundations worth keeping)

### 1) Upstream contract + “official sources” tooling

- Vendored Obsidian API contract:
  - `compat/obsidian-api/obsidian.d.ts`
  - `compat/obsidian-api/metadata.json`
- Tooling scripts (TypeScript):
  - `scripts/obsidian/update-contract.ts` (pulls npm `obsidian`, updates contract + declared version)
  - `scripts/obsidian/preview-contract-update.ts` (diffs contract updates)
  - `scripts/obsidian/update-community-data.ts` + `generate-plugin-rankings.ts`
- Docs:
  - `docs/OBSIDIAN_OFFICIAL_SOURCES_TOOLING.md`
  - `docs/compat/COMPAT_POLICY.md`

**Guarantee:** `npm run check:compat` verifies (a) contract hashes, (b) invariants, and also that `src/utils/semver.ts` matches `compat/obsidian-api/metadata.json`.

### 2) Guardrails to prevent “compat noise”

- `scripts/obsidian/check-invariants.ts` catches recurring failure modes:
  - frontend invokes a backend command that doesn’t exist
  - relative `.obsidian/...` paths passed to backend
  - forbidden `process.platform` usage in frontend
  - hardcoded recursion depth for vault traversal

### 3) Research is stored in-repo (agents depend on it)

- `research-oss/obsidian-research/` contains:
  - official ecosystem snapshots (community plugin/theme lists)
  - workflow clustering + requirements
  - sources index

This is meant to keep prioritization grounded in real usage.

### 4) A “plan → approve → execute” agent executor exists

- `src/agent/executor.ts` supports:
  - plans with step approval states
  - tool execution mapping
  - event stream
  - diffs for write operations (basic)

It’s a foundation for in-app “Claude Code-like” workflows, but it still needs to be wired into the app’s real tool surface.

## What’s risky / the main architectural problem

### “Two cores” (duplicate sources of truth)

There is:
- **Core A (shipped UI core)**: React UI uses Tauri `invoke(...)` directly for file ops, tabs, etc.
- **Core B (Obsidian API shim)**: `src/obsidian/*` models Vault/Workspace/Plugins/etc.

This causes:
- inconsistent path semantics (OS paths vs vault paths vs config-relative paths),
- duplicated logic and mismatched behavior claims,
- plugin API “implemented” but not actually used by the UI, so it drifts.

See: `docs/ARCHITECTURE_FLOWS.md`.

## Current direction (how we keep “support everything” feasible)

### 1) One tool/command surface

Define a single internal tool layer:
- vault fs tools (read/write/list/stat/rename/delete, text + binary)
- workspace/navigation tools
- search/index tools

Everything (React UI, Obsidian adapter, plugins, agents) calls these tools.

### 2) Obsidian compatibility is an adapter over the tools

`src/obsidian/*` should be treated as:
- translation layer from Obsidian APIs → core tools
- no “business logic” living inside the adapter if it can live in tools

### 3) Plugin runtime is a separate subsystem with permissions

Community plugins are arbitrary code execution.
Obsidian itself acknowledges it can’t reliably sandbox plugin permissions; Igne should aim to *beat* that baseline:
- explicit per-plugin permissions/capabilities (read-only vs write, network, etc)
- restricted mode defaults
- audit log for plugin/agent actions

## Next execution priorities (high leverage)

These unblock both “drop‑in” and “AI-first” without sinking the repo in compat glue:

1. **Scale vault traversal** (lazy directory listing; avoid eager full recursion).
2. **Config folder override support** (Obsidian “Override config folder”).
3. **Embed/transclusion parity** (heading/block embeds, PDF page/height, audio/video, sizing params).
4. **Link resolution rules** (paths, duplicates, anchors) + incremental indexing.
5. **Unify command registry** (exactly one registry used by UI/plugins/agents).
6. **Wire agent executor to real tools** (so AI can safely act like a user).

Details and acceptance checks:
- `docs/OBSIDIAN_COMPATIBILITY_AI_FIRST_ROADMAP.md`
- `docs/OBSIDIAN_DROP_IN_GAP_REPORT.md`
- `docs/OBSIDIAN_SUPPORT_MATRIX.md`

## Automation + loop workflow (how the repo is set up today)

### Git worktrees for parallel agent work

- `docs/WORKTREE_WORKFLOW.md` documents the pattern and scripts.
- Scripts:
  - `scripts/create-worktree.sh`
  - `scripts/run-loop.sh`
  - `scripts/run-parallel-loops.sh`
  - `scripts/merge-worktree.sh`

### Loop task file contract

`scripts/loop.sh` reads `work/task.txt` as its prompt input.

- To stop: create `work/stop` (the script removes it and exits).
- To finish: add `<promise>COMPLETE</promise>` in `work/task.txt`.

If the loop exits immediately with “task file already marked as complete”, it detected that marker (or `ALL_TASKS_COMPLETE`) in the task file.

## Verification commands (expected to remain green)

- `npm run check:compat`
- `npm run test:run`
- `cd src-tauri && cargo check`
- `npm run obsidian:update-research`
