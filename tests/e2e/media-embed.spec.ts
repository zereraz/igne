import { test, expect } from '../fixtures';

test.describe('Audio Embeds', () => {
  test.beforeEach(async ({ app }) => {
    await app.goto();
    await app.createNewFile('audio-test.md');
  });

  test('renders audio player for MP3 file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[podcast.mp3]]');

    // Move cursor away from embed
    await app.page.keyboard.press('End');

    await app.editor.waitForAudioWidget();
    expect(await app.editor.hasAudioWidget('podcast.mp3')).toBe(true);
  });

  test('renders audio player for WAV file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[recording.wav]]');

    await app.page.keyboard.press('End');

    await app.editor.waitForAudioWidget();
    expect(await app.editor.hasAudioWidget('recording.wav')).toBe(true);
  });

  test('renders audio player for OGG file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[audio.ogg]]');

    await app.page.keyboard.press('End');

    await app.editor.waitForAudioWidget();
    expect(await app.editor.hasAudioWidget('audio.ogg')).toBe(true);
  });

  test('renders audio player for M4A file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[music.m4a]]');

    await app.page.keyboard.press('End');

    await app.editor.waitForAudioWidget();
    expect(await app.editor.hasAudioWidget('music.m4a')).toBe(true);
  });

  test('renders audio player for FLAC file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[lossless.flac]]');

    await app.page.keyboard.press('End');

    await app.editor.waitForAudioWidget();
    expect(await app.editor.hasAudioWidget('lossless.flac')).toBe(true);
  });

  test('shows error for missing audio file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[missing.mp3]]');

    await app.page.keyboard.press('End');

    // Error message should be shown
    const audioContainer = app.page.locator('.cm-audio-container');
    await expect(audioContainer).toBeVisible();
    expect(await app.editor.hasAudioError()).toBe(true);
  });

  test('audio widget has filename label', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[podcast.mp3]]');

    await app.page.keyboard.press('End');

    const label = app.page.locator('.cm-audio-label');
    await expect(label).toBeVisible();
    await expect(label).toHaveText('podcast.mp3');
  });

  test('shows raw embed syntax when cursor is inside', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[audio.mp3]]');

    // Click near the start of the embed
    const editor = app.page.locator('.cm-content');
    await editor.click({ position: { x: 10, y: 20 } });

    // The audio widget should not be visible when cursor is inside
    const audioWidget = app.page.locator('.cm-audio-container');
    await expect(audioWidget).not.toBeVisible();
  });

  test('handles multiple audio files', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`![[track1.mp3]]
![[track2.mp3]]
![[track3.mp3]]`);

    await app.page.keyboard.press('End');

    const audioWidgets = app.page.locator('.cm-audio-container');
    await expect(audioWidgets).toHaveCount(3);
  });
});

test.describe('Video Embeds', () => {
  test.beforeEach(async ({ app }) => {
    await app.goto();
    await app.createNewFile('video-test.md');
  });

  test('renders video player for MP4 file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[video.mp4]]');

    // Move cursor away from embed
    await app.page.keyboard.press('End');

    await app.editor.waitForVideoWidget();
    expect(await app.editor.hasVideoWidget('video.mp4')).toBe(true);
  });

  test('renders video player for WebM file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[animation.webm]]');

    await app.page.keyboard.press('End');

    await app.editor.waitForVideoWidget();
    expect(await app.editor.hasVideoWidget('animation.webm')).toBe(true);
  });

  test('renders video player for MOV file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[movie.mov]]');

    await app.page.keyboard.press('End');

    await app.editor.waitForVideoWidget();
    expect(await app.editor.hasVideoWidget('movie.mov')).toBe(true);
  });

  test('renders video player for OGV file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[video.ogv]]');

    await app.page.keyboard.press('End');

    await app.editor.waitForVideoWidget();
    expect(await app.editor.hasVideoWidget('video.ogv')).toBe(true);
  });

  test('renders video player for MKV file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[video.mkv]]');

    await app.page.keyboard.press('End');

    await app.editor.waitForVideoWidget();
    expect(await app.editor.hasVideoWidget('video.mkv')).toBe(true);
  });

  test('renders video player for AVI file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[video.avi]]');

    await app.page.keyboard.press('End');

    await app.editor.waitForVideoWidget();
    expect(await app.editor.hasVideoWidget('video.avi')).toBe(true);
  });

  test('shows error for missing video file', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[missing.mp4]]');

    await app.page.keyboard.press('End');

    // Error message should be shown
    const videoContainer = app.page.locator('.cm-video-container');
    await expect(videoContainer).toBeVisible();
    expect(await app.editor.hasVideoError()).toBe(true);
  });

  test('video widget has filename label', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[video.mp4]]');

    await app.page.keyboard.press('End');

    const label = app.page.locator('.cm-video-label');
    await expect(label).toBeVisible();
    await expect(label).toHaveText('video.mp4');
  });

  test('shows raw embed syntax when cursor is inside', async ({ app }) => {
    await app.editor.setCodeMirrorContent('![[video.mp4]]');

    // Click near the start of the embed
    const editor = app.page.locator('.cm-content');
    await editor.click({ position: { x: 10, y: 20 } });

    // The video widget should not be visible when cursor is inside
    const videoWidget = app.page.locator('.cm-video-container');
    await expect(videoWidget).not.toBeVisible();
  });

  test('handles multiple video files', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`![[video1.mp4]]
![[video2.mp4]]
![[video3.mp4]]`);

    await app.page.keyboard.press('End');

    const videoWidgets = app.page.locator('.cm-video-container');
    await expect(videoWidgets).toHaveCount(3);
  });
});

test.describe('Mixed Media Embeds', () => {
  test.beforeEach(async ({ app }) => {
    await app.goto();
    await app.createNewFile('mixed-test.md');
  });

  test('renders both audio and video widgets', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`![[audio.mp3]]
![[video.mp4]]`);

    await app.page.keyboard.press('End');

    expect(await app.editor.hasAudioWidget('audio.mp3')).toBe(true);
    expect(await app.editor.hasVideoWidget('video.mp4')).toBe(true);
  });

  test('handles media files with different cases', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`![[Audio.MP3]]
![[Video.MP4]]`);

    await app.page.keyboard.press('End');

    // Should still detect media types regardless of case
    const audioContainer = app.page.locator('.cm-audio-container');
    const videoContainer = app.page.locator('.cm-video-container');
    await expect(audioContainer).toHaveCount(1);
    await expect(videoContainer).toHaveCount(1);
  });

  test('handles media files in subdirectories', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`![[media/podcasts/episode.mp3]]
![[videos/tutorial.mp4]]`);

    await app.page.keyboard.press('End');

    const audioContainer = app.page.locator('.cm-audio-container');
    const videoContainer = app.page.locator('.cm-video-container');
    await expect(audioContainer).toHaveCount(1);
    await expect(videoContainer).toHaveCount(1);
  });

  test('does not render non-media files as media widgets', async ({ app }) => {
    await app.editor.setCodeMirrorContent(`![[note.md]]
![[image.png]]`);

    await app.page.keyboard.press('End');

    // Should not render audio or video widgets
    const audioContainer = app.page.locator('.cm-audio-container');
    const videoContainer = app.page.locator('.cm-video-container');
    await expect(audioContainer).toHaveCount(0);
    await expect(videoContainer).toHaveCount(0);
  });
});
