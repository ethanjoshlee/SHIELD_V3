/**
 * SHIELD_V3 illustrative 20-year architecture-equivalent cost model.
 *
 * What this model is:
 * - a transparent, AEI-inspired cost context layer for the SHIELD_V3 results page
 * - limited to the architecture quantities SHIELD_V3 currently exposes in the UI
 * - expressed in FY26 constant dollars over a 20-year horizon
 *
 * What this model is not:
 * - not a net-new appropriation estimate
 * - not a full Golden Dome budget model
 * - not a complete reproduction of AEI's wider architecture framework
 *
 * Current SHIELD_V3 modeled layers used here:
 * - hypothetical space-based boost interceptors in orbit
 * - existing ground-based midcourse interceptors in range
 * - a simplified internal sensing / C2 support bundle derived from AEI component costs
 *
 * Intentionally deferred for later passes:
 * - midcourse-phase and glide-phase space-interceptor costing
 * - THAAD, Aegis Ashore, Arrow, Patriot, and other non-live layer counts
 * - detailed baseline-budget offsets or net-new appropriation logic
 */

export const COST_MODEL_UI = {
  heading: 'Illustrative 20-Year Architecture-Equivalent Cost',
  framingLabel: 'Illustrative 20-year architecture-equivalent cost in FY26 dollars',
  framingNotes: [
    'Not a net-new appropriation estimate.',
    'Not a full Golden Dome budget model.',
  ],
  sourceLabel: 'AEI-inspired component-cost assumptions applied only to the layers SHIELD_V3 currently exposes.',
  deferredScope: [
    'Midcourse-phase and glide-phase space-interceptor costing is deferred until those model quantities are live.',
    'THAAD, Aegis Ashore, Arrow, Patriot, and other non-live architecture layers are deferred.',
    'Detailed baseline-budget offsets and other appropriation accounting are deferred.',
  ],
};

export const COST_MODEL_REFERENCE = {
  yearsInCostWindow: 20,
  boostBasicAnchorCount: 4990,
  boostModerateAnchorCount: 49900,
  boostRobustAnchorCount: 249500,
  groundInterceptorsPerBattalion: 40,
};

const YEARS_IN_COST_WINDOW = COST_MODEL_REFERENCE.yearsInCostWindow;
const BOOST_BASIC_ANCHOR_COUNT = COST_MODEL_REFERENCE.boostBasicAnchorCount;
const BOOST_ROBUST_ANCHOR_COUNT = COST_MODEL_REFERENCE.boostRobustAnchorCount;
const GROUND_INTERCEPTORS_PER_BATTALION = COST_MODEL_REFERENCE.groundInterceptorsPerBattalion;

// Source logic: AEI, "Estimating the Cost of Golden Dome," boost-phase
// space-interceptor architecture examples. SHIELD_V3 currently maps its modeled
// space layer only to these boost-phase anchor points.
const BOOST_SPACE_DEVELOPMENT_COST_B = 7;
const BOOST_SPACE_OPERATIONS_20Y_COST_B = 9;

const BOOST_SPACE_INITIAL_PROCUREMENT_ANCHORS_B = [
  { quantity: 0, costB: 0 },
  { quantity: 4990, costB: 67 },
  { quantity: 49900, costB: 421 },
  { quantity: 249500, costB: 1557 },
];

const BOOST_SPACE_REPLENISHMENT_ANCHORS_B = [
  { quantity: 0, costB: 0 },
  { quantity: 4990, costB: 195 },
  { quantity: 49900, costB: 1222 },
  { quantity: 249500, costB: 4484 },
];

// Source logic: AEI battalion-equivalent Ground-based Midcourse Defense costs
// used for the currently modeled ground-interceptor layer.
const GMD_BATTALION_INFRASTRUCTURE_COST_B = 3.1;
const GMD_BATTALION_PROCUREMENT_COST_B = 4.8;
const GMD_BATTALION_ANNUAL_OPERATIONS_COST_B = 0.27;
const GMD_BATTALION_20Y_COST_B =
  GMD_BATTALION_INFRASTRUCTURE_COST_B +
  GMD_BATTALION_PROCUREMENT_COST_B +
  (YEARS_IN_COST_WINDOW * GMD_BATTALION_ANNUAL_OPERATIONS_COST_B);

