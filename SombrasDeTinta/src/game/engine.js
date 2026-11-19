// Núcleo de partida: bucle a 60 FPS, pools sin basura, daño (armadura, esquiva, críticos), alcance limitado,
// cargadores y recarga, mano de cartas, sorteos, maldiciones, miedo/aturdimiento/tinta pegajosa, póker de tinta
// con furias, mundo de 3× el viewport por zonas y cámara de seguimiento suave. Modos: historia y supervivencia.
import { Pool, Grid } from './pool.js';
import { Sprites } from '../art/sprites.js';
import { makeGround } from '../art/worldArt.js';
import { Z_ANIM } from '../art/zombieArt.js';
import { initPet, updatePet, updatePetShots } from './petAI.js';
import { makeRng, TAU } from '../art/ink.js';
import { ZOMBIES, COLOSSI } from '../data/enemies.js';
import { BARKS } from '../data/heroes.js';
import { WEAPONS } from '../data/weapons.js';
import { MAPS, ZONES } from '../data/story.js';
import { RANKS, SUITS, FURIES, evaluateHand } from '../data/poker.js';
const HAND_RANK = ['PAREJA', 'DOBLE', 'TRIO', 'ESCALERA', 'COLOR', 'FULL', 'POKER'];
import { CARDS, SIGNATURE, rollRarity } from '../data/cards.js';
import { Sfx } from '../core/audio.js';
import { fireWeapon, playCard, updatePassives } from './combat.js';
import { updateZombies } from './ai.js';
import { buildTraps, updateTraps, bulletVsTraps, explosionVsTraps, attachPlagueLamp } from './traps.js';
import { createMode } from './modes.js';
import { renderGame } from './render.js';

// Mundo ≈ 3× el viewport en cada eje (≈ 3.600 × 2.600 unidades).
export const HX = 1800, HY = 1300;
export function zoneAt(x) { const k = x / HX; for (let i = 0; i < ZONES.length; i++) if (k < ZONES[i].x1 || i === ZONES.length - 1) return i; return 0; }

const mkZ = () => ({
  uid: 0, type: '', def: null, x: 0, y: 0, vx: 0, vy: 0, r: 10, hp: 1, maxHp: 1, armor: 0, maxArmor: 0, speed: 0, dmg: 0,
  colossus: false, elite: false, spr: null, flash: 0, burnT: 0, burnDps: 0, burnTick: 0, slowT: 0, stunT: 0, rootT: 0,
  atkT: 0, state: 0, stateT: 0, ax: 0, ay: 0, face: 1, target: null, xp: 1, soul: 1, dead: false, alpha: 1, name: '',
  mode: '', modeT: 0, patIdx: 0, subT: 0, subN: 0, phase: 0, ang: 0, hitBy: 0, tauntT: 0, fearT: 0, flank: 1,
});
const mkB = () => ({ acid: false, x: 0, y: 0, vx: 0, vy: 0, r: 3, dmg: 0, pierce: 0, life: 0, color: '#fff', core: '#fff', kind: 0, kb: 0, crit: false, hits: [], chain: 0, homing: 0, burn: 0, slow: 0, stun: 0, radius: 0, len: 10, spin: 0, ox: 0, oy: 0 });
const mkE = () => ({ x: 0, y: 0, vx: 0, vy: 0, r: 5, dmg: 0, life: 0, color: '#fff', kind: 0, t: 0, tmax: 0, sx: 0, sy: 0, tx: 0, ty: 0, radius: 0, homing: 0 });
const mkP = () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#fff', kind: 0, grow: 0, drag: 0, add: true });
const mkT = () => ({ x: 0, y: 0, vy: 0, life: 0, max: 1, str: '', color: '#fff', size: 14, big: false, num: 0, rot: 0 });
const mkI = () => ({ x: 0, y: 0, kind: 0, value: 0, vx: 0, vy: 0, mag: false, t: 0, cr: 0, cs: 0 });
const mkU = () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, size: 2, color: '#000', ink: true });
const mkZn = () => ({ uid: 0, kind: 0, x: 0, y: 0, r: 0, maxR: 0, life: 0, max: 0, dmg: 0, color: '#fff', tick: 0, owner: 0, ang: 0, len: 0, vx: 0, vy: 0, elec: false, charged: 0, pts: new Float32Array(20), pn: 0 });

export const BK = { BULLET: 0, PELLET: 1, RIFLE: 2, HARPOON: 3, CARD: 4, FLAME: 5, LOB: 6, SHRAP: 7 };
export const EK = { ORB: 0, FAST: 1, LOB: 2, PAGE: 3, INK: 4 };
export const PK = { SOUL: 0, BIGSOUL: 1, HEAL: 2, CARD: 3 };
export const PT = { SPARK: 0, SMOKE: 1, BLOOD: 2, RING: 3, FLASH: 4, EMBER: 5, DEBRIS: 6, SPLINTER: 7 };
export const ZK = { FIRE: 0, RING: 1, STRIKE: 2, POOL: 3, GAS: 4, SLAM: 5, CHARGE: 6, BOMB: 7, TRAIN: 8, RIDERS: 9, INK: 10, CONE: 11, ACID: 12, ARC: 13, BEAM: 14 };

