/**
 * UI controls — HTML template, parameter reading, and doctrine toggle.
 */

import { clamp01 } from '../utils/rng.js';
import { LAUNCH_REGION_ORDER, LAUNCH_REGION_PRESETS } from '../config/launchRegions.js';
import {
  BLUE_DEFENSE_PRESET_META,
  BLUE_DEFENSE_PRESET_ORDER,
  DEFAULT_BLUE_DEFENSE_PRESET,
  getBlueDefensePresetMeta,
  resolveBlueDefenseProfile,
} from '../config/blueDefensePresets.js';
import {
  DEFAULT_RED_ATTACK_PRESET,
  RED_ATTACK_PRESET_ORDER,
  RED_ATTACK_PRESET_META,
  getRedAttackPresetMeta,
  resolveRedAttackProfile,
} from '../config/redAttackPresets.js';

function launchRegionOptionsHTML(selected) {
  return LAUNCH_REGION_ORDER.map((key) => {
    const label = LAUNCH_REGION_PRESETS[key]?.label ?? key;
    const isSelected = key === selected ? 'selected' : '';
    return `<option value="${key}" ${isSelected}>${label}</option>`;
  }).join('');
}

function escapeHTML(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function labelWithTooltipHTML(label, tone, tooltipText, placement = 'start') {
  const safeTooltip = escapeHTML(tooltipText);
  return `
    <div class="wizard-slider-label-inline">
      <span class="wizard-slider-label">${label}</span>
      <span
        class="wizard-inline-tooltip wizard-inline-tooltip--${tone}"
        data-tooltip-placement="${placement}"
        tabindex="0"
        role="note"
        aria-label="${safeTooltip}"
      >
        <span class="wizard-inline-tooltip-trigger" aria-hidden="true">?</span>
        <span class="wizard-inline-tooltip-bubble wizard-inline-tooltip-bubble--${placement}">${safeTooltip}</span>
      </span>
    </div>
  `;
}

const PLACEHOLDER_TOOLTIP_TEXT = 'placeholder';

function controlLabelHTML(label, tone = null, tooltipText = PLACEHOLDER_TOOLTIP_TEXT) {
  if (!tone) {
    return `<span class="wizard-slider-label">${label}</span>`;
  }
  return labelWithTooltipHTML(label, tone, tooltipText, 'start');
}


/**
 * Read all parameter values from the UI form inputs.
 * Supports both id-based and data-param based inputs.
 * @param {string} blueKey - Optional country key for defender
 * @param {string} redKey - Optional country key for attacker
 */
export function readParamsFromUI(blueKey, redKey, root = document) {
  const getValue = (id, param, defaultVal) => {
    let el = document.getElementById(id);
    if (!el) el = root.querySelector(`[data-param="${param}"]`);
    return el?.value || defaultVal;
  };
  const hasBluePresetControl = !!root.querySelector('[data-param="blueDefensePreset"]');
  const hasRedPresetControl = !!root.querySelector('[data-param="redAttackPreset"]');

  const blueDefensePreset = getValue(
    "blueDefensePreset",
    "blueDefensePreset",
    hasBluePresetControl ? DEFAULT_BLUE_DEFENSE_PRESET : "custom"
  );
  const resolvedBlueProfile = blueKey
    ? resolveBlueDefenseProfile(blueKey, blueDefensePreset)
    : null;

  const redAttackPreset = getValue(
    "redAttackPreset",
    "redAttackPreset",
    hasRedPresetControl ? DEFAULT_RED_ATTACK_PRESET : "custom"
  );
  const resolvedRedProfile = redKey
    ? resolveRedAttackProfile(redKey, redAttackPreset)
    : null;

  const nMissiles = Math.max(
    0,
    parseInt(getValue("nMissiles", "nMissiles", resolvedRedProfile?.nMissiles ?? 0), 10) || 0
  );
  const mirvsPerMissile = Math.max(
    1,
    parseInt(getValue("mirvsPerMissile", "mirvsPerMissile", resolvedRedProfile?.mirvsPerMissile ?? 1), 10) || 1
  );
  const kilotonsPerWarhead = Math.min(
    5000,
    Math.max(
      20,
      parseFloat(
        getValue(
          "kilotonsPerWarhead",
          "kilotonsPerWarhead",
          resolvedRedProfile?.kilotonsPerWarhead ?? 400
        )
      ) || 400
    )
  );

  // Decoys per missile formula: decoysPerWarhead = decoysPerMissile / mirvsPerMissile
  let decoysPerWarhead;
  const decoysEl = root.querySelector('[data-param="decoysPerMissile"]');
  if (decoysEl) {
    const decoysPerMissile = Math.max(0, parseFloat(decoysEl.value) || 0);
    decoysPerWarhead = decoysPerMissile / Math.max(1, mirvsPerMissile);
  } else {
    const presetDecoysPerWarhead = resolvedRedProfile?.decoysPerMissile != null
      ? Number(resolvedRedProfile.decoysPerMissile) / Math.max(1, mirvsPerMissile)
      : 0;
    decoysPerWarhead = Math.max(
      0,
      parseFloat(getValue("decoysPerWarhead", "decoysPerWarhead", presetDecoysPerWarhead)) || 0
    );
  }

  const pDetectTrack = clamp01(
    parseFloat(getValue("pDetectTrack", "pDetectTrack", resolvedBlueProfile?.pDetectTrack ?? 0.8)) || 0
  );
  const pClassifyWarhead = clamp01(
    parseFloat(
      getValue(
        "pClassifyWarhead",
        "pClassifyWarhead",
        resolvedBlueProfile?.pClassifyWarhead ?? 0.8
      )
    ) || 0
  );
  const pFalseAlarmDecoy = clamp01(
    parseFloat(
      getValue(
        "pFalseAlarmDecoy",
        "pFalseAlarmDecoy",
        resolvedBlueProfile?.pFalseAlarmDecoy ?? 0.2
      )
    ) || 0
  );

  // Shared doctrine params are retained as fallback for older input names.
  const doctrineMode = getValue(
    "doctrineMode",
    "doctrineMode",
    resolvedBlueProfile?.doctrineMode ?? "barrage"
  );
  const shotsPerTarget = Math.max(
    0,
    parseInt(
      getValue("shotsPerTarget", "shotsPerTarget", resolvedBlueProfile?.shotsPerTarget ?? 2),
      10
    ) || 0
  );
  const maxShotsPerTarget = Math.max(
    1,
    Math.min(
      4,
      parseInt(
        getValue("maxShotsPerTarget", "maxShotsPerTarget", resolvedBlueProfile?.maxShotsPerTarget ?? 2),
        10
      ) || 1
    )
  );

  // Family-specific doctrine params take precedence when present.
  const midcourseKineticDoctrineMode = getValue(
    "midcourseKineticDoctrineMode",
    "midcourseKineticDoctrineMode",
    doctrineMode
  );
  const midcourseKineticShotsPerTarget = Math.max(
    0,
    parseInt(
      getValue("midcourseKineticShotsPerTarget", "midcourseKineticShotsPerTarget", shotsPerTarget),
      10
    ) || 0
  );
  const midcourseKineticMaxShotsPerTarget = Math.max(
    1,
    Math.min(
      4,
      parseInt(
        getValue("midcourseKineticMaxShotsPerTarget", "midcourseKineticMaxShotsPerTarget", maxShotsPerTarget),
        10
      ) || 1
    )
  );

  const boostKineticShotsPerTarget = Math.max(
    0,
    parseInt(
      getValue(
        "boostKineticShotsPerTarget",
        "boostKineticShotsPerTarget",
        resolvedBlueProfile?.boostKineticShotsPerTarget ?? shotsPerTarget
      ),
      10
    ) || 0
  );

  const pkWarhead = clamp01(
    parseFloat(getValue("pkWarhead", "pkWarhead", resolvedBlueProfile?.pkWarhead ?? 0.6)) || 0
  );
  // Unified per-interceptor Pk (classification handles warhead vs decoy shot allocation).
  const pkDecoy = pkWarhead;

  const nInventory = Math.max(
    0,
    parseInt(getValue("nInventory", "nInventory", resolvedBlueProfile?.nInventory ?? 0), 10) || 0
  );

  const nSpaceBoostKinetic = Math.max(
    0,
    Math.min(
      10000,
      parseInt(
        getValue(
          "nSpaceBoostKinetic",
          "nSpaceBoostKinetic",
          resolvedBlueProfile?.nSpaceBoostKinetic ?? 0
        ),
        10
      ) || 0
    )
  );
  const pkSpaceBoostKinetic = clamp01(
    parseFloat(
      getValue(
        "pkSpaceBoostKinetic",
        "pkSpaceBoostKinetic",
        resolvedBlueProfile?.pkSpaceBoostKinetic ?? 0.5
      )
    ) || 0
  );

  const launchRegion = getValue(
    "launchRegion",
    "launchRegion",
    resolvedRedProfile?.launchRegion ?? "default"
  );
  const asatSensingPenalty = clamp01(
    parseFloat(
      getValue(
        "asatSensingPenalty",
        "asatSensingPenalty",
        resolvedRedProfile?.asatSensingPenalty ?? 0
      )
    ) || 0
  );
  const asatAvailabilityPenalty = clamp01(
    parseFloat(
      getValue(
        "asatAvailabilityPenalty",
        "asatAvailabilityPenalty",
        resolvedRedProfile?.asatAvailabilityPenalty ?? 0
      )
    ) || 0
  );
  const boostEvasionPenalty = clamp01(
    parseFloat(
      getValue(
        "boostEvasionPenalty",
        "boostEvasionPenalty",
        resolvedRedProfile?.boostEvasionPenalty ?? 0
      )
    ) || 0
  );
  const midcourseInterceptionPenalty = clamp01(
    parseFloat(
      getValue(
        "midcourseInterceptionPenalty",
        "midcourseInterceptionPenalty",
        resolvedRedProfile?.midcourseInterceptionPenalty ?? 0
      )
    ) || 0
  );

  const nTrials = Math.max(1, parseInt(getValue("nTrials", "nTrials", 1000), 10) || 1000);

  const seedVal = (getValue("seed", "seed", "").trim());
  const seed = seedVal === "" ? null : parseInt(seedVal, 10) || 0;

  // The simulation consumes a flat strike model directly.
  // Keep interceptor metadata for architecture-cost reporting.
  const presetInterceptors = {};
  const interceptors = {
    boost_kinetic: {
      deployed: nSpaceBoostKinetic,
      pk: pkSpaceBoostKinetic,
      costPerUnit_M: presetInterceptors.boost_kinetic?.costPerUnit_M ?? 15,
      phase: "boost",
    },
    midcourse_gbi: {
      deployed: nInventory,
      pk: pkWarhead,
      costPerUnit_M: presetInterceptors.midcourse_gbi?.costPerUnit_M ?? 75,
      phase: "midcourse",
    },
  };

  return {
    nMissiles,
    mirvsPerMissile,
    kilotonsPerWarhead,
    decoysPerWarhead,
    pDetectTrack,
    pClassifyWarhead,
    pFalseAlarmDecoy,
    doctrineMode,
    shotsPerTarget,
    maxShotsPerTarget,
    midcourseKineticDoctrineMode,
    midcourseKineticShotsPerTarget,
    midcourseKineticMaxShotsPerTarget,
    boostKineticShotsPerTarget,
    pkWarhead,
    pkDecoy,
    nInventory,
    nSpaceBoostKinetic,
    pkSpaceBoostKinetic,
    launchRegion,
    asatSensingPenalty,
    asatAvailabilityPenalty,
    boostEvasionPenalty,
    midcourseInterceptionPenalty,
    nTrials,
    seed,
    blueKey,
    blueDefensePreset,
    redKey,
    redAttackPreset,
    interceptors,
  };
}

function stepPrecision(step) {
  const raw = String(step ?? '');
  if (raw.includes('e-')) {
    const exponent = parseInt(raw.split('e-')[1], 10);
    return Number.isFinite(exponent) ? exponent : 0;
  }
  const dotIdx = raw.indexOf('.');
  return dotIdx === -1 ? 0 : raw.length - dotIdx - 1;
}

function formatByStep(value, step) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? '');
  const precision = stepPrecision(step);
  return precision > 0 ? n.toFixed(precision) : String(Math.round(n));
}

