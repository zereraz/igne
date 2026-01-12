# Plugin Compatibility Tiers

## Overview

Igne implements a tiered compatibility model for Obsidian plugins. This ensures that plugins run safely and predictably, while giving users clear visibility into what each plugin can and cannot do.

**Baseline**: All tiers are based on Obsidian API `1.11.4` (pinned). Plugins requiring higher `minAppVersion` are blocked.

---

## Tier Definitions

### Tier 0: Browser-Only + Obsidian Public API (Default)

**Description**: Plugins that use only web-standard APIs and the public Obsidian API surface.

**What Tier 0 CAN do**:
- Read and write vault files via `Vault.adapter` / `Vault.*` methods
- Use all Obsidian public APIs: `Workspace`, `MetadataCache`, `FileManager`, etc.
- Manipulate the DOM within their plugin scopes
- Use browser APIs: `fetch`, `localStorage`, `IndexedDB`, `Clipboard API`, `Notification API`
- Register commands, hotkeys, and UI elements (ribbon icons, status bar items)
- Interact with the Obsidian UI (panels, leaves, views)

**What Tier 0 CANNOT do**:
- Access Node.js APIs (`require('fs')`, `require('child_process')`, etc.)
- Access Electron APIs (`remote`, `ipcRenderer`, etc.)
- Load native modules
- Execute shell commands

**Compatibility**: ✅ Fully supported by Igne

**Permission prompts**: None for core functionality. Optional prompt for network access (if used).

**Examples of Tier 0 plugins**:
- Plugins that only read/write notes
- Plugins that add UI elements and commands
- Plugins that use `MetadataCache` for analysis
- Plugins that store settings in `data.json`

---

### Tier 1: Limited Extra Capabilities

**Description**: Plugins that need capabilities beyond Tier 0 but still don't require Node/Electron APIs.

**Additional capabilities** (requires explicit permission):
- **Network**: HTTP/HTTPS requests to external servers
- **Clipboard**: Advanced clipboard operations beyond basic read/write
- **Notifications**: System notifications (browser notification API)
- **Storage**: Additional storage mechanisms

**Compatibility**: ⚠️ Supported with permission prompts

**Permission prompts**: Each capability triggers a one-time prompt:
- "This plugin wants to access the network. Allow?"
- "This plugin wants to read your clipboard. Allow?"
- "This plugin wants to show notifications. Allow?"

**User control**:
- Permissions are stored per-plugin in `.obsidian/igne-plugin-permissions.json`
- Users can revoke permissions at any time
- "Remember this choice" checkbox for persistent allow/deny

**Examples of Tier 1 plugins**:
- Plugins that fetch data from external APIs (weather, stock quotes, etc.)
- Plugins that sync with external services
- Plugins that use advanced clipboard features

---

### Tier 2: Node/Electron APIs (NOT SUPPORTED)

**Description**: Plugins that require Node.js or Electron APIs.

**Blocked APIs** (all blocked):
- `require('fs')` - Filesystem access
- `require('child_process')` - Process execution
- `require('electron')` - Electron main process access
- Any native Node modules

**Compatibility**: ❌ **NOT SUPPORTED** - Hard block

**Reason**: Igne runs in a browser-like environment for security and portability. Node/Electron APIs would require a desktop-app sandbox model that conflicts with the web-first architecture.

**User experience**:
- Plugin appears as "Blocked" in the plugin list
- Clear error message: "This plugin requires Node.js APIs which are not supported"
- Suggests contacting plugin author to add web-compatible alternatives

**Examples of Tier 2 plugins**:
- Plugins using `fs` directly instead of `Vault.adapter`
- Plugins spawning child processes
- Plugins using Electron's `remote` module

---

## Tier Detection

Igne automatically detects plugin tier based on:

1. **Manifest analysis**:
   - `minAppVersion` must be ≤ `1.11.4`
   - `isDesktopOnly` flag is noted but not enforced

2. **Code analysis** (static inspection of `main.js`):
   - Detects `require('fs')`, `require('electron')`, etc.
   - Detects `fetch()` calls → Tier 1 (network)
   - Detects `navigator.clipboard` → Tier 1 (clipboard)
   - Detects `new Notification()` → Tier 1 (notifications)

3. **Runtime detection** (fallback):
   - If plugin tries to access blocked API during load, it fails gracefully with helpful error

---

## Permission Model

### Permission Storage

**Location**: `.obsidian/igne-plugin-permissions.json` (Igne-specific, not used by Obsidian)

**Format**:
```json
{
  "plugin-id": {
    "network": "granted",
    "clipboard": "denied",
    "notifications": "prompt"
  }
}
```

**Permission states**:
- `"granted"` - Permission allowed, no prompt
- `"denied"` - Permission denied, plugin cannot access
- `"prompt"` - Ask user each time (default for first use)

### Permission Prompt UI

Modal dialog showing:
- Plugin name and author
- Permission being requested
- Plain-language explanation: "This plugin wants to access the network to fetch weather data."
- Three buttons:
  - **Allow** - Grant permission
  - **Deny** - Deny permission
  - **Allow and remember** - Grant and save to permissions file
- "Remember this choice" checkbox (when unchecked, re-prompts each session)

### Safe Mode

**Toggle**: "Disable all third-party plugins"

**Behavior**:
- When enabled, all third-party plugins are disabled immediately
- Built-in plugins (if any) remain enabled
- Stored persistently in Igne settings

**Use cases**:
- User suspects a plugin is causing issues
- Quick way to test if a problem is plugin-related
- "Panic button" for unexpected behavior

**Recovery**:
- User can disable safe mode to re-enable plugins
- Permissions are preserved (safe mode doesn't revoke permissions, just disables plugins)

---

## Migration Guide for Plugin Authors

If your plugin is Tier 2 (blocked):

1. **Replace `fs` with `Vault.adapter`**:
   ```typescript
   // Instead of: require('fs').readFileSync(path)
   // Use: await vault.adapter.read(path)
   ```

2. **Replace `child_process` with web APIs**:
   - Consider if the operation is necessary
   - Use `fetch()` for network requests
   - Use Web Workers for CPU-intensive tasks

3. **Avoid Electron APIs**:
   - Use Obsidian API for UI manipulation
   - Use `Workspace` APIs for window management

4. **Test in Tier 0**:
   - Remove all Node/Electron imports
   - Use only browser APIs and Obsidian API
   - Test in Igne to verify Tier 0 compatibility

---

## FAQ

**Q: Why is my plugin blocked?**
A: It likely requires Node.js or Electron APIs (Tier 2). Check the error message for specific details.

**Q: Can I still use my favorite plugins?**
A: If they're Tier 0 or Tier 1, yes! Most popular plugins are Tier 0. Tier 1 plugins require permission grants.

**Q: How do I check if a plugin is compatible?**
A: Look at the tier badge in the plugin list. Green = Tier 0, Yellow = Tier 1, Red = Tier 2.

**Q: What if a plugin author updates their plugin to remove Tier 2 dependencies?**
A: Re-install or update the plugin. Igne will re-evaluate its tier automatically.

**Q: Are permissions synced across devices?**
A: No, permissions are stored per-vault in `.obsidian/`. Sync your vault to sync permissions.

**Q: Can I export/import permissions?**
A: Not currently, but you can copy `.obsidian/igne-plugin-permissions.json` manually.
