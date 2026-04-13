#!/usr/bin/env python3
"""
Fetch Natural Earth 110m countries and update geoData.js with real polygons.
"""

import json
import urllib.request
import re

URL = 'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson'
GEODATA = 'src/ui/globe/geoData.js'

TARGETS = {'US': 'US', 'CN': 'China', 'RU': 'Russia', 'KP': 'DPRK'}

print('Fetching Natural Earth 110m countries...')
with urllib.request.urlopen(URL) as resp:
    geojson = json.loads(resp.read().decode())

results = {}
for feature in geojson['features']:
    iso = feature['properties'].get('ISO_A2', '')
    if iso not in TARGETS:
        continue
    key = TARGETS[iso]
    geom = feature['geometry']
    rings = []
    if geom['type'] == 'Polygon':
        rings.append(geom['coordinates'][0])
    elif geom['type'] == 'MultiPolygon':
        for part in geom['coordinates']:
            rings.append(part[0])
    results[key] = rings
    print(f'  {key} ({iso}): {len(rings)} polygon ring(s)')

with open(GEODATA, 'r') as f:
    content = f.read()

# For each country, replace polygons array
for key, rings in results.items():
    # Pattern: find "KEY: {" and match everything until the closing } of that object
    # Then find the polygons: [ part and replace it
    
    # Find the country block start
    country_pattern = rf'\b{re.escape(key)}\s*:\s*\{{'
    match = re.search(country_pattern, content)
    if not match:
        print(f'  WARNING: Could not find {key} block')
        continue
    
    # From the country start, find the polygons: [ part
    search_start = match.end()
    polygons_match = re.search(r'polygons\s*:\s*\[', content[search_start:])
    if not polygons_match:
        print(f'  WARNING: Could not find polygons array for {key}')
        continue
    
    bracket_start = search_start + polygons_match.end() - 1  # Position of [
    
    # Count brackets to find the closing ]
    bracket_count = 1
    bracket_end = bracket_start + 1
    for i in range(bracket_start + 1, len(content)):
        if content[i] == '[':
            bracket_count += 1
        elif content[i] == ']':
            bracket_count -= 1
            if bracket_count == 0:
                bracket_end = i
                break
    
    # Build replacement: keep "polygons: " and replace [ ... ] with the new data
    new_polygons_str = json.dumps(rings)
    new_content = (
        content[:bracket_start + 1] +           # Keep "polygons: ["
        new_polygons_str[1:-1] +                # Strip outer [] from JSON, keep inner content
        content[bracket_end:]
    )
    content = new_content
    print(f'  Updated {key} in {GEODATA}')

with open(GEODATA, 'w') as f:
    f.write(content)

print(f'\nWrote: {GEODATA}')
