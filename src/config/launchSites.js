/**
 * Fixed Red launch sites and shared space-based interceptor constellation assumptions.
 *
 * SHIELD currently models one representative single-salvo launch site per Red actor.
 * The boost-phase space-interceptor layer uses a first-order geometric availability
 * approximation rather than propagating individual satellites in time.
 */

const EARTH_RADIUS_KM = 6371;
const SBI_ALTITUDE_KM = 300;
const SBI_INTERCEPT_RADIUS_KM = 836;
const SBI_INCLINATION_DEG = 60;
const REFERENCE_ANGLE_DEG = 0;

function degToRad(value) {
  return (Number(value) * Math.PI) / 180;
}

function computeWalkerLatitudeDensityMultiplier(latitudeDeg) {
  const inclinationRad = degToRad(SBI_INCLINATION_DEG);
  const sinInclination = Math.sin(inclinationRad);
  if (sinInclination === 0) return 0;

  const latitudeRad = degToRad(latitudeDeg);
  const ratio = Math.sin(latitudeRad) / sinInclination;
  const boundedRatio = Math.max(-0.999999999999, Math.min(0.999999999999, ratio));

  return 2 / (Math.PI * Math.sqrt(1 - (boundedRatio ** 2)));
}

export function computeSbiAvailabilityFractionForLatitude(latitudeDeg) {
  const orbitalRadiusKm = EARTH_RADIUS_KM + SBI_ALTITUDE_KM;
  const inclinationRad = degToRad(SBI_INCLINATION_DEG);
  const areaShare =
    (Math.PI * (SBI_INTERCEPT_RADIUS_KM ** 2)) /
    (4 * Math.PI * (orbitalRadiusKm ** 2) * Math.sin(inclinationRad));

  return areaShare * computeWalkerLatitudeDensityMultiplier(latitudeDeg);
}

function createLaunchSite({
  key,
  actorKey,
  label,
  shortLabel,
  siteType,
  latitudeDeg,
  longitudeDeg,
  notes,
}) {
  const fractionOfConstellation = computeSbiAvailabilityFractionForLatitude(latitudeDeg);

  return {
    key,
    actorKey,
    label,
    shortLabel,
    siteType,
    coordinates: {
      latDeg: latitudeDeg,
      lngDeg: longitudeDeg,
    },
    notes,
    sbiAvailability: {
      fractionOfConstellation,
      percentOfConstellation: fractionOfConstellation * 100,
      coverageByType: {
        boost_kinetic: fractionOfConstellation,
      },
    },
  };
}

export const SBI_CONSTELLATION_ASSUMPTIONS = Object.freeze({
  modelVersion: 'A1-single-site-first-order',
  description:
    'Reference assumptions for the hypothetical 300 km-altitude boost-phase space-based interceptor layer.',
  orbitModel: {
    family: 'walker_delta',
    shape: 'circular',
    earthRadiusKm: EARTH_RADIUS_KM,
    altitudeKm: SBI_ALTITUDE_KM,
    orbitalRadiusKm: EARTH_RADIUS_KM + SBI_ALTITUDE_KM,
    inclinationDeg: SBI_INCLINATION_DEG,
    interceptorEngagementRadiusKm: SBI_INTERCEPT_RADIUS_KM,
    // Reference seed orbit for future visualization work. The current aggregate
    // availability model does not yet propagate individual satellites.
    referenceSatelliteClassicalElements: {
      semiMajorAxisKm: EARTH_RADIUS_KM + SBI_ALTITUDE_KM,
      eccentricity: 0,
      inclinationDeg: SBI_INCLINATION_DEG,
      rightAscensionOfAscendingNodeDeg: REFERENCE_ANGLE_DEG,
      argumentOfPerigeeDeg: REFERENCE_ANGLE_DEG,
      trueAnomalyDeg: REFERENCE_ANGLE_DEG,
    },
    walkerDeltaConstellation: {
      numberOfPlanes: null,
      satellitesPerPlane: null,
      relativeSpacing: null,
      notes: [
        'SHIELD currently stores a reference Walker delta family and a seed orbit, but it does not yet parameterize full plane count or phasing.',
        'Future visualization work can use the reference seed orbit plus explicit plane/phasing choices once those are locked.',
      ],
    },
  },
  availabilityApproximation: {
    method: 'first-order geometric approximation',
    formulaText:
      '[(pi * r_int^2) / (4 * pi * (R_earth + h)^2 * sin(i))] * [2 / (pi * sqrt(1 - (sin(phi) / sin(i))^2))]',
    notes: [
      'The first term approximates the share of the inclined orbital shell covered by one interceptor engagement footprint.',
      'The second term applies a latitude-density correction for the greater concentration of satellites near the edges of the inclination band.',
      'This model is intended for aggregate boost-phase availability only; it is not a full orbital propagator.',
    ],
  },
});

export const RED_LAUNCH_SITES = Object.freeze({
  yumen: createLaunchSite({
    key: 'yumen',
    actorKey: 'China',
    label: 'Yumen Silo Field',
    shortLabel: 'Yumen',
    siteType: 'ICBM silo field',
    latitudeDeg: 40.38,
    longitudeDeg: 96.52,
    notes:
      'Representative continental Chinese launch geometry anchored on one of the major new ICBM silo fields associated with the PLA Rocket Force buildup.',
  }),
  shahroud: createLaunchSite({
    key: 'shahroud',
    actorKey: 'Iran',
    label: 'Shahroud Missile Test Site',
    shortLabel: 'Shahroud',
    siteType: 'missile development and test site',
    latitudeDeg: 36.20,
    longitudeDeg: 55.33,
    notes:
      'Representative inland Iranian launch point used as a proxy for future long-range strike geometry toward Europe or CONUS.',
  }),
  sinpung_dong: createLaunchSite({
    key: 'sinpung_dong',
    actorKey: 'DPRK',
    label: 'Sinpung-dong Ballistic Missile Operating Base',
    shortLabel: 'Sinpung-dong',
    siteType: 'ballistic missile operating base',
    latitudeDeg: 40.32,
    longitudeDeg: 125.28,
    notes:
      'Representative DPRK launch point based on an identified ballistic missile operating base associated with mobile TEL operations.',
  }),
  dombarovsky: createLaunchSite({
    key: 'dombarovsky',
    actorKey: 'Russia',
    label: 'Dombarovsky ICBM Base',
    shortLabel: 'Dombarovsky',
    siteType: 'ICBM base',
    latitudeDeg: 51.02,
    longitudeDeg: 59.83,
    notes:
      'Representative Russian launch point chosen for its higher-latitude U.S.-bound geometry and established association with silo-based ICBMs.',
  }),
});

export const RED_LAUNCH_SITE_BY_ACTOR = Object.freeze({
  China: 'yumen',
  Iran: 'shahroud',
  DPRK: 'sinpung_dong',
  Russia: 'dombarovsky',
});

export function getRedLaunchSite(siteKey) {
  if (!siteKey) return null;
  return RED_LAUNCH_SITES[siteKey] ?? null;
}

export function getRedLaunchSiteKeyForActor(actorKey) {
  if (!actorKey) return null;
  return RED_LAUNCH_SITE_BY_ACTOR[actorKey] ?? null;
}

export function resolveRedLaunchSite(actorKey, siteKey = null) {
  const actorSiteKey = getRedLaunchSiteKeyForActor(actorKey);
  const resolvedSiteKey = actorSiteKey ?? siteKey;
  return getRedLaunchSite(resolvedSiteKey);
}
