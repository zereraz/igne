# Programmer Workflows in Obsidian (real-world signals)

This document summarizes how programmers and software engineers actually use Obsidian, based on community threads, official docs, and “power user” plugin adoption. It’s intended to inform Igne’s drop‑in replacement priorities.

## What programmers store in the vault

### “Library / framework” notes (reference + experience)
- People start with topical notes like `React`, `TypeScript`, `Storybook`, etc, and quickly hit “folder sprawl” if they try to mirror the ecosystem as folders. Many users pivot to links, tags, and index notes instead of deep folder trees.
- A common refinement is to avoid writing things that are “just Googleable” and instead capture *your* experience, context, and decisions (“why we did X”, “why Y didn’t work”, “how to reproduce”).

Signals:
- Forum thread: “Workflow for developers?” (`topic_id=1474`) — link-first, avoid premature folder structure.
- Forum thread: “PKM for programmers, software engineers, etc” (`topic_id=56002`) — “operational” notes + “encyclopedic/evergreen” notes; experience-driven capture.

### “Operational” notes (work logs, debugging, decisions, mini-reports)
Patterns that show up repeatedly:
- Daily notes as a scratchpad for what happened today; “mini-reports” when something becomes important enough to preserve with context (problem → attempts → result).
- Project pages or tags to “gather” work artifacts via backlinks and Dataview-like queries (“show me all mini reports for PROJECTX”).
- “Helpful nuggets” notes: commands, links, snippets, gotchas.

Signals:
- Forum thread `topic_id=56002` (mini-reports, project linking, Dataview for lists).

### People notes + meeting notes
Common uses in engineering orgs:
- Notes per person for continuity (roles, past conversations, decisions).
- Meeting notes either as recurring meeting pages or captured in daily notes with links back to the meeting page.

Signals:
- Forum thread `topic_id=56002` (people notes, meeting notes, “highlight reel” for reviews).

## How programmers structure vaults

### Links over folders (folders as “isolation”, not “taxonomy”)
Observed guidance:
- Use links to connect new concepts into existing mental models (e.g., “TypeScript” links to “Static typing”, “Transpilers”, etc).
- Use folders mostly to isolate high-level buckets (work vs personal), daily notes, templates, attachments; not to build a precise ontology.
- Use tags for snippets/quotes/examples and quick retrieval.
- Use “index” / “MOC” notes as table-of-contents hubs.

Signals:
- Forum thread `topic_id=1474`.

## Core mechanics programmers rely on

### File semantics are the contract
Obsidian’s promise to programmers is “my vault is my data”:
- Notes are plain files on disk; changes from other tools should be picked up automatically.
- Links update on rename.
- The `.obsidian` config folder is part of vault portability; many users sync it via Git (often excluding fast-changing workspace layout files).

Signals:
- Obsidian Help: “How Obsidian stores data” (`permalink: data-storage`)
- Obsidian Help: “Manage notes” (`permalink: manage-notes`)

### Embed/transclusion + attachments are normal, not edge-cases
Programmer vaults routinely contain diagrams, screenshots, PDFs, and embedded content:
- Embedding syntax (`![[file]]`, heading/block embeds, image sizing, pdf `#page=`, etc) is core behavior.
- Drag/drop attachments is a mainstream workflow on desktop.

Signals:
- Obsidian Help: “Accepted file formats” (`permalink: file-formats`)
- Obsidian Help: “Embed files” (`permalink: embeds`)

### Git as backup/sync (and “diff as a UI”)
Many programmer vaults are Git repos:
- Auto commit/pull/push schedules.
- In-app diff/history/source-control UI.
- Platform constraints matter (mobile Git workflows are less stable; desktop has fewer restrictions).

Signals:
- `Vinzent03/obsidian-git` README (key features + mobile caveats).

## Automation: command palette + hotkeys + URIs

Programmers heavily value “everything is a command”:
- Command palette is a workflow backbone; plugins expose commands; commands are bindable to hotkeys.
- URI-based automation enables cross-app workflows (Shortcuts, shell scripts, browser extensions, external launchers).

Signals:
- Obsidian Help: “Obsidian URI” (`permalink: extending-uri`)
- Hub guide: “Controlling Obsidian via a Third‑Party App” (locations of config files; URIs; plugin sources; encoding gotchas).

### Quick capture into daily notes (a concrete “mainstream automation”)
A common “Apple Notes-like” need: pop a capture UI, append under a section header, return to your app.

Signals:
- Forum thread `topic_id=74664` (QuickAdd + Advanced URI + Shortcuts → append under heading in daily note).

## Scaling: large vault expectations

Real-world expectations (especially for engineers):
- Thousands of notes; fast search; no reindex-on-everything.
- Backlinks and “context around backlinks” are central to making a vault usable over time.
- Metadata views (Dataview dashboards, project rollups) become the “navigation UI”.

Signals:
- Forum thread `topic_id=56002` (backlink-driven recall + Dataview project rollups).

## Design implications for an Obsidian drop-in replacement

If Igne wants to be a credible drop-in for programmer vaults, it needs (at minimum):
- “My vault is my data” semantics: preserve unknown files, correct rename/link updates, compatible `.obsidian` behavior.
- Non-markdown file support (images/audio/video/pdf/`.canvas`/`.base`) at the filesystem + UI level.
- Embed/transclusion correctness (including heading/block embeds and media parameters).
- A first-class command system (palette + hotkeys + programmable entrypoints like URIs).
- A plugin runtime story that can support automation + Git + Dataview-like dashboards (either by compatibility or by re-implementing equivalents).

## Source links (starting points)

- Forum: https://forum.obsidian.md/t/workflow-for-developers/1474
- Forum: https://forum.obsidian.md/t/pkm-for-programmers-software-engineers-etc/56002
- Forum: https://forum.obsidian.md/t/quick-add-workflow-into-daily-notes-using-quickadd-advanced-uri-and-shortcuts-ios-and-macos/74664
- Help: https://help.obsidian.md/Files+and+folders/How+Obsidian+stores+data
- Help: https://help.obsidian.md/Files+and+folders/Manage+notes
- Help: https://help.obsidian.md/Files+and+folders/Accepted+file+formats
- Help: https://help.obsidian.md/Linking+notes+and+files/Embed+files
- Help: https://help.obsidian.md/Extending+Obsidian/Obsidian+URI
- Hub: https://publish.obsidian.md/hub/04%20-%20Guides%2C%20Workflows%2C%20%26%20Courses/Guides/Controlling%20Obsidian%20via%20a%20Third-party%20App
- Plugin: https://github.com/Vinzent03/obsidian-git
