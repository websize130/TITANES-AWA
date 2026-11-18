// Objetivos de misión y modificadores de escenario (noche, niebla, meteoritos, vagonetas, tormenta, sin curación).
import { HALF, ZK, PK, PT } from './game.js';
import { Sfx } from '../core/audio.js';

const TAU = Math.PI * 2;

function struct(g, kind, x, y, r, hp, opts) {
  const s = { kind, x, y, r, hp, maxHp: hp, solid: true, defend: false, targetable: false, flash: 0, progress: 0, done: false, spawnT: 3, spr: g.cache.prop(kind), ...opts };
  g.structs.push(s);
  return s;
}

class Objective {
  constructor(g, o) {
    this.g = g; this.o = o;
    this.done = false; this.failed = false; this.failReason = '';
    this.label = ''; this.count = ''; this.timer = -1; this.progress = -1;
    this.spawnMult = 1; this.noSpawn = false;
    this.markers = []; // {x, y, color}
    this._m = [];
    for (let i = 0; i < 8; i++) this._m.push({ x: 0, y: 0, color: '#ffd23a', on: false });
  }
  // Textos del HUD: solo se reconstruyen cuando cambian los valores.
  setCount(a, b) { if (a !== this._ca || b !== this._cb) { this._ca = a; this._cb = b; this.count = a + '/' + b; } }
  headline() {
    if (this._hl !== this.label || this._hc !== this.count) { this._hl = this.label; this._hc = this.count; this._h = this.label + (this.count ? '  ' + this.count : ''); }
    return this._h;
  }
  setMarkers(n) { this.markers.length = 0; for (let i = 0; i < n; i++) this.markers.push(this._m[i]); }
  update() {}
}

class Survive extends Objective {
  constructor(g, o) { super(g, o); this.label = o.type === 'infinite' ? 'OLEADA INFINITA' : 'SOBREVIVE'; }
  update() {
    this.timer = Math.max(0, this.o.time - this.g.time);
    this.progress = Math.min(1, this.g.time / this.o.time);
    if (this.g.time >= this.o.time) this.done = true;
  }
}

class Destroy extends Objective {
  constructor(g, o) {
    super(g, o);
    this.killed = 0;
    this.list = [];
    if (o.kind === 'altar') {
      this.list.push(struct(g, 'altar', 0, -640, 70, o.hp, { targetable: true }));
      this.label = 'DESTRUYE EL ALTAR DE SANGRE';
    } else {
      const off = Math.random() * TAU;
      for (let i = 0; i < o.count; i++) {
        const a = off + (i / o.count) * TAU;
        this.list.push(struct(g, 'totem', Math.cos(a) * 640, Math.sin(a) * 640, 26, o.hp, { targetable: true }));
      }
      this.label = 'TÓTEMS DE CENIZA';
    }
    this.setMarkers(this.list.length);
  }
  onStructDestroyed(s) {
    const g = this.g;
    this.killed++;
    g.explode(s.x, s.y - 40, 120, 200, '#ff6a1a', 1, 0, 400, false);
    g.comicText(s.x, s.y - 140, '¡CRASH!', '#ffd23a', 34);
    for (let i = 0; i < 25; i++) g.addPart(s.x, s.y - 50, (Math.random() - 0.5) * 400, -Math.random() * 300, 1, 5, '#5a3a24', PT.DEBRIS, false);
    for (let i = 0; i < 8; i++) g.dropPickup(s.x, s.y, PK.COIN, 2);
  }
  update(dt) {
    const g = this.g;
    this.setCount(this.killed, this.list.length);
    if (this.o.kind === 'altar') this.progress = 1 - this.list[0].hp / this.list[0].maxHp;
    for (let i = 0; i < this.list.length; i++) {
      const s = this.list[i], m = this._m[i];
      m.x = s.x; m.y = s.y; m.on = s.hp > 0; m.color = '#ff6a1a';
      s.flash -= dt;
      if (s.hp <= 0) continue;
      s.spawnT -= dt;
      const near = Math.hypot(g.player.x - s.x, g.player.y - s.y) < 700;
      if (s.spawnT <= 0 && near) {
        s.spawnT = s.kind === 'altar' ? 2.6 : 4;
        const n = s.kind === 'altar' ? 3 : 2;
        for (let k = 0; k < n; k++) {
          const a = Math.random() * TAU;
          const type = s.kind === 'altar' && k === 0 ? 'shaman' : 'outlaw';
          g.spawnEnemy(type, s.x + Math.cos(a) * 80, s.y + Math.sin(a) * 80);
        }
        for (let k = 0; k < 10; k++) g.addPart(s.x, s.y - 60, (Math.random() - 0.5) * 120, -60 - Math.random() * 100, 0.8, 4, '#ff6a1a', PT.EMBER, true);
      }
    }
    if (this.killed >= this.list.length) this.done = true;
  }
}

