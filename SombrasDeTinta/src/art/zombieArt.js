// La Horda: siluetas asimétricas y encorvadas, hombros desalineados, jirones orgánicos,
// tinta sucia con sombreado cruzado y paleta fría desaturada (gris carbón, verde cadáver).
import { INK, TAU, poly, blob, ellipse, circle, line, tatter, glow, shade, rgba, beginArt, hatchPoly, flame, skull, star } from './ink.js';

let ZF = 0; // fotograma de animación activo (errantes, corredores y arañas)
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

// ------------------------------------------------------------------ ERRANTE (encorvado, ropa rasgada, brazos adelantados)
// 4 fotogramas de zancada: piernas alternas y brazos que se balancean al tantear el aire.
const ZSKIN = '#a6b496', ZSKIN2 = '#74826a', ZSHIRT = '#9a8c72', ZVEST = '#2e2a2c', ZPANTS = '#3e3c48';
function zLeg(ctx, hx, hy, kx, ky, fx, fy, cloth, bare) {
  limb(ctx, hx, hy, kx, ky, 8, 7, cloth);
  // pernera rasgada a la altura de la rodilla: espinilla al aire
  limb(ctx, kx, ky, fx, fy - 6, 6, 5, bare ? ZSKIN2 : cloth);
  const p = [kx - 8, ky - 2, kx + 8, ky - 2];
  tatter(p, kx + 8, ky + 6, kx - 8, ky + 6, 3, 6, (kx * 7) | 0);
  poly(ctx, p, cloth, 2, 0);
  if (bare) blob(ctx, [fx - 10, fy - 6, fx + 10, fy - 7, fx + 14, fy, fx - 10, fy], ZSKIN2, 2.2, 0);
  else poly(ctx, [fx - 12, fy - 9, fx + 6, fy - 9, fx + 14, fy - 2, fx + 14, fy, fx - 12, fy], '#221c18', 2.4, 0);
}
function walker(ctx) {
  const ph = (ZF / 4) * TAU, st = Math.sin(ph), sw = Math.cos(ph);
  // piernas: la trasera primero
  zLeg(ctx, -6, -80, -12 - st * 8, -42, -18 - st * 15, 0, ZPANTS, false);
  zLeg(ctx, 6, -80, 10 + st * 8, -42, 14 + st * 15, 0, shade(ZPANTS, 0.12), true);
  ctx.save(); ctx.translate(0, -80); ctx.rotate(0.34); // torso encorvado hacia delante
  // brazo trasero (más oscuro), adelantado
  limb(ctx, -8, -56, 26, -50 + sw * 4, 7, 6, shade(ZSHIRT, -0.25));
  limb(ctx, 26, -50 + sw * 4, 52, -50 + sw * 6, 6, 5, ZSKIN2); clawHand(ctx, 56, -50 + sw * 6, 1, ZSKIN2);
  // torso: camisa sucia, chaleco abierto y desgarrado, costillas a la vista
  const torso = [-20, -66, 18, -64, 22, -34, 16, -2, -16, -2, -22, -36];
  zp(ctx, torso, ZSHIRT, 3, 0);
  hatchPoly(ctx, [-20, -66, -4, -66, -6, -2, -16, -2, -22, -36], 4, 'rgba(10,8,6,0.45)', 1, true, 0.4);
  zp(ctx, [-22, -64, -6, -66, -10, -28, -14, -2, -20, -6, -24, -36], ZVEST, 2.6, 3);
  zp(ctx, [8, -66, 20, -62, 22, -36, 14, -2, 6, -6, 10, -34], ZVEST, 2.6, 3);
  blob(ctx, [-4, -50, 8, -52, 10, -30, -2, -28], ZSKIN2, 2, 0); // desgarrón
  ctx.strokeStyle = '#3a4234'; ctx.lineWidth = 1.6; ctx.beginPath();
  for (let i = 0; i < 3; i++) { ctx.moveTo(-2, -46 + i * 6); ctx.quadraticCurveTo(4, -48 + i * 6, 9, -45 + i * 6); } ctx.stroke();
  ctx.fillStyle = '#6a0e0c'; ctx.fillRect(10, -40, 4, 9); ctx.fillRect(-12, -20, 6, 4);
  rags(ctx, -18, -4, 18, -4, 5, 10, ZSHIRT, 3);
  // cuello y cabeza adelantada, mandíbula caída
  limb(ctx, 2, -64, 10, -74, 6, 5, ZSKIN2);
  zhead(ctx, 14, -82, 1, 0.55, '#f2ffb0', ZSKIN);
  ctx.fillStyle = '#2a2a26'; ctx.fillRect(4, -96, 3, 6); ctx.fillRect(10, -98, 2, 5); // mechones ralos
  // brazo delantero extendido hacia la presa
  limb(ctx, 14, -60, 38, -58 - sw * 4, 7, 6, ZSHIRT);
  rags(ctx, 30, -64, 40, -52, 2, 6, ZSHIRT, 5);
  limb(ctx, 38, -58 - sw * 4, 62, -60 - sw * 6, 6, 5, ZSKIN); clawHand(ctx, 66, -60 - sw * 6, 1, ZSKIN);
  ctx.restore();
}

