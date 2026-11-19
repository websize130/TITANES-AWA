// Render con claroscuro: el mundo se pinta completo y luego una capa de oscuridad con trama de semitono
// se "recorta" con las fuentes de luz (farol del forajido, faroles de gas, fuego, explosiones, fogonazos).
// Encima, en aditivo, balas, chispas y ojos de la horda brillando en la penumbra.
import { HX, HY, BK, EK, PK, PT, ZK } from './engine.js';
import { ZONES } from '../data/story.js';
import { pokerFace } from '../art/cardArt.js';
import { drawHud } from './hud.js';
import { makeCanvas, INK, TAU, halftonePattern, makeRng, skull as skullArt } from '../art/ink.js';
import { RIG } from '../art/heroArt.js';
import { Z_ANIM, Z_ATK } from '../art/zombieArt.js';
const BOSS_AURA = { foreman: '#ffb040', faceless: '#a88aff', plague: '#9dff3a', spawn: '#ff8a2a', beast: '#9dff3a' };

// Oscuridad base por mapa (más baja: el Oeste Gótico se ve, la tinta solo enmarca)
const DARK = { crossroads: 0.54, town: 0.5, chapel: 0.56, mine: 0.6, swamp: 0.56, pulpit: 0.56 };
const FONTS = [];
function font(size, face) { const k = (size | 0) * 2 + (face === 'T' ? 0 : 1); return FONTS[k] || (FONTS[k] = face === 'T' ? `${size | 0}px "Holtwood One SC", Georgia, serif` : `bold ${size | 0}px "Courier Prime", "Courier New", monospace`); }

let icons = null;
function buildIcons(res) {
  const mk = (w, h, draw) => { const c = makeCanvas(w * res, h * res), x = c.getContext('2d'); x.scale(res, res); x.translate(w / 2, h / 2); draw(x); return { c, w, h }; };
  const soul = (col, r) => (x) => { x.beginPath(); x.moveTo(0, -r); x.quadraticCurveTo(r * 0.9, -r * 0.1, 0, r); x.quadraticCurveTo(-r * 0.9, -r * 0.1, 0, -r); x.fillStyle = col; x.fill(); x.lineWidth = 1.5; x.strokeStyle = INK; x.stroke(); x.fillStyle = '#fff'; x.fillRect(-1.5, -r * 0.4, 3, r * 0.4); };
  icons = {
    res,
    soul: mk(14, 20, soul('#a8d8ff', 7)), bigsoul: mk(20, 26, soul('#d0a8ff', 10)),
    heal: mk(20, 28, (x) => { x.fillStyle = '#5a3a1a'; x.strokeStyle = INK; x.lineWidth = 1.8; x.fillRect(-6, -4, 12, 14); x.strokeRect(-6, -4, 12, 14); x.fillStyle = '#2a1a0a'; x.fillRect(-2.5, -12, 5, 8); x.fillStyle = '#e8d8b0'; x.fillRect(-4, 0, 8, 6); x.fillStyle = '#b3201a'; x.fillRect(-1, 1, 2, 4); x.fillRect(-2, 2, 4, 2); }),
    page: mk(16, 18, (x) => { x.fillStyle = '#e8dcc0'; x.strokeStyle = INK; x.lineWidth = 1.5; x.fillRect(-6, -7, 12, 14); x.strokeRect(-6, -7, 12, 14); x.fillStyle = '#5a4a3a'; for (let i = 0; i < 4; i++) x.fillRect(-4, -4 + i * 3, 8, 1); }),
    dyn: mk(22, 22, (x) => { x.fillStyle = '#a8281c'; x.strokeStyle = INK; x.lineWidth = 1.6; for (let i = -1; i <= 1; i++) { x.fillRect(i * 4 - 2, -7, 4, 14); x.strokeRect(i * 4 - 2, -7, 4, 14); } }),
    bile: mk(20, 20, (x) => { x.beginPath(); x.arc(0, 0, 7, 0, TAU); x.fillStyle = '#7acc2a'; x.fill(); x.strokeStyle = INK; x.lineWidth = 2; x.stroke(); }),
    crow: mk(28, 18, (x) => { x.fillStyle = '#0a0a0e'; x.beginPath(); x.moveTo(-13, -2); x.quadraticCurveTo(-4, -10, 0, -2); x.quadraticCurveTo(4, -10, 13, -2); x.lineTo(4, 2); x.lineTo(0, 6); x.lineTo(-4, 2); x.closePath(); x.fill(); x.fillStyle = '#ffd23a'; x.fillRect(-1, -2, 2, 2); }),
    card: mk(12, 16, (x) => { x.fillStyle = '#f2e6cc'; x.strokeStyle = INK; x.lineWidth = 1.4; x.fillRect(-5, -7, 10, 14); x.strokeRect(-5, -7, 10, 14); x.fillStyle = '#a01a14'; x.fillRect(-1.5, -2, 3, 4); }),
    skull: mk(20, 20, (x) => skullArt(x, 0, 0, 0.7, '#e2d1a8', 1.4)),
  };
}

function spr(ctx, S, tx, ty, img, ox, oy, w, h, x, y, flip, rot) {
  const c = Math.cos(rot) * S, s = Math.sin(rot) * S, f = flip ? -1 : 1;
  ctx.setTransform(c * f, s * f, -s, c, tx + x * S, ty + y * S);
  ctx.drawImage(img, -ox, -oy, w, h);
}
function sortByY(arr, n) {
  for (let i = 1; i < n; i++) { const v = arr[i], y = v.y; let j = i - 1; while (j >= 0 && arr[j].y > y) { arr[j + 1] = arr[j]; j--; } arr[j + 1] = v; }
}

let vign = null, vignKey = '';
function screenHalftone(g) {
  const key = g.w + 'x' + g.h;
  if (vignKey === key) return vign;
  vignKey = key;
  const W = Math.round(g.w / 2), H = Math.round(g.h / 2), c = makeCanvas(W, H), x = c.getContext('2d');
  const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy);
  x.fillStyle = 'rgba(0,0,0,0.6)';
  for (let yy = 0; yy < H; yy += 5) for (let xx = ((yy / 5) % 2) * 2.5; xx < W; xx += 5) {
    const r = Math.max(0, (Math.hypot(xx - cx, yy - cy) / R - 0.6) * 6.5);
    if (r > 0.2) { x.beginPath(); x.arc(xx, yy, Math.min(2.6, r), 0, TAU); x.fill(); }
  }
  vign = c;
  return c;
}

// ---------------------------------------------------------------- luces
function addLight(g, x, y, r, a) {
  if (g.lightN >= 112) return;
  const k = g.lightN * 4; g.lights[k] = x; g.lights[k + 1] = y; g.lights[k + 2] = r; g.lights[k + 3] = a; g.lightN++;
}

function lighting(g, ctx, camX, camY) {
  const W = g.w, H = g.h, LS = 0.5;
  if (!g.lightCanvas) {
    g.lightCanvas = makeCanvas(Math.ceil(W * LS), Math.ceil(H * LS));
    g.lightCtx = g.lightCanvas.getContext('2d');
    g.darkPattern = null;
  }
  const l = g.lightCtx, sc = g.scale * LS;
  const A = Math.min(0.9, (DARK[g.mapId] || 0.55) + (g.objective.round >= 10 ? 0.06 : 0) + (g.weather && g.weather.id === 'eclipse' ? 0.2 : 0));
  // semitono suave: puntos poco densos y translúcidos para máxima nitidez
  if (!g.darkPattern || g.darkA !== A) { g.darkPattern = halftonePattern(l, `rgba(6,4,10,${A})`, `rgba(0,0,0,${(A * 0.35).toFixed(2)})`, 7); g.darkA = A; }
  l.globalCompositeOperation = 'source-over'; l.globalAlpha = 1;
  l.clearRect(0, 0, g.lightCanvas.width, g.lightCanvas.height);
  l.fillStyle = g.darkPattern; l.fillRect(0, 0, g.lightCanvas.width, g.lightCanvas.height);
  l.globalCompositeOperation = 'destination-out';
  const img = g.spr.light(), L = g.lights;
  for (let i = 0; i < g.lightN; i++) {
    const k = i * 4, x = (L[k] - camX) * sc + W * LS / 2, y = (L[k + 1] - camY) * sc + H * LS / 2, r = L[k + 2] * sc;
    if (x + r < 0 || y + r < 0 || x - r > W * LS || y - r > H * LS) continue;
    l.globalAlpha = L[k + 3]; l.drawImage(img, x - r, y - r, r * 2, r * 2);
  }
  l.globalAlpha = 1; l.globalCompositeOperation = 'source-over';
  ctx.drawImage(g.lightCanvas, 0, 0, W, H);
}

