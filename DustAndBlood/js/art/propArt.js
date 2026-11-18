// Escenografía procedural: suelos por escenario, atrezo, estructuras de misión e iconos de armas.
// Unidades = unidades de mundo (se pre-renderizan a sprites).
import {
  INK, poly, blob, ellipse, circle, line, tatter, star, gear, skull, flame, glow, shade, rgba,
  makeRng, makeCanvas, beginArt, hatch, coin,
} from './comic.js';

export const THEMES = {
  town: { ground: '#6e3a20', g2: '#8a4a28', g3: '#4e2814', fog: '#c08a5a', props: ['cactus', 'barrel', 'tumbleweed', 'wheel', 'cowskull', 'crate', 'building', 'fence'] },
  cemetery: { ground: '#2c2230', g2: '#3a2c3a', g3: '#1a141e', fog: '#8a7a9a', props: ['tombstone', 'cross', 'deadtree', 'bones', 'coffin', 'tombstone', 'cross', 'fence'] },
  mine: { ground: '#3a3028', g2: '#4a3c30', g3: '#241c16', fog: '#7a6a5a', props: ['rock', 'lantern', 'crate', 'beam', 'rock', 'goldvein', 'barrel'] },
  canyon: { ground: '#6a2a14', g2: '#8a3a1a', g3: '#3e160a', fog: '#c0603a', props: ['rock', 'spire', 'cowskull', 'cactus', 'bones', 'spire', 'lavacrack'] },
};

// ------------------------------------------------------------------ suelo (tile 512 repetible)
export function makeGroundTile(theme) {
  const T = THEMES[theme];
  const S = 512;
  const c = makeCanvas(S, S), ctx = c.getContext('2d');
  const r = makeRng(theme.length * 977 + 13);
  ctx.fillStyle = T.ground; ctx.fillRect(0, 0, S, S);
  // manchas grandes (se repiten en bordes para tileado)
  const blotch = (x, y, rad, col, a) => {
    for (let ox = -S; ox <= S; ox += S) for (let oy = -S; oy <= S; oy += S) {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  };
  for (let i = 0; i < 18; i++) blotch(r() * S, r() * S, 40 + r() * 110, r() < 0.5 ? T.g2 : T.g3, 0.5);
  // grietas de tinta
  ctx.strokeStyle = rgba('#0b0705', 0.55); ctx.lineCap = 'round';
  for (let i = 0; i < 14; i++) {
    let x = r() * S, y = r() * S;
    ctx.lineWidth = 1 + r() * 2;
    ctx.beginPath(); ctx.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 50; y += (r() - 0.5) * 50; ctx.lineTo(x, y); }
    ctx.stroke();
  }
  if (theme === 'canyon') {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(255,90,20,0.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 5; i++) {
      let x = r() * S, y = r() * S; ctx.beginPath(); ctx.moveTo(x, y);
      for (let k = 0; k < 5; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; ctx.lineTo(x, y); }
      ctx.stroke();
    }
    ctx.restore();
  }
  // guijarros y motas
  for (let i = 0; i < 900; i++) {
    const x = r() * S, y = r() * S, s = 0.6 + r() * 2.2;
    ctx.fillStyle = r() < 0.6 ? rgba('#0b0705', 0.35) : rgba('#ffe6c0', 0.08);
    ctx.fillRect(x, y, s, s);
  }
  for (let i = 0; i < 40; i++) {
    const x = r() * S, y = r() * S, s = 2 + r() * 4;
    ellipse(ctx, x, y, s, s * 0.7, shade(T.g2, 0.1), 1.2);
  }
  if (theme === 'cemetery') {
    for (let i = 0; i < 60; i++) {
      const x = r() * S, y = r() * S;
      ctx.strokeStyle = '#4a4a2a'; ctx.lineWidth = 1.2; ctx.beginPath();
      for (let k = -2; k <= 2; k++) { ctx.moveTo(x, y); ctx.lineTo(x + k * 3, y - 6 - r() * 5); }
      ctx.stroke();
    }
  }
  if (theme === 'mine') {
    for (let i = 0; i < 70; i++) { ctx.fillStyle = rgba('#e8c25a', 0.5); ctx.fillRect(r() * S, r() * S, 1.5, 1.5); }
  }
  // trama de semitono suave
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let y = 0; y < S; y += 8) for (let x = (y / 8) % 2 * 4; x < S; x += 8) { ctx.beginPath(); ctx.arc(x, y, 1.1, 0, Math.PI * 2); ctx.fill(); }
  return c;
}

