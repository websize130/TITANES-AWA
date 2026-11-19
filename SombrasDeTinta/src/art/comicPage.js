// Páginas de cómic procedurales: viñetas asimétricas con escenas en claroscuro, cartelas de máquina de
// escribir, bocadillos, sellos de tinta finales y portadas pulp de "Game Over".
import {
  INK, TAU, makeCanvas, makeRng, rgba, shade, glow, halftone, inkText, wrapText, stamp, FT, FB, poly, ellipse, circle, line, skull, flame, star, grainPattern,
} from './ink.js';
import { drawHero } from './heroArt.js';
import { drawZombie } from './zombieArt.js';
import { renderProp } from './worldArt.js';

// ------------------------------------------------------------------ utilidades de escena
function sky(ctx, x, y, w, h, top, bottom) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
}
function moon(ctx, x, y, r, col = '#e8dcb8') {
  glow(ctx, x, y, r * 3, col, 0.35);
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.2, r * 0.25, 0, TAU); ctx.arc(x + r * 0.3, y + r * 0.3, r * 0.18, 0, TAU); ctx.fill();
}
function ridge(ctx, x, y, w, h, base, col, seed, jag = 0.15) {
  const r = makeRng(seed);
  ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(x, y + h);
  let xx = x; ctx.lineTo(x, base);
  while (xx < x + w) { xx += w * (0.03 + r() * 0.06); ctx.lineTo(xx, base - r() * h * jag); }
  ctx.lineTo(x + w, y + h); ctx.fill();
}
function silhouette(src, color = '#050304') {
  const c = makeCanvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
function figure(drawFn, w, h, scale, oy = 0.95) {
  const c = makeCanvas(w, h), x = c.getContext('2d');
  x.translate(w / 2, h * oy); x.scale(scale, scale); drawFn(x);
  return c;
}
function hatchShade(ctx, x, y, w, h, a = 0.25) {
  ctx.save(); ctx.strokeStyle = `rgba(0,0,0,${a})`; ctx.lineWidth = 1;
  ctx.beginPath(); for (let i = -h; i < w; i += 5) { ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); } ctx.stroke(); ctx.restore();
}
function rimLight(ctx, img, x, y, w, h, color) {
  // contraluz: el sprite en negro con borde de color desplazado
  ctx.save(); ctx.globalAlpha = 0.9;
  const s = silhouette(img, color); ctx.drawImage(s, x + 3, y - 2, w, h); ctx.restore();
}

