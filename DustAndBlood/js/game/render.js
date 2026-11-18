// Render del mundo en Canvas 2D: suelo con patrón, atrezo pre-renderizado, horda ordenada por Y,
// proyectiles aditivos, partículas, onomatopeyas cómic y capas atmosféricas. Sin asignaciones por entidad.
import { HALF, BK, EK, PK, PT, ZK } from './game.js';
import { drawHud } from './hud.js';
import { makeCanvas, coin, star, ellipse, INK, skull as skullArt } from '../art/comic.js';

const TAU = Math.PI * 2;
const FONTS = [];
function font(size, face = 'Rye') {
  const k = (size | 0) + (face === 'Rye' ? 0 : 1000);
  return FONTS[k] || (FONTS[k] = `${size | 0}px ${face}, Georgia, serif`);
}

let icons = null;
function buildIcons(res) {
  const mk = (w, h, draw) => { const c = makeCanvas(w * res, h * res), x = c.getContext('2d'); x.scale(res, res); x.translate(w / 2, h / 2); draw(x); return { c, w, h }; };
  icons = {
    res,
    coin: mk(20, 20, (x) => coin(x, 0, 0, 7, 1.6)),
    xp: mk(16, 20, (x) => { x.beginPath(); x.moveTo(0, -8); x.lineTo(6, 0); x.lineTo(0, 8); x.lineTo(-6, 0); x.closePath(); x.fillStyle = '#7fd8ff'; x.fill(); x.lineWidth = 1.6; x.strokeStyle = INK; x.stroke(); x.fillStyle = '#e8fbff'; x.fillRect(-1.5, -4, 3, 4); }),
    xpBig: mk(20, 26, (x) => { x.beginPath(); x.moveTo(0, -11); x.lineTo(8, 0); x.lineTo(0, 11); x.lineTo(-8, 0); x.closePath(); x.fillStyle = '#c77dff'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke(); x.fillStyle = '#fbe8ff'; x.fillRect(-2, -6, 3, 6); }),
    heal: mk(20, 28, (x) => { x.fillStyle = '#7a4a1a'; x.strokeStyle = INK; x.lineWidth = 1.8; x.beginPath(); x.rect(-6, -4, 12, 14); x.fill(); x.stroke(); x.fillStyle = '#2a1a0a'; x.fillRect(-2.5, -12, 5, 8); x.strokeRect(-2.5, -12, 5, 8); x.fillStyle = '#e8d8b0'; x.fillRect(-4, 0, 8, 6); x.fillStyle = '#b3201a'; x.fillRect(-1, 1, 2, 4); x.fillRect(-2, 2, 4, 2); }),
    skull: mk(22, 22, (x) => skullArt(x, 0, 0, 0.8, '#e2d1a8', 1.6)),
    bomb: mk(22, 22, (x) => { ellipse(x, 0, 2, 8, 8, '#2a2a2e', 2); x.strokeStyle = '#d8c6a3'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(3, -5); x.quadraticCurveTo(6, -10, 9, -9); x.stroke(); }),
    dyn: mk(22, 22, (x) => { x.fillStyle = '#c4281c'; x.strokeStyle = INK; x.lineWidth = 1.6; for (let i = -1; i <= 1; i++) { x.fillRect(i * 4 - 2, -7, 4, 14); x.strokeRect(i * 4 - 2, -7, 4, 14); } }),
    meteor: mk(30, 30, (x) => { ellipse(x, 0, 0, 10, 9, '#3a2a22', 2.5); star(x, 0, 0, 6, 5, '#ff8a2a', 0); }),
  };
}

// Dibuja un sprite (canvas) en coordenadas de mundo con volteo y rotación.
function spr(ctx, S, tx, ty, img, ox, oy, w, h, x, y, flip, rot) {
  const c = Math.cos(rot) * S, s = Math.sin(rot) * S, f = flip ? -1 : 1;
  ctx.setTransform(c * f, s * f, -s, c, tx + x * S, ty + y * S);
  ctx.drawImage(img, -ox, -oy, w, h);
}

function sortByY(arr, n) {
  for (let i = 1; i < n; i++) {
    const v = arr[i], y = v.y;
    let j = i - 1;
    while (j >= 0 && arr[j].y > y) { arr[j + 1] = arr[j]; j--; }
    arr[j + 1] = v;
  }
}

