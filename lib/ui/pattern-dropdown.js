export function attachPatternDropdown({
  dropdownEl,
  triggerEl,
  outsideLabelEl,
  stateManager,
  renderer,
}) {
  if (!dropdownEl || !triggerEl) return;

  const { state, set, subscribe } = stateManager;
  const labelEl = dropdownEl.querySelector('.dropdown-label');
  const optionButtons = Array.from(dropdownEl.querySelectorAll('[data-pattern]'));

  const syncUI = (pattern) => {
    let active = optionButtons.find((btn) => btn.dataset.pattern === pattern);
    if (!active && optionButtons.length) {
      active = optionButtons[0];
    }
    optionButtons.forEach((btn) => {
      const selected = btn === active;
      btn.classList.toggle('selected', selected);
      btn.setAttribute('aria-selected', selected ? 'true' : 'false');
    });
    if (active && labelEl) {
      labelEl.textContent = active.textContent.trim();
    }
  };

  const toggleOpen = () => {
    const expanded = triggerEl.getAttribute('aria-expanded') === 'true';
    triggerEl.setAttribute('aria-expanded', String(!expanded));
    dropdownEl.classList.toggle('open', !expanded);
  };

  const closeDropdown = () => {
    dropdownEl.classList.remove('open');
    triggerEl.setAttribute('aria-expanded', 'false');
  };

  triggerEl.addEventListener('click', (event) => {
    event.stopPropagation();
    toggleOpen();
  });

  optionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const pattern = btn.dataset.pattern;
      if (state.pattern !== pattern) {
        set('pattern', pattern);
        renderer.markAnimationIncomplete();
        if (state.animate) {
          renderer.restartProgress();
        } else {
          renderer.clampProgress();
        }
      }
      syncUI(pattern);
      closeDropdown();
    });
  });

  const handleDocumentClick = (event) => {
    const target = event.target;
    const insideDropdown = dropdownEl.contains(target);
    const onLabel = outsideLabelEl && outsideLabelEl.contains(target);
    if (!insideDropdown && !onLabel) {
      closeDropdown();
    }
  };

  document.addEventListener('click', handleDocumentClick);

  const handleKeydown = (event) => {
    if (event.key === 'Escape') {
      closeDropdown();
    }
  };

  document.addEventListener('keydown', handleKeydown);

  subscribe(({ key }) => {
    if (key === 'pattern') {
      syncUI(state.pattern);
    }
  });

  syncUI(state.pattern);

  return () => {
    document.removeEventListener('click', handleDocumentClick);
    document.removeEventListener('keydown', handleKeydown);
  };
}
