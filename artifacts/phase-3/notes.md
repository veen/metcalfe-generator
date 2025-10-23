# Phase 3 Extraction

- Moved all styles from `interactive-network.html` into `styles/interactive-network.css` and linked via `<link>`.
- Created ES module scaffold:
  - `lib/constants.js` for immutable values and defaults.
  - `lib/state.js` exposing a simple pub/sub state manager.
  - `lib/canvas-renderer.js` encapsulating canvas sizing, geometry, and animation loop.
  - UI modules under `lib/ui/` for controls, pattern dropdown, palette, play toggle, tabs.
  - `lib/app.js` wires state, renderer, and UI modules, attaches resize handler, and boots animation.
- HTML now references `lib/app.js` as a module and contains semantic markup only.
