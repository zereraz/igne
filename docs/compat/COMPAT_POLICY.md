# Igne Compatibility Policy

## Pinned Baseline

Igne implements the Obsidian API as of **`obsidian` npm version `1.11.4`**.

This is the **only** supported version. Plugins requiring `minAppVersion > 1.11.4` will **not** load.

### Version Details

- **Obsidian npm version:** `1.11.4`
- **Vendored types:** `compat/obsidian-api/obsidian.d.ts`
- **Metadata:** `compat/obsidian-api/metadata.json`
- **Pinned date:** 2026-01-13

## What "Supported" Means

### API Surface

We support the public API surface defined in `obsidian.d.ts` for version 1.11.4, including:

- Plugin lifecycle (`onload`, `onunload`)
- Vault operations (read, write, rename, delete, etc.)
- Workspace and leaf management
- Metadata cache
- Command registration
- Settings tabs
- View registration

### Behavioral Parity

We aim for **reasonable** behavioral parity with Obsidian 1.11.4 for:

- File operations
- Link resolution
- Markdown parsing
- Plugin loading

**NOT guaranteed:** exact pixel-perfect UI parity, every internal implementation detail, or undocumented behaviors.

## Plugin Compatibility Gates

### Version Gate

Plugins are **blocked** at load time if:

```json
{
  "minAppVersion": "1.11.5"
}
```

Igne will reject this plugin with an error message explaining that the minimum required version exceeds the pinned baseline.

### versions.json Fallback

When installing from a plugin repository, if the latest release requires `minAppVersion > 1.11.4`, Igne will:

1. Fetch the plugin's `versions.json` from the repository
2. Find the newest release with `minAppVersion <= 1.11.4`
3. Install that compatible version (or show "no compatible version" if none exists)

This mirrors Obsidian's official behavior.

### Example Error Message

```
Plugin "example-plugin" requires Obsidian 1.11.5 or later.
Igne currently supports Obsidian API 1.11.4 (pinned baseline).
Please check if a compatible version is available.
```

## Why Pin to 1.11.4?

1. **Stability:** A fixed baseline allows us to guarantee compatibility
2. **Maintainability:** We can implement and test against a known API surface
3. **Upgradability:** When we're ready to advance, we can do so in a controlled way

## Advancing the Baseline

To advance to a newer Obsidian version (e.g., 1.12.0):

1. Vendor the new `obsidian.d.ts` to `compat/obsidian-api/obsidian.d.ts`
2. Update `compat/obsidian-api/metadata.json`
3. Update this policy document
4. Update the compatibility gate constant
5. Test all existing plugins against the new baseline

**This is a deliberate decision that should not be taken lightly.**
