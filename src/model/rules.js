/**
 * Phase sequencing and countermeasure penalty logic.
 */

import { clamp01 } from '../utils/rng.js';

/**
 * Apply boost-evasion penalty to an interceptor's Pk.
 */
export function applyBoostEvasion(pk, boostEvasion) {
  return clamp01(pk * (1 - boostEvasion));
}

/**
 * Returns true if an interceptor type is space-based (affected by ASAT).
 */
export function isSpaceBased(interceptorType) {
  return interceptorType.startsWith("boost_");
}

/**
 * Sort interceptor types within a phase by cost (cheapest first).
 */
export function sortByPriority(interceptorTypes, interceptorConfigs) {
  return [...interceptorTypes].sort((a, b) => {
    const costA = interceptorConfigs[a]?.costPerUnit_M ?? 0;
    const costB = interceptorConfigs[b]?.costPerUnit_M ?? 0;
    return costA - costB;
  });
}
