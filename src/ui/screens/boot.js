/**
 * S0 — Boot screen. Shows canvas icosahedron, then auto-transitions to SELECT.
 * Click anywhere to skip.
 */

import { STATES, transition } from '../stateMachine.js';

export function renderBoot(container) {
  const el = document.createElement('div');
  el.className = 'screen-boot';
  el.innerHTML = `
    <div class="boot-ambient"></div>
    <canvas class="boot-canvas" width="300" height="300"></canvas>
    <div class="boot-tag boot-tag-1">INITIALIZING ENGINE</div>
    <div class="boot-tag boot-tag-2">LOADING ARCHITECTURE</div>
    <div class="boot-tag boot-tag-3">CONFIGURING ENVIRONMENT</div>
    <div class="boot-tag boot-tag-4">SYSTEM ONLINE</div>
  `;
  container.appendChild(el);

  // ---- Icosahedron geometry ----
  const canvas = el.querySelector('.boot-canvas');
  const ctx = canvas.getContext('2d');
  const CX = 150, CY = 150;
  const RADIUS = 105;

  const phi = (1 + Math.sqrt(5)) / 2;
  const sc = RADIUS / Math.sqrt(1 + phi * phi);

  // 12 vertices (golden ratio construction)
  const BASE_VERTS = [
    [-1,  phi, 0], [ 1,  phi, 0], [-1, -phi, 0], [ 1, -phi, 0],
    [ 0, -1,  phi], [ 0,  1,  phi], [ 0, -1, -phi], [ 0,  1, -phi],
    [ phi, 0, -1], [ phi, 0,  1], [-phi, 0, -1], [-phi, 0,  1],
  ].map(([x, y, z]) => [x * sc, y * sc, z * sc]);

  // 20 triangular faces
  const FACES = [
    [0,11,5],[0,5,1],[0,1,7],[0,7,10],[0,10,11],
    [1,5,9],[5,11,4],[11,10,2],[10,7,6],[7,1,8],
    [3,9,4],[3,4,2],[3,2,6],[3,6,8],[3,8,9],
    [4,9,5],[2,4,11],[6,2,10],[8,6,7],[9,8,1],
  ];

  const AMBER = new Set([3, 14]);

  const ASSEMBLE_MS  = 1600;
  const FACE_STAGGER =   80; // ms between face starts
  const FACE_BUILD   =  220; // ms per face assembly

  let yaw = 0;
  let startTime = null;
  let rafId = null;

  // Rotate vertices: yaw around Y axis, then pitch around X axis
  function rotateVerts(verts, yaw, pitch) {
    const cy = Math.cos(yaw),  sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    return verts.map(([x, y, z]) => {
      const x1 = x * cy  - z  * sy;
      const z1 = x * sy  + z  * cy;
      const y2 = y * cp  - z1 * sp;
      const z2 = y * sp  + z1 * cp;
      return [x1, y2, z2];
    });
  }

  function project(v, scale) {
    return [CX + v[0] * scale, CY - v[1] * scale];
  }

  function drawCoreGlow() {
    const g1 = ctx.createRadialGradient(CX, CY, 0, CX, CY, 42);
    g1.addColorStop(0, 'rgba(0,140,170,0.18)');
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, 300, 300);

    const g2 = ctx.createRadialGradient(CX, CY, 0, CX, CY, 20);
    g2.addColorStop(0, 'rgba(160,110,30,0.08)');
    g2.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g2;
    ctx.fillRect(0, 0, 300, 300);
  }

  function drawLayer(verts3d, scale, isInnerCore, assemblyElapsed) {
    const pts = verts3d.map(v => project(v, scale));

    const zMin = Math.min(...verts3d.map(v => v[2]));
    const zMax = Math.max(...verts3d.map(v => v[2]));
    const zRange = zMax - zMin || 1;

    // Depth-sort faces back to front (painter's algorithm)
    const sorted = FACES.map((f, fi) => ({
      fi, f,
      z: (verts3d[f[0]][2] + verts3d[f[1]][2] + verts3d[f[2]][2]) / 3,
    })).sort((a, b) => a.z - b.z);

    for (const { fi, f, z } of sorted) {
      const [p0, p1, p2] = [pts[f[0]], pts[f[1]], pts[f[2]]];
      const zNorm = (z - zMin) / zRange; // 0=back 1=front

      if (isInnerCore) {
        // Inner core: edges only, uniform ghost stroke
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.closePath();
        ctx.strokeStyle = 'rgba(0,160,185,0.10)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        continue;
      }

      // Outer structure — per-face assembly
      const faceStart = fi * FACE_STAGGER;
      const rawFT = (assemblyElapsed - faceStart) / FACE_BUILD;
      const fT = Math.max(0, Math.min(1, rawFT));
      if (fT <= 0) continue;

      // Lock-in flicker near end of assembly (fT 0.85–1.0)
      let flicker = 0;
      if (fT > 0.85 && fT < 1.0) {
        flicker = Math.sin(((fT - 0.85) / 0.15) * Math.PI) * 0.12;
      }

      const baseAlpha = 0.08 + 0.22 * zNorm + flicker;

      // Face fill
      const fillOpacity = fT;
      if (AMBER.has(fi)) {
        ctx.fillStyle = `rgba(180,130,40,${(0.25 * fillOpacity).toFixed(3)})`;
      } else {
        ctx.fillStyle = `rgba(0,70,90,${(0.025 * fillOpacity).toFixed(4)})`;
      }
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.closePath();
      ctx.fill();

      // Phase 1 (fT < 0.4): partial — only 2 edges, building in
      if (fT < 0.4) {
        const edgeFrac = fT / 0.4;
        ctx.lineWidth = 0.7;
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]);
        ctx.strokeStyle = `rgba(0,180,200,${(baseAlpha * edgeFrac).toFixed(3)})`;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]);
        ctx.strokeStyle = `rgba(0,180,200,${(baseAlpha * edgeFrac * 0.6).toFixed(3)})`;
        ctx.stroke();
        continue;
      }

      // Phase 2 (fT >= 0.4): complete triangle + optional centroid lattice
      ctx.lineWidth = 0.7;
      if (AMBER.has(fi)) {
        ctx.strokeStyle = `rgba(180,130,40,${Math.min(1, baseAlpha * 1.5).toFixed(3)})`;
      } else {
        ctx.strokeStyle = `rgba(0,180,200,${baseAlpha.toFixed(3)})`;
      }
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1]);
      ctx.lineTo(p1[0], p1[1]);
      ctx.lineTo(p2[0], p2[1]);
      ctx.closePath();
      ctx.stroke();

      // Centroid lattice lines when fully assembled
      if (fT >= 1.0) {
        const lcx = (p0[0] + p1[0] + p2[0]) / 3;
        const lcy = (p0[1] + p1[1] + p2[1]) / 3;
        ctx.strokeStyle = 'rgba(0,160,185,0.06)';
        ctx.lineWidth = 0.5;
        for (const pt of [p0, p1, p2]) {
          ctx.beginPath();
          ctx.moveTo(lcx, lcy);
          ctx.lineTo(pt[0], pt[1]);
          ctx.stroke();
        }
      }
    }
  }

  function frame(ts) {
    if (!startTime) startTime = ts;
    const elapsed = ts - startTime;

    ctx.clearRect(0, 0, 300, 300);
    drawCoreGlow();

    yaw += 0.003;
    const pitch = 0.28 + Math.sin(elapsed * 0.0002) * 0.07;

    const assemblyProgress = Math.min(1, elapsed / ASSEMBLE_MS);
    const assemblyElapsed  = elapsed; // raw ms, compared per-face

    // Vertex perturbation: decays 4px → 0 as assembly completes
    const perturbStrength = 4 * (1 - assemblyProgress);

    let outerVerts = rotateVerts(BASE_VERTS, yaw, pitch);
    if (perturbStrength > 0.01) {
      const t = elapsed * 0.004;
      outerVerts = outerVerts.map((v, i) => {
        const d = Math.sin(t + i * 1.3) * perturbStrength;
        return [v[0] + d, v[1] + d * 0.5, v[2]];
      });
    }

    // Inner core: 55% scale, offset yaw +0.384 rad, 0.7× speed
    const innerVerts = rotateVerts(BASE_VERTS, yaw * 0.7 + 0.384, pitch * 0.7);
    drawLayer(innerVerts, 0.55, true,  assemblyElapsed);
    drawLayer(outerVerts, 1.0,  false, assemblyElapsed);

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  // ---- Exit logic ----
  let done = false;
  let autoTimer;

  function exit() {
    if (done) return;
    done = true;
    clearTimeout(autoTimer);
    cancelAnimationFrame(rafId);
    rafId = null;
    el.classList.add('fade-out');
    setTimeout(() => {
      el.remove();
      transition(STATES.WIZARD);
    }, 500);
  }

  el.addEventListener('click', exit, { once: true });
  autoTimer = setTimeout(exit, 2500);
}
