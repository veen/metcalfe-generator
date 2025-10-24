import { CANVAS_PADDING } from '../constants.js';

export const parseAspectRatio = (value = '1:1') => {
  const match = /^([0-9]+)\s*:\s*([0-9]+)$/.exec(value);
  if (!match) {
    return { width: 1, height: 1, ratio: 1 };
  }
  const width = Number.parseInt(match[1], 10) || 1;
  const height = Number.parseInt(match[2], 10) || 1;
  return {
    width,
    height,
    ratio: width / height,
  };
};

const computeBaseExtent = (state) => {
  const diameter = (state.radius + state.nodeRadius) * 2;
  const extent = Math.round(diameter + CANVAS_PADDING);
  return Math.max(extent, 256);
};

export const computeCaptureDimensions = (state, aspectRatioValue) => {
  const { ratio } = parseAspectRatio(aspectRatioValue);
  const baseExtent = computeBaseExtent(state);
  if (ratio >= 1) {
    const height = baseExtent;
    const width = Math.round(height * ratio);
    return { width, height, ratio, baseExtent };
  }
  const width = baseExtent;
  const height = Math.round(width / ratio);
  return { width, height, ratio, baseExtent };
};

export const computeCaptureViewport = ({ width, height, baseExtent }) => {
  const drawWidth = baseExtent;
  const drawHeight = baseExtent;
  const offsetX = Math.max(0, Math.round((width - drawWidth) / 2));
  const offsetY = Math.max(0, Math.round((height - drawHeight) / 2));
  return {
    drawWidth,
    drawHeight,
    offsetX,
    offsetY,
  };
};
