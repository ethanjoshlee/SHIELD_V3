export const DEFAULT_RED_QUANTITATIVE_PRESET = 'medium';
export const DEFAULT_RED_QUALITATIVE_PRESET = 'baseline';

export const RED_QUANTITATIVE_PRESET_ORDER = [
  'small',
  'medium',
  'large',
];

export const RED_QUALITATIVE_PRESET_ORDER = [
  'conservative',
  'baseline',
  'optimistic',
];

export const RED_QUANTITATIVE_PRESET_META = {
  small: {
    label: 'Small',
    title: 'Small Quantitative Preset',
    description: 'Smaller modeled strike size and missile loading.',
  },
  medium: {
    label: 'Medium',
    title: 'Medium Quantitative Preset',
    description: 'Mid-range modeled strike size and missile loading.',
  },
  large: {
    label: 'Large',
    title: 'Large Quantitative Preset',
    description: 'Larger modeled strike size and missile loading.',
  },
};

export const RED_QUALITATIVE_PRESET_META = {
  conservative: {
    label: 'Conservative',
    title: 'Conservative Qualitative Preset',
    description: 'Lower-yield and lighter countermeasure assumptions.',
  },
  baseline: {
    label: 'Baseline',
    title: 'Baseline Qualitative Preset',
    description: 'Representative warhead-yield and decoy assumptions.',
  },
  optimistic: {
    label: 'Optimistic',
    title: 'Optimistic Qualitative Preset',
    description: 'Higher-yield and heavier decoy assumptions.',
  },
};

export const RED_ATTACK_QUANTITATIVE_FIELDS = [
  'nMissiles',
  'mirvsPerMissile',
];

export const RED_ATTACK_QUALITATIVE_FIELDS = [
  'decoysPerMissile',
  'kilotonsPerWarhead',
];

export const RED_ATTACK_PRESET_FIELDS = [
  ...RED_ATTACK_QUANTITATIVE_FIELDS,
  ...RED_ATTACK_QUALITATIVE_FIELDS,
  'launchSiteKey',
];

export const RED_ATTACK_PRESETS = {
  DPRK: {
    defaults: {
      launchSiteKey: 'sinpung_dong',
    },
    quantitative: {
      small: {
        nMissiles: 5,
        mirvsPerMissile: 1,
      },
      medium: {
        nMissiles: 10,
        mirvsPerMissile: 1,
      },
      large: {
        nMissiles: 20,
        mirvsPerMissile: 2,
      },
    },
    qualitative: {
      conservative: {
        decoysPerMissile: 0,
        kilotonsPerWarhead: 10,
      },
      baseline: {
        decoysPerMissile: 1,
        kilotonsPerWarhead: 20,
      },
      optimistic: {
        decoysPerMissile: 3,
        kilotonsPerWarhead: 120,
      },
    },
  },

  Iran: {
    defaults: {
      launchSiteKey: 'shahroud',
    },
    quantitative: {
      small: {
        nMissiles: 20,
        mirvsPerMissile: 1,
      },
      medium: {
        nMissiles: 60,
        mirvsPerMissile: 1,
      },
      large: {
        nMissiles: 120,
        mirvsPerMissile: 2,
      },
    },
    qualitative: {
      conservative: {
        decoysPerMissile: 0,
        kilotonsPerWarhead: 40,
      },
      baseline: {
        decoysPerMissile: 1,
        kilotonsPerWarhead: 60,
      },
      optimistic: {
        decoysPerMissile: 3,
        kilotonsPerWarhead: 100,
      },
    },
  },

  China: {
    defaults: {
      launchSiteKey: 'yumen',
    },
    quantitative: {
      small: {
        nMissiles: 12,
        mirvsPerMissile: 1,
      },
      medium: {
        nMissiles: 36,
        mirvsPerMissile: 3,
      },
      large: {
        nMissiles: 100,
        mirvsPerMissile: 5,
      },
    },
    qualitative: {
      conservative: {
        decoysPerMissile: 1,
        kilotonsPerWarhead: 50,
      },
      baseline: {
        decoysPerMissile: 3,
        kilotonsPerWarhead: 150,
      },
      optimistic: {
        decoysPerMissile: 6,
        kilotonsPerWarhead: 300,
      },
    },
  },

  Russia: {
    defaults: {
      launchSiteKey: 'dombarovsky',
    },
    quantitative: {
      small: {
        nMissiles: 12,
        mirvsPerMissile: 2,
      },
      medium: {
        nMissiles: 100,
        mirvsPerMissile: 4,
      },
      large: {
        nMissiles: 250,
        mirvsPerMissile: 6,
      },
    },
    qualitative: {
      conservative: {
        decoysPerMissile: 4,
        kilotonsPerWarhead: 100,
      },
      baseline: {
        decoysPerMissile: 6,
        kilotonsPerWarhead: 300,
      },
      optimistic: {
        decoysPerMissile: 10,
        kilotonsPerWarhead: 800,
      },
    },
  },
};