function sliderValueInputHTML(label, value, min, max, step, unit = '') {
  return `
    <div class="wizard-slider-value ${unit ? 'wizard-slider-value--with-unit' : ''}">
      <input
        type="number"
        class="wizard-slider-input"
        value="${formatByStep(value, step)}"
        min="${min}"
        max="${max}"
        step="${step}"
        inputmode="decimal"
        aria-label="${label}"
      />
      ${unit ? `<span class="wizard-slider-unit" aria-hidden="true">${unit}</span>` : ''}
    </div>
  `;
}

function probSlider(label, param, pct, defaultPct, minPct = 0.1, maxPct = 99.9, tone = null, tooltipText = PLACEHOLDER_TOOLTIP_TEXT) {
  const v = defaultPct ?? pct;
  return `
    <div class="wizard-slider-row">
      <div class="wizard-slider-header">
        ${controlLabelHTML(label, tone, tooltipText)}
        ${sliderValueInputHTML(label, v, minPct, maxPct, 0.1, '%')}
      </div>
      <input type="range" class="wizard-slider" min="${minPct}" max="${maxPct}" step="0.1" value="${v}" data-prob-target="${param}" />
      <input type="number" class="wizard-hidden-param" data-param="${param}" value="${(v / 100).toFixed(4)}" tabindex="-1" aria-hidden="true" />
    </div>`;
}

