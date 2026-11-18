// Modos de juego: Historia (objetivos por misión) y Supervivencia "El Cruce de los Condenados"
// (rondas con adaptación 1–3, salto brutal en la 4, colosos desde la 6 y muro infernal desde la 10).
import { HALF } from './engine.js';
import { ZOMBIES } from '../data/enemies.js';
import { MISSIONS } from '../data/story.js';
import { restoreTraps } from './traps.js';
import { Sfx } from '../core/audio.js';
import { TAU } from '../art/ink.js';

function ringPoint(g, extra) {
  const p = g.player, R = Math.hypot(g.viewW, g.viewH) / 2 + extra;
  for (let t = 0; t < 6; t++) {
    const a = Math.random() * TAU, x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
    if (x > -HALF - 40 && x < HALF + 40 && y > -HALF - 40 && y < HALF + 40) { g.q.x = x; g.q.y = y; return g.q; }
  }
  g.q.x = Math.max(-HALF, Math.min(HALF, p.x + (Math.random() - 0.5) * 2 * R)); g.q.y = Math.random() < 0.5 ? -HALF - 30 : HALF + 30;
  return g.q;
}

function pick(weights) {
  let tot = 0;
  for (const k in weights) tot += weights[k];
  let r = Math.random() * tot;
  for (const k in weights) { r -= weights[k]; if (r <= 0) return k; }
  return 'walker';
}

class Base {
  constructor(g) {
    this.g = g; this.done = false; this.failed = false; this.label = ''; this.count = ''; this.timer = -1; this.progress = -1;
    this.hpMult = 1; this.dmgMult = 1; this.speedMult = 1; this.round = 0; this._h = ''; this._hl = null; this._hc = null;
  }
  headline() {
    if (this._hl !== this.label || this._hc !== this.count) { this._hl = this.label; this._hc = this.count; this._h = this.label + (this.count ? '  ·  ' + this.count : ''); }
    return this._h;
  }
  killerName() { const c = this.g.colossi.find((x) => !x.dead); return c ? c.name : 'la horda'; }
}

// ---------------------------------------------------------------- HISTORIA
class Story extends Base {
  constructor(g, m) {
    super(g);
    this.m = m; this.o = m.obj; this.idx = MISSIONS.indexOf(m);
    this.hpMult = 1 + this.idx * 0.22; this.dmgMult = 1 + this.idx * 0.12; this.speedMult = 1 + this.idx * 0.03;
    this.acc = 0; this.got = 0; this.spawned = false; this.boss = null;
    if (this.o.type === 'defend') {
      g.structs.push({ x: 0, y: -40, r: 96, hp: this.o.hp, maxHp: this.o.hp, spr: g.spr.prop('refuge') });
      this.refuge = g.structs[0];
    }
    this.label = this.o.label || { survive: 'SOBREVIVE', kill: 'ABATE A LA HORDA', boss: 'ALGO SE ACERCA…', defend: 'DEFIENDE EL REFUGIO' }[this.o.type];
  }
  assignTarget(e) { if (this.refuge && Math.random() < 0.45) e.target = this.refuge; }
  onKill() { if (this.o.type === 'kill') this.got++; }
  update(dt) {
    const g = this.g, o = this.o;
    // oleadas continuas
    if (g.time > 2) {
      let rate = this.m.rate * (1.3 + (g.time / 30) * 0.45);
      if (this.boss && !this.boss.dead) rate *= 0.45;
      this.acc += dt * rate;
      const cap = g.input.isTouch ? 150 : 220;
      while (this.acc >= 1) {
        this.acc -= 1;
        if (g.zombies.n >= cap) { this.acc = 0; break; }
        const t = pick(this.m.spawn), pt = ringPoint(g, g.map.fog ? -30 : 60);
        g.spawnZombie(t, pt.x, pt.y, this.hpMult * (1 + g.time / 300), this.speedMult);
      }
    }
    switch (o.type) {
      case 'survive':
        this.timer = Math.max(0, o.time - g.time); this.progress = Math.min(1, g.time / o.time);
        if (g.time >= o.time) this.done = true;
        break;
      case 'defend':
        this.timer = Math.max(0, o.time - g.time); this.progress = this.refuge.hp / this.refuge.maxHp;
        if (this.refuge.hp <= 0) this.failed = true; else if (g.time >= o.time) this.done = true;
        break;
      case 'kill':
        this.count = this.got + '/' + o.count; this.progress = this.got / o.count;
        if (this.got >= o.count) this.done = true;
        break;
      case 'boss':
        if (!this.spawned && g.time > 5) { this.boss = g.spawnColossus(o.boss, 1 + this.idx * 0.1); this.spawned = !!this.boss; if (this.boss) this.label = this.boss.name.toUpperCase(); }
        if (this.boss) this.progress = Math.max(0, this.boss.hp / this.boss.maxHp);
        if (this.spawned && this.boss.dead) this.done = true;
        break;
      default: break;
    }
  }
}

