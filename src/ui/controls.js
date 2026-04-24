/**
 * UI controls — HTML template, parameter reading, and doctrine toggle.
 */

import { clamp01 } from '../utils/rng.js';
import {
  BLUE_QUANTITATIVE_PRESET_ORDER,
  BLUE_QUANTITATIVE_PRESET_META,
  BLUE_QUALITATIVE_PRESET_ORDER,
  BLUE_QUALITATIVE_PRESET_META,
  DEFAULT_BLUE_QUANTITATIVE_PRESET,
  DEFAULT_BLUE_QUALITATIVE_PRESET,
  getBlueDefenseProfileMeta,
  resolveBlueDefenseProfile,
} from '../config/blueDefensePresets.js';
import {
  DEFAULT_RED_QUANTITATIVE_PRESET,
  DEFAULT_RED_QUALITATIVE_PRESET,
  RED_QUANTITATIVE_PRESET_ORDER,
  RED_QUANTITATIVE_PRESET_META,
  RED_QUALITATIVE_PRESET_ORDER,
  RED_QUALITATIVE_PRESET_META,
  getRedAttackProfileMeta,
  resolveRedAttackProfile,
} from '../config/redAttackPresets.js';

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

const PLACEHOLDER_TOOLTIP_TEXT =
  'Placeholder: methodology notes for this control will be added in a later pass.';

const BLUE_QUANTITATIVE_PRESET_TOOLTIP_TEXT =
  'Placeholder: Blue quantitative presets bundle the modeled interceptor inventories and space-based boost interceptor counts.';

const BLUE_QUALITATIVE_PRESET_TOOLTIP_TEXT =
  'Placeholder: Blue qualitative presets bundle sensing, doctrine, and interceptor-effectiveness assumptions.';

const RED_QUANTITATIVE_PRESET_TOOLTIP_TEXT =
  'Placeholder: Red quantitative presets bundle strike size and warheads-per-missile assumptions.';

