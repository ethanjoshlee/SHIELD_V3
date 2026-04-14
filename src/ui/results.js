/**
 * Results panel rendering and interactions for dashboard + final results screen.
 */

import { fmt } from '../utils/format.js';
import { renderHistogramHTML } from './charts.js';
import { LAUNCH_REGION_PRESETS } from '../config/launchRegions.js';
import { DELIVERED_KILOTONS_BENCHMARKS } from './deliveredKilotonsBenchmarks.js';

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
  const midcourseKineticMaxShotsPerTarget = params.midcourseKineticMaxShotsPerTarget ?? params.maxShotsPerTarget ?? 4;
  const midcourseDoctrineLine = formatDoctrineLine(
    midcourseKineticDoctrineMode,
    midcourseKineticShotsPerTarget,
    midcourseKineticMaxShotsPerTarget
  );

  const boostKineticShotsPerTarget = params.boostKineticShotsPerTarget ?? params.shotsPerTarget ?? 2;

  const nSpaceBoostKinetic = params.nSpaceBoostKinetic ?? 0;
  const pkSpaceBoostKinetic = params.pkSpaceBoostKinetic ?? 0;
  const launchRegion = params.launchRegion ?? 'default';
  const asatSensingPenalty = params.asatSensingPenalty ?? 0;
  const asatAvailabilityPenalty = params.asatAvailabilityPenalty ?? 0;
  const boostEvasionPenalty = params.boostEvasionPenalty ?? 0;
  const midcourseInterceptionPenalty = params.midcourseInterceptionPenalty ?? 0;
  const meanDeliveredKilotons = s.meanDeliveredKilotons ?? s.meanKtDelivered ?? 0;
  const p10DeliveredKilotons = s.p10DeliveredKilotons ?? s.p10KtDelivered ?? 0;
  const medianDeliveredKilotons = s.medianDeliveredKilotons ?? s.medianKtDelivered ?? 0;
  const p90DeliveredKilotons = s.p90DeliveredKilotons ?? s.p90KtDelivered ?? 0;
  const architectureCostB = s.architectureCost_B ?? ((s.architectureCost_M ?? 0) / 1000);
  const hasDistributionData = !!(result.penReal && result.penReal.length > 0);
  const defaultDistTitle = 'Delivered Kilotons';

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
        <h3>Architecture Cost</h3>
        <div class="results-grid">
          <div class="result-item">
            <span class="label">Estimated interceptor architecture cost:</span>
            <span class="value">$${fmt(architectureCostB, 1)}B</span>
          </div>
        </div>
      </div>

      <div class="wizard-tab-panel" data-tab-panel="results-inputs">
        <h3>Inputs</h3>
        <div class="results-grid">
          <div class="results-input-group-label results-input-group-label--first">Strike Salvo</div>
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
            <span class="label">Launch region preset:</span>
            <span class="value">${LAUNCH_REGION_PRESETS[launchRegion]?.label ?? launchRegion}</span>
          </div>
          <div class="result-item">
            <span class="label">Real warheads total:</span>
            <span class="value" style="color: var(--accent-red);">${realWarheads}</span>
          </div>
          <div class="result-item">
            <span class="label">Total objects:</span>
            <span class="value">${totalObjects}</span>
          </div>

          <div class="results-input-group-label">Penetration Aids</div>
          <div class="result-item">
            <span class="label">Decoys per missile:</span>
            <span class="value">${decoysPerMissile.toFixed(1)}</span>
          </div>
          <div class="result-item">
            <span class="label">Boost-phase survivability and evasion:</span>
            <span class="value">${fmt(boostEvasionPenalty, 2)}</span>
          </div>
          <div class="result-item">
            <span class="label">Midcourse discrimination and allocation penalty:</span>
            <span class="value">${fmt(midcourseInterceptionPenalty, 2)}</span>
          </div>

          <div class="results-input-group-label">Counterspace Attack</div>
          <div class="result-item">
            <span class="label">Space-layer sensing and cueing degradation:</span>
            <span class="value">${fmt(asatSensingPenalty, 2)}</span>
          </div>
          <div class="result-item">
            <span class="label">Space-based interceptor availability degradation:</span>
            <span class="value">${fmt(asatAvailabilityPenalty, 2)}</span>
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
          <div class="result-item">
            <span class="label">Effective boost/midcourse detection (base × sensing penalty):</span>
            <span class="value">${fmt(params.pDetectTrack * (1 - asatSensingPenalty), 2)}</span>
          </div>
          <div class="result-item">
            <span class="label">Detection note:</span>
            <span class="value">Counterspace sensing degradation is applied to the boost and midcourse portions of the model. Ground-based midcourse interceptors remain in the model, but the removed terminal layer is no longer simulated.</span>
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
            <span class="label">Space-based interceptor availability (after ASAT degradation):</span>
            <span class="value">${fmt(1 - asatAvailabilityPenalty, 2)}</span>
          </div>
          <div class="result-item">
            <span class="label">Space-layer note:</span>
            <span class="value">The model now includes only the hypothetical boost-phase space layer. Hypothetical midcourse space interceptors and hypothetical terminal interceptors have been removed from the simulation.</span>
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
