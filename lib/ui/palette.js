export function attachPalette({ listEl, addButton, colorInput, stateManager, renderer }) {
  if (!listEl || !addButton || !colorInput) return;

  const { state, set, subscribe } = stateManager;
  const rows = [];

  const handleColorInput = (event) => {
    const index = Number.parseInt(event.currentTarget.dataset.index || '', 10);
    if (Number.isNaN(index)) return;
    const next = [...state.nodeColors];
    next[index] = event.currentTarget.value;
    set('nodeColors', next);
    renderer?.markAnimationIncomplete?.();
  };

  const handleRemoveClick = (event) => {
    const index = Number.parseInt(event.currentTarget.dataset.index || '', 10);
    if (Number.isNaN(index)) return;
    const next = state.nodeColors.filter((_, idx) => idx !== index);
    set('nodeColors', next);
    renderer?.markAnimationIncomplete?.();
  };

  const createRow = () => {
    const container = document.createElement('div');
    container.className = 'color-item';

    const input = document.createElement('input');
    input.type = 'color';
    input.addEventListener('input', handleColorInput);
    container.appendChild(input);

    const removeButton = document.createElement('button');
    removeButton.type = 'button';
    removeButton.textContent = 'Remove';
    removeButton.addEventListener('click', handleRemoveClick);
    container.appendChild(removeButton);

    return { container, input, removeButton };
  };

  const syncPalette = () => {
    const colors = state.nodeColors;
    const canRemove = colors.length > 1;
    const fragment = document.createDocumentFragment();

    colors.forEach((color, index) => {
      let row = rows[index];
      if (!row) {
        row = createRow();
        rows[index] = row;
      }
      row.input.value = color;
      row.input.dataset.index = String(index);
      row.input.setAttribute('aria-label', `Node color ${index + 1}`);
      row.removeButton.dataset.index = String(index);
      row.removeButton.hidden = !canRemove;
      fragment.appendChild(row.container);
    });

    while (rows.length > colors.length) {
      const row = rows.pop();
      row.input.removeEventListener('input', handleColorInput);
      row.removeButton.removeEventListener('click', handleRemoveClick);
    }

    listEl.replaceChildren(fragment);
  };

  addButton.addEventListener('click', () => {
    const next = [...state.nodeColors, colorInput.value || '#ffffff'];
    set('nodeColors', next);
    renderer?.markAnimationIncomplete?.();
  });

  subscribe(({ key }) => {
    if (key === 'nodeColors') {
      syncPalette();
    }
  });

  syncPalette();

  return () => {
    rows.forEach((row) => {
      row.input.removeEventListener('input', handleColorInput);
      row.removeButton.removeEventListener('click', handleRemoveClick);
    });
  };
}
