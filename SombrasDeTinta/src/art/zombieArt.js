// La Horda: siluetas asimétricas y encorvadas, hombros desalineados, jirones orgánicos,
// tinta sucia con sombreado cruzado y paleta fría desaturada (gris carbón, verde cadáver).
import { INK, poly, blob, ellipse, circle, line, tatter, glow, shade, rgba, beginArt, hatchPoly, flame, skull } from './ink.js';
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

function legsZ(ctx, cloth, lean = 0) {
  limb(ctx, -10 + lean, -76, -16, -6, 8, 6, cloth);
  limb(ctx, 10 + lean, -74, 14, -10, 8, 6, cloth);
  poly(ctx, [-26, -8, -8, -8, -8, 0, -28, 0], '#2a2a2a', 2.5, 0);
  poly(ctx, [6, -12, 22, -12, 26, 0, 6, 0], '#2a2a2a', 2.5, 0);
}

// ------------------------------------------------------------------ ERRANTE (encorvado, hombro caído)
function walker(ctx) {
  legsZ(ctx, CLOTH, 4);
  const torso = [-24, -128, 18, -120, 26, -96, 20, -70, -16, -72, -28, -100];
  zp(ctx, torso, CLOTH2);
  rags(ctx, -18, -74, 22, -70, 6, 12, RAG, 3);
  zp(ctx, [-10, -126, 8, -122, 4, -100, -6, -96], SKIN2, 2, 3); // pecho al aire
  ctx.fillStyle = BLOOD; ctx.fillRect(-4, -112, 6, 10);
  // brazo izquierdo colgando largo, derecho extendido
  limb(ctx, -24, -122, -36, -76, 7, 6, SKIN);
  clawHand(ctx, -38, -72, -1);
  limb(ctx, 18, -118, 52, -112, 7, 6, CLOTH2);
  limb(ctx, 52, -112, 70, -104, 6, 5, SKIN);
  clawHand(ctx, 74, -102, 1);
  zhead(ctx, 8, -136, 1, 0.45);
  // hombro desalineado: un mechón y una oreja menos
  line(ctx, -2, -150, -14, -160, '#2a2a28', 2);
}

// ------------------------------------------------------------------ CORREDOR (delgado, inclinado hacia delante)
function runner(ctx) {
  limb(ctx, -6, -70, -26, -8, 6, 5, CLOTH);
  limb(ctx, 6, -70, 24, -24, 6, 5, CLOTH); limb(ctx, 24, -24, 30, -2, 5, 4, CLOTH);
  ctx.save(); ctx.translate(0, -70); ctx.rotate(0.45);
  const torso = [-12, -58, 14, -54, 12, -4, -10, 0];
  zp(ctx, torso, SKIN2, 3, 3);
  rags(ctx, -12, -2, 12, -4, 4, 8, RAG, 9);
  limb(ctx, 10, -50, 36, -24, 5, 4, SKIN); clawHand(ctx, 40, -22, 1);
  limb(ctx, -8, -50, 26, -40, 5, 4, SKIN); clawHand(ctx, 30, -38, 1);
  zhead(ctx, 6, -66, 0.9, 0.9, '#e8f0c0');
  ctx.restore();
}

// ------------------------------------------------------------------ HINCHADO (vientre de gas)
function bloater(ctx) {
  legsZ(ctx, CLOTH, 0);
  const belly = [-36, -110, -10, -132, 26, -128, 44, -96, 40, -64, 10, -52, -26, -58, -42, -80];
  blob(ctx, belly, '#6a7a5a', 3, 0.8);
  hatchPoly(ctx, belly, 5, 'rgba(8,10,12,0.4)', 1, false, 0.5);
  for (const [x, y] of [[-10, -96], [16, -80], [2, -70]]) { glow(ctx, x, y, 16, '#9dff3a', 0.6); circle(ctx, x, y, 4, '#b8ff6a', 1.5); }
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i < 6; i++) { ctx.moveTo(-20 + i * 8, -60); ctx.lineTo(-16 + i * 8, -54); }
  ctx.moveTo(-22, -57); ctx.lineTo(24, -57); ctx.stroke();
  limb(ctx, -34, -104, -48, -76, 7, 6, SKIN); clawHand(ctx, -50, -72, -1);
  limb(ctx, 36, -106, 54, -86, 7, 6, SKIN); clawHand(ctx, 56, -82, 1);
  zhead(ctx, 0, -140, 0.95, -0.2);
}

