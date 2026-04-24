/**
 * Results panel rendering and interactions for the results screen.
 */

import { fmt } from '../utils/format.js';
import { renderHistogramHTML } from './charts.js';
import { getRedLaunchSite, SBI_CONSTELLATION_ASSUMPTIONS } from '../config/launchSites.js';
import {
  getBlueQuantitativePresetMeta,
  getBlueQualitativePresetMeta,
} from '../config/blueDefensePresets.js';
import {
  getRedQuantitativePresetMeta,
  getRedQualitativePresetMeta,
} from '../config/redAttackPresets.js';
import { DELIVERED_KILOTONS_BENCHMARKS } from './deliveredKilotonsBenchmarks.js';
import { COST_MODEL_REFERENCE, COST_MODEL_UI } from '../model/costModel.js';

function resolveDeliveredStepSize(params) {
  const raw = Number(params?.kilotonsPerWarhead);
  if (!Number.isFinite(raw) || raw <= 0) return 400;
  return raw;
}

function distributionChartOptions(distributionTitle, params = {}) {
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
    const stepSize = resolveDeliveredStepSize(params);
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

function formatDoctrineLine(mode, shots, maxShots) {
  return mode === 'barrage'
    ? `Barrage, ${shots} shots per detected/tracked target (committed salvo)`
    : `SLS, max ${maxShots} shots per detected/tracked target`;
}

function formatCount(value) {
  return Math.round(Number(value) || 0).toLocaleString('en-US');
}

function formatCoordinate(value, positiveHemisphere, negativeHemisphere) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 'Unspecified';

  const hemisphere = numericValue >= 0 ? positiveHemisphere : negativeHemisphere;
  return `${Math.abs(numericValue).toFixed(2)} deg ${hemisphere}`;
}

function formatCoordinatePair(latDeg, lngDeg) {
  return `${formatCoordinate(latDeg, 'N', 'S')}, ${formatCoordinate(lngDeg, 'E', 'W')}`;
}

function formatReferenceOrbitSummary(elements) {
  if (!elements) return 'Reference seed orbit not specified.';

  return [
    `a = ${fmt(elements.semiMajorAxisKm ?? 0, 0)} km`,
    `e = ${fmt(elements.eccentricity ?? 0, 2)}`,
    `i = ${fmt(elements.inclinationDeg ?? 0, 0)} deg`,
    `RAAN = ${fmt(elements.rightAscensionOfAscendingNodeDeg ?? 0, 0)} deg`,
    `arg. perigee = ${fmt(elements.argumentOfPerigeeDeg ?? 0, 0)} deg`,
    `true anomaly = ${fmt(elements.trueAnomalyDeg ?? 0, 0)} deg`,
  ].join(', ');
}

function humanizeConstellationFamily(family) {
  if (!family) return 'reference constellation';
  return family.replaceAll('_', ' ');
}

function formatCostMagnitude(valueB) {
  if (!Number.isFinite(valueB)) return '$0.0B';
  const absValueB = Math.abs(valueB);
  if (absValueB >= 1000) return `$${fmt(valueB / 1000, 2)}T`;
  return `$${fmt(valueB, 1)}B`;
}

