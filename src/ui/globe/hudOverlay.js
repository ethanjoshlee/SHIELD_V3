/**
 * HUD overlay — concentric rings and decorative elements around the globe.
 * Black Ops-style targeting reticle aesthetic.
 */

import * as THREE from 'three';

const GLOBE_RADIUS = 180;

/**
 * Create a ring geometry as a line loop.
 */
function createRing(radius, segments, color, opacity) {
  const points = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    points.push(new THREE.Vector3(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      0
    ));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
  });
  return new THREE.Line(geometry, material);
}

/**
 * Create tick marks on a ring.
 */
function createTicks(radius, count, tickLength, color, opacity) {
  const points = [];
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    points.push(
      new THREE.Vector3(cos * radius, sin * radius, 0),
      new THREE.Vector3(cos * (radius + tickLength), sin * (radius + tickLength), 0)
    );
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity,
  });
  return new THREE.LineSegments(geometry, material);
}

/**
 * Add HUD overlay elements to the scene (not to globeGroup, so they don't rotate).
 */
export function createHudOverlay(scene) {
  const hudGroup = new THREE.Group();

  // Outer ring
  const ring1 = createRing(GLOBE_RADIUS + 10, 128, '#00d4ff', 0.15);
  hudGroup.add(ring1);

  // Middle ring
  const ring2 = createRing(GLOBE_RADIUS + 20, 128, '#00d4ff', 0.08);
  hudGroup.add(ring2);

  // Outer decorative ring
  const ring3 = createRing(GLOBE_RADIUS + 35, 128, '#ffaa00', 0.06);
  hudGroup.add(ring3);

  // Tick marks on outer ring
  const ticks = createTicks(GLOBE_RADIUS + 8, 72, 4, '#00d4ff', 0.12);
  hudGroup.add(ticks);

  // Major tick marks
  const majorTicks = createTicks(GLOBE_RADIUS + 6, 12, 8, '#00d4ff', 0.2);
  hudGroup.add(majorTicks);

  // Position HUD to face camera
  hudGroup.position.z = 1; // Slightly in front
  scene.add(hudGroup);

  return hudGroup;
}