function intSlider(label, param, min, max, step, defaultVal, tone = null, tooltipText = PLACEHOLDER_TOOLTIP_TEXT) {
  return `
    <div class="wizard-slider-row">
      <div class="wizard-slider-header">
        ${controlLabelHTML(label, tone, tooltipText)}
        ${sliderValueInputHTML(label, defaultVal, min, max, step)}
      </div>
      <input type="range" class="wizard-slider" data-param="${param}" min="${min}" max="${max}" step="${step}" value="${defaultVal}" />
    </div>`;
}


/**
 * BLUE step parameters (defender capabilities + engagement doctrine).
 * 2-column layout for paired controls.
 */
function bluePresetToggleButtonsHTML(selectedPreset) {
  return BLUE_DEFENSE_PRESET_ORDER.map((presetKey) => {
    const meta = BLUE_DEFENSE_PRESET_META[presetKey];
    const isSelected = presetKey === selectedPreset;
    return `
      <button
        type="button"
        class="wizard-toggle-item blue-preset-toggle-item ${isSelected ? 'selected' : ''}"
        data-blue-defense-preset="${presetKey}"
        aria-pressed="${isSelected ? 'true' : 'false'}"
      >
        ${meta.label}
      </button>
    `;
  }).join('');
}

function blueSummaryItemHTML(label, key) {
  return `
    <div class="blue-preset-summary-item">
      <span class="blue-preset-summary-label">${label}</span>
      <span class="blue-preset-summary-value" data-blue-summary-value="${key}">-</span>
    </div>
  `;
}

