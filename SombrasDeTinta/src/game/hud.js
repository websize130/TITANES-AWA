// HUD limpio: barra de salud metálica desgastada, mano/mazo de cartas con recarga, ronda u objetivo,
// maldiciones activas, barras de colosos, flechas a objetivos, joystick y rótulos de tinta.
import { INK, TAU, makeCanvas, makeRng, burst } from '../art/ink.js';
import { miniCard, pokerFace } from '../art/cardArt.js';
import { HX, HY } from './engine.js';
import { ZONES } from '../data/story.js';
import { FURIES } from '../data/poker.js';

const FONT = new Map();
function f(size, face) { const k = face + size; let v = FONT.get(k); if (!v) { v = face === 'T' ? `${size}px "Holtwood One SC", Georgia, serif` : `bold ${size}px "Courier Prime", "Courier New", monospace`; FONT.set(k, v); } return v; }
function text(ctx, s, x, y, size, color, face = 'T', align = 'left', stroke = 3) {
  ctx.font = f(size, face); ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}
const memo = new Map();
function txt(key, v, fmt) { let m = memo.get(key); if (!m) { m = { v: NaN, s: '' }; memo.set(key, m); } if (m.v !== v) { m.v = v; m.s = fmt(v); } return m.s; }
const mmss = (s) => { s = Math.ceil(s); return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); };

// Placa de acero gastado con remaches (pre-renderizada por tamaño).
const plates = new Map();
function plate(w, h, dpr) {
  const key = w + 'x' + h + 'x' + dpr;
  let c = plates.get(key);
  if (c) return c;
  c = makeCanvas(w * dpr, h * dpr);
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const g = x.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#6a6a6e'); g.addColorStop(0.18, '#3a3a3e'); g.addColorStop(0.5, '#2a2a2e'); g.addColorStop(0.85, '#1a1a1c'); g.addColorStop(1, '#4a4a4e');
  x.fillStyle = g; x.beginPath(); x.roundRect(1, 1, w - 2, h - 2, 6); x.fill();
  x.lineWidth = 2.5; x.strokeStyle = INK; x.stroke();
  const r = makeRng(w * 7 + h);
  x.strokeStyle = 'rgba(220,220,230,0.18)'; x.lineWidth = 0.8;
  for (let i = 0; i < 26; i++) { const sx = r() * w, sy = r() * h; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (r() - 0.5) * 30, sy + (r() - 0.5) * 6); x.stroke(); }
  x.fillStyle = 'rgba(120,60,20,0.25)'; for (let i = 0; i < 40; i++) x.fillRect(r() * w, r() * h, 1 + r() * 3, 1 + r() * 2);
  for (const [px, py] of [[7, 7], [w - 7, 7], [7, h - 7], [w - 7, h - 7]]) {
    x.fillStyle = '#8a8a90'; x.beginPath(); x.arc(px, py, 3, 0, TAU); x.fill(); x.strokeStyle = INK; x.lineWidth = 1; x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.5)'; x.fillRect(px - 1, py - 2, 1.5, 1.5);
  }
  plates.set(key, c);
  return c;
}

function metalBar(ctx, x, y, w, h, k, c1, c2) {
  ctx.fillStyle = '#0a0606'; ctx.fillRect(x, y, w, h);
  const kw = w * Math.max(0, Math.min(1, k));
  ctx.fillStyle = c1; ctx.fillRect(x, y, kw, h);
  ctx.fillStyle = c2; ctx.fillRect(x, y, kw, Math.max(1, h * 0.3));
  ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 1; i < 10; i++) ctx.fillRect(x + (w * i) / 10, y, 1, h);
  ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.strokeRect(x, y, w, h);
}

const BTN = { c0: { id: 'c0', x: 0, y: 0, r: 0 }, c1: { id: 'c1', x: 0, y: 0, r: 0 }, c2: { id: 'c2', x: 0, y: 0, r: 0 }, pause: { id: 'pause', x: 0, y: 0, r: 0 } };

const HUDCARDS = [BTN.c0, BTN.c1, BTN.c2];

