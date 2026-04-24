/**
 * Scenario-layer transforms for boost-phase assumptions.
 *
 * Keeps boost availability math deterministic and continuous.
 * Discretization happens later at engagement resolution.
 */

import { bernoulli, clamp01 } from '../utils/rng.js';
import { SBI_CONSTELLATION_ASSUMPTIONS, resolveRedLaunchSite } from '../config/launchSites.js';

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

function resolveLaunchSite(params) {
  return resolveRedLaunchSite(params.redKey, params.launchSiteKey);
}

/**
 * Build boost-phase scenario values from user params / presets.
 */
export function buildBoostScenario(params) {
  const launchSite = resolveLaunchSite(params);

  const deployedByType = {
    boost_kinetic: asFiniteNonNegative(params.nSpaceBoostKinetic, 0),
  };

  const pkByType = {
    boost_kinetic: asProbability(params.pkSpaceBoostKinetic, 0.5),
  };

  const coverageByType = {
    boost_kinetic: asProbability(
      launchSite?.sbiAvailability?.coverageByType?.boost_kinetic,
      0
    ),
  };

  const effectiveBoostInterceptorsInRangeByType = {
    boost_kinetic: deployedByType.boost_kinetic * coverageByType.boost_kinetic,
  };

  const effectiveBoostInterceptorsAvailableByType = {
    boost_kinetic: effectiveBoostInterceptorsInRangeByType.boost_kinetic,
  };

  return {
    launchSiteKey: launchSite?.key ?? null,
    launchSiteLabel: launchSite?.label ?? 'Unspecified launch site',
    launchSiteCoordinates: launchSite?.coordinates ?? null,
    launchSiteAvailabilityFraction:
      launchSite?.sbiAvailability?.fractionOfConstellation ?? 0,
    launchSiteAvailabilityPercent:
      launchSite?.sbiAvailability?.percentOfConstellation ?? 0,
    constellationAssumptions: SBI_CONSTELLATION_ASSUMPTIONS,
    deployedByType,
    pkByType,
    coverageByType,
    effectiveBoostInterceptorsInRangeByType,
    effectiveBoostInterceptorsAvailableByType,
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
