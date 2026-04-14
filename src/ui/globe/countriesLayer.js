/**
 * Countries layer — renders world coastlines and highlighted countries on the globe.
 * Uses Canvas2D texture projected onto a Three.js sphere.
 */

import * as THREE from 'three';
import { COUNTRY_POLYGONS } from './geoData.js';
import { WORLD_COASTLINES, WORLD_INTERIOR_WATER_RINGS, WORLD_LAND_RINGS } from './worldPolygons.js';
import { WORLD_COUNTRY_BORDERS } from './worldCountryBorders.js';
import { WORLD_INLAND_WATER } from './worldInlandWater.js';

const TEX_W = 2048;
const TEX_H = 1024;
const GLOBE_RADIUS = 180;
const BASE_FILL = '#0a0a0f';
const LAND_FILL = 'rgba(0, 0, 0, 0.14)';
const BORDER_STROKE = 'rgba(255, 170, 0, 0.20)';
const BORDER_LINE_WIDTH = 0.85;
const COAST_STROKE = 'rgba(255, 170, 0, 0.45)';
const COAST_LINE_WIDTH = 1.7;
const INLAND_WATER_FILL = BASE_FILL;
const INLAND_WATER_STROKE = 'rgba(255, 170, 0, 0.20)';
const INLAND_WATER_LINE_WIDTH = 0.9;

let canvas, ctx, texture, sphereMesh;
let highlightedCountries = new Set();

/**
 * Convert [lng, lat] to canvas pixel coordinates (equirectangular).
 */
function toPixel(lng, lat) {
  const x = ((lng + 180) / 360) * TEX_W;
  const y = ((90 - lat) / 180) * TEX_H;
  return [x, y];
}

/**
 * Draw a polygon on the canvas (closed path).
 */
function drawPolygon(points, opts = {}) {
  if (!points || points.length < 3) return;
  ctx.beginPath();
  const [x0, y0] = toPixel(points[0][0], points[0][1]);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = toPixel(points[i][0], points[i][1]);
    ctx.lineTo(x, y);
  }
  ctx.closePath();

  if (opts.fill) {
    ctx.fillStyle = opts.fill;
    ctx.fill();
  }
  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = opts.lineWidth || 1;
    ctx.stroke();
  }
}

/**
 * Draw a line path on the canvas (open path, no fill).
 */
function drawPath(points, opts = {}) {
  if (!points || points.length < 2) return;
  ctx.beginPath();
  const [x0, y0] = toPixel(points[0][0], points[0][1]);
  ctx.moveTo(x0, y0);
  for (let i = 1; i < points.length; i++) {
    const [x, y] = toPixel(points[i][0], points[i][1]);
    ctx.lineTo(x, y);
  }
  // No closePath — open line path

  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = opts.lineWidth || 1;
    ctx.stroke();
  }
}

/**
 * Render the full texture.
 */
