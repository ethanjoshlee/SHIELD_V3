/**
 * WIZARD screen — four-step pre-run configuration with persistent globe.
 * Step 0: SIDES (Blue/Red selection)
 * Step 1: BLUE (defender params)
 * Step 2: RED (attacker params)
 * Step 3: SIM (sim + CM params)
 * All parameter inputs rendered once and kept in DOM; nav shows/hides step sections.
 * All state is local to renderWizard — safe for multiple invocations per session.
 */

import { STATES } from '../stateMachine.js';
import { COUNTRIES } from '../../config/countries.js';
import { DEFAULTS } from '../../state.js';
import { LAUNCH_REGION_PRESETS } from '../../config/launchRegions.js';
import { initGlobe, startAnimation, setupInteraction, getGlobeGroup, getScene, rotateToCountry } from '../globe/globeCore.js';
import { createCountriesLayer, setHighlightedCountries, getCountryCenter } from '../globe/countriesLayer.js';
import { createHudOverlay } from '../globe/hudOverlay.js';
import { blueParamsHTML, redParamsHTML, simParamsHTML, readParamsFromUI } from '../controls.js';

const STEPS = [
  { key: 'sides', title: '', subtitle: '', number: '01 / 04' },
  { key: 'blue', title: 'CONFIGURE BLUE', subtitle: 'Baseline defense capabilities and parameters', number: '02 / 04' },
  { key: 'red',  title: 'CONFIGURE RED', subtitle: 'Attack capabilities and parameters', number: '03 / 04' },
  { key: 'sim',  title: 'MODEL COMPUTATION', subtitle: 'Trial settings and model parameters', number: '04 / 04' },
];

const DOCTRINE_GROUPS = [
  {
    param: 'midcourseKineticDoctrineMode',
    defaultMode: 'barrage',
    barrageClass: 'doctrine-midcourse-kinetic-barrage-only',
    slsClass: 'doctrine-midcourse-kinetic-sls-only',
  },
  {
    param: 'boostKineticDoctrineMode',
    defaultMode: 'barrage',
    barrageClass: 'doctrine-boost-kinetic-barrage-only',
    slsClass: 'doctrine-boost-kinetic-sls-only',
  },
];

function resolveBluePresetParamValue(bluePreset, param) {
  if (!bluePreset) return undefined;
  if (bluePreset[param] !== undefined && bluePreset[param] !== null) {
    return bluePreset[param];
  }

  switch (param) {
    case 'nInventory':
      return bluePreset.interceptors?.midcourse_gbi?.deployed;
    case 'pkWarhead':
      return bluePreset.interceptors?.midcourse_gbi?.pk;
    case 'nSpaceBoostKinetic':
      return bluePreset.interceptors?.boost_kinetic?.deployed;
    case 'pkSpaceBoostKinetic':
      return bluePreset.interceptors?.boost_kinetic?.pk;
    case 'nSpaceBoostDirected':
      return bluePreset.interceptors?.boost_laser?.deployed;
    case 'pkSpaceBoostDirected':
      return bluePreset.interceptors?.boost_laser?.pk;
    case 'nMidcourseSpaceKinetic':
      return bluePreset.interceptors?.midcourse_kinetic?.deployed;
    case 'pkMidcourseSpaceKinetic':
      return bluePreset.interceptors?.midcourse_kinetic?.pk;
    case 'nMidcourseSpaceLaser':
      return bluePreset.interceptors?.midcourse_laser?.deployed;
    case 'pkMidcourseSpaceLaser':
      return bluePreset.interceptors?.midcourse_laser?.pk;
    case 'nTerminalKinetic':
      return bluePreset.interceptors?.terminal_kinetic?.deployed;
    case 'pkTerminalKinetic':
      return bluePreset.interceptors?.terminal_kinetic?.pk;
    case 'nTerminalNuclear':
      return bluePreset.interceptors?.terminal_nuclear?.deployed;
    case 'pkTerminalNuclear':
      return bluePreset.interceptors?.terminal_nuclear?.pk;
    case 'midcourseKineticDoctrineMode':
      return bluePreset.doctrineMode;
    case 'midcourseKineticShotsPerTarget':
      return bluePreset.shotsPerTarget;
    case 'midcourseKineticMaxShotsPerTarget':
      return bluePreset.maxShotsPerTarget;
    case 'midcourseKineticPReengage':
      return bluePreset.pReengage;
    case 'boostKineticDoctrineMode':
      return bluePreset.doctrineMode;
    case 'boostKineticShotsPerTarget':
      return bluePreset.shotsPerTarget;
    case 'boostKineticMaxShotsPerTarget':
      return bluePreset.maxShotsPerTarget;
    case 'boostKineticPReengage':
      return bluePreset.pReengage;
    default:
      return undefined;
  }
}

