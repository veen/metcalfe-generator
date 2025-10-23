# MCP QA Loop (Agent Workflow)

1. Phase Guardrails
   1. Assume `python3 -m http.server 8000` is serving the repo root and the Chrome MCP sample server is running on `ws://localhost:59000`.
   2. Load `interactive-network.html` via the MCP Model panel using the endpoint above; confirm the page renders without console errors before any refactor work.

2. Baseline Capture
   1. Execute the MCP macro `smoke-baseline` (sequence: navigate, click pattern label then option, adjust node count slider, toggle Play/Pause, capture screenshot, grab bounding boxes for `#patternDropdown`, and export console logs).
   2. Save artifacts under `artifacts/pre-refactor/` (e.g., `ui-baseline.png`, `ui-metrics.json`, `console-baseline.txt`); any warnings should halt the refactor plan and prompt investigation.

3. Loop After Each Refactor Phase
   1. When a refactor phase completes (per plan below), rerun the MCP macro for that phase name (e.g., `smoke-phase-2` mirrors `smoke-baseline` but writes to `artifacts/phase-2/`).
   2. Compare the latest screenshot and metrics with the previous phase; if pixel or layout diffs occur, stop, log the regression in `artifacts/diff-report.md`, and request a human review before proceeding.
   3. Ensure console remains clean; if new warnings appear, annotate them in the phase report and block the next refactor step until resolved.

4. Final Verification
   1. After Phase 4, run `smoke-final` (same macro, final destination `artifacts/post-refactor/`).
   2. Summarize pass/fail status and any notable measurements in `artifacts/summary.md` for inclusion in the eventual PR.

# Refactor Plan

1. Phase 1: Inventory Existing Structure ✅
   1. Review `interactive-network.html` to catalogue the inline `<style>` block (roughly lines 18-255) and the monolithic `<script>` block (roughly lines 320-920).
   2. Identify logical groupings within the JavaScript: constants, state defaults, canvas renderer, geometry helpers, UI bindings (controls, dropdown, palette, tabs), and utility helpers.
   3. Note dependencies between sections (e.g., renderer consuming state mutations, dropdown needing play-toggle resets) to guide module boundaries without introducing circular imports.

2. Phase 2: Define Target Layout
   1. Establish the file structure: `interactive-network.html`, `styles/interactive-network.css`, `lib/app.js`, `lib/constants.js`, `lib/state.js`, `lib/canvas-renderer.js`, and scoped UI modules under `lib/ui/`.
   2. Assign responsibilities per module (constants hold immutable values, state manages data + setters, renderer encapsulates drawing/resize/animation, UI modules handle specific DOM clusters, `app.js` orchestrates wiring).
   3. Specify import relationships so each module stays one-directional (UI modules import state setters or callbacks provided by `app.js`; renderer receives injected state and callbacks).

3. Phase 3: Extract Modules and Assets
   1. Create `styles/` and `lib/ui/` directories, migrate the inline CSS into `styles/interactive-network.css`, and link it from the HTML head.
   2. Extract constants and default data into `lib/constants.js`; move state initialization and mutation helpers into `lib/state.js`.
   3. Relocate canvas setup, resize logic, animation loop, and geometry helpers into `lib/canvas-renderer.js`, exposing a factory (e.g., `createRenderer(state, canvas)`).
   4. Port each UI concern into dedicated modules: `lib/ui/controls.js`, `lib/ui/pattern-dropdown.js`, `lib/ui/palette.js`, `lib/ui/play-toggle.js`, and `lib/ui/tabs.js`, each exporting an `attach` function that accepts DOM nodes and state hooks.
   5. Rewrite `interactive-network.html` to include semantic markup only and load the app via `<script type="module" src="lib/app.js"></script>`, ensuring all imports remain relative and compatible with static hosting.

4. Phase 4: Validate Static Deployment
   1. Serve the repository via a simple static server (`python -m http.server` or similar) to confirm ES module imports resolve without bundling.
   2. Manually test major interactions (pattern dropdown including label click, range updates, color palette editing, play toggle) to verify parity with the pre-refactor behavior.
   3. Document the new module layout and maintenance notes in the README or project docs so future contributors understand the static-friendly structure.
