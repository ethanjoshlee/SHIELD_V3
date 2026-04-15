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
import {
  BLUE_DEFENSE_CONTROLLED_FIELDS,
  BLUE_DEFENSE_PRESET_FIELDS,
  BLUE_DEFENSE_ALWAYS_EDITABLE_FIELDS,
  DEFAULT_BLUE_DEFENSE_PRESET,
  getBlueDefensePresetMeta,
  resolveBlueDefenseProfile,
} from '../../config/blueDefensePresets.js';
import {
  DEFAULT_RED_ATTACK_PRESET,
  RED_ATTACK_PRESET_FIELDS,
  getRedAttackPresetMeta,
  resolveRedAttackProfile,
} from '../../config/redAttackPresets.js';
import { initGlobe, startAnimation, setupInteraction, getGlobeGroup, getScene, rotateToCountry } from '../globe/globeCore.js';
import { createCountriesLayer, setHighlightedCountries, getCountryCenter } from '../globe/countriesLayer.js';
import { createHudOverlay } from '../globe/hudOverlay.js';
import { blueParamsHTML, redParamsHTML, simParamsHTML, readParamsFromUI } from '../controls.js';

const STEPS = [
  { key: 'sides', title: '', subtitle: '', number: '01 / 04' },
  { key: 'blue', title: 'CONFIGURE BLUE', subtitle: 'Defense presets and assumptions', number: '02 / 04' },
  { key: 'red',  title: 'CONFIGURE RED', subtitle: 'Attack presets and assumptions', number: '03 / 04' },
  { key: 'sim',  title: 'MODEL COMPUTATION', subtitle: 'Trial settings and model parameters', number: '04 / 04' },
];

const DOCTRINE_GROUPS = [
  {
    param: 'midcourseKineticDoctrineMode',
    defaultMode: 'barrage',
    barrageClass: 'doctrine-midcourse-kinetic-barrage-only',
    slsClass: 'doctrine-midcourse-kinetic-sls-only',
  },
];

function formatBlueSummaryValue(param, rawValue) {
  if (rawValue == null || rawValue === '') return '-';

  const value = Number(rawValue);
  if (!Number.isFinite(value)) return String(rawValue);

  return `${(value * 100).toFixed(1)}%`;
}