function normalizeQuantitativePresetKey(presetKey) {
  if (presetKey === 'small' || presetKey === 'medium' || presetKey === 'large') {
    return presetKey;
  }
  return DEFAULT_RED_QUANTITATIVE_PRESET;
}

function normalizeQualitativePresetKey(presetKey) {
  if (presetKey === 'conservative' || presetKey === 'baseline' || presetKey === 'optimistic') {
    return presetKey;
  }
  return DEFAULT_RED_QUALITATIVE_PRESET;
}

export function getRedQuantitativePresetMeta(presetKey) {
  const safePresetKey = normalizeQuantitativePresetKey(presetKey);
  return RED_QUANTITATIVE_PRESET_META[safePresetKey];
}

export function getRedQualitativePresetMeta(presetKey) {
  const safePresetKey = normalizeQualitativePresetKey(presetKey);
  return RED_QUALITATIVE_PRESET_META[safePresetKey];
}

export function getRedQuantitativePreset(countryKey, presetKey = DEFAULT_RED_QUANTITATIVE_PRESET) {
  const safePresetKey = normalizeQuantitativePresetKey(presetKey);
  const countryPresets = RED_ATTACK_PRESETS[countryKey];
  if (!countryPresets) return null;
  return countryPresets.quantitative?.[safePresetKey] ?? null;
}

export function getRedQualitativePreset(countryKey, presetKey = DEFAULT_RED_QUALITATIVE_PRESET) {
  const safePresetKey = normalizeQualitativePresetKey(presetKey);
  const countryPresets = RED_ATTACK_PRESETS[countryKey];
  if (!countryPresets) return null;
  return countryPresets.qualitative?.[safePresetKey] ?? null;
}

export function getRedAttackProfileMeta(
  quantitativePresetKey = DEFAULT_RED_QUANTITATIVE_PRESET,
  qualitativePresetKey = DEFAULT_RED_QUALITATIVE_PRESET,
  mode = 'preset'
) {
  if (mode === 'custom') {
    return {
      title: 'Custom Attack Profile',
      description: 'Manual control over Red quantitative and qualitative attack assumptions.',
    };
  }

  const quantitativeMeta = getRedQuantitativePresetMeta(quantitativePresetKey);
  const qualitativeMeta = getRedQualitativePresetMeta(qualitativePresetKey);
  return {
    title: 'Selected Attack Profile',
    description: `Quantitative preset: ${quantitativeMeta.label}. Qualitative preset: ${qualitativeMeta.label}.`,
  };
}

export function resolveRedAttackProfile(
  countryKey,
  {
    quantitativePresetKey = DEFAULT_RED_QUANTITATIVE_PRESET,
    qualitativePresetKey = DEFAULT_RED_QUALITATIVE_PRESET,
  } = {},
  overrides = {}
) {
  const countryPresets = RED_ATTACK_PRESETS[countryKey] ?? {};
  const defaults = countryPresets.defaults ?? {};
  const quantitativePreset = getRedQuantitativePreset(countryKey, quantitativePresetKey) ?? {};
  const qualitativePreset = getRedQualitativePreset(countryKey, qualitativePresetKey) ?? {};

  return {
    ...defaults,
    ...quantitativePreset,
    ...qualitativePreset,
    ...overrides,
  };
}
