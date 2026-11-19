// Caché de sprites pre-renderizados por partida (drawImage a 60 FPS) + brillos y luces.
import { makeCanvas, rgba, glow as glowFx } from './ink.js';
import { drawHero } from './heroArt.js';
import { drawZombie, Z_BOX } from './zombieArt.js';
import { drawPet } from './petArt.js';
import { renderProp } from './worldArt.js';

function whiteOf(src) {
  const c = makeCanvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  return c;
}

// Post-proceso de novela gráfica: DOBLE LÍNEA de contorno (tinta exterior + filete de papel + la línea
// interior del propio dibujo) y RIM-LIGHT de contorno (media luna de luz en el borde superior derecho).
function silhouetteOf(src, color) {
  const c = makeCanvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
export function noirize(src, res, rim, outline = 1) {
  const o = Math.max(1, res * 1.1 * outline);
  const out = makeCanvas(src.width, src.height), x = out.getContext('2d');
  const ink = silhouetteOf(src, '#050302'), paper = silhouetteOf(src, '#e8dcc0');
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [0.7, 0.7], [-0.7, 0.7], [0.7, -0.7], [-0.7, -0.7]];
  for (const [dx, dy] of dirs) x.drawImage(ink, dx * o * 2, dy * o * 2);
  for (const [dx, dy] of dirs) x.drawImage(paper, dx * o, dy * o);
  x.drawImage(src, 0, 0);
  if (rim) {
    const r = silhouetteOf(src, rim), rx = r.getContext('2d');
    rx.globalCompositeOperation = 'destination-out'; rx.drawImage(src, -o * 1.6, o * 1.6);
    x.globalAlpha = 0.85; x.drawImage(r, 0, 0); x.globalAlpha = 1;
  }
  return out;
}

function build(w, h, ox, oy, scale, res, paint, aura, rim, outline = 1) {
  const pad = 4;
  w += pad * 2; h += pad * 2; ox += pad; oy += pad;
  let c = makeCanvas(w * res, h * res);
  const ctx = c.getContext('2d');
  ctx.scale(res, res); ctx.translate(ox, oy);
  if (aura) glowFx(ctx, 0, -h * 0.35, Math.max(w, h) * 0.5, aura, 0.3);
  ctx.scale(scale, scale);
  paint(ctx);
  c = noirize(c, res, rim, outline);
  return { canvas: c, flash: whiteOf(c), w, h, ox, oy };
}

export class Sprites {
  constructor(res) { this.res = res; this.map = new Map(); this.glows = new Map(); }

  // Capas articuladas del forajido (piernas, cuerpo y brazo del arma), cada una con doble línea y rim-light.
  heroLayers(id, pal, skinIdx, rim) {
    const key = 'L' + id + skinIdx;
    let L = this.map.get(key);
    if (!L) {
      L = {};
      for (const layer of ['legL', 'legR', 'body', 'arm']) L[layer] = build(96, 80, 48, 74, 0.34, this.res, (c) => drawHero(c, id, pal, 0, 99, layer), null, pal.rim || rim, 0.8);
      L.scale = 0.34;
      this.map.set(key, L);
    }
    return L;
  }

  hero(id, pal, skinIdx, rim) {
    const key = 'h' + id + skinIdx;
    let s = this.map.get(key);
    if (!s) {
      s = build(84, 76, 42, 72, 0.34, this.res, (c) => drawHero(c, id, pal, 0, 99), null, pal.rim || rim);
      const d = makeCanvas(s.canvas.width, s.canvas.height), x = d.getContext('2d');
      x.drawImage(s.canvas, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#05030a'; x.fillRect(0, 0, d.width, d.height);
      s.dark = d; this.map.set(key, s);
    }
    return s;
  }

  // Mascota: 4 fotogramas por nivel de evolución, con la luz de borde del forajido.
  pet(kind, tier, frame, rim) {
    const key = 'pet' + kind + tier + frame;
    let s = this.map.get(key);
    if (!s) { s = build(78, 54, 39, 48, 0.42, this.res, (c) => drawPet(c, kind, frame, tier), null, rim, 0.8); this.map.set(key, s); }
    return s;
  }

  zombie(type, elite = false, frame = 0) {
    const key = 'z' + type + (elite ? 'E' : '') + frame;
    let s = this.map.get(key);
    if (!s) {
      const b = Z_BOX[type], sc = b.s * (elite ? 1.3 : 1);
      const w = b.w * sc + 16, h = b.h * sc + 12;
      const big = b.s >= 0.5;
      s = build(w, h, w / 2, h * b.cy, sc, this.res, (c) => drawZombie(c, type, 0, 7, frame), elite ? '#7fa8ff' : null, big ? '#ff5a3a' : '#8a9aa8', big ? 1.2 : 0.8);
      this.map.set(key, s);
    }
    return s;
  }

  prop(type) {
    let s = this.map.get('p' + type);
    if (!s) { const r = renderProp(type, this.res); s = { canvas: r.canvas, w: r.w, h: r.h, ox: r.ox, oy: r.oy }; this.map.set('p' + type, s); }
    return s;
  }

  glow(color) {
    let g = this.glows.get(color);
    if (!g) {
      const S = 64; g = makeCanvas(S, S);
      const ctx = g.getContext('2d'), grd = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      grd.addColorStop(0, rgba(color, 1)); grd.addColorStop(0.25, rgba(color, 0.55)); grd.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = grd; ctx.fillRect(0, 0, S, S);
      this.glows.set(color, g);
    }
    return g;
  }

  // Máscara de luz (blanco → transparente) para recortar la oscuridad (claroscuro).
  light() {
    let l = this.map.get('light');
    if (!l) {
      const S = 128; const c = makeCanvas(S, S), ctx = c.getContext('2d');
      const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,0.85)'); g.addColorStop(0.75, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      l = { canvas: c }; this.map.set('light', l);
    }
    return l.canvas;
  }

  fog() {
    let f = this.map.get('fog');
    if (!f) {
      const S = 256, c = makeCanvas(S, S), ctx = c.getContext('2d');
      for (let i = 0; i < 7; i++) {
        const x = 60 + Math.random() * 136, y = 60 + Math.random() * 136, r = 50 + Math.random() * 60;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(170,180,190,0.3)'); g.addColorStop(1, 'rgba(170,180,190,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      }
      f = { canvas: c }; this.map.set('fog', f);
    }
    return f.canvas;
  }
}
