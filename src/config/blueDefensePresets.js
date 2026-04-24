export const DEFAULT_BLUE_QUANTITATIVE_PRESET = 'medium';
export const DEFAULT_BLUE_QUALITATIVE_PRESET = 'baseline';

export const BLUE_QUANTITATIVE_PRESET_ORDER = [
  'small',
  'medium',
  'large',
];

export const BLUE_QUALITATIVE_PRESET_ORDER = [
  'conservative',
  'baseline',
  'optimistic',
];

export const BLUE_QUANTITATIVE_PRESET_META = {
  small: {
    label: 'Small',
    title: 'Small Quantitative Preset',
    description: 'Smaller deployed Blue interceptor quantities and constellation size.',
  },
  medium: {
    label: 'Medium',
    title: 'Medium Quantitative Preset',
    description: 'Mid-range deployed Blue interceptor quantities and constellation size.',
  },
  large: {
    label: 'Large',
    title: 'Large Quantitative Preset',
    description: 'Larger deployed Blue interceptor quantities and constellation size.',
  },
};

export const BLUE_QUALITATIVE_PRESET_META = {
  conservative: {
    label: 'Conservative',
    title: 'Conservative Qualitative Preset',
    description: 'More cautious Blue sensing, doctrine, and interceptor-effectiveness assumptions.',
  },
  baseline: {
    label: 'Baseline',
    title: 'Baseline Qualitative Preset',
    description: 'Representative Blue sensing, doctrine, and interceptor-effectiveness assumptions.',
  },
  optimistic: {
    label: 'Optimistic',
    title: 'Optimistic Qualitative Preset',
    description: 'More favorable Blue sensing, doctrine, and interceptor-effectiveness assumptions.',
  },
};

export const BLUE_DEFENSE_QUANTITATIVE_FIELDS = [
  'nInventory',
  'nSpaceBoostKinetic',
];

export const BLUE_DEFENSE_QUALITATIVE_FIELDS = [
  'pDetectTrack',
  'pClassifyWarhead',
  'pFalseAlarmDecoy',
  'pkWarhead',
  'pkSpaceBoostKinetic',
  'midcourseKineticDoctrineMode',
  'midcourseKineticShotsPerTarget',
  'midcourseKineticMaxShotsPerTarget',
  'boostKineticShotsPerTarget',
];

export const BLUE_DEFENSE_PRESET_FIELDS = [
  ...BLUE_DEFENSE_QUANTITATIVE_FIELDS,
  ...BLUE_DEFENSE_QUALITATIVE_FIELDS,
];

export const BLUE_DEFENSE_PRESETS = {
  US: {
    quantitative: {
      small: {
        nInventory: 44,
        nSpaceBoostKinetic: 1012,
      },
      medium: {
        nInventory: 64,
        nSpaceBoostKinetic: 2013,
      },
      large: {
        nInventory: 64,
        nSpaceBoostKinetic: 15385,
      },
    },
    qualitative: {
      conservative: {
        pDetectTrack: 0.95,
        pClassifyWarhead: 0.74,
        pFalseAlarmDecoy: 0.28,
        pkWarhead: 0.48,
        pkSpaceBoostKinetic: 0.42,
        midcourseKineticDoctrineMode: 'barrage',
        midcourseKineticShotsPerTarget: 2,
        midcourseKineticMaxShotsPerTarget: 2,
        boostKineticShotsPerTarget: 2,
      },
      baseline: {
        pDetectTrack: 0.98,
        pClassifyWarhead: 0.80,
        pFalseAlarmDecoy: 0.20,
        pkWarhead: 0.56,
        pkSpaceBoostKinetic: 0.50,
        midcourseKineticDoctrineMode: 'sls',
        midcourseKineticShotsPerTarget: 2,
        midcourseKineticMaxShotsPerTarget: 2,
        boostKineticShotsPerTarget: 2,
      },
      optimistic: {
        pDetectTrack: 0.99,
        pClassifyWarhead: 0.89,
        pFalseAlarmDecoy: 0.12,
        pkWarhead: 0.66,
        pkSpaceBoostKinetic: 0.60,
        midcourseKineticDoctrineMode: 'sls',
        midcourseKineticShotsPerTarget: 2,
        midcourseKineticMaxShotsPerTarget: 3,
        boostKineticShotsPerTarget: 3,
      },
    },
  },

  Europe: {
    quantitative: {
      small: {
        nInventory: 24,
        nSpaceBoostKinetic: 1012,
      },
      medium: {
        nInventory: 44,
        nSpaceBoostKinetic: 2013,
      },
      large: {
        nInventory: 64,
        nSpaceBoostKinetic: 15385,
      },
    },
    qualitative: {
      conservative: {
        pDetectTrack: 0.75,
        pClassifyWarhead: 0.74,
        pFalseAlarmDecoy: 0.28,
        pkWarhead: 0.48,
        pkSpaceBoostKinetic: 0.42,
        midcourseKineticDoctrineMode: 'barrage',
        midcourseKineticShotsPerTarget: 2,
        midcourseKineticMaxShotsPerTarget: 2,
        boostKineticShotsPerTarget: 2,
      },
      baseline: {
        pDetectTrack: 0.80,
        pClassifyWarhead: 0.80,
        pFalseAlarmDecoy: 0.20,
        pkWarhead: 0.60,
        pkSpaceBoostKinetic: 0.50,
        midcourseKineticDoctrineMode: 'barrage',
        midcourseKineticShotsPerTarget: 2,
        midcourseKineticMaxShotsPerTarget: 2,
        boostKineticShotsPerTarget: 2,
      },
      optimistic: {
        pDetectTrack: 0.90,
        pClassifyWarhead: 0.89,
        pFalseAlarmDecoy: 0.12,
        pkWarhead: 0.66,
        pkSpaceBoostKinetic: 0.60,
        midcourseKineticDoctrineMode: 'sls',
        midcourseKineticShotsPerTarget: 2,
        midcourseKineticMaxShotsPerTarget: 3,
        boostKineticShotsPerTarget: 2,
      },
    },
  },
};

