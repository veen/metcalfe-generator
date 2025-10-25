# Coding Agent Guide

## Current Focus & Surfaces
- `index.html` is the public entry point hosted via GitHub Pages; it must stay self-contained (HTML + static assets) with no server-side requirements.
- Refactored front-end code now lives under `lib/` (ES modules) and `styles/`. Key modules: `lib/app.js` (bootstrap), `lib/canvas-renderer.js` (animation loop), `lib/state.js` (state container), and UI helpers in `lib/ui/`.
- Legacy CLI assets (`network-animation-generator.js`, `run-animation.sh`) remain but are not the primary maintenance surface; avoid breaking them unless explicitly asked.

## Development Basics
- Use Node 18+ for local tooling. There is no bundler—modules are loaded directly in the browser.
- Serve the repo statically for manual testing: `python3 -m http.server 8000` (or similar). Visit `http://localhost:8000/index.html`.
- Follow the style guide already in the JS/CSS: ES modules, two-space indentation, single quotes, minimal inline comments except for complex math/timing. Keep the control-pane footer inline (SVG logo embedded) and maintain the header/canvas column alignment.
- Begin each session by asking the user what branch name to use for the workstream unless the user has already provided one.
- After completing each instruction or task from the user, make a concise, descriptive commit before moving on to the next instruction.

## QA Workflow (Chrome MCP)
- We maintain MCP macros for regression checks. With the MCP server running at `ws://localhost:59000`, connect via the DevTools Model panel.
- Before and after significant changes, run the smoke macro (`smoke-baseline`, `smoke-phase-*`, `smoke-final`). These capture screenshots, bounding boxes, and console logs.
- Store artifacts under `artifacts/<phase>/` and compare against previous captures. Stop and report if UI layout, animation timing, or warnings deviate.

## Testing & Verification
- No automated test suite yet; rely on MCP captures plus manual interaction: run through pattern dropdown (including label click), node slider while paused and animating, palette add/remove, and play/pause toggle.
- If you introduce new logic, sketch lightweight smoke scripts (Node or browser-based) and keep them optional (`npm run smoke`).

## Download Capture
- A **Download** tab records the canvas to WebM/MP4 via the MediaRecorder API. Configure the animation first, switch to Download, pick the aspect ratio, and click `Download video`.
- While recording, all other tabs/controls are locked. The status line mirrors capture size and the button reactivates once the clip is ready.
- Compatibility: requires browsers supporting both `canvas.captureStream` and `MediaRecorder` (Chrome/Edge/Firefox recent builds). Safari and other unsupported environments show a fallback message and keep download controls disabled.
- Manual QA scenarios (aspect ratio passes, partial clip checks, tab regression) are outlined in `artifacts/manual-qa.md`; review them when touching the capture flow.
- Limitations: Safari/iOS lack `MediaRecorder`; recommend Screen Recording there. Captures run until the animation finishes, so very dense builds can yield large blobs—adjust build rate if you need shorter clips.

## Adding Features
- Treat `lib/app.js` as the orchestration layer: initialize new UI pieces or controls there, delegating logic to dedicated modules.
- Keep rendering math and animation timing within `lib/canvas-renderer.js`; expose explicit methods for new behaviours instead of reaching into internals.
- Place UI-specific code in `lib/ui/` (one file per component/control). Share constants via `lib/constants.js` and state mutations through `lib/state.js`.
- Add styles to `styles/styles.css`, grouped with existing sections (layout, controls, components). Avoid inline styles unless absolutely necessary.
- Update the MCP smoke macros or add a new macro whenever you ship a user-visible feature so the QA loop covers it.

## Git & Collaboration
- Branch naming typically follows the workstream (e.g., `refactor`, `ui-update`). Commit messages: imperative, short (`fix: restore paused progress behavior`).
- The repo may be in a dirty state; never reset or remove user changes. Use `git add -p` to stage only your work.

## Environment Notes
- Browser targets: modern Chromium/Firefox/Safari. Ensure features degrade gracefully (no build tools, rely on standard Web APIs).
- Optional developer dependencies (canvas/ffmpeg) support the CLI generator but are not required for front-end changes.

## When in Doubt
- Prioritize maintaining static deployability and visual fidelity of the animation.
- Document assumptions or required follow-up in `REFACTOR-PLAN.md` or a new `artifacts/` note so human collaborators can pick up confidently.
