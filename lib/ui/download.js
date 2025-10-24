import { DOWNLOAD_CAPTURE_FPS } from '../constants.js';
import {
  computeCaptureDimensions,
  computeCaptureViewport,
} from '../download/capture-dimensions.js';
import {
  hasCaptureStreamSupport,
  hasMediaRecorderSupport,
  prepareRecorder,
  startRecording,
  stopRecording,
  finalizeRecording,
  startFrameBridge,
} from '../download/recorder.js';

export function attachDownloadControls({
  stateManager,
  renderer,
  canvas,
  elements = {},
  tab,
  panel,
}) {
  if (!stateManager) return null;

  const {
    aspectButtons = [],
    downloadButton,
    status,
  } = elements;
  const aspectButtonEls = Array.from(aspectButtons || []);
  const { state, set, subscribe } = stateManager;
  const resources = { renderer, canvas };

  const initialDimensions = computeCaptureDimensions(state, state.captureAspect);
  const capture = {
    aspectRatio: state.captureAspect,
    dimensions: initialDimensions,
    viewport: computeCaptureViewport(initialDimensions),
    surface: null,
    stream: null,
    streamFrameRate: DOWNLOAD_CAPTURE_FPS,
    recorder: null,
    mimeType: '',
    chunks: [],
    isRecording: false,
    restore: null,
    stopReason: '',
    featureDisabled: false,
    frameCopyRaf: null,
  };

  const setStatusMessage = (message) => {
    if (!status) return;
    status.textContent = message;
  };

  const setActiveAspectButton = (value) => {
    aspectButtonEls.forEach((button) => {
      const isActive = button.dataset.aspect === value;
      button.setAttribute('aria-pressed', isActive ? 'true' : 'false');
      button.setAttribute('aria-checked', isActive ? 'true' : 'false');
      button.classList.toggle('tab-active', isActive);
    });
  };

  const setAspectButtonsDisabled = (disabled) => {
    aspectButtonEls.forEach((button) => {
      if (disabled) {
        button.setAttribute('disabled', 'disabled');
      } else {
        button.removeAttribute('disabled');
      }
    });
  };

  const applyUiState = () => {
    if (aspectButtonEls.length) {
      setActiveAspectButton(capture.aspectRatio);
    }
  };

  const updateCaptureDimensions = () => {
    if (capture.featureDisabled) {
      if (downloadButton) {
        downloadButton.setAttribute('disabled', 'disabled');
      }
      setAspectButtonsDisabled(true);
      setStatusMessage('Recording is unavailable in this browser.');
      return;
    }
    capture.dimensions = computeCaptureDimensions(stateManager.state, capture.aspectRatio);
    capture.viewport = computeCaptureViewport(capture.dimensions);
    if (downloadButton) {
      downloadButton.dataset.captureWidth = String(capture.dimensions.width);
      downloadButton.dataset.captureHeight = String(capture.dimensions.height);
      downloadButton.dataset.captureAspect = capture.aspectRatio;
      downloadButton.dataset.captureOffsetX = String(capture.viewport.offsetX);
      downloadButton.dataset.captureOffsetY = String(capture.viewport.offsetY);
      downloadButton.dataset.captureDrawWidth = String(capture.viewport.drawWidth);
      downloadButton.dataset.captureDrawHeight = String(capture.viewport.drawHeight);
      if (!capture.featureDisabled && !capture.isRecording) {
        downloadButton.removeAttribute('disabled');
      }
    }
    setStatusMessage(
      `Ready · ${capture.dimensions.width}×${capture.dimensions.height}px (${capture.aspectRatio})`
    );
  };

  const lockedControls = new Map();

  const collectLockableControls = () => {
    const selectors = [
      '#panel-structure input, #panel-structure button, #panel-structure select',
      '#panel-colors input, #panel-colors button, #panel-colors select',
      '.tabs .tab',
    ];
    const candidates = new Set();
    selectors.forEach((selector) => {
      document.querySelectorAll(selector).forEach((element) => {
        candidates.add(element);
      });
    });
    return Array.from(candidates).filter((element) => {
      if (element === downloadButton) return false;
      if (element === tab) return false;
      if (element.id === 'tab-download') return false;
      if (element.closest && element.closest('#panel-download')) return false;
      return 'disabled' in element;
    });
  };

  const disableExternalControls = () => {
    collectLockableControls().forEach((element) => {
      if (lockedControls.has(element)) return;
      const wasDisabled = Boolean(element.disabled);
      lockedControls.set(element, wasDisabled);
      element.disabled = true;
      element.setAttribute('data-download-locked', 'true');
    });
  };

  const enableExternalControls = () => {
    lockedControls.forEach((wasDisabled, element) => {
      if ('disabled' in element) {
        element.disabled = wasDisabled;
      }
      element.removeAttribute('data-download-locked');
    });
    lockedControls.clear();
  };

  const runFinalizeRecording = () => {
    finalizeRecording({
      capture,
      stateManager,
      setStatusMessage,
      downloadButton,
      setAspectButtonsDisabled,
      enableExternalControls,
    });
  };

  const runPrepareRecorder = () => {
    capture._handleRecorderError = () => {
      stopRecording(capture, 'error');
    };
    const prepared = prepareRecorder({
      capture,
      setStatusMessage,
      updateCaptureDimensions,
      onFinalize: runFinalizeRecording,
    });
    if (!prepared) {
      capture._handleRecorderError = undefined;
    }
    return prepared;
  };

  const runStartRecording = () => {
    const started = startRecording({
      capture,
      downloadButton,
      disableExternalControls,
      setAspectButtonsDisabled,
      setStatusMessage,
      renderer,
      stateManager,
      startFrameBridgeImpl: () => startFrameBridge({ capture, canvas, stateManager }),
    });
    if (!started) {
      enableExternalControls();
      if (!capture.featureDisabled) {
        setAspectButtonsDisabled(false);
      }
    }
    return started;
  };

  const disableDownloadFeature = (message) => {
    capture.featureDisabled = true;
    if (downloadButton) {
      downloadButton.setAttribute('disabled', 'disabled');
    }
    setAspectButtonsDisabled(true);
    enableExternalControls();
    setStatusMessage(message);
  };

  const ensureCaptureUpdateForActivePanel = () => {
    if (!panel || panel.classList.contains('panel-active')) {
      updateCaptureDimensions();
    }
  };

  const handleAspectClick = (event) => {
    const button = event.currentTarget;
    if (!button) return;
    const nextAspect = button.dataset.aspect;
    if (!nextAspect || nextAspect === capture.aspectRatio) return;
    capture.aspectRatio = nextAspect;
    set('captureAspect', capture.aspectRatio);
    setActiveAspectButton(capture.aspectRatio);
    ensureCaptureUpdateForActivePanel();
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

  aspectButtonEls.forEach((button) => {
    button.addEventListener('click', handleAspectClick);
  });
  tab?.addEventListener('click', handleTabActivation);

  const handleDownloadRequest = () => {
    void resources;
    if (capture.featureDisabled) {
      setStatusMessage('Recording is not available in this browser environment.');
      return;
    }
    if (capture.isRecording) {
      setStatusMessage('Recording already in progress…');
      return;
    }
    const prepared = runPrepareRecorder();
    if (!prepared) return;
    runStartRecording();
  };

  downloadButton?.addEventListener('click', handleDownloadRequest);

  subscribe((change) => {
    if (change.type !== 'set') return;
    if (change.key === 'radius' || change.key === 'nodeRadius') {
      ensureCaptureUpdateForActivePanel();
    }
    if (change.key === 'animate' && change.value === false && capture.isRecording) {
      stopRecording(capture, 'animation');
    }
  });

  applyUiState();
  updateCaptureDimensions();

  const supportsRecording = hasCaptureStreamSupport() && hasMediaRecorderSupport();
  if (!supportsRecording) {
    disableDownloadFeature(
      'Recording is unavailable in this browser. Try Chromium-based browsers or use screen capture.'
    );
  }

  return {
    getCaptureConfig: () => ({
      aspectRatio: capture.aspectRatio,
      width: capture.dimensions.width,
      height: capture.dimensions.height,
      viewport: { ...capture.viewport },
    }),
    setStatusMessage,
    updateCaptureDimensions,
    startDownload: handleDownloadRequest,
  };
}
