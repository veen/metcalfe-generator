# Download Tab Manual QA Checklist

## Environment Setup
- Serve the repo statically (`python3 -m http.server 8000`) from the project root.
- Open `http://localhost:8000/interactive-network.html` in a Chromium-based browser with MediaRecorder support (Chrome 120+ recommended).
- Ensure speakers are muted (no audio capture) and close other tabs that might claim camera/mic streams.

## 1. Baseline 1:1 Recording
- Configure an eye-catching network (e.g., node count 40, build rate 8, alternate pattern).
- Switch to **Download** tab; confirm status reports a `1:1` capture size.
- Click `Download video` once the animation is in the desired pose.
- Wait for recording to finish automatically; verify UI controls remain disabled during capture.
- Open the downloaded `.webm`; confirm playback duration matches slider duration and colors/pattern align with on-screen animation.

## 2. 16:9 Recording
- Select `16:9` aspect ratio; status should update with new capture dimensions.
- Repeat the previous recording flow.
- Inspect the resulting video for horizontal letterboxing and undistorted node geometry.

## 3. Manual Stop / Partial Clip
- Start a recording and manually stop it mid-way via DevTools > console (`downloadVideoButton.click()` after `state.animate` toggles false) or by lowering the duration to ~3s.
- Ensure the saved clip is playable even when interrupted.

## 4. Tab / Control Regression
- During a capture, ensure `Structure`/`Colors` tabs are locked and inputs cannot be adjusted.
- After download completes, confirm previously-selected tab and animate/pause state are restored.

## 5. Unsupported Browser Fallback
- Open the page in Safari (or Chrome with `chrome://flags` disabling MediaRecorder).
- Verify the Download tab shows the fallback message and all download controls remain disabled.

## 6. Smoke Macro Reminder
- After manual checks, run the MCP smoke macros (`smoke-baseline`, `smoke-final`) and compare artifacts under `artifacts/`.
- Note any visual/console regressions before sign-off.

Document findings (pass/fail, browser, OS) and attach sample clips for archival.
