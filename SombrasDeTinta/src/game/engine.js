// Núcleo de partida: bucle a 60 FPS, pools sin basura, daño (armadura, esquiva, críticos), mano de cartas,
// sorteos de cartas, maldiciones, almas (XP de partida) y XP de perfil. Modos: historia y supervivencia.
import { Pool, Grid } from './pool.js';
import { Sprites } from '../art/sprites.js';
import { makeGround } from '../art/worldArt.js';
import { makeRng, TAU } from '../art/ink.js';
import { ZOMBIES, COLOSSI } from '../data/enemies.js';
import { WEAPONS, BARKS } from '../data/heroes.js';
import { MAPS } from '../data/story.js';
import { CARDS, SIGNATURE, rollRarity } from '../data/cards.js';
import { Sfx } from '../core/audio.js';
import { fireWeapon, playCard, updatePassives } from './combat.js';
import { updateZombies } from './ai.js';
import { buildTraps, updateTraps, bulletVsTraps, explosionVsTraps } from './traps.js';
import { createMode } from './modes.js';
import { renderGame } from './render.js';

export const HALF = 1100;

const mkZ = () => ({
  uid: 0, type: '', def: null, x: 0, y: 0, vx: 0, vy: 0, r: 10, hp: 1, maxHp: 1, armor: 0, maxArmor: 0, speed: 0, dmg: 0,
  colossus: false, elite: false, spr: null, flash: 0, burnT: 0, burnDps: 0, burnTick: 0, slowT: 0, stunT: 0, rootT: 0,
  atkT: 0, state: 0, stateT: 0, ax: 0, ay: 0, face: 1, target: null, xp: 1, soul: 1, dead: false, alpha: 1, name: '',
  mode: '', modeT: 0, patIdx: 0, subT: 0, subN: 0, phase: 0, ang: 0, hitBy: 0, tauntT: 0,
});
const mkB = () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 3, dmg: 0, pierce: 0, life: 0, color: '#fff', core: '#fff', kind: 0, kb: 0, crit: false, hits: [], chain: 0, homing: 0, burn: 0, slow: 0, stun: 0, radius: 0, len: 10, spin: 0, ox: 0, oy: 0 });
const mkE = () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 5, dmg: 0, life: 0, color: '#fff', kind: 0, t: 0, tmax: 0, sx: 0, sy: 0, tx: 0, ty: 0, radius: 0, homing: 0 });
const mkP = () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff', kind: 0, grow: 0, drag: 0, add: true });
const mkT = () => ({ x: 0, y: 0, vy: 0, life: 0, max: 1, str: '', color: '#fff', size: 14, big: false });
const mkI = () => ({ x: 0, y: 0, kind: 0, value: 0, vx: 0, vy: 0, mag: false, t: 0 });
const mkZn = () => ({ uid: 0, kind: 0, x: 0, y: 0, r: 0, maxR: 0, life: 0, max: 0, dmg: 0, color: '#fff', tick: 0, owner: 0, ang: 0, len: 0, vx: 0, vy: 0 });
const mkBub = () => ({ on: false, x: 0, y: 0, follow: null, uid: 0, text: '', life: 0, max: 0, scream: false });

export const BK = { BULLET: 0, PELLET: 1, RIFLE: 2, HARPOON: 3, CARD: 4, FLAME: 5, LOB: 6 };
export const EK = { ORB: 0, FAST: 1, LOB: 2, PAGE: 3 };
export const PK = { SOUL: 0, BIGSOUL: 1, HEAL: 2 };
export const PT = { SPARK: 0, SMOKE: 1, BLOOD: 2, RING: 3, FLASH: 4, EMBER: 5, DEBRIS: 6, SPLINTER: 7 };
export const ZK = { FIRE: 0, RING: 1, STRIKE: 2, POOL: 3, GAS: 4, SLAM: 5, CHARGE: 6, BOMB: 7, TRAIN: 8, RIDERS: 9 };

