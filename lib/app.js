import { createState } from './state.js';
import { createRenderer } from './canvas-renderer.js';
import { attachControls } from './ui/controls.js';
import { attachPatternDropdown } from './ui/pattern-dropdown.js';
import { attachPalette } from './ui/palette.js';
import { attachPlayToggle } from './ui/play-toggle.js';
import { attachTabs } from './ui/tabs.js';

const stateManager = createState();

const canvas = document.getElementById('networkCanvas');
if (!canvas) {
  throw new Error('Canvas element not found.');
}

const renderer = createRenderer(canvas, stateManager);
renderer.resize();
renderer.start();

attachControls({
  stateManager,
  renderer,
  elements: {
    nodeCount: {
      input: document.getElementById('nodeCount'),
      value: document.getElementById('nodeCountValue'),
    },
    nodeRadius: {
      input: document.getElementById('nodeRadius'),
      value: document.getElementById('nodeRadiusValue'),
    },
    radius: {
      input: document.getElementById('radius'),
      value: document.getElementById('radiusValue'),
    },
    lineWidth: {
      input: document.getElementById('lineWidth'),
      value: document.getElementById('lineWidthValue'),
    },
    buildRate: {
      input: document.getElementById('buildRate'),
      value: document.getElementById('buildRateValue'),
    },
    lineColorInput: document.getElementById('lineColor'),
    backgroundColorInput: document.getElementById('backgroundColor'),
  },
});

attachPatternDropdown({
  dropdownEl: document.getElementById('patternDropdown'),
  triggerEl: document.getElementById('patternMenu'),
  outsideLabelEl: document.querySelector('label[for="patternMenu"]'),
  stateManager,
  renderer,
});

attachPalette({
  listEl: document.getElementById('nodeColorList'),
  addButton: document.getElementById('addNodeColor'),
  colorInput: document.getElementById('newNodeColor'),
  stateManager,
  renderer,
});

attachPlayToggle({
  button: document.getElementById('playToggle'),
  iconPathEl: document.getElementById('playToggleIconPath'),
  labelEl: document.getElementById('playToggleLabel'),
  stateManager,
  renderer,
});

attachTabs({
  tabs: document.querySelectorAll('.tab'),
  panels: document.querySelectorAll('.panel'),
});

window.addEventListener('resize', () => {
  renderer.resize();
});
