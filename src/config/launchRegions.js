/**
 * Launch-origin presets for first-pass boost-phase coverage assumptions.
 *
 * These are scenario presets, not orbital-physics calculations.
 */
export const LAUNCH_REGION_PRESETS = {
  default: {
    label: "Default (Neutral Baseline)",
    coverage: {
      spaceBoostKinetic: 1.0,
    },
  },
  north_korea_land: {
    label: "North Korea (Land Launch)",
    coverage: {
      spaceBoostKinetic: 0.72,
    },
  },
  china_interior: {
    label: "China (Interior Launch)",
    coverage: {
      spaceBoostKinetic: 0.58,
    },
  },
  russia_west: {
    label: "Russia (Western Launch)",
    coverage: {
      spaceBoostKinetic: 0.63,
    },
  },
  russia_east: {
    label: "Russia (Eastern Launch)",
    coverage: {
      spaceBoostKinetic: 0.54,
    },
  },
  pacific_maritime: {
    label: "Pacific Maritime Origin",
    coverage: {
      spaceBoostKinetic: 0.80,
    },
  },
  atlantic_maritime: {
    label: "Atlantic Maritime Origin",
    coverage: {
      spaceBoostKinetic: 0.76,
    },
  },
};

export const LAUNCH_REGION_ORDER = [
  "north_korea_land",
  "china_interior",
  "russia_west",
  "russia_east",
  "pacific_maritime",
  "atlantic_maritime",
  "default",
];
