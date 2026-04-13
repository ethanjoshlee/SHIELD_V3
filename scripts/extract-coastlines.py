#!/usr/bin/env python3
"""
Fetch Natural Earth 110m land polygons and write worldPolygons.js.

We keep:
- exterior rings for subtle land fills
- interior rings (holes) for inland seas embedded in the land dataset, such as
  the Caspian Sea
- a flattened combined list for coastline stroke rendering

Usage: python3 scripts/extract-coastlines.py
"""

import json
import urllib.request
import os

URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson'
OUT = 'src/ui/globe/worldPolygons.js'

print('Fetching Natural Earth 110m land polygons...')
with urllib.request.urlopen(URL) as response:
    geojson = json.loads(response.read().decode())

land_rings = []
interior_water_rings = []
rings = []
for feature in geojson['features']:
    geom = feature['geometry']
    if geom['type'] == 'Polygon':
        rings.extend(geom['coordinates'])
        land_rings.append(geom['coordinates'][0])
        interior_water_rings.extend(geom['coordinates'][1:])
    elif geom['type'] == 'MultiPolygon':
        for part in geom['coordinates']:
            rings.extend(part)
            land_rings.append(part[0])
            interior_water_rings.extend(part[1:])

valid = [r for r in rings if len(r) >= 4]
valid_land = [r for r in land_rings if len(r) >= 4]
valid_interior_water = [r for r in interior_water_rings if len(r) >= 4]
print(
    f'Extracted {len(valid_land)} land ring(s), '
    f'{len(valid_interior_water)} interior-water ring(s), '
    f'{len(valid)} total coastline ring(s).'
)

js = f"""/**
 * World coastlines — Natural Earth 110m land polygons.
 * GENERATED FILE — do not edit by hand.
 * Source: https://github.com/nvkelso/natural-earth-vector (Public Domain CC0)
 * Regenerate: python3 scripts/extract-coastlines.py
 */

export const WORLD_LAND_RINGS = {json.dumps(valid_land)};
export const WORLD_INTERIOR_WATER_RINGS = {json.dumps(valid_interior_water)};
export const WORLD_COASTLINES = {json.dumps(valid)};
"""

with open(OUT, 'w') as f:
    f.write(js)

size_kb = os.path.getsize(OUT) / 1024
print(f'Written: {OUT} ({size_kb:.1f} KB)')
