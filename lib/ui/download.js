import { CANVAS_PADDING } from '../constants.js';

const parseAspectRatio = (value) => {
  const match = /^(\d+)\s*:\s*(\d+)$/.exec(value);
  if (!match) {
    return { width: 1, height: 1, ratio: 1 };
  }
  const width = Number.parseInt(match[1], 10);
  const height = Number.parseInt(match[2], 10);
  if (!width || !height) {
    return { width: 1, height: 1, ratio: 1 };
  }
  return { width, height, ratio: width / height };
};

const computeBaseExtent = (state) => {
  const diameter = (state.radius + state.nodeRadius) * 2;
  const extent = Math.round(diameter + CANVAS_PADDING);
  return Math.max(extent, 256);
};

const computeCaptureDimensions = (state, aspectRatioValue) => {
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

export function attachDownloadControls({
  stateManager,
  elements = {},
  tab,
  panel,
}) {
  if (!stateManager) return null;

  const { aspect, duration, downloadButton, status } = elements;
  const { state, set, subscribe } = stateManager;

  const capture = {
    aspectRatio: state.captureAspect,
    duration: state.captureDuration,
    dimensions: computeCaptureDimensions(state, state.captureAspect),
  };

  const setStatusMessage = (message) => {
    if (!status) return;
    status.textContent = message;
  };

  const applyUiState = () => {
    if (aspect) {
      aspect.value = capture.aspectRatio;
    }
    if (duration) {
      duration.value = String(capture.duration);
    }
  };

  const updateCaptureDimensions = () => {
    capture.dimensions = computeCaptureDimensions(stateManager.state, capture.aspectRatio);
    if (downloadButton) {
      downloadButton.dataset.captureWidth = String(capture.dimensions.width);
      downloadButton.dataset.captureHeight = String(capture.dimensions.height);
      downloadButton.dataset.captureAspect = capture.aspectRatio;
    }
    setStatusMessage(
      `Ready · ${capture.dimensions.width}×${capture.dimensions.height}px (${capture.aspectRatio})`
    );
  };

  const ensureCaptureUpdateForActivePanel = () => {
    if (!panel || panel.classList.contains('panel-active')) {
      updateCaptureDimensions();
    }
  };

  const handleAspectChange = () => {
    if (!aspect) return;
    capture.aspectRatio = aspect.value;
    set('captureAspect', capture.aspectRatio);
    ensureCaptureUpdateForActivePanel();
  };

  const handleDurationCommit = () => {
    if (!duration) return;
    const parsed = Number.parseFloat(duration.value);
    if (Number.isNaN(parsed) || parsed <= 0) {
      duration.value = String(capture.duration);
      return;
    }
    capture.duration = parsed;
    set('captureDuration', capture.duration);
  };

  const handleTabActivation = () => {
    if (!panel) {
      updateCaptureDimensions();
      return;
    }
    requestAnimationFrame(() => {
      if (panel.classList.contains('panel-active')) {
        updateCaptureDimensions();
      }
    });
  };

  aspect?.addEventListener('change', handleAspectChange);
  duration?.addEventListener('change', handleDurationCommit);
  duration?.addEventListener('blur', handleDurationCommit);
  tab?.addEventListener('click', handleTabActivation);

  subscribe((change) => {
    if (change.type !== 'set') return;
    if (change.key === 'radius' || change.key === 'nodeRadius') {
      ensureCaptureUpdateForActivePanel();
    }
  });

  applyUiState();
  updateCaptureDimensions();

  return {
    getCaptureConfig: () => ({
      aspectRatio: capture.aspectRatio,
      width: capture.dimensions.width,
      height: capture.dimensions.height,
      duration: capture.duration,
    }),
    setStatusMessage,
    updateCaptureDimensions,
  };
}
