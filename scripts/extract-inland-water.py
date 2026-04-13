#!/usr/bin/env python3
"""
Fetch Natural Earth 110m lakes polygons and write worldInlandWater.js.

We intentionally keep only inland waters that still read as recognizable
geography at the current globe scale. The Caspian Sea is handled separately via
interior rings in the land dataset.

Usage: python3 scripts/extract-inland-water.py
"""

import json
import os
import urllib.request

URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_lakes.geojson"
OUT = "src/ui/globe/worldInlandWater.js"

KEEP_NAMES = {
    "Lake Superior",
    "Lake Michigan",
    "Lake Huron",
    "Lake Erie",
    "Lake Ontario",
    "Lake Baikal",
}

print("Fetching Natural Earth 110m lakes polygons...")
with urllib.request.urlopen(URL) as response:
    geojson = json.loads(response.read().decode())

rings = []
for feature in geojson["features"]:
    if feature["properties"].get("name") not in KEEP_NAMES:
        continue
    geom = feature["geometry"]
    if geom["type"] == "Polygon":
        rings.extend(geom["coordinates"])
    elif geom["type"] == "MultiPolygon":
        for part in geom["coordinates"]:
            rings.extend(part)

valid = [ring for ring in rings if len(ring) >= 4]
print(f"Extracted {len(valid)} curated inland-water polygon ring(s).")

js = f"""/**
 * World inland water — Natural Earth 110m lakes polygons.
 * GENERATED FILE — do not edit by hand.
 * Source: https://github.com/nvkelso/natural-earth-vector (Public Domain CC0)
 * Regenerate: python3 scripts/extract-inland-water.py
 */

export const WORLD_INLAND_WATER = {json.dumps(valid)};
"""

with open(OUT, "w") as f:
    f.write(js)

size_kb = os.path.getsize(OUT) / 1024
print(f"Written: {OUT} ({size_kb:.1f} KB)")