const RED_QUALITATIVE_PRESET_TOOLTIP_TEXT =
  'Placeholder: Red qualitative presets bundle warhead-yield and decoy assumptions.';

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
  const hasBluePresetControl = !!root.querySelector('[data-param="bluePresetMode"]');
  const hasRedPresetControl = !!root.querySelector('[data-param="redPresetMode"]');

  const bluePresetMode = getValue(
    "bluePresetMode",
    "bluePresetMode",
    hasBluePresetControl ? "preset" : "custom"
  );
  const blueQuantitativePreset = getValue(
    "blueQuantitativePreset",
    "blueQuantitativePreset",
    DEFAULT_BLUE_QUANTITATIVE_PRESET
  );
  const blueQualitativePreset = getValue(
    "blueQualitativePreset",
    "blueQualitativePreset",
    DEFAULT_BLUE_QUALITATIVE_PRESET
  );
  const resolvedBlueProfile = blueKey
    ? resolveBlueDefenseProfile(blueKey, {
        quantitativePresetKey: blueQuantitativePreset,
        qualitativePresetKey: blueQualitativePreset,
      })
    : null;

  const redPresetMode = getValue(
    "redPresetMode",
    "redPresetMode",
    hasRedPresetControl ? "preset" : "custom"
  );
  const redQuantitativePreset = getValue(
    "redQuantitativePreset",
    "redQuantitativePreset",
    DEFAULT_RED_QUANTITATIVE_PRESET
  );
  const redQualitativePreset = getValue(
    "redQualitativePreset",
    "redQualitativePreset",
    DEFAULT_RED_QUALITATIVE_PRESET
  );
  const resolvedRedProfile = redKey
    ? resolveRedAttackProfile(redKey, {
        quantitativePresetKey: redQuantitativePreset,
        qualitativePresetKey: redQualitativePreset,
      })
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
      42000,
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

  const launchSiteKey = getValue(
    "launchSiteKey",
    "launchSiteKey",
    resolvedRedProfile?.launchSiteKey ?? ""
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
    launchSiteKey,
    nTrials,
    seed,
    blueKey,
    bluePresetMode,
    blueQuantitativePreset,
    blueQualitativePreset,
    redKey,
    redPresetMode,
    redQuantitativePreset,
    redQualitativePreset,
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
function buildPresetToggleButtonsHTML(order, metaByKey, selectedPreset, dataAttribute, toneClass) {
  return order.map((presetKey) => {
    const meta = metaByKey[presetKey];
    const isSelected = presetKey === selectedPreset;
    return `
      <button
        type="button"
        class="wizard-toggle-item ${toneClass} ${isSelected ? 'selected' : ''}"
        ${dataAttribute}="${presetKey}"
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
  const bluePresetMode = d.bluePresetMode ?? 'preset';
  const blueQuantitativePreset = d.blueQuantitativePreset ?? DEFAULT_BLUE_QUANTITATIVE_PRESET;
  const blueQualitativePreset = d.blueQualitativePreset ?? DEFAULT_BLUE_QUALITATIVE_PRESET;
  const profileMeta = getBlueDefenseProfileMeta(
    blueQuantitativePreset,
    blueQualitativePreset,
    bluePresetMode
  );
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
    <div class="blue-defense-root" data-blue-defense-root data-blue-defense-mode="${bluePresetMode}">
      <div class="preset-selector-layout blue-preset-selector">
        <div class="preset-selector-rows">
          <div class="wizard-slider-row preset-selector-row">
            <div class="wizard-slider-header">
              ${labelWithTooltipHTML(
                'Quantitative presets',
                'blue',
                BLUE_QUANTITATIVE_PRESET_TOOLTIP_TEXT
              )}
            </div>
            <div class="wizard-toggle-group blue-preset-toggle-group" role="radiogroup" aria-label="Blue quantitative presets">
              ${buildPresetToggleButtonsHTML(
                BLUE_QUANTITATIVE_PRESET_ORDER,
                BLUE_QUANTITATIVE_PRESET_META,
                blueQuantitativePreset,
                'data-blue-quantitative-preset',
                'blue-preset-toggle-item'
              )}
            </div>
            <input type="hidden" class="wizard-hidden-param" data-param="blueQuantitativePreset" value="${blueQuantitativePreset}" />
          </div>

          <div class="wizard-slider-row preset-selector-row">
            <div class="wizard-slider-header">
              ${labelWithTooltipHTML(
                'Qualitative presets',
                'blue',
                BLUE_QUALITATIVE_PRESET_TOOLTIP_TEXT
              )}
            </div>
            <div class="wizard-toggle-group blue-preset-toggle-group" role="radiogroup" aria-label="Blue qualitative presets">
              ${buildPresetToggleButtonsHTML(
                BLUE_QUALITATIVE_PRESET_ORDER,
                BLUE_QUALITATIVE_PRESET_META,
                blueQualitativePreset,
                'data-blue-qualitative-preset',
                'blue-preset-toggle-item'
              )}
            </div>
            <input type="hidden" class="wizard-hidden-param" data-param="blueQualitativePreset" value="${blueQualitativePreset}" />
          </div>
        </div>

        <div class="preset-selector-custom-column">
          <button
            type="button"
            class="wizard-toggle-item blue-preset-toggle-item preset-custom-toggle ${bluePresetMode === 'custom' ? 'selected' : ''}"
            data-blue-preset-mode="custom"
            aria-pressed="${bluePresetMode === 'custom' ? 'true' : 'false'}"
          >
            Custom
          </button>
          <input type="hidden" class="wizard-hidden-param" data-param="bluePresetMode" value="${bluePresetMode}" />
        </div>
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
          ${intSlider('Existing ground-based midcourse interceptors in range', 'nInventory', 0, 2000, 1, d.nInventory, 'blue', PLACEHOLDER_TOOLTIP_TEXT)}
          ${probSlider('Ground-based midcourse interceptor kill probability', 'pkWarhead', pkw, undefined, 0.1, 99.9, 'blue', PLACEHOLDER_TOOLTIP_TEXT)}

          ${doctrineToggleHTML(
            'Ground-based kinetic midcourse engagement doctrine',
            'midcourseKineticDoctrineMode',
            midcourseDoctrineMode,
            'blue',
            PLACEHOLDER_TOOLTIP_TEXT
          )}
          <div class="doctrine-midcourse-kinetic-barrage-only">
            ${intSlider('Shots per detected/tracked target', 'midcourseKineticShotsPerTarget', 1, 6, 1, midcourseShotsPerTarget, 'blue', PLACEHOLDER_TOOLTIP_TEXT)}
          </div>
          <div class="doctrine-midcourse-kinetic-sls-only" style="display:none">
            ${intSlider('Max shots per detected/tracked target', 'midcourseKineticMaxShotsPerTarget', 1, 4, 1, midcourseMaxShotsPerTarget, 'blue', PLACEHOLDER_TOOLTIP_TEXT)}
          </div>
        </div>
      </div>

      <div class="wizard-tab-panel" data-tab-panel="blue-space">
        <div class="wizard-param-group">
          ${intSlider('Hypothetical space-based boost interceptors in orbit', 'nSpaceBoostKinetic', 0, 42000, 1, d.nSpaceBoostKinetic ?? 0, 'blue', PLACEHOLDER_TOOLTIP_TEXT)}
          ${probSlider('Hypothetical space-based boost interceptor kill probability', 'pkSpaceBoostKinetic', pkbK, undefined, 0.1, 99.9, 'blue', PLACEHOLDER_TOOLTIP_TEXT)}
          ${intSlider('Shots per detected/tracked missile', 'boostKineticShotsPerTarget', 1, 6, 1, boostKineticShotsPerTarget, 'blue', PLACEHOLDER_TOOLTIP_TEXT)}
        </div>
      </div>

      <details class="blue-preset-summary-disclosure" data-blue-preset-summary>
        <summary class="blue-preset-summary-toggle">
          <div class="blue-preset-summary-head">
            <div class="blue-preset-summary-title" data-blue-preset-title>${profileMeta.title}</div>
            <div class="blue-preset-summary-description" data-blue-preset-description>${profileMeta.description}</div>
          </div>
        </summary>

        <div class="blue-preset-summary">
          <div class="blue-preset-summary-section">
            <div class="blue-preset-summary-section-title">Quantitative Capacity</div>
            <div class="blue-preset-summary-grid">
              ${blueSummaryItemHTML('Ground-based midcourse interceptors in range', 'nInventory')}
              ${blueSummaryItemHTML('Hypothetical space-based boost interceptors in orbit', 'nSpaceBoostKinetic')}
            </div>
          </div>

          <div class="blue-preset-summary-section">
            <div class="blue-preset-summary-section-title">Sensors and Detection</div>
            <div class="blue-preset-summary-grid">
              ${blueSummaryItemHTML('Detection and tracking probability', 'pDetectTrack')}
              ${blueSummaryItemHTML('Warhead discrimination accuracy', 'pClassifyWarhead')}
              ${blueSummaryItemHTML('Decoy false-alarm rate', 'pFalseAlarmDecoy')}
            </div>
          </div>

          <div class="blue-preset-summary-section">
            <div class="blue-preset-summary-section-title">Interceptor Effectiveness and Doctrine</div>
            <div class="blue-preset-summary-grid">
              ${blueSummaryItemHTML('Ground-based midcourse interceptor kill probability', 'pkWarhead')}
              ${blueSummaryItemHTML('Hypothetical space-based boost interceptor kill probability', 'pkSpaceBoostKinetic')}
              ${blueSummaryItemHTML('Ground-based kinetic midcourse doctrine', 'midcourseKineticDoctrineMode')}
              ${blueSummaryItemHTML('Barrage shots per detected/tracked target', 'midcourseKineticShotsPerTarget')}
              ${blueSummaryItemHTML('SLS max shots per detected/tracked target', 'midcourseKineticMaxShotsPerTarget')}
              ${blueSummaryItemHTML('Boost shots per detected/tracked missile', 'boostKineticShotsPerTarget')}
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
function redSummaryItemHTML(label, key) {
  return `
    <div class="red-preset-summary-item">
      <span class="red-preset-summary-label">${label}</span>
      <span class="red-preset-summary-value" data-red-summary-value="${key}">-</span>
    </div>
  `;
}

export function redParamsHTML(d) {
  const redPresetMode = d.redPresetMode ?? 'preset';
  const redQuantitativePreset = d.redQuantitativePreset ?? DEFAULT_RED_QUANTITATIVE_PRESET;
  const redQualitativePreset = d.redQualitativePreset ?? DEFAULT_RED_QUALITATIVE_PRESET;
  const profileMeta = getRedAttackProfileMeta(
    redQuantitativePreset,
    redQualitativePreset,
    redPresetMode
  );
  const decoysPerMissile = d.decoysPerMissile ?? (d.decoysPerWarhead * d.mirvsPerMissile).toFixed(1);
  const kilotonsPerWarhead = d.kilotonsPerWarhead ?? 400;
  const launchSiteKey = d.launchSiteKey ?? '';
  return `
    <div class="red-attack-root" data-red-attack-root data-red-attack-mode="${redPresetMode}">
      <div class="preset-selector-layout red-preset-selector">
        <div class="preset-selector-rows">
          <div class="wizard-slider-row preset-selector-row">
            <div class="wizard-slider-header">
              ${labelWithTooltipHTML(
                'Quantitative presets',
                'red',
                RED_QUANTITATIVE_PRESET_TOOLTIP_TEXT
              )}
            </div>
            <div class="wizard-toggle-group red-preset-toggle-group" role="radiogroup" aria-label="Red quantitative presets">
              ${buildPresetToggleButtonsHTML(
                RED_QUANTITATIVE_PRESET_ORDER,
                RED_QUANTITATIVE_PRESET_META,
                redQuantitativePreset,
                'data-red-quantitative-preset',
                'red-preset-toggle-item'
              )}
            </div>
            <input type="hidden" class="wizard-hidden-param" data-param="redQuantitativePreset" value="${redQuantitativePreset}" />
          </div>

          <div class="wizard-slider-row preset-selector-row">
            <div class="wizard-slider-header">
              ${labelWithTooltipHTML(
                'Qualitative presets',
                'red',
                RED_QUALITATIVE_PRESET_TOOLTIP_TEXT
              )}
            </div>
            <div class="wizard-toggle-group red-preset-toggle-group" role="radiogroup" aria-label="Red qualitative presets">
              ${buildPresetToggleButtonsHTML(
                RED_QUALITATIVE_PRESET_ORDER,
                RED_QUALITATIVE_PRESET_META,
                redQualitativePreset,
                'data-red-qualitative-preset',
                'red-preset-toggle-item'
              )}
            </div>
            <input type="hidden" class="wizard-hidden-param" data-param="redQualitativePreset" value="${redQualitativePreset}" />
          </div>
        </div>

        <div class="preset-selector-custom-column">
          <button
            type="button"
            class="wizard-toggle-item red-preset-toggle-item preset-custom-toggle ${redPresetMode === 'custom' ? 'selected' : ''}"
            data-red-preset-mode="custom"
            aria-pressed="${redPresetMode === 'custom' ? 'true' : 'false'}"
          >
            Custom
          </button>
          <input type="hidden" class="wizard-hidden-param" data-param="redPresetMode" value="${redPresetMode}" />
        </div>

        <input type="hidden" class="wizard-hidden-param" data-param="launchSiteKey" value="${launchSiteKey}" />
      </div>

      <div class="wizard-param-group red-custom-panel">
        ${intSlider('Ballistic missiles in strike', 'nMissiles', 1, 1000, 1, d.nMissiles, 'red', PLACEHOLDER_TOOLTIP_TEXT)}
        ${intSlider('Warheads per missile', 'mirvsPerMissile', 1, 16, 1, d.mirvsPerMissile, 'red', PLACEHOLDER_TOOLTIP_TEXT)}
        ${intSlider('Kilotons per warhead', 'kilotonsPerWarhead', 20, 5000, 10, kilotonsPerWarhead, 'red', PLACEHOLDER_TOOLTIP_TEXT)}
        ${intSlider('Decoys per missile', 'decoysPerMissile', 0, 60, 1, decoysPerMissile, 'red', PLACEHOLDER_TOOLTIP_TEXT)}
      </div>

      <details class="red-preset-summary-disclosure" data-red-preset-summary>
        <summary class="red-preset-summary-toggle">
          <div class="red-preset-summary-head">
            <div class="red-preset-summary-title" data-red-preset-title>${profileMeta.title}</div>
            <div class="red-preset-summary-description" data-red-preset-description>${profileMeta.description}</div>
          </div>
        </summary>

        <div class="red-preset-summary">
          <div class="red-preset-summary-section">
            <div class="red-preset-summary-section-title">Strike Salvo</div>
            <div class="red-preset-summary-grid">
              ${redSummaryItemHTML('Ballistic missiles in strike', 'nMissiles')}
              ${redSummaryItemHTML('Warheads per missile', 'mirvsPerMissile')}
              ${redSummaryItemHTML('Kilotons per warhead', 'kilotonsPerWarhead')}
              ${redSummaryItemHTML('Decoys per missile', 'decoysPerMissile')}
              ${redSummaryItemHTML('Launch site', 'launchSiteKey')}
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