// ------------------------------------------------------------------ ACORAZADO (placas de hierro, olla por casco)
function armored(ctx) {
  legsZ(ctx, CLOTH, 2);
  const torso = [-26, -126, 22, -122, 28, -94, 22, -70, -20, -72, -30, -98];
  zp(ctx, torso, CLOTH2);
  poly(ctx, [-22, -120, 18, -116, 20, -84, -20, -86], '#5a5650', 3, 0.8);
  for (const [x, y] of [[-16, -114], [12, -112], [-16, -90], [14, -88]]) circle(ctx, x, y, 2.4, '#8a8478', 1);
  ctx.fillStyle = 'rgba(120,60,30,0.5)'; ctx.fillRect(-10, -106, 14, 6);
  rags(ctx, -20, -72, 24, -70, 5, 10, RAG, 13);
  limb(ctx, -26, -120, -40, -84, 8, 7, SKIN); clawHand(ctx, -42, -80, -1);
  limb(ctx, 22, -118, 46, -100, 8, 7, SKIN); clawHand(ctx, 50, -98, 1);
  poly(ctx, [-50, -84, -40, -84, -40, -36, -50, -36], '#4a4640', 2.5, 0.5); // escudo de puerta de horno
  zhead(ctx, 4, -136, 1, 0.2);
  poly(ctx, [-14, -146, 20, -150, 22, -138, -14, -134], '#4a4640'); // olla-casco
  line(ctx, 20, -146, 32, -150, INK, 4);
}

// ------------------------------------------------------------------ HORQUERO (horca improvisada)
function forker(ctx) {
  legsZ(ctx, CLOTH, -2);
  const torso = [-22, -124, 20, -120, 24, -94, 18, -70, -18, -70, -26, -98];
  zp(ctx, torso, '#46403a');
  poly(ctx, [-10, -124, 10, -124, 4, -96, -4, -96], '#5a4a3a', 2, 0);
  rags(ctx, -18, -70, 20, -70, 5, 12, RAG, 17);
  // horca
  line(ctx, -40, -40, 70, -140, INK, 7); line(ctx, -40, -40, 70, -140, '#6a4a2a', 3.5);
  ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath();
  for (let i = -1; i <= 1; i++) { ctx.moveTo(66 + i * 6, -136 - i * 2); ctx.lineTo(80 + i * 8, -156 - i * 4); }
  ctx.stroke(); ctx.strokeStyle = '#8a8a82'; ctx.lineWidth = 2; ctx.stroke();
  limb(ctx, -20, -118, -6, -90, 7, 6, SKIN); clawHand(ctx, -4, -86, 1);
  limb(ctx, 18, -118, 36, -104, 7, 6, SKIN); clawHand(ctx, 38, -102, 1);
  zhead(ctx, -2, -136, 1, -0.35);
  poly(ctx, [-20, -146, 16, -150, 10, -158, -12, -156], '#5a4a2a', 2.5, 0.5); // sombrero de paja roto
}

// ------------------------------------------------------------------ DINAMITERO (mecha encendida)
function dynamiter(ctx) {
  legsZ(ctx, CLOTH, 6);
  const torso = [-20, -124, 22, -118, 26, -92, 20, -70, -16, -72, -24, -100];
  zp(ctx, torso, CLOTH2);
  for (let i = 0; i < 4; i++) poly(ctx, [-14 + i * 7, -116, -8 + i * 7, -116, -8 + i * 7, -88, -14 + i * 7, -88], '#a8281c', 2, 0.3);
  poly(ctx, [-18, -104, 20, -104, 20, -98, -18, -98], '#2a2a2a', 0, 0);
  line(ctx, 0, -116, 6, -128, '#c8b890', 1.5);
  glow(ctx, 6, -130, 16, '#ffb02a', 1);
  rags(ctx, -16, -72, 22, -70, 5, 10, RAG, 19);
  limb(ctx, -20, -118, -44, -110, 6, 5, SKIN); clawHand(ctx, -48, -108, -1);
  limb(ctx, 20, -116, 46, -126, 6, 5, SKIN); clawHand(ctx, 50, -128, 1);
  zhead(ctx, 10, -134, 0.95, 0.6, '#ffd27a');
}

