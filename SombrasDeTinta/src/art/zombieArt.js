// La Horda: siluetas asimétricas y encorvadas, hombros desalineados, jirones orgánicos,
// tinta sucia con sombreado cruzado y paleta fría desaturada (gris carbón, verde cadáver).
import { INK, TAU, poly, blob, ellipse, circle, line, tatter, glow, shade, rgba, beginArt, hatchPoly, flame, skull, star } from './ink.js';

let ZF = 0; // fotograma activo: 0–3 paso, 4 ataque
import { limb } from './heroArt.js';

const SKIN = '#7a8a74', SKIN2 = '#5e6a5a', CLOTH = '#3a3e44', CLOTH2 = '#4a4e48', RAG = '#5a5a52', BLOOD = '#4a0e0c';

// polígono + sombreado cruzado (tinta sucia)
function zp(ctx, pts, fill, lw = 3, hatch = 4) {
  poly(ctx, pts, fill, lw, 0.8);
  if (hatch) hatchPoly(ctx, pts, hatch, 'rgba(8,10,12,0.5)', 1, true, 0.4);
}

function rags(ctx, x1, y1, x2, y2, n, depth, fill, seed) {
  const p = [x1, y1 - 6, x2, y2 - 6];
  tatter(p, x2, y2, x1, y1, n, depth, seed);
  zp(ctx, p, fill, 2.5, 5);
}

function clawHand(ctx, x, y, dir, skin = SKIN) {
  blob(ctx, [x - 6, y - 2, x, y - 7, x + 6, y - 2, x + 4, y + 5, x - 4, y + 5], skin, 2.2, 0);
  ctx.lineCap = 'round';
  for (let i = -1; i <= 1; i++) {
    ctx.strokeStyle = INK; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(x + dir * 3, y + i * 3); ctx.lineTo(x + dir * 12, y + i * 4 + 4); ctx.stroke();
    ctx.strokeStyle = skin; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x + dir * 3, y + i * 3); ctx.lineTo(x + dir * 12, y + i * 4 + 4); ctx.stroke();
  }
}

function zhead(ctx, x, y, s = 1, tilt = 0.3, eye = '#d8e8b0', skin = SKIN) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
  const pts = [-12, -2, -10, -15, 4, -18, 13, -8, 12, 8, 4, 16, -6, 15, -12, 8];
  zp(ctx, pts, skin, 3, 4);
  poly(ctx, [-7, 5, 7, 4, 6, 12, -6, 12], '#1a0a08', 2, 0);
  ctx.fillStyle = '#c8c0a0';
  for (let i = -5; i <= 4; i += 3) ctx.fillRect(i, 5, 2, 3);
  ctx.fillStyle = '#0a0a0a';
  ctx.beginPath(); ctx.ellipse(-5, -4, 3.5, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5, -5, 2.6, 3.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = eye; ctx.fillRect(-6, -5, 2, 2); ctx.fillRect(4, -6, 2, 2);
  ctx.restore();
}


// ================================================================== RIG ANATÓMICO 2D (cel-shading de cómic)
// Siluetas claras: extremidades en cápsulas de tinta con articulaciones limpias, sombra plana en el lado
// izquierdo/inferior (luz desde arriba a la derecha) y contorno negro uniforme. Mirando a la derecha.
// Fotogramas: 0–3 paso · 4 ataque. El impacto lo resuelve el render (destello blanco + retroceso).
function rgPath(ctx, pts) {
  ctx.beginPath();
  for (let i = 0; i < pts.length; i += 2) i ? ctx.lineTo(pts[i], pts[i + 1]) : ctx.moveTo(pts[i], pts[i + 1]);
  ctx.closePath();
}
// Polígono con sombra plana recortada y contorno de tinta limpio.
export function cel(ctx, pts, fill, lw = 2.6, cut = 0.4) {
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (let i = 0; i < pts.length; i += 2) { const x = pts[i], y = pts[i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  rgPath(ctx, pts); ctx.fillStyle = fill; ctx.fill();
  if (cut > 0) {
    ctx.save(); ctx.clip();
    const h = y1 - y0, cx = x0 + (x1 - x0) * cut;
    ctx.fillStyle = shade(fill, -0.3);
    ctx.beginPath(); ctx.moveTo(x0 - 4, y0 - 4); ctx.lineTo(cx + h * 0.22, y0 - 4); ctx.lineTo(cx - h * 0.22, y1 + 4); ctx.lineTo(x0 - 4, y1 + 4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,248,230,0.16)'; // brillo del borde iluminado
    ctx.beginPath(); ctx.moveTo(x1 + 4, y0 - 4); ctx.lineTo(x1 - (x1 - x0) * 0.12, y0 - 4); ctx.lineTo(x1 - (x1 - x0) * 0.12 - h * 0.1, y1 + 4); ctx.lineTo(x1 + 4, y1 + 4); ctx.closePath(); ctx.fill();
    ctx.restore();
    rgPath(ctx, pts);
  }
  ctx.lineJoin = 'round'; ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.stroke();
}
// Cadena de cápsulas (muslo+espinilla, brazo+antebrazo): articulaciones redondas sin costuras.
function chainP(ctx, P) { ctx.beginPath(); ctx.moveTo(P[0], P[1]); for (let i = 2; i < P.length; i += 2) ctx.lineTo(P[i], P[i + 1]); }
export function capsule(ctx, P, w, fill) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  chainP(ctx, P); ctx.strokeStyle = INK; ctx.lineWidth = w * 2 + 5; ctx.stroke();
  ctx.strokeStyle = fill; ctx.lineWidth = w * 2; ctx.stroke();
  ctx.save(); ctx.translate(-w * 0.4, w * 0.32); chainP(ctx, P); ctx.strokeStyle = shade(fill, -0.3); ctx.lineWidth = w * 0.9; ctx.stroke(); ctx.restore();
}
function claws(ctx, x, y, a, skin) { // mano con tres garras orientadas según el antebrazo
  const ca = Math.cos(a), sa = Math.sin(a);
  ctx.lineCap = 'round';
  for (let k = -1; k <= 1; k++) {
    const ex = x + ca * 11 - sa * k * 5, ey = y + sa * 11 + ca * k * 5;
    ctx.strokeStyle = INK; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
    ctx.strokeStyle = skin; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.fillStyle = skin; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, 5, 0, TAU); ctx.fill(); ctx.stroke();
}
function shoe(ctx, x, y, bare, skin) {
  if (bare) cel(ctx, [x - 7, y - 7, x + 9, y - 6, x + 13, y - 1, x + 13, y, x - 7, y], skin, 2.2, 0.5);
  else cel(ctx, [x - 8, y - 9, x + 6, y - 9, x + 14, y - 3, x + 14, y, x - 8, y], '#241c18', 2.2, 0.5);
}
// Cráneo de no-muerto con mandíbula articulada (open 0–1), cuenca brillante y rasgos marcados.
function zSkull(ctx, x, y, s, tilt, o) {
  const skin = o.skin, open = o.open || 0;
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt); ctx.scale(s, s);
  // boca oscura detrás de la mandíbula
  if (open > 0) cel(ctx, [-2, 2, 14, 0, 14, 6 + open * 8, 0, 8 + open * 6], '#1a0606', 1.8, 0);
  // mandíbula inferior (bisagra en la oreja)
  ctx.save(); ctx.translate(-3, 3); ctx.rotate(open * 0.55);
  cel(ctx, [0, 0, 16, -1, 15, 5, 8, 9, 1, 7], shade(skin, -0.12), 2.2, 0.3);
  ctx.fillStyle = '#d8ccb0'; for (let i = 0; i < 4; i++) ctx.fillRect(4 + i * 3, -1, 2, 2.4);
  ctx.restore();
  // cráneo: nuca, bóveda, ceja marcada, nariz, maxilar
  cel(ctx, [-12, 2, -12, -10, -6, -17, 5, -18, 12, -12, 14, -6, 16, -1, 13, 2, 4, 4, -4, 5], skin, 2.6, 0.42);
  ctx.fillStyle = '#d8ccb0'; for (let i = 0; i < 4; i++) ctx.fillRect(5 + i * 2.6, 1.5, 1.8, 2.6); // dientes superiores
  // cuenca y pupila brillante
  ctx.fillStyle = '#0a0605'; ctx.beginPath(); ctx.ellipse(7, -7, 4.2, 3.4, -0.2, 0, TAU); ctx.fill();
  glow(ctx, 8, -7, 8, o.eye, 0.95); ctx.fillStyle = o.eye; ctx.fillRect(7, -8, 2.6, 2.2);
  ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(1, -12); ctx.lineTo(13, -10); ctx.stroke(); // ceja
  ctx.fillStyle = '#0a0605'; ctx.beginPath(); ctx.moveTo(14, -4); ctx.lineTo(16, -1); ctx.lineTo(12.5, -1); ctx.fill(); // fosa nasal
  cel(ctx, [-6, -6, -1, -8, 0, -2, -4, 0], shade(skin, -0.08), 1.6, 0); // oreja
  if (o.hair) { ctx.strokeStyle = o.hair; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-8 + i * 4, -15 - (i % 2)); ctx.quadraticCurveTo(-12 + i * 3, -24, -16 + i * 3, -18 - i); } ctx.stroke(); }
  if (o.scar) { ctx.strokeStyle = '#5a1a12'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-2, -15); ctx.lineTo(4, -4); for (let k = 0; k < 3; k++) { ctx.moveTo(-1 + k * 2, -12 + k * 3); ctx.lineTo(3 + k * 2, -13 + k * 3); } ctx.stroke(); }
  if (o.hat) o.hat(ctx);
  ctx.restore();
}

