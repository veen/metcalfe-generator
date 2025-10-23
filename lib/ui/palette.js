export function attachPalette({ listEl, addButton, colorInput, stateManager, renderer }) {
  if (!listEl || !addButton || !colorInput) return;

  const { state, set, subscribe } = stateManager;

  const render = () => {
    listEl.innerHTML = '';
    state.nodeColors.forEach((color, index) => {
      const item = document.createElement('div');
      item.className = 'color-item';

      const input = document.createElement('input');
      input.type = 'color';
      input.value = color;
      input.setAttribute('aria-label', `Node color ${index + 1}`);
      input.addEventListener('input', (event) => {
        const next = [...state.nodeColors];
        next[index] = event.target.value;
        set('nodeColors', next);
        renderer?.markAnimationIncomplete?.();
      });
      item.appendChild(input);

      if (state.nodeColors.length > 1) {
        const removeButton = document.createElement('button');
        removeButton.type = 'button';
        removeButton.textContent = 'Remove';
        removeButton.addEventListener('click', () => {
          const next = state.nodeColors.filter((_, idx) => idx !== index);
          set('nodeColors', next);
          renderer?.markAnimationIncomplete?.();
        });
        item.appendChild(removeButton);
      }

      listEl.appendChild(item);
    });
  };

  addButton.addEventListener('click', () => {
    const next = [...state.nodeColors, colorInput.value || '#ffffff'];
    set('nodeColors', next);
    renderer?.markAnimationIncomplete?.();
  });

  subscribe(({ key }) => {
    if (key === 'nodeColors') {
      render();
    }
  });

  render();
}
