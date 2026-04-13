/**
 * S1 — Country Selection screen.
 * Blue (defender) on left, globe in center, Red (attacker) on right.
 */

import { STATES, transition } from '../stateMachine.js';
import { COUNTRIES } from '../../config/countries.js';
import { initGlobe, startAnimation, setupInteraction, getGlobeGroup, getScene } from '../globe/globeCore.js';
import { createCountriesLayer, highlightCountry, unhighlightCountry, setHighlightedCountries, getCountryCenter } from '../globe/countriesLayer.js';
import { createHudOverlay } from '../globe/hudOverlay.js';
import { rotateToCountry } from '../globe/globeCore.js';

let selectedBlue = null;
let selectedRed = null;
let el = null;

function buildList(side, countries, cssClass) {
  const items = Object.entries(countries).map(([key, data]) => {
    return `<div class="select-item" data-side="${side}" data-key="${key}">${data.label}</div>`;
  });
  return `
    <div class="select-list ${cssClass}">
      <h3>${side === 'blue' ? 'Defender' : 'Attacker'}</h3>
      ${items.join('')}
    </div>
  `;
}

function updateConfirmButton() {
  const btn = el.querySelector('.btn-confirm');
  if (selectedBlue && selectedRed) {
    btn.classList.add('enabled');
  } else {
    btn.classList.remove('enabled');
  }
}

function handleItemClick(e) {
  const item = e.target.closest('.select-item');
  if (!item) return;

  const side = item.dataset.side;
  const key = item.dataset.key;

  // Deselect others in same list
  const list = item.closest('.select-list');
  list.querySelectorAll('.select-item').forEach(i => i.classList.remove('selected'));
  item.classList.add('selected');

  if (side === 'blue') {
    selectedBlue = key;
  } else {
    selectedRed = key;
  }

  // Update globe highlights
  const highlights = [];
  if (selectedBlue) highlights.push(selectedBlue);
  if (selectedRed) highlights.push(selectedRed);
  setHighlightedCountries(highlights);

  // Rotate globe towards selected country
  const center = getCountryCenter(key);
  rotateToCountry(center);

  updateConfirmButton();
}

function handleItemHover(e) {
  const item = e.target.closest('.select-item');
  if (!item) return;
  const key = item.dataset.key;
  highlightCountry(key);
}

function handleItemLeave(e) {
  const item = e.target.closest('.select-item');
  if (!item) return;
  const key = item.dataset.key;
  // Only unhighlight if not selected
  if (key !== selectedBlue && key !== selectedRed) {
    unhighlightCountry(key);
  }
}

function showScenarioLockedFlash(callback) {
  const flash = document.createElement('div');
  flash.className = 'screen-scenario-locked';
  flash.innerHTML = `
    <div class="locked-primary">CONFIGURATION COMPLETE</div>
    <div class="locked-secondary">initializing</div>
  `;
  document.body.appendChild(flash);

  requestAnimationFrame(() => flash.classList.add('active'));

  // Trigger transition partway through, let flash fade out over the dashboard appearing
  setTimeout(() => {
    callback();
    setTimeout(() => {
      flash.classList.add('fade-out');
      setTimeout(() => flash.remove(), 400);
    }, 50);
  }, 350);
}

function handleConfirm() {
  if (!selectedBlue || !selectedRed) return;
  showScenarioLockedFlash(() => {
    transition(STATES.DASHBOARD, { blueKey: selectedBlue, redKey: selectedRed });
  });
}

export function renderSelect(container) {
  selectedBlue = null;
  selectedRed = null;

  el = document.createElement('div');
  el.className = 'screen-select';
  el.innerHTML = `
    <div class="dot-grid"></div>
    <div class="select-header">
      <h1>Strategic Homeland Intercept Evaluation<br>
      and Layered Defense Model</h1>
      <div class="tagline">Select parameters</div>
    </div>
    <div class="select-body">
      ${buildList('blue', COUNTRIES.blue, 'blue')}
      <div class="globe-container-select"></div>
      ${buildList('red', COUNTRIES.red, 'red')}
    </div>
    <div class="select-footer">
      <button class="btn-confirm">Confirm</button>
    </div>
  `;
  container.appendChild(el);

  // Init globe in the container
  const globeContainer = el.querySelector('.globe-container-select');
  initGlobe(globeContainer);
  createCountriesLayer(getGlobeGroup());
  createHudOverlay(getScene());
  startAnimation();
  setupInteraction(globeContainer);

  // Event listeners
  el.addEventListener('click', (e) => {
    if (e.target.closest('.select-item')) handleItemClick(e);
    if (e.target.closest('.btn-confirm')) handleConfirm();
  });

  el.addEventListener('mouseover', (e) => {
    if (e.target.closest('.select-item')) handleItemHover(e);
  });

  el.addEventListener('mouseout', (e) => {
    if (e.target.closest('.select-item')) handleItemLeave(e);
  });

  // Activate with slight delay for transition
  requestAnimationFrame(() => {
    el.classList.add('active');
  });
}
