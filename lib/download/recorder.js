const MEDIA_TYPE_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/mp4;codecs=h264',
  'video/webm',
];

export const buildDownloadFilename = (mimeType, aspectRatio) => {
  const pad = (value) => String(value).padStart(2, '0');
  const extension = /mp4/i.test(mimeType || '') ? 'mp4' : 'webm';
  const now = new Date();
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(
    now.getHours()
  )}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const aspectTag = (aspectRatio || '1:1').replace(/:/g, 'x');
  return `metcalfe-network-${aspectTag}-${timestamp}.${extension}`;
};

export const hasMediaRecorderSupport = () =>
  typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined';

export const hasCaptureStreamSupport = () =>
  typeof HTMLCanvasElement !== 'undefined' &&
  typeof HTMLCanvasElement.prototype.captureStream === 'function';

export const selectSupportedMimeType = () => {
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

export const ensureCaptureSurface = (capture) => {
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
    if (existingCanvas.width !== dims.width || existingCanvas.height !== dims.height) {
      existingCanvas.width = dims.width;
      existingCanvas.height = dims.height;
    }
  }
  return capture.surface;
};

export const stopActiveStream = (capture) => {
  if (!capture.stream) return;
  capture.stream.getTracks().forEach((track) => track.stop());
  capture.stream = null;
};

export const stopFrameBridge = (capture) => {
  if (capture.frameCopyRaf != null) {
    cancelAnimationFrame(capture.frameCopyRaf);
    capture.frameCopyRaf = null;
  }
};

export const startFrameBridge = ({ capture, canvas, stateManager }) => {
  if (!capture.surface || !canvas) return;
  stopFrameBridge(capture);
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

export const prepareRecorder = ({
  capture,
  setStatusMessage,
  updateCaptureDimensions,
  onFinalize,
}) => {
  setStatusMessage('Preparing recorder…');
  updateCaptureDimensions();
  const surface = ensureCaptureSurface(capture);
  if (!surface) {
    setStatusMessage('Download capture unavailable: unable to initialize surface.');
    return false;
  }
  if (typeof surface.canvas.captureStream !== 'function') {
    setStatusMessage('Download capture unsupported in this browser.');
    return false;
  }
  stopActiveStream(capture);
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
    capture.recorder.onstop = onFinalize;
    capture.recorder.onerror = (event) => {
      console.error('MediaRecorder encountered an error', event);
      setStatusMessage('Recording error encountered.');
      if (typeof capture._handleRecorderError === 'function') {
        capture._handleRecorderError();
      }
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

export const startRecording = ({
  capture,
  downloadButton,
  disableExternalControls,
  setAspectButtonsDisabled,
  setStatusMessage,
  renderer,
  stateManager,
  startFrameBridgeImpl,
}) => {
  if (!capture.recorder) {
    setStatusMessage('Recorder is not ready.');
    return false;
  }
  if (capture.isRecording) {
    setStatusMessage('Recording already in progress…');
    return false;
  }
  if (downloadButton) {
    downloadButton.setAttribute('disabled', 'disabled');
  }
  disableExternalControls();
  setAspectButtonsDisabled(true);
  capture.stopReason = '';
  capture.chunks = [];
  capture.isRecording = true;
  capture.restore = {
    animate: stateManager.state.animate,
  };
  renderer?.restartProgress();
  renderer?.markAnimationIncomplete();
  renderer?.start();
  stateManager.set('animate', true);
  try {
    capture.recorder.start();
    setStatusMessage(`Recording in progress (${capture.mimeType}) at ${capture.streamFrameRate} fps.`);
    startFrameBridgeImpl();
    return true;
  } catch (error) {
    console.error('Failed to start MediaRecorder', error);
    capture.isRecording = false;
    setStatusMessage('Failed to start recording.');
    if (downloadButton) {
      downloadButton.removeAttribute('disabled');
    }
    return false;
  }
};

export const stopRecording = (capture, reason = 'manual') => {
  if (!capture.recorder || !capture.isRecording) return;
  capture.isRecording = false;
  capture.stopReason = reason;
  stopFrameBridge(capture);
  if (capture.recorder.state === 'inactive') return;
  try {
    capture.recorder.stop();
  } catch (error) {
    console.error('Failed to stop MediaRecorder', error);
  }
};

export const finalizeRecording = ({
  capture,
  stateManager,
  setStatusMessage,
  downloadButton,
  setAspectButtonsDisabled,
  enableExternalControls,
}) => {
  const recordedChunks = capture.chunks.slice();
  capture.chunks = [];
  capture.isRecording = false;
  if (downloadButton) {
    downloadButton.removeAttribute('disabled');
  }
  if (!capture.featureDisabled) {
    setAspectButtonsDisabled(false);
  }
  enableExternalControls();
  if (capture.restore && typeof capture.restore.animate === 'boolean') {
    stateManager.set('animate', capture.restore.animate);
  }
  capture.restore = null;
  stopFrameBridge(capture);
  stopActiveStream(capture);
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
    reason === 'animation'
      ? 'Animation cycle captured'
      : reason === 'error'
        ? 'Recording error - partial clip saved'
        : 'Download ready';
  setStatusMessage(`${summaryLabel}: ${filename}`);
};
