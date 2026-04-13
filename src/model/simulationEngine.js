/**
 * Core simulation engine — single-trial logic.
 *
 * Supports two modes:
 * 1. Legacy (flat params): single-phase engagement (backward compatible)
 * 2. Multi-phase (params.missileClasses + params.interceptors): Boost → Midcourse → Terminal
 */

import { clamp01, bernoulli } from '../utils/rng.js';
import { generateTargets, generateMissiles, expandToWarheadsAndDecoys } from './scenarioBuilder.js';
import { classifyTarget, engageWithType } from './engagement.js';
import {
  applyBoostEvasion,
  isSpaceBased,
  sortByPriority,
} from './rules.js';
import { buildBoostScenario, discretizeBoostInventoryByType } from './scenarioLayer.js';

// ---------------------------------------------------------------------------
// Trial-level system degradation (common-mode reliability)
// ---------------------------------------------------------------------------



const BOOST_TYPES = ["boost_kinetic", "boost_laser"];
// Midcourse space-based interceptors have broader engagement geometry
// and longer engagement windows than boost-phase interceptors, but
// orbital mechanics still constrain which satellites can reach a
// given intercept opportunity. This multiplier approximates the
// fraction of deployed midcourse space interceptors that are
// effectively available for engagement.
export const MIDCOURSE_SPACE_AVAILABILITY = 0.30;

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
    pReengage: clamp01(Number(params.pReengage) || 0),
  };
}

function kineticDoctrineParamsFrom(params, familyPrefix) {
  const fallback = doctrineParamsFrom(params);
  const modeRaw = params[`${familyPrefix}DoctrineMode`];
  const doctrineMode = modeRaw === 'sls' || modeRaw === 'barrage'
    ? modeRaw
    : fallback.doctrineMode;
  const shotsRaw = params[`${familyPrefix}ShotsPerTarget`];
  const maxShotsRaw = params[`${familyPrefix}MaxShotsPerTarget`];
  const pReengageRaw = params[`${familyPrefix}PReengage`];

  return {
    doctrineMode,
    shotsPerTarget: Math.max(0, Math.floor(Number(shotsRaw ?? fallback.shotsPerTarget) || 0)),
    maxShotsPerTarget: Math.max(0, Math.floor(Number(maxShotsRaw ?? fallback.maxShotsPerTarget) || 0)),
    pReengage: clamp01(Number(pReengageRaw ?? fallback.pReengage) || 0),
  };
}

function directedTargetsPerPlatformFrom(params) {
  const raw = Math.floor(Number(params.boostDirectedTargetsPerPlatform) || 2);
  return Math.min(9, Math.max(1, raw));
}

function midcourseDirectedTargetsPerPlatformFrom(params) {
  const raw = Math.floor(Number(params.midcourseDirectedTargetsPerPlatform) || 3);
  return Math.min(8, Math.max(1, raw));
}

function midcourseSpaceAvailabilityMultiplierFrom(params) {
  const raw = Number(params.midcourseSpaceAvailabilityMultiplier);
  if (!Number.isFinite(raw)) return MIDCOURSE_SPACE_AVAILABILITY;
  return Math.max(0.15, Math.min(0.45, raw));
}

function isBoostDirectedType(type) {
  return type === 'boost_laser';
}

function isBoostKineticType(type) {
  return type.startsWith('boost_') && !isBoostDirectedType(type);
}

function hasBoostEngagementCapacity(boostScenario) {
  return BOOST_TYPES.some((type) => {
    const continuous = boostScenario.effectiveBoostInterceptorsPostAsatByType[type] ?? 0;
    const pk = boostScenario.pkByType[type] ?? 0;
    return continuous > 0 && pk > 0;
  });
}

/**
 * Boost phase abstraction:
 * - kinetic boost uses doctrine-driven shot accounting
 * - directed-energy boost uses platform-capacity opportunities
 *
 * Note: this pass resolves kinetic before directed-energy as a temporary
 * modeling convention for implementation clarity, not a realism claim.
 */
