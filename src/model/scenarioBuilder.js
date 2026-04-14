/**
 * Scenario builder — generates a flat missile strike and expands surviving
 * missiles into warheads and decoys after boost-phase engagement.
 */

import { shuffle } from '../utils/rng.js';

export function generateMissiles(params) {
  const nMissiles = Math.max(0, Math.floor(Number(params.nMissiles) || 0));
  const mirvsPerMissile = Math.max(1, Math.floor(Number(params.mirvsPerMissile) || 1));
  const decoysPerWarhead = Math.max(0, Number(params.decoysPerWarhead) || 0);
  const missiles = [];

  for (let i = 0; i < nMissiles; i++) {
    missiles.push({
      id: `missile_${i}`,
      mirvsPerMissile,
      decoysPerWarhead,
    });
  }

  shuffle(missiles);
  return missiles;
}

export function expandToWarheadsAndDecoys(survivingMissiles) {
  const targets = [];
  let realWarheads = 0;
  let decoys = 0;

  for (const missile of survivingMissiles) {
    for (let w = 0; w < missile.mirvsPerMissile; w++) {
      targets.push({
        kind: 'warhead',
        id: `${missile.id}_W${w}`,
      });
      realWarheads++;

      for (let d = 0; d < missile.decoysPerWarhead; d++) {
        targets.push({
          kind: 'decoy',
          id: `${missile.id}_W${w}_D${d}`,
        });
        decoys++;
      }
    }
  }

  shuffle(targets);
  return { targets, realWarheads, decoys };
}
