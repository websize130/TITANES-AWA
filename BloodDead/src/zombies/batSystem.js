import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, clamp, damp, rand } from '../core/utils.js';
import { TextureFactory } from '../render/textures.js';
import { raySphere, rayCapsule } from '../weapons/rayHit.js';

/* =====================================================================
   MURCIÉLAGOS ZOMBI GIGANTES (zorro volador infectado, ~3 m de envergadura)
   · SIEMPRE en el aire: entran desde lo alto, giran en círculo sobre su presa, se lanzan en picado a la
     cabeza, golpean y remontan. Solo tocan el suelo al morir (caen girando).
   · Se disparan como cualquier infectado (cabeza ×2, alas cuentan como cuerpo) y se pueden acuchillar
     cuando bajan en picado. El apuntado asistido también los fija.
   · Los controla el director de oleadas: dir.bats = { max, every: [mín, máx] } (desde el nivel 4).
   ===================================================================== */
const HP = 70, DMG = 12, SPAN_IN = 0.78, SPAN_OUT = 0.62;
const _v = new THREE.Vector3(), _w = new THREE.Vector3(), _a = new THREE.Vector3(), _b = new THREE.Vector3();

// Máscara de la membrana: cuero desgarrado con agujeros (alphaTest)
function membraneMask() {
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, S, S); g.fillStyle = '#000';
  let seed = 7; const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 9; i++) { const x = R() * S, y = 30 + R() * (S - 60), r = 4 + R() * 13; g.beginPath(); g.ellipse(x, y, r, r * (0.5 + R()), R() * 3, 0, TAU); g.fill(); }
  for (let i = 0; i < 5; i++) { const x = R() * S; g.beginPath(); g.moveTo(x - 6, S); g.lineTo(x + R() * 14 - 7, S - 22 - R() * 30); g.lineTo(x + 6, S); g.fill(); } // desgarros en el borde
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t;
}
// Membrana en el plano XZ (local del segmento): leading edge en +X, borde de fuga ondulado hacia -Z
function membrane(pts, uvScale = 1) {
  const sh = new THREE.Shape(); sh.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x, z, cx, cz] = pts[i];
    if (cx !== undefined) sh.quadraticCurveTo(cx, -cz, x, -z); else sh.lineTo(x, -z);
  }
  const g = new THREE.ShapeGeometry(sh, 10); g.rotateX(-Math.PI / 2);
  const p = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) / 0.8) * uvScale, 0.5 + p.getZ(i) * 0.9);
  return g;
}