let halftoneCanvas = null, halftoneKey = '';
function screenHalftone(g) {
  const key = g.w + 'x' + g.h;
  if (halftoneKey === key) return halftoneCanvas;
  halftoneKey = key;
  const W = Math.round(g.w / 2), H = Math.round(g.h / 2);
  const c = makeCanvas(W, H), x = c.getContext('2d');
  const cx = W / 2, cy = H / 2, R = Math.hypot(cx, cy);
  x.fillStyle = 'rgba(0,0,0,0.55)';
  for (let yy = 0; yy < H; yy += 5) {
    for (let xx = (yy / 5) % 2 * 2.5; xx < W; xx += 5) {
      const d = Math.hypot(xx - cx, yy - cy) / R;
      const r = Math.max(0, (d - 0.62) * 6.5);
      if (r > 0.2) { x.beginPath(); x.arc(xx, yy, Math.min(2.6, r), 0, TAU); x.fill(); }
    }
  }
  halftoneCanvas = c;
  return c;
}

export function renderGame(g, dt) {
  const ctx = g.ctx, dpr = g.dpr, S = g.scale * dpr, cache = g.cache;
  if (!icons || icons.res !== cache.res) buildIcons(cache.res);
  const t = g.realTime;
  const camX = g.cam.x + g.cam.sx, camY = g.cam.y + g.cam.sy;
  const tx = (g.w * dpr) / 2 - camX * S, ty = (g.h * dpr) / 2 - camY * S;
  const hw = g.viewW / 2 + 80, hh = g.viewH / 2 + 120;
  const vx0 = camX - hw, vx1 = camX + hw, vy0 = camY - hh, vy1 = camY + hh;
  const p = g.player;

  ctx.setTransform(S, 0, 0, S, tx, ty);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  // ---- suelo
  ctx.fillStyle = g.groundPattern;
  ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0);
  // fuera de los límites
  ctx.fillStyle = 'rgba(8,4,2,0.86)';
  const L = HALF + 50;
  if (vx0 < -L) ctx.fillRect(vx0, vy0, -L - vx0, vy1 - vy0);
  if (vx1 > L) ctx.fillRect(L, vy0, vx1 - L, vy1 - vy0);
  if (vy0 < -L) ctx.fillRect(vx0, vy0, vx1 - vx0, -L - vy0);
  if (vy1 > L) ctx.fillRect(vx0, L, vx1 - vx0, vy1 - L);

  // ---- manchas (sangre / quemaduras)
  const D = g.decals;
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath();
    for (let i = 0; i < g.decalN; i++) {
      const k = i * 4, x = D[k], y = D[k + 1], r = D[k + 2], kind = D[k + 3];
      if ((kind === 2) !== (pass === 1)) continue;
      if (x < vx0 || x > vx1 || y < vy0 || y > vy1) continue;
      ctx.moveTo(x + r, y); ctx.ellipse(x, y, r, r * 0.5, 0, 0, TAU);
    }
    ctx.fillStyle = pass ? 'rgba(10,6,4,0.45)' : 'rgba(90,6,6,0.45)';
    ctx.fill();
  }

  // ---- escenario de misión: raíles, puente
  const mods = g.mods;
  if (mods.lanes.length) {
    for (let i = 0; i < mods.lanes.length; i++) {
      const y = mods.lanes[i];
      if (y < vy0 - 20 || y > vy1 + 20) continue;
      ctx.fillStyle = '#3a2a1e';
      for (let x = Math.floor(vx0 / 40) * 40; x < vx1; x += 40) ctx.fillRect(x, y - 16, 10, 32);
      ctx.fillStyle = '#6a6a72';
      ctx.fillRect(vx0, y - 13, vx1 - vx0, 4); ctx.fillRect(vx0, y + 9, vx1 - vx0, 4);
    }
    for (let i = 0; i < mods.carts.length; i++) {
      const c = mods.carts[i];
      if (!c.on) continue;
      if (c.warn > 0) {
        if ((t * 8) % 2 < 1.2) { ctx.fillStyle = 'rgba(255,60,20,0.28)'; ctx.fillRect(vx0, c.y - 30, vx1 - vx0, 60); }
        continue;
      }
      const s = cache.prop('minecart');
      spr(ctx, S, tx, ty, s.canvas, s.ox, s.oy, s.w, s.h, c.x, c.y + 16, c.dir < 0, 0);
      ctx.setTransform(S, 0, 0, S, tx, ty);
    }
  }
  if (g.objective.bridge) {
    const b = g.objective.bridge;
    if (b.y + 200 > vy0 && b.y - 200 < vy1) {
      ctx.fillStyle = '#0a0503'; ctx.fillRect(vx0, b.y - 80, vx1 - vx0, 160);
      ctx.fillStyle = 'rgba(255,80,20,0.18)'; ctx.fillRect(vx0, b.y - 20, vx1 - vx0, 40);
      ctx.fillStyle = '#5a3a1e';
      for (let y = b.y - 96; y < b.y + 96; y += 16) { ctx.fillRect(b.x - 80, y, 160, 11); }
      ctx.strokeStyle = INK; ctx.lineWidth = 2;
      for (let y = b.y - 96; y < b.y + 96; y += 16) ctx.strokeRect(b.x - 80, y, 160, 11);
      ctx.strokeStyle = '#a8885a'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(b.x - 86, b.y - 110); ctx.lineTo(b.x - 86, b.y + 110); ctx.moveTo(b.x + 86, b.y - 110); ctx.lineTo(b.x + 86, b.y + 110); ctx.stroke();
      ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(255,210,58,0.6)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // ---- zonas bajo los personajes
  const Z = g.zones.items;
  for (let i = 0; i < g.zones.n; i++) {
    const z = Z[i];
    const k = Math.min(1, z.life / z.max);
    switch (z.kind) {
      case ZK.FIRE: {
        const a = Math.min(1, (z.max - z.life) * 2);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * a;
        const r = z.r * (1.6 + Math.sin(t * 12 + z.uid) * 0.1);
        ctx.drawImage(cache.glow('#ff6a1a'), z.x - r, z.y - r * 0.6, r * 2, r * 1.2);
        ctx.globalAlpha = 0.4 * a; ctx.drawImage(cache.glow('#ffd23a'), z.x - r * 0.5, z.y - r * 0.3, r, r * 0.6);
        break;
      }
      case ZK.RING:
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = z.color; ctx.lineWidth = 22 * (1 - k * 0.5);
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.75, 0, 0, TAU); ctx.stroke();
        ctx.strokeStyle = g.pal.fireR || '#ffd23a'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r * 0.92, z.r * 0.69, 0, 0, TAU); ctx.stroke();
        break;
      case ZK.STRIKE: case ZK.METEOR: case ZK.LIGHTNING: case ZK.BOMB: case ZK.SLAM: {
        if (z.life > z.max) break;
        const danger = z.owner === 0 || z.kind === ZK.METEOR || z.kind === ZK.LIGHTNING;
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.25 + k * 0.45;
        ctx.strokeStyle = danger ? '#ff2a1a' : z.color; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = danger ? 'rgba(255,40,20,0.22)' : 'rgba(255,200,80,0.15)';
        ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r * k, z.r * 0.6 * k, 0, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        if (z.kind === ZK.STRIKE || z.kind === ZK.METEOR) {
          const hgt = (1 - k) * 420, ix = z.kind === ZK.METEOR ? icons.meteor : null;
          ctx.globalCompositeOperation = 'lighter';
          ctx.drawImage(cache.glow(z.color), z.x - 30 + (1 - k) * 120, z.y - hgt - 30, 60, 60);
          if (ix) { ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(ix.c, z.x - 15 + (1 - k) * 120, z.y - hgt - 15, 30, 30); }
        }
        break;
      }
      case ZK.POOL: {
        const a = Math.min(1, z.life * 2, (z.max - z.life) * 2);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.75 * a;
        ctx.fillStyle = '#16061f'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r * 0.6, 0, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * a;
        ctx.drawImage(cache.glow('#b04dff'), z.x - z.r, z.y - z.r * 0.6, z.r * 2, z.r * 1.2);
        break;
      }
      case ZK.CHARGE: {
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.25 + 0.35 * ((t * 10) % 1);
        ctx.setTransform(S * Math.cos(z.ang), S * Math.sin(z.ang), -S * Math.sin(z.ang), S * Math.cos(z.ang), tx + z.x * S, ty + z.y * S);
        ctx.fillStyle = '#ff2a1a'; ctx.fillRect(0, -z.r, z.len, z.r * 2);
        ctx.setTransform(S, 0, 0, S, tx, ty);
        break;
      }
      default: break;
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // ---- atrezo (ordenado por Y una vez)
  const P = g.props;
  for (let i = 0; i < P.length; i++) {
    const o = P[i], s = o.spr;
    if (o.x + s.w < vx0 || o.x - s.w > vx1 || o.y < vy0 || o.y - s.h > vy1) continue;
    ctx.drawImage(s.canvas, o.x - s.ox, o.y - s.oy, s.w, s.h);
  }

  // ---- estructuras
  for (let i = 0; i < g.structs.length; i++) {
    const s = g.structs[i];
    if (s.x < vx0 - 200 || s.x > vx1 + 200 || s.y < vy0 - 100 || s.y > vy1 + 250) continue;
    const sp = s.spr;
    ctx.globalAlpha = s.hp <= 0 && s.targetable ? 0.35 : 1;
    ctx.drawImage(sp.canvas, s.x - sp.ox, s.y - sp.oy, sp.w, sp.h);
    ctx.globalAlpha = 1;
    if (s.flash > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(cache.glow('#ffffff'), s.x - s.r * 1.5, s.y - s.r * 3, s.r * 3, s.r * 3); ctx.globalCompositeOperation = 'source-over'; }
    if ((s.targetable || s.defend) && s.hp > 0) bar(ctx, s.x, s.y - sp.oy + 10, Math.max(70, s.r * 1.6), 7, s.hp / s.maxHp, s.defend ? '#5aff4a' : '#ff5a2a');
    if (s.kind === 'gravestone') {
      if (s.done) { ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(cache.glow('#fff6d0'), s.x - 50, s.y - 100, 100, 100); ctx.globalCompositeOperation = 'source-over'; }
      else {
        ctx.strokeStyle = 'rgba(176,77,255,0.5)'; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
        ctx.beginPath(); ctx.ellipse(s.x, s.y, 110, 66, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        if (s.progress > 0) {
          ctx.strokeStyle = '#fff6d0'; ctx.lineWidth = 6;
          ctx.beginPath(); ctx.arc(s.x, s.y - 120, 18, -Math.PI / 2, -Math.PI / 2 + TAU * s.progress); ctx.stroke();
        }
      }
    }
  }

  // ---- botín
  const PI = g.pickups.items;
  for (let i = 0; i < g.pickups.n; i++) {
    const it = PI[i];
    if (it.x < vx0 || it.x > vx1 || it.y < vy0 || it.y > vy1) continue;
    const bob = Math.sin(t * 5 + i) * 2;
    if (it.kind === PK.XP) { const ic = it.value >= 3 ? icons.xpBig : icons.xp; ctx.drawImage(ic.c, it.x - ic.w / 2, it.y - ic.h / 2 - 6 + bob, ic.w, ic.h); }
    else if (it.kind === PK.COIN) ctx.drawImage(icons.coin.c, it.x - 10, it.y - 16 + bob, 20, 20);
    else if (it.kind === PK.HEAL) ctx.drawImage(icons.heal.c, it.x - 10, it.y - 24 + bob, 20, 28);
    else if (it.kind === PK.CRYSTAL) {
      const s = cache.prop('crystal');
      ctx.drawImage(s.canvas, it.x - s.ox, it.y - s.oy + bob, s.w, s.h);
    }
  }

  // ---- sombras en lote
  const E = g.enemies.items, n = g.enemies.n;
  sortByY(E, n);
  ctx.fillStyle = 'rgba(0,0,0,0.38)';
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const e = E[i];
    if (e.dead || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue;
    const r = e.r * 1.15;
    ctx.moveTo(e.x + r, e.y); ctx.ellipse(e.x, e.y, r, r * 0.4, 0, 0, TAU);
  }
  ctx.moveTo(p.x + 18, p.y); ctx.ellipse(p.x, p.y, 18, 7, 0, 0, TAU);
  for (let i = 0; i < g.turrets.length; i++) { const tu = g.turrets[i]; ctx.moveTo(tu.x + 18, tu.y); ctx.ellipse(tu.x, tu.y, 18, 6, 0, 0, TAU); }
  ctx.fill();

  // ---- auras de élite / jefe
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const e = E[i];
    if (e.dead || !(e.elite || e.boss) || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue;
    const r = e.r * (2.6 + Math.sin(t * 5 + e.uid) * 0.3);
    ctx.globalAlpha = 0.45 * e.alpha;
    ctx.drawImage(cache.glow(e.boss ? '#ff2a2a' : e.type === 'shaman' ? '#b04dff' : '#ff6a12'), e.x - r, e.y - r * 0.9, r * 2, r * 1.2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // ---- horda + jugador (el jugador se intercala por Y)
  let playerDrawn = false;
  for (let i = 0; i <= n; i++) {
    const e = i < n ? E[i] : null;
    if (!playerDrawn && (!e || e.y > p.y)) { drawPlayer(g, ctx, S, tx, ty, t); playerDrawn = true; }
    if (!e || e.dead) continue;
    if (e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue;
    const s = e.spr;
    const moving = e.type !== 'sniper';
    const ph = t * (e.type === 'hound' ? 16 : 9) + e.uid;
    const bob = moving ? Math.abs(Math.sin(ph)) * (e.boss ? 4 : 2.5) : 0;
    const rot = moving ? Math.sin(ph) * (e.boss ? 0.03 : 0.07) : 0;
    const alpha = e.type === 'sniper' ? e.alpha * 0.78 : e.alpha;
    if (alpha <= 0.01) continue;
    ctx.globalAlpha = alpha;
    spr(ctx, S, tx, ty, s.canvas, s.ox, s.oy, s.w, s.h, e.x, e.y - bob, e.face < 0, rot);
    if (e.flash > 0) { ctx.globalAlpha = 0.85; ctx.drawImage(s.flash, -s.ox, -s.oy, s.w, s.h); }
    else if (e.burnT > 0) { ctx.globalAlpha = 0.25; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(cache.glow('#ff6a1a'), -s.w * 0.4, -s.oy * 0.9, s.w * 0.8, s.oy * 0.9); ctx.globalCompositeOperation = 'source-over'; }
    else if (e.slowT > 0) { ctx.globalAlpha = 0.18; ctx.drawImage(s.flash, -s.ox, -s.oy, s.w, s.h); }
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(S, 0, 0, S, tx, ty);

  // barras de vida de élites y nombres
  for (let i = 0; i < n; i++) {
    const e = E[i];
    if (e.dead || !e.elite || e.x < vx0 || e.x > vx1 || e.y < vy0 || e.y > vy1) continue;
    bar(ctx, e.x, e.y - e.spr.oy - 4, 46, 5, e.hp / e.maxHp, '#ff6a12');
  }

  // ---- torretas
  for (let i = 0; i < g.turrets.length; i++) {
    const tu = g.turrets[i], s = tu.spr;
    ctx.drawImage(s.canvas, tu.x - s.ox, tu.y - s.oy, s.w, s.h);
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(tu.x, tu.y - 26); ctx.lineTo(tu.x + Math.cos(tu.ang) * 20, tu.y - 26 + Math.sin(tu.ang) * 20); ctx.stroke();
    ctx.strokeStyle = '#8a8a92'; ctx.lineWidth = 3; ctx.stroke();
    ctx.strokeStyle = g.pal.glow; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tu.x, tu.y + 4, 14, -Math.PI / 2, -Math.PI / 2 + TAU * (tu.life / 14)); ctx.stroke();
  }

  // ---- miras láser de francotiradores
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const e = E[i];
    if (e.dead || e.type !== 'sniper' || (e.state !== 1 && e.state !== 2)) continue;
    const sx = e.x, sy = e.y - 34, a = Math.atan2(e.ay - sy, e.ax - sx);
    const ex = sx + Math.cos(a) * 1400, ey = sy + Math.sin(a) * 1400;
    const lock = e.state === 2;
    ctx.globalAlpha = lock ? (((t * 20) % 2) < 1 ? 0.95 : 0.4) : 0.35;
    ctx.strokeStyle = lock ? '#ff2a4a' : '#7a0a2a'; ctx.lineWidth = lock ? 3 : 1.6;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // ---- proyectiles del jugador
  const B = g.bullets.items;
  for (let i = 0; i < g.bullets.n; i++) {
    const b = B[i];
    if (b.x < vx0 || b.x > vx1 || b.y < vy0 - 100 || b.y > vy1) continue;
    if (b.kind === BK.GRENADE) {
      const k = Math.min(1, b.t / b.tmax), hgt = Math.sin(k * Math.PI) * 70;
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(b.x, b.y, 7, 3, 0, 0, TAU); ctx.fill();
      ctx.drawImage(icons.bomb.c, b.x - 11, b.y - hgt - 11, 22, 22);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(cache.glow(b.color), b.x - 12, b.y - hgt - 18, 24, 24);
      continue;
    }
    const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp, len = b.len;
    const gr = b.r * (b.crit ? 6 : 4.5);
    ctx.drawImage(cache.glow(b.color), b.x - gr, b.y - gr, gr * 2, gr * 2);
    ctx.strokeStyle = b.color; ctx.lineWidth = b.r * 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x - ux * len, b.y - uy * len); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = b.core; ctx.lineWidth = b.r * 0.6;
    ctx.beginPath(); ctx.moveTo(b.x - ux * len * 0.5, b.y - uy * len * 0.5); ctx.lineTo(b.x, b.y); ctx.stroke();
  }

  // ---- proyectiles enemigos
  const EB = g.ebullets.items;
  for (let i = 0; i < g.ebullets.n; i++) {
    const b = EB[i];
    if (b.x < vx0 || b.x > vx1 || b.y < vy0 - 100 || b.y > vy1) continue;
    if (b.kind === EK.LOB) {
      const k = Math.min(1, b.t / b.tmax), hgt = Math.sin(k * Math.PI) * 120;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(icons.dyn.c, b.x - 11, b.y - hgt - 11, 22, 22);
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(cache.glow('#ffd23a'), b.x + 2, b.y - hgt - 22, 16, 16);
      continue;
    }
    ctx.globalCompositeOperation = 'lighter';
    const gr = b.r * 3.2;
    ctx.drawImage(cache.glow(b.color), b.x - gr, b.y - gr, gr * 2, gr * 2);
    if (b.kind === EK.SKULL) { ctx.globalCompositeOperation = 'source-over'; ctx.drawImage(icons.skull.c, b.x - 11, b.y - 11, 22, 22); continue; }
    ctx.fillStyle = '#ffffff';
    if (b.kind === EK.FAST) {
      const sp = Math.hypot(b.vx, b.vy) || 1;
      ctx.strokeStyle = b.color; ctx.lineWidth = b.r * 1.4;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx / sp * 22, b.y - b.vy / sp * 22); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r * 0.55, 0, TAU); ctx.fill();
  }

  // ---- partículas
  const PA = g.parts.items;
  ctx.globalCompositeOperation = 'source-over';
  for (let i = 0; i < g.parts.n; i++) {
    const q = PA[i];
    if (q.add || q.x < vx0 || q.x > vx1 || q.y < vy0 || q.y > vy1) continue;
    const k = q.life / q.max;
    ctx.globalAlpha = 1 - k;
    ctx.fillStyle = q.color;
    if (q.kind === PT.SMOKE) { ctx.globalAlpha = (1 - k) * 0.45; ctx.beginPath(); ctx.arc(q.x, q.y, q.size, 0, TAU); ctx.fill(); }
    else ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
  }
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < g.parts.n; i++) {
    const q = PA[i];
    if (!q.add || q.x < vx0 - 100 || q.x > vx1 + 100 || q.y < vy0 - 100 || q.y > vy1 + 100) continue;
    const k = q.life / q.max;
    ctx.globalAlpha = 1 - k;
    switch (q.kind) {
      case PT.FLASH: ctx.drawImage(cache.glow(q.color), q.x - q.size, q.y - q.size, q.size * 2, q.size * 2); break;
      case PT.RING: ctx.strokeStyle = q.color; ctx.lineWidth = 6 * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.size, q.size * 0.6, 0, 0, TAU); ctx.stroke(); break;
      case PT.EMBER: ctx.drawImage(cache.glow(q.color), q.x - q.size * 2, q.y - q.size * 2, q.size * 4, q.size * 4); break;
      default: ctx.fillStyle = q.color; ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';

  // ---- rayos (instante del impacto)
  for (let i = 0; i < g.zones.n; i++) {
    const z = Z[i];
    if (z.kind !== ZK.LIGHTNING || z.life < z.max) continue;
    ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 5; ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath(); let x = z.x + 60, y = z.y - 700; ctx.moveTo(x, y);
    for (let k = 1; k <= 8; k++) { x = z.x + 60 * (1 - k / 8) + (((z.uid * 31 + k * 17) % 40) - 20); y = z.y - 700 + (700 * k) / 8; ctx.lineTo(x, y); }
    ctx.stroke(); ctx.lineWidth = 12; ctx.globalAlpha = 0.3; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---- textos (daño y onomatopeyas)
  const TX = g.texts.items;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (let i = 0; i < g.texts.n; i++) {
    const q = TX[i], k = q.life / q.max;
    ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
    if (q.big) {
      const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15));
      ctx.setTransform(S * pop, -S * pop * 0.08, S * pop * 0.08, S * pop, tx + q.x * S, ty + q.y * S);
      ctx.font = font(q.size);
      ctx.lineWidth = q.size * 0.32; ctx.strokeStyle = INK; ctx.strokeText(q.str, 0, 0);
      ctx.fillStyle = q.color; ctx.fillText(q.str, 0, 0);
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillText(q.str, -1, -1.5);
      ctx.setTransform(S, 0, 0, S, tx, ty);
    } else {
      ctx.font = font(q.size, 'Special Elite');
      ctx.lineWidth = 3.5; ctx.strokeStyle = INK; ctx.strokeText(q.str, q.x, q.y);
      ctx.fillStyle = q.color; ctx.fillText(q.str, q.x, q.y);
    }
  }
  ctx.globalAlpha = 1;

  // ---- capas de pantalla
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const W = g.w, H = g.h;
  const psx = (p.x - camX) * g.scale + W / 2, psy = (p.y - 20 - camY) * g.scale + H / 2;
  if (mods.has('fog')) {
    ctx.globalAlpha = 0.7;
    const fb = cache.fogBlob();
    for (let i = 0; i < 9; i++) {
      const fx = ((i * 397 + t * (18 + i * 3)) % (W + 600)) - 300;
      const fy = ((i * 211) % (H + 300)) - 150 + Math.sin(t * 0.3 + i) * 40;
      ctx.drawImage(fb, fx - 200, fy - 200, 520, 420);
    }
    ctx.globalAlpha = 1;
  }
  const dark = mods.dark || (mods.dark = mods.has('night') ? { r: 0.38, a: 0.95, fill: 'rgba(5,3,10,0.95)', col: '#05030a' }
    : mods.has('dark') ? { r: 0.48, a: 0.88, fill: 'rgba(5,3,10,0.88)', col: '#05030a' }
      : mods.has('fog') ? { r: 0.55, a: 0.8, fill: 'rgba(26,24,32,0.8)', col: '#1a1820' } : { r: 0 });
  if (dark.r) {
    const R = Math.min(W, H) * (dark.r + 0.5) + 60;
    const vig = cache.vignette(dark.col, 0.25, dark.a);
    const x0 = psx - R, y0 = psy - R;
    ctx.drawImage(vig, x0, y0, R * 2, R * 2);
    ctx.fillStyle = dark.fill;
    if (x0 > 0) ctx.fillRect(0, 0, x0, H);
    if (x0 + R * 2 < W) ctx.fillRect(x0 + R * 2, 0, W - x0 - R * 2, H);
    if (y0 > 0) ctx.fillRect(Math.max(0, x0), 0, Math.min(W, R * 2), y0);
    if (y0 + R * 2 < H) ctx.fillRect(Math.max(0, x0), y0 + R * 2, Math.min(W, R * 2), H - y0 - R * 2);
  }
  if (mods.has('bloodmoon')) { ctx.fillStyle = 'rgba(150,10,30,0.13)'; ctx.fillRect(0, 0, W, H); }
  if (mods.st.rain) {
    ctx.fillStyle = 'rgba(10,14,30,0.18)'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(190,210,255,0.35)'; ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (let i = 0; i < 90; i++) {
      const x = (i * 137.7 + t * 260) % (W + 100) - 50, y = (i * 91.3 + t * 900) % (H + 60) - 30;
      ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18);
    }
    ctx.stroke();
  }
  if (g.slowmo > 0) { ctx.fillStyle = 'rgba(255,200,120,0.12)'; ctx.fillRect(0, 0, W, H); }
  ctx.globalAlpha = 0.75;
  ctx.drawImage(screenHalftone(g), 0, 0, W, H);
  ctx.globalAlpha = 1;
  if (p.hurt > 0 || p.hp / p.maxHp < 0.25) {
    const a = p.hurt > 0 ? p.hurt * 1.6 : 0.18 + Math.sin(t * 6) * 0.1;
    ctx.globalAlpha = Math.min(0.7, a);
    ctx.drawImage(cache.vignette('#a00000', 0.55, 0.9), -W * 0.1, -H * 0.1, W * 1.2, H * 1.2);
    ctx.globalAlpha = 1;
  }
  if (g.flash > 0) { ctx.fillStyle = `rgba(255,250,235,${(g.flash * 0.5).toFixed(2)})`; ctx.fillRect(0, 0, W, H); }

  drawHud(g, ctx, t);
}

