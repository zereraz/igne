# Audio/Video Embed Support

Implement audio and video embeds: `![[audio.mp3]]`, `![[video.mp4]]`

## Context

Audio and video embeds allow multimedia content directly in notes. Essential for podcasts, lectures, and recorded content.

**Reference:** Obsidian embed syntax for media files

## Goal

- `![[audio.mp3]]` embeds HTML5 audio player
- `![[video.mp4]]` embeds HTML5 video player
- Support for common formats (mp3, mp4, webm, ogg, wav, etc.)

---

## Task 1: Detect media file types

**File to create:** `src/utils/mediaTypes.ts`

**Actions:**
1. Define audio extensions: `.mp3`, `.wav`, `.ogg`, `.m4a`, `.flac`, `.webm` (audio)
2. Define video extensions: `.mp4`, `.webm`, `.ogv`, `.mov`, `.avi`, `.mkv`
3. Create helper function `getMediaType(filename)`

**Success criteria:**
- [ ] Returns 'audio' for audio files
- [ ] Returns 'video' for video files
- [ ] Returns null for non-media files

---

## Task 2: Create audio embed widget

**File to create:** `src/components/AudioEmbed.tsx`

**Actions:**
1. Use HTML5 `<audio>` element
2. Add controls (play, pause, volume, seek)
3. Show filename/duration
4. Handle missing file

**Success criteria:**
- [ ] Audio player renders with controls
- [ ] Can play/pause audio
- [ ] Shows error if file not found

---

## Task 3: Create video embed widget

**File to create:** `src/components/VideoEmbed.tsx`

**Actions:**
1. Use HTML5 `<video>` element
2. Add controls (play, pause, volume, fullscreen)
3. Support poster image
4. Handle missing file

**Success criteria:**
- [ ] Video player renders with controls
- [ ] Can play/pause video
- [ ] Shows error if file not found

---

## Task 4: Add media embeds to live preview

**File to modify:** `src/extensions/livePreview.ts`

**Actions:**
1. Add widget detection for audio/video files
2. Render appropriate component
3. Handle click to open in external player

**Success criteria:**
- [ ] `![[audio.mp3]]` renders audio player
- [ ] `![[video.mp4]]` renders video player
- [ ] Missing files show error

---

## Task 5: Test media embeds

**File to create:** `tests/e2e/media-embed.spec.ts`

**Tests:**
- [ ] Embed audio file
- [ ] Embed video file
- [ ] Handle missing media files
- [ ] Test various formats

**Success criteria:**
- [ ] All tests pass

---

## Completion

When ALL tasks complete and tests pass, add this exact marker on its own line:

PROMISE_COMPLETE_TAG