export function drawHud(g, ctx, t) {
  const W = g.w, H = g.h, p = g.player, inp = g.input, touch = inp.isTouch, small = W < 640, dpr = g.dpr;

  // ---------------- salud metálica
  const pw = small ? 210 : 290, ph = 58;
  ctx.drawImage(plate(pw, ph, dpr), 10, 10, pw, ph);
  ctx.save(); ctx.beginPath(); ctx.arc(39, 39, 22, 0, TAU); ctx.fillStyle = '#0a0606'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#8a8a90'; ctx.stroke(); ctx.clip();
  const hs = g.spr.hero(g.hero.id, g.pal, g.skinIdx); ctx.drawImage(hs.canvas, 39 - 30, 14, 60, 60 * hs.h / hs.w); ctx.restore();
  const bx = 68, bw = pw - 70;
  metalBar(ctx, bx, 18, bw, 15, p.hp / p.maxHp, p.hp / p.maxHp < 0.3 ? '#d8201a' : '#9a1a14', 'rgba(255,170,150,0.5)');
  text(ctx, txt('hp', Math.ceil(p.hp) * 10000 + p.maxHp, () => Math.ceil(p.hp) + ' / ' + Math.round(p.maxHp)), bx + 6, 26, 11, '#fff2dc', 'B', 'left', 2.5);
  metalBar(ctx, bx, 38, bw, 6, g.souls / g.nextSouls, '#9ac8ff', '#e8f4ff');
  text(ctx, txt('lvl', g.level, (v) => 'NV ' + v), bx, 55, 12, '#c8d8ff', 'T', 'left', 3);
  text(ctx, txt('k', g.kills, (v) => '☠ ' + v), bx + bw, 55, 12, '#e8d8b8', 'B', 'right', 3);
  // munición / recarga
  const mag = g.magSize();
  if (p.reloadT > 0) {
    const k = 1 - p.reloadT / (g.weapon.reload * g.st.reloadMult);
    metalBar(ctx, 14, 74, 120, 7, k, '#c9a54a', '#fff0b0');
    text(ctx, 'RECARGANDO', 140, 78, 10, '#ffcf6a', 'B', 'left', 2.5);
  } else {
    const pw2 = Math.min(7, 150 / mag);
    for (let i = 0; i < mag; i++) { ctx.fillStyle = i < p.ammo ? '#d8b860' : '#2a2018'; ctx.fillRect(14 + i * (pw2 + 2), 72, pw2, 11); ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.strokeRect(14 + i * (pw2 + 2), 72, pw2, 11); }
  }
  let ly = 98;
  // maldiciones activas
  for (let i = 0; i < g.curses.length; i++, ly += 18) {
    const c = g.curses[i];
    text(ctx, (c.type === 'slow' ? '⛓ LENTITUD ' : '☠ VULNERABLE ') + Math.ceil(c.t) + 's', 14, ly, 11, '#d8a8ff', 'B', 'left', 3);
  }
  // furias del póker
  for (let i = 0; i < g.furies.length; i++, ly += 18) {
    const f = g.furies[i], F = FURIES[f.id];
    text(ctx, '♠ ' + F.name.toUpperCase() + ' ' + Math.ceil(f.t) + 's', 14, ly, 11, F.color, 'B', 'left', 3);
  }
  if (g.objective.fever) text(ctx, '🔥 ÚLTIMO CARTUCHO +30% DAÑO', 14, ly, 11, '#ff6a3a', 'B', 'left', 3);

  // ---------------- pausa + mazo (arriba derecha)
  BTN.pause.r = touch ? 24 : 18; BTN.pause.x = W - 12 - BTN.pause.r; BTN.pause.y = 12 + BTN.pause.r;
  ctx.beginPath(); ctx.arc(BTN.pause.x, BTN.pause.y, BTN.pause.r, 0, TAU); ctx.fillStyle = '#2a2a2e'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#8a8a90'; ctx.stroke();
  ctx.fillStyle = '#e8e2d4'; ctx.fillRect(BTN.pause.x - 6, BTN.pause.y - 8, 4, 16); ctx.fillRect(BTN.pause.x + 2, BTN.pause.y - 8, 4, 16);
  const dw = 104, dx = BTN.pause.x - BTN.pause.r - 10 - dw;
  ctx.drawImage(plate(dw, 36, dpr), dx, 12, dw, 36);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 2 ? '#e8dcc0' : '#a89878'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.fillRect(dx + 10 + i * 3, 19 - i * 2, 14, 20); ctx.strokeRect(dx + 10 + i * 3, 19 - i * 2, 14, 20); }
  text(ctx, txt('deck', g.deck, (v) => 'MAZO ' + v), dx + 34, 30, 12, '#f2e2b8', 'T', 'left', 3);
  // minimapa de la comarca (3× el viewport)
  const mw = small ? 96 : 150, mh = Math.round(mw * HY / HX), mx = W - 12 - mw, my = 56;
  ctx.drawImage(plate(mw + 8, mh + 8, dpr), mx - 4, my - 4, mw + 8, mh + 8);
  if (g.zoned) for (const z of ZONES) { ctx.fillStyle = z.mini; ctx.fillRect(mx + (z.x0 + 1) / 2 * mw, my, (z.x1 - z.x0) / 2 * mw, mh); }
  else { ctx.fillStyle = g.map.g2; ctx.fillRect(mx, my, mw, mh); }
  const wx = (x) => mx + ((x + HX) / (2 * HX)) * mw, wy = (y) => my + ((y + HY) / (2 * HY)) * mh;
  ctx.strokeStyle = 'rgba(232,220,192,0.5)'; ctx.lineWidth = 1;
  ctx.strokeRect(wx(g.cam.x - g.viewW / 2), wy(g.cam.y - g.viewH / 2), (g.viewW / (2 * HX)) * mw, (g.viewH / (2 * HY)) * mh);
  const Z = g.zombies.items;
  for (let i = 0; i < g.zombies.n; i++) { const e = Z[i]; if (e.dead || !(e.colossus || e.type === 'abomination')) continue; ctx.fillStyle = e.colossus ? '#ff3a2a' : '#b04dff'; ctx.fillRect(wx(e.x) - 2, wy(e.y) - 2, 4, 4); }
  for (const st2 of g.structs) { ctx.fillStyle = '#5aff4a'; ctx.fillRect(wx(st2.x) - 2, wy(st2.y) - 2, 4, 4); }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(wx(p.x), wy(p.y), 2.5, 0, TAU); ctx.fill();

  // ---------------- objetivo / ronda
  const o = g.objective, ow = small ? Math.min(W - 24, 270) : 360, ox = (W - ow) / 2, oy = small ? 140 : 10;
  ctx.drawImage(plate(ow, o.progress >= 0 ? 60 : 48, dpr), ox, oy, ow, o.progress >= 0 ? 60 : 48);
  text(ctx, o.headline(), W / 2, oy + 16, small ? 12 : 15, '#f2d27a', 'T', 'center', 3);
  if (o.timer >= 0) text(ctx, txt('tm', Math.ceil(o.timer), mmss), W / 2, oy + 36, small ? 15 : 18, o.timer < 10 && o.round === 0 ? '#ff6a4a' : '#fff2dc', 'T', 'center', 4);
  else text(ctx, g.map.name, W / 2, oy + 35, 11, '#b8b0a0', 'B', 'center', 2);
  if (o.progress >= 0) metalBar(ctx, ox + 14, oy + 48, ow - 28, 5, o.progress, '#c9a54a', '#fff0b0');

  // ---------------- colosos
  let cy = H - (touch ? 186 : 120);
  for (let i = 0; i < g.colossi.length; i++) {
    const c = g.colossi[i];
    if (c.dead) continue;
    const bw2 = Math.min(W - 40, 480), bx2 = (W - bw2) / 2;
    text(ctx, c.name.toUpperCase(), W / 2, cy - 11, small ? 12 : 15, '#ff6a4a', 'T', 'center', 4);
    metalBar(ctx, bx2, cy, bw2, 12, c.hp / c.maxHp, '#7a0a10', '#ff8a7a');
    cy -= 38;
  }

  // ---------------- flechas a colosos / refugio fuera de pantalla
  const marks = g.colossi.length ? g.colossi : g.structs;
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i];
    if (m.dead || m.hp <= 0) continue;
    const sx = (m.x - g.cam.x) * g.scale + W / 2, sy = (m.y - 30 - g.cam.y) * g.scale + H / 2;
    if (sx > 20 && sx < W - 20 && sy > 20 && sy < H - 20) continue;
    const a = Math.atan2(sy - H / 2, sx - W / 2);
    const ex = Math.max(26, Math.min(W - 26, W / 2 + Math.cos(a) * W)), ey = Math.max(90, Math.min(H - 26, H / 2 + Math.sin(a) * H));
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = g.colossi.length ? '#ff3a2a' : '#5aff4a'; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -11); ctx.lineTo(-3, 0); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
  }

  // ---------------- mano de cartas (indicador del mazo de habilidad)
  const size = touch ? 46 : 44, gap = 10;
  const baseX = touch ? W - (size + gap) * 3 - 6 : W / 2 - ((size + gap) * 3 - gap) / 2, baseY = H - Math.round(size * 1.6) - (touch ? 14 : 12);
  inp.buttons.length = 0; inp.buttons.push(BTN.pause);
  g.hudCards = HUDCARDS;
  for (let i = 0; i < 3; i++) {
    const h = g.hand[i], x = baseX + i * (size + gap), y = baseY, ch = Math.round(size * 1.6);
    const B = BTN['c' + i]; B.x = x + size / 2; B.y = y + ch / 2; B.r = size * 0.62;
    if (touch) inp.buttons.push(B);
    if (!h) {
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(232,220,192,0.35)'; ctx.lineWidth = 2; ctx.strokeRect(x, y, size, ch); ctx.setLineDash([]);
      text(ctx, '' + (i + 1), x + size / 2, y + ch / 2, 14, 'rgba(232,220,192,0.35)', 'T', 'center', 0);
      continue;
    }
    ctx.drawImage(miniCard(h.card, size, dpr), x, y, size, ch);
    if (h.cd > 0) {
      const k = h.cd / (h.card.cd * g.st.cardCd);
      ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x, y + ch * (1 - k), size, ch * k);
      text(ctx, '' + Math.ceil(h.cd), x + size / 2, y + ch / 2, 16, '#e8dcc0', 'T', 'center', 3);
    } else {
      ctx.globalAlpha = 0.4 + Math.sin(t * 5 + i) * 0.25; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2.5; ctx.strokeRect(x - 2, y - 2, size + 4, ch + 4); ctx.globalAlpha = 1;
    }
    if (!touch) { ctx.fillStyle = '#120a06'; ctx.fillRect(x + size / 2 - 9, y - 10, 18, 16); text(ctx, '' + (i + 1), x + size / 2, y - 2, 11, '#f2e2b8', 'T', 'center', 0); }
  }

  // ---------------- mano de póker de tinta (5 naipes)
  const pw3 = touch ? 30 : 34, phh = pw3 * 1.4, px0 = 14, py0 = H - phh - (touch ? 14 : 16);
  text(ctx, 'PÓKER DE TINTA', px0, py0 - 12, 10, '#e8dcc0', 'T', 'left', 2.5);
  const show = g.pokerShow, hand = show ? show.hand : g.poker;
  for (let i = 0; i < 5; i++) {
    const x = px0 + i * (pw3 + 5);
    if (hand[i]) ctx.drawImage(pokerFace(hand[i], pw3, dpr), x, py0 - (show ? Math.sin(Math.min(1, (2.2 - show.t) * 4) * Math.PI) * 8 : 0), pw3, phh);
    else { ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(232,220,192,0.3)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, py0, pw3, phh); ctx.setLineDash([]); }
  }
  if (show) text(ctx, show.combo ? '¡' + FURIES[show.combo].name.toUpperCase() + '!' : 'Carta alta', px0 + 5 * (pw3 + 5) + 6, py0 + phh / 2, 15, show.combo ? FURIES[show.combo].color : '#a89a82', 'T', 'left', 3);

  // ---------------- rótulo de zona
  if (g.zoneBanner) {
    const zb = g.zoneBanner; ctx.globalAlpha = Math.min(1, zb.t * 2, (2.2 - zb.t) * 4);
    text(ctx, '— ' + zb.text + ' —', W / 2, H * 0.2, small ? 18 : 26, '#e8dcc0', 'T', 'center', 4); ctx.globalAlpha = 1;
  }

  // ---------------- joystick
  if (touch && inp.joy.active) {
    const j = inp.joy;
    ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(j.ox, j.oy, j.radius, 0, TAU); ctx.fillStyle = '#000'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#e8dcc0'; ctx.stroke();
    ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(j.ox + j.dx * j.radius, j.oy + j.dy * j.radius, 24, 0, TAU); ctx.fillStyle = '#e8dcc0'; ctx.fill(); ctx.globalAlpha = 1;
  } else if (touch && g.time < 6) {
    ctx.globalAlpha = Math.max(0, 0.6 - g.time / 10); text(ctx, 'Arrastra para moverte', 20, H - 40, 13, '#e8dcc0', 'B', 'left', 3); ctx.globalAlpha = 1;
  }

  // ---------------- partículas de tinta y pólvora (pantalla)
  for (const u of g.uiParts) {
    if (!u.on) continue;
    const k = u.life / u.max; ctx.globalAlpha = 1 - k; ctx.fillStyle = u.color;
    if (u.ink) { ctx.beginPath(); ctx.ellipse(u.x, u.y, u.size, u.size * 0.7, u.vx * 0.01, 0, TAU); ctx.fill(); }
    else ctx.fillRect(u.x - u.size / 2, u.y - u.size / 2, u.size, u.size);
  }
  ctx.globalAlpha = 1;

  // ---------------- rótulo
  const bn = g.banner;
  if (bn) {
    const k = bn.t / bn.max, a = Math.max(0, Math.min(1, (1 - k) * 6, k * 4));
    ctx.globalAlpha = a;
    const cyb = H * 0.34, sz = Math.min(W / (bn.title.length * 0.7 + 2), small ? 28 : 44);
    ctx.save(); ctx.translate(W / 2, cyb); ctx.rotate(-0.04);
    burst(ctx, 0, 0, Math.min(W * 0.48, bn.title.length * sz * 0.45 + 40), 22, 'rgba(120,10,8,0.93)', 4, 9);
    text(ctx, bn.title, 0, -2, sz, '#f2e2b8', 'T', 'center', sz * 0.2);
    ctx.restore();
    if (bn.sub) text(ctx, bn.sub, W / 2, cyb + sz * 0.9 + 16, small ? 13 : 16, '#e8dcc0', 'B', 'center', 3);
    ctx.globalAlpha = 1;
  }
}
