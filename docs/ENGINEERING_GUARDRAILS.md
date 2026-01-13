# Engineering Guardrails (so agents can move fast without wrecking maintainability)

Goal: make “Obsidian drop‑in replacement” *and* “Igne on top” coexist without the repo turning into an un-auditable pile of compat glue.

This is written for **coding agents** and humans: agents can vibe-code, but within a small set of invariants that senior engineers would enforce.

## The core idea

You don’t win by making Obsidian compatibility “small”. You win by making it **contained**:
- Igne has a stable, local-first **core** (vault FS, indexing, commands, workspace).
- Obsidian compatibility is an **adapter** over that core (API + behaviors).
- Plugin runtime is a **subsystem** with a strict boundary (capability gating + tooling surface), not “random code running everywhere”.

## Non-negotiable invariants (contracts)

**Enforcement**
- Run `npm run check:compat` before merging compat-related changes.
- Update the upstream API contract with `npm run obsidian:update-contract`.

### 1) Path semantics are typed and enforced
We must stop mixing:
- OS absolute paths (`/Users/.../Vault/Note.md`)
- vault paths (`/Folder/Note.md` or `Folder/Note.md`)
- config-relative paths (`.obsidian/...`)

**Rule**
- Any function that does I/O must accept **OS paths only** *or* **vault paths only**, never “either”.
- Conversions happen in one place, not ad-hoc string concat.

**Agent Do**
- When touching code that passes paths around, introduce explicit `toOsPath(...)` / `toVaultPath(...)` boundaries.

**Agent Don’t**
- Don’t add new `split('/')`/`join('/')` path hacks in feature code.

### 2) The app has exactly one “filesystem API”
Direct `invoke('read_file')` scattered across UI and compat code will become unmanageable.

**Rule**
- Centralize filesystem operations behind a single module (a “vault fs” tool layer).
- UI, Obsidian compat, plugins, and agents call the same tool functions.

**Agent Do**
- If you need a new FS behavior, add it to the tool layer and reuse it.

**Agent Don’t**
- Don’t add new direct `invoke(...)` calls from random components unless you’re explicitly working in the tool layer.

### 3) `.obsidian/*` IO must be safe and preserve unknown keys
Obsidian users expect settings files to survive edits by other tools (and vice versa).

**Rule**
- When writing JSON settings, **merge** and **preserve unknown keys**.
- Never write relative `.obsidian/...` paths; always resolve per vault.
- Support config folder override (Obsidian “Override config folder”) as a first-class concern.

### 4) Indexing and metadata are core infrastructure, not a feature
Search, backlinks, embeds, and AI all depend on indexing.

**Rule**
- One canonical index pipeline (incremental, event-driven).
- Features consume the index; they don’t build their own scanning logic.

### 5) Plugin runtime is isolated and capability-gated
Community plugins are effectively arbitrary code execution.

**Rule**
- Plugins do not get direct access to filesystem/network.
- They call capabilities via a narrow tool bridge (read/write file, run command, search, etc).
- Default: restricted mode; explicit enable per vault.

### 6) Obsidian compatibility is “adapter-only”
If compat code starts owning business logic, it will dominate the repo.

**Rule**
- “Real logic” lives in core tools.
- Obsidian compat layer translates Obsidian APIs → core tools.

### 7) Any compat change needs a contract test
Bun stayed sane by leaning on tests. We need the same idea.

**Rule**
- For any new Obsidian behavior we claim, add at least one of:
  - unit test (pure logic),
  - integration test (vault fixture),
  - e2e test (UI workflow).

## How to support “everything” without drowning

The Bun analogy is correct in spirit: a drop-in replacement wins by compatibility. But Bun also succeeded because it had:
- a strong internal architecture,
- an aggressive test strategy,
- clear boundaries,
- and incremental compatibility work guided by real workloads.

For Igne, “support everything” becomes manageable if we treat compatibility as three separate workstreams:

1) **Vault contract** (file formats, embeds, `.obsidian`, sync-friendly behavior)
2) **Obsidian API contract** (`obsidian` module behaviors)
3) **Plugin runtime contract** (module system + environment + permissions + performance)

Each has its own tests and acceptance checks.

## Agent operating procedure (fast but safe)

### When implementing a feature
1. Identify which contract it touches:
   - vault / API / runtime / UI
2. Add or update a test.
3. Update `docs/OBSIDIAN_DROP_IN_GAP_REPORT.md` if it closes a gap.

### When refactoring
1. Do not “mix layers” to make it work quickly.
2. Prefer moving logic into the tool layer and deleting duplicated code.

### When uncertain about Obsidian behavior
1. Add a research link under `research-oss/obsidian-research/SOURCES.md`.
2. Add a failing test that captures the expected behavior.
3. Implement until test passes.

## Current top boundary violations (fixing these reduces future noise)

These are known hotspots where compat concerns leak everywhere:
- Dual cores (UI-core vs `src/obsidian/*`) causing duplication and inconsistent path handling.
- Mixed path semantics (“OS vs vault vs relative `.obsidian`”).
- Plugin loading via ad-hoc `import()` rather than a deliberate runtime boundary.

See the map: `docs/ARCHITECTURE_FLOWS.md`.
