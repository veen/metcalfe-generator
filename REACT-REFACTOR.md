# Next.js + TypeScript Refactor Plan

## Overview
We will evolve the existing static ES module application into a modern Next.js site, leveraging TypeScript for type safety and shadcn/ui for consistent components. The final output remains a static export (SSG), but the source architecture becomes modular, testable, and easier to maintain. This plan outlines the phased approach, key architectural decisions, and migration tasks.

## Guiding Principles
- Preserve current functionality and visual fidelity while improving maintainability.
- Adopt TypeScript everywhere (app, hooks, utility modules) with strict settings.
- Keep the animation core in a dedicated canvas module, exposing a typed API to React components.
- Use shadcn/ui for layout primitives (tabs, sliders, dropdowns, buttons) to reduce custom CSS.
- Favor incremental migration: scaffold Next.js + TS foundation, then port functionality module by module.
- Ensure the app still builds to a static bundle (`next export`) for GitHub Pages hosting.

## Architecture & Project Structure
- Root project becomes a Next.js 14+ app (App Router).
- Suggested structure:
  ```
  /app
    /interactive-network
      page.tsx (primary route)
      layout.tsx (if shared layout)
    /api (future-proof placeholder, optional)
  /components
    /canvas
      animator-canvas.tsx (typed wrapper around canvas renderer)
    /controls
      pattern-selector.tsx
      palette-editor.tsx
      playback-toggle.tsx
      download-panel.tsx
    /ui (shadcn-generated primitives)
  /lib
    canvas
      renderer.ts (refined TypeScript port of existing renderer)
      positions.ts (math helpers)
    state
      store.ts (Zustand or custom context-based store)
      types.ts
    download
      capture-dimensions.ts
      recorder.ts
  /styles (Tailwind via shadcn config + global CSS)
  /public (static assets if needed)
  ```
- State management: adopt Zustand or React context with reducers. Zustand provides a simple typed store without prop drilling.
- Styling: configure Tailwind (shadcn requirement). Migrate existing CSS into Tailwind utility classes or scoped CSS modules where needed.

## Tooling & Setup Tasks
1. Initialize Next.js with TypeScript (`npx create-next-app@latest --ts`), choose App Router, ESLint, Tailwind.
2. Integrate shadcn/ui:
   - Install `npm install shadcn-ui@latest` (or follow updated setup instructions).
   - Configure Tailwind and shadcn components.
   - Generate required primitives (`button`, `tabs`, `input`, `slider`, `form`, etc.).
3. Configure linting & formatting:
   - Enable strict TypeScript mode ("strict": true).
   - Add ESLint rules aligned with Next.js recommendations.
   - Add Prettier integration for consistent formatting.
4. Testing scaffolding:
   - Set up Vitest or Jest for unit tests.
   - Add Playwright or Cypress for future E2E (optional, plan basis only).

## Migration Phases

### Phase 1: Scaffolding & Baseline
- Create a new branch `react-refactor`.
- Run create-next-app in a subdirectory or new repo, migrate git history or set up monorepo if desired.
- Port static assets (`index.html` content) into a Next.js page `app/interactive-network/page.tsx` with placeholder components (no animation yet).
- Verify Tailwind + shadcn configuration by recreating basic layout shells (header, sections, tabs).

### Phase 2: State & Types
- Define TypeScript types for app state (`NetworkState`, `PaletteColor`, `PatternType`, etc.).
- Implement Zustand store in `lib/state/store.ts` to mirror current functionality: node count, radius, animation flags, colors, etc. Include actions for each control.
- Add selectors/hooks (e.g., `useNetworkState`) for components to read/update typed state.
- Write unit tests for state transitions (Vitest/Jest).

### Phase 3: Canvas Renderer Port
- Translate `lib/canvas-renderer.js` to TypeScript (`lib/canvas/renderer.ts`).
  - Refine `calculatePositions`, random color assignment, animation loop with strict types.
  - Expose a `createRenderer` factory returning typed methods (start, stop, resize, etc.).
- Create `components/canvas/animator-canvas.tsx`:
  - Use `useRef` + `useEffect` to mount the renderer once the canvas is available.
  - Subscribe to state changes via hooks, calling renderer methods accordingly.
  - Ensure cleanup on unmount (call renderer.stop, cleanup subscribers).
- Add tests for math helpers and (if possible) renderer logic using headless canvas mocks.

### Phase 4: UI Components with shadcn
- For each control panel:
  - **Structure panel**: use shadcn `Slider`, `Tabs`, `Button`. Bind to Zustand actions.
  - **Colors panel**: create `palette-editor.tsx` using shadcn `Card`, `Button`, `Input`. Manage dynamic color rows using React state derived from store.
  - **Download panel**: assemble aspect tabs, status text, download button using shadcn `Tabs`, `Alert`, `Button`.
- Factor shared UI patterns (labels, control rows) into small reusable components.
- Replace inline styles with Tailwind classes; keep custom CSS minimal (for canvas size, etc.).

### Phase 5: Download Feature Integration
- Move download modules (`capture-dimensions`, `recorder`) into `lib/download` with TypeScript types.
- Create React hook `useDownloadController`:
  - Encapsulate logic currently held in `attachDownloadControls`.
  - Manage component refs for aspect buttons, download button, status message via React state.
  - Provide methods `startDownload`, `isSupported`, `status`.
- Update the Download panel component to leverage the hook and React state instead of DOM querying.
- Ensure canvas reference (from renderer) is passed to hook, possibly via context or direct prop.

### Phase 6: Layout & Routing
- Build a shared layout (`app/layout.tsx`) with site metadata, global header/footer.
- Ensure the interactive network page is available at `/interactive-network` and optionally as the root route.
- Add metadata (Open Graph tags, manifest) in Next.js config.

### Phase 7: Static Export & Deployment
- Configure `next.config.js` for static export (`output: 'export'`).
- Add script `npm run build && npm run export` generating `out/` for GitHub Pages deployment.
- Update GitHub workflow or manual instructions to deploy from `out/`.

### Phase 8: Cleanup & Documentation
- Remove legacy static files or keep them under `legacy/` for historical reference until fully migrated.
- Update README with new development instructions (Next.js scripts, shadcn usage, testing commands).
- Document architectural decisions in `docs/` (state management, renderer integration, download logic).

## Risk & Mitigation
- **Renderer integration**: ensure canvas libs work in SSR context by guarding with `useEffect` (client only). Use Next.js dynamic import with `ssr: false` if needed.
- **MediaRecorder API**: only available client-side; guard against SSR by checking typeof window.
- **Shadcn + Tailwind**: ensure design tokens replicate existing style. Some custom CSS may remain.
- **Static Export**: confirm features (MediaRecorder, canvas) don’t rely on server APIs.

## Timeline (Rough)
1. Week 1: Project setup, Tailwind/shadcn configuration, base page layout.
2. Week 2: State management, TypeScript types, initial renderer port.
3. Week 3: UI components migration (Structure & Colors panels).
4. Week 4: Download flow migration, hooking up recorder logic.
5. Week 5: QA, regression testing, static export validation, docs update.

## Deliverables
- Next.js project with TypeScript, shadcn components, and Zustand store.
- Fully ported animation canvas with parity to current functionality.
- Automated linting/testing pipeline.
- Static export ready for deployment.
- Documentation (`README`, architecture notes, upgrade guides).