function initResultsTabStrip(rootEl) {
  rootEl.querySelectorAll('.wizard-tab-strip[data-tab-group="results"]').forEach((strip) => {
    strip.querySelectorAll('.wizard-tab[data-tab]').forEach((tab) => {
      tab.addEventListener('click', () => {
        const tabId = tab.dataset.tab;
        if (!tabId) return;

        strip.querySelectorAll('.wizard-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');

        const container = strip.parentElement;
        container.querySelectorAll('.wizard-tab-panel').forEach((panel) => {
          panel.classList.toggle('active', panel.dataset.tabPanel === tabId);
        });
      });
    });
  });
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

export function initResultsInteractions(rootEl, runResult, runParams) {
  initResultsTabStrip(rootEl);
  initDistributionViewer(rootEl, runResult, runParams);
}

export function renderResultsContent(params, result) {
  const s = result.summary;

  const realWarheads = params.nMissiles * params.mirvsPerMissile;
  const decoysPerMissile = params.decoysPerWarhead * params.mirvsPerMissile;
  const kilotonsPerWarhead = params.kilotonsPerWarhead ?? 400;
  const decoys = realWarheads * params.decoysPerWarhead;
  const totalObjects = realWarheads + decoys;

  const midcourseKineticDoctrineMode = params.midcourseKineticDoctrineMode ?? params.doctrineMode ?? 'barrage';
  const midcourseKineticShotsPerTarget = params.midcourseKineticShotsPerTarget ?? params.shotsPerTarget ?? 2;
  const midcourseKineticMaxShotsPerTarget = params.midcourseKineticMaxShotsPerTarget ?? params.maxShotsPerTarget ?? 2;
  const midcourseDoctrineLine = formatDoctrineLine(
    midcourseKineticDoctrineMode,
    midcourseKineticShotsPerTarget,
    midcourseKineticMaxShotsPerTarget
  );

  const boostKineticShotsPerTarget = params.boostKineticShotsPerTarget ?? params.shotsPerTarget ?? 2;

  const nSpaceBoostKinetic = params.nSpaceBoostKinetic ?? 0;
  const pkSpaceBoostKinetic = params.pkSpaceBoostKinetic ?? 0;
  const launchSiteKey = params.launchSiteKey ?? '';
  const launchSite = getRedLaunchSite(launchSiteKey);
  const launchSiteLabel = launchSite?.label || launchSiteKey || 'Unspecified';
  const launchSiteCoordinates = launchSite
    ? formatCoordinatePair(launchSite.coordinates?.latDeg, launchSite.coordinates?.lngDeg)
    : 'Unspecified';
  const launchSiteNote =
    launchSite?.notes ||
    'Representative launch site is fixed by Red actor selection and used in the boost-phase space-layer availability calculation.';
  const launchSiteSbiAvailabilityPercent =
    launchSite?.sbiAvailability?.percentOfConstellation ?? 0;
  const orbitModel = SBI_CONSTELLATION_ASSUMPTIONS.orbitModel ?? {};
  const referenceElements = orbitModel.referenceSatelliteClassicalElements ?? null;
  const availabilityModel = SBI_CONSTELLATION_ASSUMPTIONS.availabilityApproximation ?? {};
  const spaceLayerGeometrySummary = [
    `${orbitModel.shape ?? 'Unspecified'} ${humanizeConstellationFamily(orbitModel.family)}`,
    `${fmt(orbitModel.altitudeKm ?? 0, 0)} km altitude`,
    `${fmt(orbitModel.inclinationDeg ?? 0, 0)} deg inclination`,
    `${fmt(orbitModel.interceptorEngagementRadiusKm ?? 0, 0)} km interceptor engagement radius`,
  ].join(', ');
  const referenceOrbitSummary = formatReferenceOrbitSummary(referenceElements);
  const availabilitySummary = [
    `${availabilityModel.method ?? 'Approximation'} using actor-fixed launch-site latitude`,
    `launch-site availability = ${fmt(launchSiteSbiAvailabilityPercent, 2)}% of constellation`,
  ].join('; ');
  const meanDeliveredKilotons = s.meanDeliveredKilotons ?? s.meanKtDelivered ?? 0;
  const p10DeliveredKilotons = s.p10DeliveredKilotons ?? s.p10KtDelivered ?? 0;
  const medianDeliveredKilotons = s.medianDeliveredKilotons ?? s.medianKtDelivered ?? 0;
  const p90DeliveredKilotons = s.p90DeliveredKilotons ?? s.p90KtDelivered ?? 0;
  const hasDistributionData = !!(result.penReal && result.penReal.length > 0);
  const defaultDistTitle = 'Delivered Kilotons';
  const bluePresetMode = params.bluePresetMode ?? 'preset';
  const blueQuantitativePreset = params.blueQuantitativePreset ?? 'medium';
  const blueQualitativePreset = params.blueQualitativePreset ?? 'baseline';
  const blueQuantitativePresetMeta = getBlueQuantitativePresetMeta(blueQuantitativePreset);
  const blueQualitativePresetMeta = getBlueQualitativePresetMeta(blueQualitativePreset);
  const redPresetMode = params.redPresetMode ?? 'preset';
  const redQuantitativePreset = params.redQuantitativePreset ?? 'medium';
  const redQualitativePreset = params.redQualitativePreset ?? 'baseline';
  const redQuantitativePresetMeta = getRedQuantitativePresetMeta(redQuantitativePreset);
  const redQualitativePresetMeta = getRedQualitativePresetMeta(redQualitativePreset);
  const costFramingLabel = s.costFramingLabel ?? COST_MODEL_UI.framingLabel;
  const costModelNotes = Array.isArray(s.costModelNotes) ? s.costModelNotes : [];
  const spaceBoostLayerCostB = s.spaceBoostLayerCost_B ?? 0;
  const spaceBoostDevelopmentCostB = s.spaceBoostDevelopmentCost_B ?? 0;
  const spaceBoostInitialProcurementLaunchCostB = s.spaceBoostInitialProcurementLaunchCost_B ?? 0;
  const spaceBoostReplenishmentCostB = s.spaceBoostReplenishmentCost_B ?? 0;
  const spaceBoostOperationsCostB = s.spaceBoostOperationsCost_B ?? 0;
  const spaceBoostRequestedCount = s.spaceBoostRequestedCount ?? 0;
  const spaceBoostCostedCount = s.spaceBoostCostedCount ?? 0;
  const spaceBoostCostWasCapped = !!s.spaceBoostCostWasCapped;
  const sensingC2SupportCostB = s.sensingC2SupportCost_B ?? 0;
  const supportBundleScale = s.supportBundleScale ?? 0;
  const supportBundleBaseCostB = s.supportBundleBaseCost_B ?? 0;
  const groundBasedInterceptorLayerCostB = s.groundBasedInterceptorLayerCost_B ?? 0;
  const groundBattalionEquivalent = s.groundBattalionEquivalent ?? 0;
  const groundBattalion20YearCostB = s.groundBattalion20YearCost_B ?? 0;
  const totalArchitectureEquivalentCostB = s.totalArchitectureEquivalentCost_B ?? 0;

  return `
    <div class="results-content">
      <div class="wizard-tab-strip results-tab-strip" data-tab-group="results">
        <div class="wizard-tab active" data-tab="results-outputs">Outputs</div>
        <div class="wizard-tab" data-tab="results-costs">Costs</div>
        <div class="wizard-tab" data-tab="results-inputs">Inputs</div>
      </div>

      <div class="wizard-tab-panel active" data-tab-panel="results-outputs">
        <h3>Summary</h3>
        <div class="results-grid">
          <div class="result-item highlight">
            <span class="label">Mean Penetrated:</span>
            <span class="value" style="color: var(--accent-red);">${fmt(s.meanPenReal, 2)}</span>
          </div>
          <div class="result-item">
            <span class="label">P10 / Median / P90:</span>
            <span class="value">${s.p10PenReal.toFixed(0)} / ${s.medianPenReal.toFixed(0)} / ${s.p90PenReal.toFixed(0)}</span>
          </div>
          <div class="result-item">
            <span class="label">Penetration Rate:</span>
            <span class="value">${fmt(100 * s.meanPenRateReal, 1)}%</span>
          </div>
          <div class="result-item">
            <span class="label">Mean Intercepted:</span>
            <span class="value" style="color: var(--accent-green);">${fmt(s.meanIntReal, 2)}</span>
          </div>
          <div class="result-item">
            <span class="label">Mean delivered kilotons:</span>
            <span class="value" style="color: var(--accent-red);">${fmt(meanDeliveredKilotons, 1)} kt</span>
          </div>
          <div class="result-item">
            <span class="label">Delivered kilotons P10 / Median / P90:</span>
            <span class="value">${fmt(p10DeliveredKilotons, 0)} / ${fmt(medianDeliveredKilotons, 0)} / ${fmt(p90DeliveredKilotons, 0)} kt</span>
          </div>
        </div>

        ${s.meanBoostMissilesKilled != null ? `
          <h3>Per-Phase Breakdown</h3>
          <div class="results-grid">
            <div class="result-item">
              <span class="label">Boost: Missiles Killed</span>
              <span class="value">${fmt(s.meanBoostMissilesKilled, 2)}</span>
            </div>
            <div class="result-item">
              <span class="label">Boost: Warheads Destroyed</span>
              <span class="value">${fmt(s.meanBoostWarheadsDestroyed, 2)}</span>
            </div>
            <div class="result-item">
              <span class="label">Midcourse: Warheads Killed</span>
              <span class="value">${fmt(s.meanMidcourseWarheadsKilled, 2)}</span>
            </div>
          </div>
        ` : ''}

        ${hasDistributionData ? `
          <h3>Distributions</h3>
          <div class="results-distribution-viewer" data-dist-viewer>
            <div class="results-dist-toolbar">
              <div class="results-dist-head">
                <div class="results-dist-active-title" data-dist-title>${defaultDistTitle}</div>
                <div class="results-dist-index" data-dist-index>1 / 3</div>
              </div>
              <div class="results-dist-nav">
                <button class="results-dist-nav-btn" type="button" data-dist-nav="prev" aria-label="Previous distribution">←</button>
                <button class="results-dist-nav-btn" type="button" data-dist-nav="next" aria-label="Next distribution">→</button>
              </div>
            </div>
            <div class="results-dist-stage" data-dist-stage>
              ${renderHistogramHTML(
                result.deliveredKilotons ?? result.ktDelivered ?? [],
                distributionChartOptions(defaultDistTitle, params).bins,
                defaultDistTitle,
                distributionChartOptions(defaultDistTitle, params)
              )}
            </div>
          </div>
        ` : ''}
      </div>

      <div class="wizard-tab-panel" data-tab-panel="results-costs">
        <h3>${COST_MODEL_UI.heading}</h3>

        <div class="cost-framing-card">
          <div class="cost-framing-title">${costFramingLabel}</div>
          ${costModelNotes.length > 0 ? `
            <div class="cost-framing-notes">
              ${costModelNotes.map((note) => `<div>${note}</div>`).join('')}
            </div>
          ` : ''}
        </div>

        <div class="results-grid results-grid--single">
          <div class="result-item">
            <span class="label">Estimated space-based interceptor layer cost:</span>
            <span class="value">${formatCostMagnitude(spaceBoostLayerCostB)}</span>
          </div>
          <div class="result-item">
            <span class="label">Estimated sensing / C2 support cost:</span>
            <span class="value">${formatCostMagnitude(sensingC2SupportCostB)}</span>
          </div>
          <div class="result-item">
            <span class="label">Estimated ground-based interceptor layer cost:</span>
            <span class="value">${formatCostMagnitude(groundBasedInterceptorLayerCostB)}</span>
          </div>
          <div class="result-item highlight result-item--cost-total">
            <span class="label">Estimated total 20-year architecture-equivalent cost:</span>
            <span class="value">${formatCostMagnitude(totalArchitectureEquivalentCostB)}</span>
          </div>
        </div>

        <details class="cost-methodology-disclosure">
          <summary class="cost-methodology-toggle">
            <div class="cost-methodology-head">
              <span class="cost-methodology-title">Methodology and assumptions</span>
              <span class="cost-methodology-subtitle">Modeled layers, equations, AEI anchors, and deferred scope</span>
            </div>
          </summary>

          <div class="cost-methodology">
            <div class="cost-methodology-grid">
              <div class="cost-methodology-block">
                <div class="cost-methodology-block-title">Modeled SHIELD_V3 Drivers</div>
                <div class="cost-methodology-note">Hypothetical space-based boost interceptors in orbit: ${formatCount(params.nSpaceBoostKinetic)}</div>
                <div class="cost-methodology-note">Existing ground-based midcourse interceptors in range: ${formatCount(params.nInventory)}</div>
              </div>

              <div class="cost-methodology-block">
                <div class="cost-methodology-block-title">Space-Based Boost Layer</div>
                ${spaceBoostRequestedCount > 0 ? `
                  <div class="cost-methodology-equation">
                    Space layer = ${formatCostMagnitude(spaceBoostDevelopmentCostB)} development + ${formatCostMagnitude(spaceBoostInitialProcurementLaunchCostB)} procurement/launch + ${formatCostMagnitude(spaceBoostReplenishmentCostB)} replenishment + ${formatCostMagnitude(spaceBoostOperationsCostB)} 20-year O&amp;S = ${formatCostMagnitude(spaceBoostLayerCostB)}
                  </div>
                  <div class="cost-methodology-note">
                    Piecewise-linear interpolation across AEI boost-phase anchor counts (${formatCount(COST_MODEL_REFERENCE.boostBasicAnchorCount)}, ${formatCount(COST_MODEL_REFERENCE.boostModerateAnchorCount)}, ${formatCount(COST_MODEL_REFERENCE.boostRobustAnchorCount)}).
                  </div>
                  ${spaceBoostCostWasCapped ? `
                    <div class="cost-methodology-note">
                      Requested ${formatCount(spaceBoostRequestedCount)} interceptors; costing capped at AEI's robust anchor of ${formatCount(COST_MODEL_REFERENCE.boostRobustAnchorCount)} for this first pass.
                    </div>
                  ` : `
                    <div class="cost-methodology-note">
                      Costing count used: ${formatCount(spaceBoostCostedCount)} interceptors.
                    </div>
                  `}
                ` : `
                  <div class="cost-methodology-note">
                    No modeled space-based boost interceptors were selected, so this layer is costed at ${formatCostMagnitude(spaceBoostLayerCostB)}.
                  </div>
                `}
              </div>

              <div class="cost-methodology-block">
                <div class="cost-methodology-block-title">Ground-Based Interceptor Layer</div>
                <div class="cost-methodology-equation">
                  Ground layer = (${fmt(groundBattalionEquivalent, 2)} battalion-equivalents) × ${formatCostMagnitude(groundBattalion20YearCostB)} per battalion = ${formatCostMagnitude(groundBasedInterceptorLayerCostB)}
                </div>
                <div class="cost-methodology-note">
                  Battalion-equivalents = ${formatCount(params.nInventory)} / ${COST_MODEL_REFERENCE.groundInterceptorsPerBattalion} interceptors per battalion.
                </div>
              </div>

              <div class="cost-methodology-block">
                <div class="cost-methodology-block-title">Sensing / C2 Support Bundle</div>
                <div class="cost-methodology-equation">
                  Support bundle = ${fmt(supportBundleScale, 2)} architecture scale × ${formatCostMagnitude(supportBundleBaseCostB)} base bundle = ${formatCostMagnitude(sensingC2SupportCostB)}
                </div>
                <div class="cost-methodology-note">
                  Scale = max(space boost interceptors / ${formatCount(COST_MODEL_REFERENCE.boostBasicAnchorCount)}, ground interceptors / ${COST_MODEL_REFERENCE.groundInterceptorsPerBattalion}).
                </div>
                <div class="cost-methodology-note">
                  Base bundle is assembled from AEI-inspired tracking-satellite, C2BMC, pLEO SATCOM, and command-center component costs.
                </div>
              </div>

              <div class="cost-methodology-block">
                <div class="cost-methodology-block-title">Deferred Scope</div>
                <div class="cost-deferred-list">
                  ${COST_MODEL_UI.deferredScope.map((note) => `<div class="cost-methodology-note">${note}</div>`).join('')}
                </div>
              </div>
            </div>
          </div>
        </details>
      </div>

      <div class="wizard-tab-panel" data-tab-panel="results-inputs">
        <h3>Inputs</h3>
        <div class="results-grid">
          <div class="results-input-group-label results-input-group-label--first">Defense Profile</div>
          <div class="result-item">
            <span class="label">Blue preset mode:</span>
            <span class="value">${bluePresetMode === 'custom' ? 'Custom' : 'Preset'}</span>
          </div>
          <div class="result-item">
            <span class="label">Blue quantitative preset:</span>
            <span class="value">${blueQuantitativePresetMeta.label}</span>
          </div>
          <div class="result-item">
            <span class="label">Blue qualitative preset:</span>
            <span class="value">${blueQualitativePresetMeta.label}</span>
          </div>
          <div class="result-item result-item--stacked">
            <span class="label">Preset note:</span>
            <span class="value">${bluePresetMode === 'custom' ? 'All Blue quantitative and qualitative assumptions were manually configured in custom mode.' : 'Blue values were resolved from the selected quantitative and qualitative preset rows.'}</span>
          </div>

          <div class="results-input-group-label">Attack Profile</div>
          <div class="result-item">
            <span class="label">Red preset mode:</span>
            <span class="value">${redPresetMode === 'custom' ? 'Custom' : 'Preset'}</span>
          </div>
          <div class="result-item">
            <span class="label">Red quantitative preset:</span>
            <span class="value">${redQuantitativePresetMeta.label}</span>
          </div>
          <div class="result-item">
            <span class="label">Red qualitative preset:</span>
            <span class="value">${redQualitativePresetMeta.label}</span>
          </div>
          <div class="result-item result-item--stacked">
            <span class="label">Preset note:</span>
            <span class="value">${redPresetMode === 'custom' ? 'Red quantitative and qualitative assumptions were manually configured, while the actor-specific launch site remained fixed.' : 'Red values were resolved from the selected quantitative and qualitative preset rows, with launch site fixed by actor.'}</span>
          </div>

          <div class="results-input-group-label">Modeled Geometry</div>
          <div class="result-item">
            <span class="label">Representative launch site:</span>
            <span class="value">${launchSiteLabel}</span>
          </div>
          <div class="result-item">
            <span class="label">Launch-site coordinates:</span>
            <span class="value">${launchSiteCoordinates}</span>
          </div>
          <div class="result-item">
            <span class="label">SBI availability at launch site:</span>
            <span class="value">${fmt(launchSiteSbiAvailabilityPercent, 2)}% of constellation</span>
          </div>
          <div class="result-item result-item--stacked">
            <span class="label">Launch-site note:</span>
            <span class="value">${launchSiteNote}</span>
          </div>
          <div class="result-item result-item--stacked">
            <span class="label">Reference space-layer geometry:</span>
            <span class="value">${spaceLayerGeometrySummary}</span>
          </div>
          <div class="result-item result-item--stacked">
            <span class="label">Reference seed orbit:</span>
            <span class="value">${referenceOrbitSummary}</span>
          </div>
          <div class="result-item result-item--stacked">
            <span class="label">Availability method:</span>
            <span class="value">${availabilitySummary}</span>
          </div>

          <div class="results-input-group-label">Strike Salvo</div>
          <div class="result-item">
            <span class="label">Ballistic missiles:</span>
            <span class="value">${params.nMissiles}</span>
          </div>
          <div class="result-item">
            <span class="label">Warheads per missile:</span>
            <span class="value">${params.mirvsPerMissile}</span>
          </div>
          <div class="result-item">
            <span class="label">Kilotons per warhead:</span>
            <span class="value">${fmt(kilotonsPerWarhead, 0)} kt</span>
          </div>
          <div class="result-item">
            <span class="label">Real warheads total:</span>
            <span class="value" style="color: var(--accent-red);">${realWarheads}</span>
          </div>
          <div class="result-item">
            <span class="label">Total objects:</span>
            <span class="value">${totalObjects}</span>
          </div>
          <div class="result-item">
            <span class="label">Decoys per missile:</span>
            <span class="value">${decoysPerMissile.toFixed(1)}</span>
          </div>

          <div class="results-input-group-label">Sensors and Detection</div>
          <div class="result-item">
            <span class="label">Detection and tracking probability:</span>
            <span class="value">${fmt(params.pDetectTrack, 2)}</span>
          </div>
          <div class="result-item">
            <span class="label">Warhead discrimination accuracy:</span>
            <span class="value">${fmt(params.pClassifyWarhead, 2)}</span>
          </div>
          <div class="result-item">
            <span class="label">Decoy false-alarm rate:</span>
            <span class="value">${fmt(params.pFalseAlarmDecoy, 2)}</span>
          </div>
          <div class="result-item">
            <span class="label">Discrimination note:</span>
            <span class="value">These global Blue sensing/tracking/discrimination assumptions are upstream of interceptor engagement. Midcourse outcomes are especially sensitive to warhead/decoy discrimination quality.</span>
          </div>

          <div class="results-input-group-label">Ground-Based Midcourse Interceptors</div>
          <div class="result-item">
            <span class="label">Existing ground-based midcourse interceptors in engagement range:</span>
            <span class="value">${params.nInventory}</span>
          </div>
          <div class="result-item">
            <span class="label">Ground-based midcourse interceptor kill probability:</span>
            <span class="value">${fmt(params.pkWarhead, 2)}</span>
          </div>
          <div class="result-item">
            <span class="label">Ground-based kinetic midcourse doctrine:</span>
            <span class="value">${midcourseDoctrineLine}</span>
          </div>

          <div class="results-input-group-label">Hypothetical Space-Based Interceptors</div>
          <div class="result-item">
            <span class="label">Hypothetical space-based kinetic boost interceptors in orbit:</span>
            <span class="value">${nSpaceBoostKinetic}</span>
          </div>
          <div class="result-item">
            <span class="label">Hypothetical space-based kinetic boost interceptor kill probability:</span>
            <span class="value">${fmt(pkSpaceBoostKinetic, 2)}</span>
          </div>
          <div class="result-item">
            <span class="label">Hypothetical space-based kinetic boost shots per detected/tracked boost-phase missile:</span>
            <span class="value">${boostKineticShotsPerTarget}</span>
          </div>
          <div class="result-item">
            <span class="label">Space-layer note:</span>
            <span class="value">The modeled space layer is limited to hypothetical boost-phase interceptors, with availability set by the actor-fixed launch site and the reference constellation geometry.</span>
          </div>

          <div class="results-input-group-label">Model Computation</div>
          <div class="result-item">
            <span class="label">Trials:</span>
            <span class="value">${params.nTrials}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