function renderTexture() {
  // Clear to dark
  ctx.fillStyle = BASE_FILL;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Dot grid
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  for (let x = 0; x < TEX_W; x += 32) {
    for (let y = 0; y < TEX_H; y += 32) {
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // Layer 1: landmass fill — gives water/ground a subtle separation while
  // staying inside the same dark palette.
  for (const ring of WORLD_LAND_RINGS) {
    drawPolygon(ring, {
      fill: LAND_FILL,
    });
  }

  // Layer 2: country borders (subtle)
  for (const borderLine of WORLD_COUNTRY_BORDERS) {
    drawPath(borderLine, {
      stroke: BORDER_STROKE,
      lineWidth: BORDER_LINE_WIDTH,
    });
  }

  // Layer 3: coastlines (primary)
  for (const ring of WORLD_COASTLINES) {
    drawPolygon(ring, {
      stroke: COAST_STROKE,
      lineWidth: COAST_LINE_WIDTH,
    });
  }

  // Layer 4: selected-country overlays
  for (const [key, data] of Object.entries(COUNTRY_POLYGONS)) {
    const isHighlighted = highlightedCountries.has(key);
    if (!isHighlighted) continue;

    for (const poly of data.polygons) {
      const [r, g, b] = data.color;
      drawPolygon(poly, {
        fill: `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0.25)`,
        stroke: `rgba(${r * 255}, ${g * 255}, ${b * 255}, 0.85)`,
        lineWidth: 2.2,
      });
    }
  }

  // Layer 5: inland water cutouts. Drawn after country fills so the water
  // remains legible even when a country is highlighted.
  const waterRings = [...WORLD_INTERIOR_WATER_RINGS, ...WORLD_INLAND_WATER];
  for (const ring of waterRings) {
    drawPolygon(ring, {
      fill: INLAND_WATER_FILL,
      stroke: INLAND_WATER_STROKE,
      lineWidth: INLAND_WATER_LINE_WIDTH,
    });
  }

  // Graticule lines (faint)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 0.5;
  // Latitude lines every 30 degrees
  for (let lat = -60; lat <= 60; lat += 30) {
    ctx.beginPath();
    const y = ((90 - lat) / 180) * TEX_H;
    ctx.moveTo(0, y);
    ctx.lineTo(TEX_W, y);
    ctx.stroke();
  }
  // Longitude lines every 30 degrees
  for (let lng = -150; lng <= 180; lng += 30) {
    ctx.beginPath();
    const x = ((lng + 180) / 360) * TEX_W;
    ctx.moveTo(x, 0);
    ctx.lineTo(x, TEX_H);
    ctx.stroke();
  }

  texture.needsUpdate = true;
}

/**
 * Create the globe sphere with the canvas texture.
 */
export function createCountriesLayer(globeGroup) {
  canvas = document.createElement('canvas');
  canvas.width = TEX_W;
  canvas.height = TEX_H;
  ctx = canvas.getContext('2d');

  texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  const geometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 48);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    opacity: 0.95,
  });

  sphereMesh = new THREE.Mesh(geometry, material);
  globeGroup.add(sphereMesh);

  // Atmospheric rim halo — soft blue glow at edges
  const atmGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.05, 64, 48);
  const atmMaterial = new THREE.MeshBasicMaterial({
    color: 0x003366,
    side: THREE.BackSide,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const atmMesh = new THREE.Mesh(atmGeometry, atmMaterial);
  globeGroup.add(atmMesh);

  renderTexture();
  return sphereMesh;
}

/**
 * Highlight a country (or remove highlight).
 */
export function highlightCountry(countryKey) {
  highlightedCountries.add(countryKey);
  renderTexture();
}

export function unhighlightCountry(countryKey) {
  highlightedCountries.delete(countryKey);
  renderTexture();
}

export function setHighlightedCountries(keys) {
  highlightedCountries = new Set(keys);
  renderTexture();
}

function normalizeLongitude(lng) {
  let normalized = lng;
  while (normalized > 180) normalized -= 360;
  while (normalized < -180) normalized += 360;
  return normalized;
}

function unwrapPolygonLongitudes(points) {
  if (!points || !points.length) return [];

  const unwrapped = [[points[0][0], points[0][1]]];
  let prevLng = points[0][0];

  for (let i = 1; i < points.length; i++) {
    let [lng, lat] = points[i];
    while (lng - prevLng > 180) lng -= 360;
    while (lng - prevLng < -180) lng += 360;
    unwrapped.push([lng, lat]);
    prevLng = lng;
  }

  return unwrapped;
}

function getPolygonArea(points) {
  const poly = unwrapPolygonLongitudes(points);
  if (poly.length < 3) return 0;

  let twiceArea = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    twiceArea += (x1 * y2) - (x2 * y1);
  }

  return Math.abs(twiceArea) * 0.5;
}

function getPolygonCenterLongitude(points) {
  const poly = unwrapPolygonLongitudes(points);
  if (!poly.length) return 0;

  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lng] of poly) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return normalizeLongitude((minLng + maxLng) * 0.5);
}

function getPolygonCenterLatitude(points) {
  if (!points || !points.length) return 0;

  let minLat = Infinity;
  let maxLat = -Infinity;

  for (const [, lat] of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  if (!Number.isFinite(minLat) || !Number.isFinite(maxLat)) return 0;
  return (minLat + maxLat) * 0.5;
}

function getWeightedCenter(polygons, anchorLng) {
  let weightedLngSum = 0;
  let weightedLatSum = 0;
  let totalArea = 0;

  for (const { area, centerLng, centerLat } of polygons) {
    let adjustedLng = centerLng;
    while (adjustedLng - anchorLng > 180) adjustedLng -= 360;
    while (adjustedLng - anchorLng < -180) adjustedLng += 360;
    weightedLngSum += adjustedLng * area;
    weightedLatSum += centerLat * area;
    totalArea += area;
  }

  if (totalArea <= 0) {
    return { lng: normalizeLongitude(anchorLng), lat: 0 };
  }

  return {
    lng: normalizeLongitude(weightedLngSum / totalArea),
    lat: weightedLatSum / totalArea,
  };
}

/**
 * Get the approximate geographic center for a country (for camera framing).
 */
export function getCountryCenter(key) {
  const data = COUNTRY_POLYGONS[key];
  if (!data) return { lng: 0, lat: 0 };
  if (Number.isFinite(data.centerLng) || Number.isFinite(data.centerLat)) {
    return {
      lng: normalizeLongitude(Number.isFinite(data.centerLng) ? data.centerLng : 0),
      lat: Number.isFinite(data.centerLat) ? data.centerLat : 0,
    };
  }

  const polygonStats = data.polygons
    .map((poly) => ({
      area: getPolygonArea(poly),
      centerLng: getPolygonCenterLongitude(poly),
      centerLat: getPolygonCenterLatitude(poly),
    }))
    .filter(({ area }) => area > 0)
    .sort((a, b) => b.area - a.area);

  if (!polygonStats.length) return { lng: 0, lat: 0 };

  const largest = polygonStats[0];
  const secondLargestArea = polygonStats[1]?.area ?? 0;

  // Countries like Russia may include tiny outlier fragments near the
  // antimeridian. If one polygon clearly dominates, use that mainland center.
  if (secondLargestArea <= 0 || (largest.area / secondLargestArea) >= 3) {
    return {
      lng: normalizeLongitude(largest.centerLng),
      lat: largest.centerLat,
    };
  }

  // Composite regions like Europe are better framed by an area-weighted
  // average across their major polygons.
  return getWeightedCenter(polygonStats, largest.centerLng);
}
