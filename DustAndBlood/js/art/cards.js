// VanguardCardRenderer: 4 Cartas de Naipes Vivas con marco de cuero y oro gastado, calaveras, runas,
// paralaje por capas según el puntero, humo/ascuas animadas y texto western grabado.
import {
  INK, makeCanvas, makeRng, poly, circle, star, skull, glow, shade, rgba, halftone, inkText, hatch,
} from './comic.js';
import { drawHero, drawHeroFx } from './heroArt.js';

const RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ';

export class VanguardCard {
  constructor(hero, canvas) {
    this.hero = hero;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.skin = 0;
    this.px = 0; this.py = 0; this.tx = 0; this.ty = 0;
    this.hover = false;
    this.selected = false;
    this.locked = false;
    this.parts = [];
    this.rng = makeRng(hero.id.length * 101);
    this.W = 0; this.H = 0; this.dpr = 1;
  }

  get pal() { return this.hero.skins[this.skin].pal; }

  resize(cssW, cssH) {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.W = cssW; this.H = cssH;
    this.canvas.width = Math.round(cssW * this.dpr);
    this.canvas.height = Math.round(cssH * this.dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.rebuild();
  }

  setSkin(i) { if (this.skin === i && this.portrait) return; this.skin = i; if (this.W) this.rebuild(); }

  // Ventana interior de la carta (zona del retrato).
  get win() {
    const m = this.W * 0.075;
    return { x: m, y: m, w: this.W - m * 2, h: this.H * 0.74 - m };
  }

  rebuild() {
    const d = this.dpr, W = this.W, H = this.H, p = this.pal, win = this.win;
    const P = 14; // margen de paralaje
    // ---- fondo
    const bg = makeCanvas((win.w + P * 2) * d, (win.h + P * 2) * d), b = bg.getContext('2d');
    b.scale(d, d);
    const g = b.createLinearGradient(0, 0, 0, win.h + P * 2);
    g.addColorStop(0, shade(p.primary, -0.82)); g.addColorStop(0.55, shade(p.primary, -0.6)); g.addColorStop(1, '#120a06');
    b.fillStyle = g; b.fillRect(0, 0, win.w + P * 2, win.h + P * 2);
    const mx = (win.w + P * 2) * 0.72, my = win.h * 0.24;
    glow(b, mx, my, win.w * 0.6, p.glow, 0.35);
    circle(b, mx, my, win.w * 0.16, shade(p.glow2 || p.glow, 0.25), 0);
    b.globalAlpha = 0.35; circle(b, mx + 6, my - 4, win.w * 0.13, shade(p.primary, -0.5), 0); b.globalAlpha = 1;
    // mesas lejanas
    b.fillStyle = '#0d0805';
    b.beginPath(); b.moveTo(0, win.h * 0.78);
    const r = makeRng(5);
    let x = 0;
    while (x < win.w + P * 2) { const hh = win.h * (0.6 + r() * 0.15); b.lineTo(x, hh); x += 14 + r() * 30; b.lineTo(x, hh); x += 4; }
    b.lineTo(win.w + P * 2, win.h + P * 2); b.lineTo(0, win.h + P * 2); b.fill();
    halftone(b, 0, 0, win.w + P * 2, win.h + P * 2, 7, '#000000', 0.35, true);
    this.bg = bg; this.P = P;

    // ---- retrato estático
    const por = makeCanvas((win.w + P * 2) * d, (win.h + P) * d), q = por.getContext('2d');
    q.scale(d, d);
    const sc = Math.min((win.h * 0.9) / 200, (win.w + P) / 215);
    this.heroScale = sc;
    this.heroX = (win.w + P * 2) / 2; this.heroY = win.h + P * 0.2;
    q.save();
    q.translate(this.heroX, this.heroY); q.scale(sc, sc);
    // sombra en el suelo
    q.fillStyle = 'rgba(0,0,0,0.55)'; q.beginPath(); q.ellipse(0, 0, 70, 12, 0, 0, Math.PI * 2); q.fill();
    glow(q, 0, -90, 120, p.glow, 0.18);
    drawHero(q, this.hero.id, p, 1, 4242);
    q.restore();
    // semitono de sombra cómic sobre el héroe
    q.save(); q.globalCompositeOperation = 'source-atop';
    halftone(q, 0, win.h * 0.45, win.w + P * 2, win.h * 0.6, 5, '#000000', 0.45, false);
    q.restore();
    this.portrait = por;

    // ---- marco
    const fr = makeCanvas(W * d, H * d), f = fr.getContext('2d');
    f.scale(d, d);
    const rr = 14;
    // cuero exterior
    const lg = f.createLinearGradient(0, 0, W, H);
    lg.addColorStop(0, '#5a3418'); lg.addColorStop(0.5, '#3a2010'); lg.addColorStop(1, '#24140a');
    f.fillStyle = lg;
    roundRect(f, 0, 0, W, H, rr); f.fill();
    // motas de cuero
    const rn = makeRng(this.hero.id.length * 17);
    f.fillStyle = 'rgba(0,0,0,0.35)';
    for (let i = 0; i < 700; i++) f.fillRect(rn() * W, rn() * H, 1 + rn() * 1.5, 1 + rn());
    f.fillStyle = 'rgba(255,220,170,0.06)';
    for (let i = 0; i < 300; i++) f.fillRect(rn() * W, rn() * H, 1, 1);
    // costura punteada
    f.setLineDash([4, 4]); f.strokeStyle = 'rgba(230,200,150,0.45)'; f.lineWidth = 1.2;
    roundRect(f, 5, 5, W - 10, H - 10, rr - 4); f.stroke(); f.setLineDash([]);
    // recortar ventana
    f.save(); f.globalCompositeOperation = 'destination-out'; f.fillStyle = '#000';
    roundRect(f, win.x, win.y, win.w, win.h, 8); f.fill();
    f.restore();
    // marco de oro gastado alrededor de la ventana
    const gg = f.createLinearGradient(win.x, win.y, win.x + win.w, win.y + win.h);
    gg.addColorStop(0, '#f2d27a'); gg.addColorStop(0.3, '#a8761e'); gg.addColorStop(0.55, '#e6c060'); gg.addColorStop(1, '#6e4a12');
    f.lineWidth = 5; f.strokeStyle = gg;
    roundRect(f, win.x - 2, win.y - 2, win.w + 4, win.h + 4, 9); f.stroke();
    f.lineWidth = 1.5; f.strokeStyle = INK;
    roundRect(f, win.x - 5, win.y - 5, win.w + 10, win.h + 10, 11); f.stroke();
    roundRect(f, win.x + 0.5, win.y + 0.5, win.w - 1, win.h - 1, 8); f.stroke();
    // runas en los laterales
    f.font = `${Math.round(W * 0.045)}px serif`; f.textAlign = 'center'; f.textBaseline = 'middle';
    f.fillStyle = rgba(p.glow, 0.55);
    const rs = makeRng(this.hero.id.length * 3);
    for (let y = win.y + 30; y < win.y + win.h - 20; y += W * 0.07) {
      f.fillText(RUNES[(rs() * RUNES.length) | 0], win.x * 0.5, y);
      f.fillText(RUNES[(rs() * RUNES.length) | 0], W - win.x * 0.5, y);
    }
    // calaveras en esquinas
    const ks = W / 260;
    for (const [cx, cy] of [[win.x + 2, win.y + 2], [W - win.x - 2, win.y + 2], [win.x + 2, win.y + win.h - 2], [W - win.x - 2, win.y + win.h - 2]]) {
      circle(f, cx, cy, 12 * ks, '#b88a2a', 2);
      skull(f, cx, cy + 1 * ks, 0.62 * ks, '#efe0b8', 1.5);
    }
    // rango y palo en las esquinas (naipe)
    const suitCol = (this.hero.suit === '♥' || this.hero.suit === '♦') ? '#b3201a' : '#1a0e08';
    inkText(f, this.hero.rank, win.x + 22 * ks, win.y + 26 * ks, 22 * ks, '#f2e2b8', 'Rye', 4 * ks);
    inkText(f, this.hero.suit, win.x + 22 * ks, win.y + 46 * ks, 18 * ks, suitCol === '#1a0e08' ? '#f2e2b8' : '#ff5a4a', 'serif', 3 * ks);
    f.save(); f.translate(W - win.x - 22 * ks, win.y + win.h - 26 * ks); f.rotate(Math.PI);
    inkText(f, this.hero.rank, 0, 0, 22 * ks, '#f2e2b8', 'Rye', 4 * ks);
    inkText(f, this.hero.suit, 0, 20 * ks, 18 * ks, suitCol === '#1a0e08' ? '#f2e2b8' : '#ff5a4a', 'serif', 3 * ks);
    f.restore();
    // placa del título
    const ty = win.y + win.h + 8, th = H - ty - win.x * 0.9;
    const pg = f.createLinearGradient(0, ty, 0, ty + th);
    pg.addColorStop(0, '#2a180c'); pg.addColorStop(1, '#140a04');
    f.fillStyle = pg; roundRect(f, win.x - 4, ty, win.w + 8, th, 6); f.fill();
    f.lineWidth = 2.5; f.strokeStyle = gg; roundRect(f, win.x - 4, ty, win.w + 8, th, 6); f.stroke();
    hatch(f, win.x - 4, ty, win.w + 8, th, 5, 'rgba(255,220,150,0.05)', 1);
    let ts = W * 0.085;
    f.font = `${ts}px Rye, Georgia, serif`;
    const tw = f.measureText(this.hero.title).width, maxW = win.w - 34;
    if (tw > maxW) ts *= maxW / tw;
    inkText(f, this.hero.title, W / 2, ty + th * 0.3, ts, '#f2d27a', 'Rye', 4);
    inkText(f, this.hero.name.toUpperCase(), W / 2, ty + th * 0.58, W * 0.048, '#d8c8a8', 'Special Elite', 0);
    inkText(f, '« ' + this.hero.skins[this.skin].name + ' »', W / 2, ty + th * 0.8, W * 0.044, p.primary, 'Special Elite', 0);
    star(f, win.x + 10, ty + th * 0.3, 6, 5, '#c9a54a', 1.5);
    star(f, W - win.x - 10, ty + th * 0.3, 6, 5, '#c9a54a', 1.5);
    this.frame = fr;
  }

  pointer(nx, ny) { this.tx = nx; this.ty = ny; }

  update(dt, t) {
    const k = 1 - Math.exp(-dt * 8);
    const idleX = this.hover ? 0 : Math.sin(t * 0.7 + this.hero.id.length) * 0.15;
    const idleY = this.hover ? 0 : Math.cos(t * 0.5 + this.hero.id.length) * 0.1;
    this.px += ((this.hover ? this.tx : idleX) - this.px) * k;
    this.py += ((this.hover ? this.ty : idleY) - this.py) * k;
    // partículas: ascuas y humo
    const p = this.pal;
    if (this.parts.length < 26 && Math.random() < dt * 14) {
      const win = this.win;
      this.parts.push({
        x: win.x + Math.random() * win.w, y: win.y + win.h, vx: (Math.random() - 0.5) * 12, vy: -20 - Math.random() * 40,
        life: 0, max: 2 + Math.random() * 2.5, s: 1 + Math.random() * 2.5, smoke: Math.random() < 0.3,
        c: Math.random() < 0.5 ? p.glow : (p.glow2 || p.glow),
      });
    }
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const q = this.parts[i];
      q.life += dt; q.x += (q.vx + Math.sin(t * 2 + i) * 8) * dt; q.y += q.vy * dt;
      if (q.life > q.max) this.parts.splice(i, 1);
    }
  }