// Humanoide no-muerto parametrizable (errante, corredor, hinchado, acorazado, horquero, dinamitero).
function zHuman(ctx, o) {
  const f = ZF, atk = f === 4, ph = (f / 4) * TAU;
  const hipY = o.hipY, th = o.thigh, sh = o.shin, lw = o.legW;
  // --- piernas: cinemática simple (ángulo del muslo + flexión de rodilla al levantar)
  const legPose = (front) => {
    let a, bend;
    if (atk) { a = front ? 0.42 : -0.5; bend = front ? 0.35 : 0.1; }
    else { const phi = ph + (front ? 0 : Math.PI); a = Math.sin(phi) * o.stride; bend = 0.15 + 0.6 * Math.max(0, Math.cos(phi)); }
    const kx = Math.sin(a) * th, ky = -hipY + Math.cos(a) * th;
    const fx = kx + Math.sin(a - bend) * sh, fy = ky + Math.cos(a - bend) * sh;
    return [front ? 4 : -4, -hipY, kx + (front ? 4 : -4), ky, fx + (front ? 4 : -4), Math.min(0, fy) - 6]; // termina en el tobillo
  };
  const LB = legPose(false), LF = legPose(true);
  const lean = o.lean + (atk ? 0.18 : 0), tl = o.torso, cw = o.chest, ww = o.waist;
  const sway = atk ? 0 : Math.cos(ph);
  // pierna trasera (más oscura)
  capsule(ctx, LB, lw, shade(o.pants, -0.18)); shoe(ctx, LB[4], LB[5] + 6, o.bareB, o.skin2);
  if (o.backItem) o.backItem(ctx, lean);
  // marco del torso
  ctx.save(); ctx.translate(0, -hipY); ctx.rotate(lean);
  // brazo lejano (detrás del torso)
  const armFar = o.arms(ctx, false, atk, sway, tl, cw);
  ctx.restore();
  capsule(ctx, LF, lw, o.pants); shoe(ctx, LF[4], LF[5] + 6, o.bareF, o.skin);
  if (o.legRags) { const p = [LF[2] - 8, LF[3] - 2, LF[2] + 8, LF[3] - 2]; tatter(p, LF[2] + 8, LF[3] + 7, LF[2] - 8, LF[3] + 7, 3, 6, 5); cel(ctx, p, o.pants, 2, 0); }
  ctx.save(); ctx.translate(0, -hipY); ctx.rotate(lean);
  // torso con pecho y cintura definidos
  const tor = [-ww, 6, ww, 6, cw + 2, -tl * 0.5, cw - 2, -tl, -cw + 2, -tl - 2, -cw - 2, -tl * 0.5];
  cel(ctx, tor, o.shirt, 2.8, 0.42);
  if (o.torsoFx) o.torsoFx(ctx, tl, cw, ww, atk);
  // cuello y cráneo (la cara mira al frente aunque el cuerpo vaya encorvado)
  const hx = cw * 0.45 + 4, hy = -tl - 10 * o.head;
  capsule(ctx, [2, -tl + 2, hx - 4, hy + 6], 3.6, o.skin2);
  zSkull(ctx, hx, hy, o.head, -lean * 0.7 + (o.tilt || 0) + (atk ? -0.15 : 0), { skin: o.skin, eye: o.eye, open: atk ? 1 : (o.jaw || 0.15), hair: o.hair, scar: o.scar, hat: o.hat });
  // brazo cercano (delante)
  o.arms(ctx, true, atk, sway, tl, cw);
  ctx.restore();
}
// Poses de brazos (en el marco rotado del torso; y negativo = arriba)
function armsReach(skinN, skinF, sleeve) { // brazos adelantados tanteando el aire
  return (ctx, near, atk, sway, tl, cw) => {
    const sx = near ? cw * 0.35 : -cw * 0.3, sy = -tl + 6;
    const sw = near ? sway : -sway, up = atk ? -0.55 : -0.05 + sw * 0.08, L = atk ? 1.18 : 1;
    const ex = sx + Math.cos(up) * 24 * L, ey = sy + Math.sin(up) * 24 * L + 6;
    const hx = ex + Math.cos(up - 0.1) * 24 * L, hy = ey + Math.sin(up - 0.1) * 24 * L;
    capsule(ctx, [sx, sy, ex, ey], 5.4, near ? sleeve : shade(sleeve, -0.2));
    capsule(ctx, [ex, ey, hx, hy], 4.6, near ? skinN : skinF);
    claws(ctx, hx, hy, up - 0.1, near ? skinN : skinF);
  };
}
function armsSwing(skinN, skinF) { // carrera: brazos que barren adelante y atrás
  return (ctx, near, atk, sway, tl, cw) => {
    const sx = near ? cw * 0.3 : -cw * 0.25, sy = -tl + 6;
    const a = atk ? (near ? -0.9 : -0.6) : (near ? 1 : -1) * sway * 0.9;
    const ex = sx + Math.sin(a + 0.3) * 22, ey = sy + Math.cos(a + 0.3) * 22;
    const hx = ex + Math.sin(a + 1.5) * 20, hy = ey + Math.cos(a + 1.5) * 20 * (atk ? -0.3 : 1);
    capsule(ctx, [sx, sy, ex, ey, hx, hy], 4.4, near ? skinN : skinF);
    claws(ctx, hx, hy, Math.atan2(hy - ey, hx - ex), near ? skinN : skinF);
  };
}

const ZPAL = {
  walker: { skin: '#a6b496', skin2: '#7e8c70', shirt: '#9a8c72', pants: '#3e3c48', eye: '#f2ffb0', hair: '#2a2a26' },
  runner: { skin: '#b8b090', skin2: '#8a8466', shirt: '#8a8466', pants: '#46404a', eye: '#ffe0a0', hair: '#3a2a1a' },
  bloater: { skin: '#94a672', skin2: '#6e7e52', shirt: '#7a7a5a', pants: '#3a3a30', eye: '#d8ff6a' },
  armored: { skin: '#9c9c8c', skin2: '#76766a', shirt: '#4a4640', pants: '#33333a', eye: '#ffd27a' },
  forker: { skin: '#aa9678', skin2: '#86735a', shirt: '#8a6a4a', pants: '#3a4a5e', eye: '#ffb070' },
  dynamiter: { skin: '#9aa092', skin2: '#76806e', shirt: '#5a4a3a', pants: '#3a3430', eye: '#ffd27a' },
};

// ------------------------------------------------------------------ ERRANTE (encorvado, ropa rasgada, brazos adelantados)
function walker(ctx) {
  const P = ZPAL.walker;
  zHuman(ctx, {
    ...P, hipY: 70, thigh: 34, shin: 34, legW: 6.2, stride: 0.42, lean: 0.32, torso: 50, chest: 17, waist: 13, head: 1, bareF: true, legRags: true, jaw: 0.25, scar: true,
    arms: armsReach(P.skin, P.skin2, P.shirt),
    torsoFx(c, tl, cw) { // chaleco abierto, desgarrón con costillas y sangre seca
      cel(c, [-cw - 1, -tl * 0.5, -cw + 2, -tl - 1, -4, -tl - 1, -6, 4, -13, 4], '#2e2a2c', 2.2, 0);
      cel(c, [cw - 6, -tl, cw + 1, -tl * 0.5, 13, 4, 7, 4], '#2e2a2c', 2.2, 0);
      cel(c, [-1, -tl * 0.75, 8, -tl * 0.78, 9, -tl * 0.35, 0, -tl * 0.32], P.skin2, 1.8, 0);
      c.strokeStyle = '#3a4234'; c.lineWidth = 1.4; c.beginPath(); for (let i = 0; i < 3; i++) { c.moveTo(1, -tl * 0.7 + i * 6); c.lineTo(8, -tl * 0.72 + i * 6); } c.stroke();
      c.fillStyle = '#6a0e0c'; c.fillRect(9, -tl * 0.4, 4, 8);
      const r = [-13, 2, 13, 2]; tatter(r, 13, 12, -13, 12, 5, 7, 3); cel(c, r, P.shirt, 2, 0);
    },
  });
}

