<<<<<<< HEAD
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
=======
# Heading Transclusion Support

Implement heading transclusion: `![[Note#Heading]]`

## Context

Heading transclusion allows embedding sections of notes from their headings. Essential for organizing long content and reusing sections across notes.

**Reference:** Obsidian heading reference syntax

## Goal

- `![[Note#Heading]]` embeds content under that heading
- `![[Note#Heading]]` includes all subheadings/content
- `![[Note#]]` shows available headings picker

---

## Task 1: Parse heading syntax

**File to create:** `src/utils/headingParser.ts`

**Actions:**
1. Parse `![[Note#Heading]]` syntax
2. Extract note name and heading text
3. Handle special characters in headings
4. Handle `![[Note#]]` for picker

**Success criteria:**
- [ ] Can parse `![[Note#My Heading]]` correctly
- [ ] Handles headings with spaces, punctuation
- [ ] Detects empty heading for picker

---

## Task 2: Find headings in notes

**File to create:** `src/utils/headingFinder.ts`

**Actions:**
1. Parse markdown for headings (# ## ### etc.)
2. Return heading text, level, and content under it
3. Handle nested headings correctly
4. Cache heading index

**Success criteria:**
- [ ] Finds all headings in a note
- [ ] Returns content under heading (until next same/higher level)
- [ ] Handles nested heading hierarchy

---

## Task 3: Create heading embed widget

**File to create:** `src/components/HeadingEmbed.tsx`

**Actions:**
1. Render heading with appropriate level
2. Render content under heading
3. Show source note link
4. Handle missing heading/note
5. Support "transclude without heading" option

**Success criteria:**
- [ ] Heading and content render with formatting
- [ ] Nested headings included
- [ ] Source link navigates to original
- [ ] Missing headings show error

---

## Task 4: Add heading transclusion to live preview
>>>>>>> embed-heading

**File to modify:** `src/extensions/livePreview.ts`

**Actions:**
<<<<<<< HEAD
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
=======
1. Detect `#` syntax without `^` (heading, not block)
2. Parse heading text
3. Render HeadingEmbed component
4. Handle heading picker for `#`

**Success criteria:**
- [ ] `![[Note#Heading]]` renders heading + content
- [ ] `![[Note#]]` shows heading picker
- [ ] Updates when source note changes

---

## Task 5: Implement heading picker

**File to create:** `src/components/HeadingPicker.tsx`

**UI:**
- Show heading hierarchy
- Preview content under heading
- Select heading to insert

**Success criteria:**
- [ ] Shows heading tree
- [ ] Preview on hover
- [ ] Click inserts heading reference

---

## Task 6: Test heading transclusion

**File to create:** `tests/e2e/heading-transclusion.spec.ts`

**Tests:**
- [ ] Embed top-level heading
- [ ] Embed nested heading
- [ ] Handle missing heading
- [ ] Heading picker UI
>>>>>>> embed-heading

**Success criteria:**
- [ ] All tests pass

---

## Completion

When ALL tasks complete and tests pass, add this exact marker on its own line:

PROMISE_COMPLETE_TAG