class Defend extends Objective {
  constructor(g, o) {
    super(g, o);
    const kind = o.kind;
    this.s = struct(g, kind, 0, -30, kind === 'saloon' ? 100 : 66, o.hp, { defend: true, solid: true });
    this.label = kind === 'saloon' ? 'DEFIENDE EL SALOON' : 'DEFIENDE EL TALADRO';
    this.setMarkers(1);
  }
  assignTarget(e) {
    if (e.type !== 'shaman' && e.type !== 'sniper' && Math.random() < 0.5) e.targetStruct = this.s;
  }
  update(dt) {
    const g = this.g, s = this.s;
    s.flash -= dt;
    this.timer = Math.max(0, this.o.time - g.time);
    this.progress = s.hp / s.maxHp;
    const m = this._m[0]; m.x = s.x; m.y = s.y; m.on = true; m.color = '#7aff6a';
    if (s.hp <= 0) { this.failed = true; this.failReason = s.kind === 'saloon' ? 'El Saloon ha caído.' : 'El Taladro ha sido destruido.'; }
    else if (g.time >= this.o.time) this.done = true;
  }
}

class Purify extends Objective {
  constructor(g, o) {
    super(g, o);
    this.list = [];
    const off = Math.random() * TAU;
    for (let i = 0; i < o.count; i++) {
      const a = off + (i / o.count) * TAU;
      this.list.push(struct(g, 'gravestone', Math.cos(a) * 560, Math.sin(a) * 560, 26, 1, { solid: true }));
    }
    this.purified = 0;
    this.label = 'LÁPIDAS PURIFICADAS';
    this.setMarkers(this.list.length);
    this.active = null;
  }
  update(dt) {
    const g = this.g, p = g.player;
    this.active = null; this.spawnMult = 1;
    for (let i = 0; i < this.list.length; i++) {
      const s = this.list[i], m = this._m[i];
      m.x = s.x; m.y = s.y; m.on = !s.done; m.color = '#b04dff';
      if (s.done) continue;
      if (Math.hypot(p.x - s.x, p.y - s.y) < 110) {
        s.progress += dt / this.o.time;
        this.active = s; this.spawnMult = 1.5;
        if (Math.random() < dt * 30) g.addPart(s.x + (Math.random() - 0.5) * 60, s.y - Math.random() * 60, 0, -80, 0.7, 3, '#fff6d0', PT.EMBER, true);
        if (s.progress >= 1) {
          s.done = true; this.purified++;
          g.explode(s.x, s.y - 40, 160, 120, '#fff6d0', 1, 0, 500, true);
          g.comicText(s.x, s.y - 120, '¡PURIFICADA!', '#fff6d0', 28);
          Sfx.play('level');
        }
      }
    }
    this.setCount(this.purified, this.list.length);
    this.progress = this.active ? this.active.progress : -1;
    if (this.purified >= this.list.length) this.done = true;
  }
}