function drawPlayer(g, ctx, S, tx, ty, t) {
  const p = g.player, s = g.cache.hero(g.hero.id, g.pal), cache = g.cache;
  ctx.setTransform(S, 0, 0, S, tx, ty);
  // aura
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.28 + Math.sin(t * 3) * 0.06;
  ctx.drawImage(cache.glow(g.pal.glow), p.x - 40, p.y - 22, 80, 40);
  ctx.globalCompositeOperation = 'source-over';
  // indicador de apuntado
  const ax = p.x + Math.cos(p.aim) * 46, ay = p.y - 20 + Math.sin(p.aim) * 46;
  ctx.globalAlpha = 0.8; ctx.fillStyle = g.pal.glow; ctx.strokeStyle = INK; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(ax + Math.cos(p.aim) * 9, ay + Math.sin(p.aim) * 9);
  ctx.lineTo(ax + Math.cos(p.aim + 2.4) * 7, ay + Math.sin(p.aim + 2.4) * 7);
  ctx.lineTo(ax + Math.cos(p.aim - 2.4) * 7, ay + Math.sin(p.aim - 2.4) * 7);
  ctx.closePath(); ctx.fill(); ctx.stroke();
  const blink = p.inv > 0 && p.hurt <= 0 && g.state === 'play' && ((t * 20) % 2 < 1);
  ctx.globalAlpha = blink ? 0.45 : 1;
  const bob = p.moving ? Math.abs(Math.sin(t * 12)) * 3 : Math.sin(t * 2.5) * 0.8;
  const rot = p.moving ? Math.sin(t * 12) * 0.06 : 0;
  spr(ctx, S, tx, ty, s.canvas, s.ox, s.oy, s.w, s.h, p.x, p.y - bob, p.face < 0, rot);
  if (p.hurt > 0) { ctx.globalAlpha = 0.8; ctx.drawImage(s.flash, -s.ox, -s.oy, s.w, s.h); }
  ctx.globalAlpha = 1;
  ctx.setTransform(S, 0, 0, S, tx, ty);
  if (p.dashT > 0) {
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5;
    ctx.drawImage(cache.glow(g.pal.glow), p.x - 40, p.y - 60, 80, 80);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
}

function bar(ctx, x, y, w, h, k, color) {
  ctx.fillStyle = INK; ctx.fillRect(x - w / 2 - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = '#2a1a14'; ctx.fillRect(x - w / 2, y, w, h);
  ctx.fillStyle = color; ctx.fillRect(x - w / 2, y, w * Math.max(0, Math.min(1, k)), h);
}
