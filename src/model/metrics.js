/**
 * Results and analytics — aggregate trial outputs into summary statistics.
 */

import { mean, percentile } from '../utils/rng.js';

/**
 * Compute the total architecture cost (deterministic, not per-trial).
 * @param {Object} params — must have params.interceptors
 * @returns {number} total cost in $M
 */
export function computeArchitectureCost(params) {
  if (!params.interceptors) return 0;
  let totalCost_M = 0;
  for (const cfg of Object.values(params.interceptors)) {
    totalCost_M += cfg.deployed * (cfg.costPerUnit_M ?? 0);
  }
  return totalCost_M;
}

/**
 * Compute summary statistics from Monte Carlo trial arrays.
 */
export function computeSummary(arrays, realWarheadsConst, params = {}) {
  const {
    penReal, intReal,
    detObj, detReal,
    tp, fn, fp,
    shotsTot, shotsW, shotsD,
    invLeft,
    boostMissilesKilled = [],
    boostWarheadsDestroyed = [],
    midcourseWarheadsKilled = [],
    deliveredKilotons = [],
    ktDelivered = [],
  } = arrays;

  const summary = {
    realWarheads: realWarheadsConst,

    meanPenReal: mean(penReal),
    p10PenReal: percentile(penReal, 10),
    medianPenReal: percentile(penReal, 50),
    p90PenReal: percentile(penReal, 90),

    meanIntReal: mean(intReal),

    meanDetObjects: mean(detObj),
    meanDetReal: mean(detReal),

    meanTP: mean(tp),
    meanFN: mean(fn),
    meanFP: mean(fp),

    meanShotsTotal: mean(shotsTot),
    meanShotsWarheads: mean(shotsW),
    meanShotsDecoys: mean(shotsD),

    meanInventoryRemaining: mean(invLeft),

    meanPenRateReal:
      realWarheadsConst > 0 ? mean(penReal) / realWarheadsConst : 0,
  };

  // Per-phase stats for the modeled boost and midcourse engagement chain.
  if (boostMissilesKilled.length > 0) {
    summary.meanBoostMissilesKilled = mean(boostMissilesKilled);
    summary.meanBoostWarheadsDestroyed = mean(boostWarheadsDestroyed);
    summary.meanMidcourseWarheadsKilled = mean(midcourseWarheadsKilled);
  }

  // Delivered yield stats (kilotons)
  const deliveredSeries = deliveredKilotons.length > 0 ? deliveredKilotons : ktDelivered;
  if (deliveredSeries.length > 0) {
    summary.meanDeliveredKilotons = mean(deliveredSeries);
    summary.p10DeliveredKilotons = percentile(deliveredSeries, 10);
    summary.medianDeliveredKilotons = percentile(deliveredSeries, 50);
    summary.p90DeliveredKilotons = percentile(deliveredSeries, 90);

    // Backward compatibility aliases
    summary.meanKtDelivered = summary.meanDeliveredKilotons;
    summary.p10KtDelivered = summary.p10DeliveredKilotons;
    summary.medianKtDelivered = summary.medianDeliveredKilotons;
    summary.p90KtDelivered = summary.p90DeliveredKilotons;
  }

  // Architecture cost
  summary.architectureCost_M = computeArchitectureCost(params);
  summary.architectureCost_B = summary.architectureCost_M / 1000;

  return summary;
}