// ------------------------------------------------------------------ CORREDOR (delgado, muy inclinado, zancada larga)
function runner(ctx) {
  const P = ZPAL.runner;
  zHuman(ctx, {
    ...P, hipY: 76, thigh: 38, shin: 38, legW: 5.4, stride: 0.8, lean: 0.62, torso: 46, chest: 13, waist: 10, head: 0.92, bareB: true, legRags: true, jaw: 0.6,
    arms: armsSwing(P.skin, P.skin2),
    torsoFx(c, tl, cw) { // torso descarnado con costillas y camisa colgando de un hombro
      c.strokeStyle = '#4a4630'; c.lineWidth = 1.5; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(-cw + 3, -tl * 0.85 + i * 7); c.quadraticCurveTo(0, -tl * 0.9 + i * 7, cw - 2, -tl * 0.82 + i * 7); } c.stroke();
      const s = [-cw - 2, -tl, 4, -tl - 1, -2, -tl * 0.55]; tatter(s, -2, -tl * 0.55, -cw - 3, -tl * 0.15, 3, 6, 11); cel(c, s, '#6a5a44', 2, 0);
    },
  });
}

// ------------------------------------------------------------------ HINCHADO (vientre de gas, piernas cortas)
function bloater(ctx) {
  const P = ZPAL.bloater;
  zHuman(ctx, {
    ...P, hipY: 54, thigh: 26, shin: 26, legW: 7.4, stride: 0.3, lean: 0.06, torso: 64, chest: 22, waist: 20, head: 0.82, jaw: 0.1,
    arms: (c, near, atk, sway, tl, cw) => {
      const sx = near ? cw * 0.5 : -cw * 0.4, sy = -tl + 8, up = atk ? -0.3 : 0.6 + (near ? sway : -sway) * 0.12;
      const hx = sx + Math.cos(up) * 26, hy = sy + Math.sin(up) * 26;
      capsule(c, [sx, sy, hx, hy], 5.6, near ? P.skin : P.skin2); claws(c, hx, hy, up, near ? P.skin : P.skin2);
    },
    torsoFx(c, tl, cw) { // panza que revienta la camisa, pústulas de gas
      const bx = 8, by = -tl * 0.42;
      c.save(); c.beginPath(); c.ellipse(bx, by, 34, 30, 0, 0, TAU); c.fillStyle = P.skin; c.fill(); c.clip();
      c.fillStyle = shade(P.skin, -0.3); c.beginPath(); c.ellipse(bx - 18, by + 10, 30, 30, 0, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,230,0.2)'; c.beginPath(); c.ellipse(bx + 14, by - 14, 10, 6, -0.5, 0, TAU); c.fill(); c.restore();
      c.strokeStyle = INK; c.lineWidth = 2.8; c.beginPath(); c.ellipse(bx, by, 34, 30, 0, 0, TAU); c.stroke();
      c.strokeStyle = '#5a6a3a'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(bx - 6, by - 26); c.quadraticCurveTo(bx + 4, by - 6, bx - 4, by + 24); c.moveTo(bx + 10, by - 24); c.quadraticCurveTo(bx + 18, by, bx + 12, by + 22); c.stroke();
      for (const [x, y, r] of [[bx - 10, by - 6, 4], [bx + 14, by + 8, 5], [bx + 2, by + 18, 3.4]]) { glow(c, x, y, r * 4, '#9dff3a', 0.65); circle(c, x, y, r, '#c8ff6a', 1.4); }
      cel(c, [-cw, -tl, cw, -tl, cw - 6, -tl * 0.7, -cw + 4, -tl * 0.72], P.shirt, 2.2, 0.3); // jirón de camisa sobre los hombros
    },
  });
}

// ------------------------------------------------------------------ ACORAZADO (peto de hierro, olla por casco, puerta de horno por escudo)
function armored(ctx) {
  const P = ZPAL.armored;
  zHuman(ctx, {
    ...P, hipY: 68, thigh: 33, shin: 33, legW: 7.4, stride: 0.32, lean: 0.14, torso: 54, chest: 22, waist: 17, head: 1,
    arms: (c, near, atk, sway, tl, cw) => {
      const sx = near ? cw * 0.4 : -cw * 0.3, sy = -tl + 8;
      if (near) { // sostiene la puerta de horno delante
        const ex = sx + 14, ey = sy + 18, hx = ex + 14 + (atk ? 10 : 0), hy = ey - 4;
        capsule(c, [sx, sy, ex, ey, hx, hy], 6, P.skin);
        cel(c, [hx - 2, hy - 30, hx + 14, hy - 32, hx + 16, hy + 26, hx, hy + 28], '#4a4640', 2.8, 0.3);
        for (const yy of [-20, 0, 18]) circle(c, hx + 7, hy + yy, 2.2, '#8a8478', 1);
        c.fillStyle = 'rgba(150,70,30,0.45)'; c.fillRect(hx + 3, hy - 10, 8, 6);
      } else { const up = atk ? -0.5 : 0.1 - sway * 0.08; const ex = sx + Math.cos(up) * 24, ey = sy + Math.sin(up) * 24 + 4; capsule(c, [sx, sy, ex, ey, ex + 22, ey - 2], 6, P.skin2); claws(c, ex + 22, ey - 2, 0, P.skin2); }
    },
    torsoFx(c, tl, cw) {
      cel(c, [-cw + 2, -tl + 2, cw - 1, -tl + 4, cw + 1, -tl * 0.32, -cw, -tl * 0.3], '#6a665e', 2.6, 0.35); // peto
      for (const [x, y] of [[-cw + 6, -tl + 8], [cw - 6, -tl + 8], [-cw + 6, -tl * 0.4], [cw - 6, -tl * 0.4]]) circle(c, x, y, 2.4, '#9a958a', 1);
      c.fillStyle = 'rgba(140,60,24,0.4)'; c.fillRect(-6, -tl * 0.7, 12, 5);
    },
    hat(c) { cel(c, [-14, -10, 14, -12, 16, -2, -14, 0], '#4a4640', 2.4, 0.4); line(c, 14, -10, 26, -14, INK, 4); line(c, 14, -10, 26, -14, '#6a665e', 2); },
  });
}

// ------------------------------------------------------------------ HORQUERO (granjero con horca: estocada al atacar)
function forker(ctx) {
  const P = ZPAL.forker;
  zHuman(ctx, {
    ...P, hipY: 72, thigh: 35, shin: 35, legW: 6.4, stride: 0.4, lean: 0.24, torso: 50, chest: 17, waist: 14, head: 1, legRags: true, jaw: 0.2,
    arms: (c, near, atk, sway, tl, cw) => {
      const thrust = atk ? 22 : sway * 2;
      const hNear = [36 + thrust, -tl * 0.45], hFar = [10 + thrust, -tl * 0.5];
      const sx = near ? cw * 0.35 : -cw * 0.3, sy = -tl + 6, h = near ? hNear : hFar;
      if (!near) { // la horca va entre los dos brazos
        c.lineCap = 'round'; const x0 = -30 + thrust, y0 = -tl * 0.2, x1 = 78 + thrust, y1 = -tl * 0.72;
        c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
        c.strokeStyle = '#7a5430'; c.lineWidth = 3.6; c.stroke();
        for (let k = -1; k <= 1; k++) { c.strokeStyle = INK; c.lineWidth = 4; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + 18, y1 - 4 + k * 7); c.stroke(); c.strokeStyle = '#a8a8a0'; c.lineWidth = 1.8; c.stroke(); }
      }
      const ex = (sx + h[0]) / 2 - 2, ey = (sy + h[1]) / 2 + 10;
      capsule(c, [sx, sy, ex, ey], 5.4, near ? P.shirt : shade(P.shirt, -0.2));
      capsule(c, [ex, ey, h[0], h[1]], 4.6, near ? P.skin : P.skin2);
      c.fillStyle = near ? P.skin : P.skin2; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.arc(h[0], h[1], 5.2, 0, TAU); c.fill(); c.stroke();
    },
    torsoFx(c, tl, cw) { // peto vaquero con tirantes
      cel(c, [-cw + 3, -tl * 0.62, cw - 2, -tl * 0.6, cw, 6, -cw + 1, 6], P.pants, 2.2, 0.35);
      line(c, -cw + 5, -tl * 0.6, -cw + 8, -tl, INK, 3.6); line(c, -cw + 5, -tl * 0.6, -cw + 8, -tl, P.pants, 2);
      line(c, cw - 4, -tl * 0.6, cw - 6, -tl, INK, 3.6); line(c, cw - 4, -tl * 0.6, cw - 6, -tl, P.pants, 2);
      circle(c, -cw + 5, -tl * 0.6, 1.8, '#c9a54a', 1); circle(c, cw - 4, -tl * 0.6, 1.8, '#c9a54a', 1);
    },
    hat(c) { // sombrero de paja roto
      cel(c, [-20, -12, 22, -14, 18, -10, -18, -8], '#b89a5a', 2.2, 0.3);
      const cr = [-10, -12, -8, -24, 8, -26, 12, -14]; cel(c, cr, '#a88a4a', 2.2, 0.35);
      c.strokeStyle = 'rgba(60,40,10,0.6)'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 4; i++) { c.moveTo(-6 + i * 4, -24); c.lineTo(-7 + i * 4, -14); } c.stroke();
    },
  });
}