// ------------------------------------------------------------------ COLOSOS
function foreman(ctx) {
  legsZ(ctx, '#2a2a2c', 0);
  limb(ctx, -24, -80, -34, -6, 14, 12, '#2a2a2c'); limb(ctx, 24, -80, 30, -6, 14, 12, '#2a2a2c');
  const torso = [-62, -170, 50, -176, 74, -120, 58, -76, -50, -76, -72, -126];
  zp(ctx, torso, '#3e4038', 3.5, 5);
  poly(ctx, [-40, -160, -4, -164, -8, -86, -44, -88], '#2a2622', 3, 0.5);
  poly(ctx, [40, -164, 4, -164, 8, -86, 44, -88], '#2a2622', 3, 0.5);
  for (let i = 0; i < 5; i++) poly(ctx, [-30 + i * 12, -150, -24 + i * 12, -150, -24 + i * 12, -112, -30 + i * 12, -112], '#8a2018', 2, 0.3);
  rags(ctx, -50, -76, 58, -76, 10, 16, '#4a4a42', 23);
  // brazo izquierdo enorme con pico de hierro
  limb(ctx, -62, -160, -90, -110, 16, 14, '#6a7462'); clawHand(ctx, -94, -104, -1, '#6a7462');
  line(ctx, -96, -40, -88, -200, INK, 12); line(ctx, -96, -40, -88, -200, '#5a3a1e', 7);
  poly(ctx, [-138, -196, -100, -214, -60, -206, -30, -184, -70, -194, -100, -192, -124, -178], '#6a6a72', 3.5, 0.8);
  limb(ctx, 50, -168, 76, -120, 14, 12, '#6a7462'); clawHand(ctx, 80, -114, 1, '#6a7462');
  zhead(ctx, -4, -186, 1.5, 0.15, '#ffd27a', '#6a7462');
  poly(ctx, [-24, -200, -20, -222, 0, -230, 20, -222, 24, -200], '#5a4a2a');
  poly(ctx, [-32, -202, 32, -202, 28, -194, -28, -194], '#3a2e1a', 2.5, 0);
  circle(ctx, 0, -218, 6, '#ffe08a', 2); glow(ctx, 0, -218, 40, '#ffd27a', 0.9);
}

function faceless(ctx) {
  glow(ctx, 0, -110, 120, '#6a5a8a', 0.25);
  const robe = [-22, -176, 22, -176, 50, -80, 62, -2];
  tatter(robe, 62, -2, -62, -2, 12, 16, 31); robe.push(-50, -80);
  zp(ctx, robe, '#1e1c22', 3, 6);
  poly(ctx, [-14, -176, 14, -176, 10, -110, -10, -110], '#2a2830', 2.5, 0.4);
  poly(ctx, [-8, -176, 8, -176, 5, -166, -5, -166], '#d8d4c8', 2, 0);
  // brazos larguísimos con dedos de araña
  limb(ctx, -20, -166, -56, -120, 6, 5, '#1e1c22'); limb(ctx, -56, -120, -70, -70, 5, 4, '#a8a8a0');
  limb(ctx, 20, -166, 58, -140, 6, 5, '#1e1c22'); limb(ctx, 58, -140, 74, -168, 5, 4, '#a8a8a0');
  for (let i = -2; i <= 2; i++) { line(ctx, -70, -70, -76 + i * 4, -50, INK, 3); line(ctx, -70, -70, -76 + i * 4, -50, '#c8c8c0', 1.4); }
  // himnario abierto en la mano alzada
  poly(ctx, [56, -186, 76, -180, 96, -188, 96, -170, 76, -164, 56, -170], '#e8dcc0');
  line(ctx, 76, -180, 76, -164, INK, 2);
  glow(ctx, 76, -176, 34, '#c8b8ff', 0.6);
  // cabeza: óvalo liso sin rostro
  blob(ctx, [-14, -186, -12, -206, 0, -214, 12, -206, 14, -186, 8, -176, -8, -176], '#d8d4cc', 3, 0.3);
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.ellipse(4, -194, 8, 12, 0, 0, Math.PI * 2); ctx.fill();
  poly(ctx, [-30, -208, 30, -208, 26, -200, -26, -200], '#121014');
  poly(ctx, [-16, -208, -16, -226, 16, -226, 16, -208], '#121014');
}

