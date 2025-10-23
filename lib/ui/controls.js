const updateRangeProgress = (input) => {
  if (!input || input.type !== 'range') return;
  const min = parseFloat(input.min) || 0;
  const max = parseFloat(input.max) || 100;
  const value = parseFloat(input.value);
  const ratio = max === min ? 0 : (value - min) / (max - min);
  input.style.setProperty('--progress', `${Math.max(0, Math.min(1, ratio)) * 100}%`);
};

export function attachControls({ stateManager, renderer, elements }) {
  const { state, set } = stateManager;

  const sliderConfigs = [
    {
      key: 'nodeCount',
      input: elements.nodeCount.input,
      valueEl: elements.nodeCount.value,
      parse: (value) => parseInt(value, 10),
      format: (value) => `${value}`,
      onChange: () => {
        renderer.markAnimationIncomplete();
        if (state.animate) {
          renderer.restartProgress();
        } else {
          renderer.clampProgress();
        }
      },
    },
    {
      key: 'nodeRadius',
      input: elements.nodeRadius.input,
      valueEl: elements.nodeRadius.value,
      parse: (value) => parseInt(value, 10),
      format: (value) => `${value}`,
      onChange: () => {
        renderer.markAnimationIncomplete();
        renderer.resize();
      },
    },
    {
      key: 'radius',
      input: elements.radius.input,
      valueEl: elements.radius.value,
      parse: (value) => parseInt(value, 10),
      format: (value) => `${value}`,
      onChange: () => {
        renderer.markAnimationIncomplete();
        renderer.resize();
      },
    },
    {
      key: 'lineWidth',
      input: elements.lineWidth.input,
      valueEl: elements.lineWidth.value,
      parse: (value) => parseFloat(value),
      format: (value) => parseFloat(value).toFixed(2),
      onChange: () => renderer.markAnimationIncomplete(),
    },
    {
      key: 'buildRate',
      input: elements.buildRate.input,
      valueEl: elements.buildRate.value,
      parse: (value) => parseFloat(value),
      format: (value) => parseFloat(value).toFixed(1),
      onChange: () => renderer.markAnimationIncomplete(),
    },
  ];

  sliderConfigs.forEach(({ key, input, valueEl, parse, format, onChange }) => {
    if (!input) return;
    updateRangeProgress(input);
    if (valueEl) {
      valueEl.textContent = format(parse(input.value));
    }
    input.addEventListener('input', (event) => {
      const parsed = parse(event.target.value);
      if (valueEl) {
        valueEl.textContent = format(parsed);
      }
      set(key, parsed);
      onChange();
      updateRangeProgress(input);
    });
  });

  if (elements.lineColorInput) {
    elements.lineColorInput.addEventListener('input', (event) => {
      set('lineColor', event.target.value);
      renderer.markAnimationIncomplete();
    });
  }

  if (elements.backgroundColorInput) {
    elements.backgroundColorInput.addEventListener('input', (event) => {
      set('backgroundColor', event.target.value);
      renderer.markAnimationIncomplete();
    });
  }
}