// ------------------------------------------------------------------ escenas
const SCENES = {
  hero(ctx, x, y, w, h, hero, pal) {
    sky(ctx, x, y, w, h, '#1a0e0a', '#050304');
    glow(ctx, x + w * 0.8, y + h * 0.25, w * 0.7, pal.glow, 0.35);
    halftone(ctx, x, y, w, h, 7, '#000000', 0.5, false);
    const sc = (h * 1.08) / 190;
    const img = figure((c) => drawHero(c, hero.id, pal, 1, 42), 260 * sc, 220 * sc, sc, 0.98);
    const ix = x + w * 0.55 - img.width / 2, iy = y + h * 1.22 - img.height;
    rimLight(ctx, img, ix, iy, img.width, img.height, pal.glow);
    ctx.drawImage(img, ix, iy);
    // claroscuro: mitad izquierda en sombra
    const g = ctx.createLinearGradient(x, 0, x + w, 0);
    g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.55, 'rgba(0,0,0,0.15)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  },
  town(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, '#2a1e2a', '#7a3a1e');
    moon(ctx, x + w * 0.72, y + h * 0.28, Math.min(w, h) * 0.12);
    halftone(ctx, x, y, w, h, 6, '#000000', 0.45, true);
    ctx.fillStyle = '#080506';
    const base = y + h * 0.72;
    for (let i = 0, xx = x; xx < x + w; i++) {
      const bw = w * (0.08 + (i * 37 % 5) * 0.02), bh = h * (0.16 + (i * 53 % 4) * 0.06);
      ctx.fillRect(xx, base - bh, bw, bh + h); if (i % 3 === 0) ctx.fillRect(xx + bw * 0.1, base - bh - h * 0.05, bw * 0.8, h * 0.05);
      ctx.fillStyle = 'rgba(255,170,60,0.55)'; if (i % 2) ctx.fillRect(xx + bw * 0.35, base - bh * 0.6, bw * 0.2, bh * 0.15); ctx.fillStyle = '#080506';
      xx += bw + w * 0.01;
    }
    // iglesia con reloj
    const cx = x + w * 0.25; ctx.beginPath(); ctx.moveTo(cx - w * 0.06, base); ctx.lineTo(cx - w * 0.06, base - h * 0.32); ctx.lineTo(cx, base - h * 0.5); ctx.lineTo(cx + w * 0.06, base - h * 0.32); ctx.lineTo(cx + w * 0.06, base); ctx.fill();
    ctx.fillStyle = '#d8c8a0'; ctx.beginPath(); ctx.arc(cx, base - h * 0.34, h * 0.035, 0, TAU); ctx.fill();
    line(ctx, cx, base - h * 0.34, cx + h * 0.012, base - h * 0.36, INK, 1.5); line(ctx, cx, base - h * 0.34, cx, base - h * 0.31, INK, 1.5);
    ctx.fillStyle = '#050304'; ctx.fillRect(x, base, w, h);
  },
  horde(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, '#3a0806', '#120404');
    moon(ctx, x + w * 0.5, y + h * 0.35, Math.min(w, h) * 0.22, '#c84a2a');
    halftone(ctx, x, y, w, h, 6, '#000000', 0.5, true);
    const types = ['walker', 'runner', 'walker', 'bloater', 'forker', 'walker', 'armored', 'walker'];
    const n = 9;
    for (let i = 0; i < n; i++) {
      const s = (h * (0.5 + (i % 3) * 0.12)) / 190;
      const img = silhouette(figure((c) => drawZombie(c, types[i % types.length], 0, i), 220 * s, 200 * s, s), '#070405');
      ctx.drawImage(img, x + (i / (n - 1)) * w - img.width / 2, y + h * (0.98 + (i % 2) * 0.05) - img.height);
    }
    ctx.fillStyle = '#050304'; ctx.fillRect(x, y + h * 0.95, w, h * 0.1);
  },
  trap(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, '#1e1612', '#0a0806');
    glow(ctx, x + w * 0.7, y + h * 0.3, w * 0.4, '#ffb040', 0.5);
    halftone(ctx, x, y, w, h, 6, '#000000', 0.4, false);
    const items = [['lantern_lit', 0.72, 1.7], ['beartrap_open', 0.25, 2.2], ['dynbarrel', 0.48, 1.6]];
    for (const [t, fx, k] of items) {
      const p = renderProp(t, 1); const s = (h / 300) * k;
      ctx.drawImage(p.canvas, x + w * fx - p.ox * s, y + h * 0.92 - p.oy * s, p.w * s, p.h * s);
    }
  },
  grave(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, '#1a1a24', '#06060a');
    moon(ctx, x + w * 0.25, y + h * 0.25, Math.min(w, h) * 0.13);
    halftone(ctx, x, y, w, h, 6, '#000000', 0.4, true);
    ctx.fillStyle = '#060406'; ctx.beginPath(); ctx.ellipse(x + w * 0.5, y + h * 1.0, w * 0.6, h * 0.3, 0, 0, TAU); ctx.fill();
    const cx = x + w * 0.62, cy = y + h * 0.78;
    ctx.fillRect(cx - w * 0.015, cy - h * 0.45, w * 0.03, h * 0.45); ctx.fillRect(cx - w * 0.08, cy - h * 0.36, w * 0.16, h * 0.035);
    // mano que emerge
    ctx.save(); ctx.translate(x + w * 0.38, y + h * 0.82); const s = h / 140; ctx.scale(s, s);
    poly(ctx, [-6, 20, -8, -10, -14, -30, -10, -32, -4, -16, -4, -40, 0, -40, 1, -18, 4, -44, 8, -44, 7, -16, 12, -36, 15, -34, 10, -10, 8, 20], '#7a8a74', 2.5, 0);
    ctx.restore();
  },
  eye(ctx, x, y, w, h) {
    ctx.fillStyle = '#050304'; ctx.fillRect(x, y, w, h);
    const g = ctx.createLinearGradient(x, y + h * 0.35, x, y + h * 0.65);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, 'rgba(176,122,85,0.95)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y + h * 0.3, w, h * 0.4);
    halftone(ctx, x, y, w, h, 5, '#000000', 0.55, false);
    const ex = x + w * 0.55, ey = y + h * 0.5, er = Math.min(w, h) * 0.16;
    ctx.fillStyle = '#e8dcc8'; ctx.beginPath(); ctx.ellipse(ex, ey, er * 1.6, er * 0.7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.arc(ex, ey, er * 0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, er * 0.3, 0, TAU); ctx.fill();
    glow(ctx, ex, ey, er * 2, '#ffb347', 0.5);
    ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.beginPath(); ctx.ellipse(ex, ey, er * 1.6, er * 0.7, 0, 0, TAU); ctx.stroke();
    line(ctx, x + w * 0.25, y + h * 0.2, x + w * 0.38, y + h * 0.85, '#5a1a10', 5);
  },
  devil(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, '#2a0806', '#050304');
    glow(ctx, x + w * 0.5, y + h * 0.55, w * 0.45, '#ff6a2a', 0.5);
    halftone(ctx, x, y, w, h, 6, '#000000', 0.45, false);
    const cx = x + w * 0.5;
    ctx.fillStyle = '#060304';
    ctx.beginPath(); ctx.ellipse(cx, y + h * 0.42, w * 0.14, h * 0.18, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx - w * 0.1, y + h * 0.3); ctx.quadraticCurveTo(cx - w * 0.22, y + h * 0.12, cx - w * 0.16, y + h * 0.02); ctx.quadraticCurveTo(cx - w * 0.14, y + h * 0.16, cx - w * 0.05, y + h * 0.27); ctx.fill();
    ctx.beginPath(); ctx.moveTo(cx + w * 0.1, y + h * 0.3); ctx.quadraticCurveTo(cx + w * 0.22, y + h * 0.12, cx + w * 0.16, y + h * 0.02); ctx.quadraticCurveTo(cx + w * 0.14, y + h * 0.16, cx + w * 0.05, y + h * 0.27); ctx.fill();
    ctx.fillRect(cx - w * 0.3, y + h * 0.55, w * 0.6, h * 0.5);
    glow(ctx, cx - w * 0.04, y + h * 0.4, 10, '#ff2a12', 1); glow(ctx, cx + w * 0.04, y + h * 0.4, 10, '#ff2a12', 1);
    // mesa y naipes
    ctx.fillStyle = '#2a1408'; ctx.fillRect(x, y + h * 0.72, w, h * 0.3);
    for (let i = 0; i < 4; i++) { ctx.save(); ctx.translate(x + w * (0.3 + i * 0.12), y + h * 0.8); ctx.rotate(-0.2 + i * 0.13); poly(ctx, [-10, -16, 10, -16, 10, 16, -10, 16], '#f2e6cc', 2, 0); ctx.restore(); }
    flame(ctx, x + w * 0.12, y + h * 0.7, 0.5, '#ff6a12', '#ffb02a', '#fff2c0', 0, 1);
    ctx.fillStyle = '#c41a12'; ctx.beginPath(); ctx.ellipse(cx + w * 0.18, y + h * 0.66, w * 0.05, h * 0.04, 0, 0, TAU); ctx.fill(); // guante rojo
  },
  cards(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, '#1a0a10', '#050304');
    halftone(ctx, x, y, w, h, 6, '#000000', 0.4, false);
    const cx = x + w * 0.5, cy = y + h * 0.85, s = h / 140;
    for (let i = -3; i <= 3; i++) {
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(i * 0.22); ctx.scale(s, s);
      poly(ctx, [-18, -90, 18, -90, 18, -40, -18, -40], i === 0 ? '#f2e6cc' : '#d8ccb0', 2.5, 0);
      if (i === 0) skull(ctx, 0, -64, 0.8, '#120a06', 1);
      else { ctx.font = 'bold 16px serif'; ctx.textAlign = 'center'; ctx.fillStyle = i % 2 ? '#a01a14' : '#120a06'; ctx.fillText(i % 2 ? '♥' : '♠', 0, -60); }
      ctx.restore();
    }
    // el suelo sin sombra
    ctx.fillStyle = 'rgba(255,230,180,0.15)'; ctx.fillRect(x, y + h * 0.9, w, h * 0.1);
  },
  chapel(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, '#3a1206', '#0a0402');
    glow(ctx, x + w * 0.5, y + h * 0.6, w * 0.6, '#ff6a12', 0.7);
    halftone(ctx, x, y, w, h, 6, '#000000', 0.45, true);
    const cx = x + w * 0.5, base = y + h * 0.9;
    ctx.fillStyle = '#060304';
    ctx.beginPath(); ctx.moveTo(cx - w * 0.22, base); ctx.lineTo(cx - w * 0.22, base - h * 0.35); ctx.lineTo(cx, base - h * 0.55); ctx.lineTo(cx + w * 0.22, base - h * 0.35); ctx.lineTo(cx + w * 0.22, base); ctx.fill();
    ctx.fillRect(cx - w * 0.03, base - h * 0.78, w * 0.06, h * 0.25); ctx.fillRect(cx - w * 0.07, base - h * 0.72, w * 0.14, h * 0.035);
    for (let i = 0; i < 5; i++) flame(ctx, cx - w * 0.18 + i * w * 0.09, base - h * 0.32, h / 110, '#ff4a12', '#ffb02a', '#fff2c0', i, i);
    ctx.fillStyle = '#050304'; ctx.fillRect(x, base, w, h);
  },
  cross(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, '#6a2a14', '#e8a04a');
    glow(ctx, x + w * 0.5, y + h * 0.75, w * 0.5, '#ffe08a', 0.6);
    halftone(ctx, x, y, w, h, 6, '#3a1206', 0.4, true);
    ctx.fillStyle = '#080404';
    const cx = x + w * 0.5; ctx.fillRect(cx - w * 0.02, y + h * 0.15, w * 0.04, h * 0.7); ctx.fillRect(cx - w * 0.12, y + h * 0.3, w * 0.24, h * 0.045);
    ctx.fillRect(x, y + h * 0.85, w, h * 0.15);
    // figura con escopeta
    const fx = x + w * 0.22, fy = y + h * 0.86, s = h / 260;
    ctx.save(); ctx.translate(fx, fy); ctx.scale(s, s);
    ctx.fillRect(-14, -150, 28, 150); ctx.fillRect(-30, -170, 60, 10); ctx.fillRect(-12, -186, 24, 18); ctx.fillRect(10, -120, 70, 7);
    ctx.restore();
  },
  mine(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, '#14100c', '#050403');
    const cx = x + w * 0.5;
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(cx - w * 0.25, y + h); ctx.lineTo(cx - w * 0.2, y + h * 0.3); ctx.quadraticCurveTo(cx, y + h * 0.15, cx + w * 0.2, y + h * 0.3); ctx.lineTo(cx + w * 0.25, y + h); ctx.fill();
    ctx.fillStyle = '#4a3424';
    ctx.fillRect(cx - w * 0.27, y + h * 0.25, w * 0.05, h * 0.75); ctx.fillRect(cx + w * 0.22, y + h * 0.25, w * 0.05, h * 0.75); ctx.fillRect(cx - w * 0.3, y + h * 0.22, w * 0.6, h * 0.06);
    glow(ctx, cx + w * 0.32, y + h * 0.42, w * 0.2, '#ffb040', 0.7);
    halftone(ctx, x, y, w, h, 6, '#000000', 0.45, false);
    for (let i = 0; i < 3; i++) glow(ctx, cx - w * 0.06 + i * w * 0.06, y + h * 0.6 + (i % 2) * 6, 8, '#d8e8b0', 0.9);
  },
  swamp(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, '#1a2a24', '#060a08');
    moon(ctx, x + w * 0.7, y + h * 0.22, Math.min(w, h) * 0.1, '#c8d8b0');
    halftone(ctx, x, y, w, h, 6, '#000000', 0.45, true);
    ctx.fillStyle = '#040604'; ctx.fillRect(x, y + h * 0.7, w, h * 0.3);
    ctx.fillStyle = 'rgba(200,220,180,0.12)'; for (let i = 0; i < 6; i++) ctx.fillRect(x + w * 0.1 + i * w * 0.14, y + h * (0.76 + (i % 3) * 0.05), w * 0.08, 2);
    for (let i = 0; i < 4; i++) {
      const tx = x + w * (0.1 + i * 0.27), s = h / 130;
      ctx.save(); ctx.translate(tx, y + h * 0.72); ctx.scale(s, s);
      poly(ctx, [-6, 0, -5, -60, -26, -90, -22, -94, -3, -72, 0, -110, 5, -110, 5, -74, 24, -96, 28, -92, 7, -60, 7, 0], '#050705', 0, 0);
      ctx.restore();
    }
  },
  eyes(ctx, x, y, w, h) {
    ctx.fillStyle = '#030403'; ctx.fillRect(x, y, w, h);
    halftone(ctx, x, y, w, h, 6, '#1a2a1a', 0.5, false);
    ctx.strokeStyle = '#0e160c'; ctx.lineWidth = 3; ctx.beginPath();
    for (let i = 0; i < 30; i++) { const xx = x + (i / 30) * w; ctx.moveTo(xx, y + h); ctx.quadraticCurveTo(xx + 6, y + h * 0.6, xx - 4 + (i % 3) * 6, y + h * (0.2 + (i % 4) * 0.1)); }
    ctx.stroke();
    for (const ex of [0.42, 0.58]) { glow(ctx, x + w * ex, y + h * 0.45, h * 0.12, '#ffe02a', 1); ctx.fillStyle = '#fff060'; ctx.beginPath(); ctx.ellipse(x + w * ex, y + h * 0.45, h * 0.04, h * 0.02, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.fillRect(x + w * ex - 1.5, y + h * 0.43, 3, h * 0.04); }
  },
  pulpit(ctx, x, y, w, h) {
    sky(ctx, x, y, w, h, '#2a0606', '#060202');
    glow(ctx, x + w * 0.5, y + h * 0.35, w * 0.5, '#c81a1a', 0.5);
    halftone(ctx, x, y, w, h, 6, '#000000', 0.45, false);
    ctx.fillStyle = '#050202';
    for (let i = 0; i < 4; i++) { const cx = x + w * (0.12 + i * 0.25); ctx.fillRect(cx - w * 0.025, y, w * 0.05, h); }
    ctx.beginPath(); ctx.moveTo(x + w * 0.38, y + h); ctx.lineTo(x + w * 0.4, y + h * 0.6); ctx.lineTo(x + w * 0.6, y + h * 0.6); ctx.lineTo(x + w * 0.62, y + h); ctx.fill();
    for (let i = 0; i < 5; i++) { ctx.fillRect(x + w * 0.05, y + h * (0.75 + i * 0.05), w * 0.28, h * 0.02); ctx.fillRect(x + w * 0.67, y + h * (0.75 + i * 0.05), w * 0.28, h * 0.02); }
  },
  sunrise(ctx, x, y, w, h, hero, pal) {
    sky(ctx, x, y, w, h, '#4a1e10', '#ffb04a');
    const sx = x + w * 0.5, sy = y + h * 0.78;
    glow(ctx, sx, sy, w * 0.6, '#ffe08a', 0.9);
    ctx.fillStyle = '#ffe8a8'; ctx.beginPath(); ctx.arc(sx, sy, h * 0.18, Math.PI, 0); ctx.fill();
    halftone(ctx, x, y, w, h, 6, '#6a2a10', 0.35, true);
    ctx.fillStyle = '#0a0404'; ctx.fillRect(x, sy, w, h);
    const s = (h * 0.5) / 190;
    const img = silhouette(figure((c) => drawHero(c, hero.id, pal, 0, 3), 200 * s, 220 * s, s), '#0a0404');
    ctx.drawImage(img, x + w * 0.3 - img.width / 2, sy + 4 - img.height);
    ctx.fillStyle = 'rgba(10,4,4,0.8)'; ctx.fillRect(x + w * 0.3 - img.width * 0.6, sy, w * 0.5, 4);
  },
  fallen(ctx, x, y, w, h, hero, pal) {
    sky(ctx, x, y, w, h, '#4a0606', '#0a0202');
    moon(ctx, x + w * 0.5, y + h * 0.3, Math.min(w, h) * 0.18, '#d83a1a');
    halftone(ctx, x, y, w, h, 6, '#000000', 0.5, true);
    const s = (h * 0.55) / 190;
    const img = silhouette(figure((c) => drawHero(c, hero.id, pal, 0, 5), 220 * s, 220 * s, s), '#060202');
    ctx.save(); ctx.translate(x + w * 0.5, y + h * 0.8); ctx.rotate(-1.35); ctx.drawImage(img, -img.width / 2, -img.height * 0.6); ctx.restore();
    ctx.fillStyle = '#060202'; ctx.fillRect(x, y + h * 0.85, w, h * 0.15);
    for (let i = 0; i < 7; i++) {
      ctx.save(); ctx.translate(x + w * (0.1 + i * 0.13), y + h); ctx.rotate((i - 3) * 0.12); const k = h / 160; ctx.scale(k, k);
      poly(ctx, [-6, 10, -8, -40, -14, -60, -10, -62, -4, -46, -4, -70, 0, -70, 1, -48, 4, -74, 8, -74, 7, -46, 12, -66, 15, -64, 10, -40, 8, 10], '#0a0606', 0, 0);
      ctx.restore();
    }
  },
};
SCENES.butcher = (ctx, x, y, w, h) => {
  sky(ctx, x, y, w, h, '#2a0a06', '#080302');
  glow(ctx, x + w * 0.3, y + h * 0.2, w * 0.5, '#ffb040', 0.5);
  halftone(ctx, x, y, w, h, 6, '#000000', 0.45, false);
  ctx.strokeStyle = '#3a3a3e'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x, y + h * 0.12); ctx.lineTo(x + w, y + h * 0.12); ctx.stroke();
  for (let i = 0; i < 5; i++) {
    const hx = x + w * (0.12 + i * 0.19), len = h * (0.3 + (i % 2) * 0.12);
    ctx.strokeStyle = '#8a8a90'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(hx, y + h * 0.12); ctx.lineTo(hx, y + h * 0.2); ctx.arc(hx - 6, y + h * 0.2, 6, 0, Math.PI); ctx.stroke();
    ctx.fillStyle = '#060303'; ctx.beginPath(); ctx.ellipse(hx - 4, y + h * 0.2 + len * 0.55, w * 0.045, len * 0.5, 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,10,10,0.6)'; ctx.fillRect(hx - 8, y + h * 0.2 + len * 0.4, 8, 4);
  }
  ctx.fillStyle = '#1a0e08'; ctx.fillRect(x, y + h * 0.78, w, h * 0.22);
  ctx.fillStyle = '#c8c0b0'; ctx.save(); ctx.translate(x + w * 0.7, y + h * 0.74); ctx.rotate(-0.2); ctx.fillRect(0, -10, w * 0.12, 20); ctx.fillStyle = '#3a2414'; ctx.fillRect(-w * 0.06, -5, w * 0.06, 10); ctx.restore();
  inkText(ctx, 'CARNICERÍA McGOVERN', x + w * 0.5, y + h * 0.06, Math.min(w * 0.06, 20), '#e8dcc0', FT, 3);
};
function bossScene(type, col) {
  return (ctx, x, y, w, h) => {
    sky(ctx, x, y, w, h, '#0a0606', '#050304');
    glow(ctx, x + w * 0.5, y + h, w * 0.7, col, 0.7);
    halftone(ctx, x, y, w, h, 6, '#000000', 0.5, false);
    const s = (h * 0.8) / 290;
    const img = figure((c) => drawZombie(c, type, 1, 9), 400 * s, 330 * s, s, 0.97);
    ctx.drawImage(img, x + w * 0.5 - img.width / 2, y + h * 1.04 - img.height);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(0.5, 'rgba(0,0,0,0.1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  };
}
SCENES.boss_foreman = bossScene('foreman', '#ffb040');
SCENES.boss_faceless = bossScene('faceless', '#9a7aff');
SCENES.boss_beast = bossScene('beast', '#7aff3a');
SCENES.boss_plague = bossScene('plague', '#9dff3a');
SCENES.boss_spawn = bossScene('spawn', '#ffb040');

// ------------------------------------------------------------------ maquetación de viñetas
const LAYOUTS_L = {
  1: [[0, 0, 1, 0, 1, 1, 0, 1]],
  2: [[0, 0, 0.56, 0, 0.5, 1, 0, 1], [0.56, 0, 1, 0, 1, 1, 0.5, 1]],
  3: [[0, 0, 0.6, 0, 0.54, 1, 0, 1], [0.6, 0, 1, 0, 1, 0.46, 0.575, 0.52], [0.575, 0.52, 1, 0.46, 1, 1, 0.54, 1]],
  4: [[0, 0, 0.44, 0, 0.4, 0.492, 0, 0.54], [0.44, 0, 1, 0, 1, 0.42, 0.4, 0.492], [0, 0.54, 0.58, 0.47, 0.5, 1, 0, 1], [0.58, 0.47, 1, 0.42, 1, 1, 0.5, 1]],
};
function layoutPortrait(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = i / n, b = (i + 1) / n, s = 0.025;
    const ta = i === 0 ? 0 : a + (i % 2 ? s : -s), tb = i === 0 ? 0 : a - (i % 2 ? s : -s);
    const ba = i === n - 1 ? 1 : b + ((i + 1) % 2 ? s : -s), bb = i === n - 1 ? 1 : b - ((i + 1) % 2 ? s : -s);
    out.push([0, ta, 1, tb, 1, bb, 0, ba]);
  }
  return out;
}
function inset(pts, d) {
  let cx = 0, cy = 0;
  for (let i = 0; i < 8; i += 2) { cx += pts[i] / 4; cy += pts[i + 1] / 4; }
  const o = [];
  for (let i = 0; i < 8; i += 2) { const dx = cx - pts[i], dy = cy - pts[i + 1], l = Math.hypot(dx, dy) || 1; o.push(pts[i] + (dx / l) * d, pts[i + 1] + (dy / l) * d); }
  return o;
}
function pbox(p) { const xs = [p[0], p[2], p[4], p[6]], ys = [p[1], p[3], p[5], p[7]]; const x = Math.min(...xs), y = Math.min(...ys); return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }; }

