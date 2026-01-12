# Obsidian versioning & plugin compatibility (official docs notes)

This summarizes the parts of Obsidian’s official developer docs that matter for Igne’s “pinned baseline” compatibility strategy.

## Manifest (`manifest.json`)

Source: Obsidian Developer Docs — `Reference/Manifest`

- `minAppVersion` is **required** and is the primary way plugins declare the minimum Obsidian version they can run on.
- `version` is the plugin version and is expected to follow SemVer (`x.y.z`).
- `fundingUrl` is documented as an optional field (string or object with multiple URLs).

## Plugin fallback installs (`versions.json`)

Source: Obsidian Developer Docs — `Reference/Versions`

Key behavior:
- When a user tries to install a plugin whose `manifest.minAppVersion` is **higher** than the user’s Obsidian app version, Obsidian checks the plugin repo for a `versions.json`.
- `versions.json` maps **plugin versions** → **min app versions**.
- Obsidian chooses the newest plugin version whose `minAppVersion` is compatible with the user’s app.
- Plugin authors only need to update `versions.json` when they **change** `minAppVersion` (not for every release).

## Implications for Igne (pinned baseline)

If Igne pins compatibility to `obsidian` npm `1.11.4` and does not advance:
- Igne’s plugin manager should implement the same fallback behavior:
  - reject plugin versions requiring `minAppVersion > 1.11.4`
  - if installing from a repo, consult `versions.json` to find the newest compatible plugin release
- “Future Obsidian updates that break us” becomes a non-goal by design, but “future plugin releases” can still be installable *if* a compatible release exists per `versions.json`.

## Links used (for traceability)

- Manifest docs: `https://docs.obsidian.md/Reference/Manifest` (published markdown: `https://publish-01.obsidian.md/access/caa27d6312fe5c26ebc657cc609543be/Reference/Manifest.md`)
- Versions docs: `https://docs.obsidian.md/Reference/Versions` (published markdown: `https://publish-01.obsidian.md/access/caa27d6312fe5c26ebc657cc609543be/Reference/Versions.md`)