export class BatSystem {
  constructor(sys) {
    this.sys = sys; this.game = sys.game; this.list = []; this.built = false; this.spawnT = 6; this.objs = [];
  }
  get alive() { let n = 0; for (const b of this.list) if (b.alive) n++; return n; }
  build() { // geometría y materiales compartidos (solo si el nivel trae murciélagos)
    if (this.built) return; this.built = true;
    const csm = this.game.lighting.csm, T = TextureFactory.sets, L = T.leather || {};
    const std = (p) => { const m = new THREE.MeshStandardMaterial(p); if (csm) csm.setupMaterial(m); return m; };
    this.mask = membraneMask();
    this.mat = {
      fur: std({ color: 0x3b2b22, roughness: 0.92, normalMap: L.normalMap || null, roughnessMap: L.roughnessMap || null, normalScale: new THREE.Vector2(1.4, 1.4) }),
      skin: std({ color: 0x5a3e34, roughness: 0.55, normalMap: L.normalMap || null }),
      wing: std({ color: 0x3c2722, roughness: 0.58, side: THREE.DoubleSide, alphaMap: this.mask, alphaTest: 0.5, emissive: 0x160404, normalMap: (T.flesh || L).normalMap || null, normalScale: new THREE.Vector2(0.6, 0.6) }),
      bone: std({ color: 0xc9bca2, roughness: 0.5 }),
      eye: new THREE.MeshStandardMaterial({ color: 0x220000, emissive: 0xff5a14, emissiveIntensity: 4.5, roughness: 0.3 }),
    };
    // Cuerpo + cabeza de zorro (hocico largo, orejas puntiagudas, colmillos), patas traseras con garras
    const sph = (r, sx, sy, sz, x, y, z) => new THREE.SphereGeometry(r, 16, 12).scale(sx, sy, sz).translate(x, y, z);
    const cone = (r, h, x, y, z, rx, rz = 0, seg = 8) => new THREE.ConeGeometry(r, h, seg).rotateX(rx).rotateZ(rz).translate(x, y, z);
    const fur = [
      sph(0.2, 1.05, 0.9, 2.0, 0, 0, -0.05), sph(0.17, 1.15, 1.05, 1.0, 0, 0.03, 0.22), // tronco y pecho con gorguera
      sph(0.115, 1.0, 0.95, 1.15, 0, 0.07, 0.42), cone(0.055, 0.17, 0, 0.05, 0.56, Math.PI / 2, 0, 10), // cabeza y hocico de zorro
      cone(0.042, 0.15, 0.065, 0.18, 0.39, -0.35, -0.35), cone(0.042, 0.15, -0.065, 0.18, 0.39, -0.35, 0.35), // orejas
      new THREE.CylinderGeometry(0.03, 0.022, 0.32, 6).rotateX(-0.9).translate(0.07, -0.06, -0.47), new THREE.CylinderGeometry(0.03, 0.022, 0.32, 6).rotateX(-0.9).translate(-0.07, -0.06, -0.47), // patas
    ];
    this.geo = {
      body: mergeGeometries(fur, false),
      skin: mergeGeometries([sph(0.03, 1, 0.8, 1, 0, 0.045, 0.645), sph(0.08, 1.4, 0.35, 1.2, 0, -0.07, 0.05)], false), // trufa y vientre pelado
      bone: mergeGeometries([cone(0.011, 0.06, 0.022, 0.0, 0.6, Math.PI), cone(0.011, 0.06, -0.022, 0.0, 0.6, Math.PI), // colmillos
        ...[0, 1, 2, 3, 4].map((i) => cone(0.016, 0.07, 0, 0.17 - i * 0.004, 0.15 - i * 0.12, -0.2)), // vértebras al aire (infectado)
        ...[1, -1].flatMap((s) => [0, 1, 2].map((k) => cone(0.008, 0.07, s * (0.05 + k * 0.025), -0.22, -0.62, 0.4)))], false), // garras
      eye: mergeGeometries([sph(0.022, 1, 1, 1, 0.045, 0.1, 0.5), sph(0.022, 1, 1, 1, -0.045, 0.1, 0.5)], false),
      // Ala (lado +X; el lado -X es su reflejo): brazo hasta la muñeca y dedos con borde de fuga festoneado
      inner: membrane([[0, 0.12], [SPAN_IN, 0.02], [SPAN_IN, -0.1], [SPAN_IN * 0.55, -0.42, SPAN_IN * 0.8, -0.2], [0, -0.5, SPAN_IN * 0.2, -0.38]], 1),
      outer: membrane([[0, 0.02], [SPAN_OUT, 0.0], [SPAN_OUT * 0.78, -0.3, SPAN_OUT * 0.78, -0.12], [SPAN_OUT * 0.48, -0.48, SPAN_OUT * 0.52, -0.33], [0, -0.1, SPAN_OUT * 0.12, -0.36]], 1),
      arm: new THREE.CylinderGeometry(0.022, 0.018, SPAN_IN, 6).rotateZ(Math.PI / 2).translate(SPAN_IN / 2, 0, 0.02),
      fingers: mergeGeometries([[SPAN_OUT, 0.0], [SPAN_OUT * 0.78, -0.3], [SPAN_OUT * 0.48, -0.48]].map(([x, z]) => {
        const L2 = Math.hypot(x, z), g = new THREE.CylinderGeometry(0.006, 0.013, L2, 5).rotateZ(Math.PI / 2).translate(L2 / 2, 0, 0); g.rotateY(Math.atan2(-z, x)); return g; }), false), // cada dedo sigue su punta, hacia atrás (borde de fuga)
    };
    this.geo.innerR = this.geo.inner.clone().scale(-1, 1, 1); this.geo.outerR = this.geo.outer.clone().scale(-1, 1, 1);
    this.geo.armR = this.geo.arm.clone().scale(-1, 1, 1); this.geo.fingersR = this.geo.fingers.clone().scale(-1, 1, 1);
  }
  make() {
    const G = this.geo, M = this.mat, root = new THREE.Group();
    const add = (geo, mat, parent, shadow = true) => { const m = new THREE.Mesh(geo, mat); m.castShadow = shadow; m.receiveShadow = true; m.layers.set(1); parent.add(m); return m; };
    const mesh = add(G.body, M.fur, root); add(G.skin, M.skin, root); add(G.bone, M.bone, root, false); add(G.eye, M.eye, root, false);
    const wing = (s) => {
      const sh = new THREE.Group(); sh.position.set(s * 0.15, 0.06, 0.16); root.add(sh);
      add(s > 0 ? G.inner : G.innerR, M.wing, sh); add(s > 0 ? G.arm : G.armR, M.fur, sh);
      const wr = new THREE.Group(); wr.position.set(s * SPAN_IN, 0, 0.02); sh.add(wr);
      add(s > 0 ? G.outer : G.outerR, M.wing, wr); add(s > 0 ? G.fingers : G.fingersR, M.bone, wr, false);
      return { sh, wr, s };
    };
    root.scale.setScalar(1.25); // gigante: ~3,7 m de punta a punta
    this.game.scene.add(root); this.objs.push(root);
    const b = {
      root, mesh, wings: [wing(1), wing(-1)], pos: root.position, vel: new THREE.Vector3(), alive: false, active: false,
      // interfaz compatible con el apuntado asistido (CameraRig.pickTarget)
      T: { boss: false }, V: { scale: 1 }, type: 'bat', state: 'off', bodyA: new THREE.Vector3(), bodyB: new THREE.Vector3(), headC: new THREE.Vector3(),
      tipL: new THREE.Vector3(), tipR: new THREE.Vector3(), zones() {},
    };
    this.list.push(b); return b;
  }
  get dir() { return this.sys.dir.bats || null; }
  update(dt) {
    const D = this.dir;
    if (D && D.max > 0 && this.sys.anyAlive()) {
      this.spawnT -= dt;
      const cap = D.max; // el modo ya ajusta la cantidad en dúo
      if (this.spawnT <= 0) { this.spawnT = rand(...D.every); if (this.alive < cap) this.spawn(); }
    }
    for (const b of this.list) if (b.active) this.step(b, dt);
  }
  spawn() {
    this.build();
    const P = this.sys.nearestPlayer(0, 0) || this.game.player; if (!P) return null;
    const b = this.list.find((q) => !q.active) || this.make(), m = this.sys.dir.mult || {};
    const a = rand(0, TAU), d = rand(26, 34);
    b.pos.set(P.position.x + Math.cos(a) * d, rand(9, 13), P.position.z + Math.sin(a) * d);
    b.vel.set(-Math.cos(a), 0, -Math.sin(a)).multiplyScalar(6);
    b.alive = b.active = true; b.root.visible = true; b.root.rotation.set(0, 0, 0); b.root.scale.setScalar(1.25);
    b.hp = b.maxHp = HP * (m.hp || 1) * (this.game.activePlayers.length > 1 ? 1.2 : 1); b.mDmg = m.dmg || 1; b.mSpd = Math.min(1.35, m.spd || 1);
    b.tgt = P; b.state = 'enter'; b.t = 0; b.ph = rand(0, TAU); b.orbit = Math.random() < 0.5 ? 1 : -1; b.orbitA = a + Math.PI; b.orbitR = rand(6.5, 9.5);
    b.alt = rand(4.6, 6.8); b.diveCD = rand(2.5, 4.5); b.flapT = 0; b.deadT = 0; b.hitK = 0; b.screamT = rand(2, 5); b.bank = 0;
    this.screech(b, 0.8);
    this.game.events.emit('bat:spawn', { b });
    return b;
  }
  retreat() { for (const b of this.list) if (b.alive) { b.state = 'retreat'; b.t = 0; } }
  // Vuelo: dirección deseada → velocidad suavizada; nunca por debajo de 1,2 m salvo al morir
  steer(b, tx, ty, tz, speed, k, dt) {
    _v.set(tx - b.pos.x, ty - b.pos.y, tz - b.pos.z); const L = _v.length() || 1; _v.multiplyScalar(speed / L);
    b.vel.x = damp(b.vel.x, _v.x, k, dt); b.vel.y = damp(b.vel.y, _v.y, k, dt); b.vel.z = damp(b.vel.z, _v.z, k, dt);
  }
  step(b, dt) {
    if (!b.alive) return this.fall(b, dt);
    const P = (b.tgt && b.tgt.active && b.tgt.alive) ? b.tgt : (b.tgt = this.sys.nearestPlayer(b.pos.x, b.pos.z));
    b.t += dt; b.diveCD -= dt; b.hitK = Math.max(0, b.hitK - dt * 4); b.screamT -= dt;
    const W = this.game.world, spd = b.mSpd;
    let flap = 1;
    if (!P) b.state = 'retreat';
    switch (b.state) {
      case 'enter': case 'circle': {
        b.orbitA += b.orbit * dt * (0.55 + 0.1 * spd) * (8 / b.orbitR);
        const tx = P.position.x + Math.cos(b.orbitA) * b.orbitR, tz = P.position.z + Math.sin(b.orbitA) * b.orbitR, ty = b.alt + Math.sin(b.t * 1.3 + b.ph) * 0.6;
        this.steer(b, tx, ty, tz, (b.state === 'enter' ? 9 : 6.5) * spd, 2.2, dt); flap = 0.75;
        if (b.state === 'enter' && Math.hypot(b.pos.x - P.position.x, b.pos.z - P.position.z) < b.orbitR + 3) b.state = 'circle';
        if (b.state === 'circle' && b.diveCD <= 0) { // picado si ve al jugador (sin muros entre medias)
          _w.set(P.position.x, 1.45, P.position.z).sub(b.pos); const L = _w.length(); _w.divideScalar(L);
          if (W.raycast(b.pos, _w, L - 0.6) === Infinity) { b.state = 'dive'; b.t = 0; this.screech(b, 1); } else b.diveCD = 0.8;
        }
        if (b.screamT <= 0) { b.screamT = rand(4, 8); this.screech(b, 0.55); }
        break;
      }
      case 'dive': { // en picado hacia la cabeza (con algo de anticipación)
        const lead = 0.25, tx = P.position.x + P.velocity.x * lead, tz = P.position.z + P.velocity.z * lead;
        this.steer(b, tx, 1.45, tz, 11 * spd, 3.4, dt); flap = 0.25;
        const d = Math.hypot(b.pos.x - P.position.x, b.pos.y - 1.45, b.pos.z - P.position.z);
        if (d < 0.95) { this.strike(b, P); break; }
        if (b.t > 2.6 || (b.t > 0.3 && W.raycast(b.pos, _w.copy(b.vel).normalize(), 1.2) !== Infinity)) { b.state = 'climb'; b.t = 0; }
        break;
      }
      case 'climb': { // remonta lejos de la presa
        _w.set(b.pos.x - P.position.x, 0, b.pos.z - P.position.z).normalize();
        this.steer(b, b.pos.x + _w.x * 6, b.alt + 1.5, b.pos.z + _w.z * 6, 8 * spd, 3, dt); flap = 1.25;
        if (b.t > 1.2) { b.state = 'circle'; b.diveCD = rand(2.2, 4.2) / Math.max(1, spd); b.orbitA = Math.atan2(b.pos.z - P.position.z, b.pos.x - P.position.x); }
        break;
      }
      case 'retreat': {
        this.steer(b, b.pos.x * 2.2 + 1, 26, b.pos.z * 2.2 + 1, 10, 1.5, dt); flap = 1.2;
        if (b.t > 6) { b.alive = b.active = false; b.root.visible = false; }
        break;
      }
    }
    // Esquiva de obstáculos: si el vuelo apunta a un muro cercano, sube
    if (b.state !== 'dive' && W.raycast(b.pos, _w.copy(b.vel).normalize(), 2.5) !== Infinity) b.vel.y = damp(b.vel.y, 5, 6, dt);
    b.pos.addScaledVector(b.vel, dt);
    b.pos.y = Math.max(b.pos.y, b.state === 'dive' ? 1.2 : 2.2); // siempre en el aire
    this.pose(b, dt, flap);
  }
  pose(b, dt, flap) {
    const sp = Math.hypot(b.vel.x, b.vel.z), yaw = Math.atan2(b.vel.x, b.vel.z);
    const turn = THREE.MathUtils.euclideanModulo(yaw - b.root.rotation.y + Math.PI, TAU) - Math.PI;
    b.bank = damp(b.bank, clamp(-turn * 3, -0.7, 0.7), 4, dt);
    b.root.rotation.set(clamp(-b.vel.y * 0.09, -0.8, 0.6), b.root.rotation.y + turn * Math.min(1, dt * 6), b.bank, 'YXZ');
    // Aleteo: batida amplia al remontar, alas plegadas en picado, planeo con batidas sueltas en círculo
    b.ph += dt * (6.5 + flap * 3.5);
    const amp = 0.25 + 0.75 * clamp(flap, 0, 1.3), up = Math.sin(b.ph), fold = Math.sin(b.ph - 0.9);
    for (const w of b.wings) {
      w.sh.rotation.set(0, w.s * (0.12 - 0.18 * (1 - flap)), w.s * (up * amp * 0.85 + 0.12));
      w.wr.rotation.set(0, w.s * (0.1 + 0.25 * Math.max(0, -fold) * amp), w.s * (fold * amp * 0.55 - 0.25 - (flap < 0.4 ? 0.5 : 0)));
    }
    // Sonido de las alas (golpe sordo de cuero) si está cerca
    b.flapT -= dt;
    if (b.flapT <= 0) { b.flapT = TAU / (6.5 + flap * 3.5); const a = this.game.audio, d = a.ctx ? a.earDist(b.pos) : 99; if (d < 16) a.wingFlap(b.pos, clamp(1.1 / (1 + d * 0.25), 0.05, 0.6)); }
    // Zonas de impacto (mundo)
    b.root.updateMatrixWorld(true);
    b.headC.set(0, 0.08, 0.44).applyMatrix4(b.root.matrixWorld);
    b.bodyA.set(0, 0, -0.38).applyMatrix4(b.root.matrixWorld); b.bodyB.set(0, 0.02, 0.24).applyMatrix4(b.root.matrixWorld);
    b.tipL.set(SPAN_OUT * 0.7, 0, -0.1).applyMatrix4(b.wings[0].wr.matrixWorld); b.tipR.set(-SPAN_OUT * 0.7, 0, -0.1).applyMatrix4(b.wings[1].wr.matrixWorld);
  }
  strike(b, P) {
    const got = P.takeDamage(DMG * b.mDmg, b);
    if (got > 0) {
      const d = _w.set(P.position.x - b.pos.x, 0, P.position.z - b.pos.z).normalize();
      P.shove(d.x * 4, d.z * 4); P.rig.shake(0.045, 0.25); this.game.pads.rumble(P, 0.7, 0.5, 160);
      this.sys.gore.spray(_v.set(P.position.x, 1.45, P.position.z), d, 12, 0.8);
      this.game.audio.hurt();
    }
    this.screech(b, 1); b.state = 'climb'; b.t = 0;
  }
  screech(b, k) { const a = this.game.audio; if (!a.ctx) return; const d = a.earDist(b.pos); a.zscreech({ x: b.pos.x, y: b.pos.y, z: b.pos.z }, clamp(1.4 * k / (1 + d * 0.12), 0.04, 1), 1.55); }
  // Muerto: cae girando, golpea el suelo con las alas extendidas y se desvanece
  fall(b, dt) {
    b.deadT += dt;
    if (b.pos.y > 0.22) {
      b.vel.y -= 14 * dt; b.vel.x *= Math.exp(-dt); b.vel.z *= Math.exp(-dt);
      b.pos.addScaledVector(b.vel, dt); b.root.rotation.z += dt * 6; b.root.rotation.x = damp(b.root.rotation.x, 1.2, 3, dt);
      for (const w of b.wings) { w.sh.rotation.z = damp(w.sh.rotation.z, w.s * 0.9, 5, dt); w.wr.rotation.z = damp(w.wr.rotation.z, w.s * -0.4, 5, dt); }
      if (b.pos.y <= 0.22) {
        b.pos.y = 0.18; b.root.rotation.set(0, b.root.rotation.y, 0); b.landT = b.deadT;
        for (const w of b.wings) { w.sh.rotation.set(0, 0, w.s * -0.05); w.wr.rotation.set(0, 0, w.s * 0.02); }
        this.sys.gore.splat(b.pos.x, b.pos.z, rand(0.5, 0.8)); const a = this.game.audio; if (a.ctx) a.thud(b.pos, clamp(1 / (1 + a.earDist(b.pos) * 0.2), 0.05, 0.6));
      }
    } else if (b.deadT - b.landT > 5) { // se desvanece hundiéndose
      b.pos.y -= dt * 0.3;
      if (b.pos.y < -0.4) { b.active = false; b.root.visible = false; }
    }
  }
  // Disparo: devuelve { b, t, zone } del murciélago más cercano en la línea de tiro
  ray(o, dir, maxT, assist = 1) {
    let best = null;
    for (const b of this.list) {
      if (!b.alive) continue;
      const ex = b.pos.x - o.x, ey = b.pos.y - o.y, ez = b.pos.z - o.z, along = ex * dir.x + ey * dir.y + ez * dir.z;
      if (along < -2.5 || along > maxT + 2.5) continue;
      const th = raySphere(o, dir, b.headC, 0.2 * assist), tb = rayCapsule(o, dir, b.bodyA, b.bodyB, 0.3 * assist);
      const tw = Math.min(rayCapsule(o, dir, b.bodyB, b.tipL, 0.16 * assist), rayCapsule(o, dir, b.bodyB, b.tipR, 0.16 * assist));
      let t = Infinity, zone = null;
      if (th < Infinity && th <= tb + 0.1) { t = th; zone = 'head'; } else if (tb < Infinity) { t = tb; zone = 'body'; } else if (tw < Infinity) { t = tw; zone = 'wing'; }
      if (t < maxT && (!best || t < best.t)) best = { b, t, zone };
    }
    return best;
  }
  hit(b, amount, point, dir, by = null, zone = 'body', crit = false) {
    if (!b.alive) return { killed: false };
    const mult = zone === 'head' ? 2 : zone === 'wing' ? 0.7 : 1;
    b.hp -= amount * mult; b.hitK = 1;
    b.vel.addScaledVector(dir, 2.5);
    this.sys.gore.spray(point, dir, zone === 'head' ? 14 : 9, 0.7, 0.4);
    const a = this.game.audio; a.flesh(zone === 'head', crit);
    const killed = b.hp <= 0;
    if (by) a.hitTick(killed ? 'kill' : zone === 'head' ? 'head' : 'body');
    this.game.events.emit('zombie:hit', { z: null, point, by, zone: zone === 'wing' ? 'body' : zone, killed, crit, amount: amount * mult, bat: b });
    if (killed) this.kill(b, zone === 'head', by, dir);
    else if (b.state === 'dive' && Math.random() < 0.35) { b.state = 'climb'; b.t = 0; this.screech(b, 0.9); } // aborta el picado
    return { killed };
  }
  kill(b, head, by, dir) {
    const S = this.sys; b.alive = false; b.deadT = 0; b.landT = 0; b.vel.addScaledVector(dir || _v.set(0, 0, 0), 2); b.vel.y = Math.min(b.vel.y, 1.5);
    S.kills++; if (by) by.kills = (by.kills || 0) + 1;
    const a = this.game.audio; if (a.ctx) a.zvoice('death', { x: b.pos.x, y: b.pos.y, z: b.pos.z }, clamp(1.2 / (1 + a.earDist(b.pos) * 0.15), 0.05, 1), 1.7, a.earDist(b.pos));
    this.game.events.emit('zombie:killed', { type: 'bat', headshot: head, kills: S.kills, z: null, boss: false, by });
    const x = b.pos.x, z = b.pos.z; S.drops.push({ t: 1.2, fn: () => S.spawnCoins(x, z, Math.round(rand(6, 12))) });
  }
  // Cuchillo: solo alcanza al murciélago que baja en picado y está delante (o encima) del jugador
  knife(p, K) {
    let n = 0; const fx = Math.sin(p.facing), fz = Math.cos(p.facing);
    for (const b of this.list) {
      if (!b.alive || b.pos.y > 2.6) continue;
      const dx = b.pos.x - p.position.x, dz = b.pos.z - p.position.z, d = Math.hypot(dx, dz);
      if (d > K.range + 0.6 || (d > 0.6 && (dx * fx + dz * fz) / d < Math.cos(K.arc + 0.25))) continue;
      const dmg = p.rollDamage(K.damage); this.hit(b, dmg.amount * 1.3, _a.copy(b.bodyB), _b.set(fx, 0, fz), p, 'body', dmg.crit); n++;
    }
    return n;
  }
  dispose() {
    for (const o of this.objs) o.removeFromParent();
    if (this.built) { for (const g of Object.values(this.geo)) g.dispose(); for (const m of Object.values(this.mat)) m.dispose(); this.mask.dispose(); }
    this.list = []; this.objs = [];
  }
}