// ------------------------------------------------------------------ DINAMITERO (minero con cartucho encendido en alto)
function dynamiter(ctx) {
  const P = ZPAL.dynamiter;
  zHuman(ctx, {
    ...P, hipY: 70, thigh: 34, shin: 34, legW: 6.2, stride: 0.5, lean: 0.2, torso: 50, chest: 17, waist: 13, head: 0.96, jaw: 0.35,
    arms: (c, near, atk, sway, tl, cw) => {
      const sx = near ? cw * 0.35 : -cw * 0.3, sy = -tl + 6;
      if (near) { // brazo alzado con el cartucho
        const ex = sx + 12, ey = sy - 18 - (atk ? 8 : 0), hx = ex + 6, hy = ey - 20 - (atk ? 8 : 0);
        capsule(c, [sx, sy, ex, ey, hx, hy], 4.8, P.skin);
        cel(c, [hx - 3, hy - 22, hx + 4, hy - 22, hx + 4, hy + 2, hx - 3, hy + 2], '#c4281c', 2, 0.3);
        line(c, hx, hy - 22, hx + 3, hy - 30, '#d8c6a3', 1.6);
        glow(c, hx + 3, hy - 31, atk ? 26 : 16, '#ffb02a', 1); star(c, hx + 3, hy - 31, atk ? 6 : 4, 6, '#ffe08a', 1);
        c.fillStyle = P.skin; c.strokeStyle = INK; c.lineWidth = 2; c.beginPath(); c.arc(hx, hy, 5, 0, TAU); c.fill(); c.stroke();
      } else { const up = atk ? -0.4 : 0.15 - sway * 0.1, ex = sx + Math.cos(up) * 22, ey = sy + Math.sin(up) * 22 + 6; capsule(c, [sx, sy, ex, ey, ex + 20, ey], 4.6, P.skin2); claws(c, ex + 20, ey, 0, P.skin2); }
    },
    torsoFx(c, tl, cw) { // bandolera de cartuchos
      c.save(); c.translate(0, -tl * 0.5); c.rotate(-0.7);
      cel(c, [-tl * 0.6, -4, tl * 0.6, -4, tl * 0.6, 4, -tl * 0.6, 4], '#2a2420', 1.8, 0);
      for (let i = -3; i <= 3; i++) cel(c, [i * 7 - 2.5, -6, i * 7 + 2.5, -6, i * 7 + 2.5, 6, i * 7 - 2.5, 6], '#a8281c', 1.4, 0);
      c.restore();
    },
    hat(c) { // casco de minero con vela
      cel(c, [-12, -12, -10, -22, 8, -24, 14, -14], '#5a4a2a', 2.4, 0.4);
      cel(c, [-16, -12, 18, -14, 16, -10, -14, -9], '#4a3a20', 2, 0);
      line(c, 6, -24, 6, -32, '#e8dcc0', 3); glow(c, 6, -34, 12, '#ffd27a', 1);
    },
  });
}

// ------------------------------------------------------------------ CUADRÚPEDOS (sabueso de tinta, mascotas perro/gato)
// Anatomía lateral: pecho profundo, cintura recogida, cruz y grupa, patas delanteras (codo/muñeca) y traseras
// (rodilla/corvejón), cuello, cráneo con hocico y mandíbula articulada. 4 fotogramas de galope + ataque.
function quadLeg(ctx, x, y, phi, hind, far, len, w, fill, atk, front) {
  let a = Math.sin(phi) * 0.55, lift = Math.max(0, Math.cos(phi));
  if (atk) { a = front ? 0.95 : -0.75; lift = front ? 0.6 : 0; }
  const c = far ? shade(fill, -0.22) : fill;
  if (hind) {
    const kx = x + Math.sin(a + 0.35) * len * 0.42, ky = y + Math.cos(a + 0.35) * len * 0.42;
    const hx = kx + Math.sin(a - 0.75 - lift * 0.4) * len * 0.38, hy = ky + Math.cos(a - 0.75 - lift * 0.4) * len * 0.38;
    const px = hx + Math.sin(a + 0.25) * len * 0.3, py = Math.min(0, hy + Math.cos(a + 0.25) * len * 0.3);
    capsule(ctx, [x, y, kx, ky, hx, hy, px, py], w, c);
    cel(ctx, [px - 3, py - 4, px + 8, py - 4, px + 9, py, px - 3, py], shade(c, -0.1), 1.8, 0);
  } else {
    const ex = x + Math.sin(a) * len * 0.45, ey = y + Math.cos(a) * len * 0.45;
    const wx = ex + Math.sin(a - lift * 0.9) * len * 0.45, wy = ey + Math.cos(a - lift * 0.9) * len * 0.45;
    const px = wx + 3, py = Math.min(0, wy + len * 0.08);
    capsule(ctx, [x, y, ex, ey, wx, wy, px, py], w, c);
    cel(ctx, [px - 3, py - 4, px + 8, py - 4, px + 9, py, px - 3, py], shade(c, -0.1), 1.8, 0);
  }
}
export function quadRig(ctx, f, o) {
  const atk = f === 4, ph = (f / 4) * TAU, L = o.len || 1, H = o.height || 1;
  const bob = atk ? -3 : -Math.abs(Math.sin(ph)) * 2.5;
  ctx.save(); ctx.translate(0, bob); if (atk) ctx.rotate(0.08);
  const sx = 24 * L, sy = -46 * H, hx = -30 * L, hy = -50 * H, legLen = 48 * H;
  // patas lejanas
  quadLeg(ctx, hx, hy, ph + Math.PI + 0.6, true, true, legLen, o.legW, o.body, atk, false);
  quadLeg(ctx, sx, sy, ph + 0.6, false, true, legLen, o.legW, o.body, atk, true);
  // cola
  if (o.tail) o.tail(ctx, ph, L, H, atk);
  // cuerpo: cruz, lomo, grupa, muslo, vientre recogido, pecho profundo
  const body = [44 * L, -66 * H, 18 * L, -70 * H, -12 * L, -64 * H, -40 * L, -64 * H, -50 * L, -54 * H, -42 * L, -40 * H, -16 * L, -44 * H, 10 * L, -38 * H, 32 * L, -36 * H, 46 * L, -50 * H];
  cel(ctx, body, o.body, 2.8, 0.45);
  if (o.bodyFx) o.bodyFx(ctx, L, H);
  // patas cercanas
  quadLeg(ctx, hx + 4, hy + 2, ph + Math.PI, true, false, legLen, o.legW, o.body, atk, false);
  quadLeg(ctx, sx + 4, sy + 2, ph, false, false, legLen, o.legW, o.body, atk, true);
  // cuello y cabeza
  const nx = 46 * L, ny = -64 * H, hdx = (atk ? 64 : 58) * L, hdy = (atk ? -66 : -76) * H;
  cel(ctx, [nx - 10, ny + 12, nx - 4, ny - 6, hdx - 4, hdy - 8, hdx + 2, hdy + 6, nx + 6, ny + 14], o.body, 2.6, 0.4);
  ctx.save(); ctx.translate(hdx, hdy);
  const open = atk ? 1 : 0.1, mz = o.muzzle;
  if (open > 0.2) cel(ctx, [4, 2, 6 + mz, 2, 6 + mz, 6 + open * 8, 4, 8], '#1a0606', 1.6, 0);
  ctx.save(); ctx.translate(4, 4); ctx.rotate(open * 0.5); cel(ctx, [0, -2, mz + 2, -1, mz, 4, 2, 6], shade(o.head || o.body, -0.15), 2, 0.3);
  if (o.fangs) { ctx.fillStyle = '#efe2c4'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(6 + i * 6, -1); ctx.lineTo(8 + i * 6, -6); ctx.lineTo(10 + i * 6, -1); ctx.fill(); } }
  ctx.restore();
  cel(ctx, [-8, 2, -8, -10, 0, -16, 10, -15, 14, -8, 14 + mz, -6, 16 + mz, -1, 10 + mz * 0.4, 4, 2, 6], o.head || o.body, 2.6, 0.42); // cráneo + hocico
  if (o.fangs) { ctx.fillStyle = '#efe2c4'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(10 + i * 6, 3); ctx.lineTo(12 + i * 6, 9); ctx.lineTo(14 + i * 6, 3); ctx.fill(); } }
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(14 + mz, -3.5, 2.2, 1.8, 0, 0, TAU); ctx.fill(); // trufa
  o.ears(ctx);
  ctx.fillStyle = '#0a0605'; ctx.beginPath(); ctx.ellipse(6, -8, 3.4, 2.8, 0, 0, TAU); ctx.fill();
  glow(ctx, 7, -8, 9, o.eye, 1); ctx.fillStyle = o.eye; ctx.fillRect(6, -9.5, 3, 2.4);
  if (o.whiskers) { ctx.strokeStyle = 'rgba(239,226,196,0.75)'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(12 + mz, -2); ctx.lineTo(26 + mz, -5); ctx.moveTo(12 + mz, 0); ctx.lineTo(26 + mz, 1); ctx.stroke(); }
  ctx.restore();
  if (o.front) o.front(ctx, hdx, hdy, L, H);
  ctx.restore();
}