// ------------------------------------------------------------------ CORREDOR (delgado, muy inclinado, zancada larga)
function runner(ctx) {
  const ph = (ZF / 4) * TAU, st = Math.sin(ph), sw = Math.cos(ph);
  zLeg(ctx, -4, -70, -14 - st * 12, -38 + Math.max(0, st) * 6, -26 - st * 22, 0, ZPANTS, true);
  zLeg(ctx, 4, -70, 14 + st * 12, -38 + Math.max(0, -st) * 6, 22 + st * 22, 0, shade(ZPANTS, 0.12), false);
  ctx.save(); ctx.translate(0, -70); ctx.rotate(0.62);
  limb(ctx, -6, -48, -26 - sw * 10, -24, 5, 4, ZSKIN2); clawHand(ctx, -30 - sw * 10, -20, -1, ZSKIN2);
  const torso = [-12, -56, 13, -54, 12, -6, -10, -2];
  zp(ctx, torso, ZSKIN2, 3, 3);
  ctx.strokeStyle = '#2e3628'; ctx.lineWidth = 1.5; ctx.beginPath();
  for (let i = 0; i < 4; i++) { ctx.moveTo(-8, -44 + i * 7); ctx.quadraticCurveTo(0, -47 + i * 7, 10, -43 + i * 7); } ctx.stroke();
  // camisa hecha jirones colgando de un hombro
  const shirt = [-14, -58, 6, -56, 2, -40];
  tatter(shirt, 2, -40, -14, -18, 4, 7, 11); zp(ctx, shirt, ZSHIRT, 2.4, 0);
  rags(ctx, -12, -4, 12, -6, 4, 9, ZPANTS, 9);
  zhead(ctx, 8, -66, 0.92, 0.95, '#ffe0a0', ZSKIN);
  poly(ctx, [12, -60, 22, -56, 16, -50], '#1a0806', 1.5, 0); // boca abierta en un alarido
  limb(ctx, 8, -48, 32, -34 + sw * 8, 5, 4, ZSKIN); clawHand(ctx, 36, -32 + sw * 8, 1, ZSKIN);
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
  walker: { w: 210, h: 190, cy: 0.9, s: 0.31 }, runner: { w: 200, h: 170, cy: 0.9, s: 0.31 }, bloater: { w: 200, h: 190, cy: 0.9, s: 0.32 },
  armored: { w: 200, h: 190, cy: 0.9, s: 0.32 }, forker: { w: 240, h: 200, cy: 0.9, s: 0.3 }, dynamiter: { w: 200, h: 190, cy: 0.9, s: 0.3 },
  hound: { w: 230, h: 150, cy: 0.9, s: 0.3 }, spider: { w: 180, h: 110, cy: 0.86, s: 0.31 }, abomination: { w: 200, h: 170, cy: 0.9, s: 0.62 },
  foreman: { w: 300, h: 330, cy: 0.94, s: 0.56 }, plague: { w: 280, h: 300, cy: 0.94, s: 0.56 }, spawn: { w: 360, h: 300, cy: 0.94, s: 0.58 },
  faceless: { w: 300, h: 320, cy: 0.94, s: 0.58 }, beast: { w: 300, h: 340, cy: 0.94, s: 0.56 },
};
// tipos con fotogramas de animación (marcha)
export const Z_ANIM = { walker: 4, runner: 4, spider: 4 };

export function drawZombie(ctx, type, detail = 0, seed = 77, frame = 0) {
  beginArt(seed, detail);
  ZF = frame;
  DRAW_Z[type](ctx);
  ZF = 0;
}
