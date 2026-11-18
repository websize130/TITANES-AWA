// Render con claroscuro: el mundo se pinta completo y luego una capa de oscuridad con trama de semitono
// se "recorta" con las fuentes de luz (farol del forajido, faroles de gas, fuego, explosiones, fogonazos).
// Encima, en aditivo, balas, chispas y ojos de la horda brillando en la penumbra.
import { HALF, BK, EK, PK, PT, ZK } from './engine.js';
import { drawHud } from './hud.js';
import { makeCanvas, INK, TAU, halftonePattern, skull as skullArt } from '../art/ink.js';
import { balloon } from '../art/comicPage.js';

const DARK = { crossroads: 0.8, town: 0.76, chapel: 0.8, mine: 0.86, swamp: 0.79, pulpit: 0.79 };
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
  if (g.lightN >= 64) return;
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
  const A = Math.min(0.95, (DARK[g.mapId] || 0.85) + (g.objective.round >= 10 ? 0.05 : 0));
  if (!g.darkPattern || g.darkA !== A) { g.darkPattern = halftonePattern(l, `rgba(4,3,8,${A})`, 'rgba(0,0,0,1)', 5); g.darkA = A; }
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

// ---------------------------------------------------------------- bocadillos (se cachean por texto)
const bubbleCache = new Map();
function bubbleImg(text, scream) {
  const key = (scream ? '!' : '') + text;
  let b = bubbleCache.get(key);
  if (b) return b;
  const c = makeCanvas(260, 110), x = c.getContext('2d');
  const m = balloon(x, text, 130, 46, 170, 13, 118, 100, scream);
  b = { c, w: 260, h: 110 }; b.m = m;
  if (bubbleCache.size > 80) bubbleCache.clear();
  bubbleCache.set(key, b);
  return b;
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
  ctx.fillStyle = g.groundPattern; ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  ctx.fillStyle = 'rgba(2,1,1,0.9)';
  const L = HALF + 50;
  if (vx0 < -L) ctx.fillRect(vx0, vy0, -L - vx0, vy1 - vy0);
  if (vx1 > L) ctx.fillRect(L, vy0, vx1 - L, vy1 - vy0);
  if (vy0 < -L) ctx.fillRect(vx0, vy0, vx1 - vx0, -L - vy0);
  if (vy1 > L) ctx.fillRect(vx0, L, vx1 - vx0, vy1 - L);

  // manchas
  const D = g.decals;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < g.decalN; i++) {
      const k = i * 4, x = D[k], y = D[k + 1], r = D[k + 2];
      if ((D[k + 3] === 2) !== (pass === 1) || x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
      ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, r * 0.5, 0, 0, TAU);
    }
    ctx.fillStyle = pass ? 'rgba(8,6,4,0.5)' : 'rgba(60,6,6,0.5)'; ctx.fill();
  }

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
    if (tr.kind === 'bear') { s = sp.prop(tr.armed ? 'beartrap_open' : 'beartrap_closed'); ctx.globalAlpha = tr.armed && !tr.owned ? 0.5 : 1; }
    else if (tr.kind === 'lantern') { s = sp.prop(tr.dead ? 'lantern_broken' : 'lantern_lit'); if (!tr.dead) addLight(g, tr.x + 18, tr.y - 70, 210 + Math.sin(t * 9 + i) * 8, 1); }
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
    const bob = Math.sin(t * 5 + i) * 2, ic = it.kind === PK.HEAL ? icons.heal : it.kind === PK.BIGSOUL ? icons.bigsoul : icons.soul;
    ctx.drawImage(ic.c, it.x - ic.w / 2, it.y - ic.h / 2 - 8 + bob, ic.w, ic.h);
  }

  // sombras (Maeve no tiene sombra: la perdió con el diablo)
  const E = g.zombies.items, n = g.zombies.n;
  sortByY(E, n);
  ctx.fillStyle = 'rgba(0,0,0,0.42)'; ctx.beginPath();
  for (let i = 0; i < n; i++) { const e = E[i]; if (e.dead || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue; const r = e.r * 1.15; ctx.moveTo(e.x + r, e.y); ctx.ellipse(e.x, e.y, r, r * 0.4, 0, 0, TAU); }
  if (g.hero.id !== 'maeve') { ctx.moveTo(p.x + 18, p.y); ctx.ellipse(p.x, p.y, 18, 7, 0, 0, TAU); }
  ctx.fill();

  // horda + jugador intercalado por Y
  let drawnP = false;
  for (let i = 0; i <= n; i++) {
    const e = i < n ? E[i] : null;
    if (!drawnP && (!e || e.y > p.y)) { drawPlayer(g, ctx, S, tx, ty, t); drawnP = true; }
    if (!e || e.dead || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue;
    const s = e.spr, frozen = e.stunT > 0 || e.rootT > 0;
    const ph = t * (e.type === 'runner' ? 14 : 7) + e.uid;
    const bob = frozen ? 0 : Math.abs(Math.sin(ph)) * (e.colossus ? 4 : 2.5);
    const rot = frozen ? Math.sin(t * 30) * 0.03 : Math.sin(ph) * (e.colossus ? 0.03 : 0.09) + (e.type === 'walker' ? 0.05 : 0);
    ctx.globalAlpha = e.alpha;
    spr(ctx, S, tx, ty, s.canvas, s.ox, s.oy, s.w, s.h, e.x, e.y - bob, e.face < 0, rot);
    if (e.flash > 0) { ctx.globalAlpha = 0.85; ctx.drawImage(s.flash, -s.ox, -s.oy, s.w, s.h); }
    else if (e.stunT > 0 || e.slowT > 0) { ctx.globalAlpha = 0.2; ctx.drawImage(s.flash, -s.ox, -s.oy, s.w, s.h); }
    if (e.colossus) addLight(g, e.x, e.y - e.r, 150, 0.45);
  }
  ctx.globalAlpha = 1; ctx.setTransform(S, 0, 0, S, tx, ty);
  // corazas
  for (let i = 0; i < n; i++) { const e = E[i]; if (e.dead || e.maxArmor <= 0 || e.armor <= 0 || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue; ctx.fillStyle = INK; ctx.fillRect(e.x - 15, e.y - e.spr.oy - 6, 30, 5); ctx.fillStyle = '#b8c0c8'; ctx.fillRect(e.x - 14, e.y - e.spr.oy - 5, 28 * (e.armor / e.maxArmor), 3); }
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
      ctx.font = font(q.size, 'T'); ctx.lineWidth = q.size * 0.3; ctx.strokeStyle = INK; ctx.strokeText(q.str, 0, 0);
      ctx.fillStyle = q.color; ctx.fillText(q.str, 0, 0);
      ctx.setTransform(S, 0, 0, S, tx, ty);
    } else {
      ctx.font = font(q.size, 'B'); ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.strokeText(q.str, q.x, q.y);
      ctx.fillStyle = q.color; ctx.fillText(q.str, q.x, q.y);
    }
  }
  ctx.globalAlpha = 1;

  // bocadillos flotantes (espacio de pantalla, sobre la oscuridad)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const b of g.bubbles) {
    if (!b.on) continue;
    const img = bubbleImg(b.text, b.scream);
    const sx = (b.x - camX) * g.scale + g.w / 2, sy = (b.y - camY) * g.scale + g.h / 2;
    const k = b.life / b.max, a = Math.min(1, b.life * 8, (1 - k) * 5);
    ctx.globalAlpha = a;
    ctx.drawImage(img.c, sx - 118, sy - 100, img.w, img.h);
  }
  ctx.globalAlpha = 1;

  // capas de pantalla
  const W = g.w, H = g.h;
  if (g.map.fog) {
    ctx.globalAlpha = 0.5; const fb = sp.fog();
    for (let i = 0; i < 8; i++) { const fx = ((i * 397 + t * (16 + i * 3)) % (W + 600)) - 300, fy = ((i * 211) % (H + 300)) - 150 + Math.sin(t * 0.3 + i) * 40; ctx.drawImage(fb, fx - 200, fy - 200, 520, 420); }
    ctx.globalAlpha = 1;
  }
  if (g.curses.length) { ctx.fillStyle = `rgba(80,20,120,${(0.08 + Math.sin(t * 3) * 0.04).toFixed(3)})`; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = 0.8; ctx.drawImage(screenHalftone(g), 0, 0, W, H); ctx.globalAlpha = 1;
  if (p.hurt > 0 || p.hp / p.maxHp < 0.25) {
    const a = Math.min(0.6, p.hurt > 0 ? p.hurt * 1.6 : 0.16 + Math.sin(t * 6) * 0.08);
    ctx.fillStyle = `rgba(140,0,0,${a.toFixed(3)})`;
    const e = 34; ctx.fillRect(0, 0, W, e); ctx.fillRect(0, H - e, W, e); ctx.fillRect(0, e, e, H - e * 2); ctx.fillRect(W - e, e, e, H - e * 2);
  }
  if (g.flash > 0) { ctx.fillStyle = `rgba(255,250,235,${(g.flash * 0.5).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }
  drawHud(g, ctx, t);
}

function drawPlayer(g, ctx, S, tx, ty, t) {
  const p = g.player, s = g.spr.hero(g.hero.id, g.pal, g.skinIdx);
  ctx.setTransform(S, 0, 0, S, tx, ty);
  const ax = p.x + Math.cos(p.aim) * 46, ay = p.y - 24 + Math.sin(p.aim) * 46;
  ctx.globalAlpha = 0.85; ctx.fillStyle = g.pal.glow; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ax + Math.cos(p.aim) * 9, ay + Math.sin(p.aim) * 9);
  ctx.lineTo(ax + Math.cos(p.aim + 2.4) * 7, ay + Math.sin(p.aim + 2.4) * 7); ctx.lineTo(ax + Math.cos(p.aim - 2.4) * 7, ay + Math.sin(p.aim - 2.4) * 7);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  const blink = p.inv > 0 && p.hurt <= 0 && g.state === 'play' && ((t * 20) % 2 < 1);
  ctx.globalAlpha = blink ? 0.45 : 1;
  const bob = p.moving ? Math.abs(Math.sin(t * 11)) * 3 : Math.sin(t * 2.5) * 0.8;
  spr(ctx, S, tx, ty, s.canvas, s.ox, s.oy, s.w, s.h, p.x, p.y - bob, p.face < 0, p.moving ? Math.sin(t * 11) * 0.04 : 0);
  if (p.hurt > 0) { ctx.globalAlpha = 0.8; ctx.drawImage(s.flash, -s.ox, -s.oy, s.w, s.h); }
  if (p.rootT > 0) { ctx.globalAlpha = 1; ctx.setTransform(S, 0, 0, S, tx, ty); const bt = g.spr.prop('beartrap_closed'); ctx.drawImage(bt.canvas, p.x - bt.ox, p.y + 4 - bt.oy, bt.w, bt.h); }
  ctx.globalAlpha = 1; ctx.setTransform(S, 0, 0, S, tx, ty);
}