export function blueParamsHTML(d) {
  const blueDefensePreset = d.blueDefensePreset ?? DEFAULT_BLUE_DEFENSE_PRESET;
  const presetMeta = getBlueDefensePresetMeta(blueDefensePreset);
  const midcourseDoctrineMode = d.midcourseKineticDoctrineMode ?? d.doctrineMode ?? 'barrage';
  const midcourseShotsPerTarget = d.midcourseKineticShotsPerTarget ?? d.shotsPerTarget ?? 2;
  const midcourseMaxShotsPerTarget = d.midcourseKineticMaxShotsPerTarget ?? d.maxShotsPerTarget ?? 2;
  const boostKineticShotsPerTarget = d.boostKineticShotsPerTarget ?? d.shotsPerTarget ?? 2;
  const pdt  = (d.pDetectTrack * 100).toFixed(1);
  const pcw  = (d.pClassifyWarhead * 100).toFixed(1);
  const pfa  = (d.pFalseAlarmDecoy * 100).toFixed(1);
  const pkw  = (d.pkWarhead * 100).toFixed(1);
  const pkbK = ((d.pkSpaceBoostKinetic ?? 0.5) * 100).toFixed(1);
  const doctrineToggleHTML = (label, param, mode, tone = 'blue', tooltipText = PLACEHOLDER_TOOLTIP_TEXT) => `
      <div class="wizard-slider-row">
        <div class="wizard-slider-header">
          ${controlLabelHTML(label, tone, tooltipText)}
        </div>
        <div class="wizard-toggle-group" role="radiogroup" aria-label="${label}">
          <button
            type="button"
            class="wizard-toggle-item ${mode === 'barrage' ? 'selected' : ''}"
            data-doctrine-param="${param}"
            data-doctrine-mode="barrage"
            aria-pressed="${mode === 'barrage' ? 'true' : 'false'}"
          >
            Barrage
          </button>
          <button
            type="button"
            class="wizard-toggle-item ${mode === 'sls' ? 'selected' : ''}"
            data-doctrine-param="${param}"
            data-doctrine-mode="sls"
            aria-pressed="${mode === 'sls' ? 'true' : 'false'}"
          >
            Shoot-Look-Shoot
          </button>
        </div>
        <input type="hidden" class="wizard-hidden-param" data-param="${param}" value="${mode}" />
      </div>
  `;
  return `
    <div class="blue-defense-root" data-blue-defense-root data-blue-defense-mode="${blueDefensePreset === 'custom' ? 'custom' : 'preset'}">
      <div class="wizard-slider-row blue-preset-selector">
        <div class="wizard-slider-header">
          ${labelWithTooltipHTML(
            'Defense preset',
            'blue',
            'Preset mode keeps Blue sensing and interceptor-effectiveness assumptions fixed while leaving interceptor inventories and doctrine editable. Switch to Custom to unlock all Blue inputs.'
          )}
        </div>
        <div class="wizard-toggle-group blue-preset-toggle-group" role="radiogroup" aria-label="Blue defense preset">
          ${bluePresetToggleButtonsHTML(blueDefensePreset)}
        </div>
        <input type="hidden" class="wizard-hidden-param" data-param="blueDefensePreset" value="${blueDefensePreset}" />
      </div>

      <div class="wizard-tab-strip blue-custom-tabs" data-tab-group="blue">
        <div class="wizard-tab active" data-tab="blue-sensing">Sensors and Detection</div>
        <div class="wizard-tab" data-tab="blue-space">Hypothetical Space-Based Interceptors</div>
        <div class="wizard-tab" data-tab="blue-gbi">Ground-Based Midcourse Interceptors</div>
      </div>

      <div class="wizard-tab-panel active" data-tab-panel="blue-sensing">
        <div class="wizard-param-group wizard-param-group--sensing">
          <div class="wizard-control-stack">
            <div class="wizard-slider-row">
              <div class="wizard-slider-header">
                ${controlLabelHTML(
                  'Detection and tracking probability',
                  'blue',
                  'Probability that an incoming missile or object is detected and tracked for engagement.'
                )}
                ${sliderValueInputHTML('Detection and tracking probability', pdt, 0.1, 99.9, 0.1, '%')}
              </div>
              <input type="range" class="wizard-slider" min="0.1" max="99.9" step="0.1" value="${pdt}" data-prob-target="pDetectTrack" />
              <input type="number" class="wizard-hidden-param" data-param="pDetectTrack" value="${(Number(pdt) / 100).toFixed(4)}" tabindex="-1" aria-hidden="true" />
            </div>
          </div>

          <div class="wizard-control-stack">
            <div class="wizard-slider-row">
              <div class="wizard-slider-header">
                ${controlLabelHTML(
                  'Warhead discrimination accuracy',
                  'blue',
                  'Probability that a real warhead is correctly identified as a real warhead for interception.'
                )}
                ${sliderValueInputHTML('Warhead discrimination accuracy', pcw, 0.1, 99.9, 0.1, '%')}
              </div>
              <input type="range" class="wizard-slider" min="0.1" max="99.9" step="0.1" value="${pcw}" data-prob-target="pClassifyWarhead" />
              <input type="number" class="wizard-hidden-param" data-param="pClassifyWarhead" value="${(Number(pcw) / 100).toFixed(4)}" tabindex="-1" aria-hidden="true" />
            </div>
          </div>

          <div class="wizard-control-stack">
            <div class="wizard-slider-row">
              <div class="wizard-slider-header">
                ${controlLabelHTML(
                  'Decoy false-alarm rate',
                  'blue',
                  'Probability that a decoy is mistakenly identified as a real warhead for interception.'
                )}
                ${sliderValueInputHTML('Decoy false-alarm rate', pfa, 0.1, 99.9, 0.1, '%')}
              </div>
              <input type="range" class="wizard-slider" min="0.1" max="99.9" step="0.1" value="${pfa}" data-prob-target="pFalseAlarmDecoy" />
              <input type="number" class="wizard-hidden-param" data-param="pFalseAlarmDecoy" value="${(Number(pfa) / 100).toFixed(4)}" tabindex="-1" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>

      <div class="wizard-tab-panel" data-tab-panel="blue-gbi">
        <div class="wizard-param-group">
          ${intSlider('Existing ground-based midcourse interceptors in range', 'nInventory', 0, 2000, 1, d.nInventory, 'blue', 'placeholder')}
          <div class="blue-custom-only">
            ${probSlider('Ground-based midcourse interceptor kill probability', 'pkWarhead', pkw, undefined, 0.1, 99.9, 'blue', 'placeholder')}
          </div>

          ${doctrineToggleHTML(
            'Ground-based kinetic midcourse engagement doctrine',
            'midcourseKineticDoctrineMode',
            midcourseDoctrineMode,
            'blue',
            'placeholder'
          )}
          <div class="doctrine-midcourse-kinetic-barrage-only">
            ${intSlider('Shots per detected/tracked target', 'midcourseKineticShotsPerTarget', 1, 6, 1, midcourseShotsPerTarget, 'blue', 'placeholder')}
          </div>
          <div class="doctrine-midcourse-kinetic-sls-only" style="display:none">
            ${intSlider('Max shots per detected/tracked target', 'midcourseKineticMaxShotsPerTarget', 1, 4, 1, midcourseMaxShotsPerTarget, 'blue', 'placeholder')}
          </div>
        </div>
      </div>

      <div class="wizard-tab-panel" data-tab-panel="blue-space">
        <div class="wizard-param-group">
          ${intSlider('Hypothetical space-based boost interceptors in orbit', 'nSpaceBoostKinetic', 0, 10000, 1, d.nSpaceBoostKinetic ?? 0, 'blue', 'placeholder')}
          <div class="blue-custom-only">
            ${probSlider('Hypothetical space-based boost interceptor kill probability', 'pkSpaceBoostKinetic', pkbK, undefined, 0.1, 99.9, 'blue', 'placeholder')}
          </div>
          ${intSlider('Shots per detected/tracked missile', 'boostKineticShotsPerTarget', 1, 6, 1, boostKineticShotsPerTarget, 'blue', 'placeholder')}
        </div>
      </div>

      <details class="blue-preset-summary-disclosure" data-blue-preset-summary>
        <summary class="blue-preset-summary-toggle">
          <div class="blue-preset-summary-head">
            <div class="blue-preset-summary-title" data-blue-preset-title>${presetMeta.title}</div>
            <div class="blue-preset-summary-description" data-blue-preset-description>${presetMeta.description}</div>
          </div>
        </summary>

        <div class="blue-preset-summary">
          <div class="blue-preset-summary-section">
            <div class="blue-preset-summary-section-title">Sensors and Detection</div>
            <div class="blue-preset-summary-grid">
              ${blueSummaryItemHTML('Detection and tracking probability', 'pDetectTrack')}
              ${blueSummaryItemHTML('Warhead discrimination accuracy', 'pClassifyWarhead')}
              ${blueSummaryItemHTML('Decoy false-alarm rate', 'pFalseAlarmDecoy')}
            </div>
          </div>

          <div class="blue-preset-summary-section">
            <div class="blue-preset-summary-section-title">Interceptor Effectiveness</div>
            <div class="blue-preset-summary-grid">
              ${blueSummaryItemHTML('Midcourse interceptor kill probability', 'pkWarhead')}
              ${blueSummaryItemHTML('Boost interceptor kill probability', 'pkSpaceBoostKinetic')}
            </div>
          </div>
        </div>
      </details>
    </div>
  `;
}

