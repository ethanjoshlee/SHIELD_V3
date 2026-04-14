/**
 * UI controls — HTML template, parameter reading, and doctrine toggle.
 */

import { clamp01 } from '../utils/rng.js';
import { COUNTRIES } from '../config/countries.js';
import { LAUNCH_REGION_ORDER, LAUNCH_REGION_PRESETS } from '../config/launchRegions.js';

function launchRegionOptionsHTML(selected) {
  return LAUNCH_REGION_ORDER.map((key) => {
    const label = LAUNCH_REGION_PRESETS[key]?.label ?? key;
    const isSelected = key === selected ? 'selected' : '';
    return `<option value="${key}" ${isSelected}>${label}</option>`;
  }).join('');
}


/**
 * Read all parameter values from the UI form inputs.
 * Supports both id-based and data-param based inputs.
 * @param {string} blueKey - Optional country key for defender
 * @param {string} redKey - Optional country key for attacker
 */
export function readParamsFromUI(blueKey, redKey, root = document) {
  const bluePreset = blueKey ? COUNTRIES.blue[blueKey] : null;
  const redPreset = redKey ? COUNTRIES.red[redKey] : null;

  const getValue = (id, param, defaultVal) => {
    let el = document.getElementById(id);
    if (!el) el = root.querySelector(`[data-param="${param}"]`);
    return el?.value || defaultVal;
  };

  const nMissiles = Math.max(0, parseInt(getValue("nMissiles", "nMissiles", 0), 10) || 0);
  const mirvsPerMissile = Math.max(1, parseInt(getValue("mirvsPerMissile", "mirvsPerMissile", 1), 10) || 1);
  const kilotonsPerWarhead = Math.min(
    5000,
    Math.max(
      20,
      parseFloat(
        getValue(
          "kilotonsPerWarhead",
          "kilotonsPerWarhead",
          redPreset?.kilotonsPerWarhead ?? 400
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
    decoysPerWarhead = Math.max(0, parseInt(getValue("decoysPerWarhead", "decoysPerWarhead", 0), 10) || 0);
  }

  const pDetectTrack = clamp01(parseFloat(getValue("pDetectTrack", "pDetectTrack", 0.8)) || 0);
  const pClassifyWarhead = clamp01(parseFloat(getValue("pClassifyWarhead", "pClassifyWarhead", 0.8)) || 0);
  const pFalseAlarmDecoy = clamp01(parseFloat(getValue("pFalseAlarmDecoy", "pFalseAlarmDecoy", 0.2)) || 0);

  // Legacy global doctrine params are retained as fallback for backward compatibility.
  const doctrineMode = getValue("doctrineMode", "doctrineMode", "barrage");
  const shotsPerTarget = Math.max(0, parseInt(getValue("shotsPerTarget", "shotsPerTarget", 0), 10) || 0);
  const maxShotsPerTarget = Math.max(0, parseInt(getValue("maxShotsPerTarget", "maxShotsPerTarget", 0), 10) || 0);

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
    0,
    parseInt(
      getValue("midcourseKineticMaxShotsPerTarget", "midcourseKineticMaxShotsPerTarget", maxShotsPerTarget),
      10
    ) || 0
  );

  const boostKineticShotsPerTarget = Math.max(
    0,
    parseInt(
      getValue("boostKineticShotsPerTarget", "boostKineticShotsPerTarget", shotsPerTarget),
      10
    ) || 0
  );

  const pkWarhead = clamp01(parseFloat(getValue("pkWarhead", "pkWarhead", 0.6)) || 0);
  // Unified per-interceptor Pk (classification handles warhead vs decoy shot allocation).
  const pkDecoy = pkWarhead;

  const nInventory = Math.max(0, parseInt(getValue("nInventory", "nInventory", 0), 10) || 0);

  const nSpaceBoostKinetic = Math.max(
    0,
    parseInt(
      getValue(
        "nSpaceBoostKinetic",
        "nSpaceBoostKinetic",
        bluePreset?.nSpaceBoostKinetic ?? bluePreset?.interceptors?.boost_kinetic?.deployed ?? 0
      ),
      10
    ) || 0
  );
  const pkSpaceBoostKinetic = clamp01(
    parseFloat(
      getValue(
        "pkSpaceBoostKinetic",
        "pkSpaceBoostKinetic",
        bluePreset?.pkSpaceBoostKinetic ?? bluePreset?.interceptors?.boost_kinetic?.pk ?? 0.5
      )
    ) || 0
  );

  const launchRegion = getValue(
    "launchRegion",
    "launchRegion",
    redPreset?.launchRegion ?? "default"
  );
  const asatSensingPenalty = clamp01(
    parseFloat(
      getValue(
        "asatSensingPenalty",
        "asatSensingPenalty",
        redPreset?.asatSensingPenalty ?? 0
      )
    ) || 0
  );
  const asatAvailabilityPenalty = clamp01(
    parseFloat(
      getValue(
        "asatAvailabilityPenalty",
        "asatAvailabilityPenalty",
        redPreset?.asatAvailabilityPenalty ?? 0
      )
    ) || 0
  );
  const boostEvasionPenalty = clamp01(
    parseFloat(
      getValue(
        "boostEvasionPenalty",
        "boostEvasionPenalty",
        redPreset?.boostEvasionPenalty ?? 0
      )
    ) || 0
  );
  const midcourseInterceptionPenalty = clamp01(
    parseFloat(
      getValue(
        "midcourseInterceptionPenalty",
        "midcourseInterceptionPenalty",
        redPreset?.midcourseInterceptionPenalty ?? 0
      )
    ) || 0
  );

  const nTrials = Math.max(1, parseInt(getValue("nTrials", "nTrials", 1000), 10) || 1000);

  const seedVal = (getValue("seed", "seed", "").trim());
  const seed = seedVal === "" ? null : parseInt(seedVal, 10) || 0;

  // --- Construct multi-phase structured params from flat UI values + presets ---

  // Interceptors: all active layers are sourced from editable UI values.
  // Presets only provide initial defaults loaded into those controls.
  const presetInterceptors = bluePreset?.interceptors ?? {};
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

  // Missile classes: synthetic single class from flat slider values. This
  // preserves current wizard behavior while activating multi-phase routing.
  // Per-class fidelity (passing preset missileClasses directly) is a future step.
  const missileClasses = {
    strike: {
      count: nMissiles,
      mirvsPerMissile,
      decoysPerWarhead,
      yieldKt: kilotonsPerWarhead,
      // Slider-controlled boost evasion is modeled at scenario level.
      // Keep missile-level synthetic value neutral to avoid double-application.
      boostEvasion: 0,
    },
  };

  // Countermeasures: sourced from editable UI values, with preset type retained
  // as metadata only.
  const countermeasures = {
    asatType: redPreset?.countermeasures?.asatType ?? "none",
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
    redKey,
    interceptors,
    missileClasses,
    countermeasures,
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
    <div class="wizard-slider-value">
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
      ${unit ? `<span class="wizard-slider-unit">${unit}</span>` : ''}
    </div>
  `;
}

function probSlider(label, param, pct, defaultPct, minPct = 0.1, maxPct = 99.9) {
  const v = defaultPct ?? pct;
  return `
    <div class="wizard-slider-row">
      <div class="wizard-slider-header">
        <span class="wizard-slider-label">${label}</span>
        ${sliderValueInputHTML(label, v, minPct, maxPct, 0.1, '%')}
      </div>
      <input type="range" class="wizard-slider" min="${minPct}" max="${maxPct}" step="0.1" value="${v}" data-prob-target="${param}" />
      <input type="number" class="wizard-hidden-param" data-param="${param}" value="${(v / 100).toFixed(4)}" tabindex="-1" aria-hidden="true" />
    </div>`;
}

function intSlider(label, param, min, max, step, defaultVal) {
  return `
    <div class="wizard-slider-row">
      <div class="wizard-slider-header">
        <span class="wizard-slider-label">${label}</span>
        ${sliderValueInputHTML(label, defaultVal, min, max, step)}
      </div>
      <input type="range" class="wizard-slider" data-param="${param}" min="${min}" max="${max}" step="${step}" value="${defaultVal}" />
    </div>`;
}


/**
 * BLUE step parameters (defender capabilities + engagement doctrine).
 * 2-column layout for paired controls.
 */
export function blueParamsHTML(d) {
  const midcourseDoctrineMode = d.midcourseKineticDoctrineMode ?? d.doctrineMode ?? 'barrage';
  const midcourseShotsPerTarget = d.midcourseKineticShotsPerTarget ?? d.shotsPerTarget ?? 2;
  const midcourseMaxShotsPerTarget = d.midcourseKineticMaxShotsPerTarget ?? d.maxShotsPerTarget ?? 4;
  const boostKineticShotsPerTarget = d.boostKineticShotsPerTarget ?? d.shotsPerTarget ?? 2;
  const pdt  = (d.pDetectTrack * 100).toFixed(1);
  const pcw  = (d.pClassifyWarhead * 100).toFixed(1);
  const pfa  = (d.pFalseAlarmDecoy * 100).toFixed(1);
  const pkw  = (d.pkWarhead * 100).toFixed(1);
  const pkbK = ((d.pkSpaceBoostKinetic ?? 0.5) * 100).toFixed(1);
  const doctrineToggleHTML = (label, param, mode) => `
      <div class="wizard-slider-row">
        <div class="wizard-slider-header">
          <span class="wizard-slider-label">${label}</span>
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
    <div class="wizard-tab-strip" data-tab-group="blue">
      <div class="wizard-tab active" data-tab="blue-sensing">Sensors and Detection</div>
      <div class="wizard-tab" data-tab="blue-gbi">Ground-Based Midcourse Interceptors</div>
      <div class="wizard-tab" data-tab="blue-space">Hypothetical Space-Based Interceptors</div>
    </div>

    <!-- Tab 1: Sensing, Tracking & Discrimination -->
    <div class="wizard-tab-panel active" data-tab-panel="blue-sensing">
      <div class="wizard-param-group wizard-param-group--sensing">
        <div class="wizard-control-stack">
          <div class="wizard-slider-row">
            <div class="wizard-slider-header">
              <span class="wizard-slider-label">Detection and tracking probability</span>
              ${sliderValueInputHTML('Detection and tracking probability', pdt, 0.1, 99.9, 0.1, '%')}
            </div>
            <input type="range" class="wizard-slider" min="0.1" max="99.9" step="0.1" value="${pdt}" data-prob-target="pDetectTrack" />
            <input type="number" class="wizard-hidden-param" data-param="pDetectTrack" value="${(Number(pdt) / 100).toFixed(4)}" tabindex="-1" aria-hidden="true" />
          </div>
          <div class="wizard-slider-note wizard-control-explanation">
            Probability that an incoming missile or object is detected and tracked for engagement.
          </div>
        </div>

        <div class="wizard-control-stack">
          <div class="wizard-slider-row">
            <div class="wizard-slider-header">
              <span class="wizard-slider-label">Warhead discrimination accuracy</span>
              ${sliderValueInputHTML('Warhead discrimination accuracy', pcw, 0.1, 99.9, 0.1, '%')}
            </div>
            <input type="range" class="wizard-slider" min="0.1" max="99.9" step="0.1" value="${pcw}" data-prob-target="pClassifyWarhead" />
            <input type="number" class="wizard-hidden-param" data-param="pClassifyWarhead" value="${(Number(pcw) / 100).toFixed(4)}" tabindex="-1" aria-hidden="true" />
          </div>
          <div class="wizard-slider-note wizard-control-explanation">
            Probability that a real warhead is correctly identified as a real warhead for interception.
          </div>
        </div>

        <div class="wizard-control-stack">
          <div class="wizard-slider-row">
            <div class="wizard-slider-header">
              <span class="wizard-slider-label">Decoy false-alarm rate</span>
              ${sliderValueInputHTML('Decoy false-alarm rate', pfa, 0.1, 99.9, 0.1, '%')}
            </div>
            <input type="range" class="wizard-slider" min="0.1" max="99.9" step="0.1" value="${pfa}" data-prob-target="pFalseAlarmDecoy" />
            <input type="number" class="wizard-hidden-param" data-param="pFalseAlarmDecoy" value="${(Number(pfa) / 100).toFixed(4)}" tabindex="-1" aria-hidden="true" />
          </div>
          <div class="wizard-slider-note wizard-control-explanation">
            Probability that a decoy is mistakenly identified as a real warhead for interception.
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2: Existing Ground-Based Midcourse Interceptors -->
    <div class="wizard-tab-panel" data-tab-panel="blue-gbi">
      <div class="wizard-param-group">
        ${intSlider('Existing ground-based midcourse interceptors in engagement range', 'nInventory', 0, 2000, 1, d.nInventory)}
        ${probSlider('Ground-based midcourse interceptor kill probability', 'pkWarhead', pkw)}

        ${doctrineToggleHTML(
          'Ground-based kinetic midcourse engagement doctrine',
          'midcourseKineticDoctrineMode',
          midcourseDoctrineMode
        )}
        <div class="doctrine-midcourse-kinetic-barrage-only">
          ${intSlider('Ground-based kinetic midcourse shots per detected/tracked target', 'midcourseKineticShotsPerTarget', 1, 6, 1, midcourseShotsPerTarget)}
        </div>
        <div class="doctrine-midcourse-kinetic-sls-only" style="display:none">
          ${intSlider('Ground-based kinetic midcourse max shots per detected/tracked target', 'midcourseKineticMaxShotsPerTarget', 1, 6, 1, midcourseMaxShotsPerTarget)}
        </div>
      </div>
    </div>

    <!-- Tab 3: Hypothetical Space-Based Interceptors -->
    <div class="wizard-tab-panel" data-tab-panel="blue-space">
      <div class="wizard-param-group">
        ${intSlider('Hypothetical space-based kinetic boost interceptors in orbit', 'nSpaceBoostKinetic', 0, 4000, 1, d.nSpaceBoostKinetic ?? 0)}
        ${probSlider('Hypothetical space-based kinetic boost interceptor kill probability', 'pkSpaceBoostKinetic', pkbK)}
        ${intSlider('Hypothetical space-based kinetic boost shots per detected/tracked boost-phase missile', 'boostKineticShotsPerTarget', 1, 6, 1, boostKineticShotsPerTarget)}
      </div>
    </div>

  `;
}

/**
 * RED step parameters (attacker payload).
 * Uses decoysPerMissile — decoys per missile (independent of missile count).
 */
export function redParamsHTML(d) {
  const decoysPerMissile = d.decoysPerMissile ?? (d.decoysPerWarhead * d.mirvsPerMissile).toFixed(1);
  const kilotonsPerWarhead = d.kilotonsPerWarhead ?? 400;
  const asatSensing = ((d.asatSensingPenalty ?? 0) * 100).toFixed(1);
  const asatAvailability = ((d.asatAvailabilityPenalty ?? 0) * 100).toFixed(1);
  const boostEvade = ((d.boostEvasionPenalty ?? 0) * 100).toFixed(1);
  const midcourseIntercept = ((d.midcourseInterceptionPenalty ?? 0) * 100).toFixed(1);
  const launchRegion = d.launchRegion ?? 'default';
  return `
    <div class="wizard-tab-strip" data-tab-group="red">
      <div class="wizard-tab active" data-tab="red-strike">Strike Salvo</div>
      <div class="wizard-tab" data-tab="red-countermeasures">Penetration Aids</div>
      <div class="wizard-tab" data-tab="red-counterspace">Counterspace Attack</div>
    </div>

    <!-- Tab 1: Strike Composition -->
    <div class="wizard-tab-panel active" data-tab-panel="red-strike">
      <div class="wizard-param-group">
        ${intSlider('Ballistic missiles in strike', 'nMissiles', 1, 500, 1, d.nMissiles)}
        ${intSlider('Warheads per missile', 'mirvsPerMissile', 1, 16, 1, d.mirvsPerMissile)}
        ${intSlider('Kilotons per warhead', 'kilotonsPerWarhead', 20, 5000, 10, kilotonsPerWarhead)}
        <div class="wizard-slider-row">
          <div class="wizard-slider-header">
            <span class="wizard-slider-label">Launch region preset</span>
          </div>
          <select class="wizard-select" data-param="launchRegion">
            ${launchRegionOptionsHTML(launchRegion)}
          </select>
        </div>
      </div>
    </div>

    <!-- Tab 2: Countermeasures -->
    <div class="wizard-tab-panel" data-tab-panel="red-countermeasures">
      <div class="wizard-param-group">
        ${intSlider('Decoys per missile', 'decoysPerMissile', 0, 40, 1, decoysPerMissile)}
        ${probSlider('Boost-phase survivability and evasion', 'boostEvasionPenalty', boostEvade, undefined, 0)}
        ${probSlider('Midcourse discrimination and allocation penalty', 'midcourseInterceptionPenalty', midcourseIntercept, undefined, 0)}
      </div>
    </div>

    <!-- Tab 3: Counterspace -->
    <div class="wizard-tab-panel" data-tab-panel="red-counterspace">
      <div class="wizard-param-group">
        <div class="wizard-note">These penalties represent the aggregate outcome of Red counterspace operations (cyber/EW, kinetic ASAT, nuclear ASAT, or any combination) against Blue's remaining space-based boost-phase layer. Set each to the assumed fraction of degradation. The specific mechanism is not modeled — only the outcome matters.</div>
        ${probSlider('Space-layer sensing and cueing degradation', 'asatSensingPenalty', asatSensing, undefined, 0)}
        ${probSlider('Space-based interceptor availability degradation', 'asatAvailabilityPenalty', asatAvailability, undefined, 0)}
        <div class="wizard-note">Sensing degradation reduces boost and midcourse detection/tracking probability. Availability degradation reduces the number of space-based boost interceptors available for engagement. Ground-based midcourse interceptors remain in the model, but are not themselves space-based assets.</div>
      </div>
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
      ${intSlider('Monte Carlo trials', 'nTrials', 100, 5000, 100, d.nTrials)}
      <div class="wizard-note">2,000 trials is recommended for most analyses. Increasing to 5,000 can improve the precision of tail statistics in more extreme scenarios, such as when assuming very low intercept probabilities or large numbers of warhead decoys.</div>
      <div class="wizard-slider-row" style="margin-top: 12px;">
        <div class="wizard-slider-header">
          <span class="wizard-slider-label">Seed (blank = random)</span>
        </div>
        <input type="text" class="wizard-text-input" data-param="seed" placeholder="auto" value="${d.seed ?? ''}" />
        <div class="wizard-slider-note">Leave blank for a new random result each run. Enter a number to reproduce the exact same run for verification or debugging.</div>
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
            Ground-based midcourse interceptors in engagement range (existing U.S. architecture):
            <input type="number" class="param-input" data-param="nInventory" min="0" step="1" value="${d.nInventory}" />
          </label>
          <label>
            Hypothetical space-based kinetic boost interceptors in orbit:
            <input type="number" class="param-input" data-param="nSpaceBoostKinetic" min="0" step="1" value="${d.nSpaceBoostKinetic ?? 0}" />
          </label>
          <label>
            Hypothetical space-based kinetic boost interceptor kill probability:
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
            Space-layer sensing and cueing degradation:
            <input type="number" class="param-input" data-param="asatSensingPenalty" min="0" max="1" step="0.01" value="${d.asatSensingPenalty ?? 0}" />
          </label>
          <label>
            Space-based interceptor availability degradation:
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
            <input type="number" class="param-input" data-param="midcourseKineticMaxShotsPerTarget" min="0" step="1" value="${d.midcourseKineticMaxShotsPerTarget ?? d.maxShotsPerTarget}" />
          </label>
          <label>
            Hypothetical space-based kinetic boost shots per detected/tracked boost-phase missile:
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
