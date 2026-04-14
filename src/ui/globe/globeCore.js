/**
 * Three.js globe — scene setup, camera, renderer, animation loop.
 */

import * as THREE from 'three';

let scene, camera, renderer, globeDisplayGroup, spinGroup, tiltGroup, globeGroup;
let animationId = null;
let autoRotate = true;

// Constants
const AUTO_ROTATE_SPEED = 0.00125;
const DRAG_SENSITIVITY = 0.005;
const CAMERA_SENSITIVITY = 0.003; // vertical drag moves camera arc, not globe body
const MAX_CAMERA_ARC = Math.PI / 2.77; // Approximately ±65° elevation range
const DAMPING = 0.90;
const VELOCITY_THRESHOLD = 0.0001;
const PRESENTATION_TILT = THREE.MathUtils.degToRad(6);

// Rotation state — yaw only; globe body never tilts
let rotY = 0;         // unbounded spin around Y axis
let velY = 0;
let isDragging = false;
let lastPointerX = 0;
let lastPointerY = 0;
let targetRotY = null; // set by rotateToCountry(); null = free mode
let targetCameraArcX = null; // set by rotateToCountry(); null = free mode

// Camera elevation arc — vertical reframing without globe tilt
let cameraArcX = 0;

function applyRotation() {
  spinGroup.rotation.y = rotY;
}

function applyCameraArc() {
  const r = 700;
  camera.position.set(0, r * Math.sin(cameraArcX), r * Math.cos(cameraArcX));
  camera.lookAt(0, 0, 0);
}

export function initGlobe(container) {
  scene = new THREE.Scene();

  const w = container.clientWidth;
  const h = container.clientHeight;

  camera = new THREE.PerspectiveCamera(45, w / h, 1, 2000);
  cameraArcX = 0;
  applyCameraArc();

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  // Presentation-layer wrapper for small visual framing tilt.
  globeDisplayGroup = new THREE.Group();
  globeDisplayGroup.rotation.x = PRESENTATION_TILT;
  scene.add(globeDisplayGroup);

  // Geographic rotation group (used by rotateToCountry/drag/auto-rotate).
  spinGroup = new THREE.Group();
  globeDisplayGroup.add(spinGroup);
  tiltGroup = new THREE.Group();
  spinGroup.add(tiltGroup);
  globeGroup = tiltGroup; // alias for getGlobeGroup() callers

  // Handle resize
  const ro = new ResizeObserver(() => {
    const nw = container.clientWidth;
    const nh = container.clientHeight;
    camera.aspect = nw / nh;
    camera.updateProjectionMatrix();
    renderer.setSize(nw, nh);
  });
  ro.observe(container);

  return { scene, camera, renderer, globeGroup };
}

export function getGlobeGroup() { return globeGroup; }
export function getScene() { return scene; }

export function startAnimation() {
  if (animationId) return;
  function loop() {
    animationId = requestAnimationFrame(loop);

    if (!isDragging) {
      if (Math.abs(velY) > VELOCITY_THRESHOLD) {
        // Momentum phase — spin only
        rotY += velY;
        velY *= DAMPING;
        applyRotation();
      } else if (targetRotY !== null || targetCameraArcX !== null) {
        // rotateToCountry easing — spin + vertical reframing
        if (targetRotY !== null) {
          rotY += (targetRotY - rotY) * 0.05;
          if (Math.abs(targetRotY - rotY) < 0.01) { rotY = targetRotY; targetRotY = null; }
        }
        if (targetCameraArcX !== null) {
          cameraArcX += (targetCameraArcX - cameraArcX) * 0.08;
          if (Math.abs(targetCameraArcX - cameraArcX) < 0.005) {
            cameraArcX = targetCameraArcX;
            targetCameraArcX = null;
          }
          applyCameraArc();
        }
        applyRotation();
      } else {
        // Auto-rotate — spin only
        if (autoRotate) rotY += AUTO_ROTATE_SPEED;
        applyRotation();
      }
    }

    renderer.render(scene, camera);
  }
  loop();
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

export function setupInteraction(container) {
  const canvas = renderer.domElement;

  canvas.addEventListener('pointerdown', (e) => {
    isDragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    velY = 0;
    targetRotY = null;
    targetCameraArcX = null;
    canvas.setPointerCapture(e.pointerId);
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;

    // Horizontal drag — spin globe by longitude
    velY = dx * DRAG_SENSITIVITY;
    rotY += velY;

    // Vertical drag — arc camera up/down without tilting the globe body
    cameraArcX -= dy * CAMERA_SENSITIVITY;
    cameraArcX = Math.max(-MAX_CAMERA_ARC, Math.min(MAX_CAMERA_ARC, cameraArcX));
    applyCameraArc();

    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    applyRotation();
  });

  canvas.addEventListener('pointerup', () => {
    isDragging = false;
  });

  canvas.addEventListener('pointercancel', () => {
    isDragging = false;
    velY = 0;
  });
}

export function rotateToCountry(center) {
  const lng = typeof center === 'number' ? center : center?.lng ?? 0;
  const lat = typeof center === 'number' ? 0 : center?.lat ?? 0;

  // Rotate globe so the country is roughly centered horizontally.
  targetRotY = -THREE.MathUtils.degToRad(lng) - Math.PI / 2;

  // Reframe vertically by moving the camera along its elevation arc.
  // The camera arc is intentionally shallower than a 1:1 latitude mapping
  // so high-latitude countries still feel natural on the globe.
  const latFraction = THREE.MathUtils.clamp(lat / 90, -1, 1);
  targetCameraArcX = THREE.MathUtils.clamp(latFraction * (MAX_CAMERA_ARC * 0.95), -MAX_CAMERA_ARC, MAX_CAMERA_ARC);
}

export function disposeGlobe() {
  stopAnimation();
  if (renderer) {
    renderer.dispose();
    renderer.domElement.remove();
  }
}
