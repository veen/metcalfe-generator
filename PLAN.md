# Download Feature Plan (MediaRecorder-based)

## Overview
Add a “Download” tab to the UI that captures the canvas animation and enables users to download a WebM/MP4 video. The implementation will use the MediaRecorder API (or fall back gracefully when unsupported).

## Step-by-Step Plan

1. **UI Extension**
   1. Add a third tab labelled “Download” to the tabs array in `index.html` (and the associated modules). ✅
   2. Create a new panel in the control card with controls for: ✅
      - Aspect ratio selection (`1:1`, `16:9`). ✅
      - Video duration field (defaults to current `state.buildRate` × animation span or a preset value). ✅
      - Download button that begins capture immediately and stays disabled until capture finishes.
      - Status messaging to indicate capture progress or unsupported browser.
   3. Ensure tabs module (`lib/ui/tabs.js`) handles the new tab/panel. ✅

2. **Aspect Ratio Handling**
   1. When the Download tab is selected, use chosen aspect ratio to compute canvas capture size. ✅
      - `1:1` → matching current diameter. ✅
      - `16:9` → adjust `canvas` CSS (or use an offscreen canvas) to render frames in the requested ratio. ✅
   2. Provide utilities to map the animation radius settings to the selected aspect ratio without distorting node placement (e.g., letterbox or adjust radius). ✅

3. **MediaRecorder Integration**
   1. Introduce a download controller module (`lib/ui/download.js`). ✅
      - Accepts the main renderer, state manager, and the canvas element. ✅
      - Exposes a single “Download” handler. ✅
   2. Use `canvas.captureStream(fps)` to obtain a stream at configurable FPS (e.g., 30). ✅
   3. Create a `MediaRecorder` from the stream using `video/webm;codecs=vp9` (fallback to `video/webm;codecs=vp8` or `video/mp4;codecs=h264` when supported, by checking `MediaRecorder.isTypeSupported`). ✅
   4. On “Download” click: ✅
      - Disable the button and show progress messaging. ✅
      - Reset the renderer progress and state to a deterministic starting point. ✅
      - Start MediaRecorder and animation playback (force `state.animate = true` for capture). ✅
      - Stop capture automatically when duration elapses or animation completes. ✅
   5. Collect data chunks in an array through `recorder.ondataavailable`.
   6. When capture completes:
      - Stop MediaRecorder.
      - Combine chunks into a Blob and create an object URL.
      - Auto-trigger the download with a generated filename and re-enable the button.

4. **State & Renderer Coordination**
   1. Extend `canvas-renderer.js` with hooks to:
      - Restart from the initial state for recorded sessions.
      - Notify the download module when the animation completes.
   2. Allow the download module to temporarily disable user controls (e.g., while recording) to avoid conflicting interactions.

5. **Graceful Fallback**
   1. If MediaRecorder or `canvas.captureStream` is not available, display an informative message and disable the download controls.
   2. Provide a manual fallback suggestion (e.g., use an external screen recorder) or allow frame export.

6. **Testing & QA**
   1. Manual QA: run through download flows for both aspect ratios, verifying the resulting WebM/MP4 plays correctly.
   2. Ensure cancelling/stopping mid-way generates a usable partial clip.
   3. Confirm that returning to Design/Colors tabs leaves the app in a consistent state (play/pause toggles, node counts).
   4. Performance trace after integration to ensure MediaRecorder doesn’t introduce console errors.

7. **Documentation**
   1. Update `AGENTS.md` (or README) with steps for recording and compatibility notes.
   2. Mention any known limitations (e.g., Safari MP4 restrictions or long recordings impacting memory).
