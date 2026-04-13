/**
 * S3 — Main Dashboard screen.
 * Top strip, left drawer, globe center, bottom strip, results overlay.
 */

import { STATES, transition, getStateData } from '../stateMachine.js';
import { COUNTRIES } from '../../config/countries.js';
import { initGlobe, startAnimation, setupInteraction, getGlobeGroup, getScene, disposeGlobe } from '../globe/globeCore.js';
import { createCountriesLayer, setHighlightedCountries } from '../globe/countriesLayer.js';
import { createHudOverlay } from '../globe/hudOverlay.js';
import { renderDrawerControls, readParamsFromUI } from '../controls.js';
import { renderResultsContent } from '../results.js';

let el = null;
let lastResult = null;
let blueKey = null;
let redKey = null;

function renderPhaseStrip() {
  return `
    <div class="phase-strip">
      <span class="phase-node" data-phase="detect">Detect</span>
      <span class="phase-arrow">&rarr;</span>
      <span class="phase-node" data-phase="boost">Boost</span>
      <span class="phase-arrow">&rarr;</span>
      <span class="phase-node" data-phase="mid">Mid</span>
      <span class="phase-arrow">&rarr;</span>
      <span class="phase-node" data-phase="term">Term</span>
    </div>
  `;
}

export function renderDashboard(container) {
  const data = getStateData();
  blueKey = data.blueKey;
  redKey = data.redKey;
  lastResult = null;

  const blueLabel = COUNTRIES.blue[blueKey]?.label || blueKey;
  const redLabel = COUNTRIES.red[redKey]?.label || redKey;

  el = document.createElement('div');
  el.className = 'screen-dashboard';
  el.innerHTML = `
    <div class="top-strip">
      <span class="logo">SHIELD</span>
      <div class="scenario-info">
        <span class="blue-tag">DEF: ${blueLabel}</span>
        <span class="red-tag">ATK: ${redLabel}</span>
      </div>
      <div class="spacer"></div>
      <span class="status" id="simStatus">READY</span>
      <button class="btn-results" id="btnResults">Results</button>
    </div>

    <div class="dashboard-body">
      <div class="left-drawer">
        <div class="drawer-tabs">
          <button class="drawer-tab active" data-tab="blue">Blue</button>
          <button class="drawer-tab" data-tab="red">Red</button>
          <button class="drawer-tab" data-tab="cm">CM</button>
          <button class="drawer-tab" data-tab="sim">Sim</button>
        </div>
        <div class="drawer-content" id="drawerContent"></div>
      </div>

      <div class="globe-area">
        <div class="globe-container-dashboard" id="dashboardGlobe"></div>
        ${renderPhaseStrip()}
      </div>

      <div class="results-overlay" id="resultsOverlay">
        <div class="results-header">
          <h2>Results</h2>
          <button class="btn-close-results" id="btnCloseResults">&times;</button>
        </div>
        <div class="results-body" id="resultsBody">
          <div style="color: var(--text-dim); font-family: var(--font-mono); font-size: 11px;">
            Run simulation to see results.
          </div>
        </div>
      </div>
    </div>

    <div class="bottom-strip">
      <button class="btn-run" id="btnRun">&#9654; Run</button>
      <button class="btn-reset" id="btnReset">&#8634; Reset</button>
      <div class="spacer"></div>
      <span class="run-info" id="runInfo"></span>
    </div>
  `;
  container.appendChild(el);

  // Init globe
  const globeContainer = el.querySelector('#dashboardGlobe');
  initGlobe(globeContainer);
  createCountriesLayer(getGlobeGroup());
  createHudOverlay(getScene());
  setHighlightedCountries([blueKey, redKey]);
  startAnimation();
  setupInteraction(globeContainer);

  // Render drawer controls
  renderDrawerControls(
    el.querySelector('#drawerContent'),
    blueKey,
    redKey
  );

  // if stateData includes runResult, show it immediately
  const sd = getStateData();
  if (sd.runResult) {
    lastResult = sd.runResult;
    showResults(sd.runParams, sd.runResult, sd.runElapsed);
  }

  // Wire events
  wireEvents();

  // Activate
  requestAnimationFrame(() => {
    el.classList.add('active');
  });
}

function wireEvents() {
  // Tab switching
  el.querySelectorAll('.drawer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      el.querySelectorAll('.drawer-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const panels = el.querySelectorAll('.tab-panel');
      panels.forEach(p => p.classList.remove('active'));
      const target = el.querySelector(`#tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });

  // Run button triggers loading state; simulation will execute after animation
  el.querySelector('#btnRun').addEventListener('click', handleRun);

  // Reset button also goes through loading, dispose globe immediately
  el.querySelector('#btnReset').addEventListener('click', () => {
    disposeGlobe();
    transition(STATES.LOADING, { action: 'reset' });
  });

  // Results toggle
  el.querySelector('#btnResults').addEventListener('click', () => {
    el.querySelector('#resultsOverlay').classList.toggle('open');
  });

  // Close results
  el.querySelector('#btnCloseResults').addEventListener('click', () => {
    el.querySelector('#resultsOverlay').classList.remove('open');
  });
}

/**
 * Update the dashboard UI after a simulation run completes.
 */
function showResults(params, result, elapsed) {
  const status = el.querySelector('#simStatus');
  status.textContent = 'COMPLETE';
  status.style.color = 'var(--accent-green)';

  el.querySelector('#runInfo').textContent = `${params.nTrials} trials in ${elapsed}s`;

  const resultsBody = el.querySelector('#resultsBody');
  resultsBody.innerHTML = renderResultsContent(params, result);

  el.querySelector('#resultsOverlay').classList.add('open');
  el.querySelector('#btnResults').classList.add('has-data');
}

function animatePhases(callback) {
  const phases = ['detect', 'boost', 'mid', 'term'];
  const nodes = el.querySelectorAll('.phase-node');

  // Reset all
  nodes.forEach(n => {
    n.classList.remove('active', 'complete');
  });

  let i = 0;
  function step() {
    if (i > 0) nodes[i - 1].classList.replace('active', 'complete');
    if (i < phases.length) {
      nodes[i].classList.add('active');
      i++;
      setTimeout(step, 200);
    } else {
      if (callback) callback();
    }
  }
  step();
}

function handleRun() {
  const params = readParamsFromUI(blueKey, redKey);
  transition(STATES.LOADING, { action: 'run', params, blueKey, redKey });
}

export function removeDashboard() {
  if (el) {
    disposeGlobe();
    el.remove();
    el = null;
  }
}