function beast(ctx) {
  // vista semilateral: masa de musgo, fauces de caimán
  limb(ctx, -50, -50, -66, -4, 14, 12, '#2e3a2a'); limb(ctx, 40, -50, 52, -4, 14, 12, '#2e3a2a');
  const body = [-96, -60, -70, -126, -10, -150, 50, -140, 92, -100, 96, -60, 60, -36, -60, -34];
  blob(ctx, body, '#3e4e38', 3.5, 0.8);
  hatchPoly(ctx, body, 5, 'rgba(6,10,6,0.5)', 1.1, true, 0.45);
  // musgo colgante
  ctx.strokeStyle = '#5a6a3a'; ctx.lineWidth = 3; ctx.beginPath();
  for (let i = 0; i < 9; i++) { const x = -70 + i * 18; ctx.moveTo(x, -110 + Math.abs(i - 4) * 6); ctx.quadraticCurveTo(x + 6, -80, x - 2, -56 - (i % 3) * 8); }
  ctx.stroke();
  // espinas dorsales
  for (let i = 0; i < 7; i++) { const x = -60 + i * 18, y = -128 - Math.sin((i / 6) * Math.PI) * 22; poly(ctx, [x - 7, y + 8, x, y - 14, x + 7, y + 8], '#2a3424', 2, 0); }
  limb(ctx, -84, -80, -120, -44, 12, 10, '#3e4e38'); clawHand(ctx, -124, -40, -1, '#4a5a40');
  limb(ctx, 80, -88, 120, -60, 12, 10, '#3e4e38'); clawHand(ctx, 124, -56, 1, '#4a5a40');
  // cabeza de caimán con fauces
  poly(ctx, [60, -140, 150, -150, 168, -132, 150, -122, 72, -116], '#4a5a40', 3.5, 0.7);
  poly(ctx, [68, -112, 150, -116, 164, -96, 140, -90, 70, -96], '#3a4834', 3.5, 0.7);
  ctx.fillStyle = '#1a0806'; ctx.beginPath(); ctx.moveTo(72, -116); ctx.lineTo(160, -124); ctx.lineTo(156, -112); ctx.lineTo(74, -104); ctx.fill();
  ctx.fillStyle = '#e8e0c0';
  for (let i = 0; i < 9; i++) { const x = 80 + i * 9; ctx.beginPath(); ctx.moveTo(x, -122); ctx.lineTo(x + 3, -112); ctx.lineTo(x + 6, -122); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, -102); ctx.lineTo(x + 3, -112); ctx.lineTo(x + 6, -102); ctx.fill(); }
  glow(ctx, 92, -142, 16, '#ffe02a', 1);
  ctx.fillStyle = '#fff060'; ctx.beginPath(); ctx.ellipse(92, -142, 5, 3, -0.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK; ctx.fillRect(91, -145, 2, 6);
}

const DRAW_Z = { walker, runner, bloater, armored, forker, dynamiter, foreman, faceless, beast };

export const Z_BOX = {
  walker: { w: 200, h: 190, cy: 0.9, s: 0.3 }, runner: { w: 190, h: 170, cy: 0.9, s: 0.3 }, bloater: { w: 200, h: 190, cy: 0.9, s: 0.32 },
  armored: { w: 200, h: 190, cy: 0.9, s: 0.32 }, forker: { w: 240, h: 200, cy: 0.9, s: 0.3 }, dynamiter: { w: 200, h: 190, cy: 0.9, s: 0.3 },
  foreman: { w: 330, h: 270, cy: 0.94, s: 0.52 }, faceless: { w: 240, h: 260, cy: 0.94, s: 0.55 }, beast: { w: 340, h: 200, cy: 0.92, s: 0.58 },
};

export function drawZombie(ctx, type, detail = 0, seed = 77) {
  beginArt(seed, detail);
  DRAW_Z[type](ctx);
}
