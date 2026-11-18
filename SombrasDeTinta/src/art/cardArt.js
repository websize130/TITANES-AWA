// Cartas en formato TAROT vertical (1 : 1,75) con estética de cómic noir de los 90.
// Bordes de tinta irregular a plumilla y materia por rareza:
//   Bronce   → pergamino oscuro y esquinas de hierro oxidado
//   Plata    → acero con tramas de semitono
//   Oro      → latón con filigranas grabadas
//   Platino  → platino oscuro con barridos de luz cinematográficos
//   Diamante → tinta negra absoluta, grabado de plancha de cobre y destellos ámbar/naranja
import { INK, TAU, makeCanvas, makeRng, rgba, inkText, wrapText, FT, FB } from './ink.js';
import { RARITY, CARDS } from '../data/cards.js';
import { RANKS, SUITS, RED } from '../data/poker.js';

export const TAROT = 1.75;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

// Contorno a plumilla: varias pasadas temblorosas de grosor variable.
function penBorder(ctx, x, y, w, h, r, seed, lw, color = INK) {
  const rnd = makeRng(seed);
  const pts = [];
  const step = 5;
  const add = (px, py) => pts.push(px, py);
  for (let i = 0; i <= w - 2 * r; i += step) add(x + r + i, y);
  for (let a = -Math.PI / 2; a <= 0; a += 0.3) add(x + w - r + Math.cos(a) * r, y + r + Math.sin(a) * r);
  for (let i = 0; i <= h - 2 * r; i += step) add(x + w, y + r + i);
  for (let a = 0; a <= Math.PI / 2; a += 0.3) add(x + w - r + Math.cos(a) * r, y + h - r + Math.sin(a) * r);
  for (let i = 0; i <= w - 2 * r; i += step) add(x + w - r - i, y + h);
  for (let a = Math.PI / 2; a <= Math.PI; a += 0.3) add(x + r + Math.cos(a) * r, y + h - r + Math.sin(a) * r);
  for (let i = 0; i <= h - 2 * r; i += step) add(x, y + h - r - i);
  for (let a = Math.PI; a <= Math.PI * 1.5; a += 0.3) add(x + r + Math.cos(a) * r, y + r + Math.sin(a) * r);
  ctx.strokeStyle = color; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  for (let pass = 0; pass < 3; pass++) {
    ctx.lineWidth = lw * (pass === 0 ? 1 : 0.45);
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += 2) {
      const j = (rnd() - 0.5) * (pass === 0 ? 1.2 : 2.4);
      if (i === 0) ctx.moveTo(pts[i] + j, pts[i + 1] + j); else ctx.lineTo(pts[i] + j, pts[i + 1] - j);
    }
    ctx.closePath(); ctx.stroke();
  }
  // salpicaduras de plumilla
  ctx.fillStyle = color;
  for (let i = 0; i < 6; i++) { const k = (rnd() * (pts.length / 2)) | 0; ctx.beginPath(); ctx.arc(pts[k * 2] + (rnd() - 0.5) * 6, pts[k * 2 + 1] + (rnd() - 0.5) * 6, rnd() * 1.6 + 0.4, 0, TAU); ctx.fill(); }
}

function archPath(ctx, x, y, w, h) {
  const r = w / 2;
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x, y + r); ctx.arc(x + r, y + r, r, Math.PI, 0); ctx.lineTo(x + w, y + h); ctx.closePath();
}

function spiral(ctx, cx, cy, r, dir, turns = 1.6) {
  ctx.beginPath();
  for (let a = 0; a < TAU * turns; a += 0.15) { const k = r * (1 - a / (TAU * turns)); const px = cx + Math.cos(a * dir) * k, py = cy + Math.sin(a * dir) * k; a === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py); }
  ctx.stroke();
}