// Source logic: AEI component-cost examples used to assemble a simplified
// internal SHIELD_V3 sensing / C2 bundle. This bundle is a SHIELD_V3 modeling
// convenience, not a direct AEI package.
const LEO_TRACKING_SATELLITE_PROCUREMENT_COST_B = 0.05;
const LEO_TRACKING_SATELLITE_ANNUAL_REPLENISHMENT_COST_B = 0.01;
const MEO_TRACKING_SATELLITE_PROCUREMENT_COST_B = 0.12;
const MEO_TRACKING_SATELLITE_ANNUAL_REPLENISHMENT_COST_B = 0.02;
const C2BMC_INCREMENT_DEVELOPMENT_COST_B = 0.5;
const C2BMC_INCREMENT_ANNUAL_OPERATIONS_COST_B = 0.025;
const PLEO_SATCOM_INCREMENT_INTEGRATION_COST_B = 0.05;
const PLEO_SATCOM_INCREMENT_ANNUAL_SERVICE_COST_B = 0.1;
const COMMAND_CENTER_INCREMENT_PROCUREMENT_COST_B = 0.25;
const COMMAND_CENTER_INCREMENT_ANNUAL_OPERATIONS_COST_B = 0.0275;

const SUPPORT_BUNDLE_BASE_LEO_SATELLITES = 20;
const SUPPORT_BUNDLE_BASE_MEO_SATELLITES = 4;
const SUPPORT_BUNDLE_BASE_C2BMC_INCREMENTS = 1;
const SUPPORT_BUNDLE_BASE_PLEO_INCREMENTS = 1;
const SUPPORT_BUNDLE_BASE_COMMAND_CENTERS = 1;

const SUPPORT_BUNDLE_BASE_COST_B =
  (SUPPORT_BUNDLE_BASE_LEO_SATELLITES * (
    LEO_TRACKING_SATELLITE_PROCUREMENT_COST_B +
    (YEARS_IN_COST_WINDOW * LEO_TRACKING_SATELLITE_ANNUAL_REPLENISHMENT_COST_B)
  )) +
  (SUPPORT_BUNDLE_BASE_MEO_SATELLITES * (
    MEO_TRACKING_SATELLITE_PROCUREMENT_COST_B +
    (YEARS_IN_COST_WINDOW * MEO_TRACKING_SATELLITE_ANNUAL_REPLENISHMENT_COST_B)
  )) +
  (SUPPORT_BUNDLE_BASE_C2BMC_INCREMENTS * (
    C2BMC_INCREMENT_DEVELOPMENT_COST_B +
    (YEARS_IN_COST_WINDOW * C2BMC_INCREMENT_ANNUAL_OPERATIONS_COST_B)
  )) +
  (SUPPORT_BUNDLE_BASE_PLEO_INCREMENTS * (
    PLEO_SATCOM_INCREMENT_INTEGRATION_COST_B +
    (YEARS_IN_COST_WINDOW * PLEO_SATCOM_INCREMENT_ANNUAL_SERVICE_COST_B)
  )) +
  (SUPPORT_BUNDLE_BASE_COMMAND_CENTERS * (
    COMMAND_CENTER_INCREMENT_PROCUREMENT_COST_B +
    (YEARS_IN_COST_WINDOW * COMMAND_CENTER_INCREMENT_ANNUAL_OPERATIONS_COST_B)
  ));

