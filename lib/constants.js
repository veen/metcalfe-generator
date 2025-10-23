export const MIN_NODES = 3;
export const MAX_RADIUS = 320;
export const MAX_NODE_RADIUS = 18;
export const CANVAS_PADDING = 48;
export const FIXED_CANVAS_HEIGHT = 2 * (MAX_RADIUS + MAX_NODE_RADIUS) + CANVAS_PADDING;
export const DEFAULT_CAPTURE_ASPECT = '1:1';
export const DOWNLOAD_CAPTURE_FPS = 30;

export const PLAY_ICON_PATH = 'M3 2.5l6 3.5-6 3.5z';
export const PAUSE_ICON_PATH = 'M3 2.5h2v7H3zm4 0h2v7H7z';

export const ALL_NODE_COLORS = [
  '#3a725e',
  '#375d8f',
  '#89c4f4',
  '#b84c38',
  '#e6964e',
  '#8b5e3c',
  '#f1a99b',
  '#0c5b8f',
  '#1d8a6d',
  '#ffb347'
];

export const DEFAULT_NODE_COLORS = [
  '#333333',
  '#737373',
  '#a6a6a6',
  '#e6e6e6',
];

export const DEFAULT_STATE = {
  nodeCount: 36,
  nodeRadius: 11,
  radius: 320,
  lineWidth: 0.5,
  lineColor: '#646464',
  backgroundColor: '#ffffff',
  pattern: 'circular-alternating',
  buildRate: 6,
  animate: true,
  nodeColors: DEFAULT_NODE_COLORS,
  captureAspect: DEFAULT_CAPTURE_ASPECT,
};
