import { CANVAS_PADDING, DOWNLOAD_CAPTURE_FPS } from '../constants.js';

const MEDIA_TYPE_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/mp4;codecs=h264',
  'video/webm',
];

const pad2 = (value) => String(value).padStart(2, '0');

const buildDownloadFilename = (mimeType, aspectRatio) => {
  const extension = /mp4/i.test(mimeType || '') ? 'mp4' : 'webm';
  const now = new Date();
  const timestamp = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(
    now.getDate()
  )}-${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(
    now.getSeconds()
  )}`;
  const aspectTag = (aspectRatio || '1:1').replace(/:/g, 'x');
  return `metcalfe-network-${aspectTag}-${timestamp}.${extension}`;
};

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

const computeCaptureViewport = ({ width, height, baseExtent }) => {
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

export function attachDownloadControls({
  stateManager,
  renderer,
  canvas,
  elements = {},
  tab,
  panel,
}) {
  if (!stateManager) return null;

  const { aspect, duration, downloadButton, status } = elements;
  const { state, set, subscribe } = stateManager;
  const resources = { renderer, canvas };

  const initialDimensions = computeCaptureDimensions(state, state.captureAspect);
  const capture = {
    aspectRatio: state.captureAspect,
    duration: state.captureDuration,
    dimensions: initialDimensions,
    viewport: computeCaptureViewport(initialDimensions),
    surface: null,
    stream: null,
    streamFrameRate: DOWNLOAD_CAPTURE_FPS,
    recorder: null,
    mimeType: '',
    chunks: [],
    isRecording: false,
    timerId: null,
    restore: null,
    stopReason: '',
    featureDisabled: false,
    frameCopyRaf: null,
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
    if (capture.featureDisabled) {
      if (downloadButton) {
        downloadButton.setAttribute('disabled', 'disabled');
      }
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

  const ensureCaptureSurface = () => {
    const dims = capture.dimensions;
    if (!dims) return null;
    if (!capture.surface) {
      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = dims.width;
      captureCanvas.height = dims.height;
      const ctx = captureCanvas.getContext('2d');
      if (!ctx) {
        return null;
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      capture.surface = { canvas: captureCanvas, ctx };
    } else {
      const { canvas: existingCanvas } = capture.surface;
      if (
        existingCanvas.width !== dims.width ||
        existingCanvas.height !== dims.height
      ) {
        existingCanvas.width = dims.width;
        existingCanvas.height = dims.height;
      }
    }
    return capture.surface;
  };

  const stopActiveStream = () => {
    if (!capture.stream) return;
    capture.stream.getTracks().forEach((track) => track.stop());
    capture.stream = null;
  };

  const hasMediaRecorderSupport = () =>
    typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';

  const hasCaptureStreamSupport = () =>
    typeof HTMLCanvasElement !== 'undefined' &&
    typeof HTMLCanvasElement.prototype.captureStream === 'function';

  const selectSupportedMimeType = () => {
    if (!hasMediaRecorderSupport()) return null;
    const { isTypeSupported } = MediaRecorder;
    if (typeof isTypeSupported === 'function') {
      for (const candidate of MEDIA_TYPE_CANDIDATES) {
        if (isTypeSupported.call(MediaRecorder, candidate)) {
          return candidate;
        }
      }
    }
    return 'video/webm';
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

  const disableDownloadFeature = (message) => {
    capture.featureDisabled = true;
    if (downloadButton) {
      downloadButton.setAttribute('disabled', 'disabled');
    }
    if (aspect) {
      aspect.setAttribute('disabled', 'disabled');
    }
    if (duration) {
      duration.setAttribute('disabled', 'disabled');
    }
    enableExternalControls();
    setStatusMessage(message);
  };

  const stopFrameBridge = () => {
    if (capture.frameCopyRaf != null) {
      cancelAnimationFrame(capture.frameCopyRaf);
      capture.frameCopyRaf = null;
    }
  };

  const startFrameBridge = () => {
    if (!capture.surface || !canvas) return;
    stopFrameBridge();
    const copyFrame = () => {
      if (!capture.isRecording || !capture.surface) {
        capture.frameCopyRaf = null;
        return;
      }
      const { canvas: destCanvas, ctx } = capture.surface;
      const viewport = capture.viewport;
      ctx.save();
      ctx.fillStyle = stateManager.state.backgroundColor;
      ctx.fillRect(0, 0, destCanvas.width, destCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        0,
        canvas.width,
        canvas.height,
        viewport.offsetX,
        viewport.offsetY,
        viewport.drawWidth,
        viewport.drawHeight
      );
      ctx.restore();
      capture.frameCopyRaf = requestAnimationFrame(copyFrame);
    };
    copyFrame();
  };

  const stopRecording = (reason = 'manual') => {
    if (!capture.recorder || !capture.isRecording) return;
    capture.isRecording = false;
    capture.stopReason = reason;
    if (capture.timerId != null) {
      clearTimeout(capture.timerId);
      capture.timerId = null;
    }
    stopFrameBridge();
    if (capture.recorder.state === 'inactive') return;
    try {
      capture.recorder.stop();
    } catch (error) {
      console.error('Failed to stop MediaRecorder', error);
    }
  };

  const prepareRecorder = () => {
    setStatusMessage('Preparing recorder…');
    updateCaptureDimensions();
    const surface = ensureCaptureSurface();
    if (!surface) {
      setStatusMessage('Download capture unavailable: unable to initialize surface.');
      return false;
    }
    if (typeof surface.canvas.captureStream !== 'function') {
      setStatusMessage('Download capture unsupported in this browser.');
      return false;
    }
    stopActiveStream();
    capture.stream = surface.canvas.captureStream(capture.streamFrameRate);
    if (!hasMediaRecorderSupport()) {
      setStatusMessage('MediaRecorder is not available in this browser.');
      capture.stream = null;
      return false;
    }
    const mimeType = selectSupportedMimeType();
    if (!mimeType) {
      setStatusMessage('No supported recording MIME type found.');
      capture.stream = null;
      return false;
    }
    try {
      capture.mimeType = mimeType;
      capture.chunks = [];
      capture.recorder = new MediaRecorder(capture.stream, {
        mimeType,
        videoBitsPerSecond: 12_000_000,
      });
      capture.recorder.ondataavailable = (event) => {
        if (!event) return;
        if (event.data && event.data.size > 0) {
          capture.chunks.push(event.data);
        }
      };
      capture.recorder.onstop = finalizeRecording;
      capture.recorder.onerror = (event) => {
        console.error('MediaRecorder encountered an error', event);
        setStatusMessage('Recording error encountered.');
        stopRecording('error');
      };
      return true;
    } catch (error) {
      console.error('Failed to create MediaRecorder', error);
      capture.recorder = null;
      capture.stream = null;
      setStatusMessage('Unable to initialize MediaRecorder.');
      return false;
    }
  };

  const startRecording = () => {
    if (!capture.recorder) {
      setStatusMessage('Recorder is not ready.');
      return;
    }
    if (capture.isRecording) {
      setStatusMessage('Recording already in progress…');
      return;
    }
    if (downloadButton) {
      downloadButton.setAttribute('disabled', 'disabled');
    }
    disableExternalControls();
    capture.stopReason = '';
    capture.chunks = [];
    capture.isRecording = true;
    capture.restore = {
      animate: stateManager.state.animate,
    };
    if (capture.timerId != null) {
      clearTimeout(capture.timerId);
      capture.timerId = null;
    }
    capture.timerId = window.setTimeout(
      () => stopRecording('duration'),
      Math.max(1, Math.round(capture.duration * 1000))
    );
    renderer?.restartProgress();
    renderer?.markAnimationIncomplete();
    renderer?.start();
    stateManager.set('animate', true);
    try {
      capture.recorder.start();
      setStatusMessage(
        `Recording in progress (${capture.mimeType}) at ${capture.streamFrameRate} fps.`
      );
      startFrameBridge();
    } catch (error) {
      console.error('Failed to start MediaRecorder', error);
      capture.isRecording = false;
      if (capture.timerId != null) {
        clearTimeout(capture.timerId);
        capture.timerId = null;
      }
      setStatusMessage('Failed to start recording.');
      if (downloadButton) {
        downloadButton.removeAttribute('disabled');
      }
      stopFrameBridge();
      enableExternalControls();
    }
  };

  const finalizeRecording = () => {
    const recordedChunks = capture.chunks.slice();
    capture.chunks = [];
    capture.isRecording = false;
    if (capture.timerId != null) {
      clearTimeout(capture.timerId);
      capture.timerId = null;
    }
    if (downloadButton) {
      downloadButton.removeAttribute('disabled');
    }
    enableExternalControls();
    if (capture.restore && typeof capture.restore.animate === 'boolean') {
      stateManager.set('animate', capture.restore.animate);
    }
    capture.restore = null;
    stopFrameBridge();
    stopActiveStream();
    capture.recorder = null;
    const reason = capture.stopReason || 'complete';
    capture.stopReason = '';
    if (!recordedChunks.length) {
      setStatusMessage(
        reason === 'error'
          ? 'Recording failed before any frames were captured.'
          : 'Recording finished but no frames were captured.'
      );
      return;
    }
    const blob = new Blob(recordedChunks, {
      type: capture.mimeType || 'video/webm',
    });
    const url = URL.createObjectURL(blob);
    const filename = buildDownloadFilename(capture.mimeType, capture.aspectRatio);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 16_000);
    const summaryLabel =
      reason === 'duration'
        ? `Saved ${capture.duration}s clip`
        : reason === 'animation'
          ? 'Animation cycle captured'
          : 'Download ready';
    setStatusMessage(`${summaryLabel}: ${filename}`);
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
    const prepared = prepareRecorder();
    if (!prepared) return;
    startRecording();
  };

  downloadButton?.addEventListener('click', handleDownloadRequest);

  subscribe((change) => {
    if (change.type !== 'set') return;
    if (change.key === 'radius' || change.key === 'nodeRadius') {
      ensureCaptureUpdateForActivePanel();
    }
    if (change.key === 'animate' && change.value === false && capture.isRecording) {
      stopRecording('animation');
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
      duration: capture.duration,
      viewport: { ...capture.viewport },
    }),
    setStatusMessage,
    updateCaptureDimensions,
    startDownload: handleDownloadRequest,
  };
}
