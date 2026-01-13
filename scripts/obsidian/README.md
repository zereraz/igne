# Obsidian compatibility contracts (internal)

This folder contains scripts that **pin and verify** the upstream Obsidian plugin API contract (types), plus invariant checks that keep the repo from silently drifting away from “drop-in replacement” goals.

## Runtime

These scripts are written in TypeScript.

- Node: run via `node --no-warnings --experimental-strip-types` (the `package.json` scripts already do this).
- Bun: you can also run the `.ts` files directly (e.g. `bun scripts/obsidian/update-contract.ts`).

## Commands

- Update the vendored contract (downloads from npm): `npm run obsidian:update-contract`
- Preview upstream type changes without modifying the contract: `npm run obsidian:preview-contract-update`
- Verify the vendored contract matches `compat/obsidian-api/metadata.json`: `npm run obsidian:check-contract`
- Run architecture/compat invariants (frontend invokes, backend command list, etc): `npm run obsidian:check-invariants`
- Run all compat checks: `npm run check:compat`
- Refresh official community datasets used by research/prioritization: `npm run obsidian:update-community-data`
- Regenerate rankings from the local JSON files: `npm run obsidian:generate-plugin-rankings`

## Files

- `compat/obsidian-api/obsidian.d.ts`: vendored upstream Obsidian plugin API typings
- `compat/obsidian-api/metadata.json`: version + hashes for the vendored contract
- `compat/obsidian-upstream/sources.json`: official upstream sources registry
