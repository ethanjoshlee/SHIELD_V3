/**
 * Core simulation engine — single-trial logic.
 *
 * Supports two modes:
 * 1. Legacy (flat params): single-phase engagement (backward compatible)
 * 2. Multi-phase (params.missileClasses + params.interceptors): Boost → Midcourse
 */

import { clamp01, bernoulli } from '../utils/rng.js';
import { generateTargets, generateMissiles, expandToWarheadsAndDecoys } from './scenarioBuilder.js';
import { classifyTarget, engageWithType } from './engagement.js';
import {
  applyBoostEvasion,
  sortByPriority,
} from './rules.js';
import { buildBoostScenario, discretizeBoostInventoryByType } from './scenarioLayer.js';

// ---------------------------------------------------------------------------
// Trial-level system degradation (common-mode reliability)
// ---------------------------------------------------------------------------

const BOOST_TYPES = ["boost_kinetic"];
function kilotonsPerWarheadFrom(params) {
  const raw = Number(params.kilotonsPerWarhead);
  if (!Number.isFinite(raw)) return 400;
  return Math.max(0, raw);
}

function doctrineParamsFrom(params) {
  return {
    doctrineMode: params.doctrineMode === 'sls' ? 'sls' : 'barrage',
    shotsPerTarget: Math.max(0, Math.floor(Number(params.shotsPerTarget) || 0)),
    maxShotsPerTarget: Math.max(0, Math.floor(Number(params.maxShotsPerTarget) || 0)),
    pReengage: 0,
  };
}

function midcourseKineticDoctrineParamsFrom(params) {
  const fallback = doctrineParamsFrom(params);
  const modeRaw = params.midcourseKineticDoctrineMode;
  const doctrineMode = modeRaw === 'sls' || modeRaw === 'barrage'
    ? modeRaw
    : fallback.doctrineMode;
  const shotsRaw = params.midcourseKineticShotsPerTarget;
  const maxShotsRaw = params.midcourseKineticMaxShotsPerTarget;

  return {
    doctrineMode,
    shotsPerTarget: Math.max(0, Math.floor(Number(shotsRaw ?? fallback.shotsPerTarget) || 0)),
    maxShotsPerTarget: Math.max(0, Math.floor(Number(maxShotsRaw ?? fallback.maxShotsPerTarget) || 0)),
    // In the simplified model, SLS midcourse engagements always re-engage
    // while inventory remains, so this is fixed rather than user-controlled.
    pReengage: 1,
  };
}

function boostBarrageDoctrineParamsFrom(params) {
  const fallback = doctrineParamsFrom(params);
  const shotsRaw = params.boostKineticShotsPerTarget;

  return {
    doctrineMode: 'barrage',
    shotsPerTarget: Math.max(0, Math.floor(Number(shotsRaw ?? fallback.shotsPerTarget) || 0)),
    maxShotsPerTarget: 0,
    pReengage: 0,
  };
}

function hasBoostEngagementCapacity(boostScenario) {
  return BOOST_TYPES.some((type) => {
    const continuous = boostScenario.effectiveBoostInterceptorsPostAsatByType[type] ?? 0;
    const pk = boostScenario.pkByType[type] ?? 0;
    return continuous > 0 && pk > 0;
  });
}

/**
 * Boost phase abstraction using doctrine-driven shot accounting.
 */
