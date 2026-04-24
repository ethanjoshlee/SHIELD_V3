/**
 * SHIELD — App entry point.
 * Uses state machine transitions across boot, wizard, loading, and results views.
 */

import { STATES, transition, onStateChange } from './ui/stateMachine.js';
import { renderBoot } from './ui/screens/boot.js';
import { renderRunLoading } from './ui/screens/loading.js';
import { runMonteCarlo } from './model/monteCarlo.js';

const container = document.getElementById('app');

// Listen for state transitions
onStateChange((newState, prevState, data) => {
  // Globe-backed screens need cleanup when they unmount.
  if (prevState === STATES.WIZARD || prevState === STATES.RESULTS) {
    import('./ui/globe/globeCore.js').then(mod => {
      if (mod.disposeGlobe) mod.disposeGlobe();
    });
  }

  container.innerHTML = '';

  switch (newState) {
    case STATES.BOOT:
      renderBoot(container);
      break;
    case STATES.WIZARD:
      import('./ui/screens/wizard.js').then(mod => {
        mod.renderWizard(container, transition);
      });
      break;
    case STATES.LOADING:
      renderRunLoading(container, data.params?.nTrials ?? 1000, () => {
        const t0 = performance.now();
        const result = runMonteCarlo(data.params);
        const elapsed = ((performance.now() - t0) / 1000).toFixed(2);
        transition(STATES.RESULTS, {
          blueKey: data.blueKey,
          redKey: data.redKey,
          runParams: data.params,
          runResult: result,
          runElapsed: elapsed,
        });
      });
      break;
    case STATES.RESULTS:
      import('./ui/screens/resultsScreen.js').then(mod => {
        mod.renderResultsScreen(container, data, transition);
      });
      break;
  }
});

// Start the app
transition(STATES.BOOT);
