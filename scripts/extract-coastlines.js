// Usage: node scripts/extract-coastlines.js
// Fetches Natural Earth 110m land polygons from GitHub and writes
// src/ui/globe/worldPolygons.js.
//
// We keep:
// - exterior rings for subtle land fills
// - interior rings (holes) for inland seas embedded in the land dataset, such
//   as the Caspian Sea
// - a flattened combined list for coastline stroke rendering

const https = require('https');
const fs = require('fs');
const path = require('path');

const URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson';
const OUT = path.join(__dirname, '../src/ui/globe/worldPolygons.js');

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
  console.log('Fetching Natural Earth 110m land polygons...');
  const geojson = await fetchJSON(URL);

  const rings = [];
  const landRings = [];
  const interiorWaterRings = [];
  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
      rings.push(...geom.coordinates);
      landRings.push(geom.coordinates[0]);
      interiorWaterRings.push(...geom.coordinates.slice(1));
    } else if (geom.type === 'MultiPolygon') {
      for (const part of geom.coordinates) {
        rings.push(...part);
        landRings.push(part[0]);
        interiorWaterRings.push(...part.slice(1));
      }
    }
  }

  const valid = rings.filter(r => r.length >= 4);
  const validLand = landRings.filter(r => r.length >= 4);
  const validInteriorWater = interiorWaterRings.filter(r => r.length >= 4);
  console.log(
    `Extracted ${validLand.length} land ring(s), ` +
    `${validInteriorWater.length} interior-water ring(s), ` +
    `${valid.length} total coastline ring(s).`
  );

  const js = `/**
 * World coastlines — Natural Earth 110m land polygons.
 * GENERATED FILE — do not edit by hand.
 * Source: https://github.com/nvkelso/natural-earth-vector (Public Domain CC0)
 * Regenerate: node scripts/extract-coastlines.js
 */

export const WORLD_LAND_RINGS = ${JSON.stringify(validLand, null, 0)};
export const WORLD_INTERIOR_WATER_RINGS = ${JSON.stringify(validInteriorWater, null, 0)};
export const WORLD_COASTLINES = ${JSON.stringify(valid, null, 0)};
`;

  fs.writeFileSync(OUT, js, 'utf8');
  console.log(`Written: ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
}

main().catch(err => { console.error(err); process.exit(1); });
