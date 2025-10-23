import { PLAY_ICON_PATH, PAUSE_ICON_PATH } from '../constants.js';

export function attachPlayToggle({ button, iconPathEl, labelEl, stateManager, renderer }) {
  if (!button || !iconPathEl || !labelEl) return;

  const { state, set, subscribe } = stateManager;

  const update = () => {
    const isPlaying = state.animate;
    labelEl.textContent = isPlaying ? 'Pause' : 'Play';
    iconPathEl.setAttribute('d', isPlaying ? PAUSE_ICON_PATH : PLAY_ICON_PATH);
    button.setAttribute('aria-pressed', isPlaying ? 'true' : 'false');
  };

  button.addEventListener('click', () => {
    const nextState = !state.animate;
    if (nextState) {
      if (renderer.isAnimationCompleted()) {
        renderer.restartProgress();
      }
    } else {
      renderer.markAnimationIncomplete();
    }
    set('animate', nextState);
  });

  subscribe(({ key }) => {
    if (key === 'animate') {
      update();
    }
  });

  update();
}
