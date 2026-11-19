// Modos de juego: Historia (objetivos por misión) y Supervivencia "El Cruce de los Condenados"
// (rondas con adaptación 1–3, salto brutal en la 4, colosos desde la 6 y muro infernal desde la 10).
import { HX, HY, zoneAt } from './engine.js';
import { ZOMBIES } from '../data/enemies.js';
import { MISSIONS } from '../data/story.js';
import { restoreTraps } from './traps.js';
import { Sfx } from '../core/audio.js';
import { TAU } from '../art/ink.js';

function ringPoint(g, extra) {
  const p = g.player, R = Math.hypot(g.viewW, g.viewH) / 2 + extra;
  for (let t = 0; t < 6; t++) {
    const a = Math.random() * TAU, x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
    if (x > -HX - 40 && x < HX + 40 && y > -HY - 40 && y < HY + 40) { g.q.x = x; g.q.y = y; return g.q; }
  }
  g.q.x = Math.max(-HX, Math.min(HX, p.x + (Math.random() - 0.5) * 2 * R)); g.q.y = Math.max(-HY - 30, Math.min(HY + 30, p.y + (Math.random() < 0.5 ? -R : R)));
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
const STORY_GATE = { walker: 0, runner: 15, spider: 20, bloater: 25, hound: 35, forker: 45, armored: 45, dynamiter: 55, abomination: 70 };
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
  // Introducción gradual de amenazas: solo caminantes al principio.
  gated(t) {
    const w = this.gw || (this.gw = {});
    for (const k in w) delete w[k];
    const slow = this.idx === 0 ? 1.6 : 1; // el primer caso presenta las amenazas más despacio
    for (const k in this.m.spawn) if (t >= (STORY_GATE[k] || 0) * slow) w[k] = this.m.spawn[k];
    if (!Object.keys(w).length) w.walker = 1;
    return w;
  }
  onKill() { if (this.o.type === 'kill') this.got++; }
  update(dt) {
    const g = this.g, o = this.o;
    // oleadas continuas
    if (g.time > 2) {
      // Curva de dificultad del Modo Historia:
      //  · Caso I: dificultad media accesible — pocos enemigos a la vez y ritmo controlado, sube algo al final.
      //  · Casos II–VI: más frecuencia, más enemigos simultáneos y oleadas cada vez más exigentes.
      const k = this.idx, prog = Math.min(1, g.time / (o.time || 120));
      let rate, cap;
      if (k === 0) { rate = 0.8 + prog * 0.5 + (prog > 0.8 ? 0.35 : 0); cap = Math.round(14 + prog * 14); }
      else { rate = (0.95 + k * 0.22) * (1 + (g.time / 30) * (0.3 + k * 0.07)); cap = Math.round(26 + k * 16 + g.time / 3); }
      rate *= this.m.rate * (g.time < 15 ? 0.7 : 1);
      if (this.boss && !this.boss.dead) rate *= 0.5;
      cap = Math.min(g.input.isTouch ? 150 : 220, cap);
      this.acc += dt * rate;
      if (k >= 1) {
        this.waveT = (this.waveT === undefined ? 24 : this.waveT) - dt;
        if (this.waveT <= 0) {
          this.waveT = Math.max(14, 26 - k * 2); this.wave = (this.wave || 0) + 1;
          this.acc += 3 + k * 2 + this.wave; // oleada: ráfaga extra
          g.showBanner('OLEADA ' + this.wave, 'La horda aprieta', 1.6); Sfx.play('round');
        }
      }
      while (this.acc >= 1) {
        this.acc -= 1;
        if (g.zombies.n >= cap) { this.acc = 0; break; }
        const t = pick(this.gated(g.time)), pt = ringPoint(g, g.map.fog ? -30 : 60);
        const pack = (ZOMBIES[t] || {}).pack, n = pack ? pack[0] + ((Math.random() * (pack[1] - pack[0] + 1)) | 0) : 1;
        for (let k = 0; k < n; k++) g.spawnZombie(t, pt.x + (Math.random() - 0.5) * 70, pt.y + (Math.random() - 0.5) * 70, this.hpMult * (1 + g.time / 300), this.speedMult);
        if (n > 1) this.acc -= (n - 1) * 0.35;
      }
    }
    if (this.idx >= 1 && !this.weatherDone && g.time >= 40) { this.weatherDone = true; g.startWeather(this.idx % 2 ? 'eclipse' : 'storm'); }
    if (o.miniboss && !this.miniDone && g.time >= o.miniboss.at) { this.miniDone = true; g.spawnColossus(o.miniboss.type, 0.6); }
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

// ---------------------------------------------------------------- SUPERVIVENCIA (rondas de 120 s exactos)
const COLOSSUS_CYCLE = ['foreman', 'faceless', 'beast'];
export const ROUND_TIME = 120;
// Curva de intensidad escalonada dentro de cada ronda.
export const PHASES = [
  { t: 0, name: 'ACLIMATACIÓN', sub: 'Caminantes lentos. Prueba tu alcance y el terreno.', rate: 0.6, slow: 0.75, w: { walker: 10 } },
  { t: 25, name: 'ARAÑAS DE CRIPTA', sub: 'Algo se arrastra bajo las lápidas', rate: 1.0, w: { walker: 6, spider: 6 } },
  { t: 50, name: 'SABUESOS EN ZIG-ZAG', sub: 'Te rodean por los flancos', rate: 1.45, w: { walker: 5, runner: 2, spider: 4, hound: 5 } },
  { t: 80, name: 'CLÍMAX: COLOSOS Y HORDA', sub: 'Caparazones blindados y la horda entera', rate: 2.4, w: { walker: 8, runner: 5, bloater: 2, armored: 3, forker: 3, dynamiter: 2, hound: 3, spider: 4 }, abom: true },
  { t: 105, name: 'ÚLTIMO CARTUCHO', sub: 'Quince segundos. Dispáralo todo.', rate: 3.4, w: { walker: 6, runner: 8, hound: 5, spider: 6, dynamiter: 3 }, fever: true },
];
const LATE = ['armored', 'forker', 'dynamiter'];

export function roundParams(r) {
  const hp = r <= 3 ? 1 + 0.12 * (r - 1) : r <= 5 ? 2.1 + 0.4 * (r - 4) : r < 10 ? 3.0 * Math.pow(1.2, r - 6) : 3.0 * Math.pow(1.2, 4) * Math.pow(1.35, r - 9);
  const speed = Math.min(1.75, 1 + 0.025 * r + (r >= 4 ? 0.14 : 0) + (r >= 10 ? 0.2 : 0));
  const dmg = 1 + 0.1 * r + (r >= 4 ? 0.5 : 0) + (r >= 10 ? 0.9 : 0);
  const rate = 1 + 0.15 * (r - 1) + (r >= 4 ? 0.6 : 0) + (r >= 10 ? 1.2 : 0);
  const colossi = r < 6 ? 0 : r < 10 ? 1 : r < 15 ? 2 : 3;
  const abominations = r < 3 ? 1 : r < 6 ? 2 : r < 10 ? 3 : 4;
  return { hp, speed, dmg, rate, colossi, abominations };
}

class Survival extends Base {
  constructor(g) {
    super(g);
    this.round = 0; this.state = 'break'; this.breakT = 3; this.t = 0; this.acc = 0; this.phase = -1; this.fever = false;
    this.label = 'EL CRUCE DE LOS CONDENADOS';
    this.weights = [];
  }
  startRound() {
    const g = this.g;
    this.round++;
    const P = roundParams(this.round);
    this.P = P; this.hpMult = P.hp; this.dmgMult = P.dmg; this.speedMult = P.speed;
    this.label = 'RONDA ' + this.round;
    this.t = 0; this.acc = 0; this.phase = -1; this.state = 'fight'; this.weatherDone = false; this.miniDone = false; this.abomLeft = P.abominations; this.abomT = 0; this.colLeft = P.colossi; this.colT = 0;
    // pesos por tramo (sin armadura ni improvisados en las rondas 1-3)
    this.weights = PHASES.map((ph) => { const w = {}; for (const k in ph.w) if (this.round >= 4 || !LATE.includes(k)) w[k] = ph.w[k]; return w; });
    const sub = this.round === 4 ? 'LA NOCHE SE ESPESA… YA NO HAY PIEDAD' : this.round === 6 ? 'LLEGAN LOS COLOSOS' : this.round === 10 ? 'EL MURO INFERNAL' : this.round > 10 ? 'SOLO PARA LEYENDAS' : 'Dos minutos. Ni uno más.';
    g.showBanner('RONDA ' + this.round, sub, 2.6);
    Sfx.play(this.round >= 4 ? 'bell' : 'round');
    if (this.round > 1 && (this.round - 1) % 3 === 0) restoreTraps(g);
  }
  update(dt) {
    const g = this.g;
    if (this.state === 'break') {
      this.breakT -= dt; this.timer = this.breakT; this.count = 'descanso'; this.fever = false; this.progress = -1;
      if (this.breakT <= 0) this.startRound();
      return;
    }
    this.t += dt;
    const t = this.t;
    let ph = 0; for (let i = 0; i < PHASES.length; i++) if (t >= PHASES[i].t) ph = i;
    if (ph !== this.phase) {
      this.phase = ph; this.fever = !!PHASES[ph].fever;
      if (t > 1) { g.showBanner(PHASES[ph].name, PHASES[ph].sub, 2.2); Sfx.play(ph === 3 ? 'bell' : 'round'); }
      this.count = PHASES[ph].name;
    }
    this.timer = Math.max(0, ROUND_TIME - t);
    this.progress = t / ROUND_TIME;
    const PH = PHASES[ph], P = this.P, cap = g.input.isTouch ? 150 : 210;
    this.acc += dt * PH.rate * P.rate * 1.6;
    while (this.acc >= 1) {
      this.acc -= 1;
      if (g.zombies.n >= cap) { this.acc = 0; break; }
      const type = pick(this.weights[ph]), pt = ringPoint(g, 50);
      const pack = (ZOMBIES[type] || {}).pack;
      const n = pack ? pack[0] + ((Math.random() * (pack[1] - pack[0] + 1)) | 0) : 1;
      for (let k = 0; k < n; k++) g.spawnZombie(type, pt.x + (Math.random() - 0.5) * 70, pt.y + (Math.random() - 0.5) * 70, P.hp, P.speed * (PH.fever ? 1.15 : PH.slow || 1));
      if (n > 1) this.acc -= (n - 1) * 0.35;
    }
    // clímax: abominaciones y colosos de élite
    if (PH.abom || PH.fever) {
      this.abomT -= dt;
      if (this.abomLeft > 0 && this.abomT <= 0) { this.abomT = 9; this.abomLeft--; const pt = ringPoint(g, 40); g.spawnZombie('abomination', pt.x, pt.y, P.hp, 1); g.showBanner('¡ABOMINACIÓN!', 'Caparazón blindado · escupe bilis de tinta', 1.6); }
      this.colT -= dt;
      if (this.colLeft > 0 && this.colT <= 0) {
        this.colT = 12; this.colLeft--;
        const zone = zoneAt(g.player.x), boss = zone === 1 ? 'plague' : zone === 2 ? 'spawn' : COLOSSUS_CYCLE[(this.round + this.colLeft) % 3];
        g.spawnColossus(boss, 1 + (this.round - 6) * 0.3 + (this.round >= 10 ? (this.round - 9) * 0.35 : 0));
      }
    }
    // clima dinámico a mitad de ronda (desde la ronda 2)
    if (this.round >= 2 && !this.weatherDone && t >= 40) { this.weatherDone = true; g.startWeather(this.round % 2 ? 'storm' : 'eclipse'); }
    // mini-jefe de zona en la ronda 3 y 5 (cementerio: Predicador de la Peste · mina: Engendro)
    if ((this.round === 3 || this.round === 5) && !this.miniDone && t >= 70) { this.miniDone = true; const zone = zoneAt(g.player.x); g.spawnColossus(zone === 2 ? 'spawn' : 'plague', 0.45); }
    if (t >= ROUND_TIME) this.endRound();
  }
  endRound() {
    const g = this.g, E = g.zombies.items;
    // al amanecer la horda se deshace en tinta
    for (let i = 0; i < g.zombies.n; i++) {
      const e = E[i];
      if (e.dead) continue;
      e.dead = true;
      for (let k = 0; k < 4; k++) g.addPart(e.x, e.y - e.r, (Math.random() - 0.5) * 120, -Math.random() * 120, 0.8, 4, '#0a0605', 2, false);
    }
    this.state = 'break'; this.breakT = 8; this.fever = false;
    g.profileXp += 30 * this.round; g.gold += 30 * this.round;
    g.heal(g.player.maxHp * 0.15);
    g.showBanner('RONDA ' + this.round + ' SUPERADA', 'La horda se disuelve en tinta · carta de recompensa', 2.4);
    g.flash = 0.5;
    g.pendingDrafts++; g.draftLuck = Math.max(g.draftLuck, 1 + Math.floor(this.round / 4));
  }
}

export function createMode(g, mode, mission) {
  return mode === 'survival' ? new Survival(g) : new Story(g, mission);
}