class Elites extends Objective {
  constructor(g, o) {
    super(g, o);
    this.killed = 0; this.spawnT = 4; this.spawned = 0;
    this.label = (o.label === 'Jinete' ? 'JINETES DEL APOCALIPSIS' : 'NIGROMANTES ÉLITE');
  }
  onKill(e) { if (e.elite && e.tag === this.o.label) { this.killed++; this.g.comicText(e.x, e.y - 90, '¡' + this.o.label.toUpperCase() + ' ABATIDO!', '#ffd23a', 22); } }
  update(dt) {
    const g = this.g, E = g.enemies.items;
    let alive = 0;
    this.markers.length = 0;
    for (let i = 0; i < g.enemies.n; i++) {
      const e = E[i];
      if (e.elite && !e.dead && e.tag === this.o.label) {
        alive++;
        if (alive <= this._m.length) { const m = this._m[alive - 1]; m.x = e.x; m.y = e.y; m.on = true; m.color = '#ff3a12'; this.markers.push(m); }
      }
    }
    this.spawnT -= dt;
    if (this.spawnT <= 0 && alive < 2 && this.killed + alive < this.o.count) {
      this.spawnT = 13;
      const pt = g.ringPoint(g.q, 0);
      g.spawnEnemy(this.o.enemy, pt.x, pt.y, true, this.o.label);
      g.showBanner('¡' + (this.o.label === 'Jinete' ? 'UN JINETE CABALGA' : 'UN NIGROMANTE SE ALZA') + '!', '', 1.6);
    }
    this.setCount(this.killed, this.o.count);
    if (this.killed >= this.o.count) this.done = true;
  }
}

class Collect extends Objective {
  constructor(g, o) {
    super(g, o);
    this.got = 0;
    for (let i = 0; i < o.count + 7; i++) {
      const a = Math.random() * TAU, r = 260 + Math.random() * 920;
      const p = g.pickups.get();
      if (!p) break;
      p.x = Math.max(-HALF + 40, Math.min(HALF - 40, Math.cos(a) * r)); p.y = Math.max(-HALF + 40, Math.min(HALF - 40, Math.sin(a) * r));
      p.kind = PK.CRYSTAL; p.value = 1; p.vx = 0; p.vy = 0; p.mag = false; p.t = 0;
    }
    this.label = 'CRISTALES DE AZUFRE';
  }
  onCrystal() { this.got++; this.g.comicText(this.g.player.x, this.g.player.y - 80, '+1 CRISTAL', '#e6ff3a', 16); }
  update() {
    const g = this.g, P = g.pickups.items, px = g.player.x, py = g.player.y;
    // marcadores: los 3 cristales más cercanos
    this.markers.length = 0;
    let d0 = 1e12, d1 = 1e12, d2 = 1e12, a0 = null, a1 = null, a2 = null;
    for (let i = 0; i < g.pickups.n; i++) {
      const it = P[i];
      if (it.kind !== PK.CRYSTAL) continue;
      const d = (it.x - px) ** 2 + (it.y - py) ** 2;
      if (d < d0) { d2 = d1; a2 = a1; d1 = d0; a1 = a0; d0 = d; a0 = it; }
      else if (d < d1) { d2 = d1; a2 = a1; d1 = d; a1 = it; }
      else if (d < d2) { d2 = d; a2 = it; }
    }
    const arr = [a0, a1, a2];
    for (let i = 0; i < 3; i++) if (arr[i]) { const m = this._m[i]; m.x = arr[i].x; m.y = arr[i].y; m.on = true; m.color = '#e6ff3a'; this.markers.push(m); }
    this.setCount(this.got, this.o.count);
    if (this.got >= this.o.count) this.done = true;
  }
}

class Bridge extends Objective {
  constructor(g, o) {
    super(g, o);
    this.bridge = { x: 0, y: -880, r: 190 };
    this.phase = 0; this.held = 0;
    this.label = 'LLEGA AL PUENTE COLGANTE';
    this.setMarkers(1);
    const m = this._m[0]; m.x = 0; m.y = -880; m.on = true; m.color = '#ffd23a';
  }
  update(dt) {
    const g = this.g, p = g.player, b = this.bridge;
    const inside = Math.hypot(p.x - b.x, p.y - b.y) < b.r;
    if (this.phase === 0) {
      this.spawnMult = 0.8;
      if (inside) { this.phase = 1; g.showBanner('¡DEFIENDE EL PUENTE!', 'Aguanta sobre los tablones', 2); this.label = 'DEFIENDE EL PUENTE'; }
    } else {
      this.spawnMult = 1.6;
      if (inside) { this.held += dt; this.label = 'DEFIENDE EL PUENTE'; }
      else this.label = '¡VUELVE AL PUENTE!';
      this.timer = Math.max(0, this.o.time - this.held);
      this.progress = this.held / this.o.time;
      if (this.held >= this.o.time) this.done = true;
    }
  }
}

