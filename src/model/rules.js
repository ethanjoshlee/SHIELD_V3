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
