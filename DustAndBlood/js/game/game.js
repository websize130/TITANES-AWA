// Núcleo del juego: bucle a 60 FPS, pools sin basura, daño, botín, Racha de Pólvora, niveles y fin de misión.
import { Pool, Grid } from './pool.js';
import { SpriteCache } from '../art/spriteCache.js';
import { makeGroundTile, THEMES } from '../art/propArt.js';
import { makeRng } from '../art/comic.js';
import { ENEMIES, ELITE, BOSSES } from '../data/enemies.js';
import { weaponById } from '../data/weapons.js';
import { REPLAY_FACTOR } from '../data/campaign.js';
import { Sfx } from '../core/audio.js';
import { fireWeapon, useAbility, useUltimate, updateUltimate, updateTurrets, rollUpgrades } from './combat.js';
import { updateEnemies } from './ai.js';
import { createObjective, createMods } from './missions.js';
import { renderGame } from './render.js';

export const HALF = 1300;
const TAU = Math.PI * 2;

const mkEnemy = () => ({
  uid: 0, type: '', def: null, x: 0, y: 0, vx: 0, vy: 0, r: 10, hp: 1, maxHp: 1, speed: 0, dmg: 0,
  elite: false, boss: false, bossId: '', spr: null, flash: 0, burnT: 0, burnDps: 0, burnTick: 0, slowT: 0,
  atkT: 0, state: 0, stateT: 0, ax: 0, ay: 0, face: 1, targetStruct: null, xp: 1, coin: 0, combo: 1,
  shots: 0, ringHit: 0, tag: '', phase: 0, mode: '', modeT: 0, patIdx: 0, subT: 0, subN: 0, alpha: 1,
  dead: false, name: '', ang: 0, spd: 1, summonT: 0,
});
const mkBullet = () => ({
  x: 0, y: 0, vx: 0, vy: 0, r: 3, dmg: 0, pierce: 0, life: 0, color: '#fff', core: '#fff', kind: 0, kb: 0, crit: false,
  hits: [], radius: 0, fire: 0, sx: 0, sy: 0, tx: 0, ty: 0, t: 0, tmax: 0, heal: 0, burn: 0, slow: 0, len: 10,
});
const mkEBullet = () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 5, dmg: 0, life: 0, color: '#fff', kind: 0, t: 0, tmax: 0, sx: 0, sy: 0, tx: 0, ty: 0, radius: 0, homing: 0 });
const mkPart = () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff', kind: 0, grow: 0, drag: 0, add: true });
const mkText = () => ({ x: 0, y: 0, vy: 0, life: 0, max: 1, str: '', color: '#fff', size: 14, big: false });
const mkPickup = () => ({ x: 0, y: 0, kind: 0, value: 0, vx: 0, vy: 0, mag: false, t: 0 });
const mkZone = () => ({ uid: 0, kind: 0, x: 0, y: 0, r: 0, maxR: 0, life: 0, max: 0, dmg: 0, color: '#fff', tick: 0, delay: 0, owner: 0, ang: 0, len: 0 });

// Tipos numéricos (evitan comparar strings en caliente)
export const BK = { BULLET: 0, PELLET: 1, RIFLE: 2, GRENADE: 3, BOLT: 4, FIRE: 5 };
export const EK = { ORB: 0, FAST: 1, LOB: 2, SKULL: 3 };
export const PK = { XP: 0, COIN: 1, HEAL: 2, CRYSTAL: 3 };
export const PT = { SPARK: 0, SMOKE: 1, BLOOD: 2, RING: 3, FLASH: 4, EMBER: 5, DEBRIS: 6 };
export const ZK = { FIRE: 0, RING: 1, STRIKE: 2, POOL: 3, METEOR: 4, LIGHTNING: 5, SLAM: 6, CHARGE: 7, BOMB: 8 };

