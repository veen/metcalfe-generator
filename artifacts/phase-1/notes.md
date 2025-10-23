# Phase 1 Inventory

- HTML inline `<style>` block spans lines 7-371 (~360 lines) covering typography, layout, tabs, dropdown, slider, buttons, etc.
- Inline `<script>` block lines 479-904 (~425 lines) structured as a self-invoking function containing:
  - Constants: node counts, colors, icons, canvas sizing.
  - Mutable `state` object and animation flags.
  - Rendering helpers: `resizeCanvas`, `calculatePositions`, `drawFrame`, `loop`.
  - UI bindings: range control handlers, dropdown logic, tabs, color palette management, play toggle.
  - Utility functions: `clamp`, `lerp`, `updateRangeProgress`.
- Dependencies: renderer consumes `state` and `visibleNodeProgress`; UI controls mutate `state` and trigger renderer updates; play toggle interacts with animation flags; dropdown updates `state.pattern` and resets animation flags.
- Identified logical module candidates matching plan: `constants`, `state`, `canvas-renderer`, `ui/*`, `app` orchestrator, separate stylesheet.
