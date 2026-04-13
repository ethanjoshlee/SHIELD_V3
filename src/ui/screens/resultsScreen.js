/**
 * RESULTS screen — read-only final results presentation after simulation.
 * 50/50 layout: left panel shows scenario + metrics, right panel shows globe.
 * Globe persists in same style as wizard, with both countries highlighted.
 * RESET button returns to wizard step 1 (fresh configuration).
 */

import { STATES } from '../stateMachine.js';
import { COUNTRIES } from '../../config/countries.js';
import { initGlobe, startAnimation, setupInteraction, getGlobeGroup, getScene } from '../globe/globeCore.js';
import { createCountriesLayer, setHighlightedCountries } from '../globe/countriesLayer.js';
import { createHudOverlay } from '../globe/hudOverlay.js';
import { renderResultsContent } from '../results.js';
import { renderHistogramHTML } from '../charts.js';
import { DELIVERED_KILOTONS_BENCHMARKS } from '../deliveredKilotonsBenchmarks.js';

function resolveDeliveredStepSize(params) {
  const raw = Number(params?.kilotonsPerWarhead);
  if (!Number.isFinite(raw) || raw <= 0) return 400;
  return raw;
}

function distributionChartOptions(distributionTitle, runParams = {}) {
  const shared = {
    height: 250,
    showTitle: false,
    yLabel: 'Number of Trials',
    yTargetTicks: 5,
    targetVisualSlots: 120,
    minVisualSubBins: 1,
    maxVisualSubBins: 12,
  };
  if (distributionTitle === 'Delivered Kilotons') {
    const stepSize = resolveDeliveredStepSize(runParams);
    return {
      ...shared,
      xLabel: 'Delivered Kilotons',
      binStrategy: 'step-discrete',
      stepSize,
      bins: 64,
      integerMaxBins: 96,
      integerMinNonZeroRatio: 0.35,
      integerMinReadableBins: 18,
      referenceMarkers: DELIVERED_KILOTONS_BENCHMARKS,
      maxVisibleReferenceMarkers: 7,
      maxVisibleReferenceLabels: 4,
      referenceLabelMinGapPct: 10,
    };
  }
  if (distributionTitle === 'Penetrated Real Warheads') {
    return {
      ...shared,
      xLabel: 'Penetrated Real Warheads',
      binStrategy: 'integer',
      bins: 64,
      integerMaxBins: 96,
      integerMinNonZeroRatio: 0.35,
      integerMinReadableBins: 18,
    };
  }
  return {
    ...shared,
    xLabel: 'Intercepted Real Warheads',
    binStrategy: 'integer',
    bins: 64,
    integerMaxBins: 96,
    integerMinNonZeroRatio: 0.35,
    integerMinReadableBins: 18,
  };
}

function initDistributionViewer(rootEl, runResult, runParams) {
  const viewer = rootEl.querySelector('[data-dist-viewer]');
  if (!viewer) return;

  const titleEl = viewer.querySelector('[data-dist-title]');
  const indexEl = viewer.querySelector('[data-dist-index]');
  const stageEl = viewer.querySelector('[data-dist-stage]');
  const prevBtn = viewer.querySelector('[data-dist-nav="prev"]');
  const nextBtn = viewer.querySelector('[data-dist-nav="next"]');
  if (!titleEl || !indexEl || !stageEl || !prevBtn || !nextBtn) return;

  const distributions = [
    { title: 'Delivered Kilotons', values: runResult.deliveredKilotons ?? runResult.ktDelivered ?? [] },
    { title: 'Penetrated Real Warheads', values: runResult.penReal ?? [] },
    { title: 'Intercepted Real Warheads', values: runResult.intReal ?? [] },
  ];

  let activeIndex = 0;

  const renderActive = () => {
    const active = distributions[activeIndex];
    titleEl.textContent = active.title;
    indexEl.textContent = `${activeIndex + 1} / ${distributions.length}`;
    const chartOpts = distributionChartOptions(active.title, runParams);
    stageEl.innerHTML = renderHistogramHTML(active.values, chartOpts.bins, active.title, chartOpts);
  };

  prevBtn.addEventListener('click', () => {
    activeIndex = (activeIndex - 1 + distributions.length) % distributions.length;
    renderActive();
  });
  nextBtn.addEventListener('click', () => {
    activeIndex = (activeIndex + 1) % distributions.length;
    renderActive();
  });

  renderActive();
}

export function renderResultsScreen(container, data, transitionFn) {
  const { blueKey, redKey, runParams, runResult, runElapsed } = data;

  const blueLabel = COUNTRIES.blue[blueKey]?.label ?? blueKey;
  const redLabel  = COUNTRIES.red[redKey]?.label  ?? redKey;

  const el = document.createElement('div');
  el.className = 'results-shell';
  el.innerHTML = `
    <div class="results-left">
      <div class="results-header">
        <div class="results-title">MODEL RESULTS</div>
        <div class="results-scenario">
          <span class="results-scenario-blue">DEF: ${blueLabel}</span>
          <span class="results-scenario-red">ATK: ${redLabel}</span>
        </div>
        <div class="results-meta">${runParams.nTrials} trials · ${runElapsed}s</div>
      </div>
      <div class="results-body">
        ${renderResultsContent(runParams, runResult)}
      </div>
      <div class="results-nav">
        <button class="btn btn-reset">← RESET MODEL</button>
      </div>
    </div>
    <div class="results-right">
      <div class="project-identity project-identity-right" aria-label="Project identity">
        <div class="project-identity-title">Strategic Homeland Intercept Evaluation and Layered Defense Model</div>
        <div class="project-identity-attribution">Defense, Emerging Technology, and Strategy Program<br>Belfer Center for Science and International Affairs</div>
      </div>
    </div>
  `;

  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('active'));

  // Globe — same init pattern as wizard (fresh per screen entry)
  const globeContainer = el.querySelector('.results-right');
  initGlobe(globeContainer);
  createCountriesLayer(getGlobeGroup());
  createHudOverlay(getScene());
  setHighlightedCountries([blueKey, redKey]);
  startAnimation();
  setupInteraction(globeContainer);
  initDistributionViewer(el, runResult, runParams);

  el.querySelector('.btn-reset').addEventListener('click', () => {
    transitionFn(STATES.WIZARD);
  });
}
