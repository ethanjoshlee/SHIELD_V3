export const DEFAULT_BLUE_DEFENSE_PRESET = 'baseline';

export const BLUE_DEFENSE_PRESET_ORDER = [
  'conservative',
  'baseline',
  'optimistic',
  'custom',
];

export const BLUE_DEFENSE_PRESET_META = {
  conservative: {
    label: 'Conservative',
    title: 'Conservative Defense Profile',
    description: 'More cautious Blue sensing and interceptor-effectiveness assumptions.',
  },
  baseline: {
    label: 'Baseline',
    title: 'Baseline Defense Profile',
    description: 'Current representative Blue sensing and interceptor-effectiveness assumptions.',
  },
  optimistic: {
    label: 'Optimistic',
    title: 'Optimistic Defense Profile',
    description: 'More favorable Blue sensing and interceptor-effectiveness assumptions.',
  },
  custom: {
    label: 'Custom',
    title: 'Custom Defense Profile',
    description: 'Manual control over Blue sensing, interceptor effectiveness, doctrine, and inventory.',
  },
};

export const BLUE_DEFENSE_CONTROLLED_FIELDS = [
  'pDetectTrack',
  'pClassifyWarhead',
  'pFalseAlarmDecoy',
  'pkWarhead',
  'pkSpaceBoostKinetic',
];

export const BLUE_DEFENSE_ALWAYS_EDITABLE_FIELDS = [
  'nInventory',
  'midcourseKineticDoctrineMode',
  'midcourseKineticShotsPerTarget',
  'midcourseKineticMaxShotsPerTarget',
  'nSpaceBoostKinetic',
  'boostKineticShotsPerTarget',
];

export const BLUE_DEFENSE_PRESET_FIELDS = [
  ...BLUE_DEFENSE_CONTROLLED_FIELDS,
  ...BLUE_DEFENSE_ALWAYS_EDITABLE_FIELDS,
];

export const BLUE_DEFENSE_PRESETS = {
  US: {
    defaults: {
      nInventory: 44,
      midcourseKineticDoctrineMode: 'sls',
      midcourseKineticShotsPerTarget: 2,
      midcourseKineticMaxShotsPerTarget: 4,
      nSpaceBoostKinetic: 0,
      boostKineticShotsPerTarget: 2,
    },
    conservative: {
      pDetectTrack: 0.95,
      pClassifyWarhead: 0.74,
      pFalseAlarmDecoy: 0.28,
      pkWarhead: 0.48,
      pkSpaceBoostKinetic: 0.42,
    },
    baseline: {
      pDetectTrack: 0.98,
      pClassifyWarhead: 0.80,
      pFalseAlarmDecoy: 0.20,
      pkWarhead: 0.56,
      pkSpaceBoostKinetic: 0.50,
    },
    optimistic: {
      pDetectTrack: 0.99,
      pClassifyWarhead: 0.89,
      pFalseAlarmDecoy: 0.12,
      pkWarhead: 0.66,
      pkSpaceBoostKinetic: 0.60,
    },
  },

  Europe: {
    defaults: {
      nInventory: 44,
      midcourseKineticDoctrineMode: 'barrage',
      midcourseKineticShotsPerTarget: 2,
      midcourseKineticMaxShotsPerTarget: 4,
      nSpaceBoostKinetic: 0,
      boostKineticShotsPerTarget: 2,
    },
    conservative: {
      pDetectTrack: 0.75,
      pClassifyWarhead: 0.74,
      pFalseAlarmDecoy: 0.28,
      pkWarhead: 0.48,
      pkSpaceBoostKinetic: 0.42,
    },
    baseline: {
      pDetectTrack: 0.80,
      pClassifyWarhead: 0.80,
      pFalseAlarmDecoy: 0.20,
      pkWarhead: 0.60,
      pkSpaceBoostKinetic: 0.50,
    },
    optimistic: {
      pDetectTrack: 0.90,
      pClassifyWarhead: 0.89,
      pFalseAlarmDecoy: 0.12,
      pkWarhead: 0.66,
      pkSpaceBoostKinetic: 0.60,
    },
  },
};

function normalizePresetKey(presetKey) {
  if (presetKey === 'conservative' || presetKey === 'baseline' || presetKey === 'optimistic') {
    return presetKey;
  }
  return DEFAULT_BLUE_DEFENSE_PRESET;
}

export function getBlueDefensePresetMeta(presetKey) {
  return BLUE_DEFENSE_PRESET_META[presetKey] ?? BLUE_DEFENSE_PRESET_META[DEFAULT_BLUE_DEFENSE_PRESET];
}

export function getBlueDefensePreset(countryKey, presetKey = DEFAULT_BLUE_DEFENSE_PRESET) {
  const safePresetKey = normalizePresetKey(presetKey);
  const countryPresets = BLUE_DEFENSE_PRESETS[countryKey];
  if (!countryPresets) return null;
  return countryPresets[safePresetKey] ?? countryPresets[DEFAULT_BLUE_DEFENSE_PRESET] ?? null;
}

export function resolveBlueDefenseProfile(countryKey, presetKey = DEFAULT_BLUE_DEFENSE_PRESET, overrides = {}) {
  const countryPresets = BLUE_DEFENSE_PRESETS[countryKey] ?? {};
  const defaults = countryPresets.defaults ?? {};
  const preset = getBlueDefensePreset(countryKey, presetKey) ?? {};
  const midcourseDoctrineMode = defaults.midcourseKineticDoctrineMode ?? defaults.doctrineMode ?? 'barrage';
  const midcourseShotsPerTarget = defaults.midcourseKineticShotsPerTarget ?? defaults.shotsPerTarget ?? 2;
  const midcourseMaxShotsPerTarget = defaults.midcourseKineticMaxShotsPerTarget ?? defaults.maxShotsPerTarget ?? 4;

  return {
    ...defaults,
    doctrineMode: midcourseDoctrineMode,
    shotsPerTarget: midcourseShotsPerTarget,
    maxShotsPerTarget: midcourseMaxShotsPerTarget,
    ...preset,
    ...overrides,
  };
}