function runBoostPhaseOnMissiles({
  missiles,
  pDetectTrack,
  boostKineticDoctrineParams,
  boostKineticInventory,
  boostDirectedOpportunityPool,
  pkBoostKinetic,
  pkBoostDirected,
  boostEvasionPenalty,
}) {
  let kineticInventory = boostKineticInventory;
  let directedOpportunityPool = boostDirectedOpportunityPool;
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

    if (!killed && directedOpportunityPool > 0 && pkBoostDirected > 0) {
      // Temporary modeling convention in this pass:
      // apply directed-energy after kinetic for each detected missile.
      directedOpportunityPool -= 1;
      boostShotsFired += 1;

      let pk = pkBoostDirected;
      pk = applyBoostEvasion(pk, missile.boostEvasion ?? 0);
      pk = applyBoostEvasion(pk, boostEvasionPenalty);
      if (bernoulli(pk)) killed = true;
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
    boostDirectedOpportunityPoolRemaining: directedOpportunityPool,
  };
}

// ---------------------------------------------------------------------------
// Legacy single-phase trial (backward compatible)
// ---------------------------------------------------------------------------

function runLegacyTrial(params) {
  const boostScenario = buildBoostScenario(params);
  const boostEnabled = hasBoostEngagementCapacity(boostScenario);
  const midcourseKineticDoctrine = kineticDoctrineParamsFrom(params, 'midcourseKinetic');
  const boostKineticDoctrine = kineticDoctrineParamsFrom(params, 'boostKinetic');
  const boostDirectedTargetsPerPlatform = directedTargetsPerPlatformFrom(params);
  const midcourseSpaceAvailabilityMultiplier = midcourseSpaceAvailabilityMultiplierFrom(params);
  const kilotonsPerWarhead = kilotonsPerWarheadFrom(params);
  const deployedMidcourseSpaceInterceptors =
    (params.nMidcourseSpaceKinetic ?? params.interceptors?.midcourse_kinetic?.deployed ?? 0) +
    (params.nMidcourseSpaceLaser ?? params.interceptors?.midcourse_laser?.deployed ?? 0);
  const effectiveMidcourseSpaceInterceptorsAvailable =
    Math.max(
      0,
      Math.floor(
        (params.nMidcourseSpaceKinetic ?? params.interceptors?.midcourse_kinetic?.deployed ?? 0) *
          midcourseSpaceAvailabilityMultiplier *
          (boostScenario.availabilityMultiplier ?? 1)
      )
    ) +
    Math.max(
      0,
      Math.floor(
        (params.nMidcourseSpaceLaser ?? params.interceptors?.midcourse_laser?.deployed ?? 0) *
          midcourseSpaceAvailabilityMultiplier *
          (boostScenario.availabilityMultiplier ?? 1)
      )
    );

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
      terminalWarheadsEngaged: 0,
      terminalWarheadsKilled: 0,
      deliveredKilotons,
      ktDelivered: deliveredKilotons,
      architectureCost_M: 0,
      deployedMidcourseSpaceInterceptors,
      effectiveMidcourseSpaceInterceptorsAvailable,
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
  const boostDirectedPlatforms = boostInventoryDiscrete.boost_laser ?? 0;
  const boostDirectedOpportunityPool = boostDirectedPlatforms * boostDirectedTargetsPerPlatform;
  const boostPkKinetic = clamp01(boostScenario.pkByType.boost_kinetic);
  const boostPkDirected = clamp01(boostScenario.pkByType.boost_laser);

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
    boostDirectedOpportunityPool,
    pkBoostKinetic: boostPkKinetic,
    pkBoostDirected: boostPkDirected,
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
    terminalWarheadsEngaged: 0,
    terminalWarheadsKilled: 0,
    deliveredKilotons,
    ktDelivered: deliveredKilotons,
    architectureCost_M: 0,
    deployedMidcourseSpaceInterceptors,
    effectiveMidcourseSpaceInterceptorsAvailable,
  };
}

// ---------------------------------------------------------------------------
// Multi-phase trial: Boost → Midcourse → Terminal
// ---------------------------------------------------------------------------

