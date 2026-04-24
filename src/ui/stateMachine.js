/**
 * UI State Machine — manages screen transitions.
 * State keys are shared across boot, wizard, loading, and results screens.
 */

const STATES = { BOOT: 'boot', WIZARD: 'wizard', LOADING: 'loading', RESULTS: 'results' };

let currentState = null;
let stateData = {};
const listeners = [];

export function onStateChange(fn) { listeners.push(fn); }

export function transition(newState, data = {}) {
  const prev = currentState;
  currentState = newState;
  stateData = { ...stateData, ...data };
  for (const fn of listeners) fn(newState, prev, stateData);
}

export { STATES };