function caption(ctx, text, x, y, maxW, size) {
  ctx.font = `bold ${size}px "${FB}", "Courier New", monospace`;
  const lines = wrapText(ctx, text, maxW - size);
  const lh = size * 1.22, w = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * 1.2), h = lines.length * lh + size * 0.8;
  ctx.fillStyle = '#e8d8a8'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = 'rgba(120,80,30,0.15)'; for (let i = 0; i < 30; i++) ctx.fillRect(x + Math.random() * w, y + Math.random() * h, 2, 2);
  ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#1a0e06'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, x + size * 0.6, y + size * 0.45 + i * lh));
  return h;
}

export function balloon(ctx, text, x, y, maxW, size, tailX, tailY, scream = false) {
  ctx.font = `bold ${size}px "${FB}", "Courier New", monospace`;
  const lines = wrapText(ctx, text, maxW);
  const lh = size * 1.2, tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const rx = tw / 2 + size * 1.0, ry = (lines.length * lh) / 2 + size * 0.7;
  ctx.save();
  ctx.fillStyle = scream ? '#fff2a0' : '#fbf6ea'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
  ctx.beginPath();
  if (scream) {
    for (let i = 0; i < 28; i++) { const a = (i / 28) * TAU, k = i % 2 ? 0.86 : 1.12; const px = x + Math.cos(a) * rx * k, py = y + Math.sin(a) * ry * k; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath();
  } else ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill(); ctx.stroke();
  if (tailX !== undefined) {
    const a = Math.atan2(tailY - y, tailX - x), bx = x + Math.cos(a) * rx * 0.8, by = y + Math.sin(a) * ry * 0.8;
    ctx.beginPath(); ctx.moveTo(bx - Math.sin(a) * size * 0.6, by + Math.cos(a) * size * 0.6); ctx.lineTo(tailX, tailY); ctx.lineTo(bx + Math.sin(a) * size * 0.6, by - Math.cos(a) * size * 0.6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = scream ? '#fff2a0' : '#fbf6ea'; ctx.beginPath(); ctx.ellipse(x, y, rx - 2, ry - 2, 0, 0, TAU); ctx.fill();
  }
  ctx.fillStyle = '#120a06'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  lines.forEach((l, i) => ctx.fillText(l, x, y - ((lines.length - 1) * lh) / 2 + i * lh));
  ctx.restore();
  return { rx, ry };
}

// Pinta una página completa en un canvas (W×H CSS px). Devuelve los polígonos para animar.
export function renderPage(canvas, panels, hero, pal, opts = {}) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const W = opts.w, H = opts.h;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // papel envejecido
  ctx.fillStyle = '#efe2c4'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = grainPattern(ctx, 'rgba(120,80,30,0.08)', 14); ctx.fillRect(0, 0, W, H); // grano cacheado
  const m = Math.max(10, W * 0.02), gut = Math.max(5, W * 0.008);
  const portrait = H > W * 1.05;
  const lay = portrait ? layoutPortrait(panels.length) : LAYOUTS_L[Math.min(4, panels.length)];
  const polys = [];
  const fs = Math.max(11, Math.min(17, W * (portrait ? 0.034 : 0.016)));
  panels.forEach((pn, i) => {
    const raw = lay[i].map((v, k) => (k % 2 ? m + v * (H - m * 2) : m + v * (W - m * 2)));
    const p = inset(raw, gut);
    polys.push(p);
    const b = pbox(p);
    ctx.save();
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let k = 2; k < 8; k += 2) ctx.lineTo(p[k], p[k + 1]); ctx.closePath(); ctx.clip();
    (SCENES[pn.scene] || SCENES.town)(ctx, b.x, b.y, b.w, b.h, hero, pal);
    if (pn.cap) {
      const cx = Math.max(p[0], p[6]) + 10, cy = Math.max(p[1], p[3]) + 10;
      caption(ctx, pn.cap, cx, cy, Math.min(Math.min(p[2], p[4]) - cx - 10, 440), fs);
    }
    if (pn.say) balloon(ctx, pn.say, b.x + b.w * 0.68, b.y + b.h * 0.72, Math.min(b.w * 0.42, 220), fs, b.x + b.w * 0.55, b.y + b.h * 0.95);
    if (pn.say2) balloon(ctx, pn.say2, b.x + b.w * 0.3, b.y + b.h * 0.78, Math.min(b.w * 0.4, 220), fs * 1.1, b.x + b.w * 0.45, b.y + b.h * 0.98, true);
    ctx.restore();
    ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.lineJoin = 'miter';
    ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let k = 2; k < 8; k += 2) ctx.lineTo(p[k], p[k + 1]); ctx.closePath(); ctx.stroke();
  });
  if (opts.stamp) stamp(ctx, opts.stamp, W * 0.5, H * 0.5, Math.min(W, H) * 0.09, opts.stampColor || '#b3201a', -0.16);
  if (opts.title) {
    ctx.font = `${Math.round(fs * 1.2)}px "${FT}", Georgia, serif`;
    const tw = ctx.measureText(opts.title).width + 24;
    ctx.fillStyle = '#120a06'; ctx.fillRect(W - m - tw - 6, H - m - fs * 2.1, tw, fs * 1.8);
    inkText(ctx, opts.title, W - m - 6 - tw / 2, H - m - fs * 1.2, fs * 1.2, '#efe2c4', FT, 0);
  }
  return polys;
}

