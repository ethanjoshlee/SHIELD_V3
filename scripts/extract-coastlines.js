// Usage: node scripts/extract-coastlines.js
// Fetches Natural Earth 110m land polygons from GitHub and writes src/ui/globe/worldPolygons.js

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
  for (const feature of geojson.features) {
    const geom = feature.geometry;
    if (geom.type === 'Polygon') {
      rings.push(geom.coordinates[0]);
    } else if (geom.type === 'MultiPolygon') {
      for (const part of geom.coordinates) {
        rings.push(part[0]);
      }
    }
  }

  const valid = rings.filter(r => r.length >= 4);
  console.log(`Extracted ${valid.length} polygon rings.`);

  const js = `/**
 * World coastlines — Natural Earth 110m land polygons.
 * GENERATED FILE — do not edit by hand.
 * Source: https://github.com/nvkelso/natural-earth-vector (Public Domain CC0)
 * Regenerate: node scripts/extract-coastlines.js
 */

export const WORLD_COASTLINES = ${JSON.stringify(valid, null, 0)};
`;

  fs.writeFileSync(OUT, js, 'utf8');
  console.log(`Written: ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(1)} KB)`);
}

main().catch(err => { console.error(err); process.exit(1); });