// ------------------------------------------------------------------ SABUESO DE TINTA (zig-zag, mordisco)
function hound(ctx) {
  quadRig(ctx, ZF, {
    body: '#2c3038', head: '#343842', eye: '#9ac8ff', legW: 4.4, muzzle: 18, fangs: true, len: 1.05,
    ears(c) { cel(c, [-4, -12, -2, -28, 6, -14], '#1e2026', 2, 0); },
    tail(c, ph, L, H) { capsule(c, [-48 * L, -58 * H, -66 * L, -70 * H + Math.sin(ph) * 6, -86 * L, -66 * H + Math.sin(ph) * 8], 3, '#2c3038'); },
    bodyFx(c, L, H) { // costillas al aire y lomo erizado
      c.strokeStyle = '#8a8e96'; c.lineWidth = 1.6; c.beginPath(); for (let i = 0; i < 4; i++) { const x = (-2 + i * 8) * L; c.moveTo(x, -64 * H); c.quadraticCurveTo(x + 5, -52 * H, x, -40 * H); } c.stroke();
      c.fillStyle = '#101216'; c.beginPath(); for (let i = 0; i <= 8; i++) { const x = (-40 + i * 10) * L, y = -64 * H - Math.sin((i / 8) * Math.PI) * 6; c.moveTo(x - 3, y + 2); c.lineTo(x + 1, y - 9 - (i % 2) * 4); c.lineTo(x + 4, y + 2); } c.fill();
    },
    front(c, hx, hy) { c.fillStyle = '#0a0605'; for (const [x, l] of [[hx + 10, 12], [hx + 18, 8]]) { c.beginPath(); c.ellipse(x, hy + 10 + l / 2, 1.8, l / 2, 0, 0, TAU); c.fill(); } }, // goteo de tinta
  });
}

// ------------------------------------------------------------------ ABOMINACIÓN (caparazón blindado, cuatro patas, escupe bilis)
function abomination(ctx) {
  const atk = ZF === 4, ph = (ZF / 4) * TAU;
  for (const [x, o, far] of [[-56, 0, 1], [26, Math.PI, 1], [-40, Math.PI, 0], [42, 0, 0]]) {
    const a = atk ? 0 : Math.sin(ph + o) * 0.4, kx = x + Math.sin(a) * 16 - 10, ky = -26, fx = x + Math.sin(a) * 26, fy = 0;
    capsule(ctx, [x, -44, kx, ky, fx, fy - 4], 7.5, far ? '#22261f' : '#2e342c');
    cel(ctx, [fx - 10, -8, fx + 10, -8, fx + 12, 0, fx - 12, 0], '#1a1c1a', 2, 0);
  }
  const shell = [-84, -50, -70, -110, -30, -140, 30, -142, 72, -112, 88, -52, 50, -36, -50, -36];
  cel(ctx, shell, '#4a4e48', 3.2, 0.45);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath();
  ctx.moveTo(-60, -116); ctx.quadraticCurveTo(0, -90, 62, -118); ctx.moveTo(-76, -76); ctx.quadraticCurveTo(0, -56, 80, -78); ctx.moveTo(0, -142); ctx.lineTo(0, -40); ctx.stroke();
  for (const [x, y] of [[-40, -120], [36, -122], [-56, -84], [56, -86], [-20, -66], [22, -66]]) circle(ctx, x, y, 3.2, '#9a9e96', 1.2);
  // cabeza baja con fauces (se abren al escupir)
  ctx.save(); ctx.translate(58, -54);
  if (atk) cel(ctx, [-6, 2, 30, -2, 32, 22, -4, 18], '#120606', 2, 0);
  cel(ctx, [-12, -20, 10, -26, 30, -16, 34, -4, 20, 2, -8, 4], '#5a6058', 3, 0.4);
  ctx.save(); ctx.translate(-4, 4); ctx.rotate(atk ? 0.45 : 0.05); cel(ctx, [0, 0, 32, -2, 30, 10, 4, 12], '#4a5048', 2.6, 0.3); ctx.restore();
  ctx.fillStyle = '#d8d0b8'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.moveTo(i * 6, 2); ctx.lineTo(i * 6 + 3, 8); ctx.lineTo(i * 6 + 6, 2); ctx.fill(); }
  for (const x of [6, 18]) { glow(ctx, x, -12, 10, '#b89aff', 1); ctx.fillStyle = '#e8dcff'; ctx.fillRect(x - 3, -14, 6, 3); }
  if (atk) { glow(ctx, 34, 8, 24, '#7a5aff', 0.9); }
  ctx.fillStyle = '#0a0a10'; for (const [x, l] of [[8, 18], [20, 12]]) { ctx.beginPath(); ctx.ellipse(x, 12 + l / 2, 2.4, l / 2, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

// ------------------------------------------------------------------ ARAÑA DE CRIPTA (enjambre)
// Cefalotórax y abdomen bien separados, 8 patas articuladas con marcha alterna (4 fotogramas) y ocho ojos brillantes.
function spiderLeg(ctx, bx, by, kx, ky, jx, jy, fx, fy, col) {
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.strokeStyle = INK; ctx.lineWidth = 6.5;
  ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(kx, ky); ctx.lineTo(jx, jy); ctx.lineTo(fx, fy); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 3.4; ctx.stroke();
  ctx.strokeStyle = 'rgba(220,200,190,0.28)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, by - 1); ctx.lineTo(kx, ky - 1.5); ctx.stroke();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(kx, ky, 3.2, 0, TAU); ctx.arc(jx, jy, 2.6, 0, TAU); ctx.fill();
  // pelillos del fémur
  ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.beginPath();
  for (let k = 1; k < 4; k++) { const x = bx + (kx - bx) * k / 4, y = by + (ky - by) * k / 4; ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 4); }
  ctx.stroke();
}
function spider(ctx) {
  const ph = (ZF / 4) * TAU;
  const FOOT = [46, 30, 0, -30], KNEE = [30, 16, -6, -26];
  for (const side of [-1, 1]) {
    const far = side < 0, col = far ? '#1e1a1e' : '#3a3036', dy = far ? -12 : 0;
    for (let i = 0; i < 4; i++) {
      const grp = (i + (far ? 1 : 0)) % 2, o = Math.sin(ph + grp * Math.PI), lift = Math.max(0, o) * 9;
      const bx = 10 + (1.5 - i) * 4, by = -32 + dy * 0.3;
      const fx = FOOT[i] + o * 8 + (far ? 6 : 0), fy = -2 + dy - lift * 0.4;
      const kx = KNEE[i] + o * 5, ky = -66 - (i === 0 || i === 3 ? 2 : 8) + dy * 0.5 - lift;
      const jx = (kx + fx) / 2 + (i < 2 ? 8 : -8), jy = (ky + fy) / 2 - 4;
      spiderLeg(ctx, bx, by, kx, ky, jx, jy, fx, fy, col);
    }
    if (far) {
      // abdomen (detrás) con franjas y marca de calavera de cripta
      const abd = [-56, -40, -50, -60, -30, -70, -8, -64, 2, -46, -6, -28, -28, -20, -50, -26];
      blob(ctx, abd, '#2e2630', 3.2, 0.5);
      hatchPoly(ctx, abd, 4, 'rgba(0,0,0,0.45)', 1, true, 0.42);
      ctx.strokeStyle = '#5a4a52'; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k < 3; k++) { ctx.moveTo(-46 + k * 12, -62 + k * 2); ctx.quadraticCurveTo(-40 + k * 12, -44, -46 + k * 12, -26); } ctx.stroke();
      ctx.fillStyle = 'rgba(255,240,230,0.22)'; ctx.beginPath(); ctx.ellipse(-30, -60, 12, 4, -0.2, 0, TAU); ctx.fill();
      skull(ctx, -28, -44, 0.42, '#c8b8a0', 1);
      poly(ctx, [-34, -30, -28, -36, -22, -30, -28, -24], '#9a140e', 1.2, 0); // reloj de arena de sangre
      // pedicelo y cefalotórax
      poly(ctx, [-4, -40, 6, -42, 6, -32, -4, -32], '#1a1418', 2, 0);
      blob(ctx, [2, -36, 10, -48, 26, -48, 34, -38, 30, -24, 12, -22], '#3a3036', 3, 0.5);
      hatchPoly(ctx, [2, -36, 10, -48, 26, -48, 34, -38], 3, 'rgba(0,0,0,0.35)', 1, false, 0.3);
      // quelíceros y colmillos
      poly(ctx, [28, -28, 36, -28, 38, -20, 32, -14], '#24181c', 2, 0);
      line(ctx, 34, -18, 38, -10, INK, 3); line(ctx, 34, -18, 38, -10, '#e8dcc0', 1.4);
      // ocho ojos: dos grandes y seis pequeños
      for (const [x, y, r] of [[28, -42, 3.4], [33, -40, 3]]) { glow(ctx, x, y, 10, '#ff3a2a', 0.95); circle(ctx, x, y, r, '#ff5a3a', 1.2); ctx.fillStyle = '#ffe0d0'; ctx.fillRect(x - 1, y - 2, 1.6, 1.6); }
      for (const [x, y] of [[22, -44], [24, -38], [30, -46], [35, -45], [26, -34], [32, -34]]) { ctx.fillStyle = '#ff4a3a'; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, TAU); ctx.fill(); }
    }
  }
}

