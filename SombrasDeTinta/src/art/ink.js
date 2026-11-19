// Primitivas de tinta (cómic de terror noventero): contornos gruesos, sombreado lateral, mugre,
// semitono, sombreado cruzado y sellos. Lo costoso se usa al pre-renderizar, nunca por entidad y frame.

export const INK = '#0b0705';
export const TAU = Math.PI * 2;

export function makeRng(seed) {
  let s = (seed | 0) || 0x9e3779b9;
  return () => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

export function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function shade(h, amt) {
  const [r, g, b] = hexToRgb(h);
  const f = amt < 0 ? (c) => Math.round(c * (1 + amt)) : (c) => Math.round(c + (255 - c) * amt);
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}

export function rgba(h, a) {
  const [r, g, b] = hexToRgb(h);
  return `rgba(${r},${g},${b},${a})`;
}

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

// ---------------------------------------------------------------- paths
export function path(ctx, pts, close = true) {
  ctx.beginPath();
  ctx.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
  if (close) ctx.closePath();
}

// Curva suave cerrada que pasa por los puntos medios (aspecto orgánico).
export function smoothPath(ctx, pts) {
  const n = pts.length / 2;
  ctx.beginPath();
  const mx = (pts[0] + pts[(n - 1) * 2]) / 2, my = (pts[1] + pts[(n - 1) * 2 + 1]) / 2;
  ctx.moveTo(mx, my);
  for (let i = 0; i < n; i++) {
    const x = pts[i * 2], y = pts[i * 2 + 1];
    const j = ((i + 1) % n) * 2;
    ctx.quadraticCurveTo(x, y, (x + pts[j]) / 2, (y + pts[j + 1]) / 2);
  }
  ctx.closePath();
}

export function inkFill(ctx, fill, lw = 3) {
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (lw > 0) {
    ctx.lineWidth = lw; ctx.strokeStyle = INK;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    if (pts[i] < x0) x0 = pts[i]; if (pts[i] > x1) x1 = pts[i];
    if (pts[i + 1] < y0) y0 = pts[i + 1]; if (pts[i + 1] > y1) y1 = pts[i + 1];
  }
  return [x0, y0, x1, y1];
}

// Estado de detalle compartido durante un dibujo (semilla para motas deterministas).
export const Art = { detail: 1, rnd: makeRng(1) };
export function beginArt(seed, detail) { Art.rnd = makeRng(seed); Art.detail = detail; }

// Sombreado lateral + mugre moteada dentro del último path (clip).
export function grime(ctx, pts, smooth = false, amount = 1) {
  const [x0, y0, x1, y1] = bbox(pts);
  const w = x1 - x0, h = y1 - y0;
  ctx.save();
  if (smooth) smoothPath(ctx, pts); else path(ctx, pts);
  ctx.clip();
  // sombra ANGULAR de alto contraste (noir): corte diagonal duro en el lado opuesto a la luz
  ctx.fillStyle = 'rgba(6,3,2,0.46)';
  ctx.beginPath(); ctx.moveTo(x0 + w * 0.62, y0 - 1); ctx.lineTo(x1 + 1, y0 - 1); ctx.lineTo(x1 + 1, y1 + 1); ctx.lineTo(x0 + w * 0.34, y1 + 1); ctx.closePath(); ctx.fill();
  // trama de semitono sobre la línea de corte (paso de luz a sombra)
  if (w > 10 && h > 10) {
    ctx.fillStyle = 'rgba(6,3,2,0.5)';
    const step = Math.max(2.4, Math.min(w, h) / 9);
    for (let yy = y0; yy < y1; yy += step) {
      const k = (yy - y0) / h, cx = x0 + w * (0.62 - 0.28 * k);
      for (let i = 1; i <= 3; i++) { ctx.beginPath(); ctx.arc(cx - i * step, yy + (i % 2) * step * 0.5, step * (0.42 - i * 0.11), 0, TAU); ctx.fill(); }
    }
  }
  if (Art.detail > 0) {
    const r = Art.rnd;
    const n = Math.min(160, (w * h) / 55 * amount * Art.detail) | 0;
    ctx.fillStyle = 'rgba(11,7,5,0.55)';
    for (let i = 0; i < n; i++) {
      const s = 0.5 + r() * 1.4;
      ctx.fillRect(x0 + r() * w, y0 + r() * h, s, s * (0.6 + r()));
    }
    // brillo sucio en el lado iluminado
    ctx.fillStyle = 'rgba(255,230,190,0.10)';
    for (let i = 0; i < n / 4; i++) {
      ctx.fillRect(x0 + r() * w * 0.5, y0 + r() * h, 1.2, 1.2);
    }
  }
  ctx.restore();
}

export function poly(ctx, pts, fill, lw = 3, dirt = 1) {
  path(ctx, pts);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (dirt > 0) grime(ctx, pts, false, dirt);
  if (lw > 0) { path(ctx, pts); inkFill(ctx, null, lw); }
}

export function blob(ctx, pts, fill, lw = 3, dirt = 1) {
  smoothPath(ctx, pts);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (dirt > 0) grime(ctx, pts, true, dirt);
  if (lw > 0) { smoothPath(ctx, pts); inkFill(ctx, null, lw); }
}

export function ellipse(ctx, x, y, rx, ry, fill, lw = 3, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, TAU);
  inkFill(ctx, fill, lw);
}