export class Game {
  constructor(canvas, input, cb) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.input = input; this.cb = cb; // { onEnd(result), onDraft(choices, reason), onPause(v) }
    this.zombies = new Pool(mkZ, 320);
    this.bullets = new Pool(mkB, 600);
    this.ebullets = new Pool(mkE, 400);
    this.parts = new Pool(mkP, 900);
    this.texts = new Pool(mkT, 60);
    this.items = new Pool(mkI, 500);
    this.zones = new Pool(mkZn, 120);
    this.bubbles = []; for (let i = 0; i < 8; i++) this.bubbles.push(mkBub());
    this.grid = new Grid(HALF + 200, 80);
    this.decals = new Float32Array(160 * 4); this.decalN = 0; this.decalI = 0;
    this.traps = []; this.props = []; this.structs = []; this.crows = [];
    this.lights = new Float32Array(64 * 4); this.lightN = 0;
    this.uid = 1; this.running = false; this._raf = 0;
    this._loop = (ts) => this.frame(ts);
    this.player = { x: 0, y: 0, r: 15, hp: 100, maxHp: 100, face: 1, inv: 0, hurt: 0, aim: 0, aimDist: 300, fireT: 0, alt: 0, moving: false, muzzle: 0, rootT: 0, regenT: 0, spin: 0 };
    this.cam = { x: 0, y: 0, shake: 0, sx: 0, sy: 0 };
    this.q = { x: 0, y: 0, r: 0, best: null, bestD: 0, dmg: 0, kb: 0, burn: 0, stun: 0, ex: 0 };
    this._nearestFn = (e) => {
      if (e.dead || e.uid === this.q.ex) return false;
      const dx = e.x - this.q.x, dy = e.y - this.q.y, d = dx * dx + dy * dy;
      if (d < this.q.bestD) { this.q.bestD = d; this.q.best = e; }
      return false;
    };
    this._areaFn = (e) => {
      if (e.dead) return false;
      const q = this.q, dx = e.x - q.x, dy = e.y - q.y, d = Math.hypot(dx, dy);
      if (d < q.r + e.r) this.hurtZombie(e, q.dmg * (1 - Math.min(1, d / (q.r + e.r)) * 0.4), false, dx / (d || 1), dy / (d || 1), q.kb, q.burn, 0, q.stun);
      return false;
    };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1), w = window.innerWidth, h = window.innerHeight;
    this.dpr = dpr; this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    this.scale = Math.max(0.55, Math.min(w, h) / 680);
    if (Math.max(w, h) / this.scale > 1400) this.scale = Math.max(w, h) / 1400;
    this.viewW = w / this.scale; this.viewH = h / this.scale;
    this.lightCanvas = null;
  }

  // ---------------------------------------------------------------- inicio
  start(cfg) {
    const { mode, mission, hero, skin, weaponIdx, level, settings } = cfg;
    this.modeId = mode; this.mission = mission; this.hero = hero; this.skinIdx = skin; this.pal = hero.skins[skin].pal;
    this.settings = settings; this.profileLevel = level;
    this.weapon = WEAPONS[hero.weapons[weaponIdx]];
    this.mapId = mode === 'survival' ? 'crossroads' : mission.map;
    this.map = MAPS[this.mapId];
    const res = Math.max(1.5, Math.min(3, this.scale * this.dpr));
    if (!this.spr || Math.abs(this.spr.res - res) > 0.01) this.spr = new Sprites(res);
    this.groundPattern = this.ctx.createPattern(makeGround(this.mapId), 'repeat');
    for (const P of [this.zombies, this.bullets, this.ebullets, this.parts, this.texts, this.items, this.zones]) P.clear();
    for (const b of this.bubbles) b.on = false;
    this.structs.length = 0; this.crows.length = 0; this.decalN = 0; this.decalI = 0;
    this.time = 0; this.realTime = 0; this.kills = 0; this.level = 1; this.souls = 0; this.nextSouls = this.soulsFor(1);
    this.profileXp = 0; this.state = 'play'; this.endT = 0; this.result = null; this.banner = null; this.flash = 0;
    this.spawnAcc = 0; this.colossi = []; this.pendingDrafts = 0; this.draftLuck = 0; this.curses = [];
    this.killChain = 0; this.chainT = 0; this.lowBarkT = 0; this.groanT = 3; this.holyKills = 0;
    this.timers = { trap: 9, storm: 7, train: 16 };
    const s = hero.stats, lvl = (level - 1);
    this.st = {
      dmg: s.dmg * (1 + lvl * 0.012), rate: 1, speed: s.speed, crit: s.crit, critMult: s.critMult, armor: s.armor, dodge: s.dodge,
      pickup: 95, pierce: 0, regen: 0, cardCd: s.cardCd || 1, chain: 0, slowOnHit: 0, burnOnHit: 0, trapper: 0, trapMult: 1,
      crows: 0, leadStorm: 0, holyFire: 0, ghostTrain: 0, critExplode: 0, shadows: 0,
      closeBonus: s.closeBonus, farCrit: s.farCrit, trapMaster: s.trapMaster, luck: s.luck,
    };
    const p = this.player;
    p.maxHp = Math.round(s.hp * (s.farCrit ? 1.2 : 1) + lvl * 1.5); p.hp = p.maxHp;
    p.x = 0; p.y = 120; p.inv = 1.5; p.hurt = 0; p.fireT = 0.3; p.alt = 0; p.muzzle = 0; p.rootT = 0; p.regenT = 0; p.aim = -Math.PI / 2; p.spin = 0;
    this.cam.x = p.x; this.cam.y = p.y; this.cam.shake = 0;
    // mano: carta de firma + 2 huecos
    this.hand = [{ card: SIGNATURE[hero.signature], cd: 0 }, null, null];
    this.deck = 1;
    this.buildProps();
    this.traps.length = 0;
    buildTraps(this);
    this.objective = createMode(this, mode, mission);
    this.prewarm();
    this.input.attach();
    this.running = true; this.last = performance.now();
    cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(this._loop);
    this.say(null, BARKS[hero.id].start, 2.6);
  }

  prewarm() {
    this.spr.hero(this.hero.id, this.pal, this.skinIdx);
    for (const t of Object.keys(ZOMBIES)) this.spr.zombie(t);
    for (const t of Object.keys(COLOSSI)) this.spr.zombie(t);
    for (const c of [this.pal.shot, this.pal.glow, '#ff8a2a', '#ffd23a', '#ffffff', '#9dff3a', '#c8b8ff', '#7fa8ff', '#ff3a2a', '#d8e8b0', '#ffe08a', '#b8ff6a', '#c8d8ff'])
      this.spr.glow(c);
  }

  buildProps() {
    this.props.length = 0;
    const r = makeRng(this.mapId.length * 7919 + 13), list = this.map.props;
    for (let i = 0; i < 110; i++) {
      const x = (r() * 2 - 1) * (HALF - 40), y = (r() * 2 - 1) * (HALF - 40);
      if (Math.hypot(x, y - 120) < 260) continue;
      this.props.push({ x, y, spr: this.spr.prop(list[(r() * list.length) | 0]) });
    }
    if (this.mapId === 'crossroads') { this.props.push({ x: 0, y: -40, spr: this.spr.prop('gallows') }); this.props.push({ x: 300, y: -260, spr: this.spr.prop('well') }); this.props.push({ x: -260, y: 260, spr: this.spr.prop('post') }); }
    for (let a = 0; a < TAU; a += 0.1) {
      const cx = Math.cos(a), cy = Math.sin(a), k = 1 / Math.max(Math.abs(cx), Math.abs(cy));
      this.props.push({ x: cx * k * (HALF + 30), y: cy * k * (HALF + 30), spr: this.spr.prop(this.mapId === 'mine' || this.mapId === 'swamp' ? 'rock' : 'fence') });
    }
    this.props.sort((a, b) => a.y - b.y);
  }

  stop() { this.running = false; cancelAnimationFrame(this._raf); this.input.detach(); }

  pause(v) {
    if (!this.running || this.state === 'over') return;
    if (v && this.state === 'play') { this.state = 'paused'; this.cb.onPause(true); }
    else if (!v && this.state === 'paused') { this.state = 'play'; this.last = performance.now(); this.cb.onPause(false); }
  }

  // ---------------------------------------------------------------- bucle
  frame(ts) {
    if (!this.running) return;
    this._raf = requestAnimationFrame(this._loop);
    let dt = (ts - this.last) / 1000; this.last = ts;
    if (dt > 0.05) dt = 0.05; if (dt < 0) dt = 0;
    if (this.state === 'play' || this.state === 'over') this.update(dt);
    renderGame(this, dt);
  }

  update(dt) {
    this.realTime += dt;
    if (this.input.consume('pause') && this.state === 'play') { this.pause(true); return; }
    this.updateFx(dt);
    if (this.state === 'over') {
      this.endT -= dt; this.updateItems(dt);
      if (this.endT <= 0 && this.result) { const r = this.result; this.result = null; this.stop(); this.cb.onEnd(r); }
      return;
    }
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    this.updateCurses(dt);
    this.updatePlayer(dt);
    updateZombies(this, dt);
    this.updateBullets(dt);
    this.updateEBullets(dt);
    this.updateZones(dt);
    updateTraps(this, dt);
    updatePassives(this, dt);
    this.updateItems(dt);
    this.updateBubbles(dt);
    this.objective.update(dt);
    if (this.objective.failed) this.finish(false);
    else if (this.objective.done) this.finish(true);
    else if (this.pendingDrafts > 0 && this.state === 'play') this.openDraft();
  }

  updateFx(dt) {
    const P = this.parts.items;
    for (let i = this.parts.n - 1; i >= 0; i--) {
      const p = P[i]; p.life += dt;
      if (p.life >= p.max) { this.parts.kill(i); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.drag) { const k = 1 - p.drag * dt; p.vx *= k; p.vy *= k; }
      p.size += p.grow * dt;
    }
    const T = this.texts.items;
    for (let i = this.texts.n - 1; i >= 0; i--) { const t = T[i]; t.life += dt; t.y += t.vy * dt; t.vy *= 1 - 2 * dt; if (t.life >= t.max) this.texts.kill(i); }
    const c = this.cam, p = this.player, k = 1 - Math.exp(-dt * 8);
    c.x += (p.x - c.x) * k; c.y += (p.y - c.y) * k;
    c.shake = Math.max(0, c.shake - dt * 30);
    const sh = this.settings.shake ? c.shake : 0;
    c.sx = (Math.random() - 0.5) * sh; c.sy = (Math.random() - 0.5) * sh;
  }

  // ---------------------------------------------------------------- maldiciones (Diamante)
  addCurse(c, name) {
    this.curses.push({ type: c.type, amount: c.amount, t: c.time, max: c.time, name });
    Sfx.play('curse'); this.flash = 0.4;
    this.comicText(this.player.x, this.player.y - 100, '¡MALDICIÓN!', '#b04dff', 30);
  }
  updateCurses(dt) {
    let slow = 1, vuln = 1;
    for (let i = this.curses.length - 1; i >= 0; i--) {
      const c = this.curses[i]; c.t -= dt;
      if (c.t <= 0) { this.curses.splice(i, 1); this.addText(this.player.x, this.player.y - 80, 'Maldición disipada', '#c8b8ff', 13, false); continue; }
      if (c.type === 'slow') slow *= 1 - c.amount; else vuln += c.amount;
    }
    this.curseSlow = slow; this.curseVuln = vuln;
  }

  // ---------------------------------------------------------------- jugador
  updatePlayer(dt) {
    const p = this.player, inp = this.input, st = this.st;
    const mv = inp.move();
    p.inv = Math.max(0, p.inv - dt); p.hurt = Math.max(0, p.hurt - dt); p.muzzle = Math.max(0, p.muzzle - dt);
    p.rootT = Math.max(0, p.rootT - dt);
    for (let i = 0; i < 3; i++) { const h = this.hand[i]; if (h && h.cd > 0) h.cd = Math.max(0, h.cd - dt); }
    const sp = p.rootT > 0 ? 0 : st.speed * this.curseSlow;
    p.moving = (mv.x !== 0 || mv.y !== 0) && sp > 0;
    p.x += mv.x * sp * dt; p.y += mv.y * sp * dt;
    if (p.x < -HALF) p.x = -HALF; if (p.x > HALF) p.x = HALF; if (p.y < -HALF) p.y = -HALF; if (p.y > HALF) p.y = HALF;
    this.collideSolids(p, p.r);
    if (st.regen > 0) { p.regenT += dt; if (p.regenT >= 1) { p.regenT = 0; this.heal(st.regen, true); } }
    // apuntado
    let has = false;
    if (this.settings.aim === 'mouse' && inp.mouse.active && !inp.isTouch) {
      const wx = this.cam.x + (inp.mouse.x - this.w / 2) / this.scale, wy = this.cam.y + (inp.mouse.y - this.h / 2) / this.scale;
      p.aim = Math.atan2(wy - (p.y - 24), wx - p.x); p.aimDist = Math.hypot(wx - p.x, wy - p.y); has = true;
    } else {
      const t = this.nearest(p.x, p.y, this.weapon.range * 1.05, 0);
      if (t) { p.aim = Math.atan2(t.y - t.r - (p.y - 24), t.x - p.x); p.aimDist = Math.sqrt(this.q.bestD); has = true; }
    }
    const ca = Math.cos(p.aim);
    if (ca > 0.15) p.face = 1; else if (ca < -0.15) p.face = -1; else if (mv.x) p.face = mv.x > 0 ? 1 : -1;
    fireWeapon(this, dt, has);
    for (let i = 0; i < 3; i++) if (inp.consume('c' + i)) this.useHand(i);
    if (p.hp / p.maxHp < 0.3) { this.lowBarkT -= dt; if (this.lowBarkT <= 0) { this.lowBarkT = 20; this.say(null, BARKS[this.hero.id].low, 2.2); } }
  }

  useHand(i) {
    const h = this.hand[i];
    if (!h) return;
    if (h.cd > 0) { this.addText(this.player.x, this.player.y - 76, 'Recargando…', '#a8987a', 12, false); return; }
    h.cd = h.card.cd * this.st.cardCd;
    playCard(this, h.card);
    Sfx.play('card');
    if (Math.random() < 0.35) this.say(null, BARKS[this.hero.id].card, 1.6);
    if (h.card.curse) this.addCurse(h.card.curse, h.card.name);
  }

  collideSolids(o, r) {
    for (let i = 0; i < this.traps.length; i++) {
      const t = this.traps[i];
      if (!t.solid || t.dead) continue;
      const dx = o.x - t.x, dy = o.y - t.y, d = Math.hypot(dx, dy), m = t.r + r;
      if (d < m && d > 0.01) { o.x = t.x + (dx / d) * m; o.y = t.y + (dy / d) * m; }
    }
    for (let i = 0; i < this.structs.length; i++) {
      const s = this.structs[i];
      if (s.hp <= 0) continue;
      const dx = o.x - s.x, dy = o.y - s.y, d = Math.hypot(dx, dy), m = s.r + r;
      if (d < m && d > 0.01) { o.x = s.x + (dx / d) * m; o.y = s.y + (dy / d) * m; }
    }
  }

  nearest(x, y, r, excludeUid) {
    const q = this.q; q.x = x; q.y = y; q.best = null; q.bestD = r * r; q.ex = excludeUid;
    this.grid.query(x, y, r, this._nearestFn);
    for (let i = 0; i < this.colossi.length; i++) { const c = this.colossi[i]; if (!c.dead && c.uid !== excludeUid) { const d = (c.x - x) ** 2 + (c.y - y) ** 2; if (d < q.bestD) { q.bestD = d; q.best = c; } } }
    return q.best;
  }

  heal(n, quiet) {
    const p = this.player, b = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + n);
    if (!quiet && p.hp - b >= 1) this.addText(p.x, p.y - 64, '+' + Math.round(p.hp - b), '#8aff6a', 13, false);
  }
  addMaxHp(n) { this.player.maxHp += n; this.player.hp += n; }

  hurtPlayer(dmg, fromTrap = false) {
    const p = this.player;
    if (p.inv > 0 || this.state !== 'play') return;
    if (fromTrap && this.st.trapMaster) return;
    const vulnNoDodge = this.curses.some((c) => c.type === 'vuln');
    if (!vulnNoDodge && Math.random() < this.st.dodge) { p.inv = 0.25; this.addText(p.x, p.y - 70, '¡ESQUIVA!', '#c8b8ff', 13, false); return; }
    const d = Math.max(1, dmg * this.objective.dmgMult * this.curseVuln - this.st.armor);
    p.hp -= d; p.inv = 0.45; p.hurt = 0.3;
    this.cam.shake = Math.max(this.cam.shake, 9);
    this.addText(p.x, p.y - 66, '-' + Math.round(d), '#ff4a3a', 15, false);
    for (let i = 0; i < 6; i++) this.addPart(p.x, p.y - 22, (Math.random() - 0.5) * 220, (Math.random() - 0.5) * 220, 0.5, 3, '#8a0a0a', PT.BLOOD, false);
    Sfx.play('hurt');
    if (p.hp <= 0) { p.hp = 0; this.finish(false); }
  }

  // ---------------------------------------------------------------- horda
  spawnZombie(type, x, y, hpMult = 1, spdMult = 1) {
    const e = this.zombies.get();
    if (!e) return null;
    const d = ZOMBIES[type];
    e.uid = this.uid++; e.type = type; e.def = d; e.x = x; e.y = y; e.vx = 0; e.vy = 0; e.r = d.r;
    e.maxHp = e.hp = Math.round(d.hp * hpMult); e.maxArmor = e.armor = (d.armor || 0) * hpMult;
    e.speed = d.speed * spdMult * (0.88 + Math.random() * 0.24); e.dmg = d.dmg;
    e.colossus = false; e.elite = false; e.spr = this.spr.zombie(type); e.flash = 0; e.burnT = 0; e.burnDps = 0; e.burnTick = 0;
    e.slowT = 0; e.stunT = 0; e.rootT = 0; e.atkT = 0.5 + Math.random(); e.state = 0; e.stateT = 0; e.face = 1; e.target = null;
    e.xp = d.xp; e.soul = d.soul; e.dead = false; e.alpha = 1; e.name = ''; e.hitBy = 0;
    if (this.objective.assignTarget) this.objective.assignTarget(e);
    return e;
  }

  spawnColossus(type, hpMult = 1) {
    const C = COLOSSI[type], p = this.player, e = this.zombies.get();
    if (!e) return null;
    const a = Math.random() * TAU;
    e.uid = this.uid++; e.type = type; e.def = C;
    e.x = Math.max(-HALF + 80, Math.min(HALF - 80, p.x + Math.cos(a) * 460)); e.y = Math.max(-HALF + 80, Math.min(HALF - 80, p.y + Math.sin(a) * 460));
    e.vx = 0; e.vy = 0; e.r = C.r; e.maxHp = e.hp = Math.round(C.hp * hpMult); e.armor = e.maxArmor = 0;
    e.speed = C.speed; e.dmg = C.dmg; e.colossus = true; e.elite = false; e.spr = this.spr.zombie(type);
    e.flash = 0; e.burnT = 0; e.slowT = 0; e.stunT = 0; e.rootT = 0; e.dead = false; e.alpha = 1; e.name = C.name; e.xp = C.xp; e.soul = C.soul;
    e.mode = 'move'; e.modeT = 2.2; e.patIdx = 0; e.subT = 0; e.subN = 0; e.phase = 0; e.ang = 0; e.state = 0; e.target = null; e.tauntT = 4;
    this.colossi.push(e);
    this.showBanner(C.name.toUpperCase(), '¡COLOSO DE ÉLITE!', 2.4);
    this.cam.shake = 16; Sfx.play('boss');
    this.say(e, C.taunts, 2.4, true);
    setTimeout(() => this.running && this.say(null, BARKS[this.hero.id].boss, 2), 1400);
    for (let i = 0; i < 30; i++) this.addPart(e.x, e.y - 30, (Math.random() - 0.5) * 500, (Math.random() - 0.5) * 500, 0.9, 7, '#1a1a1e', PT.SMOKE, false);
    return e;
  }

  // Daño a un zombi. crit ya resuelto. Devuelve true si murió.
  hurtZombie(e, dmg, crit, nx, ny, kb, burn, slow, stun) {
    if (e.dead) return false;
    let d = dmg;
    if (e.armor > 0) {
      const absorbed = d * 0.7; e.armor -= absorbed; d -= absorbed;
      if (e.armor <= 0) { e.armor = 0; this.addText(e.x, e.y - e.r * 3, '¡CORAZA ROTA!', '#c8c8d0', 12, false); for (let i = 0; i < 8; i++) this.addPart(e.x, e.y - 30, (Math.random() - 0.5) * 260, -Math.random() * 200, 0.6, 4, '#8a8a90', PT.DEBRIS, false); }
      else if (Math.random() < 0.3) this.addPart(e.x, e.y - 30, (Math.random() - 0.5) * 160, -Math.random() * 100, 0.3, 3, '#e8e8e8', PT.SPARK, true);
    }
    e.hp -= d; e.flash = 0.08;
    if (kb > 0) { const m = e.colossus ? 0.06 : 1; e.vx += nx * kb * m; e.vy += ny * kb * m; }
    if (burn > 0) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, burn); }
    if (slow > 0) e.slowT = Math.max(e.slowT, slow);
    if (stun > 0 && !e.colossus) e.stunT = Math.max(e.stunT, stun);
    if (crit || d >= 60) this.addText(e.x + (Math.random() - 0.5) * 16, e.y - e.r * 2.8, crit ? Math.round(d) + '!' : '' + Math.round(d), crit ? '#ffd23a' : '#f2e2c0', crit ? 17 : 13, crit);
    if (e.hp <= 0) { this.killZombie(e); return true; }
    Sfx.play('hit');
    return false;
  }

  killZombie(e) {
    e.dead = true; this.kills++;
    Sfx.play('kill');
    this.profileXp += e.soul * 2;
    const souls = e.xp;
    for (let v = souls; v > 0;) { const k = v >= 5 ? 5 : 1; this.drop(e.x, e.y, k === 5 ? PK.BIGSOUL : PK.SOUL, k); v -= k; }
    if (Math.random() < (e.colossus ? 1 : 0.012)) this.drop(e.x, e.y, PK.HEAL, 25);
    for (let i = 0; i < 7; i++) { const a = Math.random() * TAU, s = 60 + Math.random() * 200; this.addPart(e.x, e.y - e.r, Math.cos(a) * s, Math.sin(a) * s, 0.4 + Math.random() * 0.3, 2 + Math.random() * 3, i % 3 ? '#3a0c0a' : '#0a0806', PT.BLOOD, false); }
    this.addDecal(e.x, e.y, e.r * (0.8 + Math.random() * 0.6), Math.random() < 0.5 ? 1 : 0);
    if (e.def.bomb) { this.explode(e.x, e.y, e.def.bomb.r, 90, '#ff8a2a', 1, 0, 300, false); this.explodeHitsPlayer(e.x, e.y, e.def.bomb.r, e.dmg); }
    if (e.def.gas) this.addZone(ZK.GAS, e.x, e.y, e.def.gas.r, e.def.gas.time, e.def.gas.dps, '#9dff3a', 0);
    if (e.colossus) {
      this.cam.shake = 26; this.flash = 1;
      this.comicText(e.x, e.y - 80, '¡KRAKOOM!', '#ffd23a', 46);
      for (let i = 0; i < 10; i++) this.explode(e.x + (Math.random() - 0.5) * 140, e.y + (Math.random() - 0.5) * 120, 60, 0, '#ff8a2a', 1, 0, 0, true);
      this.pendingDrafts++; this.draftLuck = Math.max(this.draftLuck, 2);
    }
    // racha de bajas → bocadillo
    this.killChain++; this.chainT = 2.5;
    if (this.killChain % 30 === 0) this.say(null, BARKS[this.hero.id].streak, 1.6);
    this.holyKills++;
    if (this.objective.onKill) this.objective.onKill(e);
  }

  drop(x, y, kind, value) {
    const it = this.items.get(); if (!it) return;
    const a = Math.random() * TAU, s = 30 + Math.random() * 90;
    it.x = x; it.y = y; it.kind = kind; it.value = value; it.vx = Math.cos(a) * s; it.vy = Math.sin(a) * s; it.mag = false; it.t = 0;
  }

  addDecal(x, y, r, kind) {
    const i = this.decalI * 4;
    this.decals[i] = x; this.decals[i + 1] = y; this.decals[i + 2] = r; this.decals[i + 3] = kind;
    this.decalI = (this.decalI + 1) % 160; this.decalN = Math.min(160, this.decalN + 1);
  }

  // ---------------------------------------------------------------- explosiones
  // owner 1 = del jugador / trampa (daña horda), fromTrap: el Purgador duplica daño y es inmune.
  explode(x, y, r, dmg, color, owner, burn, kb, quiet, fromTrap = false) {
    if (dmg > 0 && owner === 1) {
      const q = this.q; q.x = x; q.y = y; q.r = r; q.dmg = dmg * (fromTrap && this.st.trapMaster ? 2 : 1); q.kb = kb || 220; q.burn = burn || 0; q.stun = 0;
      this.grid.query(x, y, r + 40, this._areaFn);
      for (let i = 0; i < this.colossi.length; i++) this._areaFn(this.colossi[i]);
    }
    explosionVsTraps(this, x, y, r, dmg);
    this.addPart(x, y, 0, 0, 0.2, r * 0.9, '#fff6d0', PT.FLASH, true);
    this.addPart(x, y, 0, 0, 0.4, r * 0.3, color, PT.RING, true).grow = r * 3;
    for (let i = 0; i < 14; i++) { const a = Math.random() * TAU, s = 80 + Math.random() * r * 3; this.addPart(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.3 + Math.random() * 0.4, 3 + Math.random() * 4, i % 2 ? color : '#ffd23a', PT.SPARK, true).drag = 3; }
    for (let i = 0; i < 6; i++) { const a = Math.random() * TAU, s = 20 + Math.random() * 60; const pp = this.addPart(x, y, Math.cos(a) * s, Math.sin(a) * s - 20, 0.8 + Math.random() * 0.6, r * 0.3, '#1a1614', PT.SMOKE, false); pp.grow = r * 0.6; pp.drag = 1.5; }
    this.addDecal(x, y, r * 0.55, 2);
    this.lightPulse(x, y, r * 4, 0.35);
    if (!quiet) {
      Sfx.play('boom');
      this.cam.shake = Math.max(this.cam.shake, Math.min(14, r * 0.12));
      if (Math.random() < 0.35) this.comicText(x, y - r * 0.6, Math.random() < 0.5 ? '¡BOOM!' : '¡KA-BLAM!', color, 24);
    }
  }
  explodeHitsPlayer(x, y, r, dmg, fromTrap = false) {
    const p = this.player;
    if (Math.hypot(p.x - x, p.y - y) < r + p.r) this.hurtPlayer(dmg, fromTrap);
    for (let i = 0; i < this.structs.length; i++) { const s = this.structs[i]; if (s.hp > 0 && Math.hypot(s.x - x, s.y - y) < r + s.r) s.hp -= dmg; }
  }

  lightPulse(x, y, r, life) { const z = this.addZone(ZK.STRIKE, x, y, r, life, 0, '#fff', 2); if (z) z.tick = 2; }

  // ---------------------------------------------------------------- proyectiles
  addBullet(x, y, ang, speed, dmg, r, pierce, life, color, core, kind, kb) {
    const b = this.bullets.get(); if (!b) return null;
    b.x = x; b.y = y; b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed; b.r = r; b.dmg = dmg; b.crit = false;
    b.pierce = pierce + this.st.pierce; b.life = life; b.color = color; b.core = core; b.kind = kind; b.kb = kb; b.hits.length = 0;
    b.chain = this.st.chain; b.homing = 0; b.burn = this.st.burnOnHit; b.slow = this.st.slowOnHit; b.stun = 0; b.radius = 0;
    b.len = kind === BK.RIFLE || kind === BK.HARPOON ? 28 : kind === BK.PELLET ? 8 : 14; b.spin = 0; b.ox = x; b.oy = y;
    return b;
  }

  updateBullets(dt) {
    const B = this.bullets.items;
    for (let i = this.bullets.n - 1; i >= 0; i--) {
      const b = B[i];
      if (b.kind === BK.LOB) {
        b.spin += dt; const k = Math.min(1, b.spin / b.life);
        b.x = b.ox + (b.vx - b.ox) * k; b.y = b.oy + (b.vy - b.oy) * k;
        if (k >= 1) {
          if (b.burn > 0) this.addZone(ZK.FIRE, b.x, b.y, b.radius, 7, b.burn, '#ff6a1a', 1);
          else this.explode(b.x, b.y, b.radius, b.dmg, this.pal.glow, 1, 0, 320, false);
          this.bullets.kill(i);
        }
        continue;
      }
      b.life -= dt; b.spin += dt * 18;
      if (b.homing > 0) {
        const t = this.nearest(b.x, b.y, 260, 0);
        if (t) {
          const a = Math.atan2(t.y - t.r - b.y, t.x - b.x), cur = Math.atan2(b.vy, b.vx);
          let d = a - cur; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
          const na = cur + Math.max(-b.homing * dt, Math.min(b.homing * dt, d)), sp = Math.hypot(b.vx, b.vy);
          b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
        }
      }
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -HALF - 200 || b.x > HALF + 200 || b.y < -HALF - 200 || b.y > HALF + 200) { this.bullets.kill(i); continue; }
      if (bulletVsTraps(this, b)) { this.bullets.kill(i); continue; }
      if (this.bulletHits(b)) this.bullets.kill(i);
    }
  }

  bulletHits(b) {
    const g = this.grid, h = g.half, cs = g.cell, cols = g.cols;
    const cx0 = Math.max(0, ((b.x - 40 + h) / cs) | 0), cx1 = Math.min(cols - 1, ((b.x + 40 + h) / cs) | 0);
    const cy0 = Math.max(0, ((b.y - 40 + h) / cs) | 0), cy1 = Math.min(cols - 1, ((b.y + 40 + h) / cs) | 0);
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      const c = g.cells[cy * cols + cx];
      for (let k = 0; k < c.length; k++) {
        const e = c[k];
        if (e.dead) continue;
        const dx = e.x - b.x, dy = (e.y - e.r) - b.y, rr = e.r + b.r;
        if (dx * dx + dy * dy > rr * rr || b.hits.indexOf(e.uid) !== -1) continue;
        if (this.applyHit(b, e)) return true;
      }
    }
    for (let i = 0; i < this.colossi.length; i++) {
      const e = this.colossi[i];
      if (e.dead) continue;
      const dx = e.x - b.x, dy = (e.y - e.r) - b.y, rr = e.r + b.r;
      if (dx * dx + dy * dy < rr * rr && b.hits.indexOf(e.uid) === -1 && this.applyHit(b, e)) return true;
    }
    return false;
  }

  applyHit(b, e) {
    const st = this.st, p = this.player;
    const dist = Math.hypot(e.x - p.x, e.y - p.y);
    let crit = b.crit || Math.random() < st.crit + (this.weapon.critBonus || 0);
    let mult = st.dmg;
    if (dist < 170 && st.closeBonus) mult *= 1 + st.closeBonus;
    let cm = st.critMult;
    if (st.farCrit) cm *= 1 + Math.min(1, dist / 600) * 0.6;
    const dmg = b.dmg * mult * (crit ? cm : 1);
    const sp = Math.hypot(b.vx, b.vy) || 1;
    this.hurtZombie(e, dmg, crit, b.vx / sp, b.vy / sp, b.kb, b.burn, b.slow, b.stun);
    if (crit && st.critExplode) this.explode(e.x, e.y - e.r, 55 + 10 * st.critExplode, dmg * 0.4, '#ff4a8a', 1, 0, 160, true);
    if (b.kind === BK.HARPOON && b.radius > 0) { this.explode(b.x, b.y, b.radius, b.dmg * st.dmg * 0.6, this.pal.glow, 1, 0, 300, false); b.radius = 0; }
    this.addPart(b.x, b.y, -b.vx * 0.15 + (Math.random() - 0.5) * 80, -b.vy * 0.15 + (Math.random() - 0.5) * 80, 0.15, 4, b.color, PT.SPARK, true);
    if (b.hits.length < 16) b.hits.push(e.uid);
    if (b.chain > 0) {
      const t = this.nearest(e.x, e.y, 240, e.uid);
      if (t && b.hits.indexOf(t.uid) === -1) {
        b.chain--; b.x = e.x; b.y = e.y - e.r;
        const a = Math.atan2(t.y - t.r - b.y, t.x - b.x); b.vx = Math.cos(a) * sp; b.vy = Math.sin(a) * sp; b.life = Math.max(b.life, 0.4);
        return false;
      }
    }
    if (b.pierce > 0) { b.pierce--; b.dmg *= 0.88; return false; }
    return true;
  }

  addEBullet(x, y, ang, speed, dmg, r, life, color, kind) {
    const b = this.ebullets.get(); if (!b) return null;
    b.x = x; b.y = y; b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed; b.dmg = dmg; b.r = r; b.life = life; b.color = color; b.kind = kind; b.t = 0; b.homing = 0; b.radius = 0;
    return b;
  }
  addLob(x, y, tx, ty, time, dmg, radius, color, gas = false) {
    const b = this.ebullets.get(); if (!b) return null;
    b.x = b.sx = x; b.y = b.sy = y; b.tx = tx; b.ty = ty; b.tmax = time; b.t = 0; b.dmg = dmg; b.radius = radius; b.color = color; b.kind = EK.LOB; b.r = 8; b.life = 99; b.homing = gas ? 1 : 0;
    this.addZone(ZK.BOMB, tx, ty, radius, time, 0, color, 0);
    return b;
  }

  updateEBullets(dt) {
    const B = this.ebullets.items, p = this.player;
    for (let i = this.ebullets.n - 1; i >= 0; i--) {
      const b = B[i];
      if (b.kind === EK.LOB) {
        b.t += dt; const k = Math.min(1, b.t / b.tmax);
        b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k;
        if (k >= 1) {
          if (b.homing) this.addZone(ZK.GAS, b.x, b.y, b.radius, 4, b.dmg * 0.6, '#9dff3a', 0);
          else { this.explode(b.x, b.y, b.radius, 0, b.color, 0, 0, 0, false); this.explodeHitsPlayer(b.x, b.y, b.radius, b.dmg); }
          this.ebullets.kill(i);
        }
        continue;
      }
      if (b.homing > 0) {
        const a = Math.atan2(p.y - 20 - b.y, p.x - b.x), cur = Math.atan2(b.vy, b.vx);
        let d = a - cur; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU;
        const na = cur + Math.max(-b.homing * dt, Math.min(b.homing * dt, d)), sp = Math.hypot(b.vx, b.vy);
        b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
      }
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; b.t += dt;
      if (b.life <= 0) { this.ebullets.kill(i); continue; }
      // las coberturas detienen los proyectiles enemigos
      let blocked = false;
      for (let k = 0; k < this.traps.length; k++) { const t = this.traps[k]; if (t.solid && !t.dead && Math.abs(t.x - b.x) < t.r && Math.abs(t.y - 20 - b.y) < t.r * 0.8) { t.hp -= b.dmg; t.flash = 0.1; blocked = true; break; } }
      if (blocked) { this.addPart(b.x, b.y, 0, -40, 0.3, 4, '#c8a878', PT.SPLINTER, false); this.ebullets.kill(i); continue; }
      const dx = p.x - b.x, dy = (p.y - 22) - b.y, rr = p.r + b.r;
      if (dx * dx + dy * dy < rr * rr && p.inv <= 0) { this.hurtPlayer(b.dmg); this.ebullets.kill(i); }
    }
  }

  // ---------------------------------------------------------------- zonas
  addZone(kind, x, y, r, life, dmg, color, owner) {
    const z = this.zones.get(); if (!z) return null;
    z.uid = this.uid++; z.kind = kind; z.x = x; z.y = y; z.r = r; z.maxR = r; z.life = 0; z.max = life; z.dmg = dmg; z.color = color; z.tick = 0; z.owner = owner; z.ang = 0; z.len = 0; z.vx = 0; z.vy = 0;
    return z;
  }

  updateZones(dt) {
    const Z = this.zones.items, p = this.player;
    for (let i = this.zones.n - 1; i >= 0; i--) {
      const z = Z[i]; z.life += dt;
      switch (z.kind) {
        case ZK.FIRE: case ZK.GAS: {
          z.tick -= dt;
          if (z.tick <= 0) {
            z.tick = 0.33;
            const q = this.q; q.x = z.x; q.y = z.y; q.r = z.r; q.dmg = z.dmg * 0.33 * (z.kind === ZK.GAS ? 1 : (this.st.trapMaster ? 2 : 1)); q.kb = 0; q.burn = z.kind === ZK.FIRE ? 4 : 0; q.stun = 0;
            if (z.kind === ZK.FIRE || z.owner === 1) { this.grid.query(z.x, z.y, z.r + 20, this._areaFn); for (const c of this.colossi) this._areaFn(c); }
            if (Math.hypot(p.x - z.x, p.y - z.y) < z.r * 0.9) this.hurtPlayer(z.kind === ZK.GAS ? z.dmg * 0.6 : 8, z.kind === ZK.FIRE);
          }
          if (Math.random() < dt * 18) this.addPart(z.x + (Math.random() - 0.5) * z.r * 1.6, z.y + (Math.random() - 0.5) * z.r, 0, -40 - Math.random() * 50, 0.6, 4, z.kind === ZK.GAS ? '#9dff3a' : (Math.random() < 0.5 ? '#ff6a1a' : '#ffd23a'), PT.EMBER, true);
          break;
        }
        case ZK.RING: {
          z.r = z.maxR * (z.life / z.max);
          const q = this.q; q.x = z.x; q.y = z.y; q.r = z.r; q.dmg = z.dmg * dt * 3; q.kb = 300 * dt * 3; q.burn = 6; q.stun = 0;
          this.grid.query(z.x, z.y, z.r + 30, this._areaFn);
          break;
        }
        case ZK.STRIKE:
          if (z.tick === 0 && z.life >= z.max) { z.tick = 1; this.explode(z.x, z.y, z.r, z.dmg, z.color, 1, 8, 260, Math.random() < 0.5); }
          break;
        case ZK.POOL:
          if (z.life > 0.8 && Math.hypot(p.x - z.x, p.y - z.y) < z.r) { z.tick -= dt; if (z.tick <= 0) { z.tick = 0.5; this.hurtPlayer(z.dmg); } }
          break;
        case ZK.SLAM:
          if (z.tick === 0 && z.life >= z.max) { z.tick = 1; this.explode(z.x, z.y, z.r, 0, z.color, 0, 0, 0, false); this.explodeHitsPlayer(z.x, z.y, z.r, z.dmg); }
          break;
        case ZK.TRAIN: case ZK.RIDERS: {
          z.x += z.vx * dt;
          const q = this.q; q.x = z.x; q.y = z.y; q.r = z.r; q.dmg = z.dmg; q.kb = 700; q.burn = 0; q.stun = 0.5;
          this.grid.query(z.x, z.y, z.r + 30, this._areaFn);
          for (const c of this.colossi) if (!c.dead && Math.hypot(c.x - z.x, c.y - z.y) < z.r + c.r && c.hitBy !== z.uid) { c.hitBy = z.uid; this.hurtZombie(c, z.dmg * 4, false, 0, 0, 0, 0, 0, 0); }
          if (Math.random() < 0.6) this.addPart(z.x - Math.sign(z.vx) * z.r, z.y, -z.vx * 0.2, (Math.random() - 0.5) * 80, 0.6, 10, '#9ab8d8', PT.SMOKE, false).grow = 20;
          break;
        }
        default: break;
      }
      const extra = (z.kind === ZK.STRIKE || z.kind === ZK.SLAM) ? 0.15 : 0;
      if (z.life >= z.max + extra) this.zones.kill(i);
    }
  }

  // ---------------------------------------------------------------- almas (XP de partida) y sorteos
  updateItems(dt) {
    const I = this.items.items, p = this.player, R = this.st.pickup, R2 = R * R;
    for (let i = this.items.n - 1; i >= 0; i--) {
      const it = I[i]; it.t += dt;
      const dx = p.x - it.x, dy = (p.y - 16) - it.y, d2 = dx * dx + dy * dy;
      if (!it.mag && (d2 < R2 || this.state === 'over')) it.mag = true;
      if (it.mag) {
        const d = Math.sqrt(d2) || 1, sp = 520 + it.t * 200;
        it.vx = dx / d * sp; it.vy = dy / d * sp;
        if (d < 18) { this.collect(it); this.items.kill(i); continue; }
      } else { it.vx *= 1 - 5 * dt; it.vy *= 1 - 5 * dt; }
      it.x += it.vx * dt; it.y += it.vy * dt;
      if (it.t > 50) this.items.kill(i);
    }
  }

  collect(it) {
    if (it.kind === PK.HEAL) { this.heal(it.value); return; }
    this.souls += it.value; Sfx.play('xp');
    while (this.souls >= this.nextSouls) { this.souls -= this.nextSouls; this.level++; this.nextSouls = this.soulsFor(this.level); this.pendingDrafts++; }
  }
  soulsFor(l) { return Math.round(7 + l * 6 + Math.pow(l, 1.55) * 1.6); }

  openDraft() {
    this.pendingDrafts--;
    this.state = 'draft'; Sfx.play('level');
    this.cb.onDraft(this.rollDraft(this.draftLuck), this.draftLuck > 0 ? 'bonus' : 'level');
    this.draftLuck = 0;
  }

  rollDraft(bonus) {
    const luck = this.st.luck + bonus + Math.min(1.5, this.level * 0.05);
    const picked = [], ids = new Set();
    let guard = 0;
    while (picked.length < 3 && guard++ < 60) {
      const r = rollRarity(luck);
      const pool = CARDS.filter((c) => c.r === r && !ids.has(c.id) && !(c.t === 'action' && this.hand.some((h) => h && h.card.id === c.id)));
      if (!pool.length) continue;
      const c = pool[(Math.random() * pool.length) | 0];
      ids.add(c.id); picked.push(c);
    }
    return picked;
  }

  // Aplica la carta elegida (desde la UI) y reanuda.
  takeCard(card) {
    this.deck++;
    if (card.t === 'action') {
      let slot = this.hand.findIndex((h) => !h);
      if (slot === -1) { // sustituye la de menor rareza (nunca la carta de firma del espacio 1)
        slot = 1; if (this.hand[2].card.r < this.hand[1].card.r) slot = 2;
      }
      this.hand[slot] = { card, cd: 0 };
    } else {
      card.apply(this);
      if (card.curse) this.addCurse(card.curse, card.name);
    }
    if (card.r === 4) { this.flash = 0.8; this.comicText(this.player.x, this.player.y - 110, '¡PACTO SELLADO!', '#d0a8ff', 30); }
    this.state = 'play'; this.last = performance.now();
  }

  // ---------------------------------------------------------------- bocadillos flotantes
  say(entity, lines, time = 2, scream = false) {
    const text = Array.isArray(lines) ? lines[(Math.random() * lines.length) | 0] : lines;
    let b = this.bubbles.find((x) => !x.on);
    if (!b) b = this.bubbles[0];
    b.on = true; b.follow = entity; b.uid = entity ? entity.uid : 0; b.text = text; b.life = 0; b.max = time; b.scream = scream;
    if (entity && !scream) Sfx.play('groan');
  }
  updateBubbles(dt) {
    this.chainT -= dt; if (this.chainT <= 0) this.killChain = 0;
    for (const b of this.bubbles) {
      if (!b.on) continue;
      b.life += dt;
      if (b.follow && (b.follow.dead || b.follow.uid !== b.uid)) b.follow = null;
      const src = b.follow || (b.uid === 0 ? this.player : null);
      if (src) { b.x = src.x; b.y = src.y - (src.spr ? src.spr.oy : 70) - 14; }
      if (b.life >= b.max) b.on = false;
    }
    // gruñidos aleatorios de la horda
    this.groanT -= dt;
    if (this.groanT <= 0 && this.zombies.n) {
      this.groanT = 3 + Math.random() * 3;
      const e = this.zombies.items[(Math.random() * this.zombies.n) | 0];
      if (!e.dead && !e.colossus && Math.abs(e.x - this.cam.x) < this.viewW / 2 && Math.abs(e.y - this.cam.y) < this.viewH / 2) this.say(e, BARKS.zombie, 1.4);
    }
  }

  // ---------------------------------------------------------------- fx
  addPart(x, y, vx, vy, life, size, color, kind, add) {
    const p = this.parts.get() || this.parts.items[(Math.random() * this.parts.n) | 0];
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = 0; p.max = life; p.size = size; p.color = color; p.kind = kind; p.grow = 0; p.drag = 0; p.add = add;
    return p;
  }
  addText(x, y, str, color, size, big) {
    const t = this.texts.get(); if (!t) return;
    t.x = x; t.y = y; t.vy = -60; t.life = 0; t.max = big ? 1.1 : 0.75; t.str = str; t.color = color; t.size = size; t.big = big;
  }
  comicText(x, y, str, color, size) {
    const t = this.texts.get(); if (!t) return;
    t.x = x; t.y = y; t.vy = -30; t.life = 0; t.max = 1.2; t.str = str; t.color = color; t.size = size; t.big = true;
  }
  showBanner(title, sub, t) { this.banner = { title, sub, t, max: t }; }

  // ---------------------------------------------------------------- fin
  finish(win) {
    if (this.state === 'over') return;
    this.state = 'over'; this.endT = win ? 2.2 : 2.0;
    if (win) { Sfx.play('win'); this.showBanner('¡CASO CERRADO!', '', 2.5); this.flash = 0.6; }
    else { Sfx.play('lose'); this.showBanner('FINAL TRÁGICO', '', 2.5); }
    const o = this.objective;
    if (win && this.mission) this.profileXp += this.mission.reward;
    this.result = {
      mode: this.modeId, win, missionId: this.mission ? this.mission.id : null, round: o.round || 0, kills: this.kills,
      time: this.time, level: this.level, profileXp: Math.round(this.profileXp), deck: this.deck,
      killer: o.killerName ? o.killerName() : '',
    };
  }
}
