#!/usr/bin/env python3
"""
Fetch Natural Earth 110m land polygons and write worldPolygons.js
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

rings = []
for feature in geojson['features']:
    geom = feature['geometry']
    if geom['type'] == 'Polygon':
        rings.append(geom['coordinates'][0])
    elif geom['type'] == 'MultiPolygon':
        for part in geom['coordinates']:
            rings.append(part[0])

valid = [r for r in rings if len(r) >= 4]
print(f'Extracted {len(valid)} polygon rings.')

js = f"""/**
 * World coastlines — Natural Earth 110m land polygons.
 * GENERATED FILE — do not edit by hand.
 * Source: https://github.com/nvkelso/natural-earth-vector (Public Domain CC0)
 * Regenerate: python3 scripts/extract-coastlines.py
 */

export const WORLD_COASTLINES = {json.dumps(valid)};
"""

with open(OUT, 'w') as f:
    f.write(js)

size_kb = os.path.getsize(OUT) / 1024
print(f'Written: {OUT} ({size_kb:.1f} KB)')