// ------------------------------------------------------------------ JEFES DEL OESTE GÓTICO
// Esqueleto común bien proporcionado (≈ 8 cabezas): capa hecha jirones, abrigo largo abierto, chaleco y
// cinturón, botas con espuelas, hombreras, rostro definido, sombrero/corona, arma propia y aura de tinta.
function gBoot(ctx, x, dir) {
  poly(ctx, [x - 9, -36, x + 9, -36, x + 10, -10, x + 10 + dir * 12, -4, x + 10 + dir * 12, 0, x - 12, 0, x - 11, -14], '#1a1210', 2.6, 0.4);
  line(ctx, x - 10, -24, x + 10, -24, '#3a2a1e', 2);
  star(ctx, x - dir * 12, -6, 5, 6, '#c9a54a', 1.2);
}
function gArm(ctx, sx, sy, ex, ey, hx, hy, sleeve, skin, dir) {
  limb(ctx, sx, sy, ex, ey, 11, 9, sleeve);
  limb(ctx, ex, ey, hx, hy, 9, 7, sleeve);
  poly(ctx, [hx - 9, hy - 6, hx + 9, hy - 6, hx + 8, hy + 2, hx - 8, hy + 2], shade(sleeve, -0.25), 2, 0); // puño
  clawHand(ctx, hx + dir * 2, hy + 6, dir, skin);
}
function gothic(ctx, o) {
  const hem = o.hem || 0;
  glow(ctx, 0, -130, 170, o.aura, 0.3);
  glow(ctx, 0, -10, 90, o.aura, 0.25);
  // capa / manto detrás del cuerpo
  if (o.cape) {
    const cp = [-46, -180, 46, -180, 78, -96, 92 + hem, -4];
    tatter(cp, 92 + hem, -4, -92 - hem, -4, 14, 18, o.seed || 5); cp.push(-78, -96);
    zp(ctx, cp, o.cape, 3, 5);
    ctx.strokeStyle = rgba(o.aura, 0.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-40, -176); ctx.quadraticCurveTo(-70, -90, -84, -12); ctx.moveTo(40, -176); ctx.quadraticCurveTo(70, -90, 84, -12); ctx.stroke();
  }
  if (o.back) o.back(ctx);
  // piernas y botas
  limb(ctx, -13, -104, -16, -34, 11, 9, o.pants); limb(ctx, 13, -104, 16, -34, 11, 9, shade(o.pants, 0.08));
  gBoot(ctx, -16, -1); gBoot(ctx, 16, 1);
  if (o.lArm) gArm(ctx, -40, -170, o.lArm[0], o.lArm[1], o.lArm[2], o.lArm[3], shade(o.coat, -0.15), o.skin, -1);
  // chaleco, camisa y cinturón
  zp(ctx, [-16, -184, 16, -184, 14, -100, -14, -100], o.vest, 2.6, 3);
  for (let y = -170; y <= -116; y += 14) circle(ctx, 0, y, 2.2, '#c9a54a', 1);
  // abrigo largo: dos faldones abiertos con dobladillo hecho jirones
  for (const s of [-1, 1]) {
    const pt = [s * 6, -186, s * 42, -184, s * 50, -132, s * 58, -60];
    tatter(pt, s * (62 + hem), -10, s * 18, -14, 5, 10, (o.seed || 5) + s * 3);
    pt.push(s * 12, -100, s * 10, -150);
    zp(ctx, pt, s < 0 ? shade(o.coat, -0.1) : o.coat, 3, s < 0 ? 5 : 0);
    poly(ctx, [s * 10, -150, s * 14, -100, s * 18, -14, s * 22, -14, s * 17, -100, s * 13, -152], o.lining, 1.4, 0); // forro
    poly(ctx, [s * 6, -186, s * 24, -184, s * 12, -140], shade(o.coat, 0.18), 2.4, 0); // solapa
  }
  poly(ctx, [-32, -112, 32, -112, 30, -100, -30, -100], '#140c08', 2, 0);
  poly(ctx, [-6, -114, 6, -114, 6, -98, -6, -98], '#c9a54a', 1.6, 0);
  // hombreras
  ellipse(ctx, -40, -178, 15, 9, shade(o.coat, 0.12), 2.6);
  ellipse(ctx, 40, -178, 15, 9, shade(o.coat, 0.12), 2.6);
  if (o.weapon) o.weapon(ctx);
  if (o.rArm) gArm(ctx, 40, -170, o.rArm[0], o.rArm[1], o.rArm[2], o.rArm[3], o.coat, o.skin, 1);
  if (o.front) o.front(ctx);
  // cuello alto y cabeza
  poly(ctx, [-8, -186, 8, -186, 7, -198, -7, -198], shade(o.skin, -0.3), 2, 0);
  poly(ctx, [-20, -182, -14, -204, -6, -190], o.cape || o.coat, 2.2, 0); poly(ctx, [20, -182, 14, -204, 6, -190], o.cape || o.coat, 2.2, 0);
  o.face(ctx);
  if (o.hat) o.hat(ctx);
  // goterones de tinta en el dobladillo
  ctx.fillStyle = INK;
  for (const [x, l] of [[-50, 14], [-30, 9], [34, 12], [54, 8]]) { ctx.beginPath(); ctx.ellipse(x, -10 + l / 2, 2.4, l / 2, 0, 0, TAU); ctx.fill(); }
}
// rostros
function skullFace(ctx, skin, eye, jaw = 1) {
  const hd = [-13, -198, -15, -216, -9, -232, 9, -232, 15, -216, 13, -198, 6, -188, -6, -188];
  blob(ctx, hd, skin, 3, 0.4);
  poly(ctx, [-15, -216, -9, -232, -2, -226, -6, -200, -13, -198], shade(skin, -0.28), 0, 0); // mejilla en sombra (luz desde la derecha)
  poly(ctx, [-12, -206, -4, -204, -6, -198], shade(skin, -0.4), 0, 0); // pómulo marcado
  for (const x of [-6, 6]) { ellipse(ctx, x, -214, 4.4, 3.6, '#0a0605', 0); glow(ctx, x, -214, 9, eye, 1); ctx.fillStyle = eye; ctx.fillRect(x - 1.5, -215, 3, 2); }
  poly(ctx, [-2, -208, 2, -208, 0, -202], '#0a0605', 0, 0);
  poly(ctx, [-8, -197, 8, -197, 7, -191 + jaw * 2, -7, -191 + jaw * 2], '#1a0806', 1.6, 0);
  ctx.fillStyle = '#d8ccb0'; for (let x = -6; x <= 5; x += 3) ctx.fillRect(x, -197, 2, 3);
  line(ctx, 9, -226, 13, -210, '#3a1a14', 1.2); // cicatriz
}
function wideHat(ctx, col, band) {
  ellipse(ctx, 0, -228, 46, 9, col, 3);
  poly(ctx, [-21, -228, -18, -256, -6, -262, 6, -258, 18, -258, 21, -228], col, 3, 0.4);
  poly(ctx, [-21, -234, 21, -234, 20, -228, -20, -228], band, 1.6, 0);
  ctx.fillStyle = 'rgba(255,240,220,0.14)'; ctx.fillRect(4, -256, 10, 20);
}

