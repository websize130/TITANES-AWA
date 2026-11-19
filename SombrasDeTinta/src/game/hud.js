// HUD limpio: barra de salud metálica desgastada, mano/mazo de cartas con recarga, ronda u objetivo,
// maldiciones activas, barras de colosos, flechas a objetivos, joystick y rótulos de tinta.
import { INK, TAU, makeCanvas, makeRng } from '../art/ink.js';
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

// Placas diegéticas pre-renderizadas por tamaño: hierro oxidado con remaches, cuero cosido y pergamino quemado.
const plates = new Map();
function plate(w, h, dpr, mat = 'rust') {
  const key = mat + w + 'x' + h + 'x' + dpr;
  let c = plates.get(key);
  if (c) return c;
  c = makeCanvas(w * dpr, h * dpr);
  const x = c.getContext('2d'); x.scale(dpr, dpr);
  const r = makeRng(w * 7 + h + mat.length * 31);
  if (mat === 'parchment') {
    // borde irregular quemado
    x.beginPath();
    const N = 28;
    for (let i = 0; i < N * 4; i++) {
      const side = (i / N) | 0, k = (i % N) / N, j = (r() - 0.5) * 3;
      const px = side === 0 ? w * k : side === 1 ? w - 2 + j : side === 2 ? w - w * k : 2 + j;
      const py = side === 0 ? 2 + j : side === 1 ? h * k : side === 2 ? h - 2 + j : h - h * k;
      i ? x.lineTo(px, py) : x.moveTo(px, py);
    }
    x.closePath();
    const gr = x.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, Math.max(w, h) * 0.6);
    gr.addColorStop(0, '#efe0bc'); gr.addColorStop(0.7, '#d8c08c'); gr.addColorStop(1, '#8a6a3a');
    x.fillStyle = gr; x.fill();
    x.lineWidth = 2.5; x.strokeStyle = '#2a1608'; x.stroke();
    x.fillStyle = 'rgba(90,50,10,0.18)'; for (let i = 0; i < 60; i++) x.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    x.strokeStyle = 'rgba(90,50,10,0.25)'; x.lineWidth = 0.7; for (let i = 0; i < 6; i++) { const yy = 6 + r() * (h - 12); x.beginPath(); x.moveTo(4, yy); x.lineTo(w - 4, yy + (r() - 0.5) * 3); x.stroke(); }
  } else if (mat === 'leather') {
    const gr = x.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#6a3e1e'); gr.addColorStop(0.5, '#4a2812'); gr.addColorStop(1, '#2a160a');
    x.fillStyle = gr; x.beginPath(); x.roundRect(1, 1, w - 2, h - 2, 9); x.fill();
    x.lineWidth = 2.5; x.strokeStyle = INK; x.stroke();
    x.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 90; i++) x.fillRect(r() * w, r() * h, 1.2, 1.2);
    x.fillStyle = 'rgba(255,200,140,0.08)'; for (let i = 0; i < 30; i++) x.fillRect(r() * w, r() * h * 0.4, 3, 1);
    // costura
    x.setLineDash([4, 3]); x.strokeStyle = '#d8b880'; x.lineWidth = 1.2;
    x.beginPath(); x.roundRect(5, 5, w - 10, h - 10, 6); x.stroke(); x.setLineDash([]);
  } else {
    const gr = x.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#6a5a50'); gr.addColorStop(0.18, '#3e3430'); gr.addColorStop(0.5, '#2e2622'); gr.addColorStop(0.85, '#1c1612'); gr.addColorStop(1, '#4e403a');
    x.fillStyle = gr; x.beginPath(); x.roundRect(1, 1, w - 2, h - 2, 4); x.fill();
    x.lineWidth = 2.5; x.strokeStyle = INK; x.stroke();
    x.strokeStyle = 'rgba(220,220,230,0.15)'; x.lineWidth = 0.8;
    for (let i = 0; i < 26; i++) { const sx = r() * w, sy = r() * h; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (r() - 0.5) * 30, sy + (r() - 0.5) * 6); x.stroke(); }
    // óxido: manchas y churretes
    for (let i = 0; i < 14; i++) { const sx = r() * w, sy = r() * h, rr = 2 + r() * 7; x.fillStyle = `rgba(${140 + (r() * 40) | 0},${60 + (r() * 20) | 0},20,${(0.25 + r() * 0.25).toFixed(2)})`; x.beginPath(); x.ellipse(sx, sy, rr, rr * 0.7, r() * 3, 0, TAU); x.fill(); }
    for (let i = 0; i < 6; i++) { const sx = 6 + r() * (w - 12); x.fillStyle = 'rgba(150,70,20,0.3)'; x.fillRect(sx, h * 0.5 + r() * 6, 1.5, h * 0.4); }
    for (const [px, py] of [[7, 7], [w - 7, 7], [7, h - 7], [w - 7, h - 7]]) {
      x.fillStyle = '#7a6250'; x.beginPath(); x.arc(px, py, 3, 0, TAU); x.fill(); x.strokeStyle = INK; x.lineWidth = 1; x.stroke();
      x.fillStyle = 'rgba(255,230,200,0.45)'; x.fillRect(px - 1, py - 2, 1.5, 1.5);
    }
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
const FAN = [0, 1, 2].map(() => ({ id: '', cd: 0, playT: -9, drawT: -9 }));

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
  // oro maldito ganado en la partida
  ctx.fillStyle = '#c9a54a'; ctx.beginPath(); ctx.arc(pw - 2, 80, 6, 0, TAU); ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = '#7a5a1a'; ctx.fillRect(pw - 4, 77, 4, 6);
  text(ctx, txt('gold', g.gold | 0, (v) => '' + v), pw - 12, 80, 11, '#ffd27a', 'B', 'right', 2.5);
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
  ctx.drawImage(plate(dw, 36, dpr, 'leather'), dx, 12, dw, 36);
  for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 2 ? '#e8dcc0' : '#a89878'; ctx.strokeStyle = INK; ctx.lineWidth = 1.2; ctx.fillRect(dx + 10 + i * 3, 19 - i * 2, 14, 20); ctx.strokeRect(dx + 10 + i * 3, 19 - i * 2, 14, 20); }
  text(ctx, txt('deck', g.deck, (v) => 'MAZO ' + v), dx + 34, 30, 12, '#f2e2b8', 'T', 'left', 3);
  // minimapa de la comarca (3× el viewport)
  const mw = small ? 96 : 150, mh = Math.round(mw * HY / HX), mx = W - 12 - mw, my = 56;
  ctx.drawImage(plate(mw + 12, mh + 12, dpr, 'parchment'), mx - 6, my - 6, mw + 12, mh + 12);
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
  ctx.drawImage(plate(ow, o.progress >= 0 ? 60 : 48, dpr, 'parchment'), ox, oy, ow, o.progress >= 0 ? 60 : 48);
  { const hl = o.headline(); let hs = small ? 12 : 15; ctx.font = f(hs, 'T'); const hw = ctx.measureText(hl).width; if (hw > ow - 24) hs = Math.max(9, Math.floor(hs * (ow - 24) / hw)); text(ctx, hl, W / 2, oy + 16, hs, '#5a0a06', 'T', 'center', 0); }
  if (o.timer >= 0) text(ctx, txt('tm', Math.ceil(o.timer), mmss), W / 2, oy + 36, small ? 15 : 18, o.timer < 10 && o.round === 0 ? '#b3140e' : '#140c08', 'T', 'center', 0);
  else text(ctx, g.map.name, W / 2, oy + 35, 11, '#3a2410', 'B', 'center', 0);
  // clima dinámico: sello lacrado junto al objetivo
  if (g.weather) {
    const wsx = ox + ow + 22, wsy = oy + 24, ec = g.weather.id === 'eclipse';
    ctx.beginPath(); for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU, rr = k % 2 ? 15 : 18; k ? ctx.lineTo(wsx + Math.cos(a) * rr, wsy + Math.sin(a) * rr) : ctx.moveTo(wsx + Math.cos(a) * rr, wsy + Math.sin(a) * rr); }
    ctx.closePath(); ctx.fillStyle = ec ? '#6a0a10' : '#7a4a14'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    text(ctx, ec ? '◐' : '≋', wsx, wsy, 16, ec ? '#ff6a5a' : '#ffb04a', 'T', 'center', 2);
    text(ctx, txt('wt', Math.ceil(g.weather.t), (v) => v + 's'), wsx, wsy + 26, 10, '#e8dcc0', 'B', 'center', 2.5);
  }
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

  // ---------------- mano de cartas en ABANICO (naipes que se alzan al jugarse y entran girando al robarse)
  const size = touch ? 50 : 48, ch = Math.round(size * 1.6);
  const fanCx = touch ? W - (size * 1.9) - 10 : W / 2, fanBase = H - (touch ? 16 : 14);
  inp.buttons.length = 0; inp.buttons.push(BTN.pause);
  g.hudCards = HUDCARDS;
  const now = g.realTime;
  for (let i = 0; i < 3; i++) {
    const h = g.hand[i], F = FAN[i];
    // detectar robo (cambia la carta) y jugada (empieza la recarga)
    const id = h ? h.card.id : '';
    if (id !== F.id) { F.id = id; if (id) F.drawT = now; }
    const cdNow = h ? h.cd : 0;
    if (h && cdNow > F.cd + 0.01) F.playT = now;
    F.cd = cdNow;
    const ang = (i - 1) * 0.17, off = (i - 1) * (size * 0.86);
    const pd = Math.min(1, (now - F.playT) / 0.45), dd = Math.min(1, (now - F.drawT) / 0.4);
    const lift = pd < 1 ? Math.sin(pd * Math.PI) * 26 : 0, flip = dd < 1 ? Math.abs(Math.cos(dd * Math.PI * 0.5 + Math.PI * 0.5)) : 1;
    const hover = h && h.cd <= 0 ? 4 + Math.sin(t * 4 + i) * 1.5 : 0;
    const cx = fanCx + off, cy = fanBase - ch / 2 - Math.abs(i - 1) * 6 - lift - hover + (dd < 1 ? (1 - dd) * 60 : 0);
    const B = BTN['c' + i]; B.x = cx; B.y = cy; B.r = size * 0.66;
    if (touch) inp.buttons.push(B);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang + (pd < 1 ? Math.sin(pd * Math.PI) * 0.1 : 0)); ctx.scale(Math.max(0.05, flip), 1);
    // sombra dura desplazada
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(-size / 2 + 4, -ch / 2 + 5, size, ch);
    if (!h) {
      ctx.fillStyle = 'rgba(42,22,10,0.6)'; ctx.fillRect(-size / 2, -ch / 2, size, ch);
      ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(232,220,192,0.4)'; ctx.lineWidth = 2; ctx.strokeRect(-size / 2, -ch / 2, size, ch); ctx.setLineDash([]);
      text(ctx, '' + (i + 1), 0, 0, 15, 'rgba(232,220,192,0.4)', 'T', 'center', 0);
      ctx.restore(); continue;
    }
    ctx.drawImage(miniCard(h.card, size, dpr), -size / 2, -ch / 2, size, ch);
    if (h.cd > 0) {
      const k = h.cd / (h.card.cd * g.st.cardCd);
      ctx.fillStyle = 'rgba(10,6,5,0.68)'; ctx.fillRect(-size / 2, -ch / 2 + ch * (1 - k), size, ch * k);
      text(ctx, '' + Math.ceil(h.cd), 0, 0, 17, '#efe2c4', 'T', 'center', 3);
    } else {
      ctx.globalAlpha = 0.45 + Math.sin(t * 5 + i) * 0.25; ctx.strokeStyle = '#ffd27a'; ctx.lineWidth = 2.5; ctx.strokeRect(-size / 2 - 2, -ch / 2 - 2, size + 4, ch + 4); ctx.globalAlpha = 1;
    }
    if (pd < 1) { ctx.globalAlpha = 1 - pd; ctx.fillStyle = '#fff4d6'; ctx.fillRect(-size / 2, -ch / 2, size, ch); ctx.globalAlpha = 1; }
    if (!touch) { ctx.fillStyle = '#120a06'; ctx.fillRect(-9, -ch / 2 - 12, 18, 16); text(ctx, '' + (i + 1), 0, -ch / 2 - 4, 11, '#f2e2b8', 'T', 'center', 0); }
    ctx.restore();
  }

  // ---------------- mano de póker de tinta (5 naipes) + contador discreto de la jugada en curso
  const pw3 = touch ? 30 : 34, phh = pw3 * 1.4, px0 = 14, py0 = H - phh - (touch ? 14 : 16);
  const ppw = 5 * (pw3 + 5) + (touch ? 12 : 84);
  ctx.drawImage(plate(ppw, phh + 30, dpr, 'leather'), px0 - 8, py0 - 22, ppw, phh + 30);
  text(ctx, touch ? 'PÓKER' : 'PÓKER DE TINTA', px0, py0 - 12, 10, '#e8dcc0', 'T', 'left', 2.5);
  const show = g.pokerShow, hand = show ? show.hand : g.poker;
  for (let i = 0; i < 5; i++) {
    const x = px0 + i * (pw3 + 5);
    if (hand[i]) ctx.drawImage(pokerFace(hand[i], pw3, dpr), x, py0 - (show ? Math.sin(Math.min(1, (2.2 - show.t) * 4) * Math.PI) * 8 : 0), pw3, phh);
    else { ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(232,220,192,0.3)'; ctx.lineWidth = 1.5; ctx.strokeRect(x, py0, pw3, phh); ctx.setLineDash([]); }
  }
  const pxEnd = px0 + 5 * (pw3 + 5) + 8;
  if (show) text(ctx, show.combo ? '¡' + FURIES[show.combo].name.toUpperCase() + '!' : 'Carta alta', pxEnd, py0 + phh / 2, 11, show.combo ? FURIES[show.combo].color : '#a89a82', 'T', 'left', 3);
  else if (touch) {
    // móvil: la jugada parcial va en la cabecera de la placa para no invadir el abanico de cartas
    const part = g.pokerPartial ? FURIES[g.pokerPartial].name.toUpperCase() : '';
    if (part) text(ctx, part, px0 + 5 * (pw3 + 5) - 6, py0 - 12, 10, FURIES[g.pokerPartial].color, 'T', 'right', 2.5);
    const ck = g.killChain % 8;
    for (let k = 0; k < 8; k++) { ctx.fillStyle = k < ck ? '#c41a12' : 'rgba(232,220,192,0.18)'; ctx.fillRect(px0 + k * 5, py0 + phh + 2, 3, 3); }
  } else {
    // jugada parcial y racha de bajas hacia el próximo naipe
    const part = g.pokerPartial ? FURIES[g.pokerPartial].name.toUpperCase() : '—';
    text(ctx, 'MANO', pxEnd, py0 + 8, 9, '#a89a82', 'B', 'left', 2);
    text(ctx, part, pxEnd, py0 + 22, 12, g.pokerPartial ? FURIES[g.pokerPartial].color : '#6a5a4a', 'T', 'left', 2.5);
    const ck = g.killChain % 8;
    for (let k = 0; k < 8; k++) { ctx.fillStyle = k < ck ? '#c41a12' : 'rgba(232,220,192,0.18)'; ctx.fillRect(pxEnd + k * 6, py0 + 32, 4, 6); }
  }

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
    ctx.globalAlpha = Math.max(0, 0.6 - g.time / 10); text(ctx, 'Arrastra para moverte', W / 2, H * 0.72, 14, '#e8dcc0', 'B', 'center', 3); ctx.globalAlpha = 1;
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
  // Aviso rojo discreto: cinta compacta y translúcida en el lateral superior derecho (nunca en el centro)
  const bn = g.banner;
  if (bn) {
    const k = bn.t / bn.max, a = Math.max(0, Math.min(1, (1 - k) * 7, k * 5));
    const slide = (1 - Math.min(1, (1 - k) * 7)) * 36;
    ctx.font = f(small ? 12 : 14, 'T');
    const tw = ctx.measureText(bn.title).width;
    ctx.font = f(small ? 9 : 10, 'B');
    const sw = bn.sub ? ctx.measureText(bn.sub).width : 0;
    const bw = Math.min(W - 24, Math.max(tw, sw) + 44), bh = bn.sub ? (small ? 38 : 42) : (small ? 24 : 28);
    const bx = W - 12 - bw + slide, by = small ? 206 : 56 + Math.round((small ? 96 : 150) * HY / HX) + 18;
    ctx.globalAlpha = a * 0.82;
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + 12, by + bh / 2); ctx.closePath();
    ctx.fillStyle = '#7a0c08'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke();
    ctx.globalAlpha = a * 0.6; ctx.strokeStyle = '#efe2c4'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx + 6, by + 3); ctx.lineTo(bx + bw - 3, by + 3); ctx.lineTo(bx + bw - 3, by + bh - 3); ctx.lineTo(bx + 6, by + bh - 3); ctx.lineTo(bx + 16, by + bh / 2); ctx.closePath(); ctx.stroke();
    ctx.globalAlpha = a;
    text(ctx, bn.title, bx + 24, by + (bn.sub ? 14 : bh / 2), small ? 12 : 14, '#f2e2b8', 'T', 'left', 2.5);
    if (bn.sub) text(ctx, bn.sub, bx + 24, by + bh - (small ? 10 : 11), small ? 9 : 10, '#e8c8a8', 'B', 'left', 0);
    ctx.globalAlpha = 1;
  }
}