function runBoostPhaseOnMissiles({
  missiles,
  pDetectTrack,
  boostKineticDoctrineParams,
  boostKineticInventory,
  pkBoostKinetic,
  boostEvasionPenalty,
}) {
  let kineticInventory = boostKineticInventory;
  const survivingMissiles = [];

  let boostMissilesEngaged = 0;
  let boostMissilesKilled = 0;
  let boostWarheadsDestroyed = 0;
  let boostShotsFired = 0;

  for (const missile of missiles) {
    const detected = bernoulli(pDetectTrack);
    if (!detected) {
      survivingMissiles.push(missile);
      continue;
    }

    boostMissilesEngaged++;
    let killed = false;

    if (kineticInventory > 0 && pkBoostKinetic > 0) {
      let pk = pkBoostKinetic;
      pk = applyBoostEvasion(pk, missile.boostEvasion ?? 0);
      pk = applyBoostEvasion(pk, boostEvasionPenalty);

      const res = engageWithType(missile, pk, boostKineticDoctrineParams, kineticInventory);
      kineticInventory = res.inventoryRemaining;
      boostShotsFired += res.shotsFired;

      if (res.killed) {
        killed = true;
      }
    }

    if (killed) {
      boostMissilesKilled++;
      boostWarheadsDestroyed += missile.mirvsPerMissile;
    } else {
      survivingMissiles.push(missile);
    }
  }

  return {
    survivingMissiles,
    boostMissilesEngaged,
    boostMissilesKilled,
    boostWarheadsDestroyed,
    boostShotsFired,
    boostKineticInventoryRemaining: kineticInventory,
  };
}

// ---------------------------------------------------------------------------
// Legacy single-phase trial (backward compatible)
// ---------------------------------------------------------------------------

