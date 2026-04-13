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
      spaceBoostDirected: 1.0,
    },
  },
  north_korea_land: {
    label: "North Korea (Land Launch)",
    coverage: {
      spaceBoostKinetic: 0.72,
      spaceBoostDirected: 0.78,
    },
  },
  china_interior: {
    label: "China (Interior Launch)",
    coverage: {
      spaceBoostKinetic: 0.58,
      spaceBoostDirected: 0.66,
    },
  },
  russia_west: {
    label: "Russia (Western Launch)",
    coverage: {
      spaceBoostKinetic: 0.63,
      spaceBoostDirected: 0.70,
    },
  },
  russia_east: {
    label: "Russia (Eastern Launch)",
    coverage: {
      spaceBoostKinetic: 0.54,
      spaceBoostDirected: 0.61,
    },
  },
  slbm_pacific: {
    label: "SLBM (Pacific Origin)",
    coverage: {
      spaceBoostKinetic: 0.80,
      spaceBoostDirected: 0.86,
    },
  },
  slbm_atlantic: {
    label: "SLBM (Atlantic Origin)",
    coverage: {
      spaceBoostKinetic: 0.76,
      spaceBoostDirected: 0.83,
    },
  },
};

export const LAUNCH_REGION_ORDER = [
  "north_korea_land",
  "china_interior",
  "russia_west",
  "russia_east",
  "slbm_pacific",
  "slbm_atlantic",
  "default",
];