function summarizeRedMissileClasses(redPreset) {
  const classes = redPreset?.missileClasses;
  if (!classes) return null;

  let totalMissiles = 0;
  let mirvWeighted = 0;
  let decoysPerMissileWeighted = 0;
  let yieldWeighted = 0;
  let boostEvasionWeighted = 0;

  for (const cls of Object.values(classes)) {
    const count = Math.max(0, Number(cls?.count) || 0);
    if (!count) continue;
    const mirvs = Math.max(1, Number(cls?.mirvsPerMissile) || 1);
    const decoysPerWarhead = Math.max(0, Number(cls?.decoysPerWarhead) || 0);
    const yieldKt = Math.max(0, Number(cls?.yieldKt) || 0);
    const boostEvasion = Math.max(0, Number(cls?.boostEvasion) || 0);

    totalMissiles += count;
    mirvWeighted += count * mirvs;
    decoysPerMissileWeighted += count * (decoysPerWarhead * mirvs);
    yieldWeighted += count * yieldKt;
    boostEvasionWeighted += count * boostEvasion;
  }

  if (!totalMissiles) return null;

  return {
    nMissiles: Math.round(totalMissiles),
    mirvsPerMissile: Math.max(1, Math.round(mirvWeighted / totalMissiles)),
    decoysPerMissile: Math.max(0, Math.round(decoysPerMissileWeighted / totalMissiles)),
    kilotonsPerWarhead: Math.max(20, Math.round(yieldWeighted / totalMissiles)),
    boostEvasionPenalty: Math.max(0, Math.min(0.999, boostEvasionWeighted / totalMissiles)),
  };
}

function resolveRedPresetParamValue(redPreset, param, redSummary) {
  if (!redPreset) return undefined;
  if (redPreset[param] !== undefined && redPreset[param] !== null) {
    return redPreset[param];
  }

  switch (param) {
    case 'nMissiles':
      return redSummary?.nMissiles;
    case 'mirvsPerMissile':
      return redSummary?.mirvsPerMissile;
    case 'decoysPerMissile':
      return redSummary?.decoysPerMissile;
    case 'kilotonsPerWarhead':
      return redSummary?.kilotonsPerWarhead;
    case 'boostEvasionPenalty':
      return redSummary?.boostEvasionPenalty;
    default:
      return undefined;
  }
}

