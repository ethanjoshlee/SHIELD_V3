export const DEFAULT_RED_ATTACK_PRESET = 'baseline';

export const RED_ATTACK_PRESET_ORDER = [
  'limited',
  'baseline',
  'extreme',
  'custom',
];

export const RED_ATTACK_PRESET_META = {
  limited: {
    label: 'Limited',
    title: 'Limited Attack Profile',
    description: 'Smaller salvo with simpler penetration aids and limited counterspace pressure.',
  },
  baseline: {
    label: 'Baseline',
    title: 'Baseline Attack Profile',
    description: 'Representative default assumptions for this actor’s strike sophistication.',
  },
  extreme: {
    label: 'Extreme',
    title: 'Extreme Attack Profile',
    description: 'Stress case with heavier penetration aids and stronger counterspace pressure.',
  },
  custom: {
    label: 'Custom',
    title: 'Custom Attack Profile',
    description: 'Manual control over strike, penetration-aid, and counterspace assumptions.',
  },
};

export const RED_ATTACK_PRESET_FIELDS = [
  'nMissiles',
  'mirvsPerMissile',
  'decoysPerMissile',
  'kilotonsPerWarhead',
  'launchRegion',
  'boostEvasionPenalty',
  'midcourseInterceptionPenalty',
  'asatSensingPenalty',
  'asatAvailabilityPenalty',
];

export const RED_ATTACK_PRESETS = {
  DPRK: {
    limited: {
      nMissiles: 12,
      mirvsPerMissile: 1,
      decoysPerMissile: 0,
      kilotonsPerWarhead: 40,
      launchRegion: 'north_korea_land',
      boostEvasionPenalty: 0.00,
      midcourseInterceptionPenalty: 0.00,
      asatSensingPenalty: 0.00,
      asatAvailabilityPenalty: 0.05,
    },
    baseline: {
      nMissiles: 35,
      mirvsPerMissile: 1,
      decoysPerMissile: 1,
      kilotonsPerWarhead: 40,
      launchRegion: 'north_korea_land',
      boostEvasionPenalty: 0.01,
      midcourseInterceptionPenalty: 0.00,
      asatSensingPenalty: 0.05,
      asatAvailabilityPenalty: 0.15,
    },
    extreme: {
      nMissiles: 60,
      mirvsPerMissile: 2,
      decoysPerMissile: 2,
      kilotonsPerWarhead: 40,
      launchRegion: 'north_korea_land',
      boostEvasionPenalty: 0.05,
      midcourseInterceptionPenalty: 0.03,
      asatSensingPenalty: 0.10,
      asatAvailabilityPenalty: 0.25,
    },
  },

  Iran: {
    limited: {
      nMissiles: 20,
      mirvsPerMissile: 1,
      decoysPerMissile: 0,
      kilotonsPerWarhead: 60,
      launchRegion: 'default',
      boostEvasionPenalty: 0.00,
      midcourseInterceptionPenalty: 0.00,
      asatSensingPenalty: 0.00,
      asatAvailabilityPenalty: 0.00,
    },
    baseline: {
      nMissiles: 60,
      mirvsPerMissile: 1,
      decoysPerMissile: 1,
      kilotonsPerWarhead: 60,
      launchRegion: 'default',
      boostEvasionPenalty: 0.02,
      midcourseInterceptionPenalty: 0.00,
      asatSensingPenalty: 0.02,
      asatAvailabilityPenalty: 0.05,
    },
    extreme: {
      nMissiles: 120,
      mirvsPerMissile: 2,
      decoysPerMissile: 2,
      kilotonsPerWarhead: 60,
      launchRegion: 'default',
      boostEvasionPenalty: 0.05,
      midcourseInterceptionPenalty: 0.02,
      asatSensingPenalty: 0.05,
      asatAvailabilityPenalty: 0.10,
    },
  },

  China: {
    limited: {
      nMissiles: 150,
      mirvsPerMissile: 1,
      decoysPerMissile: 4,
      kilotonsPerWarhead: 340,
      launchRegion: 'china_interior',
      boostEvasionPenalty: 0.05,
      midcourseInterceptionPenalty: 0.00,
      asatSensingPenalty: 0.05,
      asatAvailabilityPenalty: 0.15,
    },
    baseline: {
      nMissiles: 622,
      mirvsPerMissile: 2,
      decoysPerMissile: 11,
      kilotonsPerWarhead: 340,
      launchRegion: 'china_interior',
      boostEvasionPenalty: 0.13,
      midcourseInterceptionPenalty: 0.00,
      asatSensingPenalty: 0.20,
      asatAvailabilityPenalty: 0.60,
    },
    extreme: {
      nMissiles: 850,
      mirvsPerMissile: 3,
      decoysPerMissile: 18,
      kilotonsPerWarhead: 340,
      launchRegion: 'china_interior',
      boostEvasionPenalty: 0.20,
      midcourseInterceptionPenalty: 0.08,
      asatSensingPenalty: 0.30,
      asatAvailabilityPenalty: 0.80,
    },
  },

  Russia: {
    limited: {
      nMissiles: 200,
      mirvsPerMissile: 3,
      decoysPerMissile: 12,
      kilotonsPerWarhead: 615,
      launchRegion: 'russia_west',
      boostEvasionPenalty: 0.08,
      midcourseInterceptionPenalty: 0.02,
      asatSensingPenalty: 0.15,
      asatAvailabilityPenalty: 0.35,
    },
    baseline: {
      nMissiles: 692,
      mirvsPerMissile: 5,
      decoysPerMissile: 35,
      kilotonsPerWarhead: 615,
      launchRegion: 'russia_west',
      boostEvasionPenalty: 0.18,
      midcourseInterceptionPenalty: 0.00,
      asatSensingPenalty: 0.35,
      asatAvailabilityPenalty: 0.80,
    },
    extreme: {
      nMissiles: 900,
      mirvsPerMissile: 6,
      decoysPerMissile: 50,
      kilotonsPerWarhead: 615,
      launchRegion: 'russia_east',
      boostEvasionPenalty: 0.25,
      midcourseInterceptionPenalty: 0.10,
      asatSensingPenalty: 0.45,
      asatAvailabilityPenalty: 0.90,
    },
  },
};

function normalizePresetKey(presetKey) {
  if (presetKey === 'limited' || presetKey === 'baseline' || presetKey === 'extreme') {
    return presetKey;
  }
  return DEFAULT_RED_ATTACK_PRESET;
}

export function getRedAttackPresetMeta(presetKey) {
  return RED_ATTACK_PRESET_META[presetKey] ?? RED_ATTACK_PRESET_META[DEFAULT_RED_ATTACK_PRESET];
}

export function getRedAttackPreset(countryKey, presetKey = DEFAULT_RED_ATTACK_PRESET) {
  const safePresetKey = normalizePresetKey(presetKey);
  const countryPresets = RED_ATTACK_PRESETS[countryKey];
  if (!countryPresets) return null;
  return countryPresets[safePresetKey] ?? countryPresets[DEFAULT_RED_ATTACK_PRESET] ?? null;
}

export function resolveRedAttackProfile(countryKey, presetKey = DEFAULT_RED_ATTACK_PRESET, overrides = {}) {
  const preset = getRedAttackPreset(countryKey, presetKey) ?? {};
  return {
    ...preset,
    ...overrides,
  };
}
