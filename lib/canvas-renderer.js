import { MIN_NODES, FIXED_CANVAS_HEIGHT } from './constants.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const lerp = (a, b, t) => a + (b - a) * t;

function calculatePositions(count, pattern, radius, nodeRadius, canvas) {
  const positions = new Float32Array(count * 2);
  const cx = canvas.clientWidth / 2;
  const cy = canvas.clientHeight / 2;
  const r = Math.min(radius, Math.min(cx, cy) - nodeRadius - 12);
  const angleStep = (Math.PI * 2) / count;

  const indices = new Uint16Array(count);
  if (pattern === 'opposite') {
    let left = 0;
    let right = Math.floor(count / 2);
    for (let i = 0; i < count; i++) {
      indices[i] = (i % 2 === 0) ? (left++) % count : (right++) % count;
    }
  } else if (pattern === 'circular-alternating') {
    indices[0] = 0;
    let left = 1;
    let right = count - 1;
    let takeRight = true;
    for (let i = 1; i < count; i++) {
      if (takeRight && right >= left) {
        indices[i] = right--;
      } else if (!takeRight && left <= right + 1) {
        indices[i] = left++;
      } else if (right >= left) {
        indices[i] = right--;
      } else {
        indices[i] = left++;
      }
      takeRight = !takeRight;
    }
  } else if (pattern === 'alternating') {
    let idx = 0;
    for (let i = 0; i < count; i += 2) indices[idx++] = i;
    for (let i = 1; i < count; i += 2) indices[idx++] = i;
  } else {
    for (let i = 0; i < count; i++) {
      indices[i] = i;
    }
  }

  const baseAngle = -Math.PI;
  for (let i = 0; i < count; i++) {
    const angle = baseAngle + indices[i] * angleStep;
    positions[i * 2] = r * Math.sin(angle) + cx;
    positions[i * 2 + 1] = r * Math.cos(angle) + cy;
  }

  return positions;
}