export function circle(ctx, x, y, r, fill, lw = 3) { ellipse(ctx, x, y, r, r, fill, lw); }

export function line(ctx, x1, y1, x2, y2, color = INK, lw = 3) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.stroke();
}

// Borde deshilachado: añade dientes entre (x1,y1) y (x2,y2) a `pts`.
export function tatter(pts, x1, y1, x2, y2, n, depth, seed = 7) {
  const r = makeRng(seed);
  for (let i = 1; i <= n; i++) {
    const f = i / n;
    const fm = (i - 0.5) / n;
    const dx = x2 - x1, dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len; // normal
    const d = depth * (0.5 + r());
    pts.push(x1 + dx * fm - nx * d, y1 + dy * fm - ny * d);
    if (i < n) pts.push(x1 + dx * f + nx * depth * 0.2 * r(), y1 + dy * f + ny * depth * 0.2 * r());
  }
  pts.push(x2, y2);
  return pts;
}

// ---------------------------------------------------------------- formas
export function star(ctx, x, y, r, points, fill, lw = 2, inner = 0.45) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const rr = i % 2 ? r * inner : r;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  inkFill(ctx, fill, lw);
}

export function gear(ctx, x, y, r, teeth, fill, rot = 0, lw = 2.5) {
  ctx.beginPath();
  const n = teeth * 4;
  for (let i = 0; i < n; i++) {
    const a = rot + (i / n) * TAU;
    const rr = (i % 4 < 2) ? r : r * 0.78;
    if (i === 0) ctx.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    else ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  inkFill(ctx, fill, lw);
  ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, TAU);
  inkFill(ctx, shade(fill, -0.3), lw * 0.8);
  ctx.beginPath(); ctx.arc(x, y, r * 0.2, 0, TAU);
  inkFill(ctx, '#140c08', lw * 0.6);
}

export function skull(ctx, x, y, s, fill = '#e2d1a8', lw = 2) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.beginPath();
  ctx.moveTo(-10, -2); ctx.bezierCurveTo(-11, -16, 11, -16, 10, -2);
  ctx.lineTo(7, 4); ctx.lineTo(6, 10); ctx.lineTo(-6, 10); ctx.lineTo(-7, 4); ctx.closePath();
  inkFill(ctx, fill, lw / s);
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(-4.5, -2, 3.2, 3.8, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.ellipse(4.5, -2, 3.2, 3.8, 0, 0, TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.lineTo(-1.6, 5); ctx.lineTo(1.6, 5); ctx.fill();
  ctx.lineWidth = 1 / s; ctx.strokeStyle = INK;
  for (let i = -4; i <= 4; i += 2.6) { ctx.beginPath(); ctx.moveTo(i, 6.5); ctx.lineTo(i, 10); ctx.stroke(); }
  ctx.restore();
}

export function coin(ctx, x, y, r, lw = 2) {
  circle(ctx, x, y, r, '#c99a2e', lw);
  circle(ctx, x, y, r * 0.68, '#e8c25a', lw * 0.6);
  star(ctx, x, y, r * 0.42, 5, '#8a5d14', 0, 0.45);
}

// Llama estilizada (capas exterior/media/núcleo). Aditiva.
export function flame(ctx, x, y, s, outer, mid, core, t = 0, seed = 0) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const layers = [[outer, 1, 0.75], [mid, 0.68, 0.85], [core, 0.36, 1]];
  for (let L = 0; L < 3; L++) {
    const [col, k, al] = layers[L];
    ctx.globalAlpha = al;
    ctx.fillStyle = col;
    ctx.beginPath();
    const w = 14 * s * k, h = 34 * s * k;
    const wob = Math.sin(t * 9 + seed) * 4 * s * k;
    const wob2 = Math.cos(t * 7 + seed * 2) * 3 * s * k;
    ctx.moveTo(x - w, y);
    ctx.bezierCurveTo(x - w * 1.1, y - h * 0.45, x - w * 0.3 + wob2, y - h * 0.6, x + wob, y - h);
    ctx.bezierCurveTo(x + w * 0.2 + wob, y - h * 0.65, x + w * 1.15, y - h * 0.4, x + w, y);
    ctx.bezierCurveTo(x + w * 0.6, y + w * 0.7, x - w * 0.6, y + w * 0.7, x - w, y);
    ctx.fill();
    // lengüetas laterales
    if (L === 0) {
      ctx.beginPath();
      ctx.moveTo(x - w * 0.8, y - h * 0.2);
      ctx.quadraticCurveTo(x - w * 1.6 + wob2, y - h * 0.55, x - w * 1.1 - wob, y - h * 0.8);
      ctx.quadraticCurveTo(x - w * 0.6, y - h * 0.45, x - w * 0.2, y - h * 0.3);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + w * 0.8, y - h * 0.25);
      ctx.quadraticCurveTo(x + w * 1.5 - wob2, y - h * 0.5, x + w * 1.2 + wob, y - h * 0.75);
      ctx.quadraticCurveTo(x + w * 0.5, y - h * 0.5, x + w * 0.2, y - h * 0.3);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function glow(ctx, x, y, r, color, alpha = 0.6) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.4, rgba(color, alpha * 0.45));
  g.addColorStop(1, rgba(color, 0));
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
  ctx.restore();
}

