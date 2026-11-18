// La Horda: siluetas asimétricas y encorvadas, hombros desalineados, jirones orgánicos,
// tinta sucia con sombreado cruzado y paleta fría desaturada (gris carbón, verde cadáver).
import { INK, poly, blob, ellipse, circle, line, tatter, glow, shade, rgba, beginArt, hatchPoly, flame, skull, star } from './ink.js';
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


// ------------------------------------------------------------------ SABUESO DE TINTA (vista lateral, flaco y veloz)
function hound(ctx) {
  const ink = '#1a1c22', ink2 = '#2a2e36';
  limb(ctx, -40, -46, -58, -4, 6, 4, ink); limb(ctx, 22, -48, 16, -4, 6, 4, ink);
  const body = [-62, -54, -36, -80, 10, -86, 44, -76, 54, -58, 32, -40, -24, -40, -54, -44];
  blob(ctx, body, ink2, 3, 0.6);
  hatchPoly(ctx, body, 4, 'rgba(0,0,0,0.55)', 1, true, 0.3);
  // costillas al aire
  ctx.strokeStyle = '#8a8e96'; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let i = 0; i < 5; i++) { const x = -20 + i * 9; ctx.moveTo(x, -78); ctx.quadraticCurveTo(x + 5, -62, x, -46); } ctx.stroke();
  // lomo erizado de tinta
  const sp = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10, x = -60 + t * 104, y = -58 - Math.sin(t * Math.PI) * 28; sp.push(x, y + 6, x + 4, y - 12 - (i % 2) * 7); }
  sp.push(46, -64, -58, -54);
  poly(ctx, sp, '#101216', 2.5, 0);
  limb(ctx, -30, -44, -38, -4, 7, 5, ink2); limb(ctx, 34, -48, 44, -4, 7, 5, ink2);
  // cabeza alargada con fauces y goteo de tinta
  blob(ctx, [40, -96, 58, -108, 86, -100, 104, -88, 96, -78, 70, -76, 50, -70], ink2, 3, 0.6);
  poly(ctx, [54, -106, 50, -124, 62, -110], '#101216', 2.5, 0); poly(ctx, [66, -106, 68, -122, 74, -104], '#101216', 2.5, 0);
  poly(ctx, [70, -80, 100, -82, 96, -70, 72, -68], '#050506', 2, 0);
  ctx.fillStyle = '#d8d8d0'; for (let i = 0; i < 5; i++) { const x = 73 + i * 5; ctx.beginPath(); ctx.moveTo(x, -80); ctx.lineTo(x + 2, -74); ctx.lineTo(x + 4, -80); ctx.fill(); }
  glow(ctx, 70, -96, 12, '#7fa8ff', 1); ctx.fillStyle = '#d8e8ff'; ctx.fillRect(67, -98, 6, 3);
  ctx.fillStyle = '#050506'; for (const [x, l] of [[80, 16], [90, 10]]) { ctx.beginPath(); ctx.ellipse(x, -64 + l / 2, 2.2, l / 2, 0, 0, Math.PI * 2); ctx.fill(); }
  poly(ctx, [-58, -56, -88, -74, -94, -66, -64, -46], '#101216', 2.5, 0);
}

// ------------------------------------------------------------------ ARAÑA DE CRIPTA (enjambre)
function spider(ctx) {
  const leg = '#1a1a1e';
  for (const sgn of [-1, 1]) for (let i = 0; i < 4; i++) {
    const bx = sgn * 14, by = -34 + i * 6, kx = sgn * (46 + i * 4), ky = -64 + i * 10, fx = sgn * (60 + i * 6), fy = -4 + (i % 2) * 2;
    line(ctx, bx, by, kx, ky, INK, 6); line(ctx, kx, ky, fx, fy, INK, 5);
    line(ctx, bx, by, kx, ky, leg, 3); line(ctx, kx, ky, fx, fy, leg, 2.5);
  }
  const abd = [-26, -40, -18, -70, 18, -70, 26, -40, 14, -18, -14, -18];
  blob(ctx, abd, '#22242a', 3, 0.6);
  hatchPoly(ctx, abd, 4, 'rgba(0,0,0,0.5)', 1, true, 0.3);
  skull(ctx, 0, -50, 0.6, '#b8b8b0', 1.2);
  blob(ctx, [-14, -30, -10, -42, 10, -42, 14, -30, 8, -20, -8, -20], '#18181c', 2.5, 0);
  for (const [x, y] of [[-6, -34], [-2, -36], [2, -36], [6, -34], [-4, -30], [4, -30]]) { glow(ctx, x, y, 5, '#ff4a3a', 0.9); ctx.fillStyle = '#ffb0a0'; ctx.fillRect(x - 1, y - 1, 2, 2); }
}