export function renderWizard(container, transitionFn) {
  // All wizard state is local — fresh on every invocation
  let el = null;
  let currentStep = 0;
  let selectedBlue = null;
  let selectedRed = null;

  function getCountriesList(side) {
    const countries = COUNTRIES[side];
    const selected = side === 'blue' ? selectedBlue : selectedRed;
    const items = Object.entries(countries).map(([key, cdata]) => {
      const isSelected = key === selected;
      const selectedClass = isSelected ? `selected ${side}` : '';
      return `<div class="wizard-country-item ${selectedClass}" data-side="${side}" data-key="${key}">${cdata.label}</div>`;
    });
    return items.join('');
  }

  function updateDoctrineGating() {
    for (const group of DOCTRINE_GROUPS) {
      const input = el.querySelector(`[data-param="${group.param}"]`);
      const mode = input?.value ?? group.defaultMode;

      el.querySelectorAll(`.wizard-toggle-item[data-doctrine-param="${group.param}"]`).forEach((btn) => {
        const selected = btn.dataset.doctrineMode === mode;
        btn.classList.toggle('selected', selected);
        btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
      });

      el.querySelectorAll(`.${group.barrageClass}`).forEach((row) => {
        row.style.display = mode === 'barrage' ? '' : 'none';
      });
      el.querySelectorAll(`.${group.slsClass}`).forEach((row) => {
        row.style.display = mode === 'sls' ? '' : 'none';
      });
    }
  }

  function updateStepDisplay() {
    const step = STEPS[currentStep];
    const isSidesStep = step.key === 'sides';

    el.querySelector('.step-badge').textContent = step.number;
    el.querySelector('.wizard-title').textContent = step.title;
    el.querySelector('.wizard-subtitle').textContent = step.subtitle;
    el.classList.toggle('wizard-step-sides', isSidesStep);
    el.classList.toggle('wizard-step-sim', step.key === 'sim');

    const paramSections = el.querySelectorAll('.step-params');
    paramSections.forEach((section) => {
      section.classList.toggle('active', section.dataset.step === step.key);
    });

    // Country-gating: params hidden until the step's country is selected
    const paramsContainer = el.querySelector('.wizard-params-container');
    const stepHasCountry = step.key === 'blue' ? !!selectedBlue
                         : step.key === 'red' ? !!selectedRed
                         : step.key === 'sim';
    paramsContainer.classList.toggle('unlocked', stepHasCountry);

    const btnBack = el.querySelector('.btn-back');
    const btnNext = el.querySelector('.btn-next');
    const btnRun  = el.querySelector('.btn-run');

    btnBack.style.display = currentStep > 0 ? 'block' : 'none';
    btnNext.style.display = currentStep < STEPS.length - 1 ? 'block' : 'none';
    btnRun.style.display  = currentStep === STEPS.length - 1 ? 'block' : 'none';

    if (step.key === 'sides') {
      btnNext.disabled = !(selectedBlue && selectedRed);
    } else if (step.key === 'blue') {
      btnNext.disabled = !selectedBlue;
    } else if (step.key === 'red') {
      btnNext.disabled = !selectedRed;
    } else {
      btnNext.disabled = false;
    }

    const highlights = [];
    if (selectedBlue) highlights.push(selectedBlue);
    if (selectedRed)  highlights.push(selectedRed);
    setHighlightedCountries(highlights);
  }

  function handleCountryClick(e) {
    const item = e.target.closest('.wizard-country-item');
    if (!item) return;

    const side = item.dataset.side;
    const key  = item.dataset.key;

    const setParamValue = (param, val) => {
      const probRange = el.querySelector(`[data-prob-target="${param}"]`);
      if (probRange) {
        probRange.value = (parseFloat(val) * 100).toFixed(1);
        probRange.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const input = el.querySelector(`[data-param="${param}"]`);
      if (!input) return;
      if (input.type === 'range') {
        const min = input.min !== '' ? parseFloat(input.min) : null;
        const max = input.max !== '' ? parseFloat(input.max) : null;
        const numericVal = parseFloat(val);
        if (Number.isFinite(numericVal)) {
          let nextNumeric = numericVal;
          if (Number.isFinite(min)) nextNumeric = Math.max(min, nextNumeric);
          if (Number.isFinite(max)) nextNumeric = Math.min(max, nextNumeric);
          input.value = String(nextNumeric);
        } else {
          input.value = String(val);
        }
      } else {
        input.value = String(val);
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };

    const list = item.closest('.wizard-country-section');
    list.querySelectorAll(`.wizard-country-item[data-side="${side}"]`).forEach(i => {
      i.classList.remove('selected', side);
    });
    item.classList.add('selected', side);

    if (side === 'blue') {
      selectedBlue = key;
      const blue = COUNTRIES.blue[key];
      if (blue) {
        const blueStepParams = Array.from(
          new Set(
            Array.from(
              el.querySelectorAll('.step-params[data-step="blue"] [data-param]')
            ).map((node) => node.dataset.param).filter(Boolean)
          )
        );

        for (const param of blueStepParams) {
          const presetValue = resolveBluePresetParamValue(blue, param);
          const nextValue = presetValue ?? DEFAULTS[param];
          if (nextValue === undefined || nextValue === null) continue;
          setParamValue(param, nextValue);
        }
      }
    } else {
      selectedRed = key;
      const red = COUNTRIES.red[key];
      if (red) {
        const redStepParams = Array.from(
          new Set(
            Array.from(
              el.querySelectorAll('.step-params[data-step="red"] [data-param]')
            ).map((node) => node.dataset.param).filter(Boolean)
          )
        );
        const redSummary = summarizeRedMissileClasses(red);

        for (const param of redStepParams) {
          let presetValue = resolveRedPresetParamValue(red, param, redSummary);
          if (param === 'launchRegion') {
            presetValue = presetValue && LAUNCH_REGION_PRESETS[presetValue] ? presetValue : 'default';
          }
          const nextValue = presetValue ?? DEFAULTS[param];
          if (nextValue === undefined || nextValue === null) continue;
          setParamValue(param, nextValue);
        }
      }
    }

    const center = getCountryCenter(key);
    rotateToCountry(center);
    updateStepDisplay();
  }

  const d = DEFAULTS;

  el = document.createElement('div');
  el.className = 'wizard-shell';
  el.innerHTML = `
    <div class="wizard-left">
      <div class="wizard-step-header">
        <div class="step-badge">${STEPS[0].number}</div>
        <h2 class="wizard-title">${STEPS[0].title}</h2>
        <p class="wizard-subtitle">${STEPS[0].subtitle}</p>
      </div>

      <div class="wizard-params-container">
        <div class="step-params" data-step="blue">
          ${blueParamsHTML(d)}
        </div>
        <div class="step-params" data-step="red">
          ${redParamsHTML(d)}
        </div>
        <div class="step-params" data-step="sim">
          ${simParamsHTML(d)}
        </div>
      </div>

      <div class="wizard-nav">
        <button class="btn btn-back" style="display: none;">← BACK</button>
        <button class="btn btn-next">NEXT →</button>
        <button class="btn btn-run" style="display: none;">COMPUTE RESULTS</button>
      </div>
    </div>

    <div class="wizard-right">
      <div class="wizard-engagement-overlay" aria-label="Define engagement">
        <div class="wizard-engagement-title">DEFINE ENGAGEMENT</div>
        <div class="wizard-engagement-subtitle">Select defending and attacking actors</div>
      </div>
      <div class="wizard-sides-panels">
        <div class="wizard-sides-panel wizard-sides-panel-blue">
          <div class="wizard-sides-panel-title wizard-sides-panel-title-blue">Blue (Defender)</div>
          <div class="wizard-country-section wizard-country-section-sides" data-side-list="blue">
            ${getCountriesList('blue')}
          </div>
        </div>
        <div class="wizard-sides-panel wizard-sides-panel-red">
          <div class="wizard-sides-panel-title wizard-sides-panel-title-red">Red (Attacker)</div>
          <div class="wizard-country-section wizard-country-section-sides" data-side-list="red">
            ${getCountriesList('red')}
          </div>
        </div>
      </div>
      <div class="project-identity project-identity-right" aria-label="Project identity">
        <div class="project-identity-title">Strategic Homeland Intercept Evaluation and Layered Defense Model</div>
        <div class="project-identity-attribution">Defense, Emerging Technology, and Strategy Program<br>Belfer Center for Science and International Affairs</div>
      </div>
    </div>
  `;

  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('active'));

  // Wire sliders — bidirectional sync between range + numeric input, with blur-time normalization.
  const stepPrecision = (step) => {
    const raw = String(step ?? '');
    if (raw.includes('e-')) {
      const exponent = parseInt(raw.split('e-')[1], 10);
      return Number.isFinite(exponent) ? exponent : 0;
    }
    const dotIdx = raw.indexOf('.');
    return dotIdx === -1 ? 0 : raw.length - dotIdx - 1;
  };

  const normalizeByStep = (value, min, max, step, clampBounds) => {
    let next = value;
    if (clampBounds) {
      if (Number.isFinite(min)) next = Math.max(min, next);
      if (Number.isFinite(max)) next = Math.min(max, next);
    }
    if (Number.isFinite(step) && step > 0) {
      const base = Number.isFinite(min) ? min : 0;
      next = base + Math.round((next - base) / step) * step;
      if (clampBounds) {
        if (Number.isFinite(min)) next = Math.max(min, next);
        if (Number.isFinite(max)) next = Math.min(max, next);
      }
    }
    const precision = stepPrecision(step);
    const factor = 10 ** precision;
    return Math.round(next * factor) / factor;
  };

  const formatByStep = (value, step) => {
    const precision = stepPrecision(step);
    return precision > 0 ? value.toFixed(precision) : String(Math.round(value));
  };

  const bindSliderPair = (range, onRangeSync = () => {}) => {
    const row = range.closest('.wizard-slider-row');
    const numberInput = row?.querySelector('.wizard-slider-input');
    const min = range.min !== '' ? parseFloat(range.min) : NaN;
    const max = range.max !== '' ? parseFloat(range.max) : NaN;
    const step = range.step !== '' && range.step !== 'any' ? parseFloat(range.step) : NaN;

    const syncFromRange = ({ syncInput = true } = {}) => {
      const sliderValue = parseFloat(range.value);
      if (!Number.isFinite(sliderValue)) return;
      if (numberInput && syncInput) numberInput.value = formatByStep(sliderValue, step);
      onRangeSync(sliderValue);
    };

    range.addEventListener('input', () => syncFromRange({ syncInput: true }));

    if (numberInput) {
      numberInput.addEventListener('input', () => {
        const raw = numberInput.value.trim();
        if (!raw || raw === '-' || raw === '.' || raw === '-.') return;
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) return;
        if ((Number.isFinite(min) && parsed < min) || (Number.isFinite(max) && parsed > max)) return;
        range.value = String(parsed);
        syncFromRange({ syncInput: false });
      });

      numberInput.addEventListener('blur', () => {
        const raw = numberInput.value.trim();
        if (!raw || raw === '-' || raw === '.' || raw === '-.') {
          syncFromRange();
          return;
        }
        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
          syncFromRange({ syncInput: true });
          return;
        }
        const normalized = normalizeByStep(parsed, min, max, step, true);
        range.value = String(normalized);
        syncFromRange({ syncInput: true });
      });

      numberInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') numberInput.blur();
      });
    }

    syncFromRange({ syncInput: true });
  };

  el.querySelectorAll('[data-prob-target]').forEach((range) => {
    const paramId = range.dataset.probTarget;
    const hidden = el.querySelector(`[data-param="${paramId}"]`);
    bindSliderPair(range, (sliderValue) => {
      if (hidden) hidden.value = (sliderValue / 100).toFixed(4);
    });
  });

  el.querySelectorAll('input[type="range"][data-param]').forEach((range) => {
    bindSliderPair(range);
  });

  // Doctrine gating — initial + on change
  updateDoctrineGating();
  for (const group of DOCTRINE_GROUPS) {
    const input = el.querySelector(`[data-param="${group.param}"]`);
    input?.addEventListener('change', updateDoctrineGating);
  }
  el.addEventListener('click', (event) => {
    const btn = event.target.closest('.wizard-toggle-item[data-doctrine-param][data-doctrine-mode]');
    if (!btn || !el.contains(btn)) return;
    const doctrineParam = btn.dataset.doctrineParam;
    const nextMode = btn.dataset.doctrineMode;
    if (!doctrineParam || !nextMode) return;
    const doctrineModeInput = el.querySelector(`[data-param="${doctrineParam}"]`);
    if (!doctrineModeInput || doctrineModeInput.value === nextMode) return;
    doctrineModeInput.value = nextMode;
    doctrineModeInput.dispatchEvent(new Event('change', { bubbles: true }));
  });

  // Internal tab switching (within Blue / Red steps)
  el.addEventListener('click', (event) => {
    const tab = event.target.closest('.wizard-tab[data-tab]');
    if (!tab || !el.contains(tab)) return;
    const strip = tab.closest('.wizard-tab-strip');
    if (!strip) return;
    const tabId = tab.dataset.tab;
    // Deactivate all tabs in this strip
    strip.querySelectorAll('.wizard-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    // Show the matching panel, hide siblings
    const container = strip.parentElement;
    container.querySelectorAll('.wizard-tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.tabPanel === tabId);
    });
  });

  // Globe — fresh init per invocation
  const globeContainer = el.querySelector('.wizard-right');
  initGlobe(globeContainer);
  createCountriesLayer(getGlobeGroup());
  createHudOverlay(getScene());
  setupInteraction(globeContainer);
  startAnimation();

  // Country section event delegation
  el.querySelectorAll('.wizard-country-section').forEach((countrySection) => {
    countrySection.addEventListener('click', handleCountryClick);
  });

  const btnBack = el.querySelector('.btn-back');
  const btnNext = el.querySelector('.btn-next');
  const btnRun  = el.querySelector('.btn-run');

  btnBack.addEventListener('click', () => {
    currentStep = Math.max(0, currentStep - 1);
    updateStepDisplay();
  });

  btnNext.addEventListener('click', () => {
    currentStep = Math.min(STEPS.length - 1, currentStep + 1);
    updateStepDisplay();
  });

  btnRun.addEventListener('click', () => {
    const params = readParamsFromUI(selectedBlue, selectedRed, el);
    transitionFn(STATES.LOADING, {
      action: 'run',
      fromWizard: true,
      blueKey: selectedBlue,
      redKey: selectedRed,
      params,
    });
  });

  updateStepDisplay();
}