/**
 * RED step parameters (attacker payload).
 * Uses decoysPerMissile — decoys per missile (independent of missile count).
 */
function redPresetToggleButtonsHTML(selectedPreset) {
  return RED_ATTACK_PRESET_ORDER.map((presetKey) => {
    const meta = RED_ATTACK_PRESET_META[presetKey];
    const isSelected = presetKey === selectedPreset;
    return `
      <button
        type="button"
        class="wizard-toggle-item red-preset-toggle-item ${isSelected ? 'selected' : ''}"
        data-red-attack-preset="${presetKey}"
        aria-pressed="${isSelected ? 'true' : 'false'}"
      >
        ${meta.label}
      </button>
    `;
  }).join('');
}

function redSummaryItemHTML(label, key) {
  return `
    <div class="red-preset-summary-item">
      <span class="red-preset-summary-label">${label}</span>
      <span class="red-preset-summary-value" data-red-summary-value="${key}">-</span>
    </div>
  `;
}

export function redParamsHTML(d) {
  const redAttackPreset = d.redAttackPreset ?? DEFAULT_RED_ATTACK_PRESET;
  const presetMeta = getRedAttackPresetMeta(redAttackPreset);
  const decoysPerMissile = d.decoysPerMissile ?? (d.decoysPerWarhead * d.mirvsPerMissile).toFixed(1);
  const kilotonsPerWarhead = d.kilotonsPerWarhead ?? 400;
  const asatSensing = ((d.asatSensingPenalty ?? 0) * 100).toFixed(1);
  const asatAvailability = ((d.asatAvailabilityPenalty ?? 0) * 100).toFixed(1);
  const boostEvade = ((d.boostEvasionPenalty ?? 0) * 100).toFixed(1);
  const midcourseIntercept = ((d.midcourseInterceptionPenalty ?? 0) * 100).toFixed(1);
  const launchRegion = d.launchRegion ?? 'default';
  return `
    <div class="red-attack-root" data-red-attack-root data-red-attack-mode="${redAttackPreset === 'custom' ? 'custom' : 'preset'}">
      <div class="wizard-slider-row red-preset-selector">
        <div class="wizard-slider-header">
          ${labelWithTooltipHTML(
            'Attack preset',
            'red',
            'Preset mode keeps the qualitative assumptions fixed for the selected actor and leaves missile count editable. Switch to Custom to unlock all Red inputs.'
          )}
        </div>
        <div class="wizard-toggle-group red-preset-toggle-group" role="radiogroup" aria-label="Red attack preset">
          ${redPresetToggleButtonsHTML(redAttackPreset)}
        </div>
        <input type="hidden" class="wizard-hidden-param" data-param="redAttackPreset" value="${redAttackPreset}" />
      </div>

      <div class="wizard-tab-strip red-custom-tabs" data-tab-group="red">
        <div class="wizard-tab active" data-tab="red-strike">Strike Salvo</div>
        <div class="wizard-tab" data-tab="red-countermeasures">Penetration Aids</div>
        <div class="wizard-tab" data-tab="red-counterspace">Counterspace Attack</div>
      </div>

      <div class="wizard-tab-panel active" data-tab-panel="red-strike">
        <div class="wizard-param-group">
          <div class="red-shared-control">
            ${intSlider('Ballistic missiles in strike', 'nMissiles', 1, 1000, 1, d.nMissiles, 'red', 'placeholder')}
          </div>
          <div class="red-custom-only">
            ${intSlider('Warheads per missile', 'mirvsPerMissile', 1, 16, 1, d.mirvsPerMissile, 'red', 'placeholder')}
          </div>
          <div class="red-custom-only">
            ${intSlider('Kilotons per warhead', 'kilotonsPerWarhead', 20, 5000, 10, kilotonsPerWarhead, 'red', 'placeholder')}
          </div>
          <div class="wizard-slider-row red-custom-only">
            <div class="wizard-slider-header">
              ${controlLabelHTML('Launch region preset', 'red', 'placeholder')}
            </div>
            <select class="wizard-select" data-param="launchRegion">
              ${launchRegionOptionsHTML(launchRegion)}
            </select>
          </div>
        </div>
      </div>

      <div class="wizard-tab-panel" data-tab-panel="red-countermeasures">
        <div class="wizard-param-group">
          ${intSlider('Decoys per missile', 'decoysPerMissile', 0, 60, 1, decoysPerMissile, 'red', 'placeholder')}
          ${probSlider('Boost-phase survivability and evasion', 'boostEvasionPenalty', boostEvade, undefined, 0, 99.9, 'red', 'placeholder')}
          ${probSlider('Midcourse discrimination and allocation penalty', 'midcourseInterceptionPenalty', midcourseIntercept, undefined, 0, 99.9, 'red', 'placeholder')}
        </div>
      </div>

      <div class="wizard-tab-panel" data-tab-panel="red-counterspace">
        <div class="wizard-param-group">
          ${probSlider(
            'Degradation of Blue’s sensing and tracking',
            'asatSensingPenalty',
            asatSensing,
            undefined,
            0,
            99.9,
            'red',
            'Reduces Blue’s effective detection-and-tracking probability by this fraction in both boost and midcourse. It affects whether incoming missiles, warheads, and decoys are detected for engagement. It does not directly change warhead discrimination, interceptor kill probability, or interceptor inventory.'
          )}
          ${probSlider(
            'Degradation of space-based boost interceptor availability',
            'asatAvailabilityPenalty',
            asatAvailability,
            undefined,
            0,
            99.9,
            'red',
            'Reduces the number of hypothetical space-based boost interceptors available for engagement after coverage is applied. It only affects Blue’s space-based boost layer. It does not reduce ground-based midcourse interceptors, sensing/tracking, or interceptor kill probability.'
          )}
        </div>
      </div>

      <details class="red-preset-summary-disclosure" data-red-preset-summary>
        <summary class="red-preset-summary-toggle">
          <div class="red-preset-summary-head">
            <div class="red-preset-summary-title" data-red-preset-title>${presetMeta.title}</div>
            <div class="red-preset-summary-description" data-red-preset-description>${presetMeta.description}</div>
          </div>
        </summary>

        <div class="red-preset-summary">
          <div class="red-preset-summary-section">
            <div class="red-preset-summary-section-title">Strike Salvo</div>
            <div class="red-preset-summary-grid">
              ${redSummaryItemHTML('Warheads per missile', 'mirvsPerMissile')}
              ${redSummaryItemHTML('Kilotons per warhead', 'kilotonsPerWarhead')}
              ${redSummaryItemHTML('Launch region', 'launchRegion')}
            </div>
          </div>

          <div class="red-preset-summary-section">
            <div class="red-preset-summary-section-title">Penetration Aids</div>
            <div class="red-preset-summary-grid">
              ${redSummaryItemHTML('Decoys per missile', 'decoysPerMissile')}
              ${redSummaryItemHTML('Boost evasion', 'boostEvasionPenalty')}
              ${redSummaryItemHTML('Midcourse penalty', 'midcourseInterceptionPenalty')}
            </div>
          </div>

          <div class="red-preset-summary-section">
            <div class="red-preset-summary-section-title">Counterspace Attack</div>
            <div class="red-preset-summary-grid">
              ${redSummaryItemHTML('Blue sensing/tracking degradation', 'asatSensingPenalty')}
              ${redSummaryItemHTML('Degradation of space-based boost interceptor availability', 'asatAvailabilityPenalty')}
            </div>
          </div>
        </div>
      </details>
    </div>
  `;
}

