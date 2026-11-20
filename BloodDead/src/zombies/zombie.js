import * as THREE from 'three';
import { TAU, clamp, damp, dampAngle, lerp, rand, smooth } from '../core/utils.js';
import { HEAD_OFFSET } from '../characters/characterFactory.js';
import { ZombieFactory } from './zombieFactory.js';

export const _zo = new THREE.Vector3(), _zd = new THREE.Vector3(), _zw = new THREE.Vector3();

export class Zombie {
  constructor(sys, key) {
    this.sys = sys; this.key = key;
    const VD = (this.VD = ZombieFactory.variants[key]);
    this.V = VD.V; this.T = VD.T; this.type = VD.V.type;
    const inst = ZombieFactory.instance(key, sys.material);
    this.mesh = inst.mesh; this.b = inst.bones; this.restHipY = VD.rest.hips[1]; this.boneArr = ZombieFactory.BONES.map((n) => this.b[n]);
    this.mesh.visible = false; sys.game.scene.add(this.mesh);
    this.pos = this.mesh.position; this.home = new THREE.Vector3(); this.goal = new THREE.Vector3(); this.lastSeen = new THREE.Vector3();
    this.headC = new THREE.Vector3(); this.bodyA = new THREE.Vector3(); this.bodyB = new THREE.Vector3();
    this.legLA = new THREE.Vector3(); this.legLB = new THREE.Vector3(); this.legRA = new THREE.Vector3(); this.legRB = new THREE.Vector3();
    this.active = false; this.alive = false; this.wounds = []; this.parts = {}; this.coreC = new THREE.Vector3(); this.anchor = new THREE.Vector3(); this.tgt = null;
    this.xz = (this.T.extraZones || []).map(() => new THREE.Vector3()); this.podC = (this.T.pods || []).map(() => new THREE.Vector3());
    for (const x of VD.extras || []) { // piezas rígidas (placas, tumores, garras, vainas, núcleo, escudo…)
      const m = new THREE.Mesh(x.geo, sys.xmat[x.mat]); m.castShadow = !/shield|glass|visor|fungus|egg|pod|claw/.test(x.mat); m.receiveShadow = x.mat !== 'shield'; m.layers.set(1);
      if (x.mat === 'shield') m.renderOrder = 3;
      (x.bone ? this.b[x.bone] : this.mesh).add(m); (this.parts[x.name] = this.parts[x.name] || []).push(m);
    }
    this.rigs = (VD.rigs || []).map((r) => ZombieFactory.buildRig(r, this.b[r.bone], sys.xmat));
    if (this.V.cloak) { // el Acometedor se funde con la oscuridad: material propio y translúcido
      this.cloakMat = this.mesh.material = ZombieFactory.material(sys.game.lighting.csm);
      this.cloakMat.transparent = true;
    }
  }
  spawn(x, z, o = {}) {
    const T = this.T;
    this.active = this.alive = true; this.mesh.visible = true; this.ext = null; this.noBlock = false; this.abCdK = 1;
    this.mSpd = o.spd || 1; this.mDmg = o.dmg || 1; this.fury = !!o.fury;
    this.hp = this.maxHp = T.hp * (T.boss ? 1 : rand(0.9, 1.15)) * (o.hp || 1);
    this.anchor.set(x, 0, z); this.abT = T.ability ? rand(2.2, 3.6) : 0; this.stunT = 0; this.sinkT = 0; this.slammed = this.spat = this.chHit = this.swept = this.spawned = false;
    this.helmet = T.helmet ? T.helmet * Math.min(1, o.hp || 1) : 0; this.shield = !!T.core && !!T.phases; this.armor = (T.armor || 0) * Math.min(1, o.hp || 1); this.platesOff = 0;
    this.phase = T.phases ? 1 : 0; this.podHp = (T.pods || []).map(() => T.podHp); this.chainT = rand(2, 4); this.broodT = rand(4, 6); this.cloak = this.V.cloak ? 1 : 0; this.litT = 0; this.orbit = Math.random() < 0.5 ? 1 : -1; this.exposeCD = 0;
    for (const k in this.parts) for (const m of this.parts[k]) m.visible = !/^pod\d/.test(k); // las vainas brotan en la fase 2
    this.pos.set(x, 0, z); this.home.set(x, 0, z); this.goal.set(x, 0, z);
    this.facing = rand(0, TAU); this.vx = this.vz = 0; this.speed = 0; this.dist = 99; this.tgt = null;
    this.state = 'wander'; this.stateT = 0; this.thinkT = rand(0, 0.3); this.wanderT = 0; this.pauseT = 0; this.sees = false; this.lostT = 0;
    this.atkT = 0; this.atkCD = 0; this.struck = false; this.lungeV = 0; this.hitK = 0; this.stagT = 0; this.deadT = 0;
    this.kb = 0; this.kbx = 0; this.kbz = 0; this.detour = 0; this.detourT = 0; this.stuckT = 0;
    this.limp = 0; this.tw = 0; this.burst = 0; this.burstT = rand(1, 4); this.ph = rand(0, TAU); this.gph = 0; this.seed = rand(0, 100); this.lodK = Math.random() < 0.5 ? 0 : 1; this.armUp = 0; this.voiceT = rand(1.5, 7); this.headless = false; this.baked = false; this.wounds.length = 0;
    this.mesh.rotation.set(0, this.facing, 0); this.mesh.position.y = 0;
    for (const n in this.b) { const bn = this.b[n]; bn.rotation.set(0, 0, 0); bn.scale.set(1, 1, 1); bn.position.set(...this.VD.rest[n]); }
    if (this.cloakMat) { this.cloakMat.opacity = 0.08; this.mesh.castShadow = false; }
  }
  setState(s) { this.state = s; this.stateT = 0; }
  // Objetivo: el jugador vivo más cercano (con histéresis para no cambiar de presa a cada paso)
  pickTarget() {
    let best = null, bd = Infinity;
    for (const p of this.sys.game.players) {
      if (!p.active) continue;
      const d = Math.hypot(p.position.x - this.pos.x, p.position.z - this.pos.z) - (p === this.tgt ? 2.5 : 0) + (p.alive ? 0 : 1000);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  }
  // Avance a trompicones con arrancadas súbitas: nunca sabes cuándo va a echar a correr
  gait(dt, dist) {
    if (this.type === 'bloater' || (this.T.boss && !this.T.bursts)) return 1;
    if (this.burst > 0) { this.burst -= dt; return this.type === 'runner' ? 1.3 : 2.35; }
    this.burstT -= dt;
    if (this.burstT <= 0) { this.burstT = rand(1.4, 4.2); if (dist > 3 && dist < 16 && Math.random() < (this.type === 'runner' ? 0.5 : 0.38)) { this.burst = rand(0.7, 1.6); this.sys.voice('roar', this); } }
    const t = this.sys.time + this.seed; return 0.5 + 0.5 * Math.abs(Math.sin(t * 3.1 + Math.sin(t * 7.7) * 1.3));
  }

  update(dt) {
    if (this.ext) return this.ext(this, dt); // control externo (p. ej. emboscada bajo los tablones): también decide su muerte
    if (!this.alive) return this.updateDeath(dt);
    const S = this.sys, T = this.T;
    if (!this.tgt || !this.tgt.active) this.tgt = this.pickTarget();
    const P = this.tgt; if (!P) return;
    this.stateT += dt; this.atkCD -= dt; this.hitK = Math.max(0, this.hitK - dt * 3);
    const dx = P.position.x - this.pos.x, dz = P.position.z - this.pos.z, dist = Math.hypot(dx, dz);
    this.dist = dist;
    this.thinkT -= dt;
    if (this.thinkT <= 0 && this.state !== 'intro') { this.thinkT = 0.16 + Math.random() * 0.12; const n = this.pickTarget(); if (n && n !== this.tgt && this.state !== 'attack') { this.tgt = n; return; } this.perceive(dist, dx, dz); }
    if (this.phase === 2 && this.podsAlive()) this.hp = Math.min(this.maxHp * 0.66, this.hp + 32 * dt); // las vainas lo regeneran
    if (this.V.cloak) this.updateCloak(dt);
    let tx = this.goal.x, tz = this.goal.z, sp = 0, face = null, selfMove = false;
    switch (this.state) {
      case 'intro': face = Math.atan2(dx, dz); break; // presentación cinematográfica: ruge y espera
      case 'phase': face = Math.atan2(dx, dz); if (this.stateT > 2.4) { this.setState('chase'); this.abT = rand(1.5, 3); } break;
      case 'wander':
        this.wanderT -= dt; this.pauseT -= dt;
        if (this.wanderT <= 0 || Math.hypot(this.goal.x - this.pos.x, this.goal.z - this.pos.z) < 0.5) this.pickWander();
        sp = this.pauseT > 0 ? 0 : T.walk; tx = this.goal.x; tz = this.goal.z;
        break;
      case 'investigate':
        sp = T.walk * 1.9; tx = this.goal.x; tz = this.goal.z;
        if (Math.hypot(tx - this.pos.x, tz - this.pos.z) < 0.9 || this.stateT > 12) { this.home.copy(this.pos); this.setState('wander'); }
        break;
      case 'chase':
        if (!P.alive) { this.setState('wander'); break; }
        if (this.sees) this.goal.copy(P.position); else { this.lostT += dt; this.goal.copy(this.lastSeen); if (this.lostT > 7) { this.home.copy(this.pos); this.setState('investigate'); } }
        if (this.sees) this.lostT = 0;
        tx = this.goal.x; tz = this.goal.z; sp = T.chase * this.mSpd * (this.fury ? 1.45 : 1) * (1 - 0.3 * this.limp) * this.gait(dt, dist);
        if (T.leash) { const hx = tx - this.anchor.x, hz = tz - this.anchor.z, hl = Math.hypot(hx, hz); if (hl > T.leash) { tx = this.anchor.x + (hx / hl) * T.leash; tz = this.anchor.z + (hz / hl) * T.leash; } }
        if (this.type === 'runner' && dist > 2.5) { const z = Math.sin((S.time + this.seed) * 2.6) * 1.4 * smooth(2.5, 6, dist); tx += (-dz / dist) * z; tz += (dx / dist) * z; } // zigzag
        if (this.type === 'stalker' && this.cloak > 0.5 && dist > 2.6 && dist < 12 && this.sees) { // acecha: te rodea en la penumbra antes de saltar
          const a = Math.atan2(this.pos.x - P.position.x, this.pos.z - P.position.z) + this.orbit * 0.85;
          tx = P.position.x + Math.sin(a) * 6.2; tz = P.position.z + Math.cos(a) * 6.2; sp = T.chase * 0.9 * this.mSpd;
          if (this.stuckT > 0.3) this.orbit *= -1;
        }
        if (dist < T.range * 0.95 && this.atkCD <= 0 && this.sees) this.startAttack();
        else if (dist < T.range * 0.55) sp = 0;
        if (dist < 4) face = Math.atan2(dx, dz);
        if (T.ability && this.state === 'chase') this.bossChase(dt, dist);
        break;
      /* --- Habilidades de los jefes --- */
      case 'windup': // el Sujeto 0 toma carrerilla
        face = Math.atan2(dx, dz);
        if (this.stateT > T.ability.windup) { this.setState('charge'); this.chA = Math.atan2(dx, dz); this.chHit = false; }
        break;
      case 'charge': selfMove = true; this.updateCharge(dt, P, T.ability); break;
      case 'pounceWind': // el Acometedor se agazapa y se descubre un instante
        face = Math.atan2(dx, dz);
        if (this.stateT > 0.55) { this.setState('pounce'); this.chA = Math.atan2(dx, dz); this.chHit = false; S.voice('screech', this); }
        break;
      case 'pounce': selfMove = true; this.updateCharge(dt, P, { speed: T.ability.pounce, dur: 0.62, dmg: T.ability.pdmg, stun: T.ability.exposed, push: 6, pounce: true }); break;
      case 'exposed': if (this.stateT > this.stunT) { this.setState(P.alive ? 'chase' : 'wander'); this.abT = rand(...T.ability.cloakT); this.exposeCD = 4; } break;
      case 'stunned': if (this.stateT > this.stunT) { this.setState(P.alive ? 'chase' : 'wander'); if (T.ability) this.abT = rand(...(T.ability.cd || [3, 5])); } break;
      case 'slam': {
        const B = T.ability; if (this.stateT < B.windup * 0.7) face = Math.atan2(dx, dz);
        if (!this.slammed && this.stateT >= B.windup) { this.slammed = true; S.shockwave(this, B); }
        if (this.stateT >= B.windup + B.recover) { this.setState('chase'); this.abT = (rand(...B.cd) * (this.abCdK || 1)) * (this.phase >= 3 ? 0.6 : 1); }
        break;
      }
      case 'chain': { // el Behemoth hace girar sus cadenas
        const C = T.ability.chain; if (this.stateT < C.windup * 0.8) face = Math.atan2(dx, dz);
        if (!this.swept && this.stateT >= C.windup) { this.swept = true; S.chainSweep(this, C); }
        if (this.stateT >= C.windup + 0.65) { this.setState('chase'); this.chainT = rand(...C.cd); }
        break;
      }
      case 'brood': { // la Reina pare un enjambre de crías
        const Bb = T.ability.brood; face = Math.atan2(dx, dz);
        if (!this.spawned && this.stateT >= Bb.windup) { this.spawned = true; S.fx.brood(this, Bb.n); S.voice('screech', this); }
        if (this.stateT >= Bb.windup + 0.7) { this.setState('chase'); this.broodT = rand(...Bb.cd); }
        break;
      }
      case 'spit': {
        const B = this.spitB || T.ability; face = Math.atan2(this.lastSeen.x - this.pos.x, this.lastSeen.z - this.pos.z);
        if (!this.spat && this.stateT >= B.windup) { this.spat = true; S.spit(this, this.sees ? P.position : this.lastSeen, B); }
        if (this.stateT >= B.windup + 0.55) { this.setState('chase'); this.abT = (rand(...B.cd) * (this.abCdK || 1)) * (this.phase >= 3 ? 0.6 : 1); }
        break;
      }
      case 'kneel': break; // el Parásito sin escudo (fase 1): arrodillado y expuesto
      case 'attack':
        this.updateAttack(dt, dist, dx, dz, P); sp = this.lungeV; tx = P.position.x; tz = P.position.z;
        if (this.atkT < T.windup) face = Math.atan2(dx, dz);
        break;
      case 'stagger':
        this.stagT -= dt; if (this.stagT <= 0) this.setState(P.alive ? 'chase' : 'wander');
        break;
    }
    if (!selfMove) this.move(dt, tx, tz, sp);
    if (this.kb > 0.01) { // retroceso del impacto
      this.pos.x += this.kbx * this.kb * dt; this.pos.z += this.kbz * this.kb * dt; this.kb = damp(this.kb, 0, 7, dt);
      S.game.world.resolve(this.pos, T.radius * this.V.scale);
    }
    const goalFace = face !== null ? face : this.speed > 0.15 ? Math.atan2(this.vx, this.vz) : this.facing;
    this.facing = dampAngle(this.facing, goalFace, T.turn * (this.phase >= 3 ? 1.4 : 1), dt);
    this.mesh.rotation.y = this.facing;
    // Voz: lamentos al vagar; gruñidos y rugidos al cazar (más seguidos cuanto más cerca)
    this.voiceT -= dt;
    if (this.voiceT <= 0 && this.state !== 'intro') {
      const hunt = this.state === 'chase' || this.state === 'attack';
      this.voiceT = hunt ? (dist < 5 ? rand(1.3, 2.6) : rand(2.4, 4.8)) : rand(4.5, 10);
      if (this.cloak > 0.6) this.voiceT += 2; // el Acometedor apenas respira cuando acecha
      if (dist < 30) S.voice(hunt ? (dist < 5 ? (Math.random() < 0.45 ? 'gurgle' : 'growl') : Math.random() < 0.6 ? 'growl' : 'roar') : dist < 7 && Math.random() < 0.4 ? 'gurgle' : 'moan', this);
    }
    // LOD de animación: los lejanos se animan en fotogramas alternos (no se nota y ahorra CPU)
    if (dist < 24 || T.boss || ((S.frame + this.lodK) & 1) === 0) this.animate(dist < 24 || T.boss ? dt : dt * 2);
  }
  // Camuflaje: casi invisible salvo bajo el haz de una linterna, al atacar o tras su salto
  updateCloak(dt) {
    const S = this.sys, B = this.T.ability; let lit = false;
    this.exposeCD = Math.max(0, this.exposeCD - dt);
    if (this.alive) { this.zones(); for (const p of S.game.players) if (p.active && p.alive && p.flashlight.lights(this.bodyB, B.reveal)) { lit = true; break; } }
    this.litT = lit ? this.litT + dt : Math.max(0, this.litT - dt * 0.6);
    if (lit && this.state === 'chase' && this.litT > 1.3 && this.exposeCD <= 0) { // la luz lo ciega: chilla y queda al descubierto
      this.setState('exposed'); this.stunT = 1.9; this.litT = 0; S.voice('screech', this); S.game.events.emit('boss:revealed', { z: this });
    }
    const s = this.state, vis = !this.alive || lit || this.hitK > 0.4 || s === 'exposed' || s === 'pounceWind' || s === 'pounce' || s === 'attack' || s === 'intro' || s === 'stunned';
    this.cloak = damp(this.cloak, vis ? 0 : 1, vis ? 9 : 1.6, dt);
    const op = lerp(1, 0.07, this.cloak); this.cloakMat.opacity = op; S.xmat.claw.opacity = Math.max(0.12, op);
    this.mesh.castShadow = this.cloak < 0.5;
  }
  // Decide el ataque especial del jefe mientras persigue
  bossChase(dt, dist) {
    const B = this.T.ability, P = this.tgt, S = this.sys; this.abT -= dt;
    if (!P || !P.alive) return;
    switch (B.kind) {
      case 'charge': if (this.abT <= 0 && this.sees && dist > 3.5 && dist < 18) { this.setState('windup'); S.voice('roar', this); } break;
      case 'stalk': if (this.abT <= 0 && this.sees && dist > 3.2 && dist < 12) { this.setState('pounceWind'); S.voice('growl', this); } break;
      case 'slam':
        if (B.chain && (this.chainT -= dt) <= 0 && dist < B.chain.range && this.sees) { this.setState('chain'); this.swept = false; S.voice('roar', this); S.voice('clank', this); return; }
        if (this.abT > 0) return;
        if (dist < B.radius * 0.8) { this.setState('slam'); this.slammed = false; S.voice('roar', this); }
        else if (B.spit && dist < 17 && (this.sees || this.lostT < 3)) { this.spitB = B.spit; this.setState('spit'); this.spat = false; S.voice('gurgle', this); }
        break;
      case 'brood':
        this.broodT -= dt;
        if (this.broodT <= 0 && dist < 24) { this.setState('brood'); this.spawned = false; S.voice('roar', this); }
        else if (this.abT <= 0 && dist > 3 && dist < 15 && (this.sees || this.lostT < 3)) { this.spitB = B.spit; this.setState('spit'); this.spat = false; S.voice('gurgle', this); }
        break;
      case 'spore': if (this.abT <= 0 && dist > 3 && dist < 15 && (this.sees || this.lostT < 3)) { this.spitB = B; this.setState('spit'); this.spat = false; S.voice('gurgle', this); } break;
    }
  }
  // Embestida (Sujeto 0) o salto (Acometedor) en línea recta: si choca con un muro queda aturdido y expuesto
  updateCharge(dt, P, B) {
    const T = this.T, S = this.sys, w = S.game.world, v = B.speed * this.mSpd, a = this.chA, px = this.pos.x, pz = this.pos.z;
    this.pos.x += Math.sin(a) * v * dt; this.pos.z += Math.cos(a) * v * dt; w.resolve(this.pos, T.radius * this.V.scale);
    const moved = Math.hypot(this.pos.x - px, this.pos.z - pz); this.speed = moved / Math.max(dt, 1e-4); this.vx = Math.sin(a) * this.speed; this.vz = Math.cos(a) * this.speed; this.facing = a;
    if (!this.chHit) for (const p of S.game.players) {
      if (!p.active || !p.alive || Math.hypot(p.position.x - this.pos.x, p.position.z - this.pos.z) > 1.25 + T.radius * this.V.scale) continue;
      this.chHit = true; const d = p.takeDamage(B.dmg * this.mDmg, this), k = B.push || 8;
      if (d > 0) { p.shove(Math.sin(a) * k, Math.cos(a) * k); S.onPlayerHit(this, d, p); p.rig.shake(0.09, 0.4); }
      break;
    }
    const wall = this.stateT > 0.15 && moved < v * dt * 0.45;
    if (wall && !B.pounce) { // contra la pared
      this.setState('stunned'); this.stunT = B.stun; S.voice('boom', this); S.fx.shock(this.pos.x + Math.sin(a) * 0.8, this.pos.z + Math.cos(a) * 0.8, 2.2);
      S.shakeNear(this.pos, 0.08, 0.3); S.game.events.emit('boss:stunned', { z: this });
    } else if (B.pounce && (wall || this.stateT > B.dur || this.chHit)) { this.setState('exposed'); this.stunT = B.stun; this.vx = this.vz = 0; S.game.events.emit('boss:exposed', { z: this }); }
    else if (this.stateT > B.dur || this.chHit) { this.setState('chase'); this.abT = (rand(...B.cd) * (this.abCdK || 1)) * (this.chHit ? 1.2 : 1); }
  }
  // Blindajes y puntos débiles por jefe. Devuelve el daño real y si el impacto rebota
  mitigate(a, zone, dir, idx = 0) {
    const R = { a, block: null, armor: false, broke: false };
    if (!this.T.boss) return R;
    const f = Math.sin(this.facing) * dir.x + Math.cos(this.facing) * dir.z; // < 0: el disparo le llega de frente
    switch (this.type) {
      case 'subject': // placa de hueso frontal: vulnerable de espaldas o aturdido
        if (this.state === 'stunned') R.a = a * 1.6;
        else if (f < -0.2 && zone !== 'legs') { R.a = a * (zone === 'head' ? 0.45 : 0.18); R.armor = true; }
        else R.a = a * 1.3;
        break;
      case 'stalker': R.a = a * (this.state === 'exposed' ? 1.5 : this.cloak > 0.55 ? 0.4 : 1); break;
      case 'behemoth':
        if (zone === 'head') R.a = a * (this.platesOff >= 3 ? 1.3 : 0.55);
        else if (zone === 'body' && this.armor > 0) { this.armor -= a * 0.85; R.a = a * 0.18; R.armor = true; R.broke = this.checkPlates(dir); }
        else if (zone === 'body') R.a = a * 1.15; else if (zone === 'legs') R.a = a * 0.8;
        break;
      case 'queen': if (zone === 'body') R.a = a * 0.75; break;
      case 'alpha': {
        if (this.shield) { R.a = 0; R.block = 'shield'; break; }
        const pods = this.podsAlive();
        if (zone === 'pod') { if (this.podHp[idx] > 0) { this.podHp[idx] -= a; R.a = a * 0.15; if (this.podHp[idx] <= 0) { R.broke = true; this.popPod(idx, dir); } } else R.a = a * 0.15; }
        else if (zone === 'core') R.a = a * (this.phase === 1 ? 2 : pods ? 0.35 : this.phase >= 3 ? 1.6 : 1.3);
        else { R.a = a * (this.phase >= 3 ? 0.32 : 0.18); R.armor = true; }
        break;
      }
    }
    return R;
  }
  // Behemoth: las placas saltan a 2/3, 1/3 y 0 de blindaje
  checkPlates(dir) {
    const fr = this.armor / Math.max(1, this.T.armor), want = fr <= 0 ? 3 : fr <= 1 / 3 ? 2 : fr <= 2 / 3 ? 1 : 0;
    if (want <= this.platesOff) return false;
    while (this.platesOff < want) {
      const k = ['plateL', 'plateR', 'plateC'][this.platesOff++];
      for (const m of this.parts[k] || []) m.visible = false;
      if (this.platesOff === 3) for (const m of this.parts.mask || []) m.visible = false;
    }
    this.sys.plateBreak(this, dir, 3 - this.platesOff);
    if (this.platesOff === 3) { this.setState('stunned'); this.stunT = 1.8; }
    return true;
  }
  podsAlive() { let n = 0; for (const h of this.podHp) if (h > 0) n++; return n; }
  popPod(i, dir) {
    for (const m of this.parts['pod' + i] || []) m.visible = false;
    this.sys.podBurst(this, i, dir);
    if (this.state === 'chase') { this.setState('stunned'); this.stunT = 0.9; }
  }
  enterPhase(n) {
    this.phase = n; this.shield = false;
    if (n === 2) { for (let i = 0; i < this.podHp.length; i++) for (const m of this.parts['pod' + i] || []) m.visible = true; this.sys.game.audio.shield(false); }
    if (n === 3) { this.mSpd *= 1.25; this.mDmg *= 1.15; }
    if (n === 4) { this.mSpd *= 1.2; this.mDmg *= 1.25; if (this.T.ability && this.T.ability.cd) this.abCdK = 0.6; } // fase final: más rápido, más letal y ataques más seguidos
    this.setState('phase'); this.sys.voice('roar', this);
    this.sys.game.events.emit('boss:phase', { z: this, phase: n });
  }
  breakHelmet(dir) {
    for (const k of ['helmet', 'visor']) for (const m of this.parts[k] || []) m.visible = false;
    this.setState('stunned'); this.stunT = 1.1; this.sys.helmetBreak(this, dir);
  }
  setShield(on) {
    if (!this.alive || this.phase > 1) return;
    this.shield = on; this.sys.game.audio.shield(on);
    if (!on) this.setState('kneel'); else { this.setState('chase'); this.abT = rand(2, 4); }
  }

  move(dt, tx, tz, speed) {
    const T = this.T, w = this.sys.game.world, dx = tx - this.pos.x, dz = tz - this.pos.z, d = Math.hypot(dx, dz);
    let want = 0, a = this.facing;
    if (d > 0.2 && speed > 0) { want = speed; a = Math.atan2(dx, dz) + this.detour; }
    const k = 1 - Math.exp(-(this.type === 'runner' || this.type === 'stalker' ? 9 : 5) * dt);
    this.vx = lerp(this.vx, Math.sin(a) * want, k); this.vz = lerp(this.vz, Math.cos(a) * want, k);
    const px = this.pos.x, pz = this.pos.z;
    this.pos.x += this.vx * dt; this.pos.z += this.vz * dt;
    w.resolve(this.pos, T.radius * this.V.scale);
    this.speed = Math.hypot(this.pos.x - px, this.pos.z - pz) / Math.max(dt, 1e-4);
    if (want > 0.3 && this.speed < want * 0.3) { // atascado contra algo: rodear
      this.stuckT += dt;
      if (this.stuckT > 0.45) { this.detour = (Math.random() < 0.5 ? -1 : 1) * rand(0.9, 1.5); this.detourT = rand(0.8, 1.6); this.stuckT = 0; }
    } else this.stuckT = Math.max(0, this.stuckT - dt);
    if (this.detourT > 0) { this.detourT -= dt; if (this.detourT <= 0) this.detour = 0; }
  }

  perceive(dist, dx, dz) {
    const S = this.sys, P = this.tgt, T = this.T, w = S.game.world;
    let sees = false;
    if (P && P.alive) {
      const fl = P.flashlight, sight = T.sight * (fl.on && fl.level > 0.5 ? 1.3 : 1) * (P.crouch ? 0.7 : 1); // la linterna delata; agachado cuesta más verte
      if (dist < sight) {
        const cos = (Math.sin(this.facing) * dx + Math.cos(this.facing) * dz) / Math.max(dist, 1e-3);
        if (dist < 2.8 || this.state === 'chase' || this.state === 'attack' || cos > Math.cos(T.fov)) {
          const eh = T.eyeH * this.V.scale;
          _zo.set(this.pos.x, eh, this.pos.z); _zd.set(dx, 1.35 - eh, dz); const L = _zd.length(); _zd.divideScalar(L);
          sees = w.raycast(_zo, _zd, L) === Infinity;
        }
      }
    }
    if (T.blind) sees = !!(P && P.alive) && dist < T.feel; // ciego: solo te nota si te tiene encima (o te oye: ver noise)
    if (this.fury && P && P.alive) { this.lastSeen.copy(P.position); if (this.state === 'wander' || this.state === 'investigate') this.setState('chase'); } // la horda furiosa te huele
    this.sees = sees;
    if (sees) { this.lastSeen.copy(P.position); if (this.state === 'wander' || this.state === 'investigate') { this.setState('chase'); S.onSpot(this); } }
    if (this.speed > 0.2 && this.detourT <= 0) { // tantea el camino: rodea paredes antes de chocar
      _zo.set(this.pos.x, 0.6, this.pos.z);
      const look = (a, L) => w.raycast(_zo, _zd.set(Math.sin(a), 0, Math.cos(a)), L);
      if (look(this.facing, 1.0 + T.radius) !== Infinity) {
        const l = look(this.facing + 0.8, 2), r = look(this.facing - 0.8, 2);
        this.detour = (l === Infinity ? 99 : l) >= (r === Infinity ? 99 : r) ? 0.85 : -0.85; this.detourT = rand(0.6, 1.1);
      }
    }
  }
  pickWander() {
    const w = this.sys.game.world;
    for (let i = 0; i < 6; i++) {
      const a = rand(0, TAU), r = rand(1.5, 6), x = this.home.x + Math.sin(a) * r, z = this.home.z + Math.cos(a) * r;
      const B = w.bounds; if (x > B.x0 && x < B.x1 && z > B.z0 && z < B.z1 && w.isFree(x, z, 0.45)) { this.goal.set(x, 0, z); break; }
    }
    this.wanderT = rand(4, 9); this.pauseT = Math.random() < 0.4 ? rand(1, 3) : 0;
  }
  startAttack() { this.setState('attack'); this.atkT = 0; this.struck = false; this.lungeV = 0; this.sys.voice('attack', this); }
  updateAttack(dt, dist, dx, dz, P) {
    const T = this.T;
    this.atkT += dt; this.lungeV = 0;
    if (T.lunge && this.atkT > T.windup && this.atkT < T.windup + 0.22) this.lungeV = T.lunge; // salto del corredor
    if (!this.struck && this.atkT >= T.windup + (T.lunge ? 0.12 : 0.06)) {
      this.struck = true;
      const fwd = Math.sin(this.facing) * dx + Math.cos(this.facing) * dz;
      if (P.alive && dist < T.range + 0.4 && fwd > dist * 0.35) { const d = P.takeDamage(T.dmg * this.mDmg * rand(0.9, 1.1), this); if (d > 0) { this.sys.onPlayerHit(this, d, P); if (T.mass > 2) P.shove(Math.sin(this.facing) * 4, Math.cos(this.facing) * 4); } }
    }
    if (this.atkT >= T.windup + T.recover) { this.atkCD = T.cooldown * (this.fury ? 0.6 : 1); this.setState('chase'); }
  }
  // Devuelve true si el impacto lo mata. by: el jugador que lo hirió (se convierte en su presa)
  damage(amount, zone, dir, melee = false, by = null) {
    if (!this.alive) return false;
    this.hp -= amount; this.hitK = 1;
    if (by && by.active) { this.tgt = by; this.lastSeen.copy(by.position); } else if (this.tgt) this.lastSeen.copy(this.tgt.position);
    this.kbx = dir.x; this.kbz = dir.z; this.kb = (melee ? 1.9 : zone === 'head' ? 1.5 : 1.1) * (this.type === 'bloater' ? 0.25 : 1) / (this.T.mass || 1);
    const sf = Math.sin(this.facing), cf = Math.cos(this.facing); this.hfz = dir.x * sf + dir.z * cf; this.hfx = dir.x * cf - dir.z * sf; // empuje en su espacio local
    if (zone === 'legs') this.limp = Math.min(1, (this.limp || 0) + 0.55);
    if (this.T.phases) { // el Parásito Alpha cambia de fase al 66 % y al 33 % (no baja del 33 % con vainas vivas)
      if (this.phase === 1 && this.hp <= this.maxHp * 0.66) { this.hp = this.maxHp * 0.66; this.enterPhase(2); return false; }
      if (this.phase === 2 && this.hp <= this.maxHp * 0.33) { if (this.podsAlive()) this.hp = this.maxHp * 0.33 + 1; else { this.hp = this.maxHp * 0.33; this.enterPhase(3); return false; } }
      if (this.phase === 3 && this.T.final && this.hp <= this.maxHp * this.T.final) { this.hp = this.maxHp * this.T.final; this.enterPhase(4); return false; } // La Pesadilla Final
    }
    if (this.hp <= 0) { this.die(dir); return true; }
    if (this.T.boss) return false; // los jefes no se tambalean con cualquier impacto
    if (this.state !== 'attack' || this.type !== 'bloater') { this.setState('stagger'); this.stagT = this.T.stagger * (zone === 'head' ? 1.6 : zone === 'legs' ? 1.4 : 1) * (melee ? 1.5 : 1); }
    return false;
  }
  popHead(dir) { if (this.headless) return; this.sys.gore.headPop(this, dir); this.headless = true; this.b.head.scale.setScalar(0.001); }
  die(dir) {
    this.alive = false; this.state = 'dying'; this.deadT = 0;
    this.fallDir = Math.sin(this.facing) * dir.x + Math.cos(this.facing) * dir.z >= 0 ? 1 : -1; // cae en el sentido del disparo
    this.fallSide = rand(-0.25, 0.25); this.dpose = this.deathPose();
    if (this.cloakMat) { this.cloakMat.opacity = 1; this.sys.xmat.claw.opacity = 1; this.mesh.castShadow = true; }
  }
  // Pose final tumbada: boca abajo (un brazo estirado por encima de la cabeza), boca arriba (rodilla doblada) o corredor desplomado
  deathPose() {
    const s = Math.random() < 0.5 ? 1 : -1, over = -2.95, side = 0.12;
    if (this.type === 'runner') return { hipsY: this.restHipY * 0.3, spine: 1.5, head: [0.1, s * 1.0, 0], shL: [over, 0.45], shR: [side, -0.5], elL: -0.4, elR: -0.2, thL: [1.35, 0.15], thR: [1.25, -0.2], knL: 0.15, knR: 0.35, roll: this.fallSide * 1.4 };
    if (this.type === 'queen') return { hipsY: this.restHipY * 0.35, spine: 0.9, head: [0.4, s * 0.8, 0], shL: [-0.4, 1.2], shR: [-0.3, -1.2], elL: -0.6, elR: -0.5, thL: [0, 0], thR: [0, 0], knL: 0, knR: 0, roll: 0 };
    if (this.fallDir > 0) return { spine: 0.08, head: [-0.15, s * 1.15, 0], shL: [s > 0 ? over : side, s > 0 ? 0.6 : 0.3], shR: [s > 0 ? side : over, s > 0 ? -0.3 : -0.6], elL: -0.45, elR: -0.3, thL: [0.06, 0.12], thR: [-0.1, -0.12], knL: 0.12, knR: 0.32 };
    return { spine: -0.06, head: [0.25, s * rand(0.4, 0.9), 0], shL: [s > 0 ? -3.0 : -0.1, s > 0 ? 0.45 : 0.7], shR: [s > 0 ? -0.1 : -3.0, s > 0 ? -0.7 : -0.45], elL: -0.5, elR: -0.35, thL: [-0.5, 0.15], thR: [0, -0.12], knL: 1.0, knR: 0.12 };
  }
  pose(k) { // acerca los huesos a la pose de muerte
    const b = this.b, D = this.dpose, L = (o, key, v) => { o[key] = lerp(o[key], v, k); };
    L(b.spine.rotation, 'x', D.spine); L(b.spine.rotation, 'z', 0); L(b.chest.rotation, 'x', 0); L(b.chest.rotation, 'y', 0); L(b.chest.rotation, 'z', 0);
    L(b.head.rotation, 'x', D.head[0]); L(b.head.rotation, 'y', D.head[1]); L(b.head.rotation, 'z', D.head[2]);
    L(b.shoulderL.rotation, 'x', D.shL[0]); L(b.shoulderL.rotation, 'z', D.shL[1]); L(b.shoulderR.rotation, 'x', D.shR[0]); L(b.shoulderR.rotation, 'z', D.shR[1]);
    L(b.elbowL.rotation, 'x', D.elL); L(b.elbowR.rotation, 'x', D.elR);
    L(b.thighL.rotation, 'x', D.thL[0]); L(b.thighL.rotation, 'z', D.thL[1]); L(b.thighR.rotation, 'x', D.thR[0]); L(b.thighR.rotation, 'z', D.thR[1]);
    L(b.kneeL.rotation, 'x', D.knL); L(b.kneeR.rotation, 'x', D.knR);
    if (D.hipsY !== undefined) L(b.hips.position, 'y', D.hipsY); else { L(b.hips.rotation, 'y', 0); L(b.hips.rotation, 'z', 0); }
  }
  // Apoya el cuerpo en el barro: ni flota ni lo atraviesa (sondas repartidas por la malla)
  groundLift() {
    const P = this.VD.probes, B = this.boneArr; this.mesh.updateMatrixWorld(true);
    let mn = Infinity;
    for (let i = 0; i < P.length; i += 4) { const e = B[P[i]].matrixWorld.elements, wy = e[1] * P[i + 1] + e[5] * P[i + 2] + e[9] * P[i + 3] + e[13]; if (wy < mn) mn = wy; }
    return Math.max(0, this.mesh.position.y + 0.006 - mn);
  }
  updateDeath(dt) {
    this.deadT += dt;
    const dur = this.type === 'bloater' || this.T.boss ? 1.0 : this.type === 'runner' ? 0.5 : 0.75, D = this.dpose, flat = this.type === 'runner' || this.type === 'queen';
    if (this.state === 'dying') {
      const p = Math.min(1, this.deadT / dur), e = p * p;
      if (flat) this.mesh.rotation.z = D.roll * e;
      else { this.mesh.rotation.x = this.fallDir * e * (Math.PI / 2 - 0.08); this.mesh.rotation.z = this.fallSide * e; }
      this.pose(1 - Math.exp(-dt * 7));
      if (p >= 1) { this.state = 'dead'; this.deadT = 0; this.sys.onLand(this); }
    } else {
      const r = Math.exp(-this.deadT * 9) * Math.sin(this.deadT * 30) * 0.05; // pequeño rebote al tocar el suelo
      if (flat) this.mesh.rotation.z = D.roll * (1 - r); else this.mesh.rotation.x = this.fallDir * (Math.PI / 2 - 0.08 - r);
      this.pose(1 - Math.exp(-dt * 7));
      if (this.rigs.length) this.animRigs(dt, true);
      // Jefes y fuertes: conservan sus piezas; pasado un rato se hunden en el suelo (el Parásito Alpha se queda)
      if (this.T.boss) {
        this.sinkT += dt;
        if (this.type !== 'alpha' && this.sinkT > 7) { this.mesh.position.y -= dt * 0.35; if (this.mesh.position.y < -2.6) { this.active = false; this.mesh.visible = false; } return; }
      }
      // Ya quieto: su pose se hornea en el lote de cadáveres y se queda en el suelo para siempre
      else if (!this.baked && this.deadT > (this.type === 'bloater' ? 1.6 : 1.1) && this.sys.bakeSlot) { // como mucho un horneado por fotograma
        this.sys.bakeSlot = false; this.baked = true; if (this.sys.gore.bake(this)) { this.active = false; this.mesh.visible = false; }
      }
    }
    if (this.active && this.type !== 'queen') this.mesh.position.y = damp(this.mesh.position.y, this.groundLift(), 16, dt);
  }
  zones() { // cabeza (esfera), cuerpo y piernas (cápsulas) en el mundo, desde los huesos; más zonas extra y vainas
    const b = this.b, V = this.V, T = this.T;
    this.mesh.updateMatrixWorld(true);
    this.headC.set(HEAD_OFFSET[0], HEAD_OFFSET[1], HEAD_OFFSET[2]).applyMatrix4(b.head.matrixWorld);
    this.bodyA.set(0, -0.06, 0).applyMatrix4(b.hips.matrixWorld);
    this.bodyB.set(0, 0.3, 0).applyMatrix4(b.chest.matrixWorld); // esternón: la cápsula no invade la cabeza
    this.legLA.set(0, 0, 0).applyMatrix4(b.thighL.matrixWorld); this.legLB.set(0, -V.shin + 0.04, 0.03).applyMatrix4(b.kneeL.matrixWorld);
    this.legRA.set(0, 0, 0).applyMatrix4(b.thighR.matrixWorld); this.legRB.set(0, -V.shin + 0.04, 0.03).applyMatrix4(b.kneeR.matrixWorld);
    if (T.core) this.coreC.set(0, 0.27, 0.15).applyMatrix4(b.chest.matrixWorld);
    if (T.extraZones) T.extraZones.forEach((e, i) => this.xz[i].set(e.off[0], e.off[1], e.off[2]).applyMatrix4(b[e.bone].matrixWorld));
    if (T.pods) T.pods.forEach((p, i) => this.podC[i].set(p.off[0], p.off[1], p.off[2]).applyMatrix4(b[p.bone].matrixWorld));
  }

  /* --- Animación procedural sobre los huesos --- */
  animate(dt) {
    const t = this.type;
    if (t === 'runner') this.animRunner(dt);
    else if (t === 'queen') this.animQueen(dt);
    else if (t === 'bloater' || t === 'behemoth' || t === 'alpha') this.animBloater(dt);
    else this.animCommon(dt);
    if (this.T.boss) this.animBoss(dt);
    this.react(dt);
    if (this.rigs.length) this.animRigs(dt);
  }
  // Poses de las habilidades de los jefes (sobre la animación base)
  animBoss(dt) {
    const b = this.b, s = this.state, k = this.stateT, B = this.T.ability || {};
    if (this.type === 'subject' && (s === 'wander' || s === 'chase' || s === 'investigate')) { // mole: espalda arqueada, hombros abiertos, codos en guardia
      const t = this.sys.time + this.seed, br = Math.sin(t * 2.2) * 0.04;
      b.spine.rotation.x = Math.min(b.spine.rotation.x, 0.2) + br * 0.5; b.chest.rotation.x = 0.1 + br; b.head.rotation.x = -0.42 + br; // erguido, mirando al frente
      b.shoulderL.rotation.set(-0.35 + br, 0, 0.26); b.shoulderR.rotation.set(-0.42 - br, 0, -0.26); // brazos en guardia, separados del tronco
      b.elbowL.rotation.x = -0.75 - br; b.elbowR.rotation.x = -0.85 + br;
    }
    if (s === 'intro' || s === 'phase') { // presentación: arquea la espalda, abre los brazos y ruge al cielo
      const p = smooth(0, 0.6, k), w = Math.sin(this.sys.time * 38) * 0.03 * p;
      b.spine.rotation.x = lerp(b.spine.rotation.x, -0.38, p); b.chest.rotation.x = -0.18 * p; b.head.rotation.set(lerp(b.head.rotation.x, -0.75, p) + w, w, 0);
      b.shoulderL.rotation.set(-0.5 * p, 0, lerp(0.14, 1.25, p)); b.shoulderR.rotation.set(-0.5 * p, 0, -lerp(0.14, 1.25, p)); b.elbowL.rotation.x = b.elbowR.rotation.x = -0.7 * p;
    } else if (s === 'windup') { const p = clamp(k / B.windup, 0, 1); b.spine.rotation.x = 0.55 + 0.25 * p; b.shoulderL.rotation.x = b.shoulderR.rotation.x = lerp(-0.4, 0.55, p); b.head.rotation.x = -0.6; b.hips.position.y -= 0.06 * p; b.chest.rotation.y = Math.sin(k * 30) * 0.05 * p; }
    else if (s === 'charge') { b.spine.rotation.x = 0.95; b.head.rotation.x = -0.9; b.shoulderL.rotation.set(0.7, 0, 0.25); b.shoulderR.rotation.set(0.7, 0, -0.25); b.elbowL.rotation.x = b.elbowR.rotation.x = -0.3; }
    else if (s === 'stunned' || s === 'exposed') {
      const w = Math.sin(k * 3) * 0.08, pant = Math.sin(this.sys.time * 9) * 0.05; b.spine.rotation.x = 0.9 + pant; b.head.rotation.set(0.5 + w, w, 0.3); b.shoulderL.rotation.set(0.15, 0, 0.2); b.shoulderR.rotation.set(0.1, 0, -0.2);
      b.elbowL.rotation.x = b.elbowR.rotation.x = -0.1; if (this.type !== 'queen') { b.kneeL.rotation.x = b.kneeR.rotation.x = 0.5; b.thighL.rotation.x = b.thighR.rotation.x = -0.35; b.hips.position.y = this.restHipY - 0.08; }
    } else if (s === 'pounceWind') { // agazapado, a punto de saltar
      const p = smooth(0, 1, k / 0.55); b.hips.position.y = this.restHipY - 0.26 * p; b.thighL.rotation.x = b.thighR.rotation.x = -1.1 * p; b.kneeL.rotation.x = b.kneeR.rotation.x = 1.9 * p;
      b.spine.rotation.x = 0.9 * p; b.head.rotation.x = -0.9 * p; b.shoulderL.rotation.set(-0.4, 0, 0.9 * p); b.shoulderR.rotation.set(-0.4, 0, -0.9 * p);
    } else if (s === 'pounce') { b.spine.rotation.x = 1.2; b.head.rotation.x = -1.2; b.shoulderL.rotation.set(-2.2, 0, 0.6); b.shoulderR.rotation.set(-2.2, 0, -0.6); b.elbowL.rotation.x = b.elbowR.rotation.x = -0.2; b.thighL.rotation.x = 0.6; b.thighR.rotation.x = 0.9; b.kneeL.rotation.x = b.kneeR.rotation.x = 0.4; }
    else if (s === 'slam') {
      const p = clamp(k / B.windup, 0, 1), q = clamp((k - B.windup) / 0.18, 0, 1);
      if (k < B.windup) { const e = smooth(0, 1, p); b.shoulderL.rotation.set(lerp(0, -2.9, e), 0, 0.3); b.shoulderR.rotation.set(lerp(0, -2.9, e), 0, -0.3); b.spine.rotation.x = lerp(0.1, -0.25, p); b.elbowL.rotation.x = b.elbowR.rotation.x = -0.5; }
      else { b.shoulderL.rotation.set(lerp(-2.9, -0.6, q), 0, 0.3); b.shoulderR.rotation.set(lerp(-2.9, -0.6, q), 0, -0.3); b.spine.rotation.x = lerp(-0.25, 0.75, q); b.hips.position.y = this.restHipY - 0.12 * q; b.kneeL.rotation.x = b.kneeR.rotation.x = 0.5 * q; b.thighL.rotation.x = b.thighR.rotation.x = -0.4 * q; }
    } else if (s === 'chain') { // brazos en cruz: las cadenas barren el suelo en abanico
      const C = B.chain, p = clamp(k / C.windup, 0, 1), q = clamp((k - C.windup) / 0.3, 0, 1);
      b.shoulderL.rotation.set(-0.15, 0, lerp(0.3, 1.45, smooth(0, 1, p))); b.shoulderR.rotation.set(-0.15, 0, -lerp(0.3, 1.45, smooth(0, 1, p))); b.elbowL.rotation.x = b.elbowR.rotation.x = -0.15;
      b.chest.rotation.y = k < C.windup ? lerp(0, 1.1, smooth(0, 1, p)) : lerp(1.1, -1.5, 1 - (1 - q) ** 3); b.spine.rotation.x = 0.2;
    } else if (s === 'brood') { const p = clamp(k / B.brood.windup, 0, 1); b.spine.rotation.x = lerp(0.1, -0.5, p); b.head.rotation.x = -0.8 * p; b.shoulderL.rotation.set(-1.4 * p, 0, 0.8 * p); b.shoulderR.rotation.set(-1.4 * p, 0, -0.8 * p); b.hips.rotation.x = -0.25 * Math.sin(p * Math.PI); }
    else if (s === 'spit') { const SB = this.spitB || B, p = clamp(k / SB.windup, 0, 1); b.spine.rotation.x = p < 1 ? lerp(0.3, -0.35, p) : 0.6; b.head.rotation.x = p < 1 ? lerp(-0.3, 0.4, p) : -0.7; b.chest.rotation.x = p < 1 ? -0.2 * p : 0.2; }
    else if (s === 'kneel') {
      const p = smooth(0, 1, k / 0.8), br = Math.sin(this.sys.time * 2.5) * 0.04;
      b.hips.position.y = lerp(this.restHipY, this.restHipY * 0.62, p); b.hips.rotation.set(0, 0, 0);
      b.thighL.rotation.set(-1.25 * p, 0, 0.2); b.thighR.rotation.set(-0.9 * p, 0, -0.2); b.kneeL.rotation.x = 1.9 * p; b.kneeR.rotation.x = 1.6 * p;
      b.spine.rotation.x = 0.35 * p + br; b.head.rotation.x = 0.2 * p; b.shoulderL.rotation.set(-0.3 * p, 0, 0.5 * p); b.shoulderR.rotation.set(-0.3 * p, 0, -0.5 * p);
    }
    if (this.type === 'stalker' && this.cloak > 0.5 && (s === 'chase' || s === 'wander')) { const c = this.cloak; b.hips.position.y -= 0.12 * c; b.spine.rotation.x += 0.35 * c; b.thighL.rotation.x -= 0.4 * c; b.thighR.rotation.x -= 0.4 * c; b.kneeL.rotation.x += 0.7 * c; b.kneeR.rotation.x += 0.7 * c; b.head.rotation.x -= 0.4 * c; } // al acecho, encorvado
  }
  // La Reina: torso humano sobre un abdomen de araña (las patas las mueve animRigs)
  animQueen(dt) {
    const b = this.b, T = this.T, t = this.sys.time + this.seed, m = clamp(this.speed / 1.2, 0, 1);
    this.gph += dt * (1.5 + this.speed * 4.2);
    b.hips.position.y = this.restHipY + 0.03 * Math.sin(this.gph * 2) * m + 0.015 * Math.sin(t * 1.3); b.hips.rotation.set(0, 0, 0.03 * Math.sin(this.gph) * m);
    let spX = 0.12 + 0.04 * Math.sin(t * 0.8), shX = -0.6 + 0.15 * Math.sin(t * 1.4), elX = -0.9;
    if (this.state === 'attack') {
      const p = this.atkT / T.windup;
      if (p < 1) { shX = lerp(shX, -2.6, smooth(0, 1, p)); spX -= 0.3 * p; }
      else { const q = clamp((this.atkT - T.windup) / 0.18, 0, 1), r = clamp((this.atkT - T.windup - 0.18) / (T.recover - 0.18), 0, 1); shX = lerp(lerp(-2.6, -0.3, q), shX, r); spX = lerp(lerp(spX - 0.3, 0.7, q), spX, r); elX = lerp(-0.1, elX, r); }
    }
    b.spine.rotation.set(spX - 0.4 * this.hitK, 0, 0.04 * Math.sin(t * 0.7)); b.chest.rotation.set(0, 0.15 * Math.sin(t * 0.5), 0);
    b.head.rotation.set(-0.15 + 0.08 * Math.sin(t * 1.1), 0.3 * Math.sin(t * 0.37), 0.35 * Math.sin(t * 0.6 + 1));
    b.shoulderL.rotation.set(shX + 0.1 * Math.sin(t * 2.3), 0, 0.35); b.shoulderR.rotation.set(shX + 0.1 * Math.sin(t * 2.1 + 1), 0, -0.35);
    b.elbowL.rotation.x = elX + 0.15 * Math.sin(t * 3.1); b.elbowR.rotation.x = elX + 0.15 * Math.sin(t * 2.9 + 1);
    b.thighL.rotation.set(0, 0, 0); b.thighR.rotation.set(0, 0, 0); b.kneeL.rotation.x = b.kneeR.rotation.x = 0;
  }
  // Apéndices: tentáculos que ondulan (y azotan al atacar) y patas de araña con IK de dos huesos
  animRigs(dt, dead = false) {
    const t = this.sys.time + this.seed, m = dead ? 0 : clamp(this.speed / 1.1, 0, 1), T = this.T, hy = this.b.hips.position.y;
    const atk = !dead && this.state === 'attack' ? Math.sin(clamp(this.atkT / (T.windup + 0.2), 0, 1) * Math.PI) : 0, rage = this.state === 'intro' || this.state === 'phase' || this.state === 'brood' ? 1 : 0;
    for (const R of this.rigs) {
      const S = R.spec;
      if (S.kind === 'tentacle') {
        const amp = dead ? 0.08 : S.amp * (1 + rage * 0.8), n = R.segs.length;
        for (let i = 0; i < n; i++) {
          const g = R.segs[i], f = 0.5 + i / n;
          g.rotation.x = Math.sin(t * S.speed + i * 0.7 + R.ph) * amp * f + (i === 0 ? 1.5 * atk : i < 3 ? 0.35 * atk : 0) + (dead ? 0.25 : 0);
          g.rotation.z = Math.cos(t * S.speed * 0.8 + i * 0.9 + R.ph) * amp * 0.6 * f;
        }
      } else { // pata: el pie sigue un ciclo de paso (alterno por grupos) y la rodilla se resuelve con IK
        const ph = this.gph + (S.set ? Math.PI : 0), sw = Math.sin(ph), lift = dead ? 0 : Math.max(0, sw) * 0.24 * m + (rage ? Math.max(0, Math.sin(t * 9 + S.set * 2)) * 0.12 : 0);
        R.root.rotation.y = S.yaw + Math.cos(ph) * 0.3 * m * S.side + (dead ? 0.2 * S.side : 0);
        const H = Math.max(0.2, hy + S.base[1] - lift), Rr = S.reach + (dead ? 0.25 : 0), d = Math.min(Math.hypot(Rr, H), S.Lf + S.Lt - 0.01);
        const phi = Math.atan2(-H, Rr), al = Math.acos(clamp((S.Lf * S.Lf + d * d - S.Lt * S.Lt) / (2 * S.Lf * d), -1, 1)), be = Math.acos(clamp((S.Lf * S.Lf + S.Lt * S.Lt - d * d) / (2 * S.Lf * S.Lt), -1, 1));
        R.femur.rotation.z = phi + al; R.knee.rotation.z = -(Math.PI - be);
      }
    }
  }
  // Capa orgánica común: respiración agitada, espasmos, peso que pasa de un pie a otro, cojera y reacción a cada impacto
  react(dt) {
    const b = this.b, t = this.sys.time + this.seed, hunt = this.state === 'chase' || this.state === 'attack', m = clamp(this.speed / 1.2, 0, 1);
    const br = Math.sin(t * (hunt ? 5.2 : 2.1)) * (hunt ? 0.035 : 0.02) * (this.type === 'bloater' ? 1.6 : 1);
    b.chest.rotation.x -= br; b.head.rotation.x += br * 0.5;
    if (this.type !== 'runner' && this.type !== 'queen') { b.hips.position.x = Math.sin(this.ph) * (this.type === 'bloater' ? 0.05 : 0.03) * m; b.chest.rotation.z += Math.sin(this.ph) * 0.04 * m; }
    this.twT = (this.twT ?? rand(1, 5)) - dt;
    if (this.twT <= 0) { this.twT = rand(0.6, 2.8); this.tw = 1; this.twx = rand(-0.75, 0.75); this.twy = rand(-1, 1); this.twz = rand(-0.7, 0.7); } // espasmo
    if (this.tw > 0) {
      this.tw = Math.max(0, this.tw - dt * 6); const e = Math.sin(this.tw * Math.PI);
      b.head.rotation.x += this.twx * e; b.head.rotation.y += this.twy * e; b.head.rotation.z += this.twz * e;
      b.spine.rotation.z += this.twz * 0.35 * e; b.chest.rotation.y += this.twy * 0.25 * e; b.shoulderL.rotation.z += this.twz * 0.6 * e; b.elbowR.rotation.x -= Math.abs(this.twx) * 0.8 * e;
    }
    if (hunt) { const j = 0.09; b.elbowL.rotation.x += (Math.random() - 0.5) * j; b.elbowR.rotation.x += (Math.random() - 0.5) * j; b.head.rotation.z += (Math.random() - 0.5) * j * 0.6; } // temblor nervioso
    const k = this.hitK * this.hitK; // el impacto empuja el cuerpo en su dirección (y los brazos se abren)
    if (k > 0.001) { b.spine.rotation.x += (this.hfz || 0) * 0.4 * k; b.chest.rotation.z -= (this.hfx || 0) * 0.32 * k; b.chest.rotation.y -= (this.hfx || 0) * 0.3 * k; b.head.rotation.x += (this.hfz || 0) * 0.45 * k; b.head.rotation.y += (this.hfx || 0) * 0.35 * k; b.shoulderL.rotation.z += 0.4 * k; b.shoulderR.rotation.z -= 0.4 * k; }
    if (this.limp > 0 && this.type !== 'runner' && this.type !== 'queen') { const s = Math.abs(Math.sin(this.ph)); b.hips.position.y -= 0.03 * this.limp * s * m; b.hips.rotation.z += 0.09 * this.limp * Math.sin(this.ph) * m; b.kneeR.rotation.x += 0.25 * this.limp * m; }
  }
  animCommon(dt) {
    const b = this.b, T = this.T, t = this.sys.time + this.seed;
    this.ph += dt * this.speed * 3.2;
    const s = Math.sin(this.ph), c = Math.cos(this.ph), m = clamp(this.speed / 0.9, 0, 1);
    this.armUp = damp(this.armUp, this.state === 'chase' || this.state === 'attack' ? 1 : 0.1, 3, dt);
    b.thighL.rotation.x = -s * 0.45 * m; b.thighR.rotation.set(s * 0.3 * m, 0, -0.05);   // pierna derecha arrastrada
    b.kneeL.rotation.x = Math.max(0, c) * 0.75 * m + 0.08; b.kneeR.rotation.x = Math.max(0, -c) * 0.35 * m + 0.14;
    b.hips.position.y = this.restHipY - 0.03 - 0.03 * Math.abs(s) * m;
    b.hips.rotation.set(0, s * 0.09 * m, s * 0.07 * m);
    let spX = 0.34 + 0.05 * Math.sin(t * 1.3), hdX = -0.34 + 0.1 * Math.sin(t * 0.9); // encorvado, con el cuello estirado hacia delante
    let shX = lerp(-0.1 + s * 0.28 * m, -1.25 + 0.12 * s, this.armUp), elX = lerp(-0.18, -0.4, this.armUp);
    if (this.state === 'attack') { // alza los brazos y los descarga
      const p = this.atkT / T.windup;
      if (p < 1) { shX = lerp(shX, -2.3, smooth(0, 1, p)); spX -= 0.2 * p; }
      else { const q = clamp((this.atkT - T.windup) / 0.18, 0, 1), r = clamp((this.atkT - T.windup - 0.18) / (T.recover - 0.18), 0, 1); shX = lerp(lerp(-2.3, -0.55, q), shX, r); spX = lerp(lerp(spX - 0.2, 0.62, q), spX, r); elX = lerp(-0.1, elX, r); }
    }
    spX -= 0.45 * this.hitK; hdX -= 0.5 * this.hitK;
    b.spine.rotation.set(spX, 0, 0.05 * Math.sin(t * 0.7));
    b.chest.rotation.set(0, 0.06 * Math.sin(t * 0.6), -s * 0.08 * m);
    b.head.rotation.set(hdX, 0.18 * Math.sin(t * 0.45), 0.45 * Math.sin(this.seed) + 0.07 * Math.sin(t * 1.7)); // cabeza ladeada en un ángulo antinatural
    if (this.burst > 0) { const f = Math.sin(t * 13); b.shoulderL.rotation.x = -1.35 + f * 0.65; b.shoulderR.rotation.x = -1.35 - f * 0.65; b.spine.rotation.x += 0.28; b.elbowL.rotation.x = b.elbowR.rotation.x = -0.6; } // carrera desbocada, brazos agitándose
    b.shoulderL.rotation.set(shX + 0.08 * Math.sin(t * 2.1), 0, 0.14 + 0.08 * this.armUp);
    b.shoulderR.rotation.set(shX - 0.1 * this.armUp + 0.08 * Math.sin(t * 1.9 + 1), 0, -0.14 - 0.06 * this.armUp);
    b.elbowL.rotation.x = elX; b.elbowR.rotation.x = elX - 0.15;
  }
  animRunner(dt) { // a cuatro patas, bajo y rápido
    const b = this.b, T = this.T, t = this.sys.time + this.seed;
    this.ph += dt * (2 + this.speed * 2.6);
    const s = Math.sin(this.ph), c = Math.cos(this.ph), m = clamp(this.speed / 2.5, 0, 1), idle = 1 - clamp(this.speed / 0.6, 0, 1);
    let crouch = 0.36, spX = 1.2, sw = s * 0.6 * m, shBase = -1.75;
    if (this.state === 'attack') {
      const p = this.atkT / T.windup;
      if (p < 1) { crouch += 0.07 * p; spX += 0.15 * p; }
      else { const q = clamp((this.atkT - T.windup) / 0.2, 0, 1), r = clamp((this.atkT - T.windup - 0.2) / (T.recover - 0.2), 0, 1); spX = lerp(lerp(1.35, 0.55, q), 1.2, r); shBase = lerp(lerp(-1.9, -2.7, q), -1.75, r); crouch = lerp(lerp(0.43, 0.2, q), 0.36, r); }
    }
    spX -= 0.4 * this.hitK;
    b.hips.position.y = this.restHipY * (1 - crouch) - 0.035 * Math.abs(s) * m;
    b.spine.rotation.set(spX + 0.05 * Math.sin(t * 2.3) * idle, 0, 0);
    b.chest.rotation.set(0.15, 0, -s * 0.1 * m);
    b.head.rotation.set(-1.05 + 0.12 * Math.sin(t * 3.1) * idle, 0.3 * Math.sin(t * 1.3) * idle, 0.25 * Math.sin(t * 2.2));
    b.thighL.rotation.set(-1.15 + s * 0.55 * m, 0, 0.2); b.thighR.rotation.set(-1.15 + Math.sin(this.ph + 0.6) * 0.55 * m, 0, -0.2);
    b.kneeL.rotation.x = 1.75 + c * 0.35 * m; b.kneeR.rotation.x = 1.75 - c * 0.35 * m;
    b.shoulderL.rotation.set(shBase - sw, 0, 0.32); b.shoulderR.rotation.set(shBase - Math.sin(this.ph + 0.5) * 0.6 * m, 0, -0.32);
    b.elbowL.rotation.x = -0.25 - Math.max(0, c) * 0.5 * m; b.elbowR.rotation.x = -0.25 - Math.max(0, -c) * 0.5 * m;
  }
  animBloater(dt) { // contoneo pesado, barriga que tiembla, golpe a dos manos
    const b = this.b, T = this.T, t = this.sys.time + this.seed;
    this.ph += dt * this.speed * 2.4;
    const s = Math.sin(this.ph), c = Math.cos(this.ph), m = clamp(this.speed / 0.7, 0, 1);
    let spX = 0.12, shX = s * 0.22 * m, elX = -0.35, shZ = 0.45;
    if (this.state === 'attack') {
      const p = this.atkT / T.windup;
      if (p < 1) { shX = lerp(0, -2.85, smooth(0, 1, p)); spX = lerp(0.12, -0.18, p); elX = -0.6; shZ = 0.25; }
      else { const q = clamp((this.atkT - T.windup) / 0.22, 0, 1), r = clamp((this.atkT - T.windup - 0.22) / (T.recover - 0.22), 0, 1); shX = lerp(lerp(-2.85, -0.45, q), 0, r); spX = lerp(lerp(-0.18, 0.5, q), 0.12, r); elX = -0.1; shZ = lerp(0.25, 0.45, r); }
    }
    spX -= 0.15 * this.hitK;
    b.hips.position.y = this.restHipY - 0.02 - 0.025 * Math.abs(c) * m;
    b.hips.rotation.set(0, 0, s * 0.13 * m);
    b.thighL.rotation.set(-s * 0.26 * m, 0, 0.17); b.thighR.rotation.set(s * 0.26 * m, 0, -0.17);
    b.kneeL.rotation.x = 0.12 + Math.max(0, c) * 0.3 * m; b.kneeR.rotation.x = 0.12 + Math.max(0, -c) * 0.3 * m;
    b.spine.rotation.set(spX, 0, 0); b.chest.rotation.set(0, 0, -s * 0.06 * m);
    const jig = Math.sin(this.ph * 2 + 0.6) * 0.05 * m + Math.sin(t * 1.8) * 0.015 + this.hitK * 0.08;
    b.belly.scale.set(1 + jig, 1 - jig * 0.6, 1 + jig);
    b.head.rotation.set(-0.12 + 0.05 * Math.sin(t), 0.12 * Math.sin(t * 0.4), 0.1 * Math.sin(t * 0.7));
    b.shoulderL.rotation.set(shX, 0, shZ); b.shoulderR.rotation.set(shX, 0, -shZ);
    b.elbowL.rotation.x = elX; b.elbowR.rotation.x = elX;
  }
}