function runLegacyTrial(params) {
  const boostScenario = buildBoostScenario(params);
  const boostEnabled = hasBoostEngagementCapacity(boostScenario);
  const midcourseKineticDoctrine = midcourseKineticDoctrineParamsFrom(params);
  const boostKineticDoctrine = boostBarrageDoctrineParamsFrom(params);
  const kilotonsPerWarhead = kilotonsPerWarheadFrom(params);

  // Neutral compatibility path: preserve existing legacy behavior.
  if (!boostEnabled) {
    const { targets, realWarheads } = generateTargets(params);

    const pDetectTrack = params.pDetectTrack;
    const pkUnified = clamp01(params.pkWarhead);

    let inventory = params.nInventory;

    let penetratedRealWarheads = 0;
    let interceptedRealWarheads = 0;
    let detectedObjects = 0;
    let detectedRealWarheads = 0;
    let truePositives = 0;
    let falseNegatives = 0;
    let falsePositives = 0;
    let shotsTotal = 0;
    let shotsAtTrueWarheads = 0;
    let shotsAtDecoys = 0;

    for (const tgt of targets) {
      const detected = bernoulli(pDetectTrack);
      if (!detected) {
        if (tgt.kind === "warhead") penetratedRealWarheads += 1;
        continue;
      }

      detectedObjects += 1;
      if (tgt.kind === "warhead") detectedRealWarheads += 1;

      const classifiedAsWarhead = classifyTarget(tgt, params);

      if (tgt.kind === "warhead") {
        if (classifiedAsWarhead) truePositives += 1;
        else falseNegatives += 1;
      } else {
        if (classifiedAsWarhead) falsePositives += 1;
      }

      if (!classifiedAsWarhead) {
        if (tgt.kind === "warhead") penetratedRealWarheads += 1;
        continue;
      }

      const res = engageWithType(tgt, pkUnified, midcourseKineticDoctrine, inventory);
      inventory = res.inventoryRemaining;

      shotsTotal += res.shotsFired;
      if (tgt.kind === "warhead") shotsAtTrueWarheads += res.shotsFired;
      else shotsAtDecoys += res.shotsFired;

      if (tgt.kind === "warhead") {
        if (res.killed) interceptedRealWarheads += 1;
        else penetratedRealWarheads += 1;
      }
    }

    const deliveredKilotons = penetratedRealWarheads * kilotonsPerWarhead;

    return {
      realWarheads,
      penetratedRealWarheads,
      interceptedRealWarheads,
      detectedObjects,
      detectedRealWarheads,
      truePositives,
      falseNegatives,
      falsePositives,
      shotsTotal,
      shotsAtTrueWarheads,
      shotsAtDecoys,
      inventoryRemaining: inventory,
      // Multi-phase fields (zero for legacy)
      boostMissilesEngaged: 0,
      boostMissilesKilled: 0,
      boostWarheadsDestroyed: 0,
      midcourseWarheadsEngaged: 0,
      midcourseWarheadsKilled: interceptedRealWarheads,
      deliveredKilotons,
      ktDelivered: deliveredKilotons,
      architectureCost_M: 0,
    };
  }

  const asatSensingPenalty = params.asatSensingPenalty ?? 0;
  const pDetectTrack = clamp01(params.pDetectTrack * (1 - asatSensingPenalty));
  const pDetectTrackBoost = pDetectTrack;
  const pkUnified = clamp01(params.pkWarhead);

  // Continuous scenario values become discrete pools only at engagement resolution.
  const boostInventoryDiscrete = discretizeBoostInventoryByType(
    boostScenario.effectiveBoostInterceptorsPostAsatByType
  );
  const boostKineticInventory = boostInventoryDiscrete.boost_kinetic ?? 0;
  const boostPkKinetic = clamp01(boostScenario.pkByType.boost_kinetic);

  const missiles = [];
  for (let i = 0; i < params.nMissiles; i++) {
    missiles.push({
      id: `legacy_missile_${i}`,
      kind: "missile",
      mirvsPerMissile: params.mirvsPerMissile,
      boostEvasion: 0,
    });
  }

  const boostRes = runBoostPhaseOnMissiles({
    missiles,
    pDetectTrack: pDetectTrackBoost,
    boostKineticDoctrineParams: boostKineticDoctrine,
    boostKineticInventory,
    pkBoostKinetic: boostPkKinetic,
    boostEvasionPenalty: boostScenario.boostEvasionPenalty,
  });

  const postBoostParams =
    boostRes.survivingMissiles.length === params.nMissiles
      ? params
      : { ...params, nMissiles: boostRes.survivingMissiles.length };

  const { targets } = generateTargets(postBoostParams);
  const realWarheads = params.nMissiles * params.mirvsPerMissile;

  let inventory = params.nInventory;
  let penetratedRealWarheads = 0;
  let interceptedRealWarheads = 0;
  let detectedObjects = 0;
  let detectedRealWarheads = 0;
  let truePositives = 0;
  let falseNegatives = 0;
  let falsePositives = 0;
  let shotsTotal = boostRes.boostShotsFired;
  let shotsAtTrueWarheads = boostRes.boostShotsFired;
  let shotsAtDecoys = 0;

  for (const tgt of targets) {
    const detected = bernoulli(pDetectTrack);
    if (!detected) {
      if (tgt.kind === "warhead") penetratedRealWarheads += 1;
      continue;
    }

    detectedObjects += 1;
    if (tgt.kind === "warhead") detectedRealWarheads += 1;

    const classifiedAsWarhead = classifyTarget(tgt, params);

    if (tgt.kind === "warhead") {
      if (classifiedAsWarhead) truePositives += 1;
      else falseNegatives += 1;
    } else {
      if (classifiedAsWarhead) falsePositives += 1;
    }

    if (!classifiedAsWarhead) {
      if (tgt.kind === "warhead") penetratedRealWarheads += 1;
      continue;
    }

    const res = engageWithType(tgt, pkUnified, midcourseKineticDoctrine, inventory);
    inventory = res.inventoryRemaining;

    shotsTotal += res.shotsFired;
    if (tgt.kind === "warhead") shotsAtTrueWarheads += res.shotsFired;
    else shotsAtDecoys += res.shotsFired;

    if (tgt.kind === "warhead") {
      if (res.killed) interceptedRealWarheads += 1;
      else penetratedRealWarheads += 1;
    }
  }

  const deliveredKilotons = penetratedRealWarheads * kilotonsPerWarhead;

  return {
    realWarheads,
    penetratedRealWarheads,
    interceptedRealWarheads,
    detectedObjects,
    detectedRealWarheads,
    truePositives,
    falseNegatives,
    falsePositives,
    shotsTotal,
    shotsAtTrueWarheads,
    shotsAtDecoys,
    inventoryRemaining: inventory,
    boostMissilesEngaged: boostRes.boostMissilesEngaged,
    boostMissilesKilled: boostRes.boostMissilesKilled,
    boostWarheadsDestroyed: boostRes.boostWarheadsDestroyed,
    midcourseWarheadsEngaged: 0,
    midcourseWarheadsKilled: interceptedRealWarheads,
    deliveredKilotons,
    ktDelivered: deliveredKilotons,
    architectureCost_M: 0,
  };
}

