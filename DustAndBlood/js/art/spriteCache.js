// Caché de sprites pre-renderizados (una vez por misión) para dibujar a 60 FPS con drawImage.
import { makeCanvas, rgba, glow as glowFx } from './comic.js';
import { drawHero } from './heroArt.js';
import { drawEnemy, ART_BOX } from './enemyArt.js';
import { renderProp } from './propArt.js';

export const ENEMY_SCALE = { outlaw: 0.3, miner: 0.34, shaman: 0.3, hound: 0.3, sniper: 0.3, rider: 0.34, sheriff: 0.5, bride: 0.52, foreman: 0.5, preacher: 0.52 };

function whiteOf(src) {
  const c = makeCanvas(src.width, src.height), x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
  return c;
}

function build(w, h, ox, oy, scale, res, paint, auraColor = null) {
  const c = makeCanvas(w * res, h * res), ctx = c.getContext('2d');
  ctx.scale(res, res);
  ctx.translate(ox, oy);
  if (auraColor) glowFx(ctx, 0, -h * 0.35, Math.max(w, h) * 0.5, auraColor, 0.35);
  ctx.scale(scale, scale);
  paint(ctx);
  return { canvas: c, flash: whiteOf(c), w, h, ox, oy };
}

export class SpriteCache {
  constructor(res) {
    this.res = res;
    this.map = new Map();
    this.glows = new Map();
  }

  hero(id, pal) {
    const key = 'h:' + id + ':' + pal.primary;
    let s = this.map.get(key);
    if (!s) {
      const scale = 0.34;
      s = build(80, 74, 40, 70, scale, this.res, (ctx) => drawHero(ctx, id, pal, 0, 99));
      this.map.set(key, s);
    }
    return s;
  }

  enemy(type, elite = false) {
    const key = 'e:' + type + (elite ? ':E' : '');
    let s = this.map.get(key);
    if (!s) {
      const box = ART_BOX[type];
      const scale = ENEMY_SCALE[type] * (elite ? 1.35 : 1);
      const w = box.w * scale + 16, h = box.h * scale + 12;
      const aura = elite ? (type === 'rider' ? '#ff3a12' : type === 'shaman' ? '#b04dff' : '#ffb02a') : null;
      s = build(w, h, w / 2, h * box.cy, scale, this.res, (ctx) => drawEnemy(ctx, type, 0, 7), aura);
      this.map.set(key, s);
    }
    return s;
  }

  prop(type, pal = null) {
    const key = 'p:' + type;
    let s = this.map.get(key);
    if (!s) {
      const r = renderProp(type, this.res, pal);
      s = { canvas: r.canvas, flash: null, w: r.w, h: r.h, ox: r.ox, oy: r.oy };
      this.map.set(key, s);
    }
    return s;
  }

  // Sprite de brillo radial por color (para balas, chispas, luces). Se dibuja con 'lighter'.
  glow(color) {
    let g = this.glows.get(color);
    if (!g) {
      const S = 64;
      g = makeCanvas(S, S);
      const ctx = g.getContext('2d');
      const grd = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
      grd.addColorStop(0, rgba(color, 1));
      grd.addColorStop(0.25, rgba(color, 0.55));
      grd.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = grd; ctx.fillRect(0, 0, S, S);
      this.glows.set(color, g);
    }
    return g;
  }

  // Viñeta de oscuridad (agujero de luz alrededor del jugador) para noche/niebla/mina.
  vignette(color, inner, alpha) {
    const key = 'v:' + color + inner + alpha;
    let v = this.map.get(key);
    if (!v) {
      const S = 512;
      const c = makeCanvas(S, S), ctx = c.getContext('2d');
      const grd = ctx.createRadialGradient(S / 2, S / 2, S * 0.5 * inner, S / 2, S / 2, S / 2);
      grd.addColorStop(0, rgba(color, 0));
      grd.addColorStop(1, rgba(color, alpha));
      ctx.fillStyle = grd; ctx.fillRect(0, 0, S, S);
      v = { canvas: c };
      this.map.set(key, v);
    }
    return v.canvas;
  }

  fogBlob() {
    let f = this.map.get('fog');
    if (!f) {
      const S = 256, c = makeCanvas(S, S), ctx = c.getContext('2d');
      for (let i = 0; i < 7; i++) {
        const x = 60 + Math.random() * 136, y = 60 + Math.random() * 136, r = 50 + Math.random() * 60;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(200,190,220,0.35)'); g.addColorStop(1, 'rgba(200,190,220,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
      }
      f = { canvas: c };
      this.map.set('fog', f);
    }
    return f.canvas;
  }
}
