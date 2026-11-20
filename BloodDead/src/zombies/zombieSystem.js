import * as THREE from 'three';
import { TAU, clamp, damp, rand } from '../core/utils.js';
import { CONFIG } from '../data/config.js';
import { TextureFactory } from '../render/textures.js';
import { DIRECTOR } from './zombieTypes.js';
import { ZombieFactory } from './zombieFactory.js';
import { Zombie } from './zombie.js';
import { BossFX } from './bossFx.js';
import { GoreSystem } from '../fx/goreSystem.js';
import { rayCapsule, raySphere } from '../weapons/rayHit.js';

/* Sistema: oleadas, impactos, sangre, manchas y monedas (con uno o dos jugadores) */
export const ZOMBIE_SPAWNS = [[-15, -8], [12, -6], [-6, -24], [18, 14], [-18, 12], [6, -26], [20, -2], [-21, -2], [14, -22], [-14, -21], [2, -19], [-8.5, 11.5], [21, 22], [-21, 24], [8, -1.5]];
export class ZombieSystem {
  constructor(game) {
    this.game = game; this.time = 0; this.kills = 0; this.coins = 0; this.pool = []; this.objs = []; this.drops = [];
    this.maxAlive = game.quality.zombies || 9; this.spawnT = 8; this.cullT = 2; this.titan = null; this.shieldFlash = 0;
    this.dir = { ...DIRECTOR };
    this.material = ZombieFactory.material(game.lighting.csm);
    this.xmat = ZombieFactory.extraMats(game.lighting.csm);
    this.v = new THREE.Vector3(); this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.sv = new THREE.Vector3();
    this.initFX(); this.gore = new GoreSystem(this); this.fx = new BossFX(this);
    this.unsub = game.events.on('player:step', (e) => { if (e.player && !e.crouch) this.noise(e.player.position, e.running ? 9 : e.speed > 2.2 ? 5 : 2.6); });
  }
  get players() { return this.game.players; }
  anyAlive() { for (const p of this.game.players) if (p.active && p.alive) return true; return false; }
  nearestPlayer(x, z, alive = true) { let best = null, bd = Infinity; for (const p of this.game.players) { if (!p.active || (alive && !p.alive)) continue; const d = Math.hypot(p.position.x - x, p.position.z - z); if (d < bd) { bd = d; best = p; } } return best; }
  shakeNear(pos, amp, t) { for (const p of this.game.players) if (p.active) p.rig.shake(clamp(amp - Math.hypot(p.position.x - pos.x, p.position.z - pos.z) * amp * 0.05, amp * 0.2, amp), t); }
  prewarm() { const z = this.pool.find((q) => !q.T.boss); if (z) this.gore.prewarm(z); }
  // Director de oleadas: lo ajustan la historia (por paso) y la supervivencia (por ronda)
  setDirector(d, merge = false) {
    this.dir = merge ? { ...this.dir, ...d } : { ...DIRECTOR, ...d };
    if (d.weights) this.dir.weights = { ...d.weights };
    this.spawnT = Math.min(this.spawnT, rand(...this.dir.every));
  }
  spawnOpts() { const m = this.dir.mult || {}, co = this.game.activePlayers.length > 1 ? 1.25 : 1; return { spd: m.spd || 1, dmg: m.dmg || 1, hp: (m.hp || 1) * co, fury: !!this.dir.fury }; }
  get aliveRegular() { let n = 0; for (const z of this.pool) if (z.alive && !z.T.boss) n++; return n; }
  spawnBoss(key, x, z, opt = {}) {
    ZombieFactory.ensure([key]);
    const b = this.get(key), P = this.nearestPlayer(x, z, false) || this.game.player, co = this.game.activePlayers.length > 1 ? 1.4 : 1;
    b.spawn(x, z, { spd: 1, dmg: 1, hp: co, ...opt }); b.tgt = P;
    b.facing = Math.atan2(P.position.x - x, P.position.z - z); b.mesh.rotation.y = b.facing;
    b.lastSeen.copy(P.position); b.goal.copy(P.position); b.setState(opt.intro ? 'intro' : 'chase');
    if (b.T.core) this.titan = b;
    if (!opt.intro) this.voice('roar', b);
    this.game.events.emit('boss:spawn', { z: b });
    return b;
  }
  track(o) { this.game.scene.add(o); this.objs.push(o); return o; }
  get alive() { let n = 0; for (const z of this.pool) if (z.alive) n++; return n; }
  get(key) {
    let z = this.pool.find((q) => !q.active && q.key === key);
    if (!z) { z = new Zombie(this, key); this.pool.push(z); }
    return z;
  }
  pickVariant() { // sorteo ponderado según el director (con topes de corredores e hinchados vivos)
    const W = this.dir.weights || DIRECTOR.weights, runners = this.pool.filter((z) => z.alive && z.type === 'runner').length, bloaters = this.pool.filter((z) => z.alive && z.type === 'bloater').length;
    const opts = []; let tot = 0;
    for (const k in W) {
      if (!ZombieFactory.variants[k] || !(W[k] > 0)) continue;
      if (k === 'runner' && runners >= 3) continue;
      if (k === 'bloater' && (bloaters >= 2 || this.kills < 2)) continue;
      tot += W[k]; opts.push([k, tot]);
    }
    const x = Math.random() * tot; for (const [k, c] of opts) if (x < c) return k;
    return 'villager';
  }
  // Aparición lejos de TODOS los jugadores; si hidden, fuera de la vista de todas las cámaras
  spawnAt(key, minDist = 14, hidden = false, opt = null) {
    const w = this.game.world, ps = this.game.activePlayers, pts = w.spawnPoints(this.dir.groups); if (!ps.length) return null;
    const far = (x, z, md) => ps.every((p) => Math.hypot(x - p.position.x, z - p.position.z) > md);
    let cands = [];
    for (const md of [minDist, minDist * 0.65]) { cands = pts.map(([x, z]) => [x + rand(-1, 1), z + rand(-1, 1)]).filter(([x, z]) => far(x, z, md) && w.isFree(x, z, 0.5)); if (cands.length) break; }
    cands.sort(() => Math.random() - 0.5);
    let pick = null;
    for (const c of cands) {
      if (hidden && ps.some((p) => { // detrás de la cámara o tapado por una pared
        const cam = p.camera, rig = p.rig, dx = c[0] - cam.position.x, dz = c[1] - cam.position.z, d = Math.hypot(dx, dz), front = (dx * rig.fwd.x + dz * rig.fwd.z) / d;
        return front > 0.35 && d < 22 && w.raycast(this.v.set(cam.position.x, 1.4, cam.position.z), this.sv.set(dx / d, 0, dz / d), d) === Infinity;
      })) continue;
      pick = c; break;
    }
    if (!pick) return null;
    const o = opt || this.spawnOpts(), z0 = this.get(key); z0.spawn(pick[0], pick[1], o);
    const P = (z0.tgt = z0.pickTarget()); if (!P) return z0;
    if (o.fury || (this.dir.aggro && Math.random() < this.dir.aggro * 0.5)) { z0.lastSeen.copy(P.position); z0.goal.copy(P.position); z0.setState('chase'); }
    else if (hidden && Math.random() < 0.6) { z0.goal.set(P.position.x + rand(-6, 6), 0, P.position.z + rand(-6, 6)); z0.setState('investigate'); } // refuerzos que vienen a buscarte
    return z0;
  }
  initialWave(n) { for (let i = 0; i < n; i++) { const z = this.spawnAt(this.pickVariant(), 13, false); if (z && z.state === 'chase' && !this.dir.fury) z.setState('wander'); } }

