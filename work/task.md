# PDF Embed Support

Implement PDF embeds with page number support: `![[file.pdf#page=42]]`

## Context

PDF embeds allow users to embed specific pages of PDF files in their notes. This is a key Obsidian feature for research workflows.

**Reference:** Obsidian embed syntax for PDFs

## Goal

- `![[document.pdf#page=5]]` embeds page 5 of the PDF
- `![[document.pdf]]` embeds first page or shows PDF viewer
- PDF renders as an iframe or canvas element

---

## Task 1: Parse PDF embed syntax

**File to modify:** `src/extensions/livePreview.ts` or `src/utils/embedParser.ts` (create if needed)

**Actions:**
1. Detect PDF files (`.pdf` extension)
2. Parse page parameter: `#page=N`
3. Default to page 1 if not specified

**Success criteria:**
- [ ] Can parse `![[file.pdf#page=3]]` into `{ path: 'file.pdf', page: 3 }`
- [ ] Can parse `![[file.pdf]]` into `{ path: 'file.pdf', page: 1 }`

---

## Task 2: Create PDF embed widget

**File to create:** `src/components/PdfEmbed.tsx`

**Actions:**
1. Create component that renders PDF
2. Use `<iframe>` with PDF.js or browser native PDF viewer
3. Support page parameter via URL hash or query param
4. Handle loading/error states

**Success criteria:**
- [ ] PDF embed renders in editor
- [ ] Page parameter navigates to correct page
- [ ] Shows loading state while PDF loads
- [ ] Shows error if PDF not found

---

## Task 3: Add PDF embed to live preview

**File to modify:** `src/extensions/livePreview.ts`

**Actions:**
1. Add widget for `![[...pdf]]` syntax
2. Parse PDF path and page number
3. Render `PdfEmbed` component
4. Handle click to open full PDF

**Success criteria:**
- [ ] `![[file.pdf#page=5]]` renders as embedded PDF
- [ ] Click opens PDF in default viewer
- [ ] Missing PDF shows error message

---

## Task 4: Test PDF embeds

**File to create:** `tests/e2e/pdf-embed.spec.ts`

**Tests:**
- [ ] Embed PDF without page number
- [ ] Embed PDF with page number
- [ ] Handle missing PDF
- [ ] Handle invalid page number

**Success criteria:**
- [ ] All tests pass

---

## Completion

When ALL tasks complete and tests pass, add this exact marker on its own line:

PROMISE_COMPLETE_TAG