function asFiniteNonNegative(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return 0;
  return numericValue;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function interpolateAnchoredCost(quantity, anchors) {
  if (!Array.isArray(anchors) || anchors.length < 2) return 0;

  const cappedQuantity = clamp(quantity, anchors[0].quantity, anchors[anchors.length - 1].quantity);

  for (let i = 0; i < anchors.length - 1; i += 1) {
    const left = anchors[i];
    const right = anchors[i + 1];
    if (cappedQuantity > right.quantity) continue;
    if (right.quantity === left.quantity) return right.costB;

    const ratio = (cappedQuantity - left.quantity) / (right.quantity - left.quantity);
    return left.costB + (ratio * (right.costB - left.costB));
  }

  return anchors[anchors.length - 1].costB;
}

function computeSpaceBoostLayerCost(nSpaceBoostKinetic) {
  const requestedCount = asFiniteNonNegative(nSpaceBoostKinetic);
  if (requestedCount <= 0) {
    return {
      requestedCount: 0,
      costedCount: 0,
      wasCapped: false,
      developmentCost_B: 0,
      initialProcurementLaunchCost_B: 0,
      replenishmentCost_B: 0,
      operationsCost_B: 0,
      totalCost_B: 0,
    };
  }

  // First pass behavior: cap at AEI's robust anchor instead of extrapolating beyond
  // the modeled range in the paper.
  const costedCount = Math.min(requestedCount, BOOST_ROBUST_ANCHOR_COUNT);
  const wasCapped = requestedCount > BOOST_ROBUST_ANCHOR_COUNT;

  const initialProcurementLaunchCost_B = interpolateAnchoredCost(
    costedCount,
    BOOST_SPACE_INITIAL_PROCUREMENT_ANCHORS_B
  );
  const replenishmentCost_B = interpolateAnchoredCost(
    costedCount,
    BOOST_SPACE_REPLENISHMENT_ANCHORS_B
  );
  const developmentCost_B = BOOST_SPACE_DEVELOPMENT_COST_B;
  const operationsCost_B = BOOST_SPACE_OPERATIONS_20Y_COST_B;

  return {
    requestedCount,
    costedCount,
    wasCapped,
    developmentCost_B,
    initialProcurementLaunchCost_B,
    replenishmentCost_B,
    operationsCost_B,
    totalCost_B:
      developmentCost_B +
      initialProcurementLaunchCost_B +
      replenishmentCost_B +
      operationsCost_B,
  };
}

function computeGroundBasedInterceptorLayerCost(nInventory) {
  const interceptorsInRange = asFiniteNonNegative(nInventory);
  const battalionEquivalent = interceptorsInRange / GROUND_INTERCEPTORS_PER_BATTALION;

  return {
    interceptorsInRange,
    battalionEquivalent,
    battalion20YearCost_B: GMD_BATTALION_20Y_COST_B,
    totalCost_B: battalionEquivalent * GMD_BATTALION_20Y_COST_B,
  };
}

function computeSensingC2SupportCost(nInventory, nSpaceBoostKinetic) {
  const battalionScale = asFiniteNonNegative(nInventory) / GROUND_INTERCEPTORS_PER_BATTALION;
  const boostScale = asFiniteNonNegative(nSpaceBoostKinetic) / BOOST_BASIC_ANCHOR_COUNT;
  const supportBundleScale = Math.max(battalionScale, boostScale);

  return {
    supportBundleScale,
    baseBundleCost_B: SUPPORT_BUNDLE_BASE_COST_B,
    totalCost_B: supportBundleScale > 0 ? supportBundleScale * SUPPORT_BUNDLE_BASE_COST_B : 0,
  };
}

export function computeIllustrativeArchitectureEquivalentCost(params = {}) {
  const nSpaceBoostKinetic = asFiniteNonNegative(params.nSpaceBoostKinetic);
  const nInventory = asFiniteNonNegative(params.nInventory);

  const spaceBoostLayer = computeSpaceBoostLayerCost(nSpaceBoostKinetic);
  const groundLayer = computeGroundBasedInterceptorLayerCost(nInventory);
  const sensingC2Layer = computeSensingC2SupportCost(nInventory, nSpaceBoostKinetic);

  const totalArchitectureEquivalentCost_B =
    spaceBoostLayer.totalCost_B +
    groundLayer.totalCost_B +
    sensingC2Layer.totalCost_B;

  return {
    spaceBoostLayerCost_B: spaceBoostLayer.totalCost_B,
    spaceBoostDevelopmentCost_B: spaceBoostLayer.developmentCost_B,
    spaceBoostInitialProcurementLaunchCost_B: spaceBoostLayer.initialProcurementLaunchCost_B,
    spaceBoostReplenishmentCost_B: spaceBoostLayer.replenishmentCost_B,
    spaceBoostOperationsCost_B: spaceBoostLayer.operationsCost_B,
    spaceBoostRequestedCount: spaceBoostLayer.requestedCount,
    spaceBoostCostedCount: spaceBoostLayer.costedCount,
    spaceBoostCostWasCapped: spaceBoostLayer.wasCapped,

    groundBasedInterceptorLayerCost_B: groundLayer.totalCost_B,
    groundBattalionEquivalent: groundLayer.battalionEquivalent,
    groundBattalion20YearCost_B: groundLayer.battalion20YearCost_B,

    sensingC2SupportCost_B: sensingC2Layer.totalCost_B,
    supportBundleScale: sensingC2Layer.supportBundleScale,
    supportBundleBaseCost_B: sensingC2Layer.baseBundleCost_B,

    totalArchitectureEquivalentCost_B,
    costFramingLabel: COST_MODEL_UI.framingLabel,
    costModelNotes: [...COST_MODEL_UI.framingNotes, COST_MODEL_UI.sourceLabel],
  };
}