  update(dt) {
    this.time += dt; this.bakeSlot = true; this.frame = (this.frame || 0) + 1;
    for (const z of this.pool) if (z.active) z.update(dt);
    this.separate(); this.blockPlayers();
    for (let i = this.drops.length - 1; i >= 0; i--) { const d = this.drops[i]; d.t -= dt; if (d.t <= 0) { this.drops.splice(i, 1); d.fn(); } }
    const D = this.dir, ps = this.game.activePlayers; this.spawnT -= dt;
    if (this.spawnT <= 0) { this.spawnT = rand(...D.every); if (!D.paused && this.aliveRegular < Math.min(this.maxAlive, Math.round(D.target * (ps.length > 1 ? 1.4 : 1))) && this.anyAlive()) this.spawnAt(this.pickVariant(), D.minDist, true); }
    this.cullT -= dt;
    if (this.cullT <= 0 && D.cull) { // los rezagados que se quedaron atrás desaparecen (dejan sitio a los que vienen)
      this.cullT = 1.5;
      for (const z of this.pool) if (z.alive && !z.T.boss && z.state !== 'chase' && z.state !== 'attack' && ps.every((p) => Math.hypot(z.pos.x - p.position.x, z.pos.z - p.position.z) > 40)) { z.alive = false; z.active = false; z.mesh.visible = false; }
    }
    this.updateFX(dt); this.gore.update(dt); this.updateCoins(dt); this.fx.update(dt);
    // Escudo y núcleo del Parásito Alpha; vainas que laten
    const U = this.xmat.shield.uniforms, T = this.titan;
    U.uA.value = damp(U.uA.value, T && T.alive && T.shield ? 1 : 0, 3, dt); U.uT.value += dt; this.shieldFlash = Math.max(0, this.shieldFlash - dt * 4); U.uHit.value = this.shieldFlash;
    if (T && T.parts.shield) T.parts.shield[0].visible = U.uA.value > 0.01;
    this.xmat.core.emissiveIntensity = T && T.alive && !T.shield ? 4.5 + 2.5 * Math.sin(this.time * (T.phase === 3 ? 16 : 9)) : 1.4;
    this.xmat.pod.emissiveIntensity = 1.4 + 1.1 * Math.sin(this.time * 5.5); this.xmat.egg.emissiveIntensity = 0.7 + 0.4 * Math.sin(this.time * 2.3);
    // Susurros: si un infectado se acerca por la espalda o por un lado, se le oye antes que verlo
    this.whT = (this.whT ?? rand(5, 10)) - dt;
    const P1 = this.game.player;
    if (this.whT <= 0 && P1 && P1.alive) {
      this.whT = rand(7, 15); const cam = P1.camera.position, f = P1.rig.fwd; let best = null, bd = 9;
      for (const z of this.pool) { if (!z.alive) continue; const dx = z.pos.x - cam.x, dz = z.pos.z - cam.z, d = Math.hypot(dx, dz); if (d < bd && (dx * f.x + dz * f.z) / Math.max(d, 1e-3) < 0.35) { bd = d; best = z; } }
      if (best) this.voice('whisper', best);
    }
  }
  // Durante una cinemática solo se mueve el jefe presentado (y la sangre / los ojos)
  cineUpdate(dt, z) { this.time += dt; this.frame = (this.frame || 0) + 1; if (z && z.active) z.update(dt); this.updateFX(dt); this.gore.update(dt); }
  separate() { // los infectados no se atraviesan entre sí
    const L = this.pool;
    for (let i = 0; i < L.length; i++) {
      const a = L[i]; if (!a.alive) continue;
      for (let j = i + 1; j < L.length; j++) {
        const b = L[j]; if (!b.alive) continue;
        const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z, r = a.T.radius * a.V.scale + b.T.radius * b.V.scale, d2 = dx * dx + dz * dz;
        if (d2 < r * r && d2 > 1e-6) { const ma = a.T.mass || 1, mb = b.T.mass || 1, d = Math.sqrt(d2), k = (r - d) / d, ka = (k * mb) / (ma + mb), kb = (k * ma) / (ma + mb); a.pos.x -= dx * ka; a.pos.z -= dz * ka; b.pos.x += dx * kb; b.pos.z += dz * kb; } // los pesados apartan a los demás
      }
    }
  }
  blockPlayers() { // los jugadores no pueden atravesarlos (ni atravesarse entre ellos)
    const ps = this.game.activePlayers, R = CONFIG.player.radius;
    for (const P of ps) {
      for (const z of this.pool) {
        if (!z.alive) continue;
        const dx = P.position.x - z.pos.x, dz = P.position.z - z.pos.z, r = z.T.radius * z.V.scale + R + 0.06, d2 = dx * dx + dz * dz;
        if (d2 < r * r && d2 > 1e-6) { const d = Math.sqrt(d2), k = (r - d) / d, pk = z.T.mass > 2 ? 1 : 0.8; P.position.x += dx * k * pk; P.position.z += dz * k * pk; z.pos.x -= dx * k * (1 - pk); z.pos.z -= dz * k * (1 - pk); }
      }
    }
    if (ps.length > 1 && ps[0].alive && ps[1].alive) { const a = ps[0].position, b = ps[1].position, dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), r = R * 2; if (d < r && d > 1e-4) { const k = (r - d) / d / 2; a.x -= dx * k; a.z -= dz * k; b.x += dx * k; b.z += dz * k; } }
    for (const P of ps) this.game.world.resolve(P.position, R);
  }
  // Ruido: disparos y pasos atraen a los que lo oyen
  noise(pos, radius) {
    for (const z of this.pool) {
      if (!z.alive || z.state === 'intro') continue;
      const d = Math.hypot(z.pos.x - pos.x, z.pos.z - pos.z), r = radius * z.T.hear;
      if (z.state !== 'wander' && z.state !== 'investigate') { if (z.T.blind && d < r) { z.lastSeen.copy(pos); z.lostT = 0; } continue; } // el ciego sigue el sonido
      if (d > r) continue;
      z.goal.set(pos.x + rand(-1.2, 1.2), 0, pos.z + rand(-1.2, 1.2)); z.lastSeen.copy(pos);
      if (d < r * 0.35) { z.setState('chase'); z.lostT = 0; } else z.setState('investigate');
    }
  }
  // Raycast analítico: cabeza (esfera), cuerpo y piernas (cápsulas), zonas extra (abdomen de la Reina), vainas y núcleo. assist > 1 las agranda (táctil)
  raycast(o, dir, maxT, assist = 1, corpses = false) {
    let best = null;
    for (const z of this.pool) {
      if (!z.alive) continue;
      const ex = z.pos.x - o.x, ez = z.pos.z - o.z, along = ex * dir.x + ez * dir.z, lim = 1.6 + z.V.scale * 0.9;
      if (along < -lim || along > maxT + 2 + z.V.scale) continue;
      const px = ex - dir.x * along, pz = ez - dir.z * along;
      if (px * px + pz * pz > lim * lim) continue; // lejos de la línea de tiro
      z.zones();
      const s = z.V.scale * assist, T = z.T, th = raySphere(o, dir, z.headC, T.head * s), tb = rayCapsule(o, dir, z.bodyA, z.bodyB, T.body * s);
      const tl = Math.min(rayCapsule(o, dir, z.legLA, z.legLB, T.leg * s), rayCapsule(o, dir, z.legRA, z.legRB, T.leg * s));
      let t = Infinity, zone = null, idx = 0;
      const tc = T.core ? raySphere(o, dir, z.coreC, T.core * s) : Infinity;
      if (tc < Infinity) { t = tc; zone = 'core'; } // núcleo: el punto débil (está en la superficie del pecho)
      else if (th < Infinity && th <= tb + 0.1) { t = th; zone = 'head'; } // si el rayo roza ambos, manda la cabeza
      else if (tb < Infinity && tb <= tl + 0.05) { t = tb; zone = 'body'; }
      else if (tl < Infinity) { t = tl; zone = 'legs'; }
      if (T.extraZones) T.extraZones.forEach((e, i) => { const te = raySphere(o, dir, z.xz[i], e.r * s); if (te < t) { t = te; zone = e.zone; } });
      if (T.pods && z.phase >= 2) { // vainas: están en la superficie (dentro de la cápsula del cuerpo), así que mandan si el rayo las toca
        let bp = Infinity; T.pods.forEach((p, i) => { if (z.podHp[i] <= 0) return; const tp = raySphere(o, dir, z.podC[i], p.r * s * 1.15); if (tp < bp) { bp = tp; idx = i; } });
        if (bp < Infinity && !(zone === 'head' && t < bp - 0.25)) { t = bp; zone = 'pod'; }
      }
      if (t < maxT && (!best || t < best.t)) best = { z, t, zone, idx };
    }
    if (corpses) { const c = this.gore.rayCorpse(o, dir, best ? best.t : maxT); if (c) return { z: null, corpse: c.corpse, t: c.t, zone: 'corpse' }; }
    return best;
  }
  // A quemarropa no se falla: si el rayo pasa rozando a un infectado pegado al jugador, cuenta como impacto
  closeAssist(o, dir, maxT, pp) {
    let best = null, bc = Math.cos(0.18);
    for (const z of this.pool) {
      if (!z.alive || Math.hypot(z.pos.x - pp.x, z.pos.z - pp.z) > 2.8) continue;
      z.zones(); const c = this.v.copy(z.bodyA).lerp(z.bodyB, 0.6), dx = c.x - o.x, dy = c.y - o.y, dz = c.z - o.z, L = Math.hypot(dx, dy, dz);
      if (L > maxT) continue;
      const cs = (dx * dir.x + dy * dir.y + dz * dir.z) / L;
      if (cs > bc) { bc = cs; best = { z, t: L * cs, zone: 'body' }; }
    }
    return best;
  }
  sparks(point, dir, n) { const p = this.game.player; if (p && p.weapons) p.weapons.sparks(point, dir, n); }
  hit(z, { amount, crit, zone, dir, point, origin = null, melee = false, slash = null, throat = false, by = null, idx = 0 }) {
    const m = z.mitigate(amount, zone, dir, idx);
    if (m.block || m.armor) { // blindaje: chispas y sonido metálico
      this.sparks(point, dir, m.block ? 10 : 5);
      this.voice(m.block === 'shield' ? 'shieldHit' : 'clank', z);
    }
    if (m.block) {
      if (m.block === 'shield') this.shieldFlash = 1;
      if (z.state === 'wander' || z.state === 'investigate') { if (by) { z.tgt = by; z.lastSeen.copy(by.position); } z.setState('chase'); }
      const res = { amount: 0, crit: false, zone, killed: false, blocked: m.block, broke: m.broke };
      if (by) this.game.audio.hitTick('armor');
      this.game.events.emit('zombie:hit', { z, point, by, ...res });
      return res;
    }
    amount = m.a;
    const P = by ? by.position : point, near = Math.hypot(z.pos.x - P.x, z.pos.z - P.z) < 6, heavy = (crit || near || melee) && !m.armor;
    const gz = zone === 'core' || zone === 'pod' ? 'body' : zone;
    const killed = z.damage(amount, gz, dir, melee, by);
    const pop = killed && zone === 'head' && !melee && (crit || near) && !z.T.boss; // crítico o a quemarropa: la cabeza revienta
    const p = (m.armor && Math.random() < 0.6) || zone === 'pod' ? point : this.gore.impact(z, point, dir, gz, { heavy, killed, melee, slash, pop, throat: throat && melee, origin, rayDir: origin ? this.sv.copy(point).sub(origin).normalize() : null });
    if (!melee) this.game.audio.flesh(zone === 'head', heavy);
    if (by) this.game.audio.hitTick(killed ? 'kill' : zone === 'head' || zone === 'core' || zone === 'pod' ? 'head' : m.armor ? 'armor' : 'body');
    const res = { amount, crit, zone, killed, gore: heavy, headshot: pop, armor: m.armor };
    this.game.events.emit('zombie:hit', { z, point: p, by, ...res });
    if (killed) { if (pop) z.popHead(dir); this.onKill(z, zone, pop, by); }
    else if (z.state === 'wander' || z.state === 'investigate') z.setState('chase'); // los ataques especiales de los jefes no se interrumpen
    return res;
  }
  hitCorpse(c, point, dir) { // disparar a un cadáver: salpica y se queda la mancha
    this.gore.spray(point, dir, 14, 0.9, 0.5); this.gore.splat(point.x + dir.x * 0.5, point.z + dir.z * 0.5, rand(0.25, 0.4), Math.atan2(-dir.z, dir.x));
    this.game.audio.flesh(false, false);
  }
  // Tajo de cuchillo: hasta dos infectados delante del jugador (y todas las crías al alcance)
  melee(p) {
    const K = CONFIG.knife, f = p.facing, fx = Math.sin(f), fz = Math.cos(f), w = this.game.world, list = [];
    for (const z of this.pool) {
      if (!z.alive) continue;
      const dx = z.pos.x - p.position.x, dz = z.pos.z - p.position.z, d = Math.hypot(dx, dz);
      if (d > K.range + z.T.radius * z.V.scale) continue;
      if (d > 0.55 && (dx * fx + dz * fz) / d < Math.cos(K.arc)) continue;
      if (d > 0.3 && w.raycast(this.v.set(p.position.x, 1.1, p.position.z), this.sv.set(dx / d, 0, dz / d), d) !== Infinity) continue;
      list.push([d, z]);
    }
    list.sort((a, b) => a[0] - b[0]);
    const slash = new THREE.Vector3(-Math.cos(f), 0, Math.sin(f)); // barrido de la izquierda a la derecha del personaje
    for (const [d, z] of list.slice(0, 2)) {
      z.zones();
      const dmg = p.rollDamage(K.damage), tgt = z.bodyA.clone().lerp(z.bodyB, dmg.crit ? 1 : 0.72);
      if (dmg.crit) tgt.lerp(z.headC, 0.3); // crítico: tajo en la garganta
      const o = new THREE.Vector3(p.position.x, Math.max(0.5, Math.min(1.3, tgt.y + 0.1)), p.position.z);
      const kd = new THREE.Vector3(z.pos.x - p.position.x, 0, z.pos.z - p.position.z).normalize();
      this.hit(z, { amount: dmg.amount, crit: dmg.crit, zone: 'body', dir: kd, point: tgt, origin: o, melee: true, slash, throat: dmg.crit, by: p });
    }
    return Math.min(2, list.length) + this.fx.knifeSwarm(p, K);
  }
  onKill(z, zone, pop = false, by = null) {
    this.kills++;
    this.voice(pop ? 'crunch' : 'death', z);
    if (z.type === 'acolyte') this.fx.cloud(z.pos.x, z.pos.z, { ...z.T.ability, dur: 6 }); // revienta en esporas
    if (z.T.boss) this.shakeNear(z.pos, 0.06, 0.6);
    if (by) by.kills = (by.kills || 0) + 1;
    this.game.events.emit('zombie:killed', { type: z.type, headshot: zone === 'head', kills: this.kills, z, boss: !!z.T.boss, by });
    const x = z.pos.x, zz = z.pos.z, [a, b] = z.T.coins;
    this.drops.push({ t: 0.4, fn: () => this.spawnCoins(x, zz, Math.round(rand(a, b))) });
    if (z.T.burst) this.drops.push({ t: 0.55, fn: () => this.burst(z) });
  }
  onLand(z) { this.voice('thud', z); this.gore.splat(z.pos.x + Math.sin(z.facing) * z.fallDir * 0.9, z.pos.z + Math.cos(z.facing) * z.fallDir * 0.9, rand(0.5, 0.8)); }
  onSpot(z) {
    this.voice(z.type === 'runner' ? 'screech' : 'roar', z);
    for (const o of this.pool) { // la manada se avisa
      if (o === z || !o.alive || o.state === 'chase' || o.state === 'intro') continue;
      if (Math.hypot(o.pos.x - z.pos.x, o.pos.z - z.pos.z) < 7) { o.lastSeen.copy(z.lastSeen); o.goal.copy(z.lastSeen); o.setState('investigate'); }
    }
  }
  onPlayerHit(z, dmg, P = this.game.player) {
    this.gore.spray(this.v.set(P.position.x, 1.25, P.position.z), this.sv.set(Math.sin(z.facing), 0.2, Math.cos(z.facing)), 16, 0.9);
    if (Math.random() < 0.6) this.gore.splat(P.position.x + rand(-0.3, 0.3), P.position.z + rand(-0.3, 0.3), rand(0.25, 0.4));
    this.game.audio.hurt();
  }
  // Onda de choque al golpear el suelo (Behemoth y Parásito Alpha): daño y empujón según la distancia
  shockwave(z, B) {
    const f = z.V.scale;
    this.fx.shock(z.pos.x + Math.sin(z.facing) * 0.9 * f, z.pos.z + Math.cos(z.facing) * 0.9 * f, B.radius);
    this.voice('boom', z); this.shakeNear(z.pos, 0.13, 0.55);
    for (const P of this.game.activePlayers) {
      const d = Math.hypot(P.position.x - z.pos.x, P.position.z - z.pos.z);
      if (!P.alive || d >= B.radius) continue;
      const got = P.takeDamage(B.dmg * z.mDmg * (1 - d / B.radius) + 6, z);
      if (got > 0) { const k = 9 * (1 - d / B.radius) + 3, l = Math.max(d, 0.1); P.shove(((P.position.x - z.pos.x) / l) * k, ((P.position.z - z.pos.z) / l) * k); this.onPlayerHit(z, got, P); }
    }
    this.noise(z.pos, 25);
  }
  // Barrido de cadenas del Behemoth: abanico frontal, empuja hacia un lado
  chainSweep(z, C) {
    const fx = Math.sin(z.facing), fz = Math.cos(z.facing), R = C.range + z.T.radius * z.V.scale;
    this.fx.shock(z.pos.x + fx * 0.6, z.pos.z + fz * 0.6, R); this.voice('clank', z); this.voice('boom', z); this.shakeNear(z.pos, 0.08, 0.35);
    for (const P of this.game.activePlayers) {
      if (!P.alive) continue;
      const dx = P.position.x - z.pos.x, dz = P.position.z - z.pos.z, d = Math.hypot(dx, dz);
      if (d > R || (d > 0.8 && (dx * fx + dz * fz) / d < Math.cos(C.arc))) continue;
      const got = P.takeDamage(C.dmg * z.mDmg, z);
      if (got > 0) { P.shove(-fz * 7.5, fx * 7.5); this.onPlayerHit(z, got, P); }
    }
  }
  spit(z, target, B = z.T.ability) { // saco de esporas o de ácido en parábola
    z.zones(); this.fx.lob(this.v.copy(z.headC), target, B); this.voice('spore', z);
  }
  helmetBreak(z, dir) {
    z.zones(); const c = z.headC.clone();
    for (let i = 0; i < 8; i++) this.gore.gib(c, dir.x * rand(1, 3) + rand(-1.5, 1.5), rand(1.5, 3.5), dir.z * rand(1, 3) + rand(-1.5, 1.5), 'metal', rand(0.03, 0.06));
    this.sparks(c, dir, 16);
    this.voice('shatter', z); setTimeout(() => this.voice('roar', z), 250);
    this.game.events.emit('boss:helmet', { z });
  }
  plateBreak(z, dir, left) { // placa de acero del Behemoth arrancada a balazos
    z.zones(); const c = this.v.copy(z.bodyA).lerp(z.bodyB, 0.7);
    for (let i = 0; i < 10; i++) this.gore.gib(c, dir.x * rand(1, 3) + rand(-2, 2), rand(1.5, 4), dir.z * rand(1, 3) + rand(-2, 2), 'metal', rand(0.04, 0.08));
    this.sparks(c, dir, 20); this.voice('shatter', z); setTimeout(() => this.voice('roar', z), 220);
    this.game.events.emit('boss:plate', { z, left });
  }
  podBurst(z, i, dir) { // vaina del Parásito reventada
    z.zones(); const c = z.podC[i].clone();
    this.gore.spray(c, this.sv.set(dir.x, 0.6, dir.z), 30, 1.3, 0.5, true);
    for (let k = 0; k < 7; k++) this.gore.gib(c, rand(-2.5, 2.5), rand(2, 4), rand(-2.5, 2.5), Math.random() < 0.5 ? 'flesh' : 'organ', rand(0.04, 0.08));
    this.voice('splat', z); setTimeout(() => this.voice('roar', z), 200);
    this.game.events.emit('boss:pod', { z, left: z.podsAlive() });
  }
  burst(z) { // el hinchado revienta y daña en área
    const R = z.T.burst, c = this.v.set(z.pos.x, 0.8, z.pos.z);
    this.gore.belly(z);
    this.voice('splat', z);
    this.shakeNear(c, 0.05, 0.4);
    for (const P of this.game.activePlayers) { const d = Math.hypot(P.position.x - c.x, P.position.z - c.z); if (P.alive && d < R.radius) P.takeDamage(R.dmg * (1 - d / R.radius) + 4, z); }
    this.noise(c, 20);
  }
  // Sonido situado en 3D: posición de la fuente + distancia a la cámara más cercana (pantalla dividida incluida)
  voice(kind, z) {
    const a = this.game.audio; if (!a.ctx) return;
    const now = a.ctx.currentTime, vox = kind === 'moan' || kind === 'growl' || kind === 'roar' || kind === 'gurgle';
    if (vox) { // como mucho 4 voces a la vez: horda inquietante, no cacofonía
      this.vox = (this.vox || []).filter((e) => e > now);
      if (this.vox.length >= 4 || now - (this.lastVox || 0) < 0.3) return;
      this.lastVox = now;
    }
    const src = this.v.set(z.pos.x, (z.T.eyeH || 1.6) * z.V.scale, z.pos.z), d = a.earDist(src), pos = { x: src.x, y: src.y, z: src.z };
    const vol = clamp(1.6 / (1 + d * 0.17), 0.03, 1);
    const PITCH = { bloater: 0.62, runner: 1.3, subject: 0.72, stalker: 1.18, behemoth: 0.5, queen: 1.05, alpha: 0.4, acolyte: 1.12 }, bv = z.T.boss ? 1.5 : 1;
    const pitch = PITCH[z.type] || (z.V.female ? 1.24 : rand(0.9, 1.06));
    if (vox) { const dur = a.zvoice(kind, pos, Math.min(1, vol * bv), pitch, d); if (dur) this.vox.push(now + dur); }
    else if (kind === 'attack') a.zvoice(z.type === 'bloater' || z.T.mass > 5 ? 'roar' : 'snarl', pos, Math.min(1, vol * bv), pitch, d);
    else if (kind === 'clank') a.clank(pos, Math.min(1, vol * 1.2));
    else if (kind === 'shieldHit') { a.clank(pos, vol * 0.5); a.tone(rand(180, 240), 0.05, 0.005, 0.25, 'sawtooth', 0.4); }
    else if (kind === 'shatter') a.shatter(pos, Math.min(1, vol * 1.4));
    else if (kind === 'boom') a.boom(pos, Math.min(1, vol * 2.2));
    else if (kind === 'spore') a.spore(pos, Math.min(1, vol * 1.3));
    else if (kind === 'screech') a.zscreech(pos, Math.min(1, vol * (z.T.boss ? 1.6 : 1)), z.T.boss ? 0.7 : 1);
    else if (kind === 'whisper') a.whisper(pos, Math.min(1, vol * 1.3), d);
    else if (kind === 'death') a.zvoice('death', pos, vol, pitch, d);
    else if (kind === 'crunch') a.crunch(pos, Math.min(1, vol * 1.4));
    else if (kind === 'thud') a.thud(pos, vol * (z.type === 'bloater' || z.T.boss ? 1.4 : 1));
    else if (kind === 'splat') a.splat(pos, Math.min(1, vol * 1.5));
  }

  /* ---------- Efectos: ojos que brillan y monedas (la sangre la gestiona GoreSystem) ---------- */
  initFX() {
    const T = TextureFactory;
    const pts = (n, mat) => { const p = new Float32Array(n * 3).fill(-999), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3)); const o = this.track(new THREE.Points(g, mat)); o.frustumCulled = false; return { o, p, n }; };
    this.eyes = pts(48, new THREE.PointsMaterial({ map: T.dot, color: 0xffa13a, size: 0.05, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    const zero = this.m4.makeScale(0, 0, 0);
    // Monedas: un único InstancedMesh + halo dorado en Points
    const cg = new THREE.CylinderGeometry(0.075, 0.075, 0.014, 22).rotateX(Math.PI / 2);
    const cm = new THREE.MeshStandardMaterial({ color: 0xd8aa3a, metalness: 1, roughness: 0.28, emissive: 0x6a4808, emissiveIntensity: 0.9 });
    if (this.game.lighting.csm) this.game.lighting.csm.setupMaterial(cm);
    this.coinMesh = this.track(new THREE.InstancedMesh(cg, cm, 32)); this.coinMesh.frustumCulled = false;
    for (let i = 0; i < 32; i++) this.coinMesh.setMatrixAt(i, zero);
    this.halo = pts(32, new THREE.PointsMaterial({ map: T.dot, color: 0xffcf66, size: 0.42, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.coinItems = Array.from({ length: 32 }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, t: 0, value: 0, rot: 0 }));
  }
  // Compatibilidad con fases anteriores
  blood(p, dir, n, power = 1, up = false) { this.gore.spray(p, dir, n, power, 0.35, up); }
  decal(x, z, s) { this.gore.splat(x, z, s); }
  mist(p, s = 1) { this.gore.mist(p, s); }
  updateFX(dt) {
    const E = this.eyes; let k = 0;
    for (const z of this.pool) {
      if (!z.alive || !z.mesh.visible || z.headless || !z.VD.eye.length) continue;
      z.b.head.updateWorldMatrix(true, false);
      for (const e of z.VD.eye) { if (k >= E.n) break; this.v.set(e[0], e[1], e[2]).applyMatrix4(z.b.head.matrixWorld); E.p[k * 3] = this.v.x; E.p[k * 3 + 1] = this.v.y; E.p[k * 3 + 2] = this.v.z; k++; }
    }
    for (let i = k; i < E.n; i++) E.p[i * 3 + 1] = -999;
    E.o.geometry.attributes.position.needsUpdate = true;
  }

  /* ---------- Monedas (compartidas por el equipo) ---------- */
  spawnCoins(x, z, total) {
    const n = total > 20 ? 3 : total > 9 ? 2 : 1;
    for (let k = 0; k < n; k++) {
      const c = this.coinItems.find((q) => !q.on); if (!c) return;
      const v = k === n - 1 ? total - Math.floor(total / n) * (n - 1) : Math.floor(total / n);
      Object.assign(c, { on: true, x: x + rand(-0.2, 0.2), y: 0.7, z: z + rand(-0.2, 0.2), vx: rand(-1.3, 1.3), vy: rand(2.6, 3.6), vz: rand(-1.3, 1.3), t: 0, value: v, rot: rand(0, TAU) });
    }
  }
  updateCoins(dt) {
    if (!this.coinsLive) { let any = false; for (const c of this.coinItems) if (c.on) { any = true; break; } if (!any) return; }
    this.coinsLive = false;
    const H = this.halo, M = this.coinMesh, pulse = 0.85 + 0.15 * Math.sin(this.time * 4);
    for (let i = 0; i < this.coinItems.length; i++) {
      const c = this.coinItems[i];
      if (!c.on) { H.p[i * 3 + 1] = -999; continue; }
      c.t += dt; c.rot += dt * 3.2;
      const P = this.nearestPlayer(c.x, c.z);
      const dx = P ? P.position.x - c.x : 99, dz = P ? P.position.z - c.z : 99, dy = 0.9 - c.y, d = Math.hypot(dx, dz);
      if (P && d < 2.6 && c.t > 0.6) { // imán hacia el jugador más cercano
        const sp = 7 / Math.max(0.3, Math.hypot(dx, dy, dz)); c.x += dx * sp * dt; c.y += dy * sp * dt; c.z += dz * sp * dt;
        if (Math.hypot(dx, dy, dz) < 0.45) { this.collect(c, P); c.on = false; }
      } else {
        c.vy -= 12 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
        if (c.y < 0.17) { c.y = 0.17; c.vy = Math.abs(c.vy) > 1 ? -c.vy * 0.35 : 0; c.vx *= 0.6; c.vz *= 0.6; }
        if (c.vy === 0) c.y = 0.17 + 0.04 * Math.sin(c.t * 3 + i);
      }
      if (c.t > 45) c.on = false;
      this.coinsLive = true;
      const blink = c.t > 40 ? (Math.sin(c.t * 18) > 0 ? 1 : 0) : 1;
      this.e.set(0, c.rot, 0); this.q.setFromEuler(this.e);
      M.setMatrixAt(i, this.m4.compose(this.v.set(c.x, c.y, c.z), this.q, this.sv.setScalar(c.on ? blink : 0)));
      H.p[i * 3] = c.x; H.p[i * 3 + 1] = c.on && blink ? c.y : -999; H.p[i * 3 + 2] = c.z;
    }
    M.instanceMatrix.needsUpdate = true; H.o.geometry.attributes.position.needsUpdate = true; H.o.material.opacity = 0.5 * pulse;
  }
  collect(c, P) {
    this.coins += c.value;
    this.game.audio.coin();
    this.game.events.emit('loot:coin', { value: c.value, total: this.coins, by: P });
  }
  dispose() {
    if (this.unsub) this.unsub();
    for (const z of this.pool) { z.mesh.removeFromParent(); if (z.mesh.skeleton) z.mesh.skeleton.dispose(); if (z.cloakMat) z.cloakMat.dispose(); }
    this.objs.forEach((o) => { o.removeFromParent(); if (o.geometry && !o.isSprite && !o.userData.shared) o.geometry.dispose(); if (o.material) o.material.dispose(); if (o.isInstancedMesh) o.dispose(); }); // la geometría de Sprite es compartida
    this.material.dispose(); Object.values(this.xmat).forEach((m) => m.dispose()); this.pool = []; this.titan = null;
  }
}