// ---------------------------------------------------------------- SUPERVIVENCIA
const COLOSSUS_CYCLE = ['foreman', 'faceless', 'beast'];

export function roundParams(r) {
  const hp = r <= 3 ? 1 + 0.12 * (r - 1) : r <= 5 ? 2.1 + 0.4 * (r - 4) : r < 10 ? 3.0 * Math.pow(1.2, r - 6) : 3.0 * Math.pow(1.2, 4) * Math.pow(1.35, r - 9);
  const count = r <= 3 ? 12 + r * 6 : r <= 5 ? 36 + (r - 4) * 12 : r < 10 ? 54 + (r - 6) * 11 : 96 + (r - 10) * 16;
  const speed = Math.min(1.75, 1 + 0.025 * r + (r >= 4 ? 0.14 : 0) + (r >= 10 ? 0.2 : 0));
  const dmg = 1 + 0.1 * r + (r >= 4 ? 0.5 : 0) + (r >= 10 ? 0.9 : 0);
  const rate = 1.2 + r * 0.3 + (r >= 4 ? 1.6 : 0) + (r >= 10 ? 3 : 0);
  const colossi = r < 6 ? 0 : r < 10 ? 1 : r < 15 ? 2 : 3;
  const w = { walker: 10 };
  if (r >= 2) w.runner = 4 + r * 0.5;
  if (r >= 3) w.bloater = 2 + r * 0.2;
  if (r >= 4) { w.armored = 3 + r * 0.6; w.forker = 3 + r * 0.4; w.dynamiter = 2 + r * 0.3; }
  if (r >= 10) { w.armored += 6; w.runner += 6; }
  return { hp, count, speed, dmg, rate, colossi, w };
}

class Survival extends Base {
  constructor(g) {
    super(g);
    this.round = 0; this.state = 'break'; this.breakT = 2.5; this.toSpawn = 0; this.acc = 0; this.colossiLeft = 0; this.colT = 0;
    this.label = 'EL CRUCE DE LOS CONDENADOS';
  }
  startRound() {
    const g = this.g;
    this.round++;
    const P = roundParams(this.round);
    this.P = P; this.hpMult = P.hp; this.dmgMult = P.dmg; this.speedMult = P.speed;
    this.toSpawn = P.count; this.acc = 0; this.colossiLeft = P.colossi; this.colT = 4; this.state = 'fight';
    this.label = 'RONDA ' + this.round;
    const sub = this.round === 4 ? 'LA NOCHE SE ESPESA… YA NO HAY PIEDAD' : this.round === 6 ? 'LLEGAN LOS COLOSOS' : this.round === 10 ? 'EL MURO INFERNAL' : this.round > 10 ? 'SOLO PARA LEYENDAS' : 'Que no quede ni uno';
    g.showBanner('RONDA ' + this.round, sub, 2.6);
    Sfx.play(this.round >= 4 ? 'bell' : 'round');
    if (this.round > 1 && (this.round - 1) % 3 === 0) restoreTraps(g);
  }
  update(dt) {
    const g = this.g;
    if (this.state === 'break') {
      this.breakT -= dt; this.timer = this.breakT;
      this.count = 'descanso';
      if (this.breakT <= 0) this.startRound();
      return;
    }
    this.timer = -1;
    const P = this.P, cap = g.input.isTouch ? 150 : 210;
    if (this.toSpawn > 0) {
      this.acc += dt * P.rate;
      while (this.acc >= 1 && this.toSpawn > 0) {
        this.acc -= 1;
        if (g.zombies.n >= cap) { this.acc = 0; break; }
        const pt = ringPoint(g, 50);
        g.spawnZombie(pick(P.w), pt.x, pt.y, P.hp, P.speed);
        this.toSpawn--;
      }
    }
    if (this.colossiLeft > 0) {
      this.colT -= dt;
      if (this.colT <= 0) {
        this.colT = 10;
        const type = COLOSSUS_CYCLE[(this.round - 6 + this.colossiLeft) % 3];
        g.spawnColossus(type, 1 + (this.round - 6) * 0.3 + (this.round >= 10 ? (this.round - 9) * 0.35 : 0));
        this.colossiLeft--;
      }
    }
    const alive = g.zombies.n;
    this.count = 'quedan ' + (this.toSpawn + alive + this.colossiLeft);
    this.progress = 1 - (this.toSpawn + alive + this.colossiLeft) / (P.count + P.colossi);
    if (this.toSpawn === 0 && this.colossiLeft === 0 && alive === 0) {
      this.state = 'break'; this.breakT = 6;
      g.profileXp += 25 * this.round;
      g.heal(g.player.maxHp * 0.15);
      g.showBanner('RONDA ' + this.round + ' SUPERADA', 'Carta de recompensa', 2);
      g.pendingDrafts++; g.draftLuck = Math.max(g.draftLuck, 1 + Math.floor(this.round / 4));
    }
  }
}

export function createMode(g, mode, mission) {
  return mode === 'survival' ? new Survival(g) : new Story(g, mission);
}
