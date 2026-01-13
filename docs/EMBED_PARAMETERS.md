# Embed Parameters

Embed parameters allow fine control over how embeds are displayed - sizing, positioning, and content selection. This feature provides full Obsidian parity for embed syntax.

## Syntax

Embed parameters are appended to the target file path using `#` and separated by `&` or `#`:

```
![[filename.ext#param=value]]
![[filename.ext#param1=value1&param2=value2]]
![[filename.ext#param1=value1#param2=value2]]
```

## Supported Parameters

### Image Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `width` | number or string | Set image width in pixels or percentage | `![[img.png#width=300]]` or `![[img.png#width=50%]]` |
| `height` | number or string | Set image height in pixels or percentage | `![[img.png#height=400]]` or `![[img.png#height=50%]]` |
| `alt` | string | Set alt text for accessibility | `![[img.png#alt=Description]]` |
| `title` | string | Set title attribute (tooltip) | `![[img.png#title=Image Title]]` |
| `align` | left, center, right | Align image within container | `![[img.png#align=center]]` |

**Examples:**

```markdown
![[screenshot.png#width=600]]
![[photo.png#width=50%&height=300]]
![[diagram.png#width=800#align=center]]
![[logo.png#alt=Company Logo#title=Our Logo]]
```

### Video Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `width` | number or string | Set video width in pixels or percentage | `![[video.mp4#width=600]]` |
| `height` | number or string | Set video height in pixels or percentage | `![[video.mp4#height=400]]` |
| `autoplay` | boolean | Auto-play video when loaded | `![[video.mp4#autoplay]]` |
| `loop` | boolean | Loop video continuously | `![[video.mp4#loop]]` |
| `muted` | boolean | Mute video by default | `![[video.mp4#muted]]` |
| `controls` | boolean | Show video controls (default: true) | `![[video.mp4#controls=0]]` to hide |
| `align` | left, center, right | Align video within container | `![[video.mp4#align=center]]` |

**Examples:**

```markdown
![[demo.mp4#width=800&height=600]]
![[intro.mp4#autoplay&muted]]
![[loop.mp4#loop]]
![[background.mp4#width=100%&controls=0]]
```

### PDF Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `width` | number or string | Set PDF viewer width | `![[doc.pdf#width=800]]` |
| `height` | number or string | Set PDF viewer height | `![[doc.pdf#height=600]]` |
| `page` | number | Open PDF at specific page | `![[doc.pdf#page=5]]` |
| `toolbar` | boolean | Show PDF toolbar (default: true) | `![[doc.pdf#toolbar=0]]` to hide |
| `align` | left, center, right | Align PDF within container | `![[doc.pdf#align=center]]` |

**Examples:**

```markdown
![[manual.pdf#width=800&height=600]]
![[report.pdf#page=3]]
![[slides.pdf#page=1&toolbar=0]]
```

### Alignment

The `align` parameter works for images, videos, and PDFs:

- `left`: Align to the left (margin-right: auto)
- `center`: Center horizontally (margin-left: auto, margin-right: auto)
- `right`: Align to the right (margin-left: auto)

## Value Types

### Numbers
Numeric values are interpreted as pixels:
```markdown
![[img.png#width=300]]   # 300px wide
```

### Percentages
Values ending with `%` are treated as percentages:
```markdown
![[img.png#width=50%]]   # 50% of container width
```

### Booleans
Boolean parameters can be specified as:
- Flag alone: `#autoplay` (true)
- `true`/`1`: `#autoplay=true` or `#autoplay=1` (true)
- `false`/`0`: `#autoplay=false` or `#autoplay=0` (false)

### Strings
String values can contain spaces:
```markdown
![[img.png#alt=My beautiful image]]
```

## Separator Syntax

You can use either `&` or `#` to separate multiple parameters:

```markdown
![[img.png#width=300&height=200]]
![[img.png#width=300#height=200]]
![[img.png#width=300&height=200#align=center]]
```

All three examples above are equivalent.

## File Paths

Embed parameters work with:
- Simple filenames: `![[image.png#width=300]]`
- Paths with spaces: `![[my file.png#width=300]]`
- Subdirectories: `![[assets/images/photo.png#width=300]]`

## Limitations vs Obsidian

### Full Parity
- ✅ All image sizing parameters (width, height, percentages)
- ✅ Image alignment (left, center, right)
- ✅ Alt and title text for images
- ✅ Video parameters (autoplay, loop, muted, controls)
- ✅ PDF page parameter
- ✅ PDF toolbar control

### Not Yet Implemented
- ❌ Heading embeds with `#heading=...` or `#block=...`
- ❌ `#collapse` parameter for content folding
- ❌ `#no-heading` parameter for heading embeds
- ❌ `#max-lines` parameter for content truncation

### Browser Limitations
- PDF `#page=` parameter relies on browser's built-in PDF viewer support
- Video autoplay may be blocked by browser autoplay policies (use `#muted` for better compatibility)

## Implementation Details

### Parsing
Parameters are parsed by `parseEmbedTarget()` in `src/utils/embedParams.ts`:

```typescript
const { path, params } = parseEmbedTarget('image.png#width=300&height=200');
// Returns: { path: 'image.png', params: { width: 300, height: 200 } }
```

### File Type Detection
File type is determined by extension:
- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`, `.bmp`, `.ico`
- Videos: `.mp4`, `.webm`, `.ogg`, `.mov`, `.avi`, `.mkv`
- PDFs: `.pdf`

### Widget Rendering
Different widget types are used based on file extension:
- `ImageWidget` for images (supports width, height, alt, title, align)
- `VideoWidget` for videos (supports width, height, autoplay, loop, muted, controls, align)
- `PdfWidget` for PDFs (supports width, height, page, toolbar, align)
- `EmbedWidget` for other files (notes, etc.)

## CSS Classes

Widgets receive alignment classes:

```css
.cm-image-align-left { display: block; margin-right: auto; }
.cm-image-align-center { display: block; margin-left: auto; margin-right: auto; }
.cm-image-align-right { display: block; margin-left: auto; }

.cm-video-align-left { ... }
.cm-video-align-center { ... }
.cm-video-align-right { ... }

.cm-pdf-align-left { ... }
.cm-pdf-align-center { ... }
.cm-pdf-align-right { ... }
```

## Testing

Unit tests are in `src/utils/__tests__/embedParams.test.ts`.

E2E tests are in `tests/e2e/embed-params.spec.ts`.

Run tests with:
```bash
npm test
npm run test:e2e
```

## Future Enhancements

Planned features for embed parameters:

1. **Heading/Block Embeds**
   - `![[note.md#heading=Introduction]]` - Embed specific heading
   - `![[note.md#block=block-id]]` - Embed specific block
   - `#collapse` - Show collapsed preview with expand toggle
   - `#no-heading` - Hide heading in heading embed
   - `#max-lines=N` - Truncate content after N lines

2. **Advanced Image Options**
   - `#fit=contain|cover` - Image fit mode
   - `#quality=low|high` - Image quality hint

3. **Content Filters**
   - `#tags=tag1,tag2` - Filter embed by tags
   - `#query=search` - Filter embed by search query