export class Game {
  constructor(canvas, input, cb) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d', { alpha: false });
    this.input = input; this.cb = cb; // { onEnd(result), onDraft(choices, reason), onPause(v) }
    this.zombies = new Pool(mkZ, 320);
    this.bullets = new Pool(mkB, 600);
    this.ebullets = new Pool(mkE, 400);
    this.parts = new Pool(mkP, 900);
    this.texts = new Pool(mkT, 96); this.numT = 0;
    this.items = new Pool(mkI, 500);
    this.zones = new Pool(mkZn, 120);
    this.dlg = { cur: null, next: null, cool: 0 };
    this.uiParts = []; for (let i = 0; i < 160; i++) this.uiParts.push(mkU());
    this.fx = { dmg: 1, rate: 1, speed: 1, pierce: 0, range: 1, crit: 0, reload: 1, invuln: false, explode: 0 };
    this.grid = new Grid(Math.max(HX, HY) + 200, 80);
    this.decals = new Float32Array(160 * 4); this.decalT = new Float32Array(160); this.decalN = 0; this.decalI = 0;
    this.traps = []; this.props = []; this.structs = []; this.crows = [];
    this.lights = new Float32Array(112 * 4); this.lightN = 0; this.ambient = [];
    this.uid = 1; this.running = false; this._raf = 0;
    this._loop = (ts) => this.frame(ts);
    this.player = { x: 0, y: 0, r: 15, hp: 100, maxHp: 100, face: 1, inv: 0, hurt: 0, aim: 0, aimDist: 300, fireT: 0, alt: 0, moving: false, muzzle: 0, rootT: 0, regenT: 0, spin: 0, ammo: 0, reloadT: 0, burstN: 0, burstT: 0, stunT: 0, stunImmune: 0, inkT: 0, vx: 0, vy: 0, jokeT: 8 };
    this.cam = { x: 0, y: 0, shake: 0, sx: 0, sy: 0, lx: 0, ly: 0 };
    this.q = { x: 0, y: 0, r: 0, best: null, bestD: 0, dmg: 0, kb: 0, burn: 0, stun: 0, ex: 0, melt: 0 };
    this._nearestFn = (e) => {
      if (e.dead || e.uid === this.q.ex) return false;
      const dx = e.x - this.q.x, dy = e.y - this.q.y, d = dx * dx + dy * dy;
      if (d < this.q.bestD) { this.q.bestD = d; this.q.best = e; }
      return false;
    };
    this._areaFn = (e) => {
      if (e.dead) return false;
      const q = this.q, dx = e.x - q.x, dy = e.y - q.y, d = Math.hypot(dx, dy);
      if (d < q.r + e.r) this.hurtZombie(e, q.dmg * (1 - Math.min(1, d / (q.r + e.r)) * 0.4), false, dx / (d || 1), dy / (d || 1), q.kb, q.burn, 0, q.stun, q.melt);
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
    const { mode, mission, hero, skin, level, settings } = cfg;
    this.modeId = mode; this.mission = mission; this.hero = hero; this.skinIdx = skin; this.pal = hero.skins[skin].pal;
    this.settings = settings; this.profileLevel = level;
    this.weapon = WEAPONS[cfg.weaponId] || WEAPONS[hero.weapon];
    this.mapId = mode === 'survival' ? 'crossroads' : mission.map;
    this.map = MAPS[this.mapId];
    const res = Math.max(1.5, Math.min(3, this.scale * this.dpr));
    if (!this.spr || Math.abs(this.spr.res - res) > 0.01) this.spr = new Sprites(res);
    this.zoned = !!this.map.zoned;
    this.groundPatterns = this.zoned ? ZONES.map((z) => this.ctx.createPattern(makeGround(z.id, z), 'repeat')) : [this.ctx.createPattern(makeGround(this.mapId), 'repeat')];
    this.zoneIdx = -1;
    for (const P of [this.zombies, this.bullets, this.ebullets, this.parts, this.texts, this.items, this.zones]) P.clear();
    this.dlg.cur = null; this.dlg.next = null; this.dlg.cool = 0;
    for (const u of this.uiParts) u.on = false;
    this.poker = []; this.furies = []; this.pokerShow = null; this.pokerCount = 0; this.pokerPartial = ''; this.bestHand = ''; this.bestHandRank = -1; this.dealt = 0;
    this.gold = 0; this.weather = null; this.coils = []; this.onoT = 0; this.synT = 0; this.zapT = 0; this.weakT = 0; this.fearT2 = 0;
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
      rangeMult: 1, magMult: 1, reloadMult: 1, splash: 0, shrapnel: 0, rage: s.rage || 0, kbMult: s.kbMult || 1,
      fearAura: s.fearAura || 0, pokerLuck: s.pokerLuck || 0, arc: 0,
    };
    const p = this.player;
    p.maxHp = Math.round(s.hp * (s.rage ? 1.25 : 1) + lvl * 1.5); p.hp = p.maxHp;
    p.x = this.zoned ? 0 : 0; p.y = 120; p.inv = 1.5; p.ammo = this.magSize(); p.reloadT = 0; p.burstN = 0; p.burstT = 0; p.stunT = 0; p.stunImmune = 0; p.inkT = 0; p.vx = 0; p.vy = 0; p.jokeT = 8; p.hurt = 0; p.fireT = 0.3; p.alt = 0; p.muzzle = 0; p.rootT = 0; p.regenT = 0; p.aim = -Math.PI / 2; p.spin = 0;
    this.cam.x = p.x; this.cam.y = p.y; this.cam.shake = 0;
    // mano: carta de firma + 2 huecos
    this.hand = [{ card: SIGNATURE[hero.signature], cd: 0 }, null, null];
    this.deck = 1;
    this.buildProps();
    this.traps.length = 0;
    buildTraps(this);
    this.objective = createMode(this, mode, mission);
    this.petKills = 0; initPet(this, hero.id, level);
    this.prewarm();
    this.input.attach();
    this.running = true; this.last = performance.now();
    cancelAnimationFrame(this._raf); this._raf = requestAnimationFrame(this._loop);
    this.say(null, BARKS[hero.id].start, 0, false, 2);
  }

  prewarm() {
    this.spr.hero(this.hero.id, this.pal, this.skinIdx, this.hero.rim);
    this.spr.heroLayers(this.hero.id, this.pal, this.skinIdx, this.hero.rim);
    this.spr.prop('plaguelamp');
    for (let f = 0; f < 4; f++) this.spr.pet(this.pet.def.id, this.pet.tier, f, this.hero.rim);
    for (const t of Object.keys(ZOMBIES)) this.spr.zombie(t);
    for (const t of Object.keys(Z_ANIM)) for (let f = 1; f < Z_ANIM[t]; f++) this.spr.zombie(t, false, f);
    for (const t of Object.keys(COLOSSI)) this.spr.zombie(t);
    for (const c of [this.pal.shot, this.pal.glow, '#ff8a2a', '#ffd23a', '#ffffff', '#9dff3a', '#c8b8ff', '#7fa8ff', '#ff3a2a', '#d8e8b0', '#ffe08a', '#b8ff6a', '#c8d8ff', '#cfe8ff', '#eaf6ff', '#ff4a3a', '#ff6a3a'])
      this.spr.glow(c);
  }

  buildProps() {
    this.props.length = 0;
    const r = makeRng(this.mapId.length * 7919 + 13);
    const N = 300;
    for (let i = 0; i < N; i++) {
      const x = (r() * 2 - 1) * (HX - 40), y = (r() * 2 - 1) * (HY - 40);
      if (Math.hypot(x, y - 120) < 260) continue;
      if (this.zoned && Math.abs(y - this.roadY(x)) < 70) continue; // el camino queda despejado
      const list = this.zoned ? ZONES[zoneAt(x)].props : this.map.props;
      this.props.push({ x, y, spr: this.spr.prop(list[(r() * list.length) | 0]) });
    }
    if (this.zoned) {
      this.props.push({ x: 40, y: -60, spr: this.spr.prop('gallows') });
      this.props.push({ x: -1200, y: 300, spr: this.spr.prop('well') });
      this.props.push({ x: -HX / 3, y: this.roadY(-HX / 3) - 80, spr: this.spr.prop('post') });
      this.props.push({ x: HX / 3, y: this.roadY(HX / 3) - 80, spr: this.spr.prop('post') });
    }
    const edge = this.mapId === 'mine' || this.mapId === 'swamp' ? 'rock' : 'fence';
    for (let x = -HX; x <= HX; x += 90) { this.props.push({ x, y: -HY - 30, spr: this.spr.prop(edge) }); this.props.push({ x, y: HY + 30, spr: this.spr.prop(edge) }); }
    for (let y = -HY; y <= HY; y += 90) { this.props.push({ x: -HX - 30, y, spr: this.spr.prop(edge) }); this.props.push({ x: HX + 30, y, spr: this.spr.prop(edge) }); }
    this.props.sort((a, b) => a.y - b.y);
    // puntos de luz cálida ambiental (faroles lejanos, hogueras, ventanas): el mapa nunca queda a ciegas
    this.ambient.length = 0;
    for (let i = 0; i < 46; i++) {
      const x = (r() * 2 - 1) * (HX - 60), y = (r() * 2 - 1) * (HY - 60);
      this.ambient.push({ x, y, r: 240 + r() * 180, a: 0.5 + r() * 0.3, ph: r() * 6.28, col: r() < 0.7 ? '#ffb060' : '#ff8a3a' });
    }
    if (this.zoned) for (let x = -HX + 150; x < HX; x += 420) this.ambient.push({ x, y: this.roadY(x) - 40, r: 300, a: 0.65, ph: x, col: '#ffc070' });
  }

  // Camino de tierra que une las zonas (curva suave).
  roadY(x) { return Math.sin(x / 520) * 160 + Math.sin(x / 190) * 30; }

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
    this.draw(dt);
  }

  draw(dt) { renderGame(this, dt); }

  update(dt) {
    this.realTime += dt;
    if (this.input.consume('pause') && this.state === 'play') { this.pause(true); return; }
    this.updateFx(dt);
    this.updateUi(dt);
    if (this.state === 'over') {
      this.endT -= dt; this.updateItems(dt);
      if (this.endT <= 0 && this.result) { const r = this.result; this.result = null; this.stop(); this.cb.onEnd(r); }
      return;
    }
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.banner) { this.banner.t -= dt; if (this.banner.t <= 0) this.banner = null; }
    this.updateCurses(dt);
    this.updateWeather(dt);
    this.updateFuries(dt);
    this.onoT -= dt; this.zapT -= dt; this.weakT -= dt; this.fearT2 -= dt;
    Sfx.setIntensity(Math.min(1, this.zombies.n / 90 + this.colossi.length * 0.35 + (this.objective.fever ? 0.35 : 0)));
    this.updatePlayer(dt);
    updateZombies(this, dt);
    this.updateBullets(dt);
    this.updateEBullets(dt);
    this.updateZones(dt);
    updateTraps(this, dt);
    updatePassives(this, dt);
    updatePet(this, dt); updatePetShots(this, dt);
    this.updateItems(dt);
    this.updateDialogue(dt);
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
    // cámara de seguimiento suave con anticipación y límites del mundo
    const c = this.cam, p = this.player, k = 1 - Math.exp(-dt * 5), kl = 1 - Math.exp(-dt * 2.5);
    c.lx += (p.vx * 0.35 - c.lx) * kl; c.ly += (p.vy * 0.35 - c.ly) * kl;
    let tx = p.x + c.lx, ty = p.y - 20 + c.ly;
    const mx = Math.max(0, HX + 60 - this.viewW / 2), my = Math.max(0, HY + 60 - this.viewH / 2);
    tx = Math.max(-mx, Math.min(mx, tx)); ty = Math.max(-my, Math.min(my, ty));
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
    c.shake = Math.max(0, c.shake - dt * 30);
    const sh = this.settings.shake ? c.shake : 0;
    this.numT -= dt;
    c.sx = (Math.random() - 0.5) * sh * 0.65; c.sy = (Math.random() - 0.5) * sh * 0.65; // micro-temblor sutil
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
    p.rootT = Math.max(0, p.rootT - dt); p.stunT = Math.max(0, p.stunT - dt); p.stunImmune = Math.max(0, p.stunImmune - dt); p.inkT = Math.max(0, p.inkT - dt);
    for (let i = 0; i < 3; i++) { const h = this.hand[i]; if (h && h.cd > 0) h.cd = Math.max(0, h.cd - dt); }
    const stunned = p.stunT > 0;
    const sp = p.rootT > 0 || stunned ? 0 : st.speed * this.curseSlow * this.fx.speed * (p.inkT > 0 ? 0.5 : 1);
    p.moving = (mv.x !== 0 || mv.y !== 0) && sp > 0;
    p.vx = mv.x * sp; p.vy = mv.y * sp;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.x < -HX) p.x = -HX; if (p.x > HX) p.x = HX; if (p.y < -HY) p.y = -HY; if (p.y > HY) p.y = HY;
    if (this.zoned) { const zi = zoneAt(p.x); if (zi !== this.zoneIdx) { if (this.zoneIdx >= 0) this.zoneBanner = { text: ZONES[zi].name, t: 2.2 }; this.zoneIdx = zi; } }
    if (this.zoneBanner) { this.zoneBanner.t -= dt; if (this.zoneBanner.t <= 0) this.zoneBanner = null; }
    // Humor Negro (Barnaby): chiste periódico que aterra a la horda cercana
    if (st.fearAura) { p.jokeT -= dt; if (p.jokeT <= 0) { p.jokeT = 12; this.tellJoke(220, 2.5); } }
    this.collideSolids(p, p.r);
    if (st.regen > 0) { p.regenT += dt; if (p.regenT >= 1) { p.regenT = 0; this.heal(st.regen, true); } }
    // apuntado
    let has = false;
    if (this.settings.aim === 'mouse' && inp.mouse.active && !inp.isTouch) {
      const wx = this.cam.x + (inp.mouse.x - this.w / 2) / this.scale, wy = this.cam.y + (inp.mouse.y - this.h / 2) / this.scale;
      p.aim = Math.atan2(wy - (p.y - 24), wx - p.x); p.aimDist = Math.hypot(wx - p.x, wy - p.y); has = true;
    } else {
      const t = this.nearest(p.x, p.y, this.range(), 0);
      if (t) { p.aim = Math.atan2(t.y - t.r - (p.y - 24), t.x - p.x); p.aimDist = Math.sqrt(this.q.bestD); has = true; }
    }
    const ca = Math.cos(p.aim);
    if (ca > 0.15) p.face = 1; else if (ca < -0.15) p.face = -1; else if (mv.x) p.face = mv.x > 0 ? 1 : -1;
    if (!stunned) fireWeapon(this, dt, has);
    for (let i = 0; i < 3; i++) if (inp.consume('c' + i) && !stunned) this.useHand(i);
    if (p.hp / p.maxHp < 0.3) { this.lowBarkT -= dt; if (this.lowBarkT <= 0) { this.lowBarkT = 20; this.say(null, BARKS[this.hero.id].low, 0, false, 2); } }
  }

  useHand(i) {
    const h = this.hand[i];
    if (!h) return;
    if (h.cd > 0) { this.addText(this.player.x, this.player.y - 76, 'Recargando…', '#a8987a', 12, false); return; }
    h.cd = h.card.cd * this.st.cardCd;
    Sfx.play('cardthrow');
    playCard(this, h.card);
    this.dealPoker('carta');
    // partículas de tinta y pólvora al jugar la carta (desde su hueco en el HUD)
    const hb = this.hudCards ? this.hudCards[i] : null;
    this.uiBurst(hb ? hb.x : this.w / 2, hb ? hb.y : this.h - 60, '#ffb347', 30, true);
    const p = this.player;
    for (let k = 0; k < 16; k++) { const a = Math.random() * TAU, sp = 80 + Math.random() * 200; this.addPart(p.x, p.y - 30, Math.cos(a) * sp, Math.sin(a) * sp, 0.6, 3 + Math.random() * 3, k % 2 ? '#0a0605' : '#3a2a20', PT.SMOKE, false).grow = 10; }
    Sfx.play('card');
    if (Math.random() < 0.35) this.say(null, BARKS[this.hero.id].card, 1.6);
    if (h.card.curse) this.addCurse(h.card.curse, h.card.name);
  }

  // Alcance real de disparo/detección (anillo de tinta en el suelo).
  range() { return this.weapon.range * this.st.rangeMult * this.fx.range; }
  magSize() { return Math.max(1, Math.round(this.weapon.mag * (this.st ? this.st.magMult : 1))); }

  tellJoke(radius, time) {
    const p = this.player, jokes = BARKS.barnaby.jokes;
    this.say(null, jokes, 0, false, 3);
    const q = this.q; q.x = p.x; q.y = p.y; let n = 0;
    const E = this.zombies.items;
    for (let i = 0; i < this.zombies.n; i++) {
      const e = E[i];
      if (e.dead || e.colossus) continue;
      if ((e.x - p.x) ** 2 + (e.y - p.y) ** 2 < radius * radius) { e.fearT = Math.max(e.fearT, time); n++; }
    }
    this.addPart(p.x, p.y - 20, 0, 0, 0.5, radius * 0.3, '#e8dcc0', PT.RING, true).grow = radius * 1.6;
  }

  stunPlayer(t) {
    const p = this.player;
    if (p.stunImmune > 0 || this.fx.invuln || this.state !== 'play') return;
    p.stunT = t; p.stunImmune = t + 2.5;
    this.addText(p.x, p.y - 80, '¡ATURDIDO!', '#9ab8ff', 15, true);
  }

  // ---------------------------------------------------------------- póker de tinta y furias
  // Reparte un naipe al póker al encadenar bajas o jugar cartas (además de los que suelta la horda).
  dealPoker(reason) {
    this.dealt++;
    const r = (Math.random() * RANKS.length) | 0, s = (Math.random() * SUITS.length) | 0;
    this.addText(this.player.x + 30, this.player.y - 70, (reason === 'racha' ? 'RACHA · ' : 'CARTA · ') + RANKS[r] + SUITS[s], '#efe2c4', 12, false);
    this.addPokerCard(r, s);
  }
  addPokerCard(r, s) {
    this.poker.push({ r, s });
    this.pokerCount++;
    Sfx.play('card');
    this.pokerPartial = this.poker.length < 5 ? (evaluateHand(this.poker) || '') : '';
    if (this.poker.length < 5) return;
    const combo = evaluateHand(this.poker);
    this.pokerShow = { hand: this.poker.slice(), combo, t: 2.2 };
    this.poker.length = 0; this.pokerPartial = '';
    if (combo) { const rk = HAND_RANK.indexOf(combo); if (rk > this.bestHandRank) { this.bestHandRank = rk; this.bestHand = FURIES[combo].name; } }
    if (!combo) { this.addText(this.player.x, this.player.y - 90, 'Carta alta… nada', '#a89a82', 14, false); return; }
    const F = FURIES[combo];
    const ex = this.furies.find((f) => f.id === combo);
    if (ex) ex.t = F.time; else this.furies.push({ id: combo, t: F.time, max: F.time });
    this.showBanner(F.label, F.desc, 1.8);
    this.comicText(this.player.x, this.player.y - 110, '¡' + F.name.toUpperCase() + '!', F.color, 30);
    this.flash = 0.35; Sfx.play('combo');
    this.uiBurst(this.w * 0.12, this.h - 60, F.color, 40, false);
  }

  updateFuries(dt) {
    const fx = this.fx;
    fx.dmg = 1; fx.rate = 1; fx.speed = 1; fx.pierce = 0; fx.range = 1; fx.crit = 0; fx.reload = 1; fx.invuln = false; fx.explode = 0;
    for (let i = this.furies.length - 1; i >= 0; i--) {
      const f = this.furies[i]; f.t -= dt;
      if (f.t <= 0) { this.furies.splice(i, 1); continue; }
      const F = FURIES[f.id];
      if (F.dmg) fx.dmg *= F.dmg; if (F.rate) fx.rate *= F.rate; if (F.speed) fx.speed *= F.speed;
      if (F.pierce) fx.pierce += F.pierce; if (F.range) fx.range *= F.range; if (F.crit) fx.crit = 1;
      if (F.reload === 0) fx.reload = 0; if (F.invuln) fx.invuln = true; if (F.explode) fx.explode = Math.max(fx.explode, F.explode);
    }
    // Último cartucho (fiebre final de la ronda): +30% daño
    if (this.objective && this.objective.fever) { fx.dmg *= 1.3; fx.rate *= 1.15; }
    if (this.weather && this.weather.id === 'eclipse' && fx.reload !== 0) fx.reload = 0.45;
    if (this.pokerShow) { this.pokerShow.t -= dt; if (this.pokerShow.t <= 0) this.pokerShow = null; }
  }

  // ---------------------------------------------------------------- partículas de tinta/pólvora en pantalla
  uiBurst(x, y, color, n = 24, ink = true) {
    for (let i = 0, k = 0; i < this.uiParts.length && k < n; i++) {
      const u = this.uiParts[i];
      if (u.on) continue;
      const a = Math.random() * TAU, s = 60 + Math.random() * 260;
      u.on = true; u.x = x; u.y = y; u.vx = Math.cos(a) * s; u.vy = Math.sin(a) * s - 60; u.life = 0; u.max = 0.5 + Math.random() * 0.5;
      u.size = 2 + Math.random() * (ink ? 5 : 3); u.color = k % 3 === 0 && ink ? '#0a0605' : color; u.ink = ink && k % 3 === 0; k++;
    }
  }
  updateUi(dt) {
    for (const u of this.uiParts) {
      if (!u.on) continue;
      u.life += dt; if (u.life >= u.max) { u.on = false; continue; }
      u.x += u.vx * dt; u.y += u.vy * dt; u.vy += 420 * dt; u.vx *= 1 - 2 * dt;
    }
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
    if (p.inv > 0 || this.state !== 'play' || this.fx.invuln) return;
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
    e.xp = d.xp; e.soul = d.soul; e.dead = false; e.alpha = 1; e.name = ''; e.hitBy = 0; e.fearT = 0; e.flank = Math.random() < 0.5 ? 1 : -1;
    if (this.objective.assignTarget) this.objective.assignTarget(e);
    return e;
  }

  spawnColossus(type, hpMult = 1) {
    const C = COLOSSI[type], p = this.player, e = this.zombies.get();
    if (!e) return null;
    const a = Math.random() * TAU;
    e.uid = this.uid++; e.type = type; e.def = C;
    e.x = Math.max(-HX + 80, Math.min(HX - 80, p.x + Math.cos(a) * 460)); e.y = Math.max(-HY + 80, Math.min(HY - 80, p.y + Math.sin(a) * 460));
    e.vx = 0; e.vy = 0; e.r = C.r; e.maxHp = e.hp = Math.round(C.hp * hpMult); e.armor = e.maxArmor = 0;
    e.speed = C.speed; e.dmg = C.dmg; e.colossus = true; e.elite = false; e.spr = this.spr.zombie(type);
    e.flash = 0; e.burnT = 0; e.slowT = 0; e.stunT = 0; e.rootT = 0; e.dead = false; e.alpha = 1; e.name = C.name; e.xp = C.xp; e.soul = C.soul;
    e.fearT = 0; e.flank = 1; e.mode = 'move'; e.modeT = 2.2; e.patIdx = 0; e.subT = 0; e.subN = 0; e.phase = 0; e.ang = 0; e.state = 0; e.target = null; e.tauntT = 4;
    e.ang = Math.atan2(p.y - e.y, p.x - e.x); e.backDmg = 0; e.dynBlown = false; e.lamp = null; e.lampOut = false;
    if (type === 'plague') attachPlagueLamp(this, e);
    this.colossi.push(e);
    this.showBanner(C.name.toUpperCase(), '¡COLOSO DE ÉLITE!', 2.4);
    this.cam.shake = 16; Sfx.play('boss');
    this.say(e, C.taunts, 0, true, 3);
    this.say(null, BARKS[this.hero.id].boss, 0, false, 2);
    for (let i = 0; i < 30; i++) this.addPart(e.x, e.y - 30, (Math.random() - 0.5) * 500, (Math.random() - 0.5) * 500, 0.9, 7, '#1a1a1e', PT.SMOKE, false);
    return e;
  }

  // Daño a un zombi. crit ya resuelto. Devuelve true si murió.
  hurtZombie(e, dmg, crit, nx, ny, kb, burn, slow, stun, melt = 0) {
    if (e.dead) return false;
    let d = dmg;
    if (melt > 0) { if (e.armor > 0) e.armor = Math.max(0, e.armor - dmg * melt); if (e.colossus) d *= 1.35; }
    if (e.type === 'plague' && e.lampOut) d *= 1.5;
    if (e.type === 'spawn' && (nx || ny)) { // frontal blindado · espalda con dinamita = punto débil
      const dot = nx * Math.cos(e.ang) + ny * Math.sin(e.ang);
      if (dot > 0.3) {
        d *= 2.5; e.backDmg = (e.backDmg || 0) + d;
        if (this.weakT <= 0) { this.weakT = 0.8; this.addText(e.x, e.y - e.r * 3, '¡PUNTO DÉBIL!', '#ffd23a', 16, true); }
        if (e.backDmg > 380 && !e.dynBlown) {
          e.dynBlown = true; e.stunT = 2.2;
          this.explode(e.x - Math.cos(e.ang) * 40, e.y - Math.sin(e.ang) * 40 - 30, 150, 0, '#ff8a2a', 1, 0, 0, false);
          d += e.maxHp * 0.14; this.ono(e.x, e.y - 120, '¡KA-BOOM!', '#ff8a2a', 40);
        }
      } else if (dot < -0.3) { d *= 0.3; if (this.weakT <= 0 && Math.random() < 0.2) { this.weakT = 1.2; this.addText(e.x, e.y - e.r * 3, '¡BLINDADO! Rodéalo', '#c8c8d0', 13, false); } }
    }
    if (e.fearT > 0 && this.st.fearAura) d *= 1.25;
    if (e.armor > 0) {
      const absorbed = d * 0.7; e.armor -= absorbed; d -= absorbed;
      if (e.armor <= 0) { e.armor = 0; this.addText(e.x, e.y - e.r * 3, '¡CORAZA ROTA!', '#c8c8d0', 12, false); for (let i = 0; i < 8; i++) this.addPart(e.x, e.y - 30, (Math.random() - 0.5) * 260, -Math.random() * 200, 0.6, 4, '#8a8a90', PT.DEBRIS, false); }
      else if (Math.random() < 0.3) this.addPart(e.x, e.y - 30, (Math.random() - 0.5) * 160, -Math.random() * 100, 0.3, 3, '#e8e8e8', PT.SPARK, true);
    }
    e.hp -= d; e.flash = 0.1; // destello blanco al recibir daño
    if (kb > 0) { const m = e.colossus ? 0.06 : 1; e.vx += nx * kb * m; e.vy += ny * kb * m; }
    if (burn > 0) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, burn * (this.weather && this.weather.id === 'storm' ? 1.6 : 1)); }
    if (slow > 0) e.slowT = Math.max(e.slowT, slow);
    if (stun > 0 && !e.colossus) e.stunT = Math.max(e.stunT, stun);
    if (crit && this.onoT <= 0 && Math.random() < 0.35) this.ono(e.x + (Math.random() - 0.5) * 30, e.y - e.r * 3.2 - 34, Math.random() < 0.5 ? '¡BLAM!' : '¡BANG!', '#ffd23a', 24);
    if (crit || (d >= 6 && this.numT <= 0)) this.dmgNum(e.x + (Math.random() - 0.5) * 18, e.y - e.r * 2.8, d, crit);
    if (e.hp <= 0) { this.killZombie(e); return true; }
    Sfx.play('hit');
    return false;
  }

  killZombie(e) {
    e.dead = true; this.kills++;
    if (!e.colossus && e.maxHp >= 40) this.cam.shake = Math.max(this.cam.shake, 5); // baja importante: micro-temblor
    this.gold += e.colossus ? 60 : e.type === 'abomination' ? 8 : 1;
    if (e.colossus || (e.hp < -40 && this.onoT <= 0 && Math.random() < 0.3)) this.ono(e.x, e.y - e.r * 2.5, '¡CRACK!', '#e8dcc0', e.colossus ? 44 : 26);
    Sfx.play('kill');
    this.profileXp += e.soul * 2;
    const souls = e.xp;
    for (let v = souls; v > 0;) { const k = v >= 5 ? 5 : 1; this.drop(e.x, e.y, k === 5 ? PK.BIGSOUL : PK.SOUL, k); v -= k; }
    if (Math.random() < (e.colossus ? 1 : 0.012)) this.drop(e.x, e.y, PK.HEAL, 25);
    // naipes de tinta para el póker
    const cardChance = (e.colossus ? 2 : e.type === 'abomination' ? 0.7 : 0.055) * (1 + this.st.pokerLuck);
    for (let n = cardChance; n > 0; n -= 1) if (Math.random() < n) this.dropCard(e.x, e.y);
    if (e.def.puddle) this.addZone(ZK.INK, e.x, e.y, e.def.puddle.r, e.def.puddle.time, 0, '#0a0a12', 0);
    for (let i = 0; i < 7; i++) { const a = Math.random() * TAU, s = 60 + Math.random() * 200; this.addPart(e.x, e.y - e.r, Math.cos(a) * s, Math.sin(a) * s, 0.4 + Math.random() * 0.3, 2 + Math.random() * 3, i % 3 ? '#3a0c0a' : '#0a0806', PT.BLOOD, false); }
    this.addDecal(e.x, e.y, e.r * (0.8 + Math.random() * 0.6), Math.random() < 0.5 ? 1 : 0);
    this.addDecal(e.x + (Math.random() - 0.5) * 10, e.y + 2, e.r * (1.1 + Math.random() * 0.5), 3); // marca de tinta que se desvanece
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
    if (this.killChain % 8 === 0) this.dealPoker('racha');
    if (this.killChain % 30 === 0) this.say(null, BARKS[this.hero.id].streak, 1.6);
    this.holyKills++;
    if (this.objective.onKill) this.objective.onKill(e);
  }

  drop(x, y, kind, value) {
    const it = this.items.get(); if (!it) return;
    const a = Math.random() * TAU, s = 30 + Math.random() * 90;
    it.x = x; it.y = y; it.kind = kind; it.value = value; it.vx = Math.cos(a) * s; it.vy = Math.sin(a) * s; it.mag = false; it.t = 0;
  }

  dropCard(x, y) {
    const it = this.items.get(); if (!it) return;
    const a = Math.random() * TAU;
    it.x = x; it.y = y; it.kind = PK.CARD; it.value = 1; it.vx = Math.cos(a) * 80; it.vy = Math.sin(a) * 80; it.mag = false; it.t = 0;
    it.cr = (Math.random() * RANKS.length) | 0; it.cs = (Math.random() * SUITS.length) | 0;
  }

  addDecal(x, y, r, kind) {
    const i = this.decalI * 4;
    this.decals[i] = x; this.decals[i + 1] = y; this.decals[i + 2] = r; this.decals[i + 3] = kind; this.decalT[this.decalI] = this.realTime;
    this.decalI = (this.decalI + 1) % 160; this.decalN = Math.min(160, this.decalN + 1);
  }

  // ---------------------------------------------------------------- explosiones
  // owner 1 = del jugador / trampa (daña horda), fromTrap: el Purgador duplica daño y es inmune.
  explode(x, y, r, dmg, color, owner, burn, kb, quiet, fromTrap = false) {
    if (dmg > 0 && owner === 1) {
      const q = this.q; q.x = x; q.y = y; q.r = r; q.dmg = dmg * (fromTrap && this.st.trapMaster ? 2 : 1); q.kb = kb || 220; q.burn = burn || 0; q.stun = 0; q.melt = 0;
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
      if (r >= 90 || Math.random() < 0.4) this.ono(x, y - r * 0.6, r >= 110 ? '¡KABOOM!' : Math.random() < 0.5 ? '¡BOOM!' : '¡KA-BLAM!', color, r >= 110 ? 32 : 24);
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
    b.len = kind === BK.RIFLE || kind === BK.HARPOON ? 28 : kind === BK.PELLET ? 8 : 14; b.spin = 0; b.ox = x; b.oy = y; b.acid = false;
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
          if (b.acid) this.addZone(ZK.ACID, b.x, b.y, b.radius, 7, 22 * this.st.dmg, '#9dff3a', 1);
          else if (b.burn > 0) this.addZone(ZK.FIRE, b.x, b.y, b.radius, 7, b.burn, '#ff6a1a', 1);
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
      if (b.life <= 0 || b.x < -HX - 200 || b.x > HX + 200 || b.y < -HY - 200 || b.y > HY + 200) { this.bullets.kill(i); continue; }
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
    let crit = b.crit || this.fx.crit > 0 || Math.random() < st.crit + (this.weapon.critBonus || 0);
    let mult = st.dmg * this.fx.dmg;
    if (st.rage && p.hp < p.maxHp * 0.5) mult *= 1 + st.rage;
    if (dist < 170 && st.closeBonus) mult *= 1 + st.closeBonus;
    let cm = st.critMult;
    if (st.farCrit) cm *= 1 + Math.min(1, dist / 600) * 0.6;
    const dmg = b.dmg * mult * (crit ? cm : 1);
    const sp = Math.hypot(b.vx, b.vy) || 1;
    this.hurtZombie(e, dmg, crit, b.vx / sp, b.vy / sp, b.kb, b.burn, b.slow, b.stun);
    if (crit && st.critExplode) this.explode(e.x, e.y - e.r, 55 + 10 * st.critExplode, dmg * 0.4, '#ff4a8a', 1, 0, 160, true);
    if ((b.kind === BK.HARPOON || b.kind === BK.CARD) && b.radius > 0) { this.explode(b.x, b.y, b.radius, b.dmg * mult * 0.7, b.kind === BK.CARD ? '#ff8a3a' : this.pal.glow, 1, 0, 260, b.kind === BK.CARD); b.radius = 0; }
    // disparos en área (Pólvora Negra / Póker) y metralla
    const area = Math.max(st.splash, this.fx.explode);
    if (area > 0 && b.kind !== BK.LOB && b.kind !== BK.SHRAP) this.explode(b.x, b.y, area, dmg * 0.35, '#ffb347', 1, 0, 120, true);
    if (st.shrapnel > 0 && b.kind !== BK.SHRAP) {
      for (let k = 0; k < st.shrapnel; k++) {
        const s2 = this.addBullet(b.x, b.y, Math.random() * TAU, 520, b.dmg * 0.3, 2.5, 0, 0.22, '#d8c8a0', '#ffffff', BK.SHRAP, 40);
        if (s2) { s2.hits.push(e.uid); s2.chain = 0; s2.burn = 0; }
      }
    }
    this.addPart(b.x, b.y, -b.vx * 0.15 + (Math.random() - 0.5) * 80, -b.vy * 0.15 + (Math.random() - 0.5) * 80, 0.15, 4, b.color, PT.SPARK, true);
    if (st.arc > 0 && b.kind !== BK.SHRAP && Math.random() < st.arc) this.chainLightning(e, 2, 160, dmg * 0.45, '#9ab8ff');
    if (crit && this.weapon.fearOnCrit && this.fearT2 <= 0) {
      this.fearT2 = 1.2; const E = this.zombies.items;
      for (let i = 0; i < this.zombies.n; i++) { const z = E[i]; if (!z.dead && !z.colossus && (z.x - e.x) ** 2 + (z.y - e.y) ** 2 < 160 * 160) z.fearT = Math.max(z.fearT, this.weapon.fearOnCrit); }
      this.ono(e.x, e.y - 80, '¡JA!', '#ffcf6a', 24);
    }
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

  // Arco eléctrico en cadena desde un objetivo (bobinas, pistola Tesla).
  chainLightning(from, n, radius, dmg, color, includeFirst = false) {
    let cur = from, hit = 0;
    if (includeFirst) { this.hurtZombie(from, dmg, false, 0, 0, 40, 0, 0, 0.25); this.electricHit(from.x, from.y); }
    while (hit < n) {
      const t = this.nearest(cur.x, cur.y, radius, cur.uid);
      if (!t || t === from) break;
      this.addArc(cur.x, cur.y - cur.r * 1.4, t.x, t.y - t.r * 1.4, color);
      this.hurtZombie(t, dmg, false, 0, 0, 40, 0, 0, 0.25);
      this.electricHit(t.x, t.y);
      cur = t; hit++;
    }
    return cur;
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
      if (b.life <= 0) { if (b.kind === EK.INK) this.addZone(ZK.INK, b.x, b.y + 20, 34, 3, 0, '#0a0a12', 0); this.ebullets.kill(i); continue; }
      // las coberturas detienen los proyectiles enemigos
      let blocked = false;
      for (let k = 0; k < this.traps.length; k++) { const t = this.traps[k]; if (t.solid && !t.dead && Math.abs(t.x - b.x) < t.r && Math.abs(t.y - 20 - b.y) < t.r * 0.8) { t.hp -= b.dmg; t.flash = 0.1; blocked = true; break; } }
      if (blocked) { this.addPart(b.x, b.y, 0, -40, 0.3, 4, '#c8a878', PT.SPLINTER, false); this.ebullets.kill(i); continue; }
      const dx = p.x - b.x, dy = (p.y - 22) - b.y, rr = p.r + b.r;
      if (dx * dx + dy * dy < rr * rr && p.inv <= 0) { this.hurtPlayer(b.dmg); if (b.kind === EK.INK) p.inkT = 1.5; this.ebullets.kill(i); }
    }
  }

  // ---------------------------------------------------------------- zonas
  addZone(kind, x, y, r, life, dmg, color, owner) {
    const z = this.zones.get(); if (!z) return null;
    if (kind === ZK.FIRE && this.weather && this.weather.id === 'storm') { r *= 1.25; dmg *= 1.4; }
    z.uid = this.uid++; z.kind = kind; z.x = x; z.y = y; z.r = r; z.maxR = r; z.elec = false; z.charged = 0; z.pn = 0; z.life = 0; z.max = life; z.dmg = dmg; z.color = color; z.tick = 0; z.owner = owner; z.ang = 0; z.len = 0; z.vx = 0; z.vy = 0;
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
            const q = this.q; q.x = z.x; q.y = z.y; q.r = z.r; q.dmg = z.dmg * 0.33 * (z.kind === ZK.GAS ? 1 : (this.st.trapMaster ? 2 : 1)); q.kb = 0; q.burn = z.kind === ZK.FIRE ? 4 : 0; q.stun = 0; q.melt = 0;
            if (z.kind === ZK.FIRE || z.owner === 1) { this.grid.query(z.x, z.y, z.r + 20, this._areaFn); for (const c of this.colossi) this._areaFn(c); }
            if (Math.hypot(p.x - z.x, p.y - z.y) < z.r * 0.9) this.hurtPlayer(z.kind === ZK.GAS ? z.dmg * 0.6 : 8, z.kind === ZK.FIRE);
          }
          if (Math.random() < dt * 18) this.addPart(z.x + (Math.random() - 0.5) * z.r * 1.6, z.y + (Math.random() - 0.5) * z.r, 0, -40 - Math.random() * 50, 0.6, 4, z.kind === ZK.GAS ? '#9dff3a' : (Math.random() < 0.5 ? '#ff6a1a' : '#ffd23a'), PT.EMBER, true);
          break;
        }
        case ZK.RING: {
          z.r = z.maxR * (z.life / z.max);
          const q = this.q; q.x = z.x; q.y = z.y; q.r = z.r; q.dmg = z.dmg * dt * 3; q.kb = 300 * dt * 3; q.burn = 6; q.stun = 0; q.melt = 0;
          this.grid.query(z.x, z.y, z.r + 30, this._areaFn);
          break;
        }
        case ZK.STRIKE:
          if (z.tick === 0 && z.life >= z.max) { z.tick = 1; this.explode(z.x, z.y, z.r, z.dmg, z.color, 1, z.elec ? 0 : 8, 260, Math.random() < 0.5); if (z.elec) { this.electricHit(z.x, z.y); this.ono(z.x, z.y - 90, '¡ZAP!', '#cfe8ff', 30); Sfx.play('thunder'); } }
          break;
        case ZK.POOL:
          if (z.life > 0.8 && Math.hypot(p.x - z.x, p.y - z.y) < z.r) { z.tick -= dt; if (z.tick <= 0) { z.tick = 0.5; this.hurtPlayer(z.dmg); } }
          break;
        case ZK.SLAM:
          if (z.tick === 0 && z.life >= z.max) { z.tick = 1; this.explode(z.x, z.y, z.r, 0, z.color, 0, 0, 0, false); this.explodeHitsPlayer(z.x, z.y, z.r, z.dmg); }
          break;
        case ZK.INK:
          if ((p.x - z.x) ** 2 + ((p.y - z.y) / 0.6) ** 2 < z.r * z.r) p.inkT = 0.15;
          if (z.charged > 0) z.charged -= dt;
          break;
        case ZK.ACID:
          z.tick -= dt;
          if (z.tick <= 0) {
            z.tick = 0.33;
            const q = this.q; q.x = z.x; q.y = z.y; q.r = z.r; q.dmg = z.dmg * 0.33; q.kb = 0; q.burn = 0; q.stun = 0; q.melt = 3;
            this.grid.query(z.x, z.y, z.r + 20, this._areaFn); for (const c of this.colossi) this._areaFn(c);
            q.melt = 0;
          }
          if (Math.random() < dt * 10) this.addPart(z.x + (Math.random() - 0.5) * z.r * 1.4, z.y + (Math.random() - 0.5) * z.r * 0.7, 0, -30, 0.6, 3, '#b8ff4a', PT.EMBER, true);
          break;
        case ZK.TRAIN: case ZK.RIDERS: {
          z.x += z.vx * dt;
          const q = this.q; q.x = z.x; q.y = z.y; q.r = z.r; q.dmg = z.dmg; q.kb = 700; q.burn = 0; q.stun = 0.5; q.melt = 0;
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
    this.synT -= dt;
    if (this.synT <= 0) { this.synT = 0.25; this.synergies(); }
  }

  // ---------------------------------------------------------------- SINERGIAS ELEMENTALES
  // Tinta/Ácido + Fuego = Explosión de Pólvora con muros de fuego.
  synergies() {
    const Z = this.zones.items, n = this.zones.n;
    for (let i = 0; i < n; i++) {
      const f = Z[i];
      if (f.kind !== ZK.FIRE || f.life >= f.max) continue;
      for (let j = 0; j < n; j++) {
        const z = Z[j];
        if ((z.kind !== ZK.INK && z.kind !== ZK.ACID) || z.life >= z.max) continue;
        const dx = z.x - f.x, dy = z.y - f.y, d = Math.hypot(dx, dy);
        if (d > f.r + z.r * 0.7) continue;
        z.life = z.max; // la tinta/ácido se consume
        const m = this.st.trapMult * (this.st.trapMaster ? 2 : 1);
        this.explode(z.x, z.y, z.r + 60, 150 * m, '#ff8a2a', 1, 8, 420, true, true);
        this.explodeHitsPlayer(z.x, z.y, z.r + 40, 18, true);
        this.ono(z.x, z.y - 100, '¡PÓLVORA!', '#ffb347', 34);
        // muro de fuego perpendicular a la reacción
        const ux = d ? -dy / d : 1, uy = d ? dx / d : 0;
        for (let k = -2; k <= 2; k++) this.addZone(ZK.FIRE, z.x + ux * k * 48, z.y + uy * k * 30, 44, 5, 22, '#ff6a1a', 1);
        Sfx.play('boom');
        return;
      }
    }
  }

  // Electricidad + charcos de tinta de las arañas = sobrecarga en cadena.
  electricHit(x, y) {
    const Z = this.zones.items, n = this.zones.n;
    let start = null;
    for (let i = 0; i < n; i++) { const z = Z[i]; if (z.kind === ZK.INK && z.charged <= 0 && Math.hypot(z.x - x, z.y - y) < z.r + 40) { start = z; break; } }
    if (!start) return;
    const chain = [start]; start.charged = 0.9;
    for (let c = 0; c < chain.length && chain.length < 14; c++) {
      const a = chain[c];
      for (let i = 0; i < n; i++) { const z = Z[i]; if (z.kind === ZK.INK && z.charged <= 0 && Math.hypot(z.x - a.x, z.y - a.y) < 240) { z.charged = 0.9; chain.push(z); this.addArc(a.x, a.y - 6, z.x, z.y - 6, '#cfe8ff'); } }
    }
    const q = this.q;
    for (const z of chain) { q.x = z.x; q.y = z.y; q.r = z.r + 10; q.dmg = 48 * this.st.dmg; q.kb = 0; q.burn = 0; q.stun = 0.7; q.melt = 0; this.grid.query(z.x, z.y, z.r + 40, this._areaFn); this.lightPulse(z.x, z.y, z.r * 3, 0.35); }
    if (this.zapT <= 0) { this.zapT = 0.6; this.comicText(start.x, start.y - 90, chain.length > 1 ? '¡SOBRECARGA x' + chain.length + '!' : '¡ZAP!', '#cfe8ff', 30); Sfx.play('zap'); }
  }

  addArc(x1, y1, x2, y2, color) {
    const z = this.addZone(ZK.ARC, x1, y1, 0, 0.18, 0, color, 1);
    if (!z) return;
    const N = 9; z.pn = N;
    for (let k = 0; k < N; k++) {
      const t = k / (N - 1), j = k === 0 || k === N - 1 ? 0 : 14;
      z.pts[k * 2] = x1 + (x2 - x1) * t + (Math.random() - 0.5) * j; z.pts[k * 2 + 1] = y1 + (y2 - y1) * t + (Math.random() - 0.5) * j;
    }
  }

  // ---------------------------------------------------------------- CLIMA DINÁMICO
  startWeather(id) {
    const a = Math.random() * TAU;
    this.weather = { id, t: 30, max: 30, wx: Math.cos(a), wy: Math.sin(a) * 0.5, spread: 1 };
    if (id === 'eclipse') this.showBanner('ECLIPSE DE SANGRE Y TINTA', 'Oscuridad parcial · halos de luz · recarga potenciada', 2.6);
    else this.showBanner('TORMENTA DE CENIZA Y PÓLVORA', 'El viento propaga el fuego · más alcance incendiario', 2.6);
    Sfx.play('thunder'); this.flash = 0.4;
  }
  updateWeather(dt) {
    const w = this.weather;
    if (!w) return;
    w.t -= dt;
    if (w.t <= 0) { this.weather = null; this.addText(this.player.x, this.player.y - 100, 'El cielo se calma…', '#e8dcc0', 14, false); return; }
    if (w.id === 'storm') {
      w.spread -= dt;
      const Z = this.zones.items;
      let fires = 0;
      for (let i = 0; i < this.zones.n; i++) { const z = Z[i]; if (z.kind === ZK.FIRE) { fires++; z.x += w.wx * 22 * dt; z.y += w.wy * 22 * dt; } }
      if (w.spread <= 0) {
        w.spread = 0.9;
        for (let i = 0, k = 0; i < this.zones.n && k < 3 && fires < 28; i++) {
          const z = Z[i];
          if (z.kind !== ZK.FIRE || z.life > z.max * 0.7 || Math.random() < 0.5) continue;
          this.addZone(ZK.FIRE, z.x + w.wx * 70, z.y + w.wy * 70, Math.max(36, z.r * 0.8), 3.5, z.dmg, '#ff6a1a', 1);
          k++; fires++;
        }
      }
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
    if (it.kind === PK.CARD) { this.addPokerCard(it.cr, it.cs); return; }
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

  // ---------------------------------------------------------------- diálogos (un solo canal, sin pisarse)
  // Duración adaptativa 4,5–6 s, texto que corre como tinta, desvanecido suave y enfriamiento entre frases.
  // Prioridad: 0 gruñidos · 1 comentarios · 2 frases clave · 3 chistes y colosos.
  say(entity, lines, _time = 0, scream = false, prio = -1) {
    const text = Array.isArray(lines) ? lines[(Math.random() * lines.length) | 0] : lines;
    if (prio < 0) prio = scream ? 3 : entity ? 0 : 1;
    const d = this.dlg;
    const line = { text, follow: entity, uid: entity ? entity.uid : 0, hero: !entity, scream, prio };
    if (d.cur || d.cool > 0) {
      if (prio === 0) return;                                  // los gruñidos no esperan turno
      if (!d.next || prio >= d.next.prio) d.next = line;       // una sola frase en espera (la más importante)
      return;
    }
    this.startLine(line);
  }
  startLine(l) {
    const plain = l.text.replace(/\*/g, '');
    l.plain = plain; l.len = plain.length;
    l.dur = Math.min(6, Math.max(4.5, 3.6 + plain.length * 0.03));
    l.life = 0; l.layout = null; l.x = this.player.x; l.y = this.player.y - 80;
    this.dlg.cur = l;
    if (l.follow && !l.scream) Sfx.play('groan');
  }
  updateDialogue(dt) {
    this.chainT -= dt; if (this.chainT <= 0) this.killChain = 0;
    const d = this.dlg;
    if (d.cool > 0) d.cool -= dt;
    const l = d.cur;
    if (l) {
      l.life += dt;
      if (l.follow && (l.follow.dead || l.follow.uid !== l.uid)) { l.follow = null; if (!l.hero) l.life = Math.max(l.life, l.dur); }
      const src = l.follow || (l.hero ? this.player : null);
      if (src) { l.x = src.x; l.y = src.y - (src.spr ? src.spr.oy : 74); }
      if (l.life >= l.dur + 0.45) { d.cur = null; d.cool = 0.9; }
    } else if (d.next && d.cool <= 0) { const n = d.next; d.next = null; if (!n.follow || !n.follow.dead) this.startLine(n); }
    // gruñidos de la horda solo si el canal está libre
    this.groanT -= dt;
    if (this.groanT <= 0 && this.zombies.n && !d.cur && !d.next && d.cool <= 0) {
      this.groanT = 7 + Math.random() * 5;
      const e = this.zombies.items[(Math.random() * this.zombies.n) | 0];
      if (!e.dead && !e.colossus && Math.abs(e.x - this.cam.x) < this.viewW / 2.4 && Math.abs(e.y - this.cam.y) < this.viewH / 2.4) this.say(e, BARKS.zombie, 0, false, 0);
    }
  }

  // ---------------------------------------------------------------- fx
  addPart(x, y, vx, vy, life, size, color, kind, add) {
    const p = this.parts.get() || this.parts.items[(Math.random() * this.parts.n) | 0];
    p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = 0; p.max = life; p.size = size; p.color = color; p.kind = kind; p.grow = 0; p.drag = 0; p.add = add;
    return p;
  }
  // Número de daño estilizado: tipografía de cartel, sombra dura desplazada y salto; críticos en rojo sangre.
  dmgNum(x, y, d, crit) {
    const t = this.texts.get(); if (!t) return;
    if (!crit) this.numT = 0.045;
    t.x = x; t.y = y; t.vy = crit ? -90 : -70; t.life = 0; t.max = crit ? 0.9 : 0.6; t.str = crit ? Math.round(d) + '!' : '' + Math.round(d);
    t.color = crit ? '#ff4a2a' : '#efe2c4'; t.size = crit ? 19 : Math.min(15, 10 + d / 25); t.big = false; t.num = crit ? 2 : 1; t.rot = (Math.random() - 0.5) * 0.3;
  }
  addText(x, y, str, color, size, big) {
    const t = this.texts.get(); if (!t) return;
    t.x = x; t.y = y; t.vy = -60; t.life = 0; t.max = big ? 1.1 : 0.75; t.str = str; t.color = color; t.size = size; t.big = big; t.num = 0;
  }
  comicText(x, y, str, color, size) {
    const t = this.texts.get(); if (!t) return;
    t.x = x; t.y = y; t.vy = -30; t.life = 0; t.max = 1.2; t.str = str; t.color = color; t.size = size; t.big = true; t.num = 0;
  }
  showBanner(title, sub, t) { t = Math.max(1.1, t * 0.6); this.banner = { title, sub, t, max: t }; } // corto y discreto
  // Onomatopeya de tinta (limitada para no saturar la pantalla)
  ono(x, y, str, color, size) { if (this.onoT > 0) return; this.onoT = 0.22; this.comicText(x, y, str, color, size); }

  // ---------------------------------------------------------------- fin
  finish(win) {
    if (this.state === 'over') return;
    this.state = 'over'; this.endT = win ? 2.2 : 2.0;
    if (win) { Sfx.play('win'); this.showBanner('¡CASO CERRADO!', '', 2.5); this.flash = 0.6; }
    else { Sfx.play('lose'); this.showBanner('FINAL TRÁGICO', '', 2.5); }
    const o = this.objective;
    if (win && this.mission) { this.profileXp += this.mission.reward; this.gold += Math.round(this.mission.reward / 2); }
    this.result = {
      mode: this.modeId, win, missionId: this.mission ? this.mission.id : null, round: o.round || 0, kills: this.kills,
      time: this.time, level: this.level, profileXp: Math.round(this.profileXp), deck: this.deck,
      killer: o.killerName ? o.killerName() : '', gold: Math.round(this.gold),
      petKills: this.petKills || 0, petName: this.pet ? this.pet.def.name : '', petKind: this.pet ? this.pet.def.kind : '', bestHand: this.bestHand || '',
    };
  }
}
