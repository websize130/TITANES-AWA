import * as THREE from 'three';
import { TAU, clamp, damp, lerp, rand } from '../core/utils.js';
import { CONFIG } from '../data/config.js';
import { WEAPONS } from '../data/weapons.js';
import { TextureFactory } from '../render/textures.js';

/* =====================================================================
   ARMAS: pistola (munición infinita) + una ranura (escopeta, subfusil o fusil).
   Cargador, reserva, recarga, fuego automático, perdigones y retroceso.
   Emite 'weapon:fired', 'weapon:changed' y 'weapon:reload'.
   ===================================================================== */
export class WeaponSystem {
  constructor(game, player) {
    this.game = game; this.p = player; this.cooldown = 0; this.pending = 0; this.objs = []; this.bloom = 0; this.reloadT = 0; this.reloadDur = 1; this.switchT = 0; this.autoT = 0; this.enabled = true;
    const sc = game.scene, track = (o) => { sc.add(o); this.objs.push(o); return o; };
    this.sprite = track(new THREE.Sprite(new THREE.SpriteMaterial({ map: TextureFactory.dot, color: 0xffc27a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })));
    this.sprite.scale.setScalar(0.24);
    const N = 64; this.sp = { n: N, pos: new Float32Array(N * 3).fill(-999), vel: new Float32Array(N * 3), life: new Float32Array(N), i: 0 };
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.sp.pos, 3));
    this.points = track(new THREE.Points(g, new THREE.PointsMaterial({ map: TextureFactory.dot, color: 0xffb35c, size: 0.045, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })));
    this.points.frustumCulled = false;
    this.dust = Array.from({ length: 6 }, () => { const s = track(new THREE.Sprite(new THREE.SpriteMaterial({ map: TextureFactory.cloud, color: 0x8a8378, transparent: true, opacity: 0, depthWrite: false }))); s.userData.life = 0; return s; });
    this.dust.i = 0; this.v = new THREE.Vector3(); this.dir = new THREE.Vector3(); this.o = new THREE.Vector3();
    // Inventario: la pistola siempre; una segunda ranura para el arma que encuentres
    this.inv = ['pistol']; this.cur = 0; this.ammo = {};
    for (const k in WEAPONS) this.ammo[k] = { mag: WEAPONS[k].mag, res: WEAPONS[k].reserve };
    this.equip();
  }
  get key() { return this.inv[this.cur]; }
  get W() { return WEAPONS[this.key]; }
  get A() { return this.ammo[this.key]; }
  get reloading() { return this.reloadT > 0; }
  setEnabled(on) { this.enabled = on; if (!on) { this.sprite.material.opacity = 0; this.pending = 0; this.reloadT = 0; } }
  equip() {
    const m = this.p && this.p.model; if (m && m.setWeapon) m.setWeapon(this.key);
    this.game.events.emit('weapon:changed', { key: this.key, player: this.p });
  }
  handleInput(inp) {
    if (inp.consume('reload')) this.reload();
    if (inp.consume('swap')) this.select(this.cur ? 0 : 1);
    if (inp.consume('slot1')) this.select(0);
    if (inp.consume('slot2')) this.select(1);
    if (inp.consume('fire')) this.trigger(true);
    else if (this.W.auto && inp.fireHeld) this.trigger(false);
  }
  // Pide un disparo; si el arma está baja, primero la levanta. El cuchillazo se puede cancelar disparando
  trigger(pressed = true) {
    const p = this.p, K = CONFIG.knife; if (!p || !p.alive || !this.enabled || this.cooldown > 0 || this.pending > 0 || this.switchT > 0 || this.reloadT > 0) return;
    if (p.knifeT >= 0) { if (p.knifeT / K.time < K.cancel) return; p.knifeT = -1; }
    if (this.A.mag <= 0) {
      if (pressed) this.game.audio.dry();
      if (this.A.res > 0) this.reload();
      else if (pressed) { this.game.events.emit('weapon:empty', { key: this.key, player: p }); if (this.cur) this.select(0); }
      return;
    }
    p.holdAim(0.9); this.pending = 0.2;
  }
  reload() {
    const W = this.W, A = this.A, p = this.p;
    if (this.reloadT > 0 || A.mag >= W.mag || A.res <= 0 || !p.alive) return false;
    this.reloadDur = W.reload / (p.stats.reloadMult || 1); this.reloadT = this.reloadDur; this.pending = 0;
    this.game.audio.reload(this.key); this.game.events.emit('weapon:reload', { key: this.key, time: this.reloadDur, player: p });
    return true;
  }
  select(i) {
    if (i === this.cur || !this.inv[i] || this.pending > 0) return;
    this.reloadT = 0; this.cur = i; this.switchT = 0.28; this.game.audio.pickup(); this.equip();
  }
  // Recoger un arma: se coloca en la segunda ranura (la anterior se deja) y llega con el cargador lleno
  give(key) {
    if (!WEAPONS[key]) return;
    const W = WEAPONS[key], A = this.ammo[key];
    A.mag = W.mag; A.res = W.reserve;
    if (key === 'pistol') { this.select(0); return; }
    if (this.inv[1] !== key) this.inv[1] = key;
    this.reloadT = 0; this.cur = 1; this.switchT = 0.28; this.game.audio.pickup(); this.equip();
  }
  // Caja de munición: llena la reserva de las armas que llevas. Devuelve false si no hacía falta
  refill() {
    let any = false;
    for (const k of this.inv) { const W = WEAPONS[k], A = this.ammo[k]; if (A.res < W.reserve) { A.res = W.reserve; any = true; } }
    if (any) { this.game.audio.pickup(); this.game.events.emit('weapon:changed', { key: this.key, player: this.p }); }
    return any;
  }
  needsAmmo() { return this.inv.some((k) => this.ammo[k].res < WEAPONS[k].reserve * 0.5); }
  fire() {
    const g = this.game, p = this.p, rig = p.rig, cam = p.camera, W = this.W, A = this.A;
    if (A.mag <= 0) return;
    A.mag--;
    this.cooldown = W.rate / (this.key === 'pistol' ? p.stats.aimSpeed || 1 : 1);
    const zs = g.zombies, assist = p.input.usingTouch ? 1.3 : p.input.pad ? 1.22 : 1.1; // con mando o táctil, zonas algo más generosas
    const spread = lerp(W.spread, W.aimSpread, rig.aimBlend) + Math.min(0.03, p.speed * 0.006) * (p.slideT >= 0 ? 1.6 : 1) + this.bloom;
    this.bloom = Math.min(0.035, this.bloom + W.kick * 0.25);
    p.muzzleWorld(this.v);
    g.muzzleFlash(this.v, W.pellets > 1 ? 45 : 30);
    this.sprite.position.copy(this.v); this.sprite.material.opacity = 1; this.sprite.material.rotation = rand(0, TAU); this.sprite.scale.setScalar(W.pellets > 1 ? 0.36 : 0.24);
    const agg = new Map(); let first = null, walls = 0;
    for (let k = 0; k < W.pellets; k++) {
      const a = rand(0, TAU), r = Math.sqrt(Math.random()) * spread; // dispersión uniforme en un cono
      this.dir.copy(rig.fwd).addScaledVector(rig.right, Math.cos(a) * r).add(this.o.set(0, Math.sin(a) * r, 0)).normalize();
      // Raycast desde la cámara hacia el punto de mira: primero el escenario, luego los infectados delante de él
      const wall = g.world.raycast(cam.position, this.dir, 60), maxT = wall === Infinity ? 60 : wall;
      let zh = zs ? zs.raycast(cam.position, this.dir, maxT, assist, W.pellets === 1) : null; // zonas ampliadas (más en táctil); también cadáveres
      if (zs && W.pellets === 1 && (!zh || zh.corpse)) { const ca = zs.closeAssist(cam.position, this.dir, maxT, p.position); if (ca && (!zh || ca.t < zh.t + 0.5)) zh = ca; } // a quemarropa no se falla
      const sw = zs ? zs.fx.raySwarm(cam.position, this.dir, zh ? zh.t : maxT) : Infinity; // una cría de la Reina se interpone
      const bh = zs && zs.bats.list.length ? zs.bats.ray(cam.position, this.dir, zh ? zh.t : sw < Infinity ? sw : maxT, assist) : null; // murciélago en vuelo
      if (bh) {
        const point = cam.position.clone().addScaledVector(this.dir, bh.t); if (!first) first = { point, hitT: bh.t, zh: null };
        const fall = W.falloff ? clamp(1.3 - bh.t / W.falloff, 0.3, 1) : 1, dmg = p.rollDamage(W.dmg * fall);
        zs.bats.hit(bh.b, dmg.amount, point, this.dir, p, bh.zone, dmg.crit); continue;
      }
      if (sw < Infinity) { const point = cam.position.clone().addScaledVector(this.dir, sw); if (!first) first = { point, hitT: sw, zh: null }; g.audio.hitTick('body'); g.events.emit('zombie:hit', { z: null, point, by: p, zone: 'body', killed: true }); continue; }
      const hitT = zh ? zh.t : wall, point = cam.position.clone().addScaledVector(this.dir, hitT === Infinity ? 60 : hitT);
      if (!first) first = { point, hitT, zh };
      if (zh && zh.corpse) zs.hitCorpse(zh.corpse, point, this.dir);
      else if (zh) { // cabeza = multiplicador del tipo, piernas ×0,75; los perdigones pierden fuerza con la distancia
        const zm = zh.zone === 'head' ? zh.z.T.headMult : zh.zone === 'legs' ? 0.75 : 1, fall = W.falloff ? clamp(1.3 - zh.t / W.falloff, 0.3, 1) : 1;
        const e = agg.get(zh.z) || { amount: 0, zone: zh.zone, idx: zh.idx || 0, point, dir: this.dir.clone(), n: 0 };
        e.amount += W.dmg * zm * fall; e.n++;
        if (zh.zone === 'core' || zh.zone === 'pod' || (zh.zone === 'head' && e.zone !== 'core' && e.zone !== 'pod')) { e.zone = zh.zone; e.idx = zh.idx || 0; e.point = point; }
        agg.set(zh.z, e);
      } else if (wall !== Infinity && walls < 3) { walls++; this.impact(point, this.dir); }
    }
    let res = null;
    for (const [z, e] of agg) { const dmg = p.rollDamage(e.amount); res = zs.hit(z, { amount: dmg.amount, crit: dmg.crit, zone: e.zone, idx: e.idx, dir: e.dir, point: e.point, origin: cam.position, by: p }); }
    rig.kick(W.kick); rig.shake(W.shake, 0.1);
    g.audio.gunshot(W.sound);
    g.pads.rumble(p, W.pellets > 1 ? 0.7 : 0.25, W.pellets > 1 ? 0.6 : 0.4, W.pellets > 1 ? 130 : 55);
    if (zs) zs.noise(p.position, W.noise); // el disparo atrae a todo el que lo oiga
    if (!first) first = { point: cam.position.clone().addScaledVector(this.dir, 60), hitT: Infinity, zh: null };
    g.events.emit('weapon:fired', { key: this.key, player: p, origin: cam.position.clone(), dir: this.dir.clone(), point: first.point, hit: !!first.zh || first.hitT !== Infinity, distance: first.hitT, target: first.zh && first.zh.z ? first.zh.z : null, zone: first.zh ? first.zh.zone : null, damage: res ? res.amount : 0, crit: res ? res.crit : false, killed: res ? res.killed : false, mag: A.mag });
    if (A.mag === 0 && A.res > 0) this.autoT = 0.28; // recarga sola al vaciar el cargador
  }
  // Chispas (pared, placas, escudo) y polvo en el impacto
  sparks(pt, back, n = 9) {
    const s = this.sp;
    for (let k = 0; k < n; k++) {
      const i = s.i; s.i = (s.i + 1) % s.n;
      s.pos[i * 3] = pt.x - back.x * 0.03; s.pos[i * 3 + 1] = pt.y - back.y * 0.03; s.pos[i * 3 + 2] = pt.z - back.z * 0.03;
      s.vel[i * 3] = -back.x * rand(1, 3) + rand(-1.5, 1.5); s.vel[i * 3 + 1] = rand(0.5, 2.6); s.vel[i * 3 + 2] = -back.z * rand(1, 3) + rand(-1.5, 1.5);
      s.life[i] = rand(0.25, 0.55);
    }
  }
  impact(pt, back = this.dir) {
    this.sparks(pt, back, 9);
    const d = this.dust[this.dust.i]; this.dust.i = (this.dust.i + 1) % this.dust.length;
    d.position.copy(pt).addScaledVector(back, -0.05); d.userData.life = 1; d.scale.setScalar(0.15); d.material.rotation = rand(0, TAU);
  }
  update(dt) {
    const p = this.p;
    this.cooldown = Math.max(0, this.cooldown - dt); this.switchT = Math.max(0, this.switchT - dt); this.bloom = Math.max(0, this.bloom - dt * 0.12);
    if (this.autoT > 0) { this.autoT -= dt; if (this.autoT <= 0) this.reload(); }
    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0 || !p.alive) {
        const W = this.W, A = this.A, take = Math.min(W.mag - A.mag, A.res); this.reloadT = 0;
        if (p.alive) { A.mag += take; if (A.res !== Infinity) A.res -= take; this.game.events.emit('weapon:changed', { key: this.key, player: p }); }
      }
    }
    if (this.pending > 0) { this.pending -= dt; if (p.rig.aimBlend > 0.5 || this.pending <= 0) { this.pending = 0; this.fire(); } }
    this.sprite.material.opacity = damp(this.sprite.material.opacity, 0, 40, dt);
    const s = this.sp;
    for (let i = 0; i < s.n; i++) {
      if (s.life[i] <= 0) continue;
      s.life[i] -= dt; s.vel[i * 3 + 1] -= 9.8 * dt;
      s.pos[i * 3] += s.vel[i * 3] * dt; s.pos[i * 3 + 1] += s.vel[i * 3 + 1] * dt; s.pos[i * 3 + 2] += s.vel[i * 3 + 2] * dt;
      if (s.life[i] <= 0) s.pos[i * 3 + 1] = -999;
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    for (const d of this.dust) {
      if (d.userData.life <= 0) continue;
      d.userData.life -= dt * 1.4; const k = 1 - d.userData.life;
      d.scale.setScalar(0.15 + k * 0.6); d.position.y += dt * 0.15; d.material.opacity = Math.max(0, d.userData.life) * 0.35;
    }
  }
  dispose() { this.objs.forEach((o) => { o.removeFromParent(); if (o.isPoints) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
}
