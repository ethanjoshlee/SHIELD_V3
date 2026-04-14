/**
 * Global app state and default parameter values.
 */

export const DEFAULTS = {
  // --- Core scalar params ---
  nMissiles: 80,
  mirvsPerMissile: 5,
  kilotonsPerWarhead: 400,
  decoysPerWarhead: 2,
  decoysPerMissile: 15,
  pDetectTrack: 0.80,
  pClassifyWarhead: 0.80,
  pFalseAlarmDecoy: 0.20,
  doctrineMode: "barrage",
  shotsPerTarget: 2,
  maxShotsPerTarget: 4,
  midcourseKineticDoctrineMode: "barrage",
  midcourseKineticShotsPerTarget: 2,
  midcourseKineticMaxShotsPerTarget: 4,
  boostKineticShotsPerTarget: 2,
  pkWarhead: 0.60,
  pkDecoy: 0.50,
  nInventory: 44,
  nSpaceBoostKinetic: 0,
  pkSpaceBoostKinetic: 0.50,
  launchRegion: "default",
  asatSensingPenalty: 0,
  asatAvailabilityPenalty: 0,
  boostEvasionPenalty: 0.0,
  midcourseInterceptionPenalty: 0,
  nTrials: 2000,
  seed: null,

  // --- Multi-phase params (populated by presets or future UI) ---
  // constellationAltitudeKm: 1000,
  // regionalCoverageFactor: 1.0,
  // pDecoyBurnup: 0.7,
  // interceptors: { ... },    // per-type: { deployed, pk, costPerUnit_M, phase }
  // missileClasses: { ... },  // per-class: { count, mirvsPerMissile, decoysPerWarhead, yieldKt, boostEvasion }
  // countermeasures: { asatType },
};
