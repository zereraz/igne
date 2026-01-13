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

**File to modify:** `src/extensions/livePreview.ts`

**Actions:**
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

**Success criteria:**
- [ ] All tests pass

---

## Completion

When ALL tasks complete and tests pass, add this exact marker on its own line:

PROMISE_COMPLETE_TAG