// ------------------------------------------------------------------ ABOMINACIÓN (caparazón blindado, escupe bilis de tinta)
function abomination(ctx) {
  for (const [x1, x2] of [[-60, -78], [-30, -36], [30, 34], [60, 76]]) { limb(ctx, x1, -40, x2, -2, 10, 7, '#2a2e2a'); poly(ctx, [x2 - 8, -6, x2 + 8, -6, x2 + 10, 2, x2 - 10, 2], '#1a1c1a', 2, 0); }
  const shell = [-84, -50, -70, -110, -30, -140, 30, -142, 72, -112, 88, -52, 50, -36, -50, -36];
  blob(ctx, shell, '#3a3e3a', 3.5, 0.8);
  hatchPoly(ctx, shell, 5, 'rgba(0,0,0,0.5)', 1.1, true, 0.4);
  // placas del caparazón con remaches
  ctx.strokeStyle = INK; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-60, -116); ctx.quadraticCurveTo(0, -90, 62, -118); ctx.moveTo(-76, -76); ctx.quadraticCurveTo(0, -56, 80, -78); ctx.moveTo(0, -142); ctx.lineTo(0, -40); ctx.stroke();
  for (const [x, y] of [[-40, -120], [36, -122], [-56, -84], [56, -86], [-20, -66], [22, -66]]) circle(ctx, x, y, 3.2, '#8a8e86', 1.2);
  // cabeza baja con fauces abiertas goteando tinta
  blob(ctx, [-30, -54, -20, -74, 20, -74, 30, -54, 18, -30, -18, -30], '#4a5048', 3, 0.6);
  poly(ctx, [-18, -50, 18, -50, 14, -34, -14, -34], '#050506', 2, 0);
  ctx.fillStyle = '#d0ccb8'; for (let i = -14; i <= 10; i += 6) { ctx.beginPath(); ctx.moveTo(i, -50); ctx.lineTo(i + 3, -42); ctx.lineTo(i + 6, -50); ctx.fill(); }
  for (const x of [-10, 10]) { glow(ctx, x, -64, 10, '#9a7aff', 1); ctx.fillStyle = '#e0d0ff'; ctx.fillRect(x - 3, -66, 6, 3); }
  ctx.fillStyle = '#0a0a10'; for (const [x, l] of [[-6, 22], [4, 30], [12, 16]]) { ctx.beginPath(); ctx.ellipse(x, -34 + l / 2, 2.6, l / 2, 0, 0, Math.PI * 2); ctx.fill(); }
}

// ------------------------------------------------------------------ EL PREDICADOR DE LA PESTE (máscara de pico, incensario)
function plague(ctx) {
  glow(ctx, 0, -100, 120, '#7aff4a', 0.18);
  const robe = [-24, -170, 24, -170, 54, -80, 64, -2];
  tatter(robe, 64, -2, -64, -2, 12, 16, 37); robe.push(-54, -80);
  zp(ctx, robe, '#26281e', 3, 6);
  poly(ctx, [-16, -170, 16, -170, 12, -110, -12, -110], '#3a3a2a', 2.5, 0.4);
  // estola con cruces invertidas
  poly(ctx, [-12, -168, -4, -168, -10, -60, -18, -60], '#5a1a10', 2, 0); poly(ctx, [12, -168, 4, -168, 10, -60, 18, -60], '#5a1a10', 2, 0);
  for (const y of [-130, -100, -76]) { line(ctx, -14, y, -14, y + 10, '#e8dcc0', 1.6); line(ctx, -18, y + 6, -10, y + 6, '#e8dcc0', 1.6); }
  // brazos: bastón con incensario de humo verde
  limb(ctx, -22, -160, -54, -120, 6, 5, '#26281e'); limb(ctx, 22, -160, 50, -126, 6, 5, '#26281e');
  line(ctx, -60, -30, -54, -200, INK, 6); line(ctx, -60, -30, -54, -200, '#4a3a24', 3);
  line(ctx, 52, -126, 70, -96, '#6a6a60', 1.5); circle(ctx, 72, -92, 8, '#5a5a4a', 2.5);
  glow(ctx, 72, -92, 26, '#9dff3a', 0.8);
  clawHand(ctx, -54, -118, -1, '#9aa290'); clawHand(ctx, 50, -126, 1, '#9aa290');
  // cabeza: máscara de pico de médico de la peste y sombrero de ala ancha
  blob(ctx, [-14, -170, -12, -196, 12, -196, 14, -170, 6, -162, -6, -162], '#2a2a22', 3, 0.5);
  poly(ctx, [8, -186, 44, -170, 40, -164, 8, -172], '#d8ccb0', 3, 0.6);
  for (const x of [-6, 4]) { circle(ctx, x, -184, 5, '#1a2a12', 2); glow(ctx, x, -184, 9, '#9dff3a', 1); }
  poly(ctx, [-40, -198, 40, -198, 30, -190, -30, -190], '#14140e'); poly(ctx, [-18, -198, -16, -222, 16, -222, 18, -198], '#14140e');
}