export class Game {
  constructor(canvas, input, cb) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    this.input = input;
    this.cb = cb; // { onEnd(result), onLevelUp(choices), onPause() }
    this.enemies = new Pool(mkEnemy, 340);
    this.bullets = new Pool(mkBullet, 500);
    this.ebullets = new Pool(mkEBullet, 450);
    this.parts = new Pool(mkPart, 900);
    this.texts = new Pool(mkText, 70);
    this.pickups = new Pool(mkPickup, 500);
    this.zones = new Pool(mkZone, 140);
    this.grid = new Grid(HALF + 200, 80);
    this.decals = new Float32Array(160 * 4); this.decalN = 0; this.decalI = 0;
    this.structs = [];
    this.turrets = [];
    this.props = [];
    this.uid = 1;
    this.running = false;
    this._raf = 0;
    this._loop = (ts) => this.frame(ts);
    this.player = { x: 0, y: 0, r: 15, hp: 100, maxHp: 100, face: 1, inv: 0, hurt: 0, aim: 0, fireT: 0, alt: 0, dashT: 0, dvx: 0, dvy: 0, abilityCd: 0, aimDist: 300, moving: false, muzzle: 0, spin: 0, regen: 0 };
    this.cam = { x: 0, y: 0, shake: 0, sx: 0, sy: 0 };
    this.combo = { value: 0, timer: 0, kills: 0, best: 0, ready: false, mult: 1, flash: 0 };
    this.q = { x: 0, y: 0, r: 0, best: null, bestD: 0, dmg: 0, kb: 0, color: '', owner: 0, burn: 0, count: 0 };
    this._nearestFn = (e) => {
      if (e.dead) return false;
      const dx = e.x - this.q.x, dy = e.y - this.q.y, d = dx * dx + dy * dy;
      if (d < this.q.bestD) { this.q.bestD = d; this.q.best = e; }
      return false;
    };
    this._explodeFn = (e) => {
      if (e.dead) return false;
      const q = this.q, dx = e.x - q.x, dy = e.y - q.y, d = Math.hypot(dx, dy);
      if (d < q.r + e.r) {
        const k = 1 - Math.min(1, d / (q.r + e.r)) * 0.5;
        this.hurtEnemy(e, q.dmg * k, false, dx / (d || 1), dy / (d || 1), q.kb, q.burn, 0);
      }
      return false;
    };
    this._ring = null;
    this._ringFn = (e) => {
      const z = this._ring;
      if (e.dead || e.ringHit === z.uid) return false;
      const dx = e.x - z.x, dy = e.y - z.y, d = Math.hypot(dx, dy);
      if (Math.abs(d - z.r) < 34 + e.r) {
        e.ringHit = z.uid;
        this.hurtEnemy(e, z.dmg, false, dx / (d || 1), dy / (d || 1), 380, 10 * this.st.dmg, 1.5);
      }
      return false;
    };
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    this.dpr = dpr; this.w = w; this.h = h;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    // ~700 unidades de mundo en el lado corto
    this.scale = Math.max(0.55, Math.min(w, h) / 700);
    if (Math.max(w, h) / this.scale > 1500) this.scale = Math.max(w, h) / 1500;
    this.viewW = w / this.scale; this.viewH = h / this.scale;
    this.hudDirty = true;
  }

  // ---------------------------------------------------------------- inicio
  start(cfg) {
    const { mission, hero, skin, weaponId, weaponLvl, settings } = cfg;
    this.mission = mission; this.scenario = mission.scenario; this.hero = hero; this.skinIdx = skin;
    this.pal = hero.skins[skin].pal; this.settings = settings;
    this.weapon = weaponById(weaponId); this.weaponLvl = weaponLvl;
    this.theme = this.scenario.theme;
    const res = Math.max(1.5, Math.min(3, this.scale * this.dpr));
    if (!this.cache || Math.abs(this.cache.res - res) > 0.01) this.cache = new SpriteCache(res);
    this.groundPattern = this.ctx.createPattern(makeGroundTile(this.theme), 'repeat');

    for (const P of [this.enemies, this.bullets, this.ebullets, this.parts, this.texts, this.pickups, this.zones]) P.clear();
    this.structs.length = 0; this.turrets.length = 0; this.decalN = 0; this.decalI = 0;
    this.time = 0; this.realTime = 0; this.kills = 0; this.coinsRun = 0; this.level = 1; this.xp = 0; this.nextXp = this.xpFor(1);
    this.pendingLevels = 0; this.state = 'play'; this.endT = 0; this.result = null; this.banner = null;
    this.spawnAcc = 0; this.boss = null; this.bossAlive = false; this.slowmo = 0; this.enemyScale = 1; this.flash = 0; this.ult = null;
    this.combo.value = 0; this.combo.timer = 0; this.combo.kills = 0; this.combo.best = 0; this.combo.ready = false; this.combo.mult = 1;
    this.eliteKills = 0; this.upTaken = {};

    const s = hero.stats;
    this.st = {
      dmg: s.damage, rate: 1, speed: s.speed, crit: s.crit, critMult: s.critMult, kb: s.knockback, armor: s.armor,
      pickup: 90 * s.pickup, explosive: s.explosive, elemental: s.elemental, pierce: 0, extra: 0, cdMult: 1, regen: 0,
    };
    const p = this.player;
    p.maxHp = s.hp; p.hp = s.hp; p.x = 0; p.y = 160; p.inv = 1.5; p.hurt = 0; p.fireT = 0.3; p.alt = 0; p.dashT = 0;
    p.abilityCd = 0; p.face = 1; p.muzzle = 0; p.spin = 0; p.regen = 0; p.aim = -Math.PI / 2;
    this.cam.x = p.x; this.cam.y = p.y; this.cam.shake = 0;

    this.mods = createMods(this, mission.mods || []);
    this.noHeal = this.mods.has('noHeal');
    this.buildProps();
    this.objective = createObjective(this, mission.obj);
    this.prewarm();
    this.showBanner(mission.name.toUpperCase(), mission.brief, 3.2);
    this.input.attach();
    this.running = true;
    this.last = performance.now();
    cancelAnimationFrame(this._raf);
    this._raf = requestAnimationFrame(this._loop);
  }

  prewarm() {
    const c = this.cache;
    c.hero(this.hero.id, this.pal);
    for (const t of Object.keys(this.mission.spawn)) c.enemy(t);
    if (this.mission.obj.type === 'elites') c.enemy(this.mission.obj.enemy, true);
    if (this.mission.obj.boss) c.enemy(this.mission.obj.boss);
    for (const col of [this.pal.shot, this.pal.glow, this.pal.shotAlt || this.pal.glow, '#ff8a2a', '#b04dff', '#9dff3a', '#ffffff', '#ff2a2a', '#7fd8ff', '#ffd24a', '#e6ff3a', '#ff4a12', '#7fffd4'])
      c.glow(col);
  }

  buildProps() {
    this.props.length = 0;
    const T = THEMES[this.theme];
    const r = makeRng(this.mission.index * 7919 + 17);
    const N = 150;
    for (let i = 0; i < N; i++) {
      const type = T.props[(r() * T.props.length) | 0];
      const x = (r() * 2 - 1) * (HALF - 60), y = (r() * 2 - 1) * (HALF - 60);
      if (Math.hypot(x, y - 160) < 220) continue;
      if (type === 'building' && Math.abs(x) < HALF - 300 && Math.abs(y) < HALF - 300) continue; // edificios en las afueras
      this.props.push({ x, y, spr: this.cache.prop(type) });
    }
    // anillo de rocas/vallas en el borde
    const edge = this.theme === 'cemetery' ? 'fence' : this.theme === 'town' ? 'fence' : 'rock';
    for (let a = 0; a < TAU; a += 0.09) {
      const x = Math.cos(a) * 1, y = Math.sin(a) * 1;
      const k = 1 / Math.max(Math.abs(x), Math.abs(y));
      this.props.push({ x: x * k * (HALF + 30), y: y * k * (HALF + 30), spr: this.cache.prop(edge) });
    }
    this.props.sort((a, b) => a.y - b.y);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this._raf);
    this.input.detach();
  }

  pause(v) {
    if (!this.running || this.state === 'over') return;
    if (v && this.state === 'play') { this.state = 'paused'; this.cb.onPause(true); }
    else if (!v && this.state === 'paused') { this.state = 'play'; this.last = performance.now(); this.cb.onPause(false); }
  }

  resumeFromLevelUp() {
    this.pendingLevels--;
    if (this.pendingLevels > 0) { this.cb.onLevelUp(rollUpgrades(this)); return; }
    this.state = 'play'; this.last = performance.now();
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
    if (this.state === 'over') {
      this.endT -= dt;
      this.updatePickups(dt);
      this.updateFx(dt);
      if (this.endT <= 0 && this.result) { const r = this.result; this.result = null; this.stop(); this.cb.onEnd(r); }
      return;
    }
    this.time += dt;
    this.slowmo = Math.max(0, this.slowmo - dt);
    this.enemyScale = this.slowmo > 0 ? 0.25 : 1;
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }

    this.updatePlayer(dt);
    updateEnemies(this, dt);
    this.updateBullets(dt);
    this.updateEBullets(dt * this.enemyScale);
    this.updateZones(dt);
    updateTurrets(this, dt);
    updateUltimate(this, dt);
    this.updatePickups(dt);
    this.updateCombo(dt);
    this.mods.update(dt);
    this.objective.update(dt);
    this.spawner(dt);
    this.updateFx(dt);

    if (this.objective.failed) this.finish(false, this.objective.failReason);
    else if (this.objective.done) this.finish(true);
  }

  updateFx(dt) {
    const P = this.parts.items;
    for (let i = this.parts.n - 1; i >= 0; i--) {
      const p = P[i];
      p.life += dt;
      if (p.life >= p.max) { this.parts.kill(i); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.drag) { const k = 1 - p.drag * dt; p.vx *= k; p.vy *= k; }
      p.size += p.grow * dt;
    }
    const T = this.texts.items;
    for (let i = this.texts.n - 1; i >= 0; i--) {
      const t = T[i]; t.life += dt; t.y += t.vy * dt; t.vy *= 1 - 2 * dt;
      if (t.life >= t.max) this.texts.kill(i);
    }
    const c = this.cam, p = this.player;
    const k = 1 - Math.exp(-dt * 8);
    c.x += (p.x - c.x) * k; c.y += (p.y - c.y) * k;
    c.shake = Math.max(0, c.shake - dt * 30);
    const sh = this.settings.shake ? c.shake : 0;
    c.sx = (Math.random() - 0.5) * sh; c.sy = (Math.random() - 0.5) * sh;
  }

  // ---------------------------------------------------------------- jugador
  updatePlayer(dt) {
    const p = this.player, inp = this.input, st = this.st;
    const mv = inp.move();
    p.inv = Math.max(0, p.inv - dt); p.hurt = Math.max(0, p.hurt - dt); p.muzzle = Math.max(0, p.muzzle - dt);
    p.abilityCd = Math.max(0, p.abilityCd - dt);
    let vx, vy;
    if (p.dashT > 0) { p.dashT -= dt; vx = p.dvx; vy = p.dvy; }
    else { vx = mv.x * st.speed; vy = mv.y * st.speed; }
    p.moving = mv.x !== 0 || mv.y !== 0 || p.dashT > 0;
    p.x += vx * dt; p.y += vy * dt;
    if (p.x < -HALF) p.x = -HALF; if (p.x > HALF) p.x = HALF;
    if (p.y < -HALF) p.y = -HALF; if (p.y > HALF) p.y = HALF;
    // colisión con estructuras sólidas
    for (let i = 0; i < this.structs.length; i++) {
      const s = this.structs[i];
      if (!s.solid || s.hp <= 0) continue;
      const dx = p.x - s.x, dy = p.y - s.y, d = Math.hypot(dx, dy), m = s.r + p.r;
      if (d < m && d > 0.01) { p.x = s.x + (dx / d) * m; p.y = s.y + (dy / d) * m; }
    }
    if (st.regen > 0 && !this.noHeal) { p.regen += dt; if (p.regen >= 1) { p.regen = 0; this.heal(st.regen); } }

    // apuntado: ratón (si está activo y el ajuste lo permite) o auto al más cercano
    const useMouse = this.settings.aim === 'mouse' && inp.mouse.active && !inp.isTouch;
    let hasTarget = false;
    if (useMouse) {
      const wx = this.cam.x + (inp.mouse.x - this.w / 2) / this.scale;
      const wy = this.cam.y + (inp.mouse.y - this.h / 2) / this.scale;
      p.aim = Math.atan2(wy - p.y, wx - p.x);
      p.aimDist = Math.hypot(wx - p.x, wy - p.y);
      hasTarget = true;
    } else {
      const t = this.nearestEnemy(p.x, p.y, this.weaponRange() * 1.05);
      if (t) {
        // ligera anticipación
        const lead = Math.hypot(t.x - p.x, t.y - p.y) / 900;
        p.aim = Math.atan2(t.y + t.vy * lead * 0.1 - p.y, t.x - p.x);
        p.aimDist = Math.sqrt(this.q.bestD);
        hasTarget = true;
      }
    }
    if (Math.cos(p.aim) > 0.15) p.face = 1; else if (Math.cos(p.aim) < -0.15) p.face = -1;
    else if (mv.x) p.face = mv.x > 0 ? 1 : -1;
    fireWeapon(this, dt, hasTarget);

    if (inp.consume('ability') && p.abilityCd <= 0) useAbility(this);
    if (inp.consume('ultimate')) {
      if (this.combo.ready) useUltimate(this);
      else this.addText(p.x, p.y - 70, 'RACHA INCOMPLETA', '#c9a27a', 12, false);
    }
  }

  weaponRange() { return this.weapon.levels[this.weaponLvl - 1].range; }

  nearestEnemy(x, y, r) {
    const q = this.q; q.x = x; q.y = y; q.best = null; q.bestD = r * r;
    this.grid.query(x, y, r, this._nearestFn);
    if (this.boss && !this.boss.dead) {
      const d = (this.boss.x - x) ** 2 + (this.boss.y - y) ** 2;
      if (d < q.bestD) { q.best = this.boss; q.bestD = d; }
    }
    // estructuras destructibles como objetivo secundario
    if (!q.best) {
      for (let i = 0; i < this.structs.length; i++) {
        const s = this.structs[i];
        if (!s.targetable || s.hp <= 0) continue;
        const d = (s.x - x) ** 2 + (s.y - y) ** 2;
        if (d < q.bestD) { q.bestD = d; q.best = s; }
      }
    }
    return q.best;
  }

  heal(n) {
    if (this.noHeal) return;
    const p = this.player;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + n);
    if (p.hp - before >= 1) this.addText(p.x, p.y - 60, '+' + Math.round(p.hp - before), '#7aff6a', 13, false);
  }

  hurtPlayer(dmg) {
    const p = this.player;
    if (p.inv > 0 || this.state !== 'play') return;
    const d = Math.max(1, dmg * this.scenario.dmgMult - this.st.armor);
    p.hp -= d; p.inv = 0.45; p.hurt = 0.3;
    this.cam.shake = Math.max(this.cam.shake, 9);
    this.addText(p.x, p.y - 64, '-' + Math.round(d), '#ff4a3a', 15, false);
    for (let i = 0; i < 6; i++) this.addPart(p.x, p.y - 20, (Math.random() - 0.5) * 220, (Math.random() - 0.5) * 220, 0.5, 3, '#9a0a0a', PT.BLOOD, false);
    Sfx.play('hurt');
    if (p.hp <= 0) { p.hp = 0; this.finish(false, 'Has caído en el polvo.'); }
  }

  // ---------------------------------------------------------------- enemigos
  spawnEnemy(type, x, y, elite = false, tag = '') {
    const e = this.enemies.get();
    if (!e) return null;
    const def = ENEMIES[type];
    const hpMult = this.scenario.hpMult * (1 + this.time / 260) * (elite ? ELITE.hp : 1);
    e.uid = this.uid++; e.type = type; e.def = def; e.x = x; e.y = y; e.vx = 0; e.vy = 0;
    e.r = def.r * (elite ? ELITE.r : 1); e.maxHp = e.hp = Math.round(def.hp * hpMult);
    e.speed = def.speed * (0.9 + Math.random() * 0.2) * (elite ? 0.9 : 1);
    e.dmg = def.dmg * (elite ? ELITE.dmg : 1);
    e.elite = elite; e.boss = false; e.bossId = ''; e.spr = this.cache.enemy(type, elite);
    e.flash = 0; e.burnT = 0; e.burnDps = 0; e.burnTick = 0; e.slowT = 0; e.atkT = 1 + Math.random() * 1.5;
    e.state = 0; e.stateT = 0; e.face = 1; e.targetStruct = null; e.shots = 0; e.ringHit = 0; e.tag = tag;
    e.xp = def.xp * (elite ? ELITE.xp : 1); e.coin = def.coin; e.combo = def.combo * (elite ? ELITE.combo : 1);
    e.dead = false; e.alpha = type === 'sniper' ? 0 : 1; e.name = elite ? (tag || def.name) : ''; e.spd = 1; e.summonT = 3 + Math.random() * 3;
    if (this.objective && this.objective.assignTarget) this.objective.assignTarget(e);
    return e;
  }

  spawnBoss(id) {
    const B = BOSSES[id];
    const p = this.player;
    const a = Math.random() * TAU;
    const x = Math.max(-HALF + 100, Math.min(HALF - 100, p.x + Math.cos(a) * 420));
    const y = Math.max(-HALF + 100, Math.min(HALF - 100, p.y + Math.sin(a) * 420));
    const e = this.enemies.get();
    if (!e) return null;
    e.uid = this.uid++; e.type = id; e.def = B; e.x = x; e.y = y; e.vx = 0; e.vy = 0; e.r = B.r;
    e.maxHp = e.hp = Math.round(B.hp * (1 + (this.scenario.hpMult - 1) * 0.3));
    e.speed = B.speed; e.dmg = B.dmg; e.elite = false; e.boss = true; e.bossId = id; e.spr = this.cache.enemy(id);
    e.flash = 0; e.burnT = 0; e.slowT = 0; e.dead = false; e.alpha = 1; e.name = B.name; e.xp = 40; e.coin = 0; e.combo = 40;
    e.phase = 0; e.mode = 'move'; e.modeT = 2.5; e.patIdx = 0; e.subT = 0; e.subN = 0; e.state = 0; e.ang = 0; e.tag = 'boss';
    this.boss = e; this.bossAlive = true;
    this.showBanner(B.name.toUpperCase(), '¡JEFE FINAL!', 2.6);
    this.cam.shake = 16; Sfx.play('boss');
    for (let i = 0; i < 30; i++) this.addPart(x, y - 30, (Math.random() - 0.5) * 500, (Math.random() - 0.5) * 500, 0.9, 6, '#2a1a2a', PT.SMOKE, false);
    return e;
  }

  hurtEnemy(e, dmg, crit, nx, ny, kb, burn, slow) {
    if (e.dead) return;
    if (e.targetable) return this.hurtStruct(e, dmg); // estructura usada como objetivo
    e.hp -= dmg; e.flash = 0.08;
    if (kb > 0) {
      const m = e.boss ? 0.08 : e.elite ? 0.4 : 1;
      e.vx += nx * kb * m; e.vy += ny * kb * m;
    }
    if (burn > 0) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, burn); }
    if (slow > 0) e.slowT = Math.max(e.slowT, slow);
    if (crit || dmg >= 45) this.addText(e.x + (Math.random() - 0.5) * 16, e.y - e.r * 2.6, crit ? Math.round(dmg) + '!' : '' + Math.round(dmg), crit ? '#ffd23a' : '#f2e2c0', crit ? 17 : 13, crit);
    if (e.hp <= 0) this.killEnemy(e);
    else Sfx.play('hit');
  }

  hurtStruct(s, dmg) {
    if (s.hp <= 0) return;
    s.hp -= dmg; s.flash = 0.08;
    if (s.hp <= 0) { s.hp = 0; this.objective.onStructDestroyed && this.objective.onStructDestroyed(s); }
  }

  killEnemy(e) {
    e.dead = true;
    this.kills++;
    Sfx.play('kill');
    // botín
    if (!e.boss) {
      this.dropXp(e.x, e.y, e.xp);
      if (Math.random() < e.coin) this.dropPickup(e.x, e.y, PK.COIN, 1 + (Math.random() * 2 | 0));
      if (e.elite) for (let i = 0; i < ELITE.coins; i++) this.dropPickup(e.x, e.y, PK.COIN, 2);
      if (!this.noHeal && Math.random() < (e.elite ? 0.5 : 0.012)) this.dropPickup(e.x, e.y, PK.HEAL, 25);
    } else {
      for (let i = 0; i < e.def.coins; i++) this.dropPickup(e.x, e.y, PK.COIN, 3);
      this.dropXp(e.x, e.y, 60);
      this.bossAlive = false;
      this.cam.shake = 26; this.flash = 1;
      this.comicText(e.x, e.y - 60, '¡KA-BOOM!', '#ff4a1a', 46);
      for (let i = 0; i < 12; i++) this.explode(e.x + (Math.random() - 0.5) * 120, e.y + (Math.random() - 0.5) * 120, 60, 0, '#ff8a2a', 1, 0, 0, true);
    }
    // Racha de Pólvora
    const c = this.combo;
    if (!c.ready) {
      c.value = Math.min(100, c.value + e.combo * 0.9);
      if (c.value >= 100) { c.ready = true; c.flash = 1; Sfx.play('combo'); this.comicText(this.player.x, this.player.y - 90, '¡RACHA DE PÓLVORA!', '#ffd23a', 26); }
    }
    c.timer = 0; c.kills++; if (c.kills > c.best) c.best = c.kills;
    if (c.kills > 0 && c.kills % 50 === 0) this.comicText(this.player.x, this.player.y - 100, c.kills % 150 === 0 ? '¡MASACRE!' : '¡x' + c.kills + '!', '#ff5a3a', 30);
    // partículas de tinta y sangre
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * TAU, s = 60 + Math.random() * 200;
      this.addPart(e.x, e.y - e.r, Math.cos(a) * s, Math.sin(a) * s, 0.35 + Math.random() * 0.3, 2 + Math.random() * 3, i % 3 ? '#7a0a0a' : '#1a0a06', PT.BLOOD, false);
    }
    if (e.type === 'shaman' || e.type === 'sniper') for (let i = 0; i < 6; i++) this.addPart(e.x, e.y - 20, (Math.random() - 0.5) * 160, -60 - Math.random() * 120, 0.6, 4, e.type === 'shaman' ? '#b04dff' : '#7fffd4', PT.EMBER, true);
    this.addDecal(e.x, e.y, e.r * (0.8 + Math.random() * 0.6), Math.random() < 0.5 ? 1 : 0);
    if (e.def.explode) {
      const ex = e.def.explode;
      this.explode(e.x, e.y, ex.r, ex.dmg * 3, '#ff6a12', 1, 0, 260, false);
      this.explodeHurtsPlayer(e.x, e.y, ex.r, ex.dmg);
    }
    if (this.objective.onKill) this.objective.onKill(e);
    if (this.st.healOnKill && !this.noHeal) this.heal(this.st.healOnKill);
  }

  dropXp(x, y, v) {
    while (v > 0) {
      const k = v >= 10 ? 10 : v >= 3 ? 3 : 1;
      this.dropPickup(x, y, PK.XP, k); v -= k;
    }
  }

  dropPickup(x, y, kind, value) {
    const p = this.pickups.get();
    if (!p) return;
    const a = Math.random() * TAU, s = 30 + Math.random() * 90;
    p.x = x; p.y = y; p.kind = kind; p.value = value; p.vx = Math.cos(a) * s; p.vy = Math.sin(a) * s; p.mag = false; p.t = 0;
  }

  addDecal(x, y, r, kind) {
    const i = this.decalI * 4;
    this.decals[i] = x; this.decals[i + 1] = y; this.decals[i + 2] = r; this.decals[i + 3] = kind;
    this.decalI = (this.decalI + 1) % 160; this.decalN = Math.min(160, this.decalN + 1);
  }

  // ---------------------------------------------------------------- explosiones
  explode(x, y, r, dmg, color, owner, burn, kb, quiet) {
    if (dmg > 0 && owner === 1) {
      const q = this.q; q.x = x; q.y = y; q.r = r; q.dmg = dmg; q.kb = kb || 220; q.burn = burn || 0;
      this.grid.query(x, y, r + 30, this._explodeFn);
      if (this.boss && !this.boss.dead) this._explodeFn(this.boss);
      for (let i = 0; i < this.structs.length; i++) {
        const s = this.structs[i];
        if (s.targetable && s.hp > 0 && Math.hypot(s.x - x, s.y - y) < r + s.r) this.hurtStruct(s, dmg);
      }
    }
    // fx
    this.addPart(x, y, 0, 0, 0.18, r * 0.9, '#fff6d0', PT.FLASH, true);
    this.addPart(x, y, 0, 0, 0.4, r * 0.3, color, PT.RING, true).grow = r * 3;
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * TAU, s = 80 + Math.random() * r * 3;
      this.addPart(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.3 + Math.random() * 0.4, 3 + Math.random() * 4, i % 2 ? color : '#ffd23a', PT.SPARK, true).drag = 3;
    }
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TAU, s = 20 + Math.random() * 60;
      const pp = this.addPart(x, y, Math.cos(a) * s, Math.sin(a) * s - 20, 0.8 + Math.random() * 0.6, r * 0.3, '#2a2220', PT.SMOKE, false);
      pp.grow = r * 0.6; pp.drag = 1.5;
    }
    this.addDecal(x, y, r * 0.55, 2);
    if (!quiet) {
      Sfx.play('boom');
      this.cam.shake = Math.max(this.cam.shake, Math.min(14, r * 0.12));
      if (Math.random() < 0.3) this.comicText(x, y - r * 0.6, Math.random() < 0.5 ? '¡BOOM!' : '¡KABLAM!', color, 22);
    }
  }

  explodeHurtsPlayer(x, y, r, dmg) {
    const p = this.player;
    if (Math.hypot(p.x - x, p.y - y) < r + p.r) this.hurtPlayer(dmg);
    for (let i = 0; i < this.structs.length; i++) {
      const s = this.structs[i];
      if (s.defend && Math.hypot(s.x - x, s.y - y) < r + s.r) this.hurtStruct(s, dmg);
    }
  }

  // ---------------------------------------------------------------- proyectiles
  addBullet(x, y, ang, speed, dmg, r, pierce, life, color, core, kind, kb) {
    const b = this.bullets.get();
    if (!b) return null;
    const st = this.st;
    const crit = Math.random() < st.crit || this.slowmo > 0;
    b.x = x; b.y = y; b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed; b.r = r;
    b.dmg = dmg * st.dmg * (crit ? st.critMult : 1); b.crit = crit;
    b.pierce = pierce + st.pierce; b.life = life; b.color = color; b.core = core; b.kind = kind; b.kb = kb * st.kb;
    b.hits.length = 0; b.radius = 0; b.fire = 0; b.heal = 0; b.burn = st.elemental ? 6 * st.dmg : 0; b.slow = st.elemental ? 0.6 : 0;
    b.len = kind === BK.RIFLE || kind === BK.BOLT ? 26 : kind === BK.PELLET ? 8 : 14;
    return b;
  }

  updateBullets(dt) {
    const B = this.bullets.items;
    for (let i = this.bullets.n - 1; i >= 0; i--) {
      const b = B[i];
      if (b.kind === BK.GRENADE) {
        b.t += dt;
        const k = Math.min(1, b.t / b.tmax);
        b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k;
        b.life = k; // usado por el render para el arco
        if (k >= 1) {
          this.explode(b.x, b.y, b.radius, b.dmg, this.pal.glow, 1, this.st.elemental ? 8 : 0, b.kb, false);
          if (b.fire > 0) this.addZone(ZK.FIRE, b.x, b.y, b.radius * 0.75, 3.5, b.fire, '#ff6a1a', 1);
          this.bullets.kill(i);
        }
        continue;
      }
      b.life -= dt;
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.life <= 0 || b.x < -HALF - 200 || b.x > HALF + 200 || b.y < -HALF - 200 || b.y > HALF + 200) { this.bullets.kill(i); continue; }
      // impacto contra enemigos (rejilla)
      if (this.bulletHits(b)) { this.bullets.kill(i); continue; }
    }
  }

  bulletHits(b) {
    const g = this.grid, h = g.half, cs = g.cell, cols = g.cols;
    const cx0 = Math.max(0, ((b.x - 40 + h) / cs) | 0), cx1 = Math.min(cols - 1, ((b.x + 40 + h) / cs) | 0);
    const cy0 = Math.max(0, ((b.y - 40 + h) / cs) | 0), cy1 = Math.min(cols - 1, ((b.y + 40 + h) / cs) | 0);
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const c = g.cells[cy * cols + cx];
        for (let k = 0; k < c.length; k++) {
          const e = c[k];
          if (e.dead) continue;
          const dx = e.x - b.x, dy = (e.y - e.r) - b.y, rr = e.r + b.r;
          if (dx * dx + dy * dy > rr * rr) continue;
          if (b.hits.indexOf(e.uid) !== -1) continue;
          if (this.applyBulletHit(b, e)) return true;
        }
      }
    }
    const boss = this.boss;
    if (boss && !boss.dead) {
      const dx = boss.x - b.x, dy = (boss.y - boss.r) - b.y, rr = boss.r + b.r;
      if (dx * dx + dy * dy < rr * rr && b.hits.indexOf(boss.uid) === -1 && this.applyBulletHit(b, boss)) return true;
    }
    for (let i = 0; i < this.structs.length; i++) {
      const s = this.structs[i];
      if (!s.targetable || s.hp <= 0) continue;
      const dx = s.x - b.x, dy = (s.y - s.r) - b.y, rr = s.r + b.r;
      if (dx * dx + dy * dy < rr * rr) {
        this.hurtStruct(s, b.dmg);
        this.addPart(b.x, b.y, -b.vx * 0.1, -b.vy * 0.1, 0.15, 5, b.color, PT.SPARK, true);
        return true;
      }
    }
    return false;
  }

  applyBulletHit(b, e) {
    const sp = Math.hypot(b.vx, b.vy) || 1;
    const wasAlive = !e.dead;
    this.hurtEnemy(e, b.dmg, b.crit, b.vx / sp, b.vy / sp, b.kb, b.burn, b.slow);
    if (wasAlive && e.dead && b.heal) this.heal(b.heal);
    this.addPart(b.x, b.y, -b.vx * 0.15 + (Math.random() - 0.5) * 80, -b.vy * 0.15 + (Math.random() - 0.5) * 80, 0.15, 4, b.color, PT.SPARK, true);
    if (b.hits.length < 16) b.hits.push(e.uid);
    if (b.pierce > 0) { b.pierce--; b.dmg *= 0.85; return false; }
    return true;
  }

  addEBullet(x, y, ang, speed, dmg, r, life, color, kind) {
    const b = this.ebullets.get();
    if (!b) return null;
    b.x = x; b.y = y; b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed; b.dmg = dmg; b.r = r;
    b.life = life; b.color = color; b.kind = kind; b.t = 0; b.homing = 0; b.radius = 0;
    return b;
  }

  addLob(x, y, tx, ty, time, dmg, radius, color) {
    const b = this.ebullets.get();
    if (!b) return null;
    b.x = b.sx = x; b.y = b.sy = y; b.tx = tx; b.ty = ty; b.tmax = time; b.t = 0; b.dmg = dmg; b.radius = radius;
    b.color = color; b.kind = EK.LOB; b.r = 8; b.life = 99; b.vx = 0; b.vy = 0;
    this.addZone(ZK.BOMB, tx, ty, radius, time, 0, color, 0);
    return b;
  }

  updateEBullets(dt) {
    const B = this.ebullets.items, p = this.player;
    for (let i = this.ebullets.n - 1; i >= 0; i--) {
      const b = B[i];
      if (b.kind === EK.LOB) {
        b.t += dt;
        const k = Math.min(1, b.t / b.tmax);
        b.x = b.sx + (b.tx - b.sx) * k; b.y = b.sy + (b.ty - b.sy) * k;
        if (k >= 1) {
          this.explode(b.x, b.y, b.radius, 0, b.color, 0, 0, 0, false);
          this.explodeHurtsPlayer(b.x, b.y, b.radius, b.dmg);
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
      const dx = p.x - b.x, dy = (p.y - 22) - b.y, rr = p.r + b.r;
      if (dx * dx + dy * dy < rr * rr) {
        if (p.inv <= 0) { this.hurtPlayer(b.dmg); this.ebullets.kill(i); }
        continue;
      }
      // proyectiles enemigos dañan estructuras defendidas
      for (let s = 0; s < this.structs.length; s++) {
        const st = this.structs[s];
        if (st.defend && st.hp > 0 && Math.abs(st.x - b.x) < st.r && Math.abs(st.y - st.r * 0.6 - b.y) < st.r * 0.8) {
          this.hurtStruct(st, b.dmg); this.ebullets.kill(i); break;
        }
      }
    }
  }

  // ---------------------------------------------------------------- zonas (fuego, anillos, telegrafías)
  addZone(kind, x, y, r, life, dmg, color, owner) {
    const z = this.zones.get();
    if (!z) return null;
    z.uid = this.uid++; z.kind = kind; z.x = x; z.y = y; z.r = r; z.maxR = r; z.life = 0; z.max = life; z.dmg = dmg;
    z.color = color; z.tick = 0; z.delay = 0; z.owner = owner; z.ang = 0; z.len = 0;
    return z;
  }

  updateZones(dt) {
    const Z = this.zones.items, p = this.player;
    for (let i = this.zones.n - 1; i >= 0; i--) {
      const z = Z[i];
      z.life += dt;
      switch (z.kind) {
        case ZK.FIRE:
          z.tick -= dt;
          if (z.tick <= 0) {
            z.tick = 0.33;
            const q = this.q; q.x = z.x; q.y = z.y; q.r = z.r; q.dmg = z.dmg * 0.33; q.kb = 0; q.burn = 0;
            this.grid.query(z.x, z.y, z.r + 20, this._explodeFn);
            if (this.boss && !this.boss.dead && Math.hypot(this.boss.x - z.x, this.boss.y - z.y) < z.r + this.boss.r) this.hurtEnemy(this.boss, q.dmg, false, 0, 0, 0, 0, 0);
          }
          if (Math.random() < dt * 20) this.addPart(z.x + (Math.random() - 0.5) * z.r * 1.6, z.y + (Math.random() - 0.5) * z.r, 0, -40 - Math.random() * 60, 0.5, 4, Math.random() < 0.5 ? '#ff6a1a' : '#ffd23a', PT.EMBER, true);
          break;
        case ZK.RING: {
          z.r = z.maxR * (z.life / z.max);
          this._ring = z;
          this.grid.query(z.x, z.y, z.r + 30, this._ringFn);
          const bo = this.boss;
          if (bo && !bo.dead) this._ringFn(bo);
          break;
        }
        case ZK.STRIKE: // bola de fuego del jugador con telegrafía
          if (z.tick === 0 && z.life >= z.max) { z.tick = 1; this.explode(z.x, z.y, z.r, z.dmg, z.color, 1, 8, 200, Math.random() < 0.6); }
          break;
        case ZK.METEOR: case ZK.LIGHTNING:
          if (z.tick === 0 && z.life >= z.max) {
            z.tick = 1;
            this.explode(z.x, z.y, z.r, z.dmg * 4, z.color, 1, 0, 300, false);
            this.explodeHurtsPlayer(z.x, z.y, z.r, z.dmg);
            if (z.kind === ZK.LIGHTNING) { this.flash = 0.8; Sfx.play('thunder'); }
          }
          break;
        case ZK.POOL:
          if (z.life > 0.8 && Math.hypot(p.x - z.x, p.y - z.y) < z.r) { z.tick -= dt; if (z.tick <= 0) { z.tick = 0.5; this.hurtPlayer(z.dmg); } }
          break;
        case ZK.SLAM:
          if (z.tick === 0 && z.life >= z.max) {
            z.tick = 1;
            this.explode(z.x, z.y, z.r, 0, z.color, 0, 0, 0, false);
            this.explodeHurtsPlayer(z.x, z.y, z.r, z.dmg);
          }
          break;
        default: break;
      }
      if (z.life >= z.max + (z.kind === ZK.STRIKE || z.kind === ZK.METEOR || z.kind === ZK.LIGHTNING || z.kind === ZK.SLAM ? 0.15 : 0)) this.zones.kill(i);
    }
  }

  // ---------------------------------------------------------------- botín
  updatePickups(dt) {
    const P = this.pickups.items, p = this.player, R = this.st.pickup, R2 = R * R;
    for (let i = this.pickups.n - 1; i >= 0; i--) {
      const it = P[i];
      it.t += dt;
      const dx = p.x - it.x, dy = (p.y - 16) - it.y, d2 = dx * dx + dy * dy;
      if (!it.mag && (d2 < R2 || (it.kind === PK.XP && this.state === 'over'))) it.mag = true;
      if (it.mag) {
        const d = Math.sqrt(d2) || 1, sp = 520 + it.t * 200;
        it.vx = dx / d * sp; it.vy = dy / d * sp;
        if (d < 18) { this.collect(it); this.pickups.kill(i); continue; }
      } else { it.vx *= 1 - 5 * dt; it.vy *= 1 - 5 * dt; }
      it.x += it.vx * dt; it.y += it.vy * dt;
      if (it.kind !== PK.CRYSTAL && it.t > 60) this.pickups.kill(i);
    }
  }

  collect(it) {
    switch (it.kind) {
      case PK.XP:
        this.xp += it.value; Sfx.play('xp');
        while (this.xp >= this.nextXp) { this.xp -= this.nextXp; this.level++; this.nextXp = this.xpFor(this.level); this.pendingLevels++; }
        if (this.pendingLevels > 0 && this.state === 'play') {
          this.state = 'levelup'; Sfx.play('level');
          this.cb.onLevelUp(rollUpgrades(this));
        }
        break;
      case PK.COIN: {
        const v = it.value * this.combo.mult;
        this.coinsRun += v; Sfx.play('coin');
        if (this.combo.mult > 1) this.addText(this.player.x + 20, this.player.y - 50, '+' + v.toFixed(v % 1 ? 1 : 0), '#ffd23a', 11, false);
        break;
      }
      case PK.HEAL: this.heal(it.value); break;
      case PK.CRYSTAL: this.objective.onCrystal && this.objective.onCrystal(); Sfx.play('coin'); break;
      default: break;
    }
  }

  xpFor(l) { return Math.round(6 + l * 5 + Math.pow(l, 1.6) * 1.5); }

  // ---------------------------------------------------------------- Racha de Pólvora
  updateCombo(dt) {
    const c = this.combo;
    c.flash = Math.max(0, c.flash - dt);
    if (c.ready) { c.mult = 3; return; }
    c.timer += dt;
    if (c.timer > 2.6) {
      c.value = Math.max(0, c.value - 16 * dt);
      if (c.value <= 0) c.kills = 0;
    }
    c.mult = c.value >= 75 ? 3 : c.value >= 50 ? 2 : c.value >= 25 ? 1.5 : 1;
  }

  // ---------------------------------------------------------------- spawner
  spawner(dt) {
    if (this.time < 2.2 || this.objective.noSpawn) return;
    const m = this.mission;
    const growth = m.obj.type === 'infinite' ? 0.9 : 0.42;
    let rate = m.rate * (1.5 + (this.time / 30) * growth) * (this.objective.spawnMult || 1);
    if (this.bossAlive) rate *= 0.45;
    const cap = this.input.isTouch ? 170 : 240;
    this.spawnAcc += dt * rate;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemies.n >= cap) { this.spawnAcc = 0; break; }
      this.spawnOne();
    }
  }

  pickType() {
    const sp = this.mission.spawn;
    let tot = 0;
    for (const k in sp) tot += sp[k];
    let r = Math.random() * tot;
    for (const k in sp) { r -= sp[k]; if (r <= 0) return k; }
    return 'outlaw';
  }

  ringPoint(out, extra = 60) {
    const p = this.player;
    const R = Math.hypot(this.viewW, this.viewH) / 2 + extra;
    for (let tries = 0; tries < 6; tries++) {
      const a = Math.random() * TAU;
      const x = p.x + Math.cos(a) * R, y = p.y + Math.sin(a) * R;
      if (x > -HALF - 40 && x < HALF + 40 && y > -HALF - 40 && y < HALF + 40) { out.x = x; out.y = y; return out; }
    }
    out.x = Math.max(-HALF, Math.min(HALF, p.x + (Math.random() - 0.5) * 2 * R));
    out.y = Math.random() < 0.5 ? -HALF - 30 : HALF + 30;
    return out;
  }

  spawnOne() {
    const type = this.pickType();
    const pt = this.ringPoint(this.q, this.mods.has('fog') ? -40 : 60);
    if (type === 'hound') {
      const [a, b] = ENEMIES.hound.pack;
      const n = a + ((Math.random() * (b - a + 1)) | 0);
      const x = pt.x, y = pt.y;
      for (let i = 0; i < n; i++) this.spawnEnemy('hound', x + (Math.random() - 0.5) * 60, y + (Math.random() - 0.5) * 60);
      return;
    }
    if (type === 'sniper') {
      let alive = 0;
      const E = this.enemies.items;
      for (let i = 0; i < this.enemies.n; i++) if (E[i].type === 'sniper' && !E[i].dead) alive++;
      if (alive >= 2) { this.spawnEnemy('outlaw', pt.x, pt.y); return; }
      // aparece en el borde visible de la pantalla
      const p = this.player, a = Math.random() * TAU;
      const hw = this.viewW / 2 - 40, hh = this.viewH / 2 - 60;
      const k = Math.min(hw / Math.abs(Math.cos(a) || 1e-3), hh / Math.abs(Math.sin(a) || 1e-3));
      this.spawnEnemy('sniper', Math.max(-HALF, Math.min(HALF, p.x + Math.cos(a) * k)), Math.max(-HALF, Math.min(HALF, p.y + Math.sin(a) * k)));
      return;
    }
    this.spawnEnemy(type, pt.x, pt.y);
  }

  // ---------------------------------------------------------------- fx helpers
  addPart(x, y, vx, vy, life, size, color, kind, add) {
    const p = this.parts.get() || this.parts.items[(Math.random() * this.parts.n) | 0];
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = 0; p.max = life; p.size = size; p.color = color; p.kind = kind;
    p.grow = 0; p.drag = 0; p.add = add;
    return p;
  }

  addText(x, y, str, color, size, big) {
    const t = this.texts.get();
    if (!t) return;
    t.x = x; t.y = y; t.vy = -60; t.life = 0; t.max = big ? 1.1 : 0.75; t.str = str; t.color = color; t.size = size; t.big = big;
  }

  comicText(x, y, str, color, size) {
    const t = this.texts.get();
    if (!t) return;
    t.x = x; t.y = y; t.vy = -30; t.life = 0; t.max = 1.2; t.str = str; t.color = color; t.size = size; t.big = true;
  }

  showBanner(title, sub, t) { this.banner = { title, sub, t, max: t }; }

  // ---------------------------------------------------------------- fin
  finish(win, reason = '') {
    if (this.state === 'over') return;
    this.state = 'over';
    this.endT = win ? 2.4 : 2.0;
    const m = this.mission;
    if (win) {
      Sfx.play('win');
      this.showBanner('¡VICTORIA!', 'La tierra maldita respira… por ahora.', 3);
      // atrae todo el oro restante
      const P = this.pickups.items;
      for (let i = 0; i < this.pickups.n; i++) P[i].mag = true;
      this.flash = 0.6;
    } else {
      Sfx.play('lose');
      this.showBanner('HAS CAÍDO', reason || 'El Oeste se cobra otra alma.', 3);
    }
    this.result = {
      win, missionId: m.id, kills: this.kills, time: this.time, level: this.level, bestCombo: this.combo.best,
      coinsRun: Math.round(this.coinsRun), reward: 0, first: false, reason,
    };
    this._pendingRewardMission = m;
  }
}

export function computeReward(result, mission, alreadyDone) {
  if (!result.win) return 0;
  return alreadyDone ? Math.round(mission.reward * REPLAY_FACTOR) : mission.reward;
}
