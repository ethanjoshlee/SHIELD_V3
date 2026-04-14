/**
 * Scenario-layer transforms for boost-phase assumptions.
 *
 * Keeps coverage math deterministic and continuous.
 * Discretization happens later at engagement resolution.
 */

import { bernoulli, clamp01 } from '../utils/rng.js';
import { LAUNCH_REGION_PRESETS } from '../config/launchRegions.js';

function asFiniteNonNegative(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, n);
}

function asProbability(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return clamp01(fallback);
  return clamp01(n);
}

function resolveLaunchRegion(launchRegion) {
  if (LAUNCH_REGION_PRESETS[launchRegion]) return launchRegion;
  return 'default';
}

/**
 * Build boost-phase scenario values from user params / presets.
 */
export function buildBoostScenario(params) {
  const launchRegion = resolveLaunchRegion(params.launchRegion);
  const preset = LAUNCH_REGION_PRESETS[launchRegion];

  const deployedByType = {
    boost_kinetic: asFiniteNonNegative(
      params.nSpaceBoostKinetic,
      params.interceptors?.boost_kinetic?.deployed ?? 0
    ),
  };

  const pkByType = {
    boost_kinetic: asProbability(
      params.pkSpaceBoostKinetic,
      params.interceptors?.boost_kinetic?.pk ?? 0
    ),
  };

  // Outcome-based ASAT availability penalty (replaces mechanism-based cyber/h2k/nuclear model).
  const asatAvailabilityPenalty = asProbability(params.asatAvailabilityPenalty, 0);
  const availabilityMultiplier = clamp01(1 - asatAvailabilityPenalty);

  const boostEvasionPenalty = asProbability(params.boostEvasionPenalty, 0);

  const coverageByType = {
    boost_kinetic: asProbability(preset.coverage.spaceBoostKinetic, 1.0),
  };

  const effectiveBoostInterceptorsInRangeByType = {
    boost_kinetic: deployedByType.boost_kinetic * coverageByType.boost_kinetic,
  };

  const effectiveBoostInterceptorsPostAsatByType = {
    boost_kinetic:
      effectiveBoostInterceptorsInRangeByType.boost_kinetic *
      availabilityMultiplier,
  };

  return {
    launchRegion,
    launchRegionLabel: preset.label,
    deployedByType,
    pkByType,
    coverageByType,
    availabilityMultiplier,
    boostEvasionPenalty,
    effectiveBoostInterceptorsInRangeByType,
    effectiveBoostInterceptorsPostAsatByType,
  };
}

/**
 * Convert continuous interceptor counts into integer engagement pools.
 *
 * This is the only discretization step, done immediately before engagement.
 */
export function discretizeBoostInventoryByType(continuousByType) {
  const result = {};
  for (const [type, raw] of Object.entries(continuousByType)) {
    const x = asFiniteNonNegative(raw, 0);
    const whole = Math.floor(x);
    const fractional = x - whole;
    result[type] = whole + (fractional > 0 ? (bernoulli(fractional) ? 1 : 0) : 0);
  }
  return result;
}
