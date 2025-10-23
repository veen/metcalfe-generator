import { DEFAULT_STATE, DEFAULT_NODE_COLORS } from './constants.js';

export function createState(overrides = {}) {
  const baseNodeColors = overrides.nodeColors
    ? [...overrides.nodeColors]
    : [...DEFAULT_NODE_COLORS];

  const state = {
    ...DEFAULT_STATE,
    ...overrides,
    nodeColors: baseNodeColors,
  };

  const listeners = new Set();

  const notify = (change) => {
    listeners.forEach((listener) => listener(change, state));
  };

  const set = (key, value) => {
    if (Object.is(state[key], value)) return;
    state[key] = value;
    notify({ type: 'set', key, value });
  };

  const update = (updater) => {
    const result = updater(state);
    notify({ type: 'update' });
    return result;
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };

  return {
    state,
    set,
    update,
    subscribe,
  };
}
