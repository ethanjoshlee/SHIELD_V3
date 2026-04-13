/**
 * Country presets for Blue (defender) and Red (attacker).
 *
 * NOTE: All numeric values are preliminary placeholders.
 * They will be refined with authoritative sources.
 */

export const COUNTRIES = {
  blue: {
    US: {
      label: "United States",
      interceptors: {
        boost_kinetic: {
          label: "Space-Based Kinetic (Boost)",
          deployed: 0,
          pk: 0.50,
          costPerUnit_M: 15,
          phase: "boost",
        },
        boost_laser: {
          label: "Space-Based Laser (Boost)",
          deployed: 0,
          pk: 0.40,
          costPerUnit_M: 25,
          phase: "boost",
        },
        midcourse_gbi: {
          label: "Ground-Based Interceptor (Midcourse)",
          deployed: 44,
          pk: 0.56,
          costPerUnit_M: 75,
          phase: "midcourse",
        },
        midcourse_kinetic: {
          label: "Space-Based Kinetic (Midcourse)",
          deployed: 100,
          pk: 0.50,
          costPerUnit_M: 15,
          phase: "midcourse",
        },
        midcourse_laser: {
          label: "Space-Based Laser (Midcourse)",
          deployed: 50,
          pk: 0.40,
          costPerUnit_M: 25,
          phase: "midcourse",
        },
        terminal_kinetic: {
          label: "Terminal Kinetic (THAAD/Patriot-class)",
          deployed: 200,
          pk: 0.80,
          costPerUnit_M: 3,
          phase: "terminal",
        },
        terminal_nuclear: {
          label: "Terminal Nuclear",
          deployed: 0,
          pk: 0.95,
          costPerUnit_M: 50,
          phase: "terminal",
        },
      },
      pDetectTrack: 0.98,
      pClassifyWarhead: 0.80,
      pFalseAlarmDecoy: 0.20,
      doctrineMode: "sls",
      shotsPerTarget: 2,
      maxShotsPerTarget: 4,
      pReengage: 0.85,
      terminalShotsPerTarget: 2,
      nSpaceBoostKinetic: 0,
      pkSpaceBoostKinetic: 0.50,
      nSpaceBoostDirected: 0,
      pkSpaceBoostDirected: 0.40,
      constellationAltitudeKm: 1000,
    },
  },

  red: {
    DPRK: {
      label: "North Korea",
      missileClasses: {
        IRBM: {
          label: "Intermediate-Range (Hwasong-12 class)",
          count: 30,
          mirvsPerMissile: 1,
          decoysPerWarhead: 1,
          yieldKt: 20,
          boostEvasion: 0.0,
        },
        ICBM: {
          label: "Intercontinental (Hwasong-17/18 class)",
          count: 5,
          mirvsPerMissile: 1,
          decoysPerWarhead: 2,
          yieldKt: 150,
          boostEvasion: 0.05,
        },
      },
      countermeasures: {
        asatType: "none",
      },
      launchRegion: "north_korea_land",
      asatSensingPenalty: 0.05,
      asatAvailabilityPenalty: 0.15,
      asatPkPenalty: 0,
      boostEvasionPenalty: 0.05,
      midcourseInterceptionPenalty: 0,
      terminalInterceptionPenalty: 0,
      regionalCoverageFactor: 0.9,
    },

    China: {
      label: "China",
      missileClasses: {
        IRBM: {
          label: "Intermediate-Range (DF-26 class)",
          count: 200,
          mirvsPerMissile: 1,
          decoysPerWarhead: 3,
          yieldKt: 90,
          boostEvasion: 0.10,
        },
        ICBM: {
          label: "Intercontinental (DF-41 class)",
          count: 350,
          mirvsPerMissile: 3,
          decoysPerWarhead: 5,
          yieldKt: 500,
          boostEvasion: 0.15,
        },
        SLBM: {
          label: "Submarine-Launched (JL-3 class)",
          count: 72,
          mirvsPerMissile: 3,
          decoysPerWarhead: 4,
          yieldKt: 250,
          boostEvasion: 0.10,
        },
      },
      countermeasures: {
        asatType: "conventional",
      },
      launchRegion: "china_interior",
      asatSensingPenalty: 0.20,
      asatAvailabilityPenalty: 0.60,
      asatPkPenalty: 0.15,
      boostEvasionPenalty: 0.10,
      midcourseInterceptionPenalty: 0,
      terminalInterceptionPenalty: 0,
      regionalCoverageFactor: 0.75,
    },

    Russia: {
      label: "Russia",
      missileClasses: {
        IRBM: {
          label: "Intermediate-Range (Iskander-class)",
          count: 100,
          mirvsPerMissile: 1,
          decoysPerWarhead: 4,
          yieldKt: 100,
          boostEvasion: 0.15,
        },
        ICBM: {
          label: "Intercontinental (SS-18/Sarmat class)",
          count: 400,
          mirvsPerMissile: 6,
          decoysPerWarhead: 8,
          yieldKt: 800,
          boostEvasion: 0.20,
        },
        SLBM: {
          label: "Submarine-Launched (Bulava class)",
          count: 192,
          mirvsPerMissile: 4,
          decoysPerWarhead: 6,
          yieldKt: 500,
          boostEvasion: 0.15,
        },
      },
      countermeasures: {
        asatType: "nuclear",
      },
      launchRegion: "russia_west",
      asatSensingPenalty: 0.35,
      asatAvailabilityPenalty: 0.80,
      asatPkPenalty: 0.30,
      boostEvasionPenalty: 0.15,
      midcourseInterceptionPenalty: 0,
      terminalInterceptionPenalty: 0,
      regionalCoverageFactor: 0.6,
    },
  },
};