  render(t) {
    if (!this.frame) return;
    const ctx = this.ctx, d = this.dpr, W = this.W, H = this.H, win = this.win, P = this.P, p = this.pal;
    ctx.setTransform(d, 0, 0, d, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    roundRect(ctx, win.x, win.y, win.w, win.h, 8); ctx.clip();
    // capa 1: fondo (se mueve opuesto)
    ctx.drawImage(this.bg, win.x - P - this.px * P * 0.8, win.y - P - this.py * P * 0.8, win.w + P * 2, win.h + P * 2);
    // capa 2: héroe con respiración
    const breathe = 1 + Math.sin(t * 2.2) * 0.008;
    const ox = win.x - P + this.px * P * 0.5, oy = win.y + this.py * P * 0.35;
    ctx.save();
    ctx.translate(ox + this.heroX, oy + this.heroY);
    ctx.scale(1, breathe);
    ctx.drawImage(this.portrait, -this.heroX, -this.heroY, win.w + P * 2, win.h + P);
    ctx.scale(this.heroScale, this.heroScale / breathe);
    drawHeroFx(ctx, this.hero.id, p, t, true);
    ctx.restore();
    // capa 3: partículas (se mueven más)
    ctx.globalCompositeOperation = 'lighter';
    for (const q of this.parts) {
      const a = Math.sin((q.life / q.max) * Math.PI);
      const x = q.x + this.px * P * 1.4, y = q.y + this.py * P;
      if (q.smoke) { ctx.fillStyle = rgba(p.smoke || '#888888', 0.08 * a); ctx.beginPath(); ctx.arc(x, y, q.s * 6, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.fillStyle = rgba(q.c, 0.9 * a); ctx.fillRect(x, y, q.s, q.s); }
    }
    ctx.globalCompositeOperation = 'source-over';
    // viñeta interior
    const vg = ctx.createRadialGradient(W / 2, win.y + win.h / 2, win.w * 0.3, W / 2, win.y + win.h / 2, win.h * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = vg; ctx.fillRect(win.x, win.y, win.w, win.h);
    if (this.locked) { ctx.fillStyle = 'rgba(10,6,4,0.55)'; ctx.fillRect(win.x, win.y, win.w, win.h); }
    ctx.restore();
    // capa 4: marco
    ctx.drawImage(this.frame, 0, 0, W, H);
    // destello de oro que sigue al puntero
    const sx = W * (0.5 + this.px * 0.9) + Math.sin(t * 0.8) * W * 0.1;
    const sh = ctx.createLinearGradient(sx - 60, 0, sx + 60, H);
    sh.addColorStop(0, 'rgba(255,240,200,0)'); sh.addColorStop(0.5, 'rgba(255,240,200,0.12)'); sh.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = sh; roundRect(ctx, 0, 0, W, H, 14); ctx.fill();
    if (this.selected) {
      ctx.lineWidth = 3; ctx.strokeStyle = rgba(p.glow, 0.6 + Math.sin(t * 4) * 0.3);
      roundRect(ctx, 1.5, 1.5, W - 3, H - 3, 14); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
