// Cartas de habilidad con marcos por rareza: hierro oxidado, plata envejecida, oro oscuro con ámbar,
// platino oscuro cinemático y cristal tallado oscuro (diamante).
import { INK, makeCanvas, makeRng, rgba, shade, inkText, wrapText, FT, FB, TAU } from './ink.js';
import { RARITY } from '../data/cards.js';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function frame(ctx, W, H, rar, seed) {
  const R = RARITY[rar], r = makeRng(seed);
  const g = ctx.createLinearGradient(0, 0, W, H);
  switch (rar) {
    case 0: g.addColorStop(0, '#8a5232'); g.addColorStop(0.5, '#5a3218'); g.addColorStop(1, '#3a1e0e'); break;
    case 1: g.addColorStop(0, '#d8d8d0'); g.addColorStop(0.45, '#8a8a84'); g.addColorStop(0.7, '#c0c0b8'); g.addColorStop(1, '#5a5a56'); break;
    case 2: g.addColorStop(0, '#e8b84a'); g.addColorStop(0.4, '#8a5a12'); g.addColorStop(0.7, '#d0a03a'); g.addColorStop(1, '#4a2e06'); break;
    case 3: g.addColorStop(0, '#c8d4e4'); g.addColorStop(0.35, '#4a5468'); g.addColorStop(0.6, '#a8b4c8'); g.addColorStop(1, '#1e2430'); break;
    default: g.addColorStop(0, '#6a4a9a'); g.addColorStop(0.3, '#1e1236'); g.addColorStop(0.55, '#5a8ab0'); g.addColorStop(0.8, '#2a1640'); g.addColorStop(1, '#0a0614');
  }
  ctx.fillStyle = g; rr(ctx, 0, 0, W, H, W * 0.07); ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  if (rar === 0) { // óxido y remaches
    for (let i = 0; i < 120; i++) { ctx.fillStyle = r() < 0.5 ? 'rgba(160,70,20,0.45)' : 'rgba(20,10,4,0.4)'; ctx.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 2); }
    ctx.fillStyle = '#3a2416'; for (const [x, y] of [[0.08, 0.06], [0.92, 0.06], [0.08, 0.94], [0.92, 0.94]]) { ctx.beginPath(); ctx.arc(x * W, y * H, W * 0.025, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  if (rar === 1) { ctx.strokeStyle = 'rgba(40,40,36,0.6)'; ctx.lineWidth = 1; rr(ctx, W * 0.035, W * 0.035, W - W * 0.07, H - W * 0.07, W * 0.05); ctx.stroke(); }
  if (rar === 4) { // facetas de cristal
    ctx.save(); rr(ctx, 0, 0, W, H, W * 0.07); ctx.clip();
    for (let i = 0; i < 14; i++) {
      ctx.fillStyle = `rgba(${150 + r() * 100 | 0},${120 + r() * 120 | 0},255,${0.06 + r() * 0.12})`;
      ctx.beginPath(); ctx.moveTo(r() * W, r() * H); ctx.lineTo(r() * W, r() * H); ctx.lineTo(r() * W, r() * H); ctx.fill();
    }
    ctx.restore();
  }
  // ventana interior oscura
  const m = W * 0.07;
  ctx.fillStyle = '#120c08'; rr(ctx, m, m, W - m * 2, H - m * 2, W * 0.04); ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = R.glow; ctx.globalAlpha = rar >= 2 ? 0.9 : 0.5; ctx.stroke(); ctx.globalAlpha = 1;
  if (rar >= 2) { // brillo ámbar/cinemático interior
    const ig = ctx.createRadialGradient(W / 2, H * 0.32, 0, W / 2, H * 0.32, W * 0.6);
    ig.addColorStop(0, rgba(R.glow, rar === 4 ? 0.35 : 0.22)); ig.addColorStop(1, rgba(R.glow, 0));
    ctx.fillStyle = ig; ctx.fillRect(m, m, W - m * 2, H - m * 2);
  }
  // semitono en el fondo de la ventana
  ctx.save(); rr(ctx, m, m, W - m * 2, H - m * 2, W * 0.04); ctx.clip();
  ctx.fillStyle = 'rgba(255,240,200,0.04)';
  for (let y = m; y < H - m; y += 5) for (let x = m + ((y / 5) % 2) * 2.5; x < W - m; x += 5) { ctx.beginPath(); ctx.arc(x, y, 1, 0, TAU); ctx.fill(); }
  ctx.restore();
  return m;
}

// Dibuja una carta completa (sorteo, dossier). W×H en px de CSS (ctx ya escalado).
export function drawCard(ctx, card, W, H, t = 0, extra = '') {
  const R = RARITY[card.r];
  const m = frame(ctx, W, H, card.r, card.id.length * 7 + card.r);
  // nombre
  ctx.font = `${Math.round(W * 0.075)}px "${FT}", Georgia, serif`;
  let fs = W * 0.075; const tw = ctx.measureText(card.name).width;
  if (tw > W - m * 3) fs *= (W - m * 3) / tw;
  inkText(ctx, card.name, W / 2, m + H * 0.07, fs, R.text, FT, 3);
  // medallón con icono
  const cy = m + H * 0.27, cr = W * 0.19;
  ctx.beginPath(); ctx.arc(W / 2, cy, cr, 0, TAU); ctx.fillStyle = '#1e140c'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = R.frame; ctx.stroke(); ctx.lineWidth = 1.5; ctx.strokeStyle = INK; ctx.stroke();
  if (card.r >= 3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 + Math.sin(t * 3) * 0.15; ctx.fillStyle = R.glow; ctx.beginPath(); ctx.arc(W / 2, cy, cr * 1.15, 0, TAU); ctx.fill(); ctx.restore(); }
  ctx.font = `${Math.round(cr * 1.1)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff'; ctx.fillText(card.icon, W / 2, cy + 2);
  // tipo
  const type = card.t === 'action' ? `ACCIÓN · ${card.cd}s` : 'PASIVA';
  inkText(ctx, type, W / 2, cy + cr + H * 0.045, W * 0.052, card.t === 'action' ? '#ffcf6a' : '#c8b898', FB, 0);
  // descripción
  ctx.font = `bold ${Math.round(W * 0.064)}px "${FB}", "Courier New", monospace`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = '#e8dcc0';
  let y = cy + cr + H * 0.085;
  const lh = W * 0.075;
  for (const l of wrapText(ctx, card.desc, W - m * 2.6)) { ctx.fillText(l, W / 2, y); y += lh; }
  if (card.curse) {
    y += lh * 0.3; ctx.fillStyle = '#ff6a5a';
    for (const l of wrapText(ctx, card.curse.text, W - m * 2.6)) { ctx.fillText(l, W / 2, y); y += lh; }
  }
  if (extra) { y += lh * 0.3; ctx.fillStyle = '#a8c8ff'; for (const l of wrapText(ctx, extra, W - m * 2.6)) { ctx.fillText(l, W / 2, y); y += lh; } }
  // rareza
  inkText(ctx, R.name.toUpperCase() + ' · ' + R.label, W / 2, H - m - H * 0.035, W * 0.05, R.text, FB, 0);
  // destello cinemático (platino/diamante)
  if (card.r >= 3) {
    const sx = ((t * 0.5) % 1.6 - 0.3) * W;
    const sg = ctx.createLinearGradient(sx - 30, 0, sx + 30, H);
    sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.18)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = sg; rr(ctx, 0, 0, W, H, W * 0.07); ctx.fill(); ctx.restore();
  }
}

// Miniatura para el HUD (mano de cartas). Se cachea por carta.
const mini = new Map();
export function miniCard(card, size, dpr) {
  const key = card.id + size + dpr;
  let c = mini.get(key);
  if (c) return c;
  const W = size, H = size * 1.35;
  c = makeCanvas(W * dpr, H * dpr);
  const ctx = c.getContext('2d'); ctx.scale(dpr, dpr);
  const m = frame(ctx, W, H, card.r, card.id.length * 7 + card.r);
  ctx.font = `${Math.round(W * 0.46)}px serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff';
  ctx.fillText(card.icon, W / 2, H * 0.45);
  ctx.font = `bold ${Math.round(W * 0.13)}px "${FB}", monospace`; ctx.fillStyle = RARITY[card.r].text;
  ctx.fillText(card.name.split(' ')[0].slice(0, 9), W / 2, H - m - W * 0.1);
  mini.set(key, c);
  return c;
}