// ------------------------------------------------------------------ portada pulp de Game Over
export function renderPulpCover(canvas, d, W, H) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const r = makeRng(d.seed || 7);
  // fondo
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#d8341a'); g.addColorStop(0.5, '#6a0a06'); g.addColorStop(1, '#1a0202');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  moon(ctx, W * 0.62, H * 0.42, W * 0.2, '#ffd27a');
  halftone(ctx, 0, 0, W, H, 7, '#000000', 0.45, false);
  // forajido cayendo + manos de la horda
  const s = (H * 0.55) / 190;
  const fig = figure((c) => drawHero(c, d.hero.id, d.pal, 1, 11), 240 * s, 230 * s, s, 0.95);
  ctx.save(); ctx.translate(W * 0.46, H * 0.72); ctx.rotate(-0.5); ctx.drawImage(fig, -fig.width / 2, -fig.height * 0.75); ctx.restore();
  for (let i = 0; i < 9; i++) {
    ctx.save(); ctx.translate(W * (0.04 + i * 0.115), H * 1.02); ctx.rotate((i - 4) * 0.13 + (r() - 0.5) * 0.2); const k = H / (330 + (i % 3) * 60); ctx.scale(k, k);
    poly(ctx, [-8, 10, -10, -50, -18, -76, -13, -78, -5, -58, -5, -88, 0, -88, 1, -60, 5, -92, 10, -92, 9, -58, 15, -82, 19, -80, 13, -50, 10, 10], i % 2 ? '#5e6a5a' : '#7a8a74', 3, 0);
    ctx.restore();
  }
  // cabecera
  ctx.fillStyle = '#f2d23a'; ctx.fillRect(0, 0, W, H * 0.17);
  ctx.fillStyle = '#120a06'; ctx.fillRect(0, H * 0.17, W, 4);
  ctx.font = `100px "${FT}", Georgia, serif`;
  const mw = ctx.measureText('RELATOS MACABROS').width;
  inkText(ctx, 'RELATOS MACABROS', W * 0.42, H * 0.075, Math.min((W * 0.76 * 100) / mw, H * 0.07), '#b3201a', FT, 5);
  inkText(ctx, 'DEL OESTE  ·  HISTORIAS QUE NO DEJAN DORMIR', W * 0.46, H * 0.142, Math.min(W * 0.03, 13), '#120a06', FB, 0);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(W * 0.91, H * 0.085, W * 0.06, 0, TAU); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  inkText(ctx, '10¢', W * 0.91, H * 0.08, W * 0.04, '#b3201a', FT, 0);
  inkText(ctx, `Nº ${d.issue}`, W * 0.91, H * 0.135, W * 0.022, '#120a06', FB, 0);
  // titular trágico
  ctx.save(); ctx.translate(W * 0.5, H * 0.27); ctx.rotate(-0.05);
  ctx.fillStyle = '#120a06'; ctx.fillRect(-W * 0.47, -H * 0.055, W * 0.94, H * 0.11);
  ctx.font = `${Math.round(W * 0.06)}px "${FT}", Georgia, serif`;
  let hs = W * 0.06; const hw = ctx.measureText(d.headline).width; if (hw > W * 0.88) hs *= (W * 0.88) / hw;
  inkText(ctx, d.headline, 0, 0, hs, '#f2d23a', FT, 0);
  ctx.restore();
  // subtitulares
  const blurbs = d.blurbs || [];
  blurbs.forEach((b, i) => {
    const bx = i % 2 ? W * 0.62 : W * 0.04, by = H * (0.36 + i * 0.1);
    ctx.save(); ctx.translate(bx, by); ctx.rotate(i % 2 ? 0.05 : -0.04);
    ctx.font = `bold ${Math.round(Math.min(W * 0.03, 14))}px "${FB}", monospace`;
    const lines = wrapText(ctx, b, W * 0.32), lh = Math.min(W * 0.034, 16);
    ctx.fillStyle = '#f2e6c8'; ctx.fillRect(0, 0, W * 0.34, lines.length * lh + 12);
    ctx.lineWidth = 2.5; ctx.strokeStyle = INK; ctx.strokeRect(0, 0, W * 0.34, lines.length * lh + 12);
    ctx.fillStyle = '#120a06'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    lines.forEach((l, k) => ctx.fillText(l, 8, 6 + k * lh));
    ctx.restore();
  });
  if (d.stamp) stamp(ctx, d.stamp, W * 0.74, H * 0.86, Math.min(W, H) * 0.06, '#f2d23a', -0.2);
  // desgaste del papel
  ctx.fillStyle = grainPattern(ctx, 'rgba(240,220,180,0.08)', 28); ctx.fillRect(0, 0, W, H); // grano cacheado
  ctx.lineWidth = 6; ctx.strokeStyle = '#120a06'; ctx.strokeRect(3, 3, W - 6, H - 6);
}

// Pinta una escena suelta (portada, retratos de dossier).
export function paintScene(ctx, scene, x, y, w, h, hero, pal) {
  (SCENES[scene] || SCENES.town)(ctx, x, y, w, h, hero, pal);
}