function foreman(ctx) {
  const skin = '#8e9884';
  gothic(ctx, {
    seed: 23, aura: '#ffb040', cape: '#2a2420', coat: '#4a3424', lining: '#7a2a18', vest: '#2a2622', pants: '#2e2a2a', skin, hem: 6,
    lArm: [-66, -132, -70, -96],
    rArm: [60, -196, 52, -226],
    weapon(c) { // pico de minero alzado sobre el hombro
      line(c, 50, -60, 54, -264, INK, 11); line(c, 50, -60, 54, -264, '#6a4424', 6);
      poly(c, [8, -262, 40, -280, 86, -276, 112, -254, 82, -262, 54, -262, 30, -252], '#8a8a92', 3, 0.6);
      line(c, 40, -276, 100, -258, 'rgba(255,255,255,0.35)', 1.5);
    },
    front(c) { // farol de minero colgando de la mano izquierda
      line(c, -72, -90, -72, -70, INK, 2); poly(c, [-82, -70, -62, -70, -64, -44, -80, -44], '#3a2a1a', 2.4, 0);
      circle(c, -72, -58, 6, '#ffe08a', 1.6); glow(c, -72, -58, 30, '#ffb040', 0.9);
      // cadenas sobre el pecho
      c.strokeStyle = '#8a8a90'; c.lineWidth = 2.4; c.setLineDash([4, 3]); c.beginPath(); c.moveTo(-36, -176); c.quadraticCurveTo(0, -130, 36, -176); c.stroke(); c.setLineDash([]);
    },
    face(c) { skullFace(c, skin, '#ffd27a', 1.5); c.fillStyle = 'rgba(30,26,22,0.6)'; for (let i = 0; i < 14; i++) c.fillRect(-10 + (i * 7) % 20, -196 + (i % 3) * 3, 1.4, 1.4); },
    hat(c) { // casco de minero con lámpara
      blob(c, [-18, -222, -16, -244, 0, -252, 16, -244, 18, -222], '#5a4a2a', 3, 0.4);
      ellipse(c, 0, -222, 26, 6, '#4a3a20', 2.6);
      circle(c, 0, -238, 7, '#ffe08a', 2); glow(c, 0, -238, 46, '#ffd27a', 0.9);
    },
  });
}

function faceless(ctx) {
  const skin = '#dcd8cc';
  gothic(ctx, {
    seed: 31, aura: '#a88aff', cape: '#1a1420', coat: '#1e1c24', lining: '#5a2a7a', vest: '#121016', pants: '#16141a', skin, hem: 10,
    back(c) { // halo de hierro con púas detrás de la cabeza
      c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.arc(0, -220, 40, 0, TAU); c.stroke();
      c.strokeStyle = '#6a5a8a'; c.lineWidth = 3; c.stroke();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * TAU; poly(c, [Math.cos(a - 0.08) * 40, -220 + Math.sin(a - 0.08) * 40, Math.cos(a) * 56, -220 + Math.sin(a) * 56, Math.cos(a + 0.08) * 40, -220 + Math.sin(a + 0.08) * 40], '#2a2236', 1.6, 0); }
      glow(c, 0, -220, 70, '#a88aff', 0.5);
    },
    lArm: [-70, -200, -78, -232],
    rArm: [64, -140, 70, -110],
    weapon(c) { // báculo con cruz invertida
      line(c, 72, -20, 70, -250, INK, 9); line(c, 72, -20, 70, -250, '#3a2a40', 5);
      line(c, 56, -76, 86, -76, INK, 8); line(c, 56, -76, 86, -76, '#3a2a40', 4);
      glow(c, 70, -250, 22, '#a88aff', 0.9); circle(c, 70, -250, 6, '#e0d0ff', 2);
    },
    front(c) { // himnario abierto que brilla en la mano alzada
      poly(c, [-104, -252, -80, -246, -56, -254, -56, -234, -80, -228, -104, -234], '#e8dcc0', 2.4, 0);
      line(c, -80, -246, -80, -228, INK, 2);
      c.strokeStyle = 'rgba(40,20,60,0.6)'; c.lineWidth = 1; c.beginPath(); for (let i = 0; i < 3; i++) { c.moveTo(-100, -246 + i * 5); c.lineTo(-84, -244 + i * 5); c.moveTo(-76, -244 + i * 5); c.lineTo(-60, -248 + i * 5); } c.stroke();
      glow(c, -80, -242, 40, '#c8b8ff', 0.8);
    },
    face(c) { // óvalo liso sin rostro con lágrimas de tinta
      blob(c, [-13, -196, -15, -218, -8, -234, 8, -234, 15, -218, 13, -196, 6, -186, -6, -186], skin, 3, 0.2);
      poly(c, [-15, -218, -8, -234, -2, -228, -6, -196, -13, -196], 'rgba(60,50,80,0.25)', 0, 0);
      c.fillStyle = INK; for (const x of [-6, 6]) { c.beginPath(); c.ellipse(x, -212, 3.4, 1.6, 0, 0, TAU); c.fill(); c.fillRect(x - 1, -212, 2, 20); c.beginPath(); c.arc(x, -191, 2.2, 0, TAU); c.fill(); }
      line(c, -6, -196, 6, -196, 'rgba(10,6,5,0.6)', 1.2);
    },
    hat(c) { // sombrero plano de predicador
      ellipse(c, 0, -232, 48, 8, '#0e0c12', 3);
      poly(c, [-19, -232, -19, -250, 19, -250, 19, -232], '#0e0c12', 3, 0);
      poly(c, [-19, -238, 19, -238, 19, -234, -19, -234], '#5a2a7a', 1.2, 0);
    },
  });
}

function plague(ctx) {
  const skin = '#9aa290';
  gothic(ctx, {
    seed: 37, aura: '#9dff3a', cape: '#1e2218', coat: '#2a2e22', lining: '#5a1a10', vest: '#1a1c14', pants: '#1e2018', skin, hem: 8,
    lArm: [-66, -150, -60, -122],
    rArm: [64, -150, 66, -118],
    weapon(c) {
      line(c, -62, -20, -56, -248, INK, 8); line(c, -62, -20, -56, -248, '#4a3a24', 4); // bastón
      poly(c, [-66, -248, -46, -248, -50, -262, -62, -262], '#3a3a2a', 2, 0);
      line(c, 66, -112, 84, -84, '#6a6a60', 1.5); circle(c, 86, -80, 9, '#5a5a4a', 2.5); // incensario
      glow(c, 86, -80, 32, '#9dff3a', 0.85);
    },
    front(c) { // estola con cruces invertidas
      poly(c, [-14, -184, -6, -184, -10, -96, -18, -96], '#6a1a10', 2, 0); poly(c, [14, -184, 6, -184, 10, -96, 18, -96], '#6a1a10', 2, 0);
      for (const y of [-160, -132, -110]) { line(c, -12, y, -12, y + 10, '#e8dcc0', 1.6); line(c, -16, y + 6, -8, y + 6, '#e8dcc0', 1.6); }
    },
    face(c) { // máscara de pico de médico de la peste
      blob(c, [-13, -198, -15, -218, -9, -232, 9, -232, 15, -218, 13, -198, 6, -188, -6, -188], '#2a2a22', 3, 0.4);
      poly(c, [8, -214, 52, -198, 48, -192, 8, -200], '#d8ccb0', 3, 0.5);
      line(c, 12, -206, 46, -196, 'rgba(60,40,20,0.5)', 1.2);
      for (const x of [-5, 6]) { circle(c, x, -216, 5, '#1a2a12', 2); glow(c, x, -216, 10, '#9dff3a', 1); c.fillStyle = '#d8ff9a'; c.fillRect(x - 1, -217, 2, 2); }
    },
    hat(c) { wideHat(c, '#14140e', '#4a5a2a'); },
  });
}

