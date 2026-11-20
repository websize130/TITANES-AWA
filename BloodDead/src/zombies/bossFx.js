import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, clamp, damp, rand } from '../core/utils.js';
import { TextureFactory } from '../render/textures.js';
import { raySphere } from '../weapons/rayHit.js';

/* Efectos de jefe: onda de choque, polvo, sacos de esporas/ácido en parábola, nubes que dañan
   y el ENJAMBRE de crías de la Reina (un único InstancedMesh: se matan a cuchillo o a tiros) */
export class BossFX {
  constructor(sys) {
    this.sys = sys; const T = TextureFactory;
    const rg = new THREE.RingGeometry(0.86, 1, 64).rotateX(-Math.PI / 2);
    this.rings = [0, 1, 2].map(() => { const m = sys.track(new THREE.Mesh(rg, new THREE.MeshBasicMaterial({ color: 0xffd2a8, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }))); m.visible = false; m.frustumCulled = false; m.userData = { t: 1, R: 1 }; return m; });
    const spr = (color, op = 0) => { const s = sys.track(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.cloud, color, transparent: true, opacity: op, depthWrite: false }))); s.visible = false; return s; };
    this.dust = Array.from({ length: 12 }, () => { const s = spr(0x7a6e60); s.userData = { life: 0 }; return s; }); this.dust.i = 0;
    this.balls = Array.from({ length: 3 }, () => { const s = sys.track(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.dot, color: 0xc89a5a, transparent: true, opacity: 0.95, depthWrite: false }))); s.visible = false; s.scale.setScalar(0.42); s.userData = { on: false }; return s; });
    this.puffs = Array.from({ length: 32 }, () => spr(0x8a6a40));
    this.clouds = []; this.spore = 0;
    // Crías: cuerpo + seis patas en una sola geometría; hasta 24 a la vez en 1 draw call
    const parts = [new THREE.SphereGeometry(1, 9, 6).scale(0.11, 0.065, 0.15).translate(0, 0.07, 0), new THREE.SphereGeometry(1, 7, 5).scale(0.06, 0.05, 0.06).translate(0, 0.08, 0.15)];
    for (const s of [1, -1]) for (const z of [-0.07, 0, 0.07]) parts.push(new THREE.CylinderGeometry(0.008, 0.012, 0.2, 4).rotateZ(s * 1.1).translate(s * 0.13, 0.06, z));
    const cg = mergeGeometries(parts, false); this.cgeo = cg;
    this.crawl = sys.track(new THREE.InstancedMesh(cg, sys.xmat.chitin, 24)); this.crawl.frustumCulled = false; this.crawl.castShadow = false; this.crawl.layers.set(1);
    this.cr = Array.from({ length: 24 }, () => ({ on: false, x: 0, z: 0, vx: 0, vz: 0, a: 0, t: 0, ph: 0, latch: null, ox: 0, oz: 0, y: 0 }));
    for (let i = 0; i < 24; i++) this.crawl.setMatrixAt(i, sys.m4.makeScale(0, 0, 0));
    this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.e = new THREE.Euler(); this.p = new THREE.Vector3(); this.s = new THREE.Vector3(1, 1, 1);
  }
  shock(x, z, R) {
    const m = this.rings.find((q) => !q.visible) || this.rings[0]; m.visible = true; m.position.set(x, 0.07, z); m.userData.t = 0; m.userData.R = R;
    for (let i = 0; i < 7; i++) {
      const s = this.dust[this.dust.i]; this.dust.i = (this.dust.i + 1) % this.dust.length; const a = rand(0, TAU), d = rand(0.3, 1.6);
      s.visible = true; s.position.set(x + Math.cos(a) * d, 0.45, z + Math.sin(a) * d); s.userData = { life: 1, s: rand(1.4, 2.6) * Math.min(2, R / 5), vx: Math.cos(a) * R * 0.4, vz: Math.sin(a) * R * 0.4 }; s.material.rotation = rand(0, TAU);
    }
  }
  lob(from, to, B) {
    const b = this.balls.find((q) => !q.userData.on); if (!b) return;
    const T = clamp(Math.hypot(to.x - from.x, to.z - from.z) / 11, 0.45, 1.2), g = 9.8;
    b.userData = { on: true, t: 0, vx: (to.x - from.x) / T, vz: (to.z - from.z) / T, vy: (0.05 - from.y) / T + 0.5 * g * T, B };
    b.material.color.set(B.acid ? 0xb8541c : 0xc89a5a);
    b.position.copy(from); b.visible = true;
  }
  cloud(x, z, B) {
    const free = this.puffs.filter((s) => !s.visible).slice(0, 8); if (!free.length) return;
    free.forEach((s, i) => {
      const a = (i / free.length) * TAU, d = i ? rand(0.4, 1) * B.radius * 0.65 : 0, k = (rand(2.6, 3.8) * B.radius) / 3.2;
      s.visible = true; s.position.set(x + Math.cos(a) * d, rand(0.7, 1.5), z + Math.sin(a) * d); s.scale.set(k, k * 0.8, 1); s.material.rotation = rand(0, TAU); s.material.opacity = 0; s.userData.v = rand(-0.2, 0.2);
      s.material.color.set(B.acid ? 0x7a2a10 : 0x8a6a40);
    });
    this.clouds.push({ x, z, r: B.radius, t: 0, dur: B.dur, dps: B.dps, sp: free });
    const d = this.sys.game.audio.earDist({ x, y: 1, z }); this.sys.game.audio.spore({ x, y: 1, z }, clamp(1.4 / (1 + d * 0.15), 0.1, 1));
  }
  // Enjambre: las crías salen del abdomen de la Reina en abanico
  brood(z, n) {
    z.zones(); const c = z.xz[0] || z.bodyA;
    for (let k = 0; k < n; k++) {
      const it = this.cr.find((q) => !q.on); if (!it) break;
      const a = z.facing + rand(-1.6, 1.6) + Math.PI * (Math.random() < 0.3 ? 1 : 0), sp = rand(2.5, 4.5);
      Object.assign(it, { on: true, x: c.x + Math.sin(a) * 0.4, z: c.z + Math.cos(a) * 0.4, vx: Math.sin(a) * sp, vz: Math.cos(a) * sp, a, t: 0, ph: rand(0, TAU), latch: null, y: 0, spd: rand(3, 4.2) });
    }
    this.sys.gore.spray(this.p.set(c.x, c.y, c.z), this.s.set(0, 1, 0), 18, 0.8, 0.4, true); this.s.set(1, 1, 1);
    this.sys.game.events.emit('boss:brood', { z, n });
  }
  killCrawler(it, dir) {
    it.on = false; it.latch = null;
    this.sys.gore.spray(this.p.set(it.x, 0.15, it.z), dir || this.s.set(0, 1, 0), 8, 0.6, 0.3, true); this.s.set(1, 1, 1);
    if (Math.random() < 0.5) this.sys.gore.splat(it.x, it.z, rand(0.15, 0.25));
    const a = this.sys.game.audio, d = a.earDist({ x: it.x, y: 0.2, z: it.z }); a.splat({ x: it.x, y: 0.2, z: it.z }, clamp(0.5 / (1 + d * 0.2), 0.05, 0.5));
  }
  get crawlers() { let n = 0; for (const c of this.cr) if (c.on) n++; return n; }
  // Disparo contra las crías: devuelve la distancia del impacto (o Infinity)
  raySwarm(o, dir, maxT) {
    let best = null, bt = maxT;
    for (const it of this.cr) {
      if (!it.on) continue;
      this.p.set(it.x, it.y + 0.1, it.z); const t = raySphere(o, dir, this.p, 0.24);
      if (t < bt) { bt = t; best = it; }
    }
    if (best) { this.killCrawler(best, dir); return bt; }
    return Infinity;
  }
  knifeSwarm(p, K) { // el tajo barre todas las crías al alcance (también las que se te suben encima)
    let n = 0; const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    for (const it of this.cr) {
      if (!it.on) continue;
      const dx = it.x - p.position.x, dz = it.z - p.position.z, d = Math.hypot(dx, dz);
      if (it.latch === p || (d < K.range + 0.3 && (d < 0.6 || (dx * fx + dz * fz) / d > Math.cos(K.arc + 0.3)))) { this.killCrawler(it); n++; }
    }
    return n;
  }
  updateSwarm(dt) {
    const M = this.crawl, sys = this.sys, w = sys.game.world; let any = false, latched = 0;
    for (let i = 0; i < this.cr.length; i++) {
      const it = this.cr[i];
      if (!it.on) { if (it.was) { M.setMatrixAt(i, sys.m4.makeScale(0, 0, 0)); it.was = false; any = true; } continue; }
      it.was = true; any = true; it.t += dt; it.ph += dt * 22;
      if (it.latch) { // agarrada al jugador: muerde y le roba vida
        const P = it.latch;
        if (!P.alive || !P.active) { it.latch = null; }
        else { it.x = P.position.x + it.ox; it.z = P.position.z + it.oz; it.y = 0.6 + Math.sin(it.ph * 0.3) * 0.15; P.drain(4 * dt); latched++; if (P.slideT >= 0 && Math.random() < dt * 6) { this.killCrawler(it); continue; } } // deslizarte te las quita de encima
      } else {
        const P = sys.nearestPlayer(it.x, it.z);
        if (P) {
          const dx = P.position.x - it.x, dz = P.position.z - it.z, d = Math.hypot(dx, dz), zig = Math.sin(it.ph * 0.25) * 0.9;
          const tx = dx / d - (dz / d) * zig, tz = dz / d + (dx / d) * zig, l = Math.hypot(tx, tz);
          it.vx = damp(it.vx, (tx / l) * it.spd, 6, dt); it.vz = damp(it.vz, (tz / l) * it.spd, 6, dt);
          if (d < 0.55) { it.latch = P; const a = rand(0, TAU); it.ox = Math.sin(a) * 0.22; it.oz = Math.cos(a) * 0.22; sys.game.audio.hurt(); P.rig.shake(0.02, 0.1); }
        } else { it.vx *= Math.exp(-3 * dt); it.vz *= Math.exp(-3 * dt); }
        it.x += it.vx * dt; it.z += it.vz * dt; it.y = Math.max(0, Math.sin(it.ph * 0.5)) * 0.03;
        this.p.set(it.x, 0, it.z); w.resolve(this.p, 0.15); it.x = this.p.x; it.z = this.p.z;
        if (Math.abs(it.vx) + Math.abs(it.vz) > 0.2) it.a = Math.atan2(it.vx, it.vz);
      }
      if (it.t > 16) { this.killCrawler(it); continue; }
      const wob = Math.sin(it.ph) * 0.12;
      this.e.set(it.latch ? -0.9 : 0, it.a, wob); this.q.setFromEuler(this.e);
      M.setMatrixAt(i, this.m.compose(this.p.set(it.x, it.y, it.z), this.q, this.s.set(1.6, 1.6, 1.6))); this.s.set(1, 1, 1);
    }
    if (any) M.instanceMatrix.needsUpdate = true;
    this.latched = latched;
  }
  update(dt) {
    for (const m of this.rings) {
      if (!m.visible) continue; const u = m.userData; u.t += dt / 0.55;
      const e = 1 - (1 - Math.min(1, u.t)) ** 3; m.scale.setScalar(u.R * (0.08 + 0.92 * e)); m.material.opacity = Math.max(0, 1 - u.t) * 0.85;
      if (u.t >= 1) m.visible = false;
    }
    for (const s of this.dust) {
      const u = s.userData; if (!(u.life > 0)) continue; u.life -= dt * 0.85;
      s.position.x += u.vx * dt; s.position.z += u.vz * dt; u.vx *= Math.exp(-3 * dt); u.vz *= Math.exp(-3 * dt); s.position.y += dt * 0.3;
      s.scale.setScalar(u.s * (1.4 - u.life * 0.6)); s.material.opacity = Math.max(0, u.life) * 0.42; if (u.life <= 0) s.visible = false;
    }
    for (const b of this.balls) {
      const u = b.userData; if (!u.on) continue; u.t += dt; u.vy -= 9.8 * dt;
      b.position.x += u.vx * dt; b.position.y += u.vy * dt; b.position.z += u.vz * dt; b.material.rotation += dt * 6;
      if (b.position.y <= 0.08 || u.t > 2.5) { u.on = false; b.visible = false; this.cloud(b.position.x, b.position.z, u.B); }
    }
    let inside = false;
    for (let i = this.clouds.length - 1; i >= 0; i--) {
      const c = this.clouds[i]; c.t += dt; const a = Math.min(1, c.t / 0.6) * Math.min(1, (c.dur - c.t) / 1.5);
      for (const s of c.sp) { s.material.opacity = Math.max(0, a) * 0.55; s.material.rotation += s.userData.v * dt; s.position.y += dt * 0.05; }
      for (const P of this.sys.game.players) if (P.active && P.alive && Math.hypot(P.position.x - c.x, P.position.z - c.z) < c.r && a > 0.3) { inside = true; P.drain(c.dps * dt); }
      if (c.t >= c.dur) { c.sp.forEach((s) => { s.visible = false; }); this.clouds.splice(i, 1); }
    }
    this.spore = damp(this.spore, inside ? 1 : 0, inside ? 2.5 : 1.1, dt);
    this.updateSwarm(dt);
  }
}
