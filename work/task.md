# Embed Parameters Support

Implement embed parameters: `#page=`, `#width=`, `#height=`, etc.

## Context

Embed parameters allow fine control over how embeds are displayed - sizing, positioning, and content selection. This completes the embed system with full Obsidian parity.

**Reference:** Obsidian embed parameter syntax

## Goal

- `![[image.png#width=300]]` sets image width
- `![[video.mp4#height=400]]` sets video height
- `![[file.pdf#page=5&width=600]]` combines parameters
- Support all Obsidian embed parameters

---

## Task 1: Parse embed parameters

**File to create:** `src/utils/embedParams.ts`

**Actions:**
1. Parse `#key=value` syntax
2. Support multiple params: `#width=300&height=200`
3. Define supported parameters:
   - `width`: pixel or percentage
   - `height`: pixel or percentage
   - `page`: for PDFs
   - `align`: left, center, right
   - `alt`: alt text for images
   - `title`: title attribute

**Success criteria:**
- [ ] Parses single parameter: `#width=300`
- [ ] Parses multiple: `#width=300&height=200`
- [ ] Handles percentage: `#width=50%`
- [ ] Returns params as object

---

## Task 2: Apply parameters to image embeds

**File to modify:** `src/extensions/livePreview.ts` (image widget)

**Actions:**
1. Apply width/height to `<img>` element
2. Apply alt text from `#alt=`
3. Apply alignment via CSS classes
4. Handle invalid values gracefully

**Success criteria:**
- [ ] `![[img.png#width=300]]` renders at 300px wide
- [ ] `![[img.png#width=50%]]` renders at 50% width
- [ ] `#align=center` centers image
- [ ] Invalid params don't break embed

---

## Task 3: Apply parameters to video embeds

**File to modify:** `src/components/VideoEmbed.tsx`

**Actions:**
1. Apply width/height to `<video>` element
2. Support autoplay, loop, muted params
3. Apply alignment

**Success criteria:**
- [ ] `#width=600#height=400` sets video dimensions
- [ ] `#autoplay` autoplays video
- [ ] Alignment works correctly

---

## Task 4: Apply parameters to PDF embeds

**File to modify:** `src/components/PdfEmbed.tsx`

**Actions:**
1. Pass `#page=` param to PDF viewer
2. Apply width/height to iframe
3. Support `#toolbar=0` to hide controls

**Success criteria:**
- [ ] `![[file.pdf#page=5#width=800]]` works
- [ ] Toolbar can be hidden
- [ ] Sizing applies correctly

---

## Task 5: Apply parameters to heading/block embeds

**File to modify:** `src/components/HeadingEmbed.tsx`, `src/components/BlockEmbed.tsx`

**Actions:**
1. Support `#collapse` to show collapsed preview
2. Support `#no-heading` to hide heading in heading embed
3. Support `#max-lines=N` to truncate content

**Success criteria:**
- [ ] `#collapse` adds expand/collapse toggle
- [ ] `#no-heading` hides heading text
- [ ] `#max-lines=5` truncates with "..."

---

## Task 6: Test embed parameters

**File to create:** `tests/e2e/embed-params.spec.ts`

**Tests:**
- [ ] Image width/height params
- [ ] Video autoplay/loop params
- [ ] PDF page param
- [ ] Heading collapse param
- [ ] Invalid params handling

**Success criteria:**
- [ ] All tests pass

---

## Task 7: Documentation

**File to create:** `docs/EMBED_PARAMETERS.md`

**Content:**
- List all supported parameters
- Examples for each embed type
- Notes on limitations vs Obsidian

**Success criteria:**
- [ ] Documentation created
- [ ] Examples provided

---

## Completion

When ALL tasks complete and tests pass, add this exact marker on its own line:

PROMISE_COMPLETE_TAG