function normalizeQuantitativePresetKey(presetKey) {
  if (presetKey === 'small' || presetKey === 'medium' || presetKey === 'large') {
    return presetKey;
  }
  return DEFAULT_BLUE_QUANTITATIVE_PRESET;
}

function normalizeQualitativePresetKey(presetKey) {
  if (presetKey === 'conservative' || presetKey === 'baseline' || presetKey === 'optimistic') {
    return presetKey;
  }
  return DEFAULT_BLUE_QUALITATIVE_PRESET;
}

export function getBlueQuantitativePresetMeta(presetKey) {
  const safePresetKey = normalizeQuantitativePresetKey(presetKey);
  return BLUE_QUANTITATIVE_PRESET_META[safePresetKey];
}

export function getBlueQualitativePresetMeta(presetKey) {
  const safePresetKey = normalizeQualitativePresetKey(presetKey);
  return BLUE_QUALITATIVE_PRESET_META[safePresetKey];
}

export function getBlueQuantitativePreset(countryKey, presetKey = DEFAULT_BLUE_QUANTITATIVE_PRESET) {
  const safePresetKey = normalizeQuantitativePresetKey(presetKey);
  const countryPresets = BLUE_DEFENSE_PRESETS[countryKey];
  if (!countryPresets) return null;
  return countryPresets.quantitative?.[safePresetKey] ?? null;
}

export function getBlueQualitativePreset(countryKey, presetKey = DEFAULT_BLUE_QUALITATIVE_PRESET) {
  const safePresetKey = normalizeQualitativePresetKey(presetKey);
  const countryPresets = BLUE_DEFENSE_PRESETS[countryKey];
  if (!countryPresets) return null;
  return countryPresets.qualitative?.[safePresetKey] ?? null;
}

export function getBlueDefenseProfileMeta(
  quantitativePresetKey = DEFAULT_BLUE_QUANTITATIVE_PRESET,
  qualitativePresetKey = DEFAULT_BLUE_QUALITATIVE_PRESET,
  mode = 'preset'
) {
  if (mode === 'custom') {
    return {
      title: 'Custom Defense Profile',
      description: 'Manual control over Blue quantitative and qualitative defense assumptions.',
    };
  }

  const quantitativeMeta = getBlueQuantitativePresetMeta(quantitativePresetKey);
  const qualitativeMeta = getBlueQualitativePresetMeta(qualitativePresetKey);
  return {
    title: 'Selected Defense Profile',
    description: `Quantitative preset: ${quantitativeMeta.label}. Qualitative preset: ${qualitativeMeta.label}.`,
  };
}

export function resolveBlueDefenseProfile(
  countryKey,
  {
    quantitativePresetKey = DEFAULT_BLUE_QUANTITATIVE_PRESET,
    qualitativePresetKey = DEFAULT_BLUE_QUALITATIVE_PRESET,
  } = {},
  overrides = {}
) {
  const quantitativePreset = getBlueQuantitativePreset(countryKey, quantitativePresetKey) ?? {};
  const qualitativePreset = getBlueQualitativePreset(countryKey, qualitativePresetKey) ?? {};
  const merged = {
    ...quantitativePreset,
    ...qualitativePreset,
    ...overrides,
  };

  const midcourseDoctrineMode = merged.midcourseKineticDoctrineMode ?? merged.doctrineMode ?? 'barrage';
  const midcourseShotsPerTarget = merged.midcourseKineticShotsPerTarget ?? merged.shotsPerTarget ?? 2;
  const midcourseMaxShotsPerTarget = merged.midcourseKineticMaxShotsPerTarget ?? merged.maxShotsPerTarget ?? 2;

  return {
    ...merged,
    doctrineMode: midcourseDoctrineMode,
    shotsPerTarget: midcourseShotsPerTarget,
    maxShotsPerTarget: midcourseMaxShotsPerTarget,
  };
}
