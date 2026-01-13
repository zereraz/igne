# Obsidian Settings File Format Documentation

This document describes the `.obsidian/*.json` settings files that Igne reads and writes for Obsidian compatibility.

## Policy: Preserve Unknown Keys

**Critical:** When reading or writing `.obsidian/*.json` files, Igne MUST:
- **Preserve unknown keys** - Never delete fields we don't recognize
- **Merge updates** - When writing, merge with existing data instead of overwriting
- **Apply migrations** - Support format changes via migration system

This ensures that:
1. Vaults remain compatible with Obsidian
2. Igne upgrades don't lose user data
3. Obsidian-specific features continue to work

---

## Supported Settings Files

### app.json

Main application settings for a vault.

**Location:** `.obsidian/app.json`

**Supported Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `attachmentFolderPath` | string | `"attachments"` | Folder for storing attachments |
| `useMarkdownLinks` | boolean | `true` | Use `[[wikilinks]]` instead of markdown links |
| `newLinkFormat` | string | `"shortest"` | How to format new links (`"shortest"`, `"relative"`, `"absolute"`) |
| `alwaysUpdateLinks` | boolean | `true` | Automatically update links when files move |

**Igne-only Fields:** (These are used by Igne but not written to Obsidian-compatible files)

None currently. All fields in `app.json` are Obsidian-compatible.

**Migrations:**
- `1.0.0-attachment-folder`: Adds `attachmentFolderPath` with default value

---

### appearance.json

Visual appearance settings.

**Location:** `.obsidian/appearance.json`

**Supported Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `baseTheme` | string | `"dark"` | Base theme: `"dark"` or `"light"` |
| `cssTheme` | string | `""` | Community theme name (e.g., `"moonstone"`) |
| `accentColor` | string | `"#7c3aed"` | Primary accent color (hex) |
| `baseFontSize` | number | `16` | Base font size in pixels |
| `interfaceFontFamily` | string | `""` | Interface font (empty = system default) |
| `textFontFamily` | string | `""` | Editor text font (empty = system default) |
| `monospaceFontFamily` | string | `""` | Monospace font for code (empty = system default) |
| `enabledCssSnippets` | string[] | `[]` | List of enabled CSS snippet names |

**Igne-only Fields:** None

**Migrations:**
- `1.0.0-theme-split`: Migrates old `theme: "moonstone"` to `baseTheme: "obsidian", cssTheme: "moonstone"`
- `1.0.0-accent-color`: Adds `accentColor` with default value

---

### workspace.json

Workspace layout and open files state.

**Location:** `.obsidian/workspace.json`

**Supported Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `openFiles` | string[] | List of open file paths (vault-absolute) |
| `activeFile` | string \| null | Currently active file path |
| `lastOpenFile` | string \| null | Last opened file for restoration |

**Igne-only Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `paneLayout` | object | Igne-specific pane layout structure |
| `panelStates` | object | Panel visibility and state |

**Migrations:** None currently

---

### community-plugins.json

List of enabled community plugins.

**Location:** `.obsidian/community-plugins.json`

**Supported Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `plugins` | string[] | Array of plugin plugin IDs |

**Igne-only Fields:** None

**Migrations:** None currently

---

### hotkeys.json

Custom keyboard shortcuts.

**Location:** `.obsidian/hotkeys.json`

**Supported Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `<command-id>` | array | Array of hotkey objects per command |

Each hotkey object:
```typescript
{
  modifiers: string[],  // e.g., ["mod", "shift"]
  key: string          // e.g., "f"
}
```

**Igne-only Fields:** None

**Migrations:** None currently

---

### daily-notes.json

Daily notes plugin configuration.

**Location:** `.obsidian/daily-notes.json`

**Supported Fields:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `folder` | string | `"Daily Notes"` | Folder for daily notes |
| `format` | string | `"YYYY-MM-DD"` | Date format for filenames |
| `template` | string | (default template) | Template content for new notes |

**Igne-only Fields:** None

**Migrations:** None currently

---

### starred.json

Starred/favorite files.

**Location:** `.obsidian/starred.json`

**Supported Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `stars` | array | Array of starred file entries |

Each star entry:
```typescript
{
  path: string,      // Vault-absolute path
  starredAt: number  // Timestamp when starred
}
```

**Igne-only Fields:** None

**Migrations:** None currently

---

## Unknown Key Preservation

When reading settings files, Igne preserves all fields including those it doesn't recognize. This is critical for compatibility.

**Example:**

Obsidian's `app.json` might contain:
```json
{
  "attachmentFolderPath": "attachments",
  "useMarkdownLinks": true,
  "obsidianFieldWeDontKnowAbout": "some value"
}
```

When Igne writes this file, it MUST preserve `obsidianFieldWeDontKnowAbout`:
```json
{
  "attachmentFolderPath": "attachments",
  "useMarkdownLinks": true,
  "obsidianFieldWeDontKnowAbout": "some value",  // PRESERVED
  "igneField": "igne value"
}
```

---

## Migration System

Settings migrations are defined in `src/utils/settingsMigrations.ts`.

### Creating a Migration

```typescript
export const myMigration: Migration = {
  version: '1.0.0-my-migration',
  description: 'Describe what this migration does',
  migrate: (data: any) => {
    // Transform the data
    if (data.oldField !== undefined) {
      const { oldField, ...rest } = data;
      return {
        ...rest,
        newField: transformValue(oldField),
        __migrations: [...(data.__migrations || []), '1.0.0-my-migration'],
      };
    }
    return data; // Already migrated
  },
};
```

### Migration Tracking

Migrations are tracked via the `__migrations` array in the settings file. This array:
- Is automatically added by the migration system
- Is filtered out when returning data to the app
- Prevents re-running migrations

---

## Implementation

### Safe JSON Utilities

All settings I/O should use `src/utils/safeJson.ts`:

```typescript
import { readJsonSafe, writeJsonSafe } from './safeJson';

// Read (preserves all fields)
const data = await readJsonSafe<MySettings>(path);

// Write (merges and preserves unknown keys)
await writeJsonSafe(path, newData, {
  preserveUnknown: true,
  merge: true,
});
```

### Applying Migrations

```typescript
import { migrateSettingsFile } from './settingsMigrations';

// Automatically apply pending migrations
await migrateSettingsFile(filePath);
```

---

## Testing

Settings I/O is tested in:
- `src/utils/__tests__/safeJson.test.ts` - Safe read/write with preservation
- `src/utils/__tests__/settingsMigrations.test.ts` - Migration application

Run tests:
```bash
npm test -- src/utils/__tests__/safeJson.test.ts
npm test -- src/utils/__tests__/settingsMigrations.test.ts
```
