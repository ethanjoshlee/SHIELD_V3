#!/usr/bin/env python3
"""
Fetch Natural Earth 110m country boundary lines and write worldCountryBorders.js.
Usage: python3 scripts/extract-country-borders.py
"""

import json
import math
import os
import urllib.request

URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_boundary_lines_land.geojson"
OUT = "src/ui/globe/worldCountryBorders.js"

# Conservative readability/perf filter for tiny fragments.
MIN_POINTS = 2
MIN_APPROX_LENGTH_DEG = 0.35


def approx_length_deg(line):
    """Approximate angular length in degrees with longitude compression by latitude."""
    total = 0.0
    for i in range(1, len(line)):
        lng1, lat1 = line[i - 1]
        lng2, lat2 = line[i]
        mean_lat_rad = math.radians((lat1 + lat2) * 0.5)
        dx = (lng2 - lng1) * math.cos(mean_lat_rad)
        dy = lat2 - lat1
        total += math.hypot(dx, dy)
    return total


print("Fetching Natural Earth 110m country boundary lines...")
with urllib.request.urlopen(URL) as response:
    geojson = json.loads(response.read().decode())

lines = []
for feature in geojson["features"]:
    geom = feature["geometry"]
    if geom["type"] == "LineString":
        lines.append(geom["coordinates"])
    elif geom["type"] == "MultiLineString":
        for part in geom["coordinates"]:
            lines.append(part)

valid = [line for line in lines if len(line) >= MIN_POINTS]
filtered = [line for line in valid if approx_length_deg(line) >= MIN_APPROX_LENGTH_DEG]
print(f"Extracted {len(lines)} raw line(s), kept {len(filtered)} after filtering.")

js = f"""/**
 * World country borders — Natural Earth 110m land boundary lines.
 * GENERATED FILE — do not edit by hand.
 * Source: https://github.com/nvkelso/natural-earth-vector (Public Domain CC0)
 * Regenerate: python3 scripts/extract-country-borders.py
 */

export const WORLD_COUNTRY_BORDERS = {json.dumps(filtered)};
"""

with open(OUT, "w") as f:
    f.write(js)

size_kb = os.path.getsize(OUT) / 1024
print(f"Written: {OUT} ({size_kb:.1f} KB)")