/**
 * SIM step parameters (minimal: trials + seed only).
 * Reliability assumptions are configured on the BLUE step.
 */
export function simParamsHTML(d) {
  return `
    <div class="wizard-param-group">
      <div class="wizard-slider-row">
        <div class="wizard-slider-header">
          ${labelWithTooltipHTML(
            'Monte Carlo trials',
            'amber',
            '2,000 trials is recommended for most analyses. Increasing to 5,000 can improve the precision of tail statistics in more extreme scenarios, such as when assuming very low intercept probabilities or large numbers of warhead decoys.'
          )}
          ${sliderValueInputHTML('Monte Carlo trials', d.nTrials, 100, 5000, 100)}
        </div>
        <input type="range" class="wizard-slider" data-param="nTrials" min="100" max="5000" step="100" value="${d.nTrials}" />
      </div>
      <div class="wizard-slider-row wizard-slider-row--text-entry" style="margin-top: 12px;">
        <div class="wizard-slider-header">
          ${labelWithTooltipHTML(
            'Seed',
            'amber',
            'Leave blank for a new random result each run. Enter a number to reproduce the exact same run for verification or debugging.'
          )}
        </div>
        <input type="text" class="wizard-text-input" data-param="seed" placeholder="auto" value="${d.seed ?? ''}" />
      </div>
    </div>
  `;
}