function material(ctx, W, H, rar, rnd, t) {
  const g = ctx.createLinearGradient(0, 0, W, H);
  switch (rar) {
    case 0: { // pergamino oscuro
      g.addColorStop(0, '#5a4228'); g.addColorStop(0.5, '#3e2c1a'); g.addColorStop(1, '#2a1c10');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 14; i++) { const x = rnd() * W, y = rnd() * H, r = 8 + rnd() * 30; const sg = ctx.createRadialGradient(x, y, 0, x, y, r); sg.addColorStop(0, 'rgba(20,10,4,0.35)'); sg.addColorStop(1, 'rgba(20,10,4,0)'); ctx.fillStyle = sg; ctx.fillRect(x - r, y - r, r * 2, r * 2); }
      ctx.strokeStyle = 'rgba(230,200,150,0.08)'; ctx.lineWidth = 0.7; ctx.beginPath();
      for (let i = 0; i < 40; i++) { const x = rnd() * W, y = rnd() * H; ctx.moveTo(x, y); ctx.lineTo(x + (rnd() - 0.5) * 20, y + (rnd() - 0.5) * 4); } ctx.stroke();
      break;
    }
    case 1: { // acero con semitono
      g.addColorStop(0, '#b8bcc2'); g.addColorStop(0.45, '#6a6e74'); g.addColorStop(0.7, '#a0a4aa'); g.addColorStop(1, '#3e4248');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(10,12,16,0.35)';
      for (let y = 0; y < H; y += 5) for (let x = ((y / 5) % 2) * 2.5; x < W; x += 5) { const r = 0.4 + (x / W) * 1.3; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
      break;
    }
    case 2: { // latón grabado
      g.addColorStop(0, '#d8a848'); g.addColorStop(0.35, '#8a5e18'); g.addColorStop(0.65, '#c89a3a'); g.addColorStop(1, '#5a3a0a');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = 'rgba(60,30,4,0.35)'; ctx.lineWidth = 0.8; ctx.beginPath();
      for (let i = -H; i < W; i += 4) { ctx.moveTo(i, 0); ctx.lineTo(i + H, H); } ctx.stroke();
      break;
    }
    case 3: { // platino oscuro
      g.addColorStop(0, '#8a94a8'); g.addColorStop(0.35, '#2e3440'); g.addColorStop(0.6, '#6a7488'); g.addColorStop(1, '#14181e');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(200,220,255,0.06)'; for (let i = 0; i < 5; i++) { ctx.save(); ctx.translate(rnd() * W, 0); ctx.rotate(0.5); ctx.fillRect(0, -H, 6 + rnd() * 18, H * 3); ctx.restore(); }
      break;
    }
    default: { // tinta negra absoluta + grabado de plancha de cobre
      ctx.fillStyle = '#030203'; ctx.fillRect(0, 0, W, H);
      ctx.lineWidth = 0.7;
      for (let y = 2; y < H; y += 2.4) {
        const d = Math.abs(y - H * 0.38) / H;
        ctx.strokeStyle = `rgba(184,104,48,${(0.06 + d * 0.32).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(0, y);
        for (let x = 0; x <= W; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.08 + y * 0.05) * 0.8);
        ctx.stroke();
      }
    }
  }
}

function frameBand(ctx, W, H, rar, rnd, m) {
  if (rar === 0) { // esquinas de hierro oxidado con remaches
    for (const [cx, cy, sx, sy] of [[0, 0, 1, 1], [W, 0, -1, 1], [0, H, 1, -1], [W, H, -1, -1]]) {
      ctx.fillStyle = '#4a3a30'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + sx * W * 0.22, cy); ctx.lineTo(cx, cy + sy * W * 0.22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(170,80,30,0.55)'; for (let i = 0; i < 18; i++) ctx.fillRect(cx + sx * rnd() * W * 0.14, cy + sy * rnd() * W * 0.14, 1.5 + rnd() * 2, 1.5);
      ctx.fillStyle = '#8a7a6a'; ctx.beginPath(); ctx.arc(cx + sx * W * 0.06, cy + sy * W * 0.06, W * 0.018, 0, TAU); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1; ctx.stroke();
    }
  }
  if (rar === 1) { ctx.strokeStyle = 'rgba(20,22,26,0.7)'; ctx.lineWidth = 1; rr(ctx, m * 0.45, m * 0.45, W - m * 0.9, H - m * 0.9, W * 0.05); ctx.stroke(); rr(ctx, m * 0.6, m * 0.6, W - m * 1.2, H - m * 1.2, W * 0.045); ctx.stroke(); }
  if (rar === 2) { // filigranas grabadas en las esquinas
    ctx.strokeStyle = 'rgba(50,24,2,0.8)'; ctx.lineWidth = 1.2;
    for (const [cx, cy, d] of [[m * 1.4, m * 1.4, 1], [W - m * 1.4, m * 1.4, -1], [m * 1.4, H - m * 1.4, -1], [W - m * 1.4, H - m * 1.4, 1]]) { spiral(ctx, cx, cy, W * 0.07, d); spiral(ctx, cx + d * W * 0.08, cy, W * 0.035, -d, 1.2); }
    ctx.strokeStyle = 'rgba(255,230,160,0.35)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); for (let x = m * 2.6; x < W - m * 2.6; x += 9) { ctx.moveTo(x, m * 0.5); ctx.quadraticCurveTo(x + 4.5, m * 0.1, x + 9, m * 0.5); ctx.moveTo(x, H - m * 0.5); ctx.quadraticCurveTo(x + 4.5, H - m * 0.1, x + 9, H - m * 0.5); } ctx.stroke();
  }
}

function toRoman(n) {
  if (n <= 0) return '0';
  const v = [[40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = '';
  for (const [k, r] of v) while (n >= k) { s += r; n -= k; }
  return s;
}

function glints(ctx, W, H, t, rnd, color, n) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const x = rnd() * W, y = rnd() * H, ph = rnd() * TAU, k = Math.max(0, Math.sin(t * 2.2 + ph));
    if (k < 0.2) continue;
    const s = (2 + rnd() * 4) * k;
    ctx.strokeStyle = rgba(color, 0.9 * k); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x - s * 2, y); ctx.lineTo(x + s * 2, y); ctx.moveTo(x, y - s * 2); ctx.lineTo(x, y + s * 2); ctx.stroke();
    ctx.fillStyle = rgba('#fff2c8', 0.8 * k); ctx.beginPath(); ctx.arc(x, y, s * 0.4, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// Carta completa (sorteo, dossier). W×H en px CSS (ctx ya escalado). H ≈ W·1,75.
export function drawCard(ctx, card, W, H, t = 0, extra = '') {
  const R = RARITY[card.r], rnd = makeRng(card.id.length * 131 + card.r * 7), m = W * 0.065;
  ctx.save();
  rr(ctx, 0, 0, W, H, W * 0.06); ctx.clip();
  material(ctx, W, H, card.r, rnd, t);
  frameBand(ctx, W, H, card.r, rnd, m);
  ctx.restore();
  // numeral de arcano
  const idx = CARDS.indexOf(card);
  const numeral = idx < 0 ? '0' : toRoman(idx + 1);
  const darkText = card.r === 1 || card.r === 2;
  ctx.fillStyle = card.r === 4 ? '#1a0c06' : darkText ? 'rgba(20,12,4,0.85)' : 'rgba(8,5,3,0.75)';
  rr(ctx, W / 2 - W * 0.14, m * 0.55, W * 0.28, W * 0.12, 4); ctx.fill();
  inkText(ctx, numeral, W / 2, m * 0.55 + W * 0.062, W * 0.075, card.r === 4 ? '#ff9a3a' : R.text, FT, 0);
  // ventana en arco con la ilustración
  const ax = m * 1.3, ay = m + W * 0.13, aw = W - m * 2.6, ah = H * 0.43;
  ctx.save();
  archPath(ctx, ax, ay, aw, ah); ctx.clip();
  const ig = ctx.createLinearGradient(0, ay, 0, ay + ah);
  ig.addColorStop(0, card.r === 4 ? '#0a0504' : '#1a120c'); ig.addColorStop(1, '#060403');
  ctx.fillStyle = ig; ctx.fillRect(ax, ay, aw, ah);
  const cx = ax + aw / 2, cy = ay + ah * 0.56;
  ctx.strokeStyle = rgba(R.glow, card.r === 4 ? 0.4 : 0.22); ctx.lineWidth = 1;
  ctx.beginPath();
  if (card.t === 'action') for (let a = 0; a < TAU; a += TAU / 36) { ctx.moveTo(cx + Math.cos(a) * aw * 0.2, cy + Math.sin(a) * aw * 0.2); ctx.lineTo(cx + Math.cos(a) * aw, cy + Math.sin(a) * aw); }
  else for (let r = aw * 0.22; r < aw; r += 5) { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, TAU); }
  ctx.stroke();
  // trama de semitono en el fondo de la ilustración
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  for (let y = ay; y < ay + ah; y += 5) for (let x = ax + ((y / 5) % 2) * 2.5; x < ax + aw; x += 5) { const d = Math.hypot(x - cx, y - cy) / aw; if (d > 0.3) { ctx.beginPath(); ctx.arc(x, y, Math.min(2, (d - 0.3) * 4), 0, TAU); ctx.fill(); } }
  const cr = aw * 0.27;
  const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, cr * 1.8);
  halo.addColorStop(0, rgba(R.glow, card.r >= 2 ? 0.45 : 0.25)); halo.addColorStop(1, rgba(R.glow, 0));
  ctx.fillStyle = halo; ctx.fillRect(ax, ay, aw, ah);
  ctx.beginPath(); ctx.arc(cx, cy, cr, 0, TAU); ctx.fillStyle = '#120a06'; ctx.fill();
  ctx.font = `${Math.round(cr * 1.15)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(card.icon, cx, cy + 2);
  ctx.restore();
  ctx.save(); archPath(ctx, ax, ay, aw, ah); ctx.lineWidth = 2.5; ctx.strokeStyle = card.r === 4 ? '#b86830' : INK; ctx.stroke(); ctx.restore();
  // cinta con el nombre
  const by = ay + ah - H * 0.02, bh = H * 0.075;
  ctx.fillStyle = card.r === 4 ? '#140806' : '#e8dcc0';
  ctx.beginPath(); ctx.moveTo(m * 0.4, by); ctx.lineTo(W - m * 0.4, by); ctx.lineTo(W - m * 1.2, by + bh / 2); ctx.lineTo(W - m * 0.4, by + bh); ctx.lineTo(m * 0.4, by + bh); ctx.lineTo(m * 1.2, by + bh / 2); ctx.closePath();
  ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = card.r === 4 ? '#b86830' : INK; ctx.stroke();
  let fs = W * 0.072;
  ctx.font = `${fs}px "${FT}", Georgia, serif`;
  const tw = ctx.measureText(card.name.toUpperCase()).width;
  if (tw > W - m * 3.4) fs *= (W - m * 3.4) / tw;
  inkText(ctx, card.name.toUpperCase(), W / 2, by + bh / 2 + 1, fs, card.r === 4 ? '#ffb347' : '#1a0e06', FT, 0);
  // tipo y etiquetas
  const tags = (card.t === 'action' ? `ACCIÓN · ${card.cd}s` : 'PASIVA') + (card.range ? ' · LARGO ALCANCE' : card.mod ? ' · MOD. DE ARMA' : '');
  inkText(ctx, tags, W / 2, by + bh + H * 0.03, W * 0.048, card.r === 4 ? '#ff9a3a' : darkText ? '#1a0e06' : '#ffcf6a', FB, 0);
  // texto en papeleta
  const py = by + bh + H * 0.055, ph = H - py - m * 1.6;
  ctx.fillStyle = card.r === 4 ? 'rgba(20,8,4,0.85)' : 'rgba(240,228,200,0.92)';
  rr(ctx, m * 0.9, py, W - m * 1.8, ph, 3); ctx.fill();
  ctx.lineWidth = 1.2; ctx.strokeStyle = card.r === 4 ? '#6a3a1a' : 'rgba(10,6,4,0.7)'; ctx.stroke();
  ctx.font = `bold ${Math.round(W * 0.058)}px "${FB}", "Courier New", monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  let y = py + W * 0.035; const lh = W * 0.066;
  ctx.fillStyle = card.r === 4 ? '#f2e2c8' : '#1a0e06';
  for (const l of wrapText(ctx, card.desc, W - m * 2.8)) { ctx.fillText(l, W / 2, y); y += lh; }
  if (card.curse) { ctx.fillStyle = card.r === 4 ? '#ff6a3a' : '#9a140e'; for (const l of wrapText(ctx, card.curse.text, W - m * 2.8)) { ctx.fillText(l, W / 2, y); y += lh; } }
  if (extra) { ctx.fillStyle = card.r === 4 ? '#ffd27a' : '#2a4a7a'; for (const l of wrapText(ctx, extra, W - m * 2.8)) { ctx.fillText(l, W / 2, y); y += lh; } }
  // rareza
  inkText(ctx, '◆ ' + R.name.toUpperCase() + ' ◆', W / 2, H - m * 0.85, W * 0.05, card.r === 4 ? '#ff9a3a' : darkText ? '#1a0e06' : R.text, FB, 0);
  // brillo cinematográfico y destellos
  if (card.r >= 3) {
    const sx = ((t * 0.45) % 1.6 - 0.3) * W;
    const sg = ctx.createLinearGradient(sx - 30, 0, sx + 30, H);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, card.r === 4 ? 'rgba(255,170,80,0.16)' : 'rgba(220,235,255,0.18)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = sg; rr(ctx, 0, 0, W, H, W * 0.06); ctx.fill(); ctx.restore();
  }
  if (card.r === 4) glints(ctx, W, H, t, makeRng(card.id.length * 3 + 1), '#ff9a3a', 14);
  if (card.r === 2) glints(ctx, W, H, t, makeRng(card.id.length * 5 + 2), '#ffe08a', 4);
  penBorder(ctx, 1.5, 1.5, W - 3, H - 3, W * 0.06, card.id.length * 17 + card.r, W * 0.022, card.r === 4 ? '#000' : INK);
}

// Miniatura de tarot para el HUD (mano de habilidad). Cacheada por carta y tamaño.
const mini = new Map();
export function miniCard(card, size, dpr) {
  const key = card.id + size + dpr;
  let c = mini.get(key);
  if (c) return c;
  const W = size, H = Math.round(size * 1.6);
  c = makeCanvas(W * dpr, H * dpr);
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  const rnd = makeRng(card.id.length * 131);
  ctx.save(); rr(ctx, 0, 0, W, H, W * 0.08); ctx.clip(); material(ctx, W, H, card.r, rnd, 0); ctx.restore();
  const m = W * 0.1;
  ctx.save(); archPath(ctx, m, m, W - m * 2, H * 0.7); ctx.fillStyle = card.r === 4 ? '#050302' : '#140c08'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = card.r === 4 ? '#b86830' : INK; ctx.stroke(); ctx.restore();
  ctx.font = `${Math.round(W * 0.48)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(card.icon, W / 2, m + H * 0.4);
  ctx.font = `bold ${Math.round(W * 0.14)}px "${FB}", monospace`; ctx.fillStyle = card.r === 4 ? '#ff9a3a' : card.r === 1 || card.r === 2 ? '#1a0e06' : RARITY[card.r].text;
  ctx.fillText(card.name.split(' ')[0].slice(0, 9), W / 2, H - m * 1.2);
  penBorder(ctx, 1, 1, W - 2, H - 2, W * 0.08, card.id.length * 5, 2.2);
  mini.set(key, c);
  return c;
}

// Naipe de tinta (póker) para el HUD.
const faces = new Map();
export function pokerFace(c, w, dpr) {
  const key = c.r * 10 + c.s + '|' + w + dpr;
  let cv = faces.get(key);
  if (cv) return cv;
  const h = Math.round(w * 1.4);
  cv = makeCanvas(w * dpr, h * dpr);
  const x = cv.getContext('2d'); x.scale(dpr, dpr);
  x.fillStyle = '#efe2c4'; rr(x, 0, 0, w, h, 4); x.fill();
  x.fillStyle = 'rgba(120,80,30,0.12)'; for (let i = 0; i < 20; i++) x.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
  const col = RED[c.s] ? '#9a140e' : '#120a06';
  x.fillStyle = col; x.textAlign = 'left'; x.textBaseline = 'top';
  x.font = `${Math.round(w * 0.36)}px "${FT}", Georgia, serif`; x.fillText(RANKS[c.r], w * 0.1, h * 0.05);
  x.font = `${Math.round(w * 0.55)}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(SUITS[c.s], w / 2, h * 0.6);
  penBorder(x, 1, 1, w - 2, h - 2, 4, c.r * 7 + c.s, 1.8);
  faces.set(key, cv);
  return cv;
}