// ------------------------------------------------------------------ EL ENGENDRO DE LA MINA (dinamita en la espalda = punto débil)
function spawn(ctx) {
  for (const [x1, x2] of [[-46, -60], [-14, -18], [22, 26], [50, 64]]) limb(ctx, x1, -60, x2, -4, 14, 11, '#3a3630');
  const mass = [-90, -70, -76, -150, -30, -186, 30, -190, 76, -158, 92, -80, 60, -50, -60, -50];
  blob(ctx, mass, '#4a4640', 3.5, 0.8);
  hatchPoly(ctx, mass, 5, 'rgba(0,0,0,0.5)', 1.1, true, 0.4);
  // vetas de mineral y caras de mineros atrapados
  for (const [x, y] of [[-40, -120], [10, -150], [40, -100], [-10, -80]]) { star(ctx, x, y, 7, 4, '#c8d0e0', 1.4); glow(ctx, x, y, 12, '#c8d0e0', 0.4); }
  zhead(ctx, -50, -96, 0.7, -0.4, '#ffd27a', '#6a7462'); zhead(ctx, 54, -128, 0.6, 0.5, '#ffd27a', '#6a7462');
  // FARDO DE DINAMITA a la espalda (lado izquierdo del sprite: su espalda)
  for (let i = 0; i < 6; i++) poly(ctx, [-96 + i * 7, -160, -90 + i * 7, -160, -90 + i * 7, -112, -96 + i * 7, -112], '#c4281c', 2, 0.3);
  poly(ctx, [-100, -146, -50, -146, -50, -138, -100, -138], '#2a2a2a', 2, 0); poly(ctx, [-100, -126, -50, -126, -50, -118, -100, -118], '#2a2a2a', 2, 0);
  for (let i = 0; i < 6; i++) line(ctx, -93 + i * 7, -160, -91 + i * 7 + (i % 2) * 3, -170, '#d8c6a3', 1.5);
  glow(ctx, -72, -140, 40, '#ff8a2a', 0.7);
  // brazos-pico
  limb(ctx, 70, -150, 110, -110, 15, 12, '#4a4640'); line(ctx, 104, -40, 112, -170, INK, 10); line(ctx, 104, -40, 112, -170, '#5a3a1e', 6);
  poly(ctx, [86, -172, 118, -184, 150, -170, 124, -160, 110, -164], '#7a7a82', 3, 0.6);
  // cabeza: casco fundido con dos faroles por ojos
  blob(ctx, [10, -186, 18, -214, 56, -214, 64, -186, 50, -176, 24, -176], '#5a4a2a', 3, 0.5);
  for (const x of [28, 46]) { circle(ctx, x, -196, 6, '#ffe08a', 2); glow(ctx, x, -196, 18, '#ffd27a', 1); }
  poly(ctx, [22, -184, 52, -184, 48, -176, 26, -176], '#1a0a06', 2, 0);
}

const DRAW_Z = { walker, runner, bloater, armored, forker, dynamiter, hound, spider, abomination, foreman, faceless, beast, plague, spawn };

export const Z_BOX = {
  walker: { w: 200, h: 190, cy: 0.9, s: 0.3 }, runner: { w: 190, h: 170, cy: 0.9, s: 0.3 }, bloater: { w: 200, h: 190, cy: 0.9, s: 0.32 },
  armored: { w: 200, h: 190, cy: 0.9, s: 0.32 }, forker: { w: 240, h: 200, cy: 0.9, s: 0.3 }, dynamiter: { w: 200, h: 190, cy: 0.9, s: 0.3 },
  hound: { w: 230, h: 150, cy: 0.9, s: 0.3 }, spider: { w: 150, h: 90, cy: 0.88, s: 0.28 }, abomination: { w: 200, h: 170, cy: 0.9, s: 0.62 },
  foreman: { w: 330, h: 270, cy: 0.94, s: 0.52 }, plague: { w: 260, h: 260, cy: 0.94, s: 0.55 }, spawn: { w: 320, h: 250, cy: 0.94, s: 0.56 }, faceless: { w: 240, h: 260, cy: 0.94, s: 0.55 }, beast: { w: 340, h: 200, cy: 0.92, s: 0.58 },
};

export function drawZombie(ctx, type, detail = 0, seed = 77) {
  beginArt(seed, detail);
  DRAW_Z[type](ctx);
}