// ---------------------------------------------------------------- bocadillos de cómic (diálogo)
const DLG_SIZE = 14, DLG_FONT = `bold ${DLG_SIZE}px "Courier Prime", "Courier New", monospace`;
function layoutLine(ctx, l, maxW) {
  ctx.font = DLG_FONT;
  const words = []; let key = false;
  for (const raw of l.text.split(' ')) { let w = '', wk = key; for (const ch of raw) { if (ch === '*') { key = !key; wk = wk || key; } else w += ch; } words.push({ w, key: wk }); }
  const space = ctx.measureText(' ').width, lines = [];
  let cur = { words: [], width: 0 }, chars = 0;
  for (const wd of words) {
    const ww = ctx.measureText(wd.w).width;
    if (cur.width + ww > maxW && cur.words.length) { lines.push(cur); cur = { words: [], width: 0 }; }
    wd.x = cur.width; wd.start = chars; chars += wd.w.length + 1;
    cur.words.push(wd); cur.width += ww + space;
  }
  lines.push(cur);
  const w = Math.max(...lines.map((x) => x.width)) + 26, h = lines.length * (DLG_SIZE * 1.3) + 22;
  // temblor de plumilla precalculado para el contorno
  const r = makeRng(l.text.length * 131 + 7), jit = new Float32Array(48);
  for (let i = 0; i < 48; i++) jit[i] = (r() - 0.5) * 2.2;
  l.layout = { lines, w, h, jit };
}
function penRect(ctx, x, y, w, h, jit) {
  ctx.beginPath();
  const pts = 12;
  for (let i = 0; i < pts; i++) { const k = i / pts; const px = x + w * k, py = y + jit[i]; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
  for (let i = 0; i < pts; i++) { const k = i / pts; ctx.lineTo(x + w + jit[12 + i], y + h * k); }
  for (let i = 0; i < pts; i++) { const k = i / pts; ctx.lineTo(x + w - w * k, y + h + jit[24 + i]); }
  for (let i = 0; i < pts; i++) { const k = i / pts; ctx.lineTo(x + jit[36 + i], y + h - h * k); }
  ctx.closePath();
}
function drawDialogue(g, ctx, camX, camY) {
  const l = g.dlg.cur;
  if (!l) return;
  if (!l.layout) layoutLine(ctx, l, Math.min(300, g.w * 0.62));
  const L = l.layout, W = g.w, H = g.h;
  const sx = (l.x - camX) * g.scale + W / 2, sy = (l.y - camY) * g.scale + H / 2;
  const bx = Math.max(10, Math.min(W - L.w - 10, sx - L.w / 2)), by = Math.max(84, Math.min(H - L.h - 90, sy - L.h - 30));
  const fade = l.life < l.dur ? Math.min(1, l.life * 8) : Math.max(0, 1 - (l.life - l.dur) / 0.3);
  const dark = !l.hero;
  const bg = dark ? '#140c0a' : '#efe2c4', fg = dark ? '#efe2c4' : '#140c08', key = dark ? '#ff6a3a' : (g.pal.rim || g.hero.rim || '#9a140e');
  ctx.save(); ctx.globalAlpha = fade;
  // rabillo dinámico que sigue al personaje
  const tx0 = Math.max(bx + 18, Math.min(bx + L.w - 18, sx));
  ctx.fillStyle = bg; ctx.strokeStyle = '#0a0605'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(tx0 - 9, by + L.h - 2); ctx.lineTo(sx, Math.min(sy - 4, by + L.h + 60)); ctx.lineTo(tx0 + 9, by + L.h - 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  // caja con borde a plumilla (doble trazo)
  penRect(ctx, bx, by, L.w, L.h, L.jit); ctx.fill();
  if (!dark) { ctx.fillStyle = 'rgba(120,80,30,0.12)'; for (let i = 0; i < 18; i++) ctx.fillRect(bx + ((i * 37) % L.w), by + ((i * 23) % L.h), 2, 2); }
  ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 1; ctx.save(); ctx.translate(1.5, -1.2); penRect(ctx, bx, by, L.w, L.h, L.jit); ctx.stroke(); ctx.restore();
  ctx.fillStyle = bg; ctx.fillRect(tx0 - 7, by + L.h - 4, 14, 5);
  // nombre de quien habla
  const who = l.hero ? g.hero.short.toUpperCase() : (l.follow && l.follow.def && l.follow.def.name ? l.follow.def.name.toUpperCase() : '');
  if (who) { ctx.font = font(10, 'T'); const ww = ctx.measureText(who).width + 12; ctx.fillStyle = '#0a0605'; ctx.fillRect(bx + 8, by - 10, ww, 14); ctx.fillStyle = key; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(who, bx + 14, by - 3); }
  // texto que corre como tinta (typewriter)
  const shown = Math.floor(Math.min(l.len + 1, l.life * 46)); // la tinta corre rápido: réplicas ágiles
  ctx.font = DLG_FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  for (let li = 0; li < L.lines.length; li++) {
    const line = L.lines[li], y = by + 11 + li * DLG_SIZE * 1.3;
    for (const wd of line.words) {
      if (wd.start >= shown) break;
      const txt = wd.start + wd.w.length <= shown ? wd.w : wd.w.slice(0, shown - wd.start);
      ctx.fillStyle = wd.key ? key : fg;
      ctx.fillText(txt, bx + 13 + wd.x, y);
      if (wd.key) { ctx.fillRect(bx + 13 + wd.x, y + DLG_SIZE + 1, ctx.measureText(txt).width, 1.5); }
    }
  }
  ctx.restore();
}

export function renderGame(g, dt) {
  const ctx = g.ctx, dpr = g.dpr, S = g.scale * dpr, sp = g.spr;
  if (!icons || icons.res !== sp.res) buildIcons(sp.res);
  const t = g.realTime, p = g.player;
  const camX = g.cam.x + g.cam.sx, camY = g.cam.y + g.cam.sy;
  const tx = (g.w * dpr) / 2 - camX * S, ty = (g.h * dpr) / 2 - camY * S;
  const hw = g.viewW / 2 + 80, hh = g.viewH / 2 + 120;
  const vx0 = camX - hw, vx1 = camX + hw, vy0 = camY - hh, vy1 = camY + hh;
  g.lightN = 0;

  ctx.setTransform(S, 0, 0, S, tx, ty); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (g.zoned) {
    // comarca por zonas: pueblo · cementerio · mina, unidas por un camino de tierra
    for (let i = 0; i < ZONES.length; i++) {
      const z = ZONES[i], zx0 = Math.max(vx0, z.x0 * HX - (i ? 0 : 400)), zx1 = Math.min(vx1, z.x1 * HX + (i === ZONES.length - 1 ? 400 : 0));
      if (zx1 <= zx0) continue;
      ctx.fillStyle = g.groundPatterns[i]; ctx.fillRect(zx0, vy0, zx1 - zx0, vy1 - vy0);
    }
    for (let i = 1; i < ZONES.length; i++) {
      const bx = ZONES[i].x0 * HX;
      if (bx < vx0 - 80 || bx > vx1 + 80) continue;
      ctx.fillStyle = 'rgba(10,6,4,0.35)'; ctx.fillRect(bx - 50, vy0, 100, vy1 - vy0);
      ctx.fillStyle = 'rgba(10,6,4,0.25)'; ctx.fillRect(bx - 90, vy0, 180, vy1 - vy0);
    }
    ctx.strokeStyle = 'rgba(90,66,44,0.55)'; ctx.lineWidth = 70; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    const x0 = Math.max(-HX, vx0 - 50), x1 = Math.min(HX, vx1 + 50);
    for (let x = x0; x <= x1; x += 40) { const y = g.roadY(x); if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,12,6,0.35)'; ctx.lineWidth = 2; ctx.setLineDash([14, 22]);
    ctx.beginPath(); for (let x = x0; x <= x1; x += 40) { const y = g.roadY(x) + 18; if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y); } ctx.stroke();
    ctx.setLineDash([]);
  } else { ctx.fillStyle = g.groundPatterns[0]; ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0); }
  ctx.fillStyle = 'rgba(2,1,1,0.9)';
  const LX = HX + 50, LY = HY + 50;
  if (vx0 < -LX) ctx.fillRect(vx0, vy0, -LX - vx0, vy1 - vy0);
  if (vx1 > LX) ctx.fillRect(LX, vy0, vx1 - LX, vy1 - vy0);
  if (vy0 < -LY) ctx.fillRect(vx0, vy0, vx1 - vx0, -LY - vy0);
  if (vy1 > LY) ctx.fillRect(vx0, LY, vx1 - vx0, vy1 - LY);

  // anillo de tinta del alcance de disparo
  {
    const R = g.range();
    ctx.save();
    ctx.globalAlpha = 0.32; ctx.strokeStyle = '#0a0605'; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); ctx.lineDashOffset = -t * 12;
    ctx.beginPath(); ctx.ellipse(p.x, p.y, R, R * 0.62, 0, 0, TAU); ctx.stroke();
    ctx.globalAlpha = 0.18; ctx.strokeStyle = g.pal.glow; ctx.lineWidth = 1.2; ctx.setLineDash([]);
    ctx.beginPath(); ctx.ellipse(p.x, p.y, R - 3, R * 0.62 - 2, 0, 0, TAU); ctx.stroke();
    ctx.restore();
  }

  // luz cálida ambiental sobre el suelo
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < g.ambient.length; i++) {
    const a = g.ambient[i];
    if (a.x + a.r < vx0 || a.x - a.r > vx1 || a.y + a.r < vy0 || a.y - a.r > vy1) continue;
    const fl = 0.92 + Math.sin(t * 2.3 + a.ph) * 0.05 + Math.sin(t * 7.1 + a.ph * 2) * 0.03;
    ctx.globalAlpha = 0.16 * fl; ctx.drawImage(sp.glow(a.col), a.x - a.r * 0.8, a.y - a.r * 0.5, a.r * 1.6, a.r);
    addLight(g, a.x, a.y, a.r * fl, a.a);
  }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;

  // manchas de sangre, quemaduras y marcas de tinta que se desvanecen poco a poco
  const D = g.decals, DT = g.decalT;
  for (let i = 0; i < g.decalN; i++) {
    const k = i * 4, x = D[k], y = D[k + 1], r = D[k + 2], kind = D[k + 3];
    if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
    const age = t - DT[i], life = kind === 2 ? 22 : kind === 3 ? 9 : 14;
    if (age > life) continue;
    const fa = Math.min(1, (life - age) / (life * 0.45));
    if (kind === 3) {
      // salpicadura de tinta: mancha estrellada con gotas
      ctx.globalAlpha = 0.72 * fa; ctx.fillStyle = '#0a0605';
      ctx.beginPath();
      for (let s2 = 0; s2 < 12; s2++) { const an = (s2 / 12) * TAU + x * 0.01, m = s2 % 2 ? 0.55 : 0.9 + ((s2 * 13 + (x | 0)) % 5) * 0.08; const px = x + Math.cos(an) * r * m, py = y + Math.sin(an) * r * m * 0.5; s2 ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
      ctx.closePath(); ctx.fill();
      for (let s2 = 0; s2 < 4; s2++) { const an = s2 * 1.7 + y * 0.01; ctx.beginPath(); ctx.arc(x + Math.cos(an) * r * 1.35, y + Math.sin(an) * r * 0.65, 1.5 + (s2 % 2) * 1.5, 0, TAU); ctx.fill(); }
    } else {
      ctx.globalAlpha = 0.5 * fa; ctx.fillStyle = kind === 2 ? '#080604' : '#4a0606';
      ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.5, 0, 0, TAU); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // zonas bajo los personajes
  const Z = g.zones.items;
  for (let i = 0; i < g.zones.n; i++) {
    const z = Z[i], k = Math.min(1, z.life / z.max);
    switch (z.kind) {
      case ZK.FIRE: case ZK.GAS: {
        const a = Math.min(1, (z.max - z.life) * 2), col = z.kind === ZK.GAS ? '#7acc2a' : '#ff6a1a';
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * a;
        const r = z.r * (1.5 + Math.sin(t * 12 + z.uid) * 0.1);
        ctx.drawImage(sp.glow(col), z.x - r, z.y - r * 0.6, r * 2, r * 1.2);
        ctx.globalCompositeOperation = 'source-over';
        if (z.kind === ZK.FIRE) addLight(g, z.x, z.y - 20, z.r * 2.6 * a, 0.9);
        else addLight(g, z.x, z.y, z.r * 1.4 * a, 0.4);
        break;
      }
      case ZK.RING:
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k; ctx.strokeStyle = z.color; ctx.lineWidth = 20 * (1 - k * 0.5);
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.75, 0, 0, TAU); ctx.stroke(); ctx.globalCompositeOperation = 'source-over';
        addLight(g, z.x, z.y, z.r * 1.4, 0.8 * (1 - k));
        break;
      case ZK.STRIKE: case ZK.BOMB: case ZK.SLAM: {
        if (z.owner === 2) { addLight(g, z.x, z.y, z.r * (1 - k), 0.9); break; }
        if (z.life > z.max) break;
        const danger = z.owner === 0;
        ctx.globalAlpha = 0.3 + k * 0.45; ctx.strokeStyle = danger ? '#ff2a1a' : z.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = danger ? 'rgba(255,40,20,0.22)' : 'rgba(255,220,120,0.18)';
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r * k, z.r * 0.6 * k, 0, 0, TAU); ctx.fill();
        if (z.kind === ZK.STRIKE) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1; const hgt = (1 - k) * 420; ctx.drawImage(sp.glow(z.color), z.x - 34, z.y - hgt - 34, 68, 68); ctx.globalCompositeOperation = 'source-over'; addLight(g, z.x, z.y - hgt, 160, 0.7); }
        addLight(g, z.x, z.y, z.r * 1.1, 0.35);
        break;
      }
      case ZK.POOL: {
        const a = Math.min(1, z.life * 2, (z.max - z.life) * 2);
        ctx.globalAlpha = 0.8 * a; ctx.fillStyle = '#100820'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 * a; ctx.drawImage(sp.glow('#c8b8ff'), z.x - z.r, z.y - z.r * 0.6, z.r * 2, z.r * 1.2); ctx.globalCompositeOperation = 'source-over';
        break;
      }
      case ZK.INK: {
        const a = Math.min(1, z.life * 3, (z.max - z.life) * 1.5);
        if (z.charged > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.drawImage(sp.glow('#cfe8ff'), z.x - z.r * 1.3, z.y - z.r * 0.8, z.r * 2.6, z.r * 1.6); ctx.globalCompositeOperation = 'source-over'; addLight(g, z.x, z.y, z.r * 3, 0.8); }
        ctx.globalAlpha = 0.85 * a; ctx.fillStyle = '#07060c';
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.5 * a; ctx.fillStyle = '#1a1830'; ctx.beginPath(); ctx.ellipse(z.x - z.r * 0.25, z.y - z.r * 0.15, z.r * 0.35, z.r * 0.15, -0.2, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case ZK.CONE: {
        ctx.globalAlpha = 0.18 + 0.25 * ((t * 8) % 1); ctx.fillStyle = '#3a1a7a';
        ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.arc(z.x, z.y, z.r, z.ang - z.len / 2, z.ang + z.len / 2); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = 1;
        break;
      }
      case ZK.ACID: {
        const a = Math.min(1, z.life * 3, (z.max - z.life) * 1.5);
        ctx.globalAlpha = 0.75 * a; ctx.fillStyle = '#2a4a0a'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.45 * a; ctx.drawImage(sp.glow('#9dff3a'), z.x - z.r, z.y - z.r * 0.6, z.r * 2, z.r * 1.2); ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 0.8 * a; ctx.fillStyle = '#c8ff6a'; for (let k = 0; k < 5; k++) { const bx = z.x + Math.cos(z.uid + k * 1.7) * z.r * 0.6, by = z.y + Math.sin(z.uid + k * 2.3) * z.r * 0.35; ctx.beginPath(); ctx.arc(bx, by, 2 + ((t * 3 + k) % 1) * 3, 0, TAU); ctx.fill(); }
        ctx.globalAlpha = 1;
        addLight(g, z.x, z.y, z.r * 1.4, 0.4);
        break;
      }
      case ZK.CHARGE:
        ctx.globalAlpha = 0.25 + 0.35 * ((t * 10) % 1);
        ctx.setTransform(S * Math.cos(z.ang), S * Math.sin(z.ang), -S * Math.sin(z.ang), S * Math.cos(z.ang), tx + z.x * S, ty + z.y * S);
        ctx.fillStyle = '#ff2a1a'; ctx.fillRect(0, -z.r, z.len, z.r * 2); ctx.setTransform(S, 0, 0, S, tx, ty);
        break;
      default: break;
    }
  }
  ctx.globalAlpha = 1;

  // atrezo
  const PR = g.props;
  for (let i = 0; i < PR.length; i++) {
    const o = PR[i], s = o.spr;
    if (o.x + s.w < vx0 || o.x - s.w > vx1 || o.y < vy0 || o.y - s.h > vy1) continue;
    ctx.drawImage(s.canvas, o.x - s.ox, o.y - s.oy, s.w, s.h);
  }
  // trampas y destructibles
  for (let i = 0; i < g.traps.length; i++) {
    const tr = g.traps[i];
    if (tr.x < vx0 - 80 || tr.x > vx1 + 80 || tr.y < vy0 - 40 || tr.y > vy1 + 140) continue;
    let s;
    if (tr.kind === 'mine') {
      ctx.drawImage(icons.dyn.c, tr.x - 11, tr.y - 18, 22, 22);
      if ((t * 3 + i) % 1 < 0.5) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(sp.glow('#ff3a2a'), tr.x - 8, tr.y - 26, 16, 16); ctx.globalCompositeOperation = 'source-over'; }
      continue;
    }
    if (tr.kind === 'plaguelamp') {
      if (tr.dead) continue;
      s = sp.prop('plaguelamp');
      ctx.drawImage(s.canvas, tr.x - s.ox, tr.y - s.oy + Math.sin(t * 3) * 3, s.w, s.h);
      addLight(g, tr.x, tr.y - 30, 200, 0.85);
      ctx.fillStyle = INK; ctx.fillRect(tr.x - 22, tr.y - 92, 44, 6); ctx.fillStyle = '#9dff3a'; ctx.fillRect(tr.x - 21, tr.y - 91, 42 * Math.max(0, tr.hp / tr.maxHp), 4);
      if (tr.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(sp.glow('#ffffff'), tr.x - 24, tr.y - 54, 48, 48); ctx.globalCompositeOperation = 'source-over'; }
      continue;
    }
    if (tr.kind === 'bear') { s = sp.prop(tr.armed ? 'beartrap_open' : 'beartrap_closed'); ctx.globalAlpha = tr.armed && !tr.owned ? 0.5 : 1; }
    else if (tr.kind === 'lantern') { s = sp.prop(tr.dead ? 'lantern_broken' : 'lantern_lit'); if (!tr.dead) addLight(g, tr.x + 21, tr.y - 84, 210 + Math.sin(t * 9 + i) * 8, 1); }
    else if (tr.kind === 'barrel') { if (tr.dead) continue; s = sp.prop('dynbarrel'); }
    else { if (tr.dead) continue; s = sp.prop('cover_' + tr.variant + '_' + tr.phase); }
    ctx.drawImage(s.canvas, tr.x - s.ox, tr.y - s.oy, s.w, s.h);
    if (tr.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(sp.glow('#ffffff'), tr.x - 30, tr.y - 50, 60, 60); ctx.globalCompositeOperation = 'source-over'; }
    if (tr.kind === 'barrel' && tr.fuse > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(sp.glow('#ffd23a'), tr.x - 26, tr.y - 70, 52, 52); ctx.globalCompositeOperation = 'source-over'; }
    ctx.globalAlpha = 1;
  }
  // refugio
  for (let i = 0; i < g.structs.length; i++) {
    const s = g.structs[i], si = s.spr;
    ctx.globalAlpha = s.hp > 0 ? 1 : 0.4;
    ctx.drawImage(si.canvas, s.x - si.ox, s.y - si.oy, si.w, si.h); ctx.globalAlpha = 1;
    addLight(g, s.x, s.y - 60, 260, 0.9);
    ctx.fillStyle = INK; ctx.fillRect(s.x - 62, s.y - si.oy + 6, 124, 10); ctx.fillStyle = '#5aff4a'; ctx.fillRect(s.x - 60, s.y - si.oy + 8, 120 * Math.max(0, s.hp / s.maxHp), 6);
  }
  // almas
  const IT = g.items.items;
  for (let i = 0; i < g.items.n; i++) {
    const it = IT[i];
    if (it.x < vx0 || it.x > vx1 || it.y < vy0 || it.y > vy1) continue;
    if (it.kind === PK.CARD) {
      const f = pokerFace({ r: it.cr, s: it.cs }, 16, sp.res), wob = Math.sin(t * 4 + i) * 0.25;
      ctx.save(); ctx.translate(it.x, it.y - 14 + Math.sin(t * 5 + i) * 3); ctx.rotate(wob);
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(sp.glow('#ffcf6a'), -18, -20, 36, 40); ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(f, -8, -11, 16, 22.4); ctx.restore();
      addLight(g, it.x, it.y - 14, 60, 0.6);
      continue;
    }
    const bob = Math.sin(t * 5 + i) * 2, ic = it.kind === PK.HEAL ? icons.heal : it.kind === PK.BIGSOUL ? icons.bigsoul : icons.soul;
    ctx.drawImage(ic.c, it.x - ic.w / 2, it.y - ic.h / 2 - 8 + bob, ic.w, ic.h);
  }

  // sombras (Maeve no tiene sombra: la perdió con el diablo)
  const E = g.zombies.items, n = g.zombies.n;
  sortByY(E, n);
  for (let pass = 0; pass < 2; pass++) {
    const grow = pass ? 1 : 1.45;
    ctx.fillStyle = pass ? 'rgba(0,0,0,0.38)' : 'rgba(0,0,0,0.16)'; ctx.beginPath();
    for (let i = 0; i < n; i++) { const e = E[i]; if (e.dead || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue; const r = e.r * 1.15 * grow, ox = e.r * 0.25; ctx.moveTo(e.x + ox + r, e.y + 1); ctx.ellipse(e.x + ox, e.y + 1, r, r * 0.38, 0, 0, TAU); }
    if (g.hero.id !== 'maeve') { const r = 18 * grow; ctx.moveTo(p.x + 5 + r, p.y + 1); ctx.ellipse(p.x + 5, p.y + 1, r, r * 0.4, 0, 0, TAU); }
    if (g.pet && g.pet.on) { const r = g.pet.size * 0.55 * grow, py = g.pet.y + 1; ctx.moveTo(g.pet.x + 3 + r, py); ctx.ellipse(g.pet.x + 3, py, r, r * 0.4, 0, 0, TAU); }
    ctx.fill();
  }

  // horda + jugador + mascota de suelo intercalados por Y
  let drawnP = false, drawnPet = !(g.pet && g.pet.on) || g.pet.fly;
  for (let i = 0; i <= n; i++) {
    const e = i < n ? E[i] : null;
    if (!drawnPet && (!e || e.y > g.pet.y) && (drawnP || g.pet.y <= p.y)) { drawPetSprite(g, ctx, S, tx, ty, t); drawnPet = true; }
    if (!drawnP && (!e || e.y > p.y)) { drawPlayer(g, ctx, S, tx, ty, t); drawnP = true; }
    if (!drawnPet && drawnP && (!e || e.y > g.pet.y)) { drawPetSprite(g, ctx, S, tx, ty, t); drawnPet = true; }
    if (!e || e.dead || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue;
    const frozen = e.stunT > 0 || e.rootT > 0;
    const ph = t * (e.type === 'runner' ? 14 : e.type === 'spider' ? 18 : 7) + e.uid;
    const nf = Z_ANIM[e.type];
    const fr = e.atkAnim > 0 && Z_ATK[e.type] ? nf : frozen ? 0 : ((ph / TAU) * nf | 0) % nf;
    const s = nf ? sp.zombie(e.type, e.elite, fr) : e.spr;
    const bob = frozen ? 0 : Math.abs(Math.sin(ph)) * (e.colossus ? 4 : 2.5);
    // vaivén suave del paso; al recibir un impacto, el cuerpo retrocede (contra la mirada)
    const rot = frozen ? Math.sin(t * 30) * 0.03 : Math.sin(ph) * (e.colossus ? 0.02 : nf ? 0.03 : 0.09) - (e.flash > 0 ? 0.14 * (e.face < 0 ? -1 : 1) : 0);
    ctx.globalAlpha = e.alpha;
    if (e.colossus) {
      // jefe: respiración, y al preparar un ataque se hincha y su aura late (telegrafía clara)
      const atk = e.mode && e.mode !== 'move', col = BOSS_AURA[e.type] || '#ff5a3a';
      const pulse = atk ? 0.55 + 0.45 * Math.sin(t * 16) : 0.35 + Math.sin(t * 2) * 0.1;
      ctx.setTransform(S, 0, 0, S, tx, ty); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = pulse * 0.7;
      const gr = e.r * (atk ? 3.4 : 2.6); ctx.drawImage(sp.glow(col), e.x - gr, e.y - gr * 0.5, gr * 2, gr); ctx.globalCompositeOperation = 'source-over';
      const br = 1 + Math.sin(t * 2.2 + e.uid) * 0.015 + (atk ? 0.05 * Math.min(1, (e.subT || 0) * 4) : 0);
      const c = Math.cos(rot) * S, sn = Math.sin(rot) * S, f = e.face < 0 ? -1 : 1;
      ctx.globalAlpha = e.alpha;
      ctx.setTransform(c * f * (2 - br), sn * f, -sn * br, c * br, tx + e.x * S, ty + (e.y - bob) * S);
      ctx.drawImage(s.canvas, -s.ox, -s.oy, s.w, s.h);
      if (atk) addLight(g, e.x, e.y - e.r * 2, 220, 0.6);
    } else spr(ctx, S, tx, ty, s.canvas, s.ox, s.oy, s.w, s.h, e.x, e.y - bob, e.face < 0, rot);
    if (e.flash > 0) { ctx.globalAlpha = 0.85; ctx.drawImage(s.flash, -s.ox, -s.oy, s.w, s.h); }
    else if (e.stunT > 0 || e.slowT > 0) { ctx.globalAlpha = 0.2; ctx.drawImage(s.flash, -s.ox, -s.oy, s.w, s.h); }
    if (e.colossus) addLight(g, e.x, e.y - e.r, 150, 0.45);
  }
  ctx.globalAlpha = 1; ctx.setTransform(S, 0, 0, S, tx, ty);
  if (g.pet && g.pet.on && g.pet.fly) drawPetSprite(g, ctx, S, tx, ty, t); // mascotas voladoras, por encima
  // proyectiles de tinta de la mascota
  if (g.petShots) for (const sh of g.petShots) {
    if (!sh.on) continue;
    ctx.fillStyle = '#0a0605'; ctx.strokeStyle = g.pal.glow; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(sh.x, sh.y, 6, 4, Math.atan2(sh.vy, sh.vx), 0, TAU); ctx.fill(); ctx.stroke();
  }
  drawPetPowerFx(g, ctx, t);
  // corazas
  for (let i = 0; i < n; i++) { const e = E[i]; if (e.dead || e.maxArmor <= 0 || e.armor <= 0 || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue; ctx.fillStyle = INK; ctx.fillRect(e.x - 15, e.y - e.spr.oy - 6, 30, 5); ctx.fillStyle = '#b8c0c8'; ctx.fillRect(e.x - 14, e.y - e.spr.oy - 5, 28 * (e.armor / e.maxArmor), 3); }
  // horda aterrada por los chistes
  for (let i = 0; i < n; i++) {
    const e = E[i];
    if (e.dead || e.fearT <= 0 || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue;
    const yy = e.y - e.spr.oy - 10 + Math.sin(t * 16 + e.uid) * 2;
    ctx.fillStyle = '#fbf6ea'; ctx.strokeStyle = INK; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.ellipse(e.x, yy, 8, 9, 0, 0, TAU); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#9a140e'; ctx.font = font(12, 'T'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('!', e.x, yy + 1);
  }
  // aturdimiento y tinta pegajosa en el forajido
  if (p.stunT > 0) for (let k = 0; k < 3; k++) { const a = t * 6 + k * 2.1; ctx.fillStyle = '#ffe08a'; ctx.font = font(12, 'T'); ctx.fillText('✦', p.x + Math.cos(a) * 16, p.y - 78 + Math.sin(a) * 5); }
  if (p.inkT > 0) { ctx.fillStyle = 'rgba(10,8,20,0.7)'; for (let k = 0; k < 4; k++) ctx.fillRect(p.x - 12 + k * 7, p.y - 6 + ((t * 30 + k * 7) % 10), 3, 6); }
  // cuervos y sombras gemelas
  for (const c of g.crows) ctx.drawImage(icons.crow.c, c.x - 14, c.y - 9 + Math.sin(t * 14) * 2, 28, 18);
  if (g.st.shadows) {
    const hs = sp.hero(g.hero.id, g.pal, g.skinIdx);
    for (let i = 0; i < g.st.shadows; i++) {
      const a = t * 1.6 + (i / g.st.shadows) * TAU, sx = p.x + Math.cos(a) * 46, sy = p.y + Math.sin(a) * 26;
      ctx.globalAlpha = 0.55; ctx.drawImage(hs.dark, sx - hs.ox, sy - hs.oy, hs.w, hs.h);
    }
    ctx.globalAlpha = 1;
  }

  // bobinas Tesla
  for (const c of g.coils) {
    ctx.fillStyle = '#2a2a2e'; ctx.fillRect(c.x - 4, c.y - 50, 8, 50);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(c.x - 4, c.y - 50, 8, 50);
    for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? '#b8743a' : '#d8944a'; ctx.beginPath(); ctx.ellipse(c.x, c.y - 14 - k * 6, 11 - k * 0.6, 3, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#c8d8ff'; ctx.beginPath(); ctx.arc(c.x, c.y - 58, 7, 0, TAU); ctx.fill(); ctx.stroke();
    addLight(g, c.x, c.y - 58, 150, 0.7);
  }
  // luces del jugador
  addLight(g, p.x, p.y - 30, 340 + Math.sin(t * 7) * 6, 1);
  if (p.muzzle > 0) addLight(g, p.x + Math.cos(p.aim) * 30, p.y - 30, 240, 0.8);

  // partículas normales (antes de la oscuridad)
  const PA = g.parts.items;
  for (let i = 0; i < g.parts.n; i++) {
    const q = PA[i];
    if (q.add || q.x < vx0 || q.x > vx1 || q.y < vy0 || q.y > vy1) continue;
    const k = q.life / q.max;
    ctx.globalAlpha = 1 - k; ctx.fillStyle = q.color;
    if (q.kind === PT.SMOKE) { ctx.globalAlpha = (1 - k) * 0.45; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill(); }
    else if (q.kind === PT.SPLINTER) { ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.life * 12); ctx.fillRect(-q.size, -1, q.size * 2, 2.5); ctx.restore(); }
    else ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
  }
  ctx.globalAlpha = 1;
  for (let i = 0; i < g.parts.n; i++) { const q = PA[i]; if (q.add && q.kind === PT.FLASH && q.size > 20) addLight(g, q.x, q.y, q.size * 3, 0.8 * (1 - q.life / q.max)); }

  // ======== OSCURIDAD (claroscuro con semitono) ========
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  lighting(g, ctx, camX, camY);
  ctx.setTransform(S, 0, 0, S, tx, ty);

  // ======== capa aditiva: lo que brilla en la penumbra ========
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const e = E[i];
    if (e.dead || e.colossus || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue;
    ctx.globalAlpha = 0.55; ctx.drawImage(sp.glow('#d8e8b0'), e.x - 6, e.y - e.spr.oy * 0.86 - 6, 12, 12);
  }
  for (let i = 0; i < g.traps.length; i++) { const tr = g.traps[i]; if (tr.kind === 'lantern' && !tr.dead) { ctx.globalAlpha = 0.7 + Math.sin(t * 9 + i) * 0.15; ctx.drawImage(sp.glow('#ffe08a'), tr.x - 12, tr.y - 128, 60, 60); } }
  ctx.globalAlpha = 1;
  // proyectiles del jugador
  const B = g.bullets.items;
  for (let i = 0; i < g.bullets.n; i++) {
    const b = B[i];
    if (b.x < vx0 || b.x > vx1 || b.y < vy0 - 100 || b.y > vy1) continue;
    if (b.kind === BK.LOB) {
      const k = Math.min(1, b.spin / b.life), hgt = Math.sin(k * Math.PI) * 90;
      ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(icons.dyn.c, b.x - 11, b.y - hgt - 11, 22, 22);
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(sp.glow(b.color), b.x - 12, b.y - hgt - 22, 24, 24);
      continue;
    }
    if (b.kind === BK.FLAME) { const k = 1 - b.life * 2; const r = 10 + Math.max(0, k) * 22; ctx.globalAlpha = 0.8; ctx.drawImage(sp.glow(b.color), b.x - r, b.y - r, r * 2, r * 2); ctx.globalAlpha = 1; continue; }
    if (b.kind === BK.CARD) {
      ctx.drawImage(sp.glow(g.pal.glow), b.x - 12, b.y - 12, 24, 24);
      ctx.globalCompositeOperation = 'source-over';
      ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.spin); ctx.drawImage(icons.card.c, -6, -8, 12, 16); ctx.restore();
      ctx.globalCompositeOperation = 'lighter';
      continue;
    }
    const v = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / v, uy = b.vy / v, len = b.len, gr = b.r * (b.crit ? 6 : 4.2);
    ctx.drawImage(sp.glow(b.color), b.x - gr, b.y - gr, gr * 2, gr * 2);
    ctx.strokeStyle = b.color; ctx.lineWidth = b.r * 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x - ux * len, b.y - uy * len); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = b.core; ctx.lineWidth = b.r * 0.6;
    ctx.beginPath(); ctx.moveTo(b.x - ux * len * 0.5, b.y - uy * len * 0.5); ctx.lineTo(b.x, b.y); ctx.stroke();
  }
  // proyectiles enemigos
  const EB = g.ebullets.items;
  for (let i = 0; i < g.ebullets.n; i++) {
    const b = EB[i];
    if (b.x < vx0 || b.x > vx1 || b.y < vy0 - 100 || b.y > vy1) continue;
    if (b.kind === EK.LOB) {
      const k = Math.min(1, b.t / b.tmax), hgt = Math.sin(k * Math.PI) * 120;
      ctx.globalCompositeOperation = 'source-over'; ctx.drawImage((b.homing ? icons.bile : icons.dyn).c, b.x - 11, b.y - hgt - 11, 22, 22);
      ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(sp.glow(b.color), b.x - 14, b.y - hgt - 14, 28, 28);
      continue;
    }
    const gr = b.r * 3;
    ctx.drawImage(sp.glow(b.color), b.x - gr, b.y - gr, gr * 2, gr * 2);
    if (b.kind === EK.INK) { ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#07060c'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(160,140,255,0.5)'; ctx.fillRect(b.x - 2, b.y - 3, 2, 2); ctx.globalCompositeOperation = 'lighter'; continue; }
    if (b.kind === EK.PAGE) { ctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.t * 6); ctx.drawImage(icons.page.c, -8, -9, 16, 18); ctx.restore(); ctx.globalCompositeOperation = 'lighter'; continue; }
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.fill();
  }
  // partículas brillantes
  for (let i = 0; i < g.parts.n; i++) {
    const q = PA[i];
    if (!q.add || q.x < vx0 - 100 || q.x > vx1 + 100 || q.y < vy0 - 100 || q.y > vy1 + 100) continue;
    const k = q.life / q.max; ctx.globalAlpha = 1 - k;
    if (q.kind === PT.FLASH) ctx.drawImage(sp.glow(q.color), q.x - q.size, q.y - q.size, q.size * 2, q.size * 2);
    else if (q.kind === PT.RING) { ctx.strokeStyle = q.color; ctx.lineWidth = 6 * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size, q.size * 0.6, 0, 0, TAU); ctx.stroke(); }
    else if (q.kind === PT.EMBER) ctx.drawImage(sp.glow(q.color), q.x - q.size * 2, q.y - q.size * 2, q.size * 4, q.size * 4);
    else { ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size); }
  }
  // arcos eléctricos, haces de éter y rayos
  for (let i = 0; i < g.zones.n; i++) {
    const z = Z[i];
    if (z.kind === ZK.ARC && z.pn > 1) {
      const a = 1 - z.life / z.max;
      ctx.globalAlpha = a; ctx.strokeStyle = z.color; ctx.lineWidth = 6; ctx.lineJoin = 'miter';
      ctx.beginPath(); ctx.moveTo(z.pts[0], z.pts[1]); for (let k = 1; k < z.pn; k++) ctx.lineTo(z.pts[k * 2], z.pts[k * 2 + 1]); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke();
    } else if (z.kind === ZK.BEAM) {
      const a = 1 - z.life / z.max, ca = Math.cos(z.ang), sa = Math.sin(z.ang);
      ctx.globalAlpha = a; ctx.strokeStyle = z.color; ctx.lineCap = 'round';
      ctx.lineWidth = z.r * 2.4; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x + ca * z.len, z.y + sa * z.len); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = z.r * 0.7; ctx.stroke();
      ctx.drawImage(sp.glow(z.color), z.x + ca * z.len - 30, z.y + sa * z.len - 30, 60, 60);
    } else if (z.kind === ZK.STRIKE && z.elec && z.life >= z.max && z.life < z.max + 0.15) {
      ctx.globalAlpha = 1; ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 5;
      ctx.beginPath(); let x = z.x + 40, y = z.y - 600; ctx.moveTo(x, y);
      for (let k = 1; k <= 8; k++) { x = z.x + 40 * (1 - k / 8) + (((z.uid * 31 + k * 17) % 40) - 20); y = z.y - 600 + (600 * k) / 8; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // tren fantasma / jinetes espectrales
  for (let i = 0; i < g.zones.n; i++) {
    const z = Z[i];
    if (z.kind !== ZK.TRAIN && z.kind !== ZK.RIDERS) continue;
    ctx.globalAlpha = 0.75;
    ctx.drawImage(sp.glow('#9ab8ff'), z.x - z.r * 2, z.y - z.r * 2.2, z.r * 4, z.r * 3);
    ctx.globalAlpha = 0.9; ctx.drawImage(sp.glow('#ffffff'), z.x + Math.sign(z.vx) * z.r - 18, z.y - z.r - 18, 36, 36);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // textos
  const TX = g.texts.items;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (let i = 0; i < g.texts.n; i++) {
    const q = TX[i], k = q.life / q.max;
    ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    if (q.big) {
      const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, k - 0.15);
      ctx.setTransform(S * pop, -S * pop * 0.08, S * pop * 0.08, S * pop, tx + q.x * S, ty + q.y * S);
      ctx.font = font(q.size, 'T');
      if (q.size >= 22) { // estallido de tinta detrás de la onomatopeya
        const rw = ctx.measureText(q.str).width * 0.62 + q.size * 0.6, rh = q.size * 1.05;
        ctx.beginPath();
        for (let k2 = 0; k2 < 26; k2++) { const a = (k2 / 26) * TAU, m = k2 % 2 ? 0.74 : 1.08 + ((k2 * 7) % 3) * 0.06; const px = Math.cos(a) * rw * m, py = Math.sin(a) * rh * m; k2 ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
        ctx.closePath(); ctx.fillStyle = '#0a0605'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = q.color; ctx.stroke();
      }
      ctx.lineWidth = q.size * 0.3; ctx.strokeStyle = INK; ctx.strokeText(q.str, 0, 0);
      ctx.fillStyle = q.color; ctx.fillText(q.str, 0, 0);
      ctx.setTransform(S, 0, 0, S, tx, ty);
    } else if (q.num) {
      const pop = 1 + Math.max(0, 0.18 - q.life) * (q.num === 2 ? 4 : 2.5), c = Math.cos(q.rot) * S * pop, sn = Math.sin(q.rot) * S * pop;
      ctx.setTransform(c, sn, -sn, c, tx + q.x * S, ty + q.y * S);
      ctx.font = font(q.size, 'T');
      ctx.fillStyle = INK; ctx.fillText(q.str, 2, 2); // sombra dura desplazada
      ctx.lineWidth = q.num === 2 ? 4 : 3; ctx.strokeStyle = INK; ctx.strokeText(q.str, 0, 0);
      ctx.fillStyle = q.color; ctx.fillText(q.str, 0, 0);
      if (q.num === 2) { ctx.fillStyle = '#ffd23a'; ctx.fillRect(-ctx.measureText(q.str).width / 2, q.size * 0.42, ctx.measureText(q.str).width, 2); }
      ctx.setTransform(S, 0, 0, S, tx, ty);
    } else {
      ctx.font = font(q.size, 'B'); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.strokeText(q.str, q.x, q.y);
      ctx.fillStyle = q.color; ctx.fillText(q.str, q.x, q.y);
    }
  }
  ctx.globalAlpha = 1;

  // motas suaves de ceniza y tinta flotando (sin asignaciones: posiciones deterministas)
  {
    const span = 900;
    for (let i = 0; i < 70; i++) {
      const sx = ((i * 197.3 + t * (8 + (i % 5) * 3)) % span + span) % span - span / 2;
      const sy = ((i * 113.7 - t * (12 + (i % 7) * 2)) % span + span) % span - span / 2;
      const x = camX + sx + Math.sin(t * 0.7 + i) * 14, y = camY + sy * 0.7;
      const k = i % 3;
      ctx.globalAlpha = 0.18 + 0.14 * Math.sin(t * 1.3 + i * 2.1) ** 2;
      ctx.fillStyle = k === 0 ? '#0a0605' : k === 1 ? '#efe2c4' : '#b8a890';
      ctx.fillRect(x, y, k ? 2.2 : 3, k ? 2.2 : 3);
    }
    ctx.globalAlpha = 1;
  }

  // bocadillos de diálogo (espacio de pantalla, sobre la oscuridad)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawDialogue(g, ctx, camX, camY);

  // capas de pantalla
  const W = g.w, H = g.h;
  if (g.map.fog) {
    ctx.globalAlpha = 0.5; const fb = sp.fog();
    for (let i = 0; i < 8; i++) { const fx = ((i * 397 + t * (16 + i * 3)) % (W + 600)) - 300, fy = ((i * 211) % (H + 300)) - 150 + Math.sin(t * 0.3 + i) * 40; ctx.drawImage(fb, fx - 200, fy - 200, 520, 420); }
    ctx.globalAlpha = 1;
  }
  const wth = g.weather;
  if (wth) {
    const wa = Math.min(1, (wth.max - wth.t) * 0.8, wth.t * 0.8);
    if (wth.id === 'eclipse') {
      ctx.fillStyle = `rgba(90,0,10,${(0.22 * wa).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      // halos de luz alrededor del forajido y de las fuentes de luz
      const psx = (p.x - camX) * g.scale + W / 2, psy = (p.y - 30 - camY) * g.scale + H / 2;
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * wa; ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(psx, psy, 150 * g.scale + Math.sin(t * 3) * 6, 95 * g.scale, 0, 0, TAU); ctx.stroke();
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = `rgba(130,60,10,${(0.16 * wa).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = `rgba(210,190,170,${(0.35 * wa).toFixed(3)})`; ctx.lineWidth = 1.4; ctx.beginPath();
      const dx = wth.wx * 26, dy = wth.wy * 26 + 6;
      for (let i = 0; i < 110; i++) { const x = (i * 137.7 + t * 520 * Math.sign(wth.wx || 1)) % (W + 100), y = (i * 91.3 + t * 140) % (H + 60); const xx = x < 0 ? x + W : x; ctx.moveTo(xx - 50, y - 30); ctx.lineTo(xx - 50 + dx, y - 30 + dy); }
      ctx.stroke();
      ctx.fillStyle = `rgba(255,140,40,${(0.7 * wa).toFixed(3)})`;
      for (let i = 0; i < 24; i++) ctx.fillRect(((i * 211 + t * 300) % W), ((i * 97 + t * 60) % H), 2, 2);
    }
  }
  if (g.curses.length) { ctx.fillStyle = `rgba(80,20,120,${(0.08 + Math.sin(t * 3) * 0.04).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = 0.38; ctx.drawImage(screenHalftone(g), 0, 0, W, H); ctx.globalAlpha = 1;
  if (p.hurt > 0 || p.hp / p.maxHp < 0.25) {
    const a = Math.min(0.6, p.hurt > 0 ? p.hurt * 1.6 : 0.16 + Math.sin(t * 6) * 0.08);
    ctx.fillStyle = `rgba(140,0,0,${a.toFixed(3)})`;
    const e = 34; ctx.fillRect(0, 0, W, e); ctx.fillRect(0, H - e, W, e); ctx.fillRect(0, e, e, H - e * 2); ctx.fillRect(W - e, e, e, H - e * 2);
  }
  if (g.flash > 0) { ctx.fillStyle = `rgba(255,250,235,${(g.flash * 0.5).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
  drawHud(g, ctx, t);
}

// Efecto visual del poder de la mascota (anillo expansivo, pulso, estela o sombra) y escudo activo.
function drawPetPowerFx(g, ctx, t) {
  const P = g.pet, p = g.player;
  if (p.shieldT > 0) { // burbuja de tinta «Siete Vidas»
    const a = Math.min(1, p.shieldT * 2) * (0.55 + Math.sin(t * 8) * 0.12), k = p.shield / (p.shieldMax || 1);
    ctx.globalAlpha = a * 0.18; ctx.fillStyle = '#d8ff6a'; ctx.beginPath(); ctx.ellipse(p.x, p.y - 30, 34, 46, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = a; ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.stroke();
    ctx.strokeStyle = '#d8ff6a'; ctx.lineWidth = 2; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -t * 20; ctx.beginPath(); ctx.ellipse(p.x, p.y - 30, 34, 46, 0, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke(); ctx.setLineDash([]);
    addLight(g, p.x, p.y - 30, 120, 0.4);
  }
  if (!P || !P.on || P.fxT <= 0) { ctx.globalAlpha = 1; return; }
  const k = 1 - P.fxT / P.fxMax, ease = 1 - (1 - k) * (1 - k), fade = 1 - k;
  const r = P.fxR * (0.25 + 0.75 * ease);
  if (P.fxKind === 'loot') { // estelas de botín hacia el forajido
    ctx.globalAlpha = fade; ctx.lineCap = 'round';
    for (let i = 0; i < P.fxN; i++) {
      const x0 = P.fxPts[i * 2], y0 = P.fxPts[i * 2 + 1], mx = x0 + (p.x - x0) * ease, my = y0 + (p.y - 30 - y0) * ease;
      ctx.strokeStyle = INK; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(mx, my); ctx.stroke();
      ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 1.8; ctx.stroke();
      ctx.fillStyle = '#1a1a24'; ctx.beginPath(); ctx.ellipse(mx, my, 5, 2.4, Math.atan2(p.y - y0, p.x - x0), 0, TAU); ctx.fill();
    }
  }
  if (P.fxKind === 'slow') { // la sombra del halcón cae sobre la horda
    ctx.globalAlpha = 0.45 * fade; ctx.fillStyle = '#0a0605'; ctx.beginPath(); ctx.ellipse(P.fxX, P.fxY, r, r * 0.55, 0, 0, TAU); ctx.fill();
  }
  const col = P.fxKind === 'knock' ? '#cfe8ff' : P.fxKind === 'shield' ? '#d8ff6a' : P.fxKind === 'slow' ? '#ffb347' : '#ffd27a';
  const cx = P.fxKind === 'slow' ? P.fxX : P.fxKind === 'knock' || P.fxKind === 'shield' ? p.x : P.fxX, cy = P.fxKind === 'slow' ? P.fxY : p.y;
  ctx.globalAlpha = fade; ctx.strokeStyle = INK; ctx.lineWidth = 9 * fade + 2;
  ctx.beginPath(); ctx.ellipse(cx, cy, r, r * 0.6, 0, 0, TAU); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = 4 * fade + 1; ctx.stroke();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * fade;
  ctx.drawImage(g.spr.glow(col), cx - r, cy - r * 0.6, r * 2, r * 1.2);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  addLight(g, cx, cy, r * 1.2, 0.6 * fade);
}

// Mascota: aura de tinta según su evolución, fotogramas de galope/aleteo y mordisco al atacar.
function drawPetSprite(g, ctx, S, tx, ty, t) {
  const P = g.pet;
  if (!P || !P.on) return;
  const moving = Math.abs(P.vx) + Math.abs(P.vy) > 30;
  const frame = P.bite > 0 ? 4 : P.fly ? ((t * 11) | 0) % 4 : moving ? ((t * 13) | 0) % 4 : 0;
  const s = g.spr.pet(P.def.id, P.tier, frame, g.hero.rim);
  const sc = P.size * (P.bite > 0 ? 1.12 : 1), y = P.y - P.lift - (P.fly ? 0 : moving ? Math.abs(Math.sin(t * 13)) * 2 : 0);
  ctx.setTransform(S, 0, 0, S, tx, ty);
  if (P.tier > 0) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.25 + P.tier * 0.15 + Math.sin(t * 4) * 0.05;
    const r = 26 * sc * (1 + P.tier * 0.35); ctx.drawImage(g.spr.glow(g.pal.glow), P.x - r, y - 22 * sc - r * 0.7, r * 2, r * 1.4);
    ctx.globalCompositeOperation = 'source-over';
    if (P.tier > 1) { ctx.fillStyle = '#0a0605'; for (let k = 0; k < 4; k++) { const a = t * 2 + k * 1.6; ctx.globalAlpha = 0.5; ctx.fillRect(P.x - P.face * (14 + k * 7) + Math.sin(a) * 3, y - 18 * sc + Math.cos(a * 1.3) * 6, 3, 3); } }
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(S * sc * P.face, 0, 0, S * sc, tx + P.x * S, ty + y * S);
  ctx.drawImage(s.canvas, -s.ox, -s.oy, s.w, s.h);
  addLight(g, P.x, y - 20, 70 + P.tier * 30, 0.5);
  ctx.setTransform(S, 0, 0, S, tx, ty);
}

function drawLayer(ctx, S, tx, ty, Ls, wx, wy, fx, pivot, angle, sc, img) {
  ctx.setTransform(S * fx, 0, 0, S, tx + wx * S, ty + wy * S);
  if (angle) { const px = pivot[0] * sc, py = pivot[1] * sc; ctx.translate(px, py); ctx.rotate(angle); ctx.translate(-px, -py); }
  ctx.drawImage(img || Ls.canvas, -Ls.ox, -Ls.oy, Ls.w, Ls.h);
}

// Forajido articulado: piernas que zancadean desde la cadera, torso que se inclina y brazo del arma que
// apunta desde el hombro con retroceso al disparar.
function drawPlayer(g, ctx, S, tx, ty, t) {
  const p = g.player, L = g.spr.heroLayers(g.hero.id, g.pal, g.skinIdx, g.hero.rim), rig = RIG[g.hero.id], sc = L.scale;
  ctx.setTransform(S, 0, 0, S, tx, ty);
  const ax = p.x + Math.cos(p.aim) * 46, ay = p.y - 24 + Math.sin(p.aim) * 46;
  ctx.globalAlpha = 0.85; ctx.fillStyle = g.pal.glow; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ax + Math.cos(p.aim) * 9, ay + Math.sin(p.aim) * 9);
  ctx.lineTo(ax + Math.cos(p.aim + 2.4) * 7, ay + Math.sin(p.aim + 2.4) * 7); ctx.lineTo(ax + Math.cos(p.aim - 2.4) * 7, ay + Math.sin(p.aim - 2.4) * 7);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  const blink = p.inv > 0 && p.hurt <= 0 && g.state === 'play' && ((t * 20) % 2 < 1);
  ctx.globalAlpha = blink ? 0.45 : 1;
  const fx = p.face < 0 ? -1 : 1;
  const ph = t * 11, swing = p.moving ? Math.sin(ph) * 0.45 : 0;
  const bob = p.moving ? Math.abs(Math.sin(ph)) * 3 : Math.sin(t * 2.5) * 0.8;
  const lean = p.moving ? 0.05 + Math.sin(ph * 2) * 0.015 : Math.sin(t * 1.8) * 0.01;
  // ángulo del arma en el espacio (posiblemente volteado) del sprite
  const local = fx < 0 ? Math.atan2(Math.sin(p.aim), -Math.cos(p.aim)) : p.aim;
  let target = Math.max(-1.15, Math.min(0.95, local - rig.rest));
  if (p.reloadT > 0) target = 0.7; // baja el arma al recargar
  p.armAng = (p.armAng || 0) + (target - (p.armAng || 0)) * 0.35;
  const recoil = p.muzzle > 0 ? -0.22 * (p.muzzle / 0.07) : 0;
  const wy = p.y - bob;
  const flash = p.hurt > 0;
  drawLayer(ctx, S, tx, ty, L.legL, p.x, p.y, fx, rig.hipL, swing, sc);
  drawLayer(ctx, S, tx, ty, L.legR, p.x, p.y, fx, rig.hipR, -swing, sc);
  drawLayer(ctx, S, tx, ty, L.body, p.x, wy, fx, [0, -84], lean, sc);
  drawLayer(ctx, S, tx, ty, L.arm, p.x, wy, fx, rig.shoulder, p.armAng + recoil + lean, sc);
  if (flash) {
    ctx.globalAlpha = 0.8;
    drawLayer(ctx, S, tx, ty, L.legL, p.x, p.y, fx, rig.hipL, swing, sc, L.legL.flash);
    drawLayer(ctx, S, tx, ty, L.legR, p.x, p.y, fx, rig.hipR, -swing, sc, L.legR.flash);
    drawLayer(ctx, S, tx, ty, L.body, p.x, wy, fx, [0, -84], lean, sc, L.body.flash);
    drawLayer(ctx, S, tx, ty, L.arm, p.x, wy, fx, rig.shoulder, p.armAng + recoil + lean, sc, L.arm.flash);
  }
  if (p.rootT > 0) { ctx.globalAlpha = 1; ctx.setTransform(S, 0, 0, S, tx, ty); const bt = g.spr.prop('beartrap_closed'); ctx.drawImage(bt.canvas, p.x - bt.ox, p.y + 4 - bt.oy, bt.w, bt.h); }
  ctx.globalAlpha = 1; ctx.setTransform(S, 0, 0, S, tx, ty);
}

