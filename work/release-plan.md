# Igne v1.0.0 Release Plan

## Current State

- **Version:** 1.0.0 (already set in package.json)
- **All 8 roadmap phases (A-H) complete** ✅
- **Embed semantics complete** ✅
- **570 tests passing** ✅
- **Latest commit:** 01d5540 (tag parser fix)

## Pre-Release Checklist

### 1. Version and Metadata
- [ ] Verify package.json version is correct
- [ ] Update tauri.conf.json version if needed
- [ ] Verify app name, description, and metadata
- [ ] Check icons and app assets are present

### 2. Build Verification
- [ ] Run `npm run build` - verify TypeScript build succeeds
- [ ] Run `npm run tauri:build` - verify app builds successfully
- [ ] Test the built app locally
- [ ] Run all tests: `npm run test:run`
- [ ] Run E2E tests: `npm run test:e2e`

### 3. Documentation
- [ ] Update README with current features
- [ ] Add release notes to CHANGELOG.md (create if needed)
- [ ] Verify installation instructions work
- [ ] Document known limitations

### 4. Code Quality
- [ ] No console errors in dev mode
- [ ] No TypeScript errors
- [ ] Linting passes (if configured)
- [ ] No debug/TODO comments in critical paths

### 5. Tauri Configuration
- [ ] Check updater configuration (if using)
- [ ] Verify bundler configuration
- [ ] Check allowed domains/security
- [ ] Verify app ID (com.igne.igne or similar)

### 6. Release Artifacts
- [ ] Build for macOS (dmg)
- [ ] Build for Linux (AppImage/deb)
- [ ] Build for Windows (msi/nsis) - if Windows machine available
- [ ] Verify signatures (if configured)

## Release Steps

### Step 1: Final Verification
```bash
# Run full test suite
npm run test:run

# Check TypeScript compilation
npm run build

# Verify Tauri config
cat src-tauri/tauri.conf.json
```

### Step 2: Update Release Notes
Create CHANGELOG.md:
```markdown
# Changelog

## [1.0.0] - 2025-01-XX

### Added
- Full Obsidian 1.11.4 API compatibility
- Plugin system with tier-based compatibility
- AI-first layer with agent tools
- PDF, audio, video embeds
- Block and heading transclusion
- Embed parameters (width, height, align, etc.)
- Command registry and audit logging
- Vault-relative path support
- Safe JSON I/O for .obsidian settings

### Fixed
- Tag parser now correctly recognizes #tag at start of document
- File rename no longer loses content
- Theme toggle now works correctly

### Known Limitations
- Canvas not supported (Obsidian feature after 1.11.4)
- File watching uses polling (not native filesystem events)
- Plugin runtime: Tier 2 (Node/Electron) plugins not supported
- Directory listing has max depth limit
```

### Step 3: Tag and Push
```bash
# Tag the release
git tag -a v1.0.0 -m "Igne v1.0.0 - First stable release"

# Push tag
git push origin v1.0.0
```

### Step 4: Build Release
```bash
# macOS build
npm run tauri:build

# Artifacts will be in:
# src-tauri/target/release/bundle/dmg/
# src-tauri/target/release/bundle/macos/
```

### Step 5: GitHub Release
1. Go to GitHub releases page
2. Draft new release:
   - Tag: v1.0.0
   - Title: Igne v1.0.0 - First Stable Release
   - Description: Use CHANGELOG.md content
3. Attach binaries:
   - Igne_1.0.0_x64.dmg (macOS)
   - Igne_1.0.0_amd64.AppImage (Linux)
4. Publish release

## Post-Release

### For Users
- [ ] Update README with download links
- [ ] Announce on relevant platforms
- [ ] Create documentation for getting started

### For Development
- [ ] Merge main back to development branch (if exists)
- [ ] Start v1.1.0 planning
- [ ] Set up issue tracking for next version

## Known Issues (For v1.0.0 Release Notes)

1. **Canvas not supported** - Obsidian's visual whiteboard feature (post-1.11.4)
2. **File watching** - Currently uses polling, not native filesystem events
3. **Tier 2 plugins** - Node/Electron API plugins not supported
4. **Directory depth** - Large vaults with deep folder structures may have issues

## Testing Checklist for Release

- [ ] Can open an existing Obsidian vault
- [ ] Can create and edit markdown notes
- [ ] Wikilinks work: `[[note]]`
- [ ] Tags work: `#tag`
- [ ] Embeds work: `![[note]]`, `![[image.png]]`
- [ ] Settings are preserved
- [ ] App starts without crashes
- [ ] Can install the app fresh and create a new vault

## Abort Criteria

If any of these fail, do NOT release:
- [ ] npm run test:run fails
- [ ] npm run build fails
- [ ] npm run tauri:build fails
- [ ] App crashes on startup
- [ ] Cannot open/save files
