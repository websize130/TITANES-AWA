// Mundo en tinta: suelos por mapa, atrezo, trampas, coberturas por fases y refugio a defender.
import { INK, poly, blob, ellipse, circle, line, star, skull, glow, shade, rgba, makeRng, makeCanvas, beginArt, hatch, hatchPoly, TAU } from './ink.js';
import { MAPS } from '../data/story.js';

export function makeGround(mapId, T = MAPS[mapId]) {
  const S = 512;
  const c = makeCanvas(S, S), ctx = c.getContext('2d');
  const r = makeRng(mapId.length * 977 + 31);
  ctx.fillStyle = T.ground; ctx.fillRect(0, 0, S, S);
  const blotch = (x, y, rad, col, a) => {
    for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  };
  for (let i = 0; i < 20; i++) blotch(r() * S, r() * S, 40 + r() * 120, r() < 0.5 ? T.g2 : T.g3, 0.55);
  ctx.strokeStyle = 'rgba(5,4,3,0.6)'; ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    let x = r() * S, y = r() * S; ctx.lineWidth = 1 + r() * 2.2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  for (let i = 0; i < 800; i++) {
    ctx.fillStyle = r() < 0.65 ? 'rgba(5,4,3,0.4)' : 'rgba(230,220,200,0.06)';
    const s = 0.6 + r() * 2; ctx.fillRect(r() * S, r() * S, s, s);
  }
  if (mapId === 'swamp') {
    for (let i = 0; i < 10; i++) { const x = r() * S, y = r() * S, w = 30 + r() * 70; ctx.fillStyle = 'rgba(20,40,30,0.55)'; ctx.beginPath(); ctx.ellipse(x, y, w, w * 0.45, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(120,160,120,0.15)'; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  if (mapId === 'crossroads' || mapId === 'town') {
    ctx.strokeStyle = 'rgba(70,55,40,0.35)'; ctx.lineWidth = 3;
    for (const y of [S * 0.3, S * 0.36]) { ctx.beginPath(); ctx.moveTo(0, y); ctx.bezierCurveTo(S * 0.3, y + 10, S * 0.7, y - 10, S, y); ctx.stroke(); }
  }
  // sombreado cruzado suave en las zonas oscuras (tinta)
  ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1;
  for (let i = 0; i < 26; i++) {
    const x = r() * S, y = r() * S, w = 20 + r() * 40;
    ctx.beginPath();
    for (let k = 0; k < w; k += 4) { ctx.moveTo(x + k, y); ctx.lineTo(x + k + 10, y + 10); }
    ctx.stroke();
  }
  return c;
}

// ------------------------------------------------------------------ atrezo
const WOOD = '#4a3424', WOOD2 = '#5e4430', STONE = '#4a4844', STONE2 = '#5a5854', IRON = '#3a3a3e';
function gravecross() { const c = this; poly(c, [-4, 0, -4, -54, 4, -54, 4, 0], WOOD2); poly(c, [-17, -44, 17, -44, 17, -37, -17, -37], WOOD2); ellipse(c, 0, 2, 16, 5, 'rgba(0,0,0,0.4)', 0); }
function deadtree() { const c = this; poly(c, [-9, 0, -7, -54, -30, -86, -26, -90, -5, -66, -1, -112, 6, -112, 6, -70, 28, -96, 32, -92, 9, -54, 9, 0], '#1e1814'); hatchPoly(c, [-9, 0, -7, -54, 9, -54, 9, 0], 3); }
function rock() { const c = this; blob(c, [-30, 0, -34, -18, -18, -36, 6, -40, 28, -26, 32, -4], STONE); hatchPoly(c, [-30, 0, -18, -36, 28, -26, 32, -4], 4, 'rgba(0,0,0,0.35)', 1, false); }
function fence() { const c = this; for (let i = -2; i <= 2; i++) poly(c, [i * 16 - 3, 0, i * 16 - 3, -30, i * 16, -36 + (i % 2) * 6, i * 16 + 3, -30, i * 16 + 3, 0], WOOD, 2, 0); line(c, -36, -22, 36, -20, WOOD2, 4); line(c, -36, -10, 36, -12, WOOD2, 4); }
function skullpile() { const c = this; for (const [x, y, s] of [[-12, -6, 0.8], [10, -6, 0.75], [0, -18, 0.8], [-20, 2, 0.6], [20, 2, 0.6]]) skull(c, x, y, s, '#c8bca0', 2); }
function post() { const c = this; poly(c, [-4, 0, -4, -80, 4, -80, 4, 0], WOOD); poly(c, [-2, -74, 44, -78, 50, -70, 44, -62, -2, -64], WOOD2); poly(c, [2, -54, -46, -58, -52, -50, -46, -42, 2, -44], WOOD2); }
function barrel() { const c = this; poly(c, [-15, 0, -17, -14, -15, -34, 15, -34, 17, -14, 15, 0], '#4a3020'); ellipse(c, 0, -34, 15, 5, '#3a2416', 2.5); line(c, -16, -8, 16, -8, IRON, 3); line(c, -16, -26, 16, -26, IRON, 3); }
function crate() { const c = this; poly(c, [-20, 0, -20, -34, 20, -34, 20, 0], WOOD2); poly(c, [-20, -34, -12, -42, 28, -42, 20, -34], shade(WOOD2, 0.1)); poly(c, [20, 0, 28, -8, 28, -42, 20, -34], WOOD); line(c, -20, 0, 20, -34, INK, 2); line(c, -20, -34, 20, 0, INK, 2); }
function wheel() { const c = this; c.save(); c.scale(1, 0.5); c.strokeStyle = INK; c.lineWidth = 6; c.beginPath(); c.arc(0, -30, 26, 0, TAU); c.stroke(); c.strokeStyle = WOOD2; c.lineWidth = 3; c.stroke(); for (let i = 0; i < 8; i++) { const a = i * 0.785; line(c, 0, -30, Math.cos(a) * 24, -30 + Math.sin(a) * 24, WOOD2, 3); } c.restore(); }
function tomb() { const c = this; poly(c, [-16, 0, -16, -36, -10, -46, 10, -46, 16, -36, 16, 0], STONE2); line(c, 0, -38, 0, -14, INK, 2.5); line(c, -7, -30, 7, -30, INK, 2.5); hatchPoly(c, [-16, 0, -16, -36, 16, -36, 16, 0], 4); }
function pew() { const c = this; poly(c, [-40, 0, -40, -18, 40, -18, 40, 0], WOOD); poly(c, [-40, -18, -40, -40, 40, -40, 40, -18], '#3a281a'); line(c, -36, -8, 36, -8, INK, 1.5); }
function beam() { const c = this; poly(c, [-30, 0, -26, -76, -20, -76, -22, 0], WOOD); poly(c, [22, 0, 20, -76, 26, -76, 30, 0], WOOD); poly(c, [-34, -82, 34, -82, 34, -72, -34, -72], WOOD2); }
function cart() { const c = this; poly(c, [-30, -8, -36, -40, 36, -40, 30, -8], '#3a3836'); for (const x of [-20, 20]) circle(c, x, -6, 8, '#1e1e20', 3); for (const [x, y] of [[-14, -46], [0, -50], [14, -46]]) blob(c, [x - 8, y + 4, x, y - 6, x + 8, y + 4], '#5a5a60', 2, 0); }
function ore() { const c = this; blob(c, [-24, 0, -28, -14, -10, -26, 10, -28, 24, -14, 22, 0], STONE); for (const [x, y] of [[-10, -12], [6, -18]]) { star(c, x, y, 5, 4, '#c8d0e0', 1.2); } }
function reeds() { const c = this; c.strokeStyle = '#3a4a2a'; c.lineWidth = 2.5; c.beginPath(); for (let i = -4; i <= 4; i++) { c.moveTo(i * 5, 0); c.quadraticCurveTo(i * 6, -30, i * 9, -54 - (i % 2) * 10); } c.stroke(); c.strokeStyle = INK; c.lineWidth = 1; c.stroke(); }
function stump() { const c = this; poly(c, [-18, 0, -16, -24, 16, -24, 18, 0], '#2a2018'); ellipse(c, 0, -24, 16, 5, '#4a3a28', 2.5); }
function bones() { const c = this; skull(c, -8, -8, 0.7, '#c8bca0', 2); line(c, 2, -4, 22, -10, INK, 5); line(c, 2, -4, 22, -10, '#c8bca0', 3); }
function gallows() {
  const c = this;
  ellipse(c, 0, 2, 70, 18, 'rgba(0,0,0,0.45)', 0);
  poly(c, [-60, 0, -60, -40, 60, -40, 60, 0], WOOD);
  for (let x = -56; x < 60; x += 14) line(c, x, -40, x, 0, 'rgba(0,0,0,0.35)', 1.5);
  poly(c, [-40, -40, -34, -40, -34, -170, -40, -170], WOOD2);
  poly(c, [-46, -176, 46, -176, 46, -166, -46, -166], WOOD2);
  line(c, -34, -130, 0, -170, WOOD2, 6);
  c.strokeStyle = '#a8885a'; c.lineWidth = 3; c.beginPath(); c.moveTo(30, -166); c.lineTo(30, -110); c.stroke();
  c.beginPath(); c.ellipse(30, -100, 7, 10, 0, 0, TAU); c.stroke();
}
function well() { const c = this; ellipse(c, 0, -14, 32, 12, STONE2, 3); ellipse(c, 0, -16, 24, 8, '#0a0808', 2); poly(c, [-32, -14, -32, 0, 32, 0, 32, -14], STONE); poly(c, [-28, -14, -26, -64, -20, -64, -22, -14], WOOD); poly(c, [22, -14, 20, -64, 26, -64, 28, -14], WOOD); poly(c, [-34, -70, 34, -70, 30, -62, -30, -62], WOOD2); }

// ------------------------------------------------------------------ trampas y destructibles
function beartrap_open() {
  const c = this;
  ellipse(c, 0, 0, 22, 8, 'rgba(20,14,10,0.6)', 0);
  c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.ellipse(0, -2, 18, 6, 0, 0, TAU); c.stroke();
  c.strokeStyle = '#6a6a6a'; c.lineWidth = 1.6; c.stroke();
  c.fillStyle = '#8a8a8a';
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU, x = Math.cos(a) * 18, y = -2 + Math.sin(a) * 6; c.beginPath(); c.moveTo(x, y); c.lineTo(x * 0.8, y - 6); c.lineTo(x * 0.7, y); c.fill(); }
  circle(c, 0, -2, 4, '#5a5a5a', 1.5);
}
function beartrap_closed() {
  const c = this;
  ellipse(c, 0, 0, 16, 6, 'rgba(20,14,10,0.6)', 0);
  poly(c, [-16, -2, 16, -2, 12, -14, -12, -14], '#5a5a5a', 2.5, 0.4);
  c.fillStyle = '#9a9a9a'; for (let x = -12; x <= 12; x += 4) { c.beginPath(); c.moveTo(x, -8); c.lineTo(x + 2, -2); c.lineTo(x + 4, -8); c.fill(); }
  c.fillStyle = 'rgba(90,10,10,0.7)'; c.fillRect(-6, -10, 8, 4);
}
// farol colgante: poste, brazo, cadena y lámpara de gas
function lantern_lit() {
  const c = this;
  poly(c, [-3, 0, -3, -112, 3, -112, 3, 0], IRON); line(c, 0, -106, 26, -110, IRON, 3.5); line(c, 0, -94, 12, -108, IRON, 2);
  c.strokeStyle = '#6a6a70'; c.lineWidth = 1.5; c.beginPath(); for (let y = -108; y < -96; y += 3) { c.moveTo(20, y); c.lineTo(22, y + 2); } c.stroke();
  poly(c, [13, -96, 29, -96, 27, -78, 15, -78], '#2a2a2e', 2.5, 0); c.fillStyle = '#ffe08a'; c.fillRect(16, -93, 10, 13);
  poly(c, [11, -96, 31, -96, 21, -103], '#2a2a2e', 2, 0); poly(c, [15, -78, 27, -78, 21, -73], '#2a2a2e', 2, 0);
}
function lantern_broken() {
  const c = this;
  poly(c, [-3, 0, -3, -112, 3, -112, 3, 0], IRON); line(c, 0, -106, 26, -110, IRON, 3.5);
  c.strokeStyle = '#6a6a70'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(20, -108); c.lineTo(23, -98); c.stroke();
  poly(c, [16, -98, 26, -96, 22, -90], '#1a1a1c', 2, 0);
}
function dynbarrel() {
  const c = this;
  poly(c, [-17, 0, -19, -16, -17, -40, 17, -40, 19, -16, 17, 0], '#8a1a10');
  ellipse(c, 0, -40, 17, 6, '#6a120a', 2.5);
  line(c, -18, -8, 18, -8, IRON, 3); line(c, -18, -32, 18, -32, IRON, 3);
  c.font = 'bold 10px "Courier Prime", monospace'; c.textAlign = 'center'; c.fillStyle = '#e8d8a8'; c.fillText('TNT', 0, -16);
  hatchPoly(c, [-17, 0, -19, -16, -17, -40, 17, -40, 19, -16, 17, 0], 4, 'rgba(0,0,0,0.35)', 1, false);
}
// Coberturas: 3 fases visuales (intacta, astillada, a punto de ceder)
function coverDraw(c, kind, phase) {
  const r = makeRng(kind.length * 13 + phase);
  const miss = phase * 0.28;
  ellipse(c, 0, 0, 52, 12, 'rgba(0,0,0,0.45)', 0);
  if (kind === 'tomb') {
    const pts = [-34, 0, -34, -52, -26, -68, 0, -76, 26, -68, 34, -52, 34, 0];
    poly(c, pts, phase > 1 ? '#3a3a3e' : STONE2);
    hatchPoly(c, pts, 4, 'rgba(0,0,0,0.35)', 1, phase > 0);
    line(c, 0, -60, 0, -26, INK, 3); line(c, -10, -48, 10, -48, INK, 3);
    c.font = 'bold 9px "Courier Prime", monospace'; c.textAlign = 'center'; c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillText('R.I.P.', 0, -14);
    if (phase > 0) { c.fillStyle = '#1a1a1c'; for (let i = 0; i < phase * 3; i++) { const x = (r() - 0.5) * 60, y = -r() * 70; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 6, y + 4); c.lineTo(x + 1, y + 9); c.fill(); } }
  } else if (kind === 'wagon') {
    poly(c, [-50, 0, -54, -46, 50, -46, 54, 0], phase > 1 ? shade(WOOD, -0.2) : WOOD);
    for (let x = -46; x < 50; x += 12) if (r() > miss) poly(c, [x, -44, x + 10, -44, x + 10, -2, x, -2], WOOD2, 1.5, 0);
    circle(c, -34, -4, 14, '#2a1e14', 3); if (phase < 2) circle(c, 34, -4, 14, '#2a1e14', 3);
  } else if (kind === 'crates') {
    for (const [x, y, s] of [[-24, 0, 1], [20, 0, 1], [-2, -34, 0.9]]) {
      if (r() < miss) continue;
      c.save(); c.translate(x, y); c.scale(s, s); poly(c, [-20, 0, -20, -34, 20, -34, 20, 0], WOOD2); line(c, -20, 0, 20, -34, INK, 2); line(c, -20, -34, 20, 0, INK, 2); c.restore();
    }
  } else {
    for (let i = 0; i < 5; i++) { if (r() < miss) continue; const y = -8 - i * 9; poly(c, [-52, y + 3, 52, y - 3, 52, y - 10, -52, y - 4], i % 2 ? WOOD : WOOD2, 2, 0); }
    poly(c, [-44, 0, -40, -54, -34, -54, -36, 0], WOOD); poly(c, [36, 0, 34, -54, 40, -54, 44, 0], WOOD);
  }
  // fase 2: chamuscada y humeante
  if (phase === 2 && kind !== 'tomb') {
    c.globalCompositeOperation = 'source-atop'; c.fillStyle = 'rgba(10,6,4,0.45)'; c.fillRect(-60, -80, 120, 90); c.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 6; i++) glowDot(c, (r() - 0.5) * 80, -r() * 40, '#ff6a1a');
  }
  // astillas y grietas
  c.strokeStyle = INK; c.lineWidth = 1.5;
  for (let i = 0; i < phase * 7; i++) { const x = (r() - 0.5) * 90, y = -r() * 46; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 16, y + r() * 12); c.stroke(); }
  c.fillStyle = '#c8a878';
  for (let i = 0; i < phase * 6; i++) c.fillRect((r() - 0.5) * 100, -r() * 8, 5, 2);
}
function glowDot(c, x, y, col) { glow(c, x, y, 7, col, 0.9); c.fillStyle = '#ffd27a'; c.fillRect(x - 1, y - 1, 2, 2); }
function refuge() {
  const c = this;
  ellipse(c, 0, 2, 120, 26, 'rgba(0,0,0,0.5)', 0);
  poly(c, [-100, 0, -100, -120, 0, -190, 100, -120, 100, 0], '#2e2420');
  hatchPoly(c, [-100, 0, -100, -120, 0, -190, 100, -120, 100, 0], 5, 'rgba(0,0,0,0.35)', 1, false, 0.5);
  poly(c, [-8, -190, 8, -190, 8, -230, -8, -230], '#2a1e18'); poly(c, [-22, -216, 22, -216, 22, -206, -22, -206], '#2a1e18');
  poly(c, [-30, 0, -30, -80, 0, -100, 30, -80, 30, 0], '#1a1210');
  for (let i = 0; i < 4; i++) line(c, -34, -20 - i * 16, 34, -28 - i * 14, WOOD2, 6);
  for (const x of [-70, 50]) { poly(c, [x, -100, x + 20, -100, x + 20, -60, x, -60], '#1a1410', 2, 0); glow(c, x + 10, -80, 26, '#ffb040', 0.6); }
}