// Humo: varias bolas suaves.
export function smoke(ctx, x, y, s, color, alpha, t, seed = 0) {
  ctx.save();
  for (let i = 0; i < 5; i++) {
    const ph = t * 0.6 + i * 1.3 + seed;
    const yy = y - ((ph * 18) % 60) * s;
    const xx = x + Math.sin(ph * 2) * 8 * s;
    const life = ((ph * 18) % 60) / 60;
    const r = (6 + life * 16) * s;
    const g = ctx.createRadialGradient(xx, yy, 0, xx, yy, r);
    g.addColorStop(0, rgba(color, alpha * (1 - life)));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(xx - r, yy - r, r * 2, r * 2);
  }
  ctx.restore();
}

// Trama de semitono: puntos cuyo radio crece hacia abajo (o hacia arriba con fromTop), gradiente de cómic.
// Rendimiento: en vez de cientos de arc() celda a celda, se pinta UNA VEZ una tira vertical de un periodo
// horizontal (todas las filas) a la resolución del lienzo, se cachea y se rellena el área como patrón repetido.
const HT_STRIPS = new Map();
function halftoneStrip(spacing, color, alpha, fromTop, h, sc) {
  const key = spacing + '|' + color + '|' + alpha + '|' + (fromTop ? 1 : 0) + '|' + h + '|' + sc;
  let c = HT_STRIPS.get(key);
  if (c) return c;
  if (HT_STRIPS.size > 96) HT_STRIPS.clear();
  const cw = Math.max(2, Math.round(spacing * sc)), ch = Math.max(1, Math.ceil(h * sc));
  c = makeCanvas(cw, ch);
  const x = c.getContext('2d'); x.fillStyle = rgba(color, alpha);
  for (let yy = 0; yy < h; yy += spacing) {
    const row = Math.round(yy / spacing), f = fromTop ? 1 - yy / h : yy / h, r = spacing * 0.48 * f * sc;
    if (r < 0.3 * sc) continue;
    x.beginPath();
    if (row % 2) x.arc(cw / 2, yy * sc, r, 0, TAU);
    else { x.arc(0, yy * sc, r, 0, TAU); x.moveTo(cw + r, yy * sc); x.arc(cw, yy * sc, r, 0, TAU); }
    x.fill();
  }
  HT_STRIPS.set(key, c);
  return c;
}
export function halftone(ctx, x, y, w, h, spacing, color, alpha, fromTop = false) {
  const tr = ctx.getTransform(), sc = Math.max(1, Math.round(Math.hypot(tr.a, tr.b) * 2) / 2);
  const hh = Math.max(1, Math.round(h)), strip = halftoneStrip(spacing, color, alpha, fromTop, hh, sc);
  const pat = ctx.createPattern(strip, 'repeat-x');
  if (pat.setTransform) pat.setTransform(new DOMMatrix([1 / sc, 0, 0, 1 / sc, 0, 0]));
  ctx.save(); ctx.translate(x, y); ctx.fillStyle = pat; ctx.fillRect(0, 0, w, hh); ctx.restore();
}