class Boss extends Objective {
  constructor(g, o) {
    super(g, o);
    this.spawned = false;
    this.label = 'SE ACERCA ALGO…';
  }
  update() {
    const g = this.g;
    if (!this.spawned && g.time > 5) {
      this.spawned = !!g.spawnBoss(this.o.boss);
      if (this.spawned) this.label = g.boss.name.toUpperCase();
    }
    this.markers.length = 0;
    if (g.boss && !g.boss.dead) { const m = this._m[0]; m.x = g.boss.x; m.y = g.boss.y; m.on = true; m.color = '#ff2a2a'; this.markers.push(m); }
    if (this.spawned && !g.bossAlive) this.done = true;
  }
}

export function createObjective(g, o) {
  switch (o.type) {
    case 'survive': case 'infinite': return new Survive(g, o);
    case 'destroy': return new Destroy(g, o);
    case 'defend': return new Defend(g, o);
    case 'purify': return new Purify(g, o);
    case 'elites': return new Elites(g, o);
    case 'collect': return new Collect(g, o);
    case 'bridge': return new Bridge(g, o);
    case 'boss': return new Boss(g, o);
    default: return new Survive(g, { time: 120 });
  }
}

// ---------------------------------------------------------------- modificadores
export function createMods(g, list) {
  const set = new Set(list);
  const carts = [];
  for (let i = 0; i < 4; i++) carts.push({ on: false, y: 0, x: 0, dir: 1, warn: 0 });
  const lanes = [];
  if (set.has('carts')) for (let y = -HALF + 160; y < HALF; y += 330) lanes.push(y);
  const st = { meteorT: 3, stormT: 3, cartT: 2.5, rain: set.has('storm') };
  let curCart = null;
  const cartHit = (e) => {
    if (!e.dead && Math.abs(e.y - curCart.y) < 34 && Math.abs(e.x - curCart.x) < 46) g.hurtEnemy(e, 9999, false, curCart.dir, -0.3, 600, 0, 0);
    return false;
  };
  return {
    list, carts, lanes, st,
    has: (k) => set.has(k),
    update(dt) {
      const p = g.player;
      if (set.has('meteors')) {
        st.meteorT -= dt;
        if (st.meteorT <= 0) {
          st.meteorT = 1.3 + Math.random() * 1.3;
          const a = Math.random() * TAU, r = Math.random() * 340;
          g.addZone(ZK.METEOR, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 92, 1.3, 22, '#ff5a1a', 1);
        }
      }
      if (set.has('storm')) {
        st.stormT -= dt;
        if (st.stormT <= 0) {
          st.stormT = 2 + Math.random() * 1.6;
          const a = Math.random() * TAU, r = 60 + Math.random() * 320;
          g.addZone(ZK.LIGHTNING, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 74, 1.0, 26, '#cfe8ff', 1);
        }
      }
      if (lanes.length) {
        st.cartT -= dt;
        if (st.cartT <= 0) {
          st.cartT = 2.4 + Math.random() * 1.6;
          // carril cercano al jugador
          let best = lanes[0], bd = 1e9;
          for (let i = 0; i < lanes.length; i++) { const d = Math.abs(lanes[i] - p.y) + Math.random() * 260; if (d < bd) { bd = d; best = lanes[i]; } }
          for (let i = 0; i < carts.length; i++) {
            const c = carts[i];
            if (c.on) continue;
            c.on = true; c.y = best; c.dir = Math.random() < 0.5 ? 1 : -1; c.x = c.dir > 0 ? -HALF - 200 : HALF + 200; c.warn = 1.1;
            break;
          }
        }
        for (let i = 0; i < carts.length; i++) {
          const c = carts[i];
          if (!c.on) continue;
          if (c.warn > 0) { c.warn -= dt; continue; }
          c.x += c.dir * 780 * dt;
          if (Math.random() < 0.5) g.addPart(c.x - c.dir * 30, c.y, -c.dir * 60, (Math.random() - 0.5) * 60, 0.3, 3, '#ffd24a', PT.SPARK, true);
          if (Math.abs(p.y - c.y) < 30 && Math.abs(p.x - c.x) < 44) { g.hurtPlayer(30); p.y += p.y < c.y ? -30 : 30; }
          curCart = c;
          g.grid.query(c.x, c.y, 60, cartHit);
          if (c.x < -HALF - 300 || c.x > HALF + 300) c.on = false;
        }
      }
    },
  };
}
