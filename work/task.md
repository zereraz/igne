# Block Transclusion Support

Implement block transclusion: `![[Note#^blockid]]`

## Context

Block transclusion allows embedding specific blocks (paragraphs, lists, etc.) from other notes using block IDs. This is essential for knowledge management and content reuse.

**Reference:** Obsidian block reference syntax

## Goal

- `![[Note#^blockid]]` embeds the specific block from Note.md
- `![[Note#^]]` shows available blocks in Note
- Blocks can be paragraphs, lists, callouts, etc.

---

## Task 1: Parse block ID syntax

**File to create:** `src/utils/blockParser.ts`

**Actions:**
1. Parse `![[Note#^blockid]]` syntax
2. Extract note name and block ID
3. Handle `![[Note#^]]` (empty block ID - show picker)

**Success criteria:**
- [ ] Can parse `![[Note#^abc123]]` into `{ note: 'Note', blockId: 'abc123' }`
- [ ] Can detect empty block ID for picker UI

---

## Task 2: Find blocks in notes

**File to create:** `src/utils/blockFinder.ts`

**Actions:**
1. Scan notes for block IDs (pattern `^blockid`)
2. Return block content with context
3. Cache block index for performance

**Success criteria:**
- [ ] Can find all blocks in a note
- [ ] Returns block content and type (paragraph, list, etc.)
- [ ] Block index updates on note change

---

## Task 3: Create block embed widget

**File to create:** `src/components/BlockEmbed.tsx`

**Actions:**
1. Render block content with proper formatting
2. Show source note link
3. Handle missing block/note
4. Add "go to block" action

**Success criteria:**
- [ ] Block content renders with formatting
- [ ] Click source note navigates to original
- [ ] Missing blocks show error
- [ ] Lists, paragraphs, callouts render correctly

---

## Task 4: Add block transclusion to live preview

**File to modify:** `src/extensions/livePreview.ts`

**Actions:**
1. Detect `#^` syntax in wikilinks
2. Parse block ID
3. Render BlockEmbed component

**Success criteria:**
- [ ] `![[Note#^blockid]]` renders block content
- [ ] `![[Note#^]]` shows block picker
- [ ] Updates when source block changes

---

## Task 5: Implement block picker

**File to create:** `src/components/BlockPicker.tsx`

**UI:**
- Show all blocks in source note
- Preview block content
- Select block to insert

**Success criteria:**
- [ ] Shows list of blocks
- [ ] Preview on hover
- [ ] Click inserts block reference

---

## Task 6: Test block transclusion

**File to create:** `tests/e2e/block-transclusion.spec.ts`

**Tests:**
- [ ] Embed paragraph block
- [ ] Embed list block
- [ ] Handle missing block
- [ ] Block picker UI

**Success criteria:**
- [ ] All tests pass

---

## Completion

When ALL tasks complete and tests pass, add this exact marker on its own line:

PROMISE_COMPLETE_TAG