// ------------------------------------------------------------------ atrezo
function cactus(ctx) {
  const g = '#4a6a2a';
  poly(ctx, [-9, 0, -9, -66, -4, -74, 4, -74, 9, -66, 9, 0], g);
  poly(ctx, [-9, -36, -24, -36, -28, -40, -28, -60, -22, -62, -20, -44, -9, -44], g);
  poly(ctx, [9, -26, 24, -26, 28, -30, 28, -52, 22, -54, 20, -34, 9, -34], g);
  ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-3, -70); ctx.moveTo(3, -4); ctx.lineTo(3, -70); ctx.stroke();
}
function barrel(ctx) {
  poly(ctx, [-16, 0, -18, -14, -16, -34, 16, -34, 18, -14, 16, 0], '#7a4a24');
  ellipse(ctx, 0, -34, 16, 5, '#5a3418', 2.5);
  for (const y of [-8, -26]) line(ctx, -17, y, 17, y, '#2a2a2a', 3);
}
function tumbleweed(ctx) {
  ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 1.5;
  const r = makeRng(5); ctx.beginPath();
  for (let i = 0; i < 40; i++) { const a = r() * 6.28, b = r() * 6.28; ctx.moveTo(Math.cos(a) * 16, -16 + Math.sin(a) * 14); ctx.quadraticCurveTo(0, -16, Math.cos(b) * 16, -16 + Math.sin(b) * 14); }
  ctx.stroke();
  ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, -16, 17, 15, 0, 0, Math.PI * 2); ctx.stroke();
}
function wheel(ctx) {
  ctx.save(); ctx.scale(1, 0.55);
  circle(ctx, 0, -30, 26, null, 6); circle(ctx, 0, -30, 26, null, 0);
  ctx.strokeStyle = '#6b3f1f'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.arc(0, -30, 26, 0, Math.PI * 2); ctx.stroke();
  for (let i = 0; i < 8; i++) { const a = i * 0.785; line(ctx, 0, -30, Math.cos(a) * 24, -30 + Math.sin(a) * 24, '#6b3f1f', 3); }
  circle(ctx, 0, -30, 6, '#4a2c17', 2);
  ctx.restore();
}
function cowskull(ctx) {
  skull(ctx, 0, -12, 1.1, '#e2d1a8', 2.5);
  poly(ctx, [-10, -22, -26, -26, -34, -38, -30, -40, -22, -30, -9, -27], '#d8c8a0', 2);
  poly(ctx, [10, -22, 26, -26, 34, -38, 30, -40, 22, -30, 9, -27], '#d8c8a0', 2);
}
function crate(ctx) {
  poly(ctx, [-20, 0, -20, -34, 20, -34, 20, 0], '#8a5a2a');
  poly(ctx, [-20, -34, -12, -42, 28, -42, 20, -34], '#a06a34');
  poly(ctx, [20, 0, 28, -8, 28, -42, 20, -34], '#6a4220');
  line(ctx, -20, 0, 20, -34, INK, 2); line(ctx, -20, -34, 20, 0, INK, 2);
}
function building(ctx) {
  // fachada western con porche
  poly(ctx, [-90, 0, -90, -130, -60, -130, -60, -150, 60, -150, 60, -130, 90, -130, 90, 0], '#6a4224');
  for (let y = -140; y < 0; y += 10) line(ctx, -88, y, 88, y, 'rgba(0,0,0,0.35)', 1.2);
  poly(ctx, [-56, -146, 56, -146, 56, -126, -56, -126], '#2a1a10', 2, 0);
  poly(ctx, [-30, -60, 30, -60, 30, 0, -30, 0], '#1a0e08');
  poly(ctx, [-28, -58, -2, -58, -2, -24, -28, -24], '#4a2c17', 2, 0); poly(ctx, [2, -58, 28, -58, 28, -24, 2, -24], '#4a2c17', 2, 0);
  for (const x of [-72, 52]) { poly(ctx, [x, -100, x + 20, -100, x + 20, -70, x, -70], '#1a1418', 2.5, 0); glow(ctx, x + 10, -85, 24, '#ffb040', 0.35); }
  poly(ctx, [-96, -66, 96, -66, 90, -56, -90, -56], '#4a2c17', 2.5, 0);
  for (const x of [-86, -40, 40, 86]) line(ctx, x, -56, x, 0, '#3a2412', 4);
}
function fence(ctx) {
  for (let i = -2; i <= 2; i++) poly(ctx, [i * 16 - 3, 0, i * 16 - 3, -30, i * 16, -34, i * 16 + 3, -30, i * 16 + 3, 0], '#5a3a1e', 2, 0);
  line(ctx, -36, -22, 36, -22, '#4a2c17', 4); line(ctx, -36, -10, 36, -10, '#4a2c17', 4);
}
function tombstone(ctx) {
  ellipse(ctx, 0, -2, 22, 6, '#2a1e18', 0);
  poly(ctx, [-16, 0, -16, -36, -10, -46, 10, -46, 16, -36, 16, 0], '#6a6870');
  line(ctx, 0, -38, 0, -14, INK, 2.5); line(ctx, -7, -30, 7, -30, INK, 2.5);
  ctx.fillStyle = 'rgba(60,80,40,0.5)'; ctx.fillRect(-14, -8, 28, 6);
}
function cross(ctx) {
  poly(ctx, [-4, 0, -4, -50, 4, -50, 4, 0], '#5a3a1e', 2.5, 0.5);
  poly(ctx, [-16, -40, 16, -40, 16, -33, -16, -33], '#5a3a1e', 2.5, 0.5);
}
function deadtree(ctx) {
  poly(ctx, [-8, 0, -6, -50, -26, -80, -22, -84, -4, -62, 0, -100, 6, -100, 6, -64, 26, -88, 30, -84, 8, -50, 8, 0], '#2a1e1a');
}
function bones(ctx) {
  skull(ctx, -8, -8, 0.7, '#e2d1a8', 2);
  line(ctx, 2, -4, 22, -10, INK, 5); line(ctx, 2, -4, 22, -10, '#e2d1a8', 3);
  line(ctx, 6, -12, 20, 0, INK, 5); line(ctx, 6, -12, 20, 0, '#e2d1a8', 3);
}
function coffin(ctx) {
  poly(ctx, [-12, 0, -18, -40, -10, -60, 10, -60, 18, -40, 12, 0], '#4a2c17');
  line(ctx, 0, -52, 0, -20, '#c9a54a', 2); line(ctx, -7, -44, 7, -44, '#c9a54a', 2);
}
function rock(ctx) {
  blob(ctx, [-30, 0, -34, -18, -18, -36, 6, -40, 28, -26, 32, -4], '#6a5a4a');
  line(ctx, -10, -30, 0, -12, 'rgba(0,0,0,0.4)', 2);
}
function spire(ctx) {
  poly(ctx, [-26, 0, -20, -40, -14, -86, -4, -104, 8, -96, 16, -60, 26, 0], '#7a3a1e');
  hatch(ctx, 0, -100, 28, 100, 6, 'rgba(0,0,0,0.25)', 1.2);
  line(ctx, -16, -40, 18, -42, 'rgba(0,0,0,0.4)', 2); line(ctx, -12, -72, 12, -70, 'rgba(0,0,0,0.4)', 2);
}
function lantern(ctx) {
  line(ctx, 0, 0, 0, -60, '#4a2c17', 5);
  poly(ctx, [-8, -60, 8, -60, 6, -78, -6, -78], '#2a2a2a', 2);
  glow(ctx, 0, -70, 40, '#ffb040', 0.7);
  ctx.fillStyle = '#ffd27a'; ctx.fillRect(-4, -76, 8, 12);
}
function beam(ctx) {
  poly(ctx, [-30, 0, -26, -70, -20, -70, -22, 0], '#5a3a1e');
  poly(ctx, [22, 0, 20, -70, 26, -70, 30, 0], '#5a3a1e');
  poly(ctx, [-34, -76, 34, -76, 34, -66, -34, -66], '#6b4424');
}
function goldvein(ctx) {
  blob(ctx, [-26, 0, -30, -14, -12, -28, 10, -30, 26, -16, 24, 0], '#4a3e34');
  for (const [x, y] of [[-12, -14], [4, -20], [12, -8]]) { star(ctx, x, y, 5, 4, '#e8c25a', 1.2); glow(ctx, x, y, 10, '#ffd24a', 0.4); }
}
function lavacrack(ctx) {
  ctx.save(); ctx.scale(1, 0.5);
  ctx.globalCompositeOperation = 'lighter';
  glow(ctx, 0, 0, 50, '#ff4a12', 0.5);
  ctx.strokeStyle = '#ffb02a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-40, 4); ctx.lineTo(-14, -6); ctx.lineTo(4, 6); ctx.lineTo(36, -4); ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ estructuras de misión
function totem(ctx) {
  ellipse(ctx, 0, -2, 28, 8, '#1a100a', 0);
  poly(ctx, [-16, 0, -18, -100, 18, -100, 16, 0], '#4a3424');
  for (let i = 0; i < 3; i++) {
    const y = -20 - i * 30;
    poly(ctx, [-20, y, 20, y, 18, y - 22, -18, y - 22], i % 2 ? '#5a3a24' : '#3a2a1e', 2.5, 0.5);
    ctx.fillStyle = '#1a0a06'; ctx.fillRect(-10, y - 16, 6, 5); ctx.fillRect(4, y - 16, 6, 5);
    glow(ctx, -7, y - 14, 8, '#ff6a1a', 0.8); glow(ctx, 7, y - 14, 8, '#ff6a1a', 0.8);
  }
  poly(ctx, [-38, -104, 38, -104, 30, -96, -30, -96], '#5a3a24', 2.5, 0.4);
  skull(ctx, 0, -118, 1.0, '#d8c8a0', 2.5);
  glow(ctx, 0, -116, 30, '#ff6a1a', 0.5);
}
function saloon(ctx) {
  ellipse(ctx, 0, 0, 120, 26, 'rgba(0,0,0,0.35)', 0);
  poly(ctx, [-110, 0, -110, -150, -70, -150, -70, -176, 70, -176, 70, -150, 110, -150, 110, 0], '#7a4a26');
  for (let y = -170; y < 0; y += 10) line(ctx, -108, y, 108, y, 'rgba(0,0,0,0.3)', 1.2);
  poly(ctx, [-66, -172, 66, -172, 66, -150, -66, -150], '#2a1a10', 2, 0);
  ctx.font = '18px Rye, Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#e8c25a'; ctx.fillText('SALOON', 0, -160);
  poly(ctx, [-26, -64, 26, -64, 26, 0, -26, 0], '#1a0e08');
  poly(ctx, [-24, -50, -2, -50, -2, -20, -24, -20], '#6a4224', 2, 0); poly(ctx, [2, -50, 24, -50, 24, -20, 2, -20], '#6a4224', 2, 0);
  for (const x of [-86, 62]) { poly(ctx, [x, -120, x + 24, -120, x + 24, -84, x, -84], '#1a1418', 2.5, 0); glow(ctx, x + 12, -102, 30, '#ffb040', 0.5); }
  poly(ctx, [-118, -74, 118, -74, 110, -62, -110, -62], '#4a2c17', 2.5, 0);
  for (const x of [-104, -50, 50, 104]) line(ctx, x, -62, x, 0, '#3a2412', 5);
}
function gravestone(ctx) {
  ellipse(ctx, 0, -2, 40, 12, '#120a10', 0);
  poly(ctx, [-26, 0, -26, -64, -18, -80, 0, -86, 18, -80, 26, -64, 26, 0], '#4a4652');
  star(ctx, 0, -50, 12, 5, null, 2.5, 0.38);
  ctx.strokeStyle = '#9a2aff'; ctx.lineWidth = 2; ctx.stroke();
  glow(ctx, 0, -50, 34, '#9a2aff', 0.6);
  for (let i = 0; i < 4; i++) line(ctx, -18 + i * 12, -18, -14 + i * 12, -8, '#9a2aff', 1.5);
}
function drill(ctx) {
  ellipse(ctx, 0, 0, 70, 20, 'rgba(0,0,0,0.4)', 0);
  poly(ctx, [-60, 0, -50, -60, 50, -60, 60, 0], '#4a4a52');
  for (const [x, y] of [[-44, -50], [44, -50], [-52, -10], [52, -10]]) circle(ctx, x, y, 4, '#8a8a92', 1.5);
  poly(ctx, [-24, -60, -20, -110, 20, -110, 24, -60], '#6a5a4a');
  gear(ctx, -34, -80, 18, 8, '#c99a3a', 0.3, 2.5); gear(ctx, 34, -86, 14, 8, '#c99a3a', 0.1, 2.5);
  poly(ctx, [-8, -110, -6, -150, 6, -150, 8, -110], '#3a3a3e');
  glow(ctx, 0, -30, 40, '#ff9a2a', 0.5);
  poly(ctx, [-16, -40, 16, -40, 16, -20, -16, -20], '#1a1010', 2, 0);
  ctx.fillStyle = '#ffb02a'; ctx.fillRect(-12, -34, 24, 8);
}
function altar(ctx) {
  ellipse(ctx, 0, 0, 110, 32, '#2a0606', 3);
  glow(ctx, 0, -10, 120, '#ff1a2a', 0.5);
  poly(ctx, [-70, 0, -60, -50, 60, -50, 70, 0], '#3a2020');
  poly(ctx, [-74, -50, 74, -50, 66, -64, -66, -64], '#5a2a2a');
  for (const x of [-46, 0, 46]) skull(ctx, x, -76, 1.1, '#d8c8a0', 2.5);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(200,10,20,0.8)';
  for (let i = 0; i < 5; i++) ctx.fillRect(-56 + i * 26, -48, 4, 30 + (i % 2) * 14);
  ctx.restore();
  for (const x of [-80, 80]) { poly(ctx, [x - 5, 0, x - 5, -90, x + 5, -90, x + 5, 0], '#3a2a1e'); flame(ctx, x, -92, 0.7, '#ff2a12', '#ff8a2a', '#fff2b0', 0, x); }
}
function crystal(ctx) {
  glow(ctx, 0, -16, 30, '#e6ff3a', 0.7);
  poly(ctx, [-8, 0, -12, -16, -4, -34, 4, -30, 10, -14, 6, 0], '#d8e83a', 2.5, 0.2);
  poly(ctx, [4, 0, 8, -10, 16, -22, 18, -8, 12, 0], '#b8c82a', 2, 0.2);
  line(ctx, -4, -30, -2, -6, 'rgba(255,255,220,0.8)', 1.5);
}
function minecart(ctx) {
  poly(ctx, [-34, -10, -40, -44, 40, -44, 34, -10], '#5a4a40');
  for (const x of [-30, 0, 30]) circle(ctx, x * 0.9, -40, 3, '#8a8a92', 1.2);
  for (const [x, y] of [[-20, -48], [-4, -52], [12, -50], [24, -47]]) { star(ctx, x, y, 7, 5, '#e8c25a', 1.5); }
  circle(ctx, -22, -6, 9, '#2a2a2e', 3); circle(ctx, 22, -6, 9, '#2a2a2e', 3);
  glow(ctx, 0, -50, 30, '#ffd24a', 0.4);
}
function turret(ctx, p) {
  ellipse(ctx, 0, -2, 22, 7, 'rgba(0,0,0,0.4)', 0);
  line(ctx, -16, 0, 0, -20, INK, 5); line(ctx, 16, 0, 0, -20, INK, 5); line(ctx, 0, 2, 0, -20, INK, 5);
  circle(ctx, 0, -26, 12, '#6a5a4a', 3);
  gear(ctx, 0, -26, 8, 6, p ? p.gear : '#c99a3a', 0, 1.5);
}

const PROPS = { cactus, barrel, tumbleweed, wheel, cowskull, crate, building, fence, tombstone, cross, deadtree, bones, coffin, rock, spire, lantern, beam, goldvein, lavacrack, totem, saloon, gravestone, drill, altar, crystal, minecart, turret };

export const PROP_BOX = {
  cactus: [70, 90], barrel: [50, 50], tumbleweed: [44, 40], wheel: [64, 40], cowskull: [80, 50], crate: [64, 56], building: [200, 160],
  fence: [84, 40], tombstone: [50, 56], cross: [40, 60], deadtree: [70, 110], bones: [56, 30], coffin: [44, 66], rock: [76, 50],
  spire: [60, 112], lantern: [80, 90], beam: [76, 84], goldvein: [64, 40], lavacrack: [100, 40], totem: [90, 150], saloon: [250, 196],
  gravestone: [96, 100], drill: [150, 160], altar: [240, 120], crystal: [60, 50], minecart: [90, 70], turret: [56, 50],
};

// Renderiza un atrezo a un sprite {canvas, w, h, ox, oy, res}. El ancla es la base (pies).
export function renderProp(type, res = 2, pal = null) {
  const [bw, bh] = PROP_BOX[type];
  const pad = 24;
  const c = makeCanvas((bw + pad * 2) * res, (bh + pad * 2) * res);
  const ctx = c.getContext('2d');
  ctx.scale(res, res);
  ctx.translate(bw / 2 + pad, bh + pad * 0.6);
  beginArt(type.length * 31, 1);
  PROPS[type](ctx, pal);
  return { canvas: c, w: bw + pad * 2, h: bh + pad * 2, ox: bw / 2 + pad, oy: bh + pad * 0.6, res };
}

// ------------------------------------------------------------------ iconos de armas (Armería)
export function drawWeaponIcon(ctx, id, w, h, t = 0) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  const s = Math.min(w / 200, h / 90);
  ctx.scale(s, s);
  beginArt(id.length * 13, 1);
  const wood = '#6b3f1f', metal = '#3a3a40', brass = '#c9a54a';
  switch (id) {
    case 'peacemaker':
      for (const [dx, dy, k] of [[-30, 6, 1], [24, -10, -1]]) {
        ctx.save(); ctx.translate(dx, dy); ctx.scale(k, 1);
        poly(ctx, [-50, -8, 30, -10, 30, -2, -30, 2], '#9a9aa2');
        ellipse(ctx, -24, -2, 12, 9, '#7a7a82', 2.5);
        poly(ctx, [-40, -2, -30, 4, -40, 34, -54, 30], wood);
        circle(ctx, -24, -2, 3, metal, 1);
        ctx.restore();
      }
      break;
    case 'widow':
      poly(ctx, [-90, 10, -40, -6, -36, 6, -84, 26], wood);
      poly(ctx, [-40, -8, -10, -10, -8, 6, -38, 8], metal);
      poly(ctx, [-10, -12, 70, -16, 70, 2, -10, 6], '#2a2a30');
      line(ctx, -8, -4, 70, -8, 'rgba(255,255,255,0.3)', 2);
      ellipse(ctx, 71, -7, 3, 9, '#111', 2);
      break;
    case 'winchester':
      poly(ctx, [-96, 8, -60, -4, -58, 8, -92, 22], wood);
      poly(ctx, [-60, -6, -24, -8, -22, 8, -58, 8], brass);
      ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(-40, 18, 14, 8, 0, 0, Math.PI * 2); ctx.stroke();
      poly(ctx, [-24, -7, 92, -9, 92, -3, -24, -1], metal);
      poly(ctx, [-20, 0, 40, 0, 40, 6, -20, 6], wood);
      break;
    case 'grenade':
      poly(ctx, [-90, 12, -50, 0, -46, 14, -84, 30], wood);
      poly(ctx, [-50, -6, 0, -10, 0, 18, -50, 18], metal);
      ellipse(ctx, -20, 4, 22, 18, '#4a4a52', 3);
      for (let i = 0; i < 6; i++) circle(ctx, -20 + Math.cos(i * 1.05) * 12, 4 + Math.sin(i * 1.05) * 10, 4, '#2a2a2e', 1.5);
      poly(ctx, [0, -10, 74, -14, 74, 14, 0, 16], '#2e2e34');
      ellipse(ctx, 75, 0, 5, 14, '#111', 2);
      break;
    case 'crossbow':
      poly(ctx, [-80, 4, 40, -2, 40, 8, -80, 14], wood);
      ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(30, -40); ctx.quadraticCurveTo(46, 4, 30, 48); ctx.stroke();
      ctx.strokeStyle = '#d8dce4'; ctx.lineWidth = 3; ctx.stroke();
      line(ctx, 30, -40, -30, 5, '#d8c8a0', 1.5); line(ctx, 30, 48, -30, 5, '#d8c8a0', 1.5);
      poly(ctx, [-30, 2, 70, 0, 84, 4, 70, 8, -30, 6], '#e8eef4', 2, 0);
      glow(ctx, 10, 4, 30, '#7fd8ff', 0.6 + Math.sin(t * 3) * 0.2);
      for (let i = 0; i < 4; i++) star(ctx, -60 + i * 16, 9, 3, 4, '#7fd8ff', 0);
      break;
    case 'gatling':
      gear(ctx, -56, 4, 22, 10, brass, t * 2, 2.5);
      poly(ctx, [-40, -22, 0, -22, 0, 26, -40, 26], '#5a4a40');
      for (let i = 0; i < 5; i++) {
        const y = -16 + i * 8;
        poly(ctx, [0, y - 3, 94, y - 3 + i * 0.5, 94, y + 3 + i * 0.5, 0, y + 3], i % 2 ? '#3a3a40' : '#4a4a52', 2, 0);
      }
      poly(ctx, [60, -24, 70, -24, 70, 30, 60, 30], brass);
      poly(ctx, [-30, 26, -14, 26, -24, 50, -40, 50], wood);
      break;
    default: break;
  }
  ctx.restore();
}

export function drawCoinIcon(ctx, x, y, r) { coin(ctx, x, y, r, Math.max(1.2, r * 0.18)); }
