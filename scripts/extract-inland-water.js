// Usage: node scripts/extract-inland-water.js
// Fetches Natural Earth 110m lakes polygons from GitHub and writes
// src/ui/globe/worldInlandWater.js.
//
// We intentionally keep only inland waters that still read as recognizable
// geography at the current globe scale. The Caspian Sea is handled separately
// via interior rings in the land dataset.

const https = require('https');
const fs = require('fs');
const path = require('path');

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_lakes.geojson';
const OUT = path.join(__dirname, '../src/ui/globe/worldInlandWater.js');
const KEEP_NAMES = new Set([
  'Lake Superior',
  'Lake Michigan',
  'Lake Huron',
  'Lake Erie',
  'Lake Ontario',
  'Lake Baikal',
]);

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function main() {
  console.log('Fetching Natural Earth 110m lakes polygons...');
  const geojson = await fetchJSON(URL);

  const rings = [];
  for (const feature of geojson.features) {
    if (!KEEP_NAMES.has(feature.properties?.name)) continue;
    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
      rings.push(...geom.coordinates);
    } else if (geom.type === 'MultiPolygon') {
      for (const part of geom.coordinates) {
        rings.push(...part);
      }
    }
  }

  const valid = rings.filter(ring => ring.length >= 4);
  console.log(`Extracted ${valid.length} curated inland-water polygon ring(s).`);

  const js = `/**
 * World inland water — Natural Earth 110m lakes polygons.
 * GENERATED FILE — do not edit by hand.
 * Source: https://github.com/nvkelso/natural-earth-vector (Public Domain CC0)
 * Regenerate: node scripts/extract-inland-water.js
 */

export const WORLD_INLAND_WATER = ${JSON.stringify(valid, null, 0)};
`;

  fs.writeFileSync(OUT, js, 'utf8');
  console.log(`Written: ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
