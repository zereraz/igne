# Obsidian plugin runtime environment (what community plugins assume)

This document captures **runtime/environment constraints** that matter for an Obsidian drop‑in replacement.
It is intentionally focused on “what the ecosystem assumes”, not on Igne’s current implementation.

## Execution environments Obsidian supports

### Desktop app
Community plugins execute inside Obsidian’s desktop app and can generally assume:
- full DOM access (they render settings, panels, modals, custom views),
- an in-app editor surface (CodeMirror-based) with Obsidian’s `Editor` interface,
- “desktop app capabilities” that are **not** available on mobile (notably Node/Electron APIs).

### Mobile apps (iOS/Android)
Obsidian’s official developer docs state:
- Node.js and Electron APIs are **not available on mobile**,
- plugins that require those APIs should set `isDesktopOnly: true` in `manifest.json`.

Practical implication: many plugins aim to work cross-platform and therefore avoid Node/Electron dependencies, but some major desktop workflows (Git, heavy filesystem/network tooling) often assume desktop-only behavior.

## Editor compatibility: CM5 → CM6 and “Live Preview”

Obsidian’s ecosystem went through a major editor shift (CodeMirror 5 → CodeMirror 6).
Key compatibility signals from community guidance:
- Obsidian provides an `Editor` interface intended to be a “drop in replacement” for the supported parts of CM5 access patterns.
- Plugins that relied on advanced CM5 internals were expected to break under CM6; the guidance is to migrate to the `Editor` abstraction.
- Themes/snippets rely on stable CSS class patterns, but some selector changes were unavoidable (e.g. `.CodeMirror-line` → `.cm-line`).

Implication for Igne: if Igne wants to run real community plugins, Igne must provide a high-fidelity `Editor` surface and a stable DOM/CSS contract in the editor view (or expect large portions of the ecosystem to fail).

## Security posture (baseline to beat)

Obsidian Help makes two key points:
- Obsidian ships with **Restricted mode** (community plugins disabled by default).
- Obsidian cannot reliably sandbox plugins to specific permissions; plugins inherit the app’s access (files/network/install programs).

Implication for Igne: an OSS drop-in replacement should strongly consider **capability gating** and an auditable tool surface for plugins/agents, because “run arbitrary JS with full privileges” is a large security risk for an open ecosystem.

## Implications for Igne’s compatibility strategy

### 1) “Webview-only plugin runtime” behaves like Obsidian mobile
If plugins execute directly inside the UI webview without a Node/Electron host, expect:
- desktop-only plugins to break unless Igne replaces those capabilities with explicit tool APIs,
- some dependency graphs to break (plugins shipping Node-targeted bundles).

### 2) A dedicated “plugin host” can restore desktop compatibility (but must be gated)
A common architecture for secure compatibility is:
- run plugins in a separate JS runtime (a Node/Bun/Deno “host” process or isolated context),
- expose Obsidian APIs via a narrow RPC bridge to Igne’s core tools,
- implement a permission model (read-only vs write; network allowlist; per-vault trust).

This reduces “compat noise” in the main UI codebase: Obsidian compatibility becomes an adapter layer, not scattered glue.

## Source links (starting points)

- Obsidian Developer Docs — Mobile development: https://docs.obsidian.md/Plugins/Getting%20started/Mobile%20development
- Obsidian Help — Plugin security: https://help.obsidian.md/Extending+Obsidian/Plugin+security
- Obsidian Developer Docs — Plugin guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Obsidian Hub — Live Preview migration notes: https://publish.obsidian.md/hub/04%20-%20Guides%2C%20Workflows%2C%20%26%20Courses/Guides/How%20to%20update%20your%20plugins%20and%20CSS%20for%20live%20preview
