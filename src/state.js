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
  maxShotsPerTarget: 2,
  midcourseKineticDoctrineMode: "barrage",
  midcourseKineticShotsPerTarget: 2,
  midcourseKineticMaxShotsPerTarget: 2,
  boostKineticShotsPerTarget: 2,
  pkWarhead: 0.60,
  pkDecoy: 0.50,
  nInventory: 44,
  nSpaceBoostKinetic: 0,
  pkSpaceBoostKinetic: 0.50,
  bluePresetMode: "preset",
  blueQuantitativePreset: "medium",
  blueQualitativePreset: "baseline",
  launchSiteKey: null,
  redPresetMode: "preset",
  redQuantitativePreset: "medium",
  redQualitativePreset: "baseline",
  nTrials: 2000,
  seed: null,

  // --- Derived metadata used outside the core trial logic ---
  // interceptors: { ... },
};
