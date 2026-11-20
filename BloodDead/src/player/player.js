import * as THREE from 'three';
import { clamp, damp, dampAngle, wrapAngle } from '../core/utils.js';
import { CONFIG } from '../data/config.js';
import { CharacterFactory } from '../characters/characterFactory.js';
import { Flashlight } from './flashlight.js';
import { CameraRig } from './cameraRig.js';

/* =====================================================================
   JUGADOR (estilo CoD Mobile): movimiento +35 % con aceleración instantánea,
   agacharse, deslizamiento táctico al agacharse corriendo, cuchillazo fluido.
   Cada jugador lleva su cámara (rig), su entrada, su linterna y sus armas.
   ===================================================================== */
export class Player {
  // model: resultado de CharacterFactory.createAsync (procedural o GLTF)
  constructor(game, def, stats, model, o = {}) {
    this.game = game; this.def = def; this.stats = { ...stats }; this.idx = o.idx || 0; this.input = o.input || null; this.camera = o.camera; this.active = o.active !== false;
    this.health = this.stats.maxHealth; this.stamina = this.stats.stamina; this.exhausted = false; this.regenDelay = 0;
    this.position = (o.spawn || game.world.spawn.player).clone(); this.prev = new THREE.Vector3(); this.velocity = new THREE.Vector3();
    this.facing = game.world.spawn.yaw + Math.PI;
    this.aiming = false; this.running = false; this.alive = true; this.speed = 0; this.stepPhase = 0; this.lastStep = 0; this.aimHold = 0;
    this.model = model || CharacterFactory.create(def, { csm: game.lighting.csm });
    this.model.root.rotation.order = 'YXZ'; // para caer de espaldas respecto a su orientación
    this.iframes = 0; this.hurtT = 0; this.deathT = 0; this.knifeT = -1; this.knifeCD = 0; this.knifeHit = false; this.push = new THREE.Vector3();
    this.crouch = false; this.crouchK = 0; this.slideT = -1; this.slideK = 0; this.slideCD = 0; this.slideV = new THREE.Vector3(); this.respawnT = 0; this.useCur = null; this.useHold = 0;
    game.scene.add(this.model.root);
    this.flashlight = new Flashlight(game, { shadow: o.shadow !== false });
    this.rig = new CameraRig(game, this);
    this.weapons = null; // lo asigna el juego (WeaponSystem propio)
    if (!this.active) this.setActive(false);
  }
  setActive(on) {
    this.active = on; this.model.root.visible = on; this.flashlight.setEnabled(on); this.rig.fill.visible = on;
    if (this.weapons) this.weapons.setEnabled(on);
  }
  holdAim(t) { this.aimHold = Math.max(this.aimHold, t); } // al disparar sin apuntar, levanta el arma un momento
  // Cuchillazo rápido y fluido: sin recuperación rígida; se puede encadenar con el disparo o con otro tajo
  knife() {
    const K = CONFIG.knife;
    if (!this.alive || this.knifeCD > 0 || (this.knifeT >= 0 && this.knifeT / K.time < K.cancel)) return false;
    this.knifeT = 0; this.knifeHit = false; this.knifeCD = K.cooldown;
    this.game.audio.whoosh(); this.game.events.emit('weapon:knife', { player: this });
    return true;
  }
  startSlide(dx, dz) {
    const P = CONFIG.player, S = this.stats, sp = Math.max(this.speed, S.runSpeed * P.speedMult) * P.slide.boost;
    let x = this.velocity.x, z = this.velocity.z, l = Math.hypot(x, z);
    if (l < 0.5) { x = dx; z = dz; l = Math.hypot(x, z) || 1; }
    this.slideV.set((x / l) * sp, 0, (z / l) * sp); this.slideT = 0; this.crouch = false; this.slideCD = P.slide.cd;
    this.game.audio.slide(); this.game.events.emit('player:slide', { player: this });
  }
  update(dt) {
    const P = CONFIG.player, S = this.stats, K = CONFIG.knife, input = this.input, rig = this.rig;
    this.aimHold = Math.max(0, this.aimHold - dt); this.iframes = Math.max(0, this.iframes - dt); this.hurtT = Math.max(0, this.hurtT - dt * 2.2);
    this.knifeCD = Math.max(0, this.knifeCD - dt); this.slideCD = Math.max(0, this.slideCD - dt);
    if (this.knifeT >= 0) {
      this.knifeT += dt; const kp = this.knifeT / K.time;
      if (!this.knifeHit && kp >= K.hitAt) { // el filo pasa por delante
        this.knifeHit = true; const n = this.game.zombies ? this.game.zombies.melee(this) : 0;
        if (n) { this.game.audio.knifeHit(n > 1); rig.shake(0.026, 0.12); this.game.pads.rumble(this, 0.5, 0.3, 90); }
        this.game.events.emit('weapon:melee', { hits: n, player: this });
      }
      if (kp >= 1 || !this.alive) this.knifeT = -1;
    }
    const mx = input.move.x, my = input.move.y, mag = Math.min(1, Math.hypot(mx, my));
    const fx = -Math.sin(rig.yaw), fz = -Math.cos(rig.yaw), rx = Math.cos(rig.yaw), rz = -Math.sin(rig.yaw);
    let dx = fx * my + rx * mx, dz = fz * my + rz * mx; const dl = Math.hypot(dx, dz);
    if (dl > 1e-4) { dx /= dl; dz /= dl; }
    // Agacharse / deslizarse (C, Ctrl, botón táctil o B / Círculo)
    if (input.consume('crouch') && this.alive) {
      if (this.slideT < 0 && this.running && this.speed > S.runSpeed * P.speedMult * 0.6 && this.slideCD <= 0 && !this.rooted) this.startSlide(dx, dz);
      else if (this.slideT < 0) this.crouch = !this.crouch;
    }
    this.aiming = (input.aim || this.aimHold > 0) && this.alive;
    // Resistencia
    this.running = input.run && !this.exhausted && this.stamina > 0 && mag > 0.2 && !this.aiming && this.alive && this.slideT < 0 && !this.rooted;
    if (this.running) {
      this.crouch = false;
      this.stamina -= P.runDrain * dt; this.regenDelay = P.regenDelay;
      if (this.stamina <= 0) { this.stamina = 0; this.exhausted = true; this.game.events.emit('player:exhausted', { player: this }); }
    } else {
      this.regenDelay -= dt;
      if (this.regenDelay <= 0) this.stamina = Math.min(S.stamina, this.stamina + S.staminaRegen * dt);
      if (this.exhausted && this.stamina > S.stamina * 0.3) this.exhausted = false;
    }
    // Movimiento: aceleración casi instantánea (sin inercia pesada)
    this.prev.copy(this.position);
    if (this.slideT >= 0) {
      this.slideT += dt; const D = P.slide;
      this.slideV.multiplyScalar(Math.exp(-D.friction * dt));
      if (mag > 0.1) { const sp = Math.hypot(this.slideV.x, this.slideV.z), a = Math.atan2(this.slideV.x, this.slideV.z), b = Math.atan2(dx, dz), na = a + clamp(wrapAngle(b - a), -D.steer * dt, D.steer * dt); this.slideV.set(Math.sin(na) * sp, 0, Math.cos(na) * sp); }
      this.velocity.x = this.slideV.x; this.velocity.z = this.slideV.z;
      if (this.slideT >= D.time || Math.hypot(this.slideV.x, this.slideV.z) < 1.4 || !this.alive) { this.slideT = -1; this.crouch = !!input.crouchHeld; }
    } else {
      let spd = (this.running ? S.runSpeed : S.speed) * P.speedMult * mag;
      if (this.aiming) spd *= P.aimSpeedMult;
      if (this.crouch) spd *= P.crouchMult;
      if (this.knifeT >= 0) spd *= 0.95;
      if (!this.alive || this.rooted) spd = 0; // agarrado por los pies: no puede moverse
      const k = mag > 0.01 ? P.accel : P.decel;
      this.velocity.x = damp(this.velocity.x, dx * spd, k, dt);
      this.velocity.z = damp(this.velocity.z, dz * spd, k, dt);
    }
    this.position.x += this.velocity.x * dt; this.position.z += this.velocity.z * dt;
    if (this.push.x || this.push.z) { this.position.x += this.push.x * dt; this.position.z += this.push.z * dt; this.push.multiplyScalar(Math.exp(-6 * dt)); if (Math.abs(this.push.x) + Math.abs(this.push.z) < 0.05) this.push.set(0, 0, 0); }
    this.game.world.resolve(this.position, P.radius);
    if (dt > 0) { this.velocity.x = (this.position.x - this.prev.x) / dt; this.velocity.z = (this.position.z - this.prev.z) / dt; }
    if (this.slideT >= 0) { this.slideV.x = this.velocity.x; this.slideV.z = this.velocity.z; } // contra una pared el deslizamiento se frena
    this.speed = Math.hypot(this.velocity.x, this.velocity.z);
    this.crouchK = damp(this.crouchK, this.crouch ? 1 : 0, 14, dt); this.slideK = damp(this.slideK, this.slideT >= 0 ? 1 : 0, 16, dt);
    // Orientación: hacia el movimiento, o hacia la mira al apuntar
    if (this.aiming || this.knifeT >= 0) this.facing = dampAngle(this.facing, rig.yaw + Math.PI, this.knifeT >= 0 ? 30 : 22, dt);
    else if (this.speed > 0.3) this.facing = dampAngle(this.facing, Math.atan2(this.velocity.x, this.velocity.z), P.turnSpeed, dt);
    // Pasos (agachado apenas se oye)
    this.stepPhase += this.slideT >= 0 ? 0 : ((Math.PI * this.speed) / (this.running ? 1.3 : 0.9)) * dt;
    const si = Math.floor(this.stepPhase / Math.PI);
    if (si !== this.lastStep) { this.lastStep = si; if (this.speed > 0.4) this.game.events.emit('player:step', { running: this.running, speed: this.speed, crouch: this.crouch, player: this }); }
    const r = this.model.root; r.position.copy(this.position); r.rotation.y = this.facing;
    if (!this.alive) { this.deathT += dt; const k = Math.min(1, this.deathT / 0.85); r.rotation.x = -k * k * (Math.PI / 2 - 0.1); } // se desploma hacia atrás
    else r.rotation.x = 0;
    this.model.animate(dt, { speed: this.slideT >= 0 ? 0 : this.speed, running: this.running, aim: this.alive ? rig.aimEase : 0, pitch: rig.pitch, phase: this.stepPhase, hurt: this.alive ? this.hurtT : 1, hitX: this.hitX || 0, hitZ: this.hitZ ?? 1, exert: (1 - this.stamina / this.stats.stamina) * 0.8 + (this.running ? 0.35 : 0), knife: this.knifeT >= 0 ? this.knifeT / K.time : -1, crouch: this.crouchK * (1 - this.slideK), slide: this.slideK });
  }
  takeDamage(amount, source = null) {
    if (!this.alive || amount <= 0 || this.iframes > 0) return 0;
    this.iframes = 0.35; this.hurtT = 1; // breve invulnerabilidad: dos zarpazos simultáneos no se suman
    if (source && source.pos) { // dirección del golpe en el espacio del personaje (para la reacción)
      const dx = source.pos.x - this.position.x, dz = source.pos.z - this.position.z, l = Math.hypot(dx, dz) || 1, c = Math.cos(this.facing), s = Math.sin(this.facing);
      this.hitX = (dx * c - dz * s) / l; this.hitZ = (dx * s + dz * c) / l;
    } else { this.hitX = 0; this.hitZ = 1; }
    const dmg = amount * (1 - this.stats.armor);
    this.health = Math.max(0, this.health - dmg);
    this.rig.shake(0.06); this.game.pads.rumble(this, Math.min(1, 0.35 + dmg / 40), 0.6, 200);
    this.game.events.emit('player:damaged', { amount: dmg, source, health: this.health, player: this });
    if (this.health <= 0) this.kill(source);
    return dmg;
  }
  kill(source = null) { this.alive = false; this.deathT = 0; this.slideT = -1; this.game.events.emit('player:died', { source, player: this }); }
  revive(pos, hpFrac = 0.6) {
    this.alive = true; this.health = Math.max(1, this.stats.maxHealth * hpFrac); this.iframes = 2.5; this.deathT = 0; this.knifeT = -1; this.slideT = -1; this.crouch = false; this.push.set(0, 0, 0);
    if (pos) this.position.copy(pos); this.velocity.set(0, 0, 0); this.model.root.rotation.x = 0;
    this.game.events.emit('player:revived', { player: this });
  }
  heal(a) { this.health = Math.min(this.stats.maxHealth, this.health + a); this.game.events.emit('player:healed', { health: this.health, player: this }); }
  shove(vx, vz) { this.push.x += vx; this.push.z += vz; }
  drain(a) { // daño continuo (ácido, enjambre): sin parpadeo de golpe
    if (!this.alive || a <= 0 || this.iframes > 1) return;
    this.health = Math.max(0, this.health - a * (1 - this.stats.armor * 0.5));
    if (this.health <= 0) this.kill(null);
  }
  rollDamage(base) { const crit = Math.random() < this.stats.critChance; return { amount: base * this.stats.damageMult * (crit ? this.stats.critMult : 1), crit }; }
  muzzleWorld(target = new THREE.Vector3()) { return this.model.parts.muzzle.getWorldPosition(target); }
  dispose() { this.model.dispose(); this.flashlight.dispose(); this.rig.dispose(); }
}