/**
 * Render the dashboard drawer controls panel (tabs for Blue, Red, CM, Sim).
 */
export function renderDrawerControls(container, blueKey, redKey) {
  const d = readParamsFromUI(blueKey, redKey);

  container.innerHTML = `
    <div class="tab-panel active" id="tab-blue">
      <div class="panel-section">
        <h4>Blue (Defender)</h4>
        <p>${blueKey}</p>
        <div class="param-group">
          <label>
            Blue network baseline detection/tracking probability:
            <input type="number" class="param-input" data-param="pDetectTrack" min="0" max="1" step="0.01" value="${d.pDetectTrack}" />
          </label>
          <label>
            Blue network warhead discrimination accuracy (W->W):
            <input type="number" class="param-input" data-param="pClassifyWarhead" min="0" max="1" step="0.01" value="${d.pClassifyWarhead}" />
          </label>
          <label>
            Blue network discrimination false-alarm rate (D->W):
            <input type="number" class="param-input" data-param="pFalseAlarmDecoy" min="0" max="1" step="0.01" value="${d.pFalseAlarmDecoy}" />
          </label>
          <label>
            Ground-based midcourse interceptor kill probability:
            <input type="number" class="param-input" data-param="pkWarhead" min="0" max="1" step="0.01" value="${d.pkWarhead}" />
          </label>
          <label>
            Ground-based midcourse interceptors in range (existing U.S. architecture):
            <input type="number" class="param-input" data-param="nInventory" min="0" step="1" value="${d.nInventory}" />
          </label>
          <label>
            Hypothetical space-based boost interceptors in orbit:
            <input type="number" class="param-input" data-param="nSpaceBoostKinetic" min="0" max="10000" step="1" value="${d.nSpaceBoostKinetic ?? 0}" />
          </label>
          <label>
            Hypothetical space-based boost interceptor kill probability:
            <input type="number" class="param-input" data-param="pkSpaceBoostKinetic" min="0" max="1" step="0.01" value="${d.pkSpaceBoostKinetic ?? 0.5}" />
          </label>
        </div>
      </div>
    </div>

    <div class="tab-panel" id="tab-red">
      <div class="panel-section">
        <h4>Red (Attacker)</h4>
        <p>${redKey}</p>
        <div class="param-group">
          <label>
            Missiles:
            <input type="number" class="param-input" data-param="nMissiles" min="1" step="1" value="${d.nMissiles}" />
          </label>
          <label>
            MIRVs per Missile:
            <input type="number" class="param-input" data-param="mirvsPerMissile" min="1" step="1" value="${d.mirvsPerMissile}" />
          </label>
          <label>
            Kilotons per Warhead:
            <input type="number" class="param-input" data-param="kilotonsPerWarhead" min="20" max="5000" step="10" value="${d.kilotonsPerWarhead ?? 400}" />
          </label>
          <label>
            Decoys per Warhead:
            <input type="number" class="param-input" data-param="decoysPerWarhead" min="0" step="1" value="${d.decoysPerWarhead}" />
          </label>
          <label>
            Launch region preset:
            <select class="param-input" data-param="launchRegion">
              ${launchRegionOptionsHTML(d.launchRegion ?? 'default')}
            </select>
          </label>
          <label>
            Degradation of Blue’s sensing and tracking:
            <input type="number" class="param-input" data-param="asatSensingPenalty" min="0" max="1" step="0.01" value="${d.asatSensingPenalty ?? 0}" />
          </label>
          <label>
            Degradation of space-based boost interceptor availability:
            <input type="number" class="param-input" data-param="asatAvailabilityPenalty" min="0" max="1" step="0.01" value="${d.asatAvailabilityPenalty ?? 0}" />
          </label>
          <label>
            Boost-phase survivability and evasion:
            <input type="number" class="param-input" data-param="boostEvasionPenalty" min="0" max="1" step="0.01" value="${d.boostEvasionPenalty ?? 0}" />
          </label>
        </div>
      </div>
    </div>


    <div class="tab-panel" id="tab-sim">
      <div class="panel-section">
        <h4>Simulation</h4>
        <div class="param-group">
          <label>
            Ground-based kinetic midcourse doctrine mode:
            <select class="param-input" data-param="midcourseKineticDoctrineMode">
              <option value="barrage" ${(d.midcourseKineticDoctrineMode ?? d.doctrineMode) === 'barrage' ? 'selected' : ''}>Barrage</option>
              <option value="sls" ${(d.midcourseKineticDoctrineMode ?? d.doctrineMode) === 'sls' ? 'selected' : ''}>Shoot-Look-Shoot</option>
            </select>
          </label>
          <label>
            Ground-based kinetic midcourse shots/track (Barrage):
            <input type="number" class="param-input" data-param="midcourseKineticShotsPerTarget" min="0" step="1" value="${d.midcourseKineticShotsPerTarget ?? d.shotsPerTarget}" />
          </label>
          <label>
            Ground-based kinetic midcourse max shots/track (SLS):
            <input type="number" class="param-input" data-param="midcourseKineticMaxShotsPerTarget" min="1" max="4" step="1" value="${d.midcourseKineticMaxShotsPerTarget ?? d.maxShotsPerTarget}" />
          </label>
          <label>
            Shots per detected/tracked missile:
            <input type="number" class="param-input" data-param="boostKineticShotsPerTarget" min="0" step="1" value="${d.boostKineticShotsPerTarget ?? d.shotsPerTarget}" />
          </label>
          <label>
            Monte Carlo Trials:
            <input type="number" class="param-input" data-param="nTrials" min="1" step="100" value="${d.nTrials}" />
          </label>
          <label>
            Seed (blank=random):
            <input type="number" class="param-input" data-param="seed" step="1" value="${d.seed || ''}" />
          </label>
        </div>
      </div>
    </div>
  `;
}