// farol verde de la peste: mientras arda, el Predicador resucita a los muertos
function plaguelamp() {
  const c = this;
  line(c, 0, -40, 0, -70, '#3a3a34', 2);
  poly(c, [-10, -40, 10, -40, 8, -14, -8, -14], '#2a2a22', 2.5, 0); c.fillStyle = '#b8ff6a'; c.fillRect(-6, -36, 12, 18);
  poly(c, [-13, -40, 13, -40, 0, -50], '#2a2a22', 2, 0); poly(c, [-8, -14, 8, -14, 0, -6], '#2a2a22', 2, 0);
  glow(c, 0, -27, 26, '#9dff3a', 0.9);
}
const PROPS = { plaguelamp, gravecross, deadtree, rock, fence, skullpile, post, barrel, crate, wheel, tomb, pew, beam, cart, ore, reeds, stump, bones, gallows, well, beartrap_open, beartrap_closed, lantern_lit, lantern_broken, dynbarrel, refuge };
export const PROP_SIZE = {
  gravecross: [44, 60], deadtree: [70, 116], rock: [76, 50], fence: [84, 44], skullpile: [56, 34], post: [110, 86], barrel: [44, 48], crate: [64, 56],
  wheel: [64, 40], tomb: [40, 52], pew: [90, 44], beam: [76, 86], cart: [80, 64], ore: [60, 34], reeds: [56, 66], stump: [40, 32], bones: [52, 26],
  gallows: [150, 190], well: [74, 76], beartrap_open: [48, 22], beartrap_closed: [40, 24], lantern_lit: [40, 120], lantern_broken: [40, 120],
  dynbarrel: [44, 54], refuge: [240, 240], plaguelamp: [40, 76],
};

export function renderProp(type, res = 2) {
  let size, painter;
  if (type.startsWith('cover_')) { const [, kind, ph] = type.split('_'); size = [120, 70]; painter = (c) => coverDraw(c, kind, +ph); }
  else { size = PROP_SIZE[type]; painter = (c) => PROPS[type].call(c); }
  const [bw, bh] = size, pad = 20;
  const cv = makeCanvas((bw + pad * 2) * res, (bh + pad * 2) * res), ctx = cv.getContext('2d');
  ctx.scale(res, res); ctx.translate(bw / 2 + pad, bh + pad * 0.6);
  beginArt(type.length * 31, 1);
  painter(ctx);
  return { canvas: cv, w: bw + pad * 2, h: bh + pad * 2, ox: bw / 2 + pad, oy: bh + pad * 0.6 };
}