// Grano de papel precalculado (motas de tinta): una tesela de 128 px que se repite como patrón.
const GRAIN = new Map();
export function grainPattern(ctx, color, perTile = 14, size = 2) {
  const key = color + '|' + perTile + '|' + size;
  let c = GRAIN.get(key);
  if (!c) {
    c = makeCanvas(128, 128); const x = c.getContext('2d'), r = makeRng(perTile * 977 + size);
    x.fillStyle = color; for (let i = 0; i < perTile; i++) x.fillRect(r() * 128, r() * 128, size, size);
    GRAIN.set(key, c);
  }
  return ctx.createPattern(c, 'repeat');
}

export function hatch(ctx, x, y, w, h, spacing, color, lw = 1, angle = 0.8) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  const d = w + h;
  ctx.beginPath();
  for (let i = -d; i < d; i += spacing) {
    ctx.moveTo(x + i, y);
    ctx.lineTo(x + i + Math.cos(angle) * d, y + Math.sin(angle) * d);
  }
  ctx.stroke();
  ctx.restore();
}

// Texto grabado western con contorno de tinta.
export const FT = 'Holtwood One SC', FB = 'Courier Prime';
export function inkText(ctx, text, x, y, size, fill, font = FT, lw = 0, align = 'center') {
  ctx.font = `${size}px "${font}", Georgia, serif`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (lw) { ctx.lineWidth = lw; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.strokeText(text, x, y); }
  ctx.fillStyle = fill; ctx.fillText(text, x, y);
}

// Rótulo de onomatopeya cómic ("¡BANG!") con estallido.
export function burst(ctx, x, y, r, spikes, fill, lw = 3, seed = 3) {
  const rr = makeRng(seed);
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const a = (i / (spikes * 2)) * TAU;
    const k = i % 2 ? 0.62 + rr() * 0.1 : 0.95 + rr() * 0.15;
    const px = x + Math.cos(a) * r * k, py = y + Math.sin(a) * r * k * 0.8;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  inkFill(ctx, fill, lw);
}

// Sombreado cruzado (cross-hatching) recortado a un polígono: tinta sucia para la horda.
export function hatchPoly(ctx, pts, spacing = 4, color = 'rgba(11,7,5,0.55)', lw = 1, cross = true, side = 0.35) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    if (pts[i] < x0) x0 = pts[i]; if (pts[i] > x1) x1 = pts[i];
    if (pts[i + 1] < y0) y0 = pts[i + 1]; if (pts[i + 1] > y1) y1 = pts[i + 1];
  }
  ctx.save();
  path(ctx, pts); ctx.clip();
  // solo en el lado en sombra (derecha) + un poco de ruido
  const sx = x0 + (x1 - x0) * side;
  ctx.beginPath(); ctx.rect(sx, y0, x1 - sx, y1 - y0); ctx.clip();
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  const d = (x1 - x0) + (y1 - y0);
  ctx.beginPath();
  for (let i = -d; i < d; i += spacing) { ctx.moveTo(x0 + i, y0); ctx.lineTo(x0 + i + d, y0 + d); }
  if (cross) for (let i = -d; i < d * 2; i += spacing * 1.3) { ctx.moveTo(x0 + i, y0); ctx.lineTo(x0 + i - d, y0 + d); }
  ctx.stroke();
  ctx.restore();
}

// Sello de tinta rugoso (CASO CERRADO, FINAL TRÁGICO, LEYENDA…).
export function stamp(ctx, text, x, y, size, color, rot = -0.18, font = 'Holtwood One SC') {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(rot);
  ctx.font = `${size}px "${font}", Georgia, serif`;
  const w = ctx.measureText(text).width + size * 1.1, h = size * 1.7;
  const r = makeRng(text.length * 97);
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = size * 0.12;
  for (let k = 0; k < 2; k++) {
    const m = k * size * 0.22;
    ctx.beginPath();
    ctx.rect(-w / 2 + m, -h / 2 + m, w - m * 2, h - m * 2);
    ctx.stroke();
  }
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 0, size * 0.06);
  // desgaste: mordiscos de tinta ausente
  ctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 90; i++) {
    ctx.beginPath(); ctx.arc((r() - 0.5) * w, (r() - 0.5) * h, r() * size * 0.09, 0, TAU); ctx.fill();
  }
  ctx.restore();
}

// Rejilla de puntos para sombras (semitono de sombra); devuelve un patrón.
export function halftonePattern(ctx, base, dot, cell = 6) {
  const c = makeCanvas(cell, cell), x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, cell, cell);
  x.fillStyle = dot; x.beginPath(); x.arc(cell / 2, cell / 2, cell * 0.32, 0, TAU); x.fill();
  return ctx.createPattern(c, 'repeat');
}

export function wrapText(ctx, text, maxW) {
  const words = text.split(' '), lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t;
  }
  if (cur) lines.push(cur);
  return lines;
}