// ---------------------------------------------------------------------------
// Multi-phase trial: Boost → Midcourse
// ---------------------------------------------------------------------------

function runMultiPhaseTrial(params) {
  // --- ASAT / counterspace effects (outcome-based penalties) ---
  const asatSensingPenalty = params.asatSensingPenalty ?? 0;
  const midcourseInterceptionPenalty = params.midcourseInterceptionPenalty ?? 0;
  // Boost and midcourse detection are degraded by space-layer sensing penalties.
  const pDetectTrack = clamp01(params.pDetectTrack * (1 - asatSensingPenalty));
  const pDetectTrackBoost = pDetectTrack;
  const boostScenario = buildBoostScenario(params);

  // --- Build per-type inventory and effective Pk ---
  const inventory = {};
  const effectivePk = {};
  const interceptorConfigs = params.interceptors;
  const boostInventoryContinuous = {};

  for (const [type, cfg] of Object.entries(interceptorConfigs)) {
    // Keep boost inventory continuous in scenario-layer values until resolution.
    if (cfg.phase === "boost") {
      const scenarioAvail = boostScenario.effectiveBoostInterceptorsPostAsatByType[type];
      boostInventoryContinuous[type] = scenarioAvail != null ? scenarioAvail : cfg.deployed;
      inventory[type] = 0;
    } else {
      inventory[type] = cfg.deployed;
    }

    // Compute effective Pk.
    const scenarioPk = boostScenario.pkByType[type];
    const basePk = cfg.phase === "boost" && scenarioPk != null ? scenarioPk : cfg.pk;
    effectivePk[type] = clamp01(basePk);
  }

  const midcourseKineticDoctrine = midcourseKineticDoctrineParamsFrom(params);
  const boostKineticDoctrine = boostBarrageDoctrineParamsFrom(params);
  const kilotonsPerWarhead = kilotonsPerWarheadFrom(params);

  // Stats
  let totalRealWarheads = 0;
  let penetratedRealWarheads = 0;
  let interceptedRealWarheads = 0;
  let detectedObjects = 0;
  let detectedRealWarheads = 0;
  let truePositives = 0;
  let falseNegatives = 0;
  let falsePositives = 0;
  let shotsTotal = 0;
  let shotsAtTrueWarheads = 0;
  let shotsAtDecoys = 0;

  let boostMissilesEngaged = 0;
  let boostMissilesKilled = 0;
  let boostWarheadsDestroyed = 0;
  let midcourseWarheadsEngaged = 0;
  let midcourseWarheadsKilled = 0;

  // ===================================================================
  // BOOST PHASE — target: whole missiles (pre-MIRV separation)
  // ===================================================================
  const missiles = generateMissiles(params);
  const survivingMissiles = [];

  // Get boost interceptor types sorted by cost
  const boostTypes = sortByPriority(
    Object.keys(interceptorConfigs).filter(t => interceptorConfigs[t].phase === "boost"),
    interceptorConfigs
  );
  const boostInventoryDiscrete = discretizeBoostInventoryByType(boostInventoryContinuous);

  for (const type of boostTypes) {
    inventory[type] = boostInventoryDiscrete[type] ?? 0;
  }

  for (const missile of missiles) {
    // Detection in boost phase
    const detected = bernoulli(pDetectTrackBoost);
    if (!detected) {
      survivingMissiles.push(missile);
      continue;
    }

    // Engage with boost interceptors (layered).
    let killed = false;
    boostMissilesEngaged++;

    for (const type of boostTypes) {
      if (inventory[type] <= 0) continue;

      // Pk adjusted for missile-level and scenario-level boost evasion penalties.
      let pk = applyBoostEvasion(effectivePk[type], missile.boostEvasion);
      pk = applyBoostEvasion(pk, boostScenario.boostEvasionPenalty);

      const res = engageWithType(missile, pk, boostKineticDoctrine, inventory[type]);
      inventory[type] = res.inventoryRemaining;
      shotsTotal += res.shotsFired;
      shotsAtTrueWarheads += res.shotsFired; // boost targets are always real missiles

      if (res.killed) {
        killed = true;
        break;
      }
    }

    if (killed) {
      boostMissilesKilled++;
      boostWarheadsDestroyed += missile.mirvsPerMissile;
    } else {
      survivingMissiles.push(missile);
    }
  }

  // ===================================================================
  // MIDCOURSE PHASE — target: individual warheads + decoys
  // ===================================================================
  const { targets: midcourseTargets } = expandToWarheadsAndDecoys(survivingMissiles);

  // Count total real warheads across all missiles (for stats)
  for (const m of missiles) {
    totalRealWarheads += m.mirvsPerMissile;
  }

  // Get midcourse interceptor types sorted by cost
  const midcourseTypes = sortByPriority(
    Object.keys(interceptorConfigs).filter(t => interceptorConfigs[t].phase === "midcourse"),
    interceptorConfigs
  );

  for (const tgt of midcourseTargets) {
    const detected = bernoulli(pDetectTrack);
    if (!detected) {
      if (tgt.kind === "warhead") penetratedRealWarheads++;
      continue;
    }

    detectedObjects++;
    if (tgt.kind === "warhead") detectedRealWarheads++;

    // Classification — midcourse discrimination degraded by midcourseInterceptionPenalty.
    const classifiedAsWarhead = classifyTarget(tgt, { ...params, pClassifyWarhead: clamp01(params.pClassifyWarhead * (1 - midcourseInterceptionPenalty)) });

    if (tgt.kind === "warhead") {
      if (classifiedAsWarhead) truePositives++;
      else falseNegatives++;
    } else {
      if (classifiedAsWarhead) falsePositives++;
    }

    if (!classifiedAsWarhead) {
      if (tgt.kind === "warhead") penetratedRealWarheads++;
      continue;
    }

    // Engage with midcourse interceptors (layered)
    let killed = false;
    if (tgt.kind === "warhead") midcourseWarheadsEngaged++;

    for (const type of midcourseTypes) {
      if (inventory[type] <= 0) continue;

      const res = engageWithType(tgt, effectivePk[type], midcourseKineticDoctrine, inventory[type]);
      inventory[type] = res.inventoryRemaining;
      shotsTotal += res.shotsFired;

      if (tgt.kind === "warhead") shotsAtTrueWarheads += res.shotsFired;
      else shotsAtDecoys += res.shotsFired;

      if (res.killed) {
        killed = true;
        break;
      }
    }

    if (tgt.kind === "warhead") {
      if (killed) {
        midcourseWarheadsKilled++;
        interceptedRealWarheads++;
      } else {
        penetratedRealWarheads++;
      }
    }
    // Decoys: if engaged and killed, wasted shots. If not killed, ignored.
  }

  // Simple first-order delivered-yield metric:
  // penetrating real warheads * user-selected average kilotons per warhead.
  const deliveredKilotons = penetratedRealWarheads * kilotonsPerWarhead;

  // --- Compute total inventory remaining ---
  let totalInventoryRemaining = 0;
  for (const type of Object.keys(inventory)) {
    totalInventoryRemaining += inventory[type];
  }

  return {
    realWarheads: totalRealWarheads,
    penetratedRealWarheads,
    interceptedRealWarheads,
    detectedObjects,
    detectedRealWarheads,
    truePositives,
    falseNegatives,
    falsePositives,
    shotsTotal,
    shotsAtTrueWarheads,
    shotsAtDecoys,
    inventoryRemaining: totalInventoryRemaining,
    boostMissilesEngaged,
    boostMissilesKilled,
    boostWarheadsDestroyed,
    midcourseWarheadsEngaged,
    midcourseWarheadsKilled,
    deliveredKilotons,
    ktDelivered: deliveredKilotons,
    architectureCost_M: 0, // computed in metrics, not per-trial
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run one trial. Automatically selects legacy vs multi-phase mode
 * based on whether params.missileClasses is defined.
 */
export function runOneTrial(params) {
  if (params.missileClasses) {
    return runMultiPhaseTrial(params);
  }
  return runLegacyTrial(params);
}
