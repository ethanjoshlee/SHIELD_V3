/**
 * Core simulation engine — single-trial logic for the current strike model.
 *
 * The modeled engagement sequence is:
 * Detect -> Boost -> Midcourse
 */

import { clamp01, bernoulli } from '../utils/rng.js';
import { generateMissiles, expandToWarheadsAndDecoys } from './scenarioBuilder.js';
import { classifyTarget, engageWithType } from './engagement.js';
import { applyBoostEvasion } from './rules.js';
import { buildBoostScenario, discretizeBoostInventoryByType } from './scenarioLayer.js';

const BOOST_TYPES = ['boost_kinetic'];

function kilotonsPerWarheadFrom(params) {
  const raw = Number(params.kilotonsPerWarhead);
  if (!Number.isFinite(raw)) return 400;
  return Math.max(0, raw);
}

function doctrineParamsFrom(params) {
  return {
    doctrineMode: params.doctrineMode === 'sls' ? 'sls' : 'barrage',
    shotsPerTarget: Math.max(0, Math.floor(Number(params.shotsPerTarget) || 0)),
    maxShotsPerTarget: Math.max(1, Math.min(4, Math.floor(Number(params.maxShotsPerTarget) || 0))),
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
    maxShotsPerTarget: Math.max(1, Math.min(4, Math.floor(Number(maxShotsRaw ?? fallback.maxShotsPerTarget) || 0))),
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
      const pk = applyBoostEvasion(pkBoostKinetic, boostEvasionPenalty);
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

export function runOneTrial(params) {
  const asatSensingPenalty = params.asatSensingPenalty ?? 0;
  const midcourseInterceptionPenalty = params.midcourseInterceptionPenalty ?? 0;
  const pDetectTrack = clamp01(params.pDetectTrack * (1 - asatSensingPenalty));
  const boostScenario = buildBoostScenario(params);
  const midcourseKineticDoctrine = midcourseKineticDoctrineParamsFrom(params);
  const boostKineticDoctrine = boostBarrageDoctrineParamsFrom(params);
  const kilotonsPerWarhead = kilotonsPerWarheadFrom(params);
  const missiles = generateMissiles(params);
  const realWarheads = missiles.reduce((sum, missile) => sum + missile.mirvsPerMissile, 0);

  let boostRes = {
    survivingMissiles: missiles,
    boostMissilesEngaged: 0,
    boostMissilesKilled: 0,
    boostWarheadsDestroyed: 0,
    boostShotsFired: 0,
  };

  if (hasBoostEngagementCapacity(boostScenario)) {
    const boostInventoryDiscrete = discretizeBoostInventoryByType(
      boostScenario.effectiveBoostInterceptorsPostAsatByType
    );
    const boostKineticInventory = boostInventoryDiscrete.boost_kinetic ?? 0;
    const boostPkKinetic = clamp01(boostScenario.pkByType.boost_kinetic);

    boostRes = runBoostPhaseOnMissiles({
      missiles,
      pDetectTrack,
      boostKineticDoctrineParams: boostKineticDoctrine,
      boostKineticInventory,
      pkBoostKinetic: boostPkKinetic,
      boostEvasionPenalty: boostScenario.boostEvasionPenalty,
    });
  }

  const { targets: midcourseTargets } = expandToWarheadsAndDecoys(boostRes.survivingMissiles);
  const effectivePClassifyWarhead = clamp01(
    params.pClassifyWarhead * (1 - midcourseInterceptionPenalty)
  );
  const pkUnified = clamp01(params.pkWarhead);

  let inventory = Math.max(0, Math.floor(Number(params.nInventory) || 0));
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
  let midcourseWarheadsEngaged = 0;
  let midcourseWarheadsKilled = 0;

  for (const tgt of midcourseTargets) {
    const detected = bernoulli(pDetectTrack);
    if (!detected) {
      if (tgt.kind === 'warhead') penetratedRealWarheads += 1;
      continue;
    }

    detectedObjects += 1;
    if (tgt.kind === 'warhead') detectedRealWarheads += 1;

    const classifiedAsWarhead = classifyTarget(tgt, {
      ...params,
      pClassifyWarhead: effectivePClassifyWarhead,
    });

    if (tgt.kind === 'warhead') {
      if (classifiedAsWarhead) truePositives += 1;
      else falseNegatives += 1;
    } else if (classifiedAsWarhead) {
      falsePositives += 1;
    }

    if (!classifiedAsWarhead) {
      if (tgt.kind === 'warhead') penetratedRealWarheads += 1;
      continue;
    }

    let killed = false;

    if (inventory > 0) {
      const res = engageWithType(tgt, pkUnified, midcourseKineticDoctrine, inventory);
      inventory = res.inventoryRemaining;
      shotsTotal += res.shotsFired;

      if (tgt.kind === 'warhead') {
        shotsAtTrueWarheads += res.shotsFired;
      } else {
        shotsAtDecoys += res.shotsFired;
      }

      killed = res.killed;
    }

    if (tgt.kind === 'warhead') {
      midcourseWarheadsEngaged++;
      if (killed) {
        midcourseWarheadsKilled++;
        interceptedRealWarheads += 1;
      } else {
        penetratedRealWarheads += 1;
      }
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
    midcourseWarheadsEngaged,
    midcourseWarheadsKilled,
    deliveredKilotons,
    ktDelivered: deliveredKilotons,
    architectureCost_M: 0,
  };
}