// El Engendro de la Mina: minero colosal no-muerto, encorvado; el fardo de DINAMITA va a la espalda
// (lado izquierdo del sprite) y es su punto débil cuando se le rodea.
function spawn(ctx) {
  const skin = '#7e8676';
  ctx.save(); ctx.scale(1.18, 1);
  gothic(ctx, {
    seed: 41, aura: '#ff8a2a', cape: null, coat: '#3a3028', lining: '#5a2a18', vest: '#2a2420', pants: '#2a2622', skin, hem: 4,
    back(c) {
      // fardo de dinamita atado a la espalda, con mechas
      for (let i = 0; i < 7; i++) poly(c, [-84 + i * 7, -186, -78 + i * 7, -186, -78 + i * 7, -124, -84 + i * 7, -124], '#c4281c', 2, 0.3);
      poly(c, [-88, -172, -32, -172, -32, -164, -88, -164], '#2a2a2a', 2, 0); poly(c, [-88, -146, -32, -146, -32, -138, -88, -138], '#2a2a2a', 2, 0);
      for (let i = 0; i < 7; i++) line(c, -81 + i * 7, -186, -79 + i * 7 + (i % 2) * 3, -198, '#d8c6a3', 1.5);
      glow(c, -60, -160, 46, '#ff8a2a', 0.75);
    },
    lArm: [-62, -126, -58, -86],
    rArm: [70, -160, 92, -124],
    weapon(c) { // brazo-pico
      line(c, 88, -40, 98, -230, INK, 11); line(c, 88, -40, 98, -230, '#5a3a1e', 6);
      poly(c, [62, -230, 98, -246, 136, -232, 112, -220, 96, -224], '#7a7a82', 3, 0.6);
    },
    front(c) { // vetas de mineral y caras de mineros atrapados en el pecho
      for (const [x, y] of [[-22, -150], [20, -130]]) { star(c, x, y, 7, 4, '#c8d0e0', 1.4); glow(c, x, y, 12, '#c8d0e0', 0.4); }
      zhead(c, -30, -124, 0.55, -0.4, '#ffd27a', '#6a7462');
    },
    face(c) {
      skullFace(c, skin, '#ffd27a', 2);
      poly(c, [-14, -202, 14, -202, 12, -188, -12, -188], '#7a1a12', 2, 0); // pañuelo sobre la boca
    },
    hat(c) { // casco fundido con dos faroles
      blob(c, [-20, -222, -18, -246, 0, -254, 18, -246, 20, -222], '#5a4a2a', 3, 0.4);
      ellipse(c, 0, -222, 28, 6, '#4a3a20', 2.6);
      for (const x of [-8, 8]) { circle(c, x, -238, 5, '#ffe08a', 1.8); glow(c, x, -238, 22, '#ffd27a', 1); }
    },
  });
  ctx.restore();
}

// La Bestia de la Ciénaga: señor-caimán erguido, manto de musgo, corona de huesos y arpón.
function beast(ctx) {
  const skin = '#5a6a48';
  gothic(ctx, {
    seed: 47, aura: '#9dff3a', cape: '#2a3a22', coat: '#3a4630', lining: '#6a7a3a', vest: '#2a2a1e', pants: '#2a3424', skin, hem: 14,
    lArm: [-68, -140, -76, -104],
    rArm: [62, -194, 64, -222],
    weapon(c) { // arpón de pantano
      line(c, 64, -30, 66, -280, INK, 9); line(c, 64, -30, 66, -280, '#5a4a2a', 5);
      poly(c, [58, -280, 66, -306, 74, -280, 70, -284, 66, -272, 62, -284], '#9a9aa2', 2.4, 0);
      line(c, 62, -270, 56, -262, INK, 3); line(c, 70, -270, 76, -262, INK, 3);
    },
    front(c) { // musgo colgante sobre los hombros
      c.strokeStyle = '#6a7a3a'; c.lineWidth = 3; c.beginPath();
      for (let i = 0; i < 8; i++) { const x = -42 + i * 12; c.moveTo(x, -182); c.quadraticCurveTo(x + 5, -160, x - 2, -140 - (i % 3) * 8); } c.stroke();
    },
    face(c) { // cabeza de caimán con fauces
      blob(c, [-14, -196, -16, -218, -6, -232, 10, -230, 16, -214, 12, -196], skin, 3, 0.5);
      poly(c, [8, -226, 58, -222, 64, -212, 12, -208], shade(skin, 0.1), 3, 0.5);
      poly(c, [10, -206, 58, -208, 60, -198, 12, -196], shade(skin, -0.1), 3, 0.5);
      c.fillStyle = '#1a0806'; c.beginPath(); c.moveTo(12, -208); c.lineTo(60, -212); c.lineTo(58, -206); c.lineTo(12, -202); c.fill();
      c.fillStyle = '#e8e0c0'; for (let i = 0; i < 6; i++) { const x = 18 + i * 7; c.beginPath(); c.moveTo(x, -210); c.lineTo(x + 2.5, -204); c.lineTo(x + 5, -210); c.fill(); }
      glow(c, 2, -222, 12, '#ffe02a', 1); c.fillStyle = '#fff060'; c.beginPath(); c.ellipse(2, -222, 4.5, 3, -0.2, 0, TAU); c.fill(); c.fillStyle = INK; c.fillRect(1, -225, 2, 6);
      for (let i = 0; i < 4; i++) poly(c, [-12 + i * 6, -230, -9 + i * 6, -238, -6 + i * 6, -230], shade(skin, -0.2), 1.2, 0);
    },
    hat(c) { // corona de huesos
      for (let i = -2; i <= 2; i++) { const x = i * 8; poly(c, [x - 4, -232, x, -252 - (2 - Math.abs(i)) * 6, x + 4, -232], '#d8ccb0', 2, 0); }
      poly(c, [-20, -234, 20, -234, 18, -228, -18, -228], '#3a2a1a', 2, 0);
      glow(c, 0, -244, 20, '#9dff3a', 0.6);
    },
  });
}

const DRAW_Z = { walker, runner, bloater, armored, forker, dynamiter, hound, spider, abomination, foreman, faceless, beast, plague, spawn };

export const Z_BOX = {
  walker: { w: 210, h: 190, cy: 0.9, s: 0.31 }, runner: { w: 200, h: 170, cy: 0.9, s: 0.31 }, bloater: { w: 220, h: 190, cy: 0.9, s: 0.32 },
  armored: { w: 200, h: 190, cy: 0.9, s: 0.32 }, forker: { w: 260, h: 200, cy: 0.9, s: 0.3 }, dynamiter: { w: 210, h: 210, cy: 0.9, s: 0.3 },
  hound: { w: 230, h: 150, cy: 0.9, s: 0.3 }, spider: { w: 180, h: 110, cy: 0.86, s: 0.31 }, abomination: { w: 200, h: 170, cy: 0.9, s: 0.62 },
  foreman: { w: 300, h: 330, cy: 0.94, s: 0.56 }, plague: { w: 280, h: 300, cy: 0.94, s: 0.56 }, spawn: { w: 360, h: 300, cy: 0.94, s: 0.58 },
  faceless: { w: 300, h: 320, cy: 0.94, s: 0.58 }, beast: { w: 300, h: 340, cy: 0.94, s: 0.56 },
};
// tipos con fotogramas de animación (marcha)
export const Z_ANIM = { walker: 4, runner: 4, bloater: 4, armored: 4, forker: 4, dynamiter: 4, hound: 4, spider: 4, abomination: 4 };
// tipos con fotograma de ataque (índice 4): zarpazo, mordisco, estocada, mecha o escupitajo
export const Z_ATK = { walker: 1, runner: 1, bloater: 1, armored: 1, forker: 1, dynamiter: 1, hound: 1, abomination: 1 };

export function drawZombie(ctx, type, detail = 0, seed = 77, frame = 0) {
  beginArt(seed, detail);
  ZF = frame;
  DRAW_Z[type](ctx);
  ZF = 0;
}