function runMultiPhaseTrial(params) {
  // --- ASAT / counterspace effects (outcome-based penalties) ---
  const asatSensingPenalty = params.asatSensingPenalty ?? 0;
  const asatPkPenalty = params.asatPkPenalty ?? 0;
  const midcourseInterceptionPenalty = params.midcourseInterceptionPenalty ?? 0;
  const terminalInterceptionPenalty = params.terminalInterceptionPenalty ?? 0;
  // Boost and midcourse detection degraded by sensing penalty; terminal unaffected (ground-based radars).
  const pDetectTrack = clamp01(params.pDetectTrack * (1 - asatSensingPenalty));
  const pDetectTrackBoost = pDetectTrack;
  const pDetectTrackTerminal = params.pDetectTrack;
  const boostScenario = buildBoostScenario(params);
  const boostDirectedTargetsPerPlatform = directedTargetsPerPlatformFrom(params);
  const midcourseDirectedTargetsPerPlatform = midcourseDirectedTargetsPerPlatformFrom(params);
  const midcourseSpaceAvailabilityMultiplier = midcourseSpaceAvailabilityMultiplierFrom(params);

  // --- Build per-type inventory and effective Pk ---
  const inventory = {};
  const effectivePk = {};
  const interceptorConfigs = params.interceptors;
  const boostInventoryContinuous = {};
  let deployedMidcourseSpaceInterceptors = 0;
  let effectiveMidcourseSpaceInterceptorsAvailable = 0;

  for (const [type, cfg] of Object.entries(interceptorConfigs)) {
    // Keep boost inventory continuous in scenario-layer values until resolution.
    if (cfg.phase === "boost") {
      const scenarioAvail = boostScenario.effectiveBoostInterceptorsPostAsatByType[type];
      boostInventoryContinuous[type] = scenarioAvail != null ? scenarioAvail : cfg.deployed;
      inventory[type] = 0;
    } else if (cfg.phase === "midcourse" && isSpaceBased(type)) {
      const deployed = Math.max(0, Number(cfg.deployed) || 0);
      deployedMidcourseSpaceInterceptors += deployed;
      const effectiveMidcourseInventory =
        deployed *
        midcourseSpaceAvailabilityMultiplier *
        (boostScenario.availabilityMultiplier ?? 1);
      // Convert fractional availability to a deterministic platform count before
      // any directed-energy opportunity expansion.
      const effectiveMidcoursePlatforms = Math.max(0, Math.floor(effectiveMidcourseInventory));
      effectiveMidcourseSpaceInterceptorsAvailable += effectiveMidcoursePlatforms;
      if (type === "midcourse_laser") {
        inventory[type] =
          effectiveMidcoursePlatforms * midcourseDirectedTargetsPerPlatform;
      } else {
        inventory[type] = effectiveMidcoursePlatforms;
      }
    } else {
      inventory[type] = cfg.deployed;
    }

    // Compute effective Pk.
    const scenarioPk = boostScenario.pkByType[type];
    const basePk = cfg.phase === "boost" && scenarioPk != null ? scenarioPk : cfg.pk;
    let pk = basePk;
    if (isSpaceBased(type) && cfg.phase !== "boost") {
      pk = clamp01(pk * (1 - asatPkPenalty));
    }
    if (cfg.phase === "terminal") {
      pk = clamp01(pk * (1 - terminalInterceptionPenalty));
    }
    effectivePk[type] = clamp01(pk);
  }

  const midcourseKineticDoctrine = kineticDoctrineParamsFrom(params, 'midcourseKinetic');
  const boostKineticDoctrine = kineticDoctrineParamsFrom(params, 'boostKinetic');
  const terminalShotsPerTarget = Math.max(1, params.terminalShotsPerTarget ?? 2);
  const terminalDoctrine = {
    doctrineMode: 'barrage',
    shotsPerTarget: terminalShotsPerTarget,
    maxShotsPerTarget: terminalShotsPerTarget, // unused in barrage mode
    pReengage: 0,                              // unused in barrage mode
  };
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
  let terminalWarheadsEngaged = 0;
  let terminalWarheadsKilled = 0;

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
  const boostKineticTypes = boostTypes.filter(isBoostKineticType);
  const boostDirectedTypes = boostTypes.filter(isBoostDirectedType);
  const boostInventoryDiscrete = discretizeBoostInventoryByType(boostInventoryContinuous);

  for (const type of boostKineticTypes) {
    inventory[type] = boostInventoryDiscrete[type] ?? 0;
  }
  for (const type of boostDirectedTypes) {
    const discretePlatforms = boostInventoryDiscrete[type] ?? 0;
    inventory[type] = discretePlatforms * boostDirectedTargetsPerPlatform;
  }

  for (const missile of missiles) {
    // Detection in boost phase
    const detected = bernoulli(pDetectTrackBoost);
    if (!detected) {
      survivingMissiles.push(missile);
      continue;
    }

    // Engage with boost interceptors (layered).
    // In this pass, kinetic resolution happens before directed-energy by convention.
    // This is a temporary modeling convention, not a realism claim.
    let killed = false;
    boostMissilesEngaged++;

    for (const type of boostKineticTypes) {
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

    if (!killed) {
      for (const type of boostDirectedTypes) {
        if ((inventory[type] ?? 0) <= 0) continue;

        inventory[type] -= 1;
        shotsTotal += 1;
        shotsAtTrueWarheads += 1; // boost targets are always real missiles

        let pk = applyBoostEvasion(effectivePk[type], missile.boostEvasion);
        pk = applyBoostEvasion(pk, boostScenario.boostEvasionPenalty);

        if (bernoulli(pk)) {
          killed = true;
          break;
        }
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

  const survivingWarheads = []; // warheads that survive midcourse (for terminal)

  for (const tgt of midcourseTargets) {
    const detected = bernoulli(pDetectTrack);
    if (!detected) {
      if (tgt.kind === "warhead") survivingWarheads.push(tgt);
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
      if (tgt.kind === "warhead") survivingWarheads.push(tgt);
      continue;
    }

    // Engage with midcourse interceptors (layered)
    let killed = false;
    if (tgt.kind === "warhead") midcourseWarheadsEngaged++;

    for (const type of midcourseTypes) {
      if (inventory[type] <= 0) continue;

      if (type === "midcourse_laser") {
        // Midcourse directed-energy layers are modeled as opportunity budgets,
        // mirroring boost directed-energy accounting (one opportunity consumed
        // per engagement attempt).
        inventory[type] -= 1;
        shotsTotal += 1;
        if (tgt.kind === "warhead") shotsAtTrueWarheads += 1;
        else shotsAtDecoys += 1;

        if (bernoulli(effectivePk[type])) {
          killed = true;
          break;
        }
      } else {
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
    }

    if (tgt.kind === "warhead") {
      if (killed) {
        midcourseWarheadsKilled++;
        interceptedRealWarheads++;
      } else {
        survivingWarheads.push(tgt);
      }
    }
    // Decoys: if engaged and killed, wasted shots. If not killed, ignored.
  }

  // ===================================================================
  // TERMINAL PHASE — warheads only (decoys mostly burn up during reentry)
  // ===================================================================
  // Get terminal interceptor types sorted by cost
  const terminalTypes = sortByPriority(
    Object.keys(interceptorConfigs).filter(t => interceptorConfigs[t].phase === "terminal"),
    interceptorConfigs
  );

  for (const wh of survivingWarheads) {
    // Terminal detection uses ground-based radars; unaffected by space-layer ASAT.
    const detected = bernoulli(pDetectTrackTerminal);
    if (!detected) {
      penetratedRealWarheads++;
      continue;
    }

    // In terminal phase, better discrimination (fewer decoys)
    // Since survivingWarheads only contains warheads, no classification needed here

    terminalWarheadsEngaged++;

    let killed = false;
    for (const type of terminalTypes) {
      if (inventory[type] <= 0) continue;

      const res = engageWithType(wh, effectivePk[type], terminalDoctrine, inventory[type]);
      inventory[type] = res.inventoryRemaining;
      shotsTotal += res.shotsFired;
      shotsAtTrueWarheads += res.shotsFired;

      if (res.killed) {
        killed = true;
        break;
      }
    }

    if (killed) {
      terminalWarheadsKilled++;
      interceptedRealWarheads++;
    } else {
      penetratedRealWarheads++;
    }
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
    terminalWarheadsEngaged,
    terminalWarheadsKilled,
    deliveredKilotons,
    ktDelivered: deliveredKilotons,
    architectureCost_M: 0, // computed in metrics, not per-trial
    deployedMidcourseSpaceInterceptors,
    effectiveMidcourseSpaceInterceptorsAvailable,
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
