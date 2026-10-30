/* PokerVegasPro — partículas de ambiente (polvo estelar y chispas doradas, magenta y cian) en un canvas ligero.
 * Se detienen dentro de las partidas, con la pestaña oculta y con «reducir movimiento».
 */
(function (root) {
  'use strict';

  const PVP = root.PVP;
  const COLORS = [[255, 214, 110], [255, 236, 170], [255, 43, 214], [0, 240, 255], [255, 190, 80]];

  const Particles = {
    start() {
      if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const c = (this.canvas = document.createElement('canvas'));
      c.className = 'fx-particles';
      c.setAttribute('aria-hidden', 'true');
      document.body.insertBefore(c, document.body.firstChild.nextSibling);
      this.g = c.getContext('2d');
      // Sprites precalculados (un degradado por color): dibujar es solo un drawImage por partícula.
      this.sprites = COLORS.map(([r, gg, b]) => {
        const sp = document.createElement('canvas');
        sp.width = sp.height = 32;
        const sg = sp.getContext('2d');
        const grd = sg.createRadialGradient(16, 16, 0, 16, 16, 16);
        grd.addColorStop(0, `rgba(${r},${gg},${b},1)`);
        grd.addColorStop(0.35, `rgba(${r},${gg},${b},0.45)`);
        grd.addColorStop(1, `rgba(${r},${gg},${b},0)`);
        sg.fillStyle = grd;
        sg.fillRect(0, 0, 32, 32);
        return sp;
      });
      this.resize();
      root.addEventListener('resize', () => this.resize());
      this.loop = this.loop.bind(this);
      requestAnimationFrame(this.loop);
    },

    resize() {
      const dpr = Math.min(root.devicePixelRatio || 1, 1.5);
      this.w = root.innerWidth; this.h = root.innerHeight;
      this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr;
      this.canvas.style.width = this.w + 'px'; this.canvas.style.height = this.h + 'px';
      this.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(110, (this.w * this.h) / 14000));
      this.p = Array.from({ length: n }, () => this.spawn(true));
    },

    spawn(any) {
      const gold = Math.random() < 0.72;
      return {
        x: Math.random() * this.w, y: any ? Math.random() * this.h : this.h + 10,
        r: gold ? 0.6 + Math.random() * 1.8 : 0.5 + Math.random() * 1.2,
        vy: -(0.08 + Math.random() * 0.35), vx: (Math.random() - 0.5) * 0.15,
        a: 0, life: 0, max: 400 + Math.random() * 700, tw: Math.random() * Math.PI * 2,
        ci: gold ? (Math.random() < 0.5 ? 0 : Math.random() < 0.5 ? 1 : 4) : (Math.random() < 0.5 ? 2 : 3),
      };
    },

    loop(t) {
      requestAnimationFrame(this.loop);
      // En partida, con la pestaña oculta o con una ventana modal abierta, no se dibuja nada.
      const active = !document.hidden && document.body.dataset.screen !== 'game' && !document.querySelector('.modal.open');
      this.canvas.style.opacity = active ? 1 : 0;
      if (!active) return;
      const g = this.g;
      g.clearRect(0, 0, this.w, this.h);
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < this.p.length; i++) {
        const p = this.p[i];
        p.life++;
        p.x += p.vx + Math.sin((p.life + p.tw * 50) / 90) * 0.12;
        p.y += p.vy;
        const k = p.life / p.max;
        p.a = k < 0.15 ? k / 0.15 : k > 0.8 ? (1 - k) / 0.2 : 1;
        const twinkle = 0.6 + 0.4 * Math.sin(t / 400 + p.tw);
        if (p.life > p.max || p.y < -10) { this.p[i] = this.spawn(false); continue; }
        const rad = p.r * 4;
        g.globalAlpha = 0.9 * p.a * twinkle;
        g.drawImage(this.sprites[p.ci], p.x - rad, p.y - rad, rad * 2, rad * 2);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    },
  };

  PVP.Particles = Particles;
})(window);