function formatRedSummaryValue(param, rawValue) {
  if (rawValue == null || rawValue === '') return '-';

  if (param === 'launchRegion') {
    return LAUNCH_REGION_PRESETS[rawValue]?.label ?? rawValue;
  }

  const value = Number(rawValue);
  if (!Number.isFinite(value)) return String(rawValue);

  if (param === 'kilotonsPerWarhead') return `${Math.round(value)} kt`;
  if (
    param === 'boostEvasionPenalty' ||
    param === 'midcourseInterceptionPenalty' ||
    param === 'asatSensingPenalty' ||
    param === 'asatAvailabilityPenalty'
  ) {
    return `${(value * 100).toFixed(1)}%`;
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

function setInlineTooltipBubblePlacement(bubble, horizontal, vertical) {
  bubble.classList.toggle('wizard-inline-tooltip-bubble--start', horizontal === 'start');
  bubble.classList.toggle('wizard-inline-tooltip-bubble--end', horizontal === 'end');
  bubble.classList.toggle('wizard-inline-tooltip-bubble--above', vertical === 'above');
}

function measureInlineTooltipBubble(bubble) {
  const previousDisplay = bubble.style.display;
  const previousVisibility = bubble.style.visibility;
  const previousOpacity = bubble.style.opacity;
  const previousTransform = bubble.style.transform;

  bubble.style.display = 'block';
  bubble.style.visibility = 'hidden';
  bubble.style.opacity = '0';
  bubble.style.transform = 'none';

  const rect = bubble.getBoundingClientRect();

  bubble.style.display = previousDisplay;
  bubble.style.visibility = previousVisibility;
  bubble.style.opacity = previousOpacity;
  bubble.style.transform = previousTransform;

  return rect;
}

function positionInlineTooltip(tooltipEl) {
  const bubble = tooltipEl?.querySelector('.wizard-inline-tooltip-bubble');
  if (!bubble) return;

  const boundary =
    tooltipEl.closest('.wizard-params-container') ??
    tooltipEl.closest('.wizard-left') ??
    document.documentElement;
  const boundaryRect = boundary.getBoundingClientRect();
  const padding = 12;
  const defaultHorizontal = tooltipEl.dataset.tooltipPlacement === 'end' ? 'end' : 'start';
  const horizontalOptions = defaultHorizontal === 'end' ? ['end', 'start'] : ['start', 'end'];
  const verticalOptions = ['below', 'above'];
  const maxWidth = Math.max(180, Math.floor(boundaryRect.width - padding * 2));
  bubble.style.maxWidth = `${maxWidth}px`;

  let bestPlacement = {
    horizontal: defaultHorizontal,
    vertical: 'below',
    overflow: Number.POSITIVE_INFINITY,
  };

  outer: for (const vertical of verticalOptions) {
    for (const horizontal of horizontalOptions) {
      setInlineTooltipBubblePlacement(bubble, horizontal, vertical);
      const rect = measureInlineTooltipBubble(bubble);
      const overflowLeft = Math.max(0, boundaryRect.left + padding - rect.left);
      const overflowRight = Math.max(0, rect.right - (boundaryRect.right - padding));
      const overflowTop = Math.max(0, boundaryRect.top + padding - rect.top);
      const overflowBottom = Math.max(0, rect.bottom - (boundaryRect.bottom - padding));
      const overflow = overflowLeft + overflowRight + overflowTop + overflowBottom;

      if (overflow < bestPlacement.overflow) {
        bestPlacement = { horizontal, vertical, overflow };
      }

      if (overflow === 0) {
        bestPlacement = { horizontal, vertical, overflow };
        break outer;
      }
    }
  }

  setInlineTooltipBubblePlacement(bubble, bestPlacement.horizontal, bestPlacement.vertical);
}

export function renderWizard(container, transitionFn) {
  // All wizard state is local — fresh on every invocation
  let el = null;
  let currentStep = 0;
  let selectedBlue = null;
  let selectedRed = null;
  const blueCustomDrafts = {};
  const redCustomDrafts = {};

  function getParamInput(param) {
    return el?.querySelector(`[data-param="${param}"]`);
  }

  function currentBlueDefensePreset() {
    return getParamInput('blueDefensePreset')?.value ?? DEFAULT_BLUE_DEFENSE_PRESET;
  }

  function currentRedAttackPreset() {
    return getParamInput('redAttackPreset')?.value ?? DEFAULT_RED_ATTACK_PRESET;
  }

  function snapshotCurrentBlueDraft() {
    const snapshot = {};
    for (const param of BLUE_DEFENSE_PRESET_FIELDS) {
      snapshot[param] = getParamInput(param)?.value ?? '';
    }
    return snapshot;
  }

  function saveCurrentBlueCustomDraft() {
    if (!selectedBlue) return;
    blueCustomDrafts[selectedBlue] = snapshotCurrentBlueDraft();
  }

  function activateRedTab(tabId) {
    const redRoot = el?.querySelector('[data-red-attack-root]');
    if (!redRoot) return;

    redRoot.querySelectorAll('.red-custom-tabs .wizard-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    redRoot.querySelectorAll('.wizard-tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.tabPanel === tabId);
    });
  }

  function activateBlueTab(tabId) {
    const blueRoot = el?.querySelector('[data-blue-defense-root]');
    if (!blueRoot) return;

    blueRoot.querySelectorAll('.blue-custom-tabs .wizard-tab').forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    blueRoot.querySelectorAll('.wizard-tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.dataset.tabPanel === tabId);
    });
  }

  function snapshotCurrentRedDraft() {
    const snapshot = {};
    for (const param of RED_ATTACK_PRESET_FIELDS) {
      snapshot[param] = getParamInput(param)?.value ?? '';
    }
    return snapshot;
  }

  function saveCurrentRedCustomDraft() {
    if (!selectedRed) return;
    redCustomDrafts[selectedRed] = snapshotCurrentRedDraft();
  }

  function getCountriesList(side) {
    const countries = COUNTRIES[side];
    const selected = side === 'blue' ? selectedBlue : selectedRed;
    const sortedCountries = Object.entries(countries).sort(([, a], [, b]) =>
      (a.label ?? '').localeCompare(b.label ?? '')
    );
    if (side === 'blue') {
      sortedCountries.sort(([keyA], [keyB]) => {
        if (keyA === 'US' && keyB !== 'US') return -1;
        if (keyB === 'US' && keyA !== 'US') return 1;
        return 0;
      });
    }
    const items = sortedCountries.map(([key, cdata]) => {
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

  function setParamValue(param, val) {
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
  }

  function updateBlueDefensePresetUI() {
    const blueRoot = el?.querySelector('[data-blue-defense-root]');
    if (!blueRoot) return;

    const presetKey = currentBlueDefensePreset();
    const isCustom = presetKey === 'custom';
    const previousMode = blueRoot.dataset.blueDefenseMode;
    const activeTabId = blueRoot.querySelector('.blue-custom-tabs .wizard-tab.active')?.dataset.tab;
    blueRoot.dataset.blueDefenseMode = isCustom ? 'custom' : 'preset';

    if (isCustom && previousMode !== 'custom') {
      activateBlueTab('blue-sensing');
    } else if (!isCustom && activeTabId !== 'blue-gbi' && activeTabId !== 'blue-space') {
      activateBlueTab('blue-space');
    }

    blueRoot.querySelectorAll('[data-blue-defense-preset]').forEach((btn) => {
      const selected = btn.dataset.blueDefensePreset === presetKey;
      btn.classList.toggle('selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    const meta = getBlueDefensePresetMeta(presetKey);
    const titleEl = blueRoot.querySelector('[data-blue-preset-title]');
    const descriptionEl = blueRoot.querySelector('[data-blue-preset-description]');
    if (titleEl) titleEl.textContent = meta.title;
    if (descriptionEl) descriptionEl.textContent = meta.description;

    blueRoot.querySelectorAll('[data-blue-summary-value]').forEach((node) => {
      const param = node.dataset.blueSummaryValue;
      node.textContent = formatBlueSummaryValue(param, getParamInput(param)?.value);
    });
  }

  function applyResolvedBlueDefenseProfile(presetKey, { preserveEditable = true } = {}) {
    if (!selectedBlue) return;

    const overrides = {};
    if (preserveEditable) {
      for (const param of BLUE_DEFENSE_ALWAYS_EDITABLE_FIELDS) {
        const currentValue = getParamInput(param)?.value;
        if (currentValue == null || currentValue === '') continue;
        overrides[param] = currentValue;
      }
    }

    const profile = resolveBlueDefenseProfile(selectedBlue, presetKey, overrides);
    for (const param of BLUE_DEFENSE_PRESET_FIELDS) {
      if (profile[param] === undefined || profile[param] === null) continue;
      setParamValue(param, profile[param]);
    }
  }

  function setBlueDefensePreset(presetKey, { preserveEditable = true, saveDraft = true } = {}) {
    const presetInput = getParamInput('blueDefensePreset');
    if (!presetInput) return;

    const previousPreset = currentBlueDefensePreset();
    if (saveDraft && previousPreset === 'custom' && presetKey !== 'custom') {
      saveCurrentBlueCustomDraft();
    }

    presetInput.value = presetKey;
    presetInput.dispatchEvent(new Event('change', { bubbles: true }));

    if (presetKey === 'custom') {
      const draft = selectedBlue ? blueCustomDrafts[selectedBlue] : null;
      if (draft) {
        for (const param of BLUE_DEFENSE_PRESET_FIELDS) {
          if (draft[param] == null || draft[param] === '') continue;
          setParamValue(param, draft[param]);
        }
      }
    } else {
      applyResolvedBlueDefenseProfile(presetKey, { preserveEditable });
    }

    updateBlueDefensePresetUI();
  }

  function updateRedAttackPresetUI() {
    const redRoot = el?.querySelector('[data-red-attack-root]');
    if (!redRoot) return;

    const presetKey = currentRedAttackPreset();
    const isCustom = presetKey === 'custom';
    redRoot.dataset.redAttackMode = isCustom ? 'custom' : 'preset';

    redRoot.querySelectorAll('[data-red-attack-preset]').forEach((btn) => {
      const selected = btn.dataset.redAttackPreset === presetKey;
      btn.classList.toggle('selected', selected);
      btn.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });

    const meta = getRedAttackPresetMeta(presetKey);
    const titleEl = redRoot.querySelector('[data-red-preset-title]');
    const descriptionEl = redRoot.querySelector('[data-red-preset-description]');
    if (titleEl) titleEl.textContent = meta.title;
    if (descriptionEl) descriptionEl.textContent = meta.description;

    redRoot.querySelectorAll('[data-red-summary-value]').forEach((node) => {
      const param = node.dataset.redSummaryValue;
      node.textContent = formatRedSummaryValue(param, getParamInput(param)?.value);
    });

    if (!isCustom) activateRedTab('red-strike');
  }

  function applyResolvedRedAttackProfile(presetKey, { preserveMissiles = true } = {}) {
    if (!selectedRed) return;

    const currentMissiles = preserveMissiles ? getParamInput('nMissiles')?.value : null;
    const overrides =
      preserveMissiles && currentMissiles != null && currentMissiles !== ''
        ? { nMissiles: Number(currentMissiles) }
        : {};
    const profile = resolveRedAttackProfile(selectedRed, presetKey, overrides);

    for (const param of RED_ATTACK_PRESET_FIELDS) {
      if (profile[param] === undefined || profile[param] === null) continue;
      setParamValue(param, profile[param]);
    }
  }

  function setRedAttackPreset(presetKey, { preserveMissiles = true, saveDraft = true } = {}) {
    const presetInput = getParamInput('redAttackPreset');
    if (!presetInput) return;

    const previousPreset = currentRedAttackPreset();
    if (saveDraft && previousPreset === 'custom' && presetKey !== 'custom') {
      saveCurrentRedCustomDraft();
    }

    presetInput.value = presetKey;
    presetInput.dispatchEvent(new Event('change', { bubbles: true }));

    if (presetKey === 'custom') {
      const draft = selectedRed ? redCustomDrafts[selectedRed] : null;
      if (draft) {
        for (const param of RED_ATTACK_PRESET_FIELDS) {
          if (draft[param] == null || draft[param] === '') continue;
          setParamValue(param, draft[param]);
        }
      }
      activateRedTab('red-strike');
    } else {
      applyResolvedRedAttackProfile(presetKey, { preserveMissiles });
    }

    updateRedAttackPresetUI();
  }

  function handleCountryClick(e) {
    const item = e.target.closest('.wizard-country-item');
    if (!item) return;

    const side = item.dataset.side;
    const key  = item.dataset.key;

    const list = item.closest('.wizard-country-section');
    list.querySelectorAll(`.wizard-country-item[data-side="${side}"]`).forEach(i => {
      i.classList.remove('selected', side);
    });
    item.classList.add('selected', side);

    if (side === 'blue') {
      if (selectedBlue && selectedBlue !== key && currentBlueDefensePreset() === 'custom') {
        saveCurrentBlueCustomDraft();
      }
      selectedBlue = key;
      setBlueDefensePreset(DEFAULT_BLUE_DEFENSE_PRESET, {
        preserveEditable: false,
        saveDraft: false,
      });
    } else {
      if (selectedRed && selectedRed !== key && currentRedAttackPreset() === 'custom') {
        saveCurrentRedCustomDraft();
      }
      selectedRed = key;
      setRedAttackPreset(DEFAULT_RED_ATTACK_PRESET, {
        preserveMissiles: false,
        saveDraft: false,
      });
    }

    const center = getCountryCenter(key);
    rotateToCountry(center);
    updateBlueDefensePresetUI();
    updateRedAttackPresetUI();
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
        <div class="project-identity-title">Strategic Homeland Interception Evaluation and Layered Defense Model</div>
        <div class="project-identity-attribution">Defense, Emerging Technology, and Strategy Program<br>Belfer Center for Science and International Affairs</div>
      </div>
    </div>
  `;

  container.appendChild(el);
  requestAnimationFrame(() => el.classList.add('active'));

  el.addEventListener('mouseover', (event) => {
    const tooltip = event.target.closest('.wizard-inline-tooltip');
    if (!tooltip || !el.contains(tooltip)) return;

    const previousTooltip =
      event.relatedTarget instanceof Element
        ? event.relatedTarget.closest('.wizard-inline-tooltip')
        : null;
    if (previousTooltip === tooltip) return;

    positionInlineTooltip(tooltip);
  });

  el.addEventListener('focusin', (event) => {
    const tooltip = event.target.closest('.wizard-inline-tooltip');
    if (!tooltip || !el.contains(tooltip)) return;
    positionInlineTooltip(tooltip);
  });

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

  const bluePresetInput = getParamInput('blueDefensePreset');
  bluePresetInput?.addEventListener('change', updateBlueDefensePresetUI);
  for (const param of BLUE_DEFENSE_CONTROLLED_FIELDS) {
    const input = getParamInput(param);
    input?.addEventListener('input', updateBlueDefensePresetUI);
    input?.addEventListener('change', updateBlueDefensePresetUI);
  }

  el.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-blue-defense-preset]');
    if (!btn || !el.contains(btn)) return;
    const presetKey = btn.dataset.blueDefensePreset;
    if (!presetKey || presetKey === currentBlueDefensePreset()) return;
    setBlueDefensePreset(presetKey, { preserveEditable: true });
  });

  const redPresetInput = getParamInput('redAttackPreset');
  redPresetInput?.addEventListener('change', updateRedAttackPresetUI);
  for (const param of RED_ATTACK_PRESET_FIELDS) {
    const input = getParamInput(param);
    input?.addEventListener('input', updateRedAttackPresetUI);
    input?.addEventListener('change', updateRedAttackPresetUI);
  }

  el.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-red-attack-preset]');
    if (!btn || !el.contains(btn)) return;
    const presetKey = btn.dataset.redAttackPreset;
    if (!presetKey || presetKey === currentRedAttackPreset()) return;
    setRedAttackPreset(presetKey, { preserveMissiles: true });
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

  updateBlueDefensePresetUI();
  updateRedAttackPresetUI();
  updateStepDisplay();
}