export function createRenderer(canvas, stateManager) {
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    throw new Error('Canvas 2D context unavailable.');
  }

  const dpi = window.devicePixelRatio || 1;
  const { state, set } = stateManager;

  let visibleNodeProgress = state.animate ? MIN_NODES : state.nodeCount;
  let animationCompleted = false;
  let lastTimestamp = performance.now();
  let rafId = null;
  const completionListeners = new Set();
  const nodeColorAssignments = [];
  let pendingRedraw = true;

  const ensureColorAssignments = (count) => {
    const palette = state.nodeColors;
    if (!palette || !palette.length) return;
    if (nodeColorAssignments.length > count) {
      nodeColorAssignments.length = count;
    }
    while (nodeColorAssignments.length < count) {
      const colorIndex = Math.floor(Math.random() * palette.length);
      nodeColorAssignments.push(palette[colorIndex]);
    }
  };

  const requestFrame = () => {
    pendingRedraw = true;
    if (rafId == null) {
      lastTimestamp = performance.now();
      rafId = requestAnimationFrame(loop);
    }
  };

  const resizeCanvas = () => {
    canvas.style.setProperty('--canvas-height', `${FIXED_CANVAS_HEIGHT}px`);
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.floor(rect.width * dpi);
    canvas.height = Math.floor(FIXED_CANVAS_HEIGHT * dpi);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpi, dpi);
    visibleNodeProgress = clamp(visibleNodeProgress, MIN_NODES, state.nodeCount);
    requestFrame();
  };

  const drawFrame = (delta) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const targetVisible = Math.max(MIN_NODES, Math.floor(state.nodeCount));

    if (state.animate) {
      visibleNodeProgress = Math.min(
        targetVisible,
        visibleNodeProgress + (delta * state.buildRate * 0.001)
      );
      if (visibleNodeProgress < targetVisible) {
        animationCompleted = false;
      }
    } else {
      visibleNodeProgress = Math.min(visibleNodeProgress, targetVisible);
    }

    const baseCount = Math.min(targetVisible, Math.max(MIN_NODES, Math.floor(visibleNodeProgress)));
    const transitioning = state.animate && baseCount < targetVisible;
    const nextCount = transitioning ? baseCount + 1 : baseCount;
    const transition = transitioning ? clamp(visibleNodeProgress - baseCount, 0, 1) : 0;

    const currentPositions = calculatePositions(
      baseCount,
      state.pattern,
      state.radius,
      state.nodeRadius,
      canvas
    );
    const nextPositions = calculatePositions(
      nextCount,
      state.pattern,
      state.radius,
      state.nodeRadius,
      canvas
    );

    const nodes = [];
    for (let i = 0; i < baseCount; i++) {
      const x = transitioning
        ? lerp(currentPositions[i * 2], nextPositions[i * 2], transition)
        : currentPositions[i * 2];
      const y = transitioning
        ? lerp(currentPositions[i * 2 + 1], nextPositions[i * 2 + 1], transition)
        : currentPositions[i * 2 + 1];
      nodes.push({ x, y, scale: 1, index: i });
    }

    if (transitioning && nextCount > baseCount) {
      const idx = baseCount;
      nodes.push({
        x: nextPositions[idx * 2],
        y: nextPositions[idx * 2 + 1],
        scale: transition,
        index: idx,
      });
    }

    const visibleCount = Math.min(
      targetVisible,
      Math.max(MIN_NODES, Math.floor(baseCount + (nextCount - baseCount) * transition))
    );

    if (state.animate && !animationCompleted && visibleNodeProgress >= targetVisible) {
      animationCompleted = true;
      set('animate', false);
      completionListeners.forEach((listener) => {
        try {
          listener();
        } catch (error) {
          console.error('Renderer completion listener failed', error);
        }
      });
    }

    const palette = state.nodeColors;
    ctx.lineWidth = state.lineWidth;
    ctx.strokeStyle = state.lineColor;
    ctx.beginPath();
    for (let i = 0; i < visibleCount; i++) {
      const nodeA = nodes[i];
      if (!nodeA) continue;
      for (let j = i + 1; j < visibleCount; j++) {
        const nodeB = nodes[j];
        if (!nodeB) continue;
        ctx.moveTo(nodeA.x, nodeA.y);
        ctx.lineTo(nodeB.x, nodeB.y);
      }
    }
    ctx.stroke();

    ctx.globalAlpha = 0.95;
    nodes.forEach((node) => {
      const scale = node.scale;
      if (scale <= 0) return;
      ctx.save();
      ctx.globalAlpha = scale < 1 ? scale : 1;
      const assignedColor = nodeColorAssignments[node.index] || palette[node.index % palette.length];
      ctx.fillStyle = assignedColor;
      ctx.beginPath();
      const radius = state.nodeRadius * (scale < 1 ? scale : 1);
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
    ctx.globalAlpha = 1;

    const shouldContinue = state.animate || !animationCompleted || pendingRedraw;
    pendingRedraw = false;
    return shouldContinue;
  };

  const loop = (timestamp) => {
    const delta = clamp(timestamp - lastTimestamp, 0, 32);
    lastTimestamp = timestamp;
    const shouldContinue = drawFrame(delta);
    if (shouldContinue) {
      rafId = requestAnimationFrame(loop);
    } else {
      rafId = null;
    }
  };

  const start = () => {
    requestFrame();
  };

  const stop = () => {
    if (rafId != null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  const restartProgress = () => {
    visibleNodeProgress = MIN_NODES;
    animationCompleted = false;
    requestFrame();
  };

  const resetForRecording = () => {
    restartProgress();
    lastTimestamp = performance.now();
  };

  const clampProgress = () => {
    visibleNodeProgress = Math.max(MIN_NODES, state.nodeCount);
  };

  const markAnimationIncomplete = () => {
    animationCompleted = false;
    requestFrame();
  };

  const isAnimationCompleted = () => animationCompleted;

  const onAnimationComplete = (listener) => {
    if (typeof listener !== 'function') {
      return () => {};
    }
    completionListeners.add(listener);
    return () => {
      completionListeners.delete(listener);
    };
  };

  stateManager.subscribe(({ key }) => {
    if (key === 'nodeColors') {
      nodeColorAssignments.length = 0;
      ensureColorAssignments(state.nodeCount);
      requestFrame();
    }
    if (key === 'nodeCount') {
      ensureColorAssignments(state.nodeCount);
      requestFrame();
    }
    if (key === 'animate') {
      if (state.animate) {
        requestFrame();
      }
    }
  });

  ensureColorAssignments(state.nodeCount);

  resizeCanvas();

  return {
    start,
    stop,
    resize: resizeCanvas,
    restartProgress,
    resetForRecording,
    clampProgress,
    markAnimationIncomplete,
    isAnimationCompleted,
    onAnimationComplete,
  };
}
