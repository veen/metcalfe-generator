import { createState } from './state.js';
import { createRenderer } from './canvas-renderer.js';
import { attachControls } from './ui/controls.js';
import { attachPatternDropdown } from './ui/pattern-dropdown.js';
import { attachPalette } from './ui/palette.js';
import { attachPlayToggle } from './ui/play-toggle.js';
import { attachTabs } from './ui/tabs.js';
import { attachDownloadControls } from './ui/download.js';

const stateManager = createState();

const cleanupCallbacks = [];
const registerCleanup = (fn) => {
  if (typeof fn === 'function') {
    cleanupCallbacks.push(fn);
  }
};
const runCleanup = () => {
  while (cleanupCallbacks.length) {
    const fn = cleanupCallbacks.pop();
    try {
      fn();
    } catch (error) {
      console.error('Cleanup callback failed', error);
    }
  }
};

const canvas = document.getElementById('networkCanvas');
if (!canvas) {
  throw new Error('Canvas element not found.');
}

const renderer = createRenderer(canvas, stateManager);
renderer.resize();
renderer.start();

registerCleanup(attachControls({
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
}));

registerCleanup(attachPatternDropdown({
  dropdownEl: document.getElementById('patternDropdown'),
  triggerEl: document.getElementById('patternMenu'),
  outsideLabelEl: document.querySelector('label[for="patternMenu"]'),
  stateManager,
  renderer,
}));

registerCleanup(attachPalette({
  listEl: document.getElementById('nodeColorList'),
  addButton: document.getElementById('addNodeColor'),
  colorInput: document.getElementById('newNodeColor'),
  stateManager,
  renderer,
}));

registerCleanup(attachPlayToggle({
  button: document.getElementById('playToggle'),
  iconPathEl: document.getElementById('playToggleIconPath'),
  labelEl: document.getElementById('playToggleLabel'),
  stateManager,
  renderer,
}));

registerCleanup(attachTabs({
  tabs: document.querySelectorAll('.control-pane > .tabs[role="tablist"] > .tab'),
  panels: document.querySelectorAll('.controls-card .panel'),
}));

const downloadController = attachDownloadControls({
  stateManager,
  renderer,
  canvas,
  elements: {
    aspectButtons: document.querySelectorAll('#panel-download .aspect-tab'),
    downloadButton: document.getElementById('downloadVideoButton'),
    status: document.getElementById('downloadStatus'),
  },
  tab: document.getElementById('tab-download'),
  panel: document.getElementById('panel-download'),
});

void downloadController;

window.addEventListener('beforeunload', runCleanup, { once: true });
window.addEventListener('pagehide', runCleanup, { once: true });

let resizeRaf = null;
window.addEventListener('resize', () => {
  if (resizeRaf !== null) return;
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = null;
    renderer.resize();
  });
});
