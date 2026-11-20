import * as THREE from 'three';
import { TAU, clamp, rand } from '../core/utils.js';
import { QUALITY } from '../data/config.js';
import { Noise, TextureFactory } from '../render/textures.js';
import { ZombieFactory, vnoise3 } from '../zombies/zombieFactory.js';
import { rayCapsule } from '../weapons/rayHit.js';

/* Gore: sangre abundante (gotas finas y goterones), manchas en suelo y paredes, heridas abiertas
   pegadas a los huesos, trozos de tejido con física y CADÁVERES PERSISTENTES: al quedarse quietos
   se hornea su pose (skinning por CPU) en un único lote estático → decenas de cuerpos en 1 draw call. */
export const _gv = new THREE.Vector3(), _gw = new THREE.Vector3(), _gn = new THREE.Vector3(), _gx = new THREE.Vector3(), _gs = new THREE.Vector3();
export const _gq = new THREE.Quaternion(), _gq2 = new THREE.Quaternion(), _gm = new THREE.Matrix4(), _ge = new THREE.Euler();
export const _ta = [0, 0, 0], _tb = [0, 0, 0], _tc = [0, 0, 0];
export const GORE_Z = new THREE.Vector3(0, 0, 1), GORE_UP = new THREE.Vector3(0, 1, 0);
export const GORE_BONES = { head: ['head'], body: ['chest', 'belly', 'hips', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR'], legs: ['thighL', 'kneeL', 'thighR', 'kneeR', 'hips'] };
export const GIB_COLORS = { metal: [[0.09, 0.1, 0.12], [0.16, 0.17, 0.2], [0.05, 0.05, 0.06]], flesh: [[0.42, 0.05, 0.04], [0.55, 0.13, 0.1], [0.3, 0.02, 0.02]], bone: [[0.8, 0.74, 0.62], [0.68, 0.62, 0.52]], brain: [[0.62, 0.38, 0.38], [0.55, 0.3, 0.32]], organ: [[0.22, 0.03, 0.03], [0.34, 0.07, 0.09]] };

export class GoreSystem {
  constructor(sys) {
    this.sys = sys; this.game = sys.game;
    const Q = (this.Q = sys.game.quality.gore || QUALITY.medio.gore), csm = sys.game.lighting.csm, T = TextureFactory;
    this.zero = new THREE.Matrix4().makeScale(0, 0, 0); this.col = new THREE.Color(); this.fountains = []; this.dropBudget = 0; this.wi = 0; this.gibI = 0;
    // Partículas: gotas finas + goterones (dos tamaños dan cuerpo a la salpicadura)
    const pts = (n, size, color, op) => {
      const p = new Float32Array(n * 3).fill(-999), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(p, 3));
      const o = sys.track(new THREE.Points(g, new THREE.PointsMaterial({ map: T.dot, color, size, transparent: true, opacity: op, depthWrite: false }))); o.frustumCulled = false;
      return { o, p, v: new Float32Array(n * 3), life: new Float32Array(n), n, i: 0 };
    };
    this.fine = pts(Math.round(Q.blood * 0.68), 0.03, 0x5e0907, 0.95);
    this.gob = pts(Math.round(Q.blood * 0.32), 0.075, 0x470605, 0.98);
    // Manchas instanciadas: salpicaduras, gotas, charcos y paredes
    const dmat = (map, off, rough = 0.22) => { const m = new THREE.MeshStandardMaterial({ map, transparent: true, depthWrite: false, roughness: rough, metalness: 0, polygonOffset: true, polygonOffsetFactor: off, polygonOffsetUnits: off }); if (csm) csm.setupMaterial(m); return m; };
    const inst = (geo, mat, n) => { const o = sys.track(new THREE.InstancedMesh(geo, mat, n)); o.frustumCulled = false; o.receiveShadow = true; for (let i = 0; i < n; i++) o.setMatrixAt(i, this.zero); o.i = 0; o.n = n; return o; };
    const flat = () => new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
    this.splats = inst(flat(), dmat(T.bloodSplat, -3), Q.splat);
    this.dropsM = inst(flat(), dmat(T.bloodDrops, -4), Q.drops);
    this.pools = inst(flat(), dmat(T.bloodPool, -2, 0.12), Q.corpses);
    this.walls = inst(new THREE.PlaneGeometry(1, 1), dmat(T.bloodWall, -3), Q.wall);
    this.poolL = Array.from({ length: Q.corpses }, () => ({ on: false, x: 0, z: 0, r: 0, t: 0, dur: 1, a: 0 }));
    // Heridas abiertas: siguen al hueso mientras el cuerpo se mueve y se quedan en el cadáver
    const wm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0, envMapIntensity: 1.3 }); if (csm) csm.setupMaterial(wm);
    this.wounds = inst(GoreSystem.woundGeo(), wm, Q.wounds);
    this.wl = Array.from({ length: Q.wounds }, () => ({ on: false, z: null, bone: null, local: new THREE.Matrix4(), corpse: -1, drip: 0 }));
    // Trozos de tejido, hueso y vísceras con física
    const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.36, metalness: 0, envMapIntensity: 1.1 }); if (csm) csm.setupMaterial(gm);
    this.gibs = inst(GoreSystem.gibGeo(), gm, Q.gibs);
    for (let i = 0; i < Q.gibs; i++) this.gibs.setColorAt(i, this.col.setRGB(1, 1, 1));
    this.gl = Array.from({ length: Q.gibs }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, s: 0.04, rest: true, t: 0, hit: false }));
    this.mists = Array.from({ length: 10 }, () => { const s = sys.track(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.cloud, color: 0x6a0d0a, transparent: true, opacity: 0, depthWrite: false }))); s.userData.life = 0; return s; });
    this.mists.i = 0;
    this.initCorpses(Q.corpses);
  }

  /* ---------- Geometría compartida ---------- */
  static woundGeo() { // cráter de carne: centro oscuro, carne viva, grasa, borde desgarrado y jirones
    if (GoreSystem._wg) return GoreSystem._wg;
    const seg = 16, rings = 5, pos = [], col = [], idx = [];
    const RR = [0, 0.3, 0.55, 0.78, 0.95, 1.12], RZ = [0.02, 0.035, 0.08, 0.15, 0.17, 0.0];
    const RC = [[0.05, 0.004, 0.004], [0.14, 0.008, 0.008], [0.36, 0.02, 0.018], [0.52, 0.09, 0.075], [0.46, 0.16, 0.13], [0.16, 0.035, 0.028]];
    pos.push(0, 0, RZ[0]); col.push(...RC[0]);
    for (let r = 1; r <= rings; r++) for (let s = 0; s < seg; s++) {
      const a = (s / seg) * TAU, j = 1 + (Noise.hash(s, r, 5) - 0.5) * (r >= 4 ? 0.55 : 0.25), rr = RR[r] * j;
      pos.push(Math.cos(a) * rr, Math.sin(a) * rr, RZ[r] * (0.7 + 0.6 * Noise.hash(s, r, 9)));
      col.push(...(r === 2 && Noise.hash(s, 3, 11) > 0.72 ? [0.62, 0.48, 0.28] : RC[r])); // grasa amarillenta
    }
    for (let s = 0; s < seg; s++) idx.push(0, 1 + s, 1 + ((s + 1) % seg));
    for (let r = 1; r < rings; r++) for (let s = 0; s < seg; s++) { const a = 1 + (r - 1) * seg + s, b = 1 + (r - 1) * seg + ((s + 1) % seg); idx.push(a, a + seg, b, b, a + seg, b + seg); }
    for (let k = 0; k < 5; k++) { // jirones de tejido dentro del cráter
      const a = Noise.hash(k, 1, 21) * TAU, d = 0.12 + 0.3 * Noise.hash(k, 2, 21), cx = Math.cos(a) * d, cy = Math.sin(a) * d, rl = 0.09 + 0.07 * Noise.hash(k, 3, 21), base = pos.length / 3;
      const c = k % 2 ? [0.5, 0.06, 0.05] : [0.24, 0.015, 0.015];
      pos.push(cx, cy, 0.07 + 0.08 * Noise.hash(k, 4, 21)); col.push(...c);
      for (let s = 0; s < 6; s++) { const b = (s / 6) * TAU; pos.push(cx + Math.cos(b) * rl, cy + Math.sin(b) * rl, 0.04); col.push(...c); }
      for (let s = 0; s < 6; s++) idx.push(base, base + 1 + s, base + 1 + ((s + 1) % 6));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals();
    return (GoreSystem._wg = g);
  }
  static gibGeo() { // trozo irregular (el color lo pone cada instancia: carne, hueso, sesos o víscera)
    const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 0.72 + 0.5 * vnoise3(x * 2.3 + 5, y * 2.3, z * 2.3, 3), s = 0.75 + 0.45 * vnoise3(x * 4, y * 4, z * 4, 7);
      p.setXYZ(i, x * k, y * k * 0.7, z * k); col[i * 3] = col[i * 3 + 1] = col[i * 3 + 2] = s;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.computeVertexNormals(); return g;
  }

  /* ---------- Partículas y manchas ---------- */
  emit(P, x, y, z, vx, vy, vz, life) { P.until = Math.max(P.until || 0, (this.clock || 0) + life + 0.4); const i = P.i; P.i = (i + 1) % P.n; P.p[i * 3] = x; P.p[i * 3 + 1] = y; P.p[i * 3 + 2] = z; P.v[i * 3] = vx; P.v[i * 3 + 1] = vy; P.v[i * 3 + 2] = vz; P.life[i] = life; }
  spray(p, dir, n, power = 1, back = 0.3, up = false) {
    for (let k = 0; k < n; k++) {
      const big = Math.random() < 0.3, P = big ? this.gob : this.fine, sp = rand(0.8, 2.6) * power * (big ? 0.75 : 1), bk = Math.random() < back ? -0.55 : 1;
      let vx, vy, vz;
      if (up) { vx = rand(-1, 1) * sp * 0.6 + dir.x * sp * 0.4; vy = rand(1.6, 4.2) * power; vz = rand(-1, 1) * sp * 0.6 + dir.z * sp * 0.4; }
      else { vx = dir.x * bk * sp + rand(-0.9, 0.9); vy = dir.y * sp * 0.5 + rand(0.1, 1.9) * power; vz = dir.z * bk * sp + rand(-0.9, 0.9); }
      this.emit(P, p.x + rand(-0.03, 0.03), p.y + rand(-0.03, 0.03), p.z + rand(-0.03, 0.03), vx, vy, vz, rand(0.6, 1.3));
    }
  }
  put(M, x, y, z, ang, sx, sz) {
    const i = M.i; M.i = (i + 1) % M.n; _ge.set(0, ang, 0); _gq.setFromEuler(_ge);
    M.setMatrixAt(i, _gm.compose(_gv.set(x, y + (i % 17) * 0.00025, z), _gq, _gs.set(sx, 1, sz))); M.instanceMatrix.needsUpdate = true; return i;
  }
  splat(x, z, s, ang = rand(0, TAU)) { this.put(this.splats, x, 0.013, z, ang, s * 1.35, s); }
  drop(x, z, s) { this.put(this.dropsM, x, 0.016, z, rand(0, TAU), s, s); }
  // Chorro que sigue la trayectoria del impacto: si hay una pared cerca, la mancha (con chorretones que bajan)
  wallHit(p, dir, maxD, size) {
    const w = this.game.world, hd = _gw.set(dir.x, dir.y * 0.3 - 0.06, dir.z).normalize(), t = w.raycast(p, hd, maxD);
    if (t === Infinity || !w.hitBox || !w.hitBox.flat || w.hitAxis === 1) return false;
    const n = w.hitN, hx = p.x + hd.x * t, hy = p.y + hd.y * t, hz = p.z + hd.z * t;
    if (hy < 0.08 || hy > 3.2) return false;
    _gm.makeBasis(_gx.set(n.z, 0, -n.x), GORE_UP, n); _gm.scale(_gs.set(size, size * 1.25, 1)); _gm.setPosition(hx + n.x * 0.012, hy - size * 0.15, hz + n.z * 0.012);
    const i = this.walls.i; this.walls.i = (i + 1) % this.walls.n; this.walls.setMatrixAt(i, _gm); this.walls.instanceMatrix.needsUpdate = true;
    return true;
  }
  mist(p, s = 1) { const m = this.mists[this.mists.i]; this.mists.i = (this.mists.i + 1) % this.mists.length; m.position.copy(p); m.userData.life = 1; m.userData.s = s; m.material.rotation = rand(0, TAU); }
  pool(slot, x, z, r) { Object.assign(this.poolL[slot], { on: true, x, z, r, t: 0, dur: rand(5, 9), a: rand(0, TAU) }); }

  /* ---------- Heridas ---------- */
  // Superficie exacta de la malla a lo largo de un rayo: esfera envolvente por hueso → vértices transformados una vez → Möller–Trumbore
  surface(z, o, d, bones, maxT = 6) {
    const VD = z.VD, P = VD.geo.attributes.position.array, I = VD.geo.index.array, names = ZombieFactory.BONES;
    if (!GoreSystem._scr || GoreSystem._scr.length < P.length) GoreSystem._scr = new Float32Array(P.length);
    const S = GoreSystem._scr; let best = maxT, bone = null, nx = 0, ny = 0, nz = 0;
    z.mesh.updateMatrixWorld(true);
    for (const bn of bones) {
      const bi = names.indexOf(bn), sp = VD.bsph[bi]; if (!sp) continue;
      const e = z.b[bn].matrixWorld.elements, sc = Math.sqrt(e[0] * e[0] + e[1] * e[1] + e[2] * e[2]), R = sp[3] * sc;
      const ox = o.x - (e[0] * sp[0] + e[4] * sp[1] + e[8] * sp[2] + e[12]), oy = o.y - (e[1] * sp[0] + e[5] * sp[1] + e[9] * sp[2] + e[13]), oz = o.z - (e[2] * sp[0] + e[6] * sp[1] + e[10] * sp[2] + e[14]);
      const bq = ox * d.x + oy * d.y + oz * d.z, cq = ox * ox + oy * oy + oz * oz - R * R, hq = bq * bq - cq;
      if (hq < 0 || (cq > 0 && bq > 0) || -bq - Math.sqrt(hq) > best) continue; // el rayo no toca esta parte
      const ow = VD.world[bn], vs = VD.bverts[bi], list = VD.btris[bi];
      for (let q = 0; q < vs.length; q++) { const k = vs[q] * 3, x = P[k] - ow[0], y = P[k + 1] - ow[1], w = P[k + 2] - ow[2]; S[k] = e[0] * x + e[4] * y + e[8] * w + e[12]; S[k + 1] = e[1] * x + e[5] * y + e[9] * w + e[13]; S[k + 2] = e[2] * x + e[6] * y + e[10] * w + e[14]; }
      for (let q = 0; q < list.length; q++) {
        const t3 = list[q], a = I[t3] * 3, b = I[t3 + 1] * 3, c = I[t3 + 2] * 3, ax = S[a], ay = S[a + 1], az = S[a + 2];
        const e1x = S[b] - ax, e1y = S[b + 1] - ay, e1z = S[b + 2] - az, e2x = S[c] - ax, e2y = S[c + 1] - ay, e2z = S[c + 2] - az;
        const px = d.y * e2z - d.z * e2y, py = d.z * e2x - d.x * e2z, pz = d.x * e2y - d.y * e2x, det = e1x * px + e1y * py + e1z * pz;
        if (det > -1e-12 && det < 1e-12) continue;
        const inv = 1 / det, tx = o.x - ax, ty = o.y - ay, tz = o.z - az, u = (tx * px + ty * py + tz * pz) * inv; if (u < 0 || u > 1) continue;
        const qx = ty * e1z - tz * e1y, qy = tz * e1x - tx * e1z, qz = tx * e1y - ty * e1x, v = (d.x * qx + d.y * qy + d.z * qz) * inv; if (v < 0 || u + v > 1) continue;
        const t = (e2x * qx + e2y * qy + e2z * qz) * inv;
        if (t > 1e-4 && t < best) { best = t; bone = bn; nx = e1y * e2z - e1z * e2y; ny = e1z * e2x - e1x * e2z; nz = e1x * e2y - e1y * e2x; }
      }
    }
    if (!bone) return null;
    const l = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1, s = nx * d.x + ny * d.y + nz * d.z > 0 ? -1 / l : 1 / l;
    return { t: best, bone, point: new THREE.Vector3(o.x + d.x * best, o.y + d.y * best, o.z + d.z * best), normal: new THREE.Vector3(nx * s, ny * s, nz * s) };
  }
  zoneCenter(z, zone, near) {
    if (zone === 'head') return z.headC.clone();
    const seg = (a, b) => { const ab = _gw.subVectors(b, a), t = clamp(_gx.subVectors(near, a).dot(ab) / Math.max(ab.lengthSq(), 1e-6), 0, 1); return a.clone().addScaledVector(ab, t); };
    if (zone === 'legs') { const l = seg(z.legLA, z.legLB), r = seg(z.legRA, z.legRB); return l.distanceTo(near) < r.distanceTo(near) ? l : r; }
    return seg(z.bodyA, z.bodyB);
  }
  // Busca dónde abrir la herida: el rayo real; si roza solo la caja ampliada, se apunta al centro de la zona
  woundAt(z, o, d, zone, opt, near) {
    const bones = GORE_BONES[zone] || GORE_BONES.body;
    let h = this.surface(z, o, d, bones);
    if (!h) { const c = this.zoneCenter(z, zone, near), dd = c.clone().sub(near); if (dd.lengthSq() > 1e-6) { dd.normalize(); h = this.surface(z, c.clone().addScaledVector(dd, -1.2), dd, bones, 2.4); } }
    if (!h) { const c = this.zoneCenter(z, zone, near); h = this.surface(z, c.clone().addScaledVector(d, -1.2), d, bones, 2.4); }
    if (!h) return null;
    const r = opt.melee ? rand(0.022, 0.03) : opt.heavy ? rand(0.042, 0.068) : rand(0.02, 0.03);
    this.addWound(z, h.bone, h.point, h.normal, r * (z.type === 'bloater' ? 1.3 : 1), opt.melee ? opt.slash : null, opt.melee ? rand(3.6, 4.6) : 1);
    return h;
  }
  addWound(z, bn, p, n, r, slash = null, sx = 1) {
    const W = this.wl, L = W.length; let k = -1;
    for (let i = 0; i < L; i++) { const j = (this.wi + i) % L; if (!W[j].on) { k = j; break; } }
    if (k < 0) k = this.wi;
    this.wi = (k + 1) % L; this.dropWound(k);
    const w = W[k], bone = z.b[bn]; bone.updateWorldMatrix(true, false);
    const inv = _gm.copy(bone.matrixWorld).invert(), e = bone.matrixWorld.elements, ws = Math.hypot(e[0], e[1], e[2]) || 1;
    const lp = _gv.copy(p).applyMatrix4(inv), ln = _gn.copy(n).transformDirection(inv);
    _gq.setFromUnitVectors(GORE_Z, ln);
    let roll = rand(0, TAU);
    if (slash) { // el tajo queda alineado con el barrido del cuchillo
      const ls = _gw.copy(slash).transformDirection(inv); ls.addScaledVector(ln, -ls.dot(ln));
      if (ls.lengthSq() > 1e-6) { ls.normalize(); const xa = _gx.set(1, 0, 0).applyQuaternion(_gq); roll = Math.atan2(_gs.copy(xa).cross(ls).dot(ln), xa.dot(ls)); }
    }
    _gq2.setFromAxisAngle(ln, roll); _gq.premultiply(_gq2);
    const rs = r / ws; w.local.compose(lp, _gq, _gs.set(rs * sx, rs, rs * 0.9));
    w.on = true; w.z = z; w.bone = bone; w.corpse = -1; w.drip = rand(0.1, 0.4); z.wounds.push(k);
    _gm.multiplyMatrices(bone.matrixWorld, w.local); this.wounds.setMatrixAt(k, _gm); this.wounds.instanceMatrix.needsUpdate = true;
  }
  dropWound(k) {
    const w = this.wl[k]; if (!w.on) return;
    if (w.z) { const a = w.z.wounds, i = a.indexOf(k); if (i >= 0) a.splice(i, 1); }
    w.on = false; w.z = null; w.bone = null; w.corpse = -1; this.wounds.setMatrixAt(k, this.zero); this.wounds.instanceMatrix.needsUpdate = true;
  }

  /* ---------- Trozos de tejido ---------- */
  gib(p, vx, vy, vz, kind, s) {
    const k = (this.gibI = (this.gibI + 1) % this.gl.length), g = this.gl[k], C = GIB_COLORS[kind] || GIB_COLORS.flesh, c = C[Math.floor(Math.random() * C.length)];
    Object.assign(g, { on: true, x: p.x, y: p.y, z: p.z, vx, vy, vz, rx: rand(0, TAU), ry: rand(0, TAU), rz: rand(0, TAU), wx: rand(-14, 14), wy: rand(-14, 14), wz: rand(-14, 14), s, rest: false, t: 0, hit: false });
    this.gibs.setColorAt(k, this.col.setRGB(c[0], c[1], c[2])); if (this.gibs.instanceColor) this.gibs.instanceColor.needsUpdate = true;
  }
  gibBurst(p, dir, n, mix, power = 1) {
    const HEAD = ['bone', 'brain', 'flesh', 'flesh', 'brain', 'bone'];
    for (let i = 0; i < n; i++) {
      const kind = mix === 'head' ? HEAD[i % 6] : mix === 'belly' ? (i % 3 === 0 ? 'organ' : 'flesh') : Math.random() < 0.2 ? 'organ' : 'flesh', sp = rand(1.2, 3.4) * power;
      this.gib(p, dir.x * sp + rand(-1.2, 1.2), rand(1.2, 3.6) * power, dir.z * sp + rand(-1.2, 1.2), kind, rand(0.022, 0.05) * (kind === 'organ' ? 1.4 : 1));
    }
  }

  /* ---------- Reacciones ---------- */
  // Impacto de bala o de cuchillo: salpicadura, mancha en el suelo y la pared, herida y, si es crítico o a quemarropa, vísceras
  impact(z, point, dir, zone, opt) {
    const h = opt.pop ? null : this.woundAt(z, opt.origin || point.clone().addScaledVector(dir, -1.5), opt.rayDir || dir, zone, opt, point);
    const p = h ? h.point : point, heavy = opt.heavy, sd = opt.slash || dir;
    this.spray(p, sd, Math.round((zone === 'head' ? 30 : 22) * (heavy ? 1.7 : 1)), heavy ? 1.5 : 1.1, opt.melee ? 0.15 : 0.35);
    const far = rand(0.5, 1.6) * (heavy ? 1.3 : 1);
    this.splat(p.x + sd.x * far, p.z + sd.z * far, rand(0.35, 0.6) * (heavy ? 1.45 : 1), Math.atan2(-sd.z, sd.x));
    this.wallHit(p, sd, heavy ? 3.2 : 2.4, heavy ? rand(0.6, 0.95) : rand(0.4, 0.6));
    if (heavy && !opt.pop) { this.gibBurst(p, sd, opt.melee ? 1 + (Math.random() < 0.5 ? 1 : 0) : (zone === 'head' ? 3 : 2) + (Math.random() < 0.5 ? 1 : 0), zone === 'head' ? 'head' : 'flesh', 0.9); this.mist(p, 0.55); }
    if (opt.throat && h) this.fountains.push({ z, bone: h.bone, lp: _gv.copy(p).applyMatrix4(_gm.copy(z.b[h.bone].matrixWorld).invert()).toArray(), ld: _gn.copy(h.normal).transformDirection(_gm).toArray(), t: 1.3, T: 1.3, pulse: 12 }); // chorro arterial
    return p;
  }
  // La cabeza revienta (crítico o a quemarropa): cráneo, sesos, neblina roja y chorro desde el cuello
  headPop(z, dir) {
    z.zones(); const c = z.headC.clone();
    this.spray(c, dir, 46, 1.9, 0.15); this.spray(c, dir, 36, 1.3, 0, true);
    this.gibBurst(c, dir, 12, 'head', 1.05);
    this.mist(c, 1.15); this.mist(c.clone().addScaledVector(dir, 0.5), 0.8);
    this.wallHit(c, dir, 4, rand(0.85, 1.2));
    for (let i = 0; i < 3; i++) this.splat(c.x + dir.x * rand(0.6, 2.2) + rand(-0.4, 0.4), c.z + dir.z * rand(0.6, 2.2) + rand(-0.4, 0.4), rand(0.4, 0.75), Math.atan2(-dir.z, dir.x) + rand(-0.5, 0.5));
    const ch = z.b.chest, ny = z.VD.rest.head[1] - 0.035; ch.updateWorldMatrix(true, false);
    const p = new THREE.Vector3(0, ny, -0.005).applyMatrix4(ch.matrixWorld), n = new THREE.Vector3(0, 1, 0).transformDirection(ch.matrixWorld);
    this.addWound(z, 'chest', p, n, 0.075 * z.V.scale); // muñón
    this.fountains.push({ z, bone: 'chest', lp: [0, ny, -0.005], ld: [0, 1, 0.15], t: 1.9, T: 1.9, pulse: 9 });
  }
  // El hinchado revienta: vientre abierto, vísceras y lluvia de sangre
  belly(z) {
    const b = z.b.belly; z.mesh.updateMatrixWorld(true);
    const c = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld), f = new THREE.Vector3(0, 0, 1).transformDirection(b.matrixWorld);
    const h = this.surface(z, c.clone().addScaledVector(f, 1.2), f.clone().negate(), ['belly', 'chest'], 2.4);
    b.scale.set(0.74, 0.62, 0.74); // se vacía
    if (h) this.addWound(z, h.bone, h.point, h.normal, 0.17);
    const up = new THREE.Vector3(0, 1, 0);
    this.spray(c, up, 80, 2.6, 0, true); this.gibBurst(c, f, 16, 'belly', 1.3);
    this.mist(c, 1.6); this.mist(c.clone().add(up), 1.1);
    for (let i = 0; i < 6; i++) { const a = rand(0, TAU), d = rand(0.4, 1.8); this.splat(c.x + Math.cos(a) * d, c.z + Math.sin(a) * d, rand(0.5, 1.0), a); }
  }

  /* ---------- Cadáveres persistentes ---------- */
  initCorpses(cap) {
    let mv = 0, mi = 0;
    for (const k in ZombieFactory.variants) { if (ZombieFactory.variants[k].V.boss) continue; const g = ZombieFactory.variants[k].geo; mv = Math.max(mv, g.attributes.position.count); mi = Math.max(mi, g.index.count); }
    this.cap = cap; this.cv = mv; this.cix = mi; this.cNext = 0; this.cUsed = 0;
    const g = (this.cgeo = new THREE.BufferGeometry()), V = mv * cap;
    const at = (s) => { const a = new THREE.BufferAttribute(new Float32Array(V * s), s); a.setUsage(THREE.DynamicDrawUsage); return a; };
    g.setAttribute('position', at(3)); g.setAttribute('normal', at(3)); g.setAttribute('color', at(3)); g.setAttribute('uv', at(2));
    const ix = new THREE.BufferAttribute(new Uint32Array(mi * cap), 1); ix.setUsage(THREE.DynamicDrawUsage); g.setIndex(ix);
    g.setDrawRange(0, 0); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e4);
    const m = (this.corpseMesh = this.sys.track(new THREE.Mesh(g, this.sys.material)));
    m.frustumCulled = false; m.receiveShadow = true; m.castShadow = false;
    this.cl = Array.from({ length: cap }, () => ({ on: false, a: new THREE.Vector3(), b: new THREE.Vector3(), r: 0.2 }));
  }
  freeCorpse(slot) {
    const c = this.cl[slot]; if (!c.on) return;
    for (let k = 0; k < this.wl.length; k++) if (this.wl[k].on && this.wl[k].corpse === slot) this.dropWound(k);
    this.poolL[slot].on = false; this.pools.setMatrixAt(slot, this.zero); this.pools.instanceMatrix.needsUpdate = true; c.on = false;
  }
  // Hornea la pose final del infectado en el lote estático (skinning rígido por CPU) y libera su malla animada
  bake(z) {
    const slot = this.cNext; this.cNext = (slot + 1) % this.cap; this.cUsed = Math.max(this.cUsed, slot + 1);
    this.freeCorpse(slot);
    const VD = z.VD, A = VD.geo.attributes, P = A.position.array, N = A.normal.array, C = A.color.array, U = A.uv ? A.uv.array : null, SI = A.skinIndex.array, SW = A.skinWeight.array, I = VD.geo.index.array, nv = A.position.count;
    z.mesh.updateMatrixWorld(true);
    const BM = GoreSystem._bm || (GoreSystem._bm = new Float64Array(16 * 16)), BO = GoreSystem._bo || (GoreSystem._bo = new Float64Array(16 * 3));
    ZombieFactory.BONES.forEach((n, i) => { const e = z.b[n].matrixWorld.elements, o = VD.world[n]; for (let k = 0; k < 16; k++) BM[i * 16 + k] = e[k]; BO[i * 3] = o[0]; BO[i * 3 + 1] = o[1]; BO[i * 3 + 2] = o[2]; });
    const g = this.cgeo, pa = g.attributes.position.array, na = g.attributes.normal.array, ca = g.attributes.color.array, ua = g.attributes.uv.array, ia = g.index.array, vb = slot * this.cv, ib = slot * this.cix;
    const soak = []; // la piel alrededor de cada herida queda empapada de sangre
    for (const k of z.wounds) { const w = this.wl[k]; if (!w.on) continue; _gm.multiplyMatrices(w.bone.matrixWorld, w.local); const e = _gm.elements; soak.push(e[12], e[13], e[14], Math.sqrt(e[0] * e[0] + e[1] * e[1] + e[2] * e[2]) * 2.8); }
    const ns = soak.length;
    for (let i = 0; i < nv; i++) { // skinning rígido (1 o 2 huesos) con matrices en arrays tipados
      const i3 = i * 3, i4 = i * 4, px = P[i3], py = P[i3 + 1], pz = P[i3 + 2], qx = N[i3], qy = N[i3 + 1], qz = N[i3 + 2];
      let m = SI[i4] * 16, o = SI[i4] * 3, lx = px - BO[o], ly = py - BO[o + 1], lz = pz - BO[o + 2];
      let x = BM[m] * lx + BM[m + 4] * ly + BM[m + 8] * lz + BM[m + 12], y = BM[m + 1] * lx + BM[m + 5] * ly + BM[m + 9] * lz + BM[m + 13], w3 = BM[m + 2] * lx + BM[m + 6] * ly + BM[m + 10] * lz + BM[m + 14];
      let nx = BM[m] * qx + BM[m + 4] * qy + BM[m + 8] * qz, ny = BM[m + 1] * qx + BM[m + 5] * qy + BM[m + 9] * qz, nz = BM[m + 2] * qx + BM[m + 6] * qy + BM[m + 10] * qz;
      const w1 = SW[i4 + 1];
      if (w1 > 0) {
        const w0 = SW[i4]; m = SI[i4 + 1] * 16; o = SI[i4 + 1] * 3; lx = px - BO[o]; ly = py - BO[o + 1]; lz = pz - BO[o + 2];
        x = x * w0 + w1 * (BM[m] * lx + BM[m + 4] * ly + BM[m + 8] * lz + BM[m + 12]); y = y * w0 + w1 * (BM[m + 1] * lx + BM[m + 5] * ly + BM[m + 9] * lz + BM[m + 13]); w3 = w3 * w0 + w1 * (BM[m + 2] * lx + BM[m + 6] * ly + BM[m + 10] * lz + BM[m + 14]);
        nx = nx * w0 + w1 * (BM[m] * qx + BM[m + 4] * qy + BM[m + 8] * qz); ny = ny * w0 + w1 * (BM[m + 1] * qx + BM[m + 5] * qy + BM[m + 9] * qz); nz = nz * w0 + w1 * (BM[m + 2] * qx + BM[m + 6] * qy + BM[m + 10] * qz);
      }
      const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1, j = (vb + i) * 3;
      pa[j] = x; pa[j + 1] = y; pa[j + 2] = w3; na[j] = nx / nl; na[j + 1] = ny / nl; na[j + 2] = nz / nl;
      let r = C[i3], gg = C[i3 + 1], bb = C[i3 + 2];
      for (let s = 0; s < ns; s += 4) {
        const dx = x - soak[s], dy = y - soak[s + 1], dz = w3 - soak[s + 2], R = soak[s + 3]; if (dx > R || dx < -R || dy > R || dy < -R) continue;
        const d2 = dx * dx + dy * dy + dz * dz; if (d2 < R * R) { const k = (1 - Math.sqrt(d2) / R) * 0.85; r += (0.2 - r) * k; gg += (0.012 - gg) * k; bb += (0.01 - bb) * k; }
      }
      const mud = y < 0.09 ? (1 - y / 0.09) * 0.35 : 0; // lo que toca el barro se ensucia
      ca[j] = r * (0.9 - mud); ca[j + 1] = gg * (0.9 - mud); ca[j + 2] = bb * (0.88 - mud);
      if (U) { ua[(vb + i) * 2] = U[i * 2]; ua[(vb + i) * 2 + 1] = U[i * 2 + 1]; }
    }
    let ymin = Infinity; for (let i = 0; i < nv; i++) ymin = Math.min(ymin, pa[(vb + i) * 3 + 1]);
    const lift = ymin < -0.03 ? -0.015 - ymin : 0; // ajuste final exacto: nada se hunde en el barro
    if (lift) for (let i = 0; i < nv; i++) pa[(vb + i) * 3 + 1] += lift;
    for (let k = 0; k < I.length; k++) ia[ib + k] = I[k] + vb;
    for (let k = I.length; k < this.cix; k++) ia[ib + k] = vb; // triángulos degenerados: no se dibujan
    const up = (a, s, n) => { if (a.addUpdateRange) a.addUpdateRange(s, n); a.needsUpdate = true; };
    up(g.attributes.position, vb * 3, nv * 3); up(g.attributes.normal, vb * 3, nv * 3); up(g.attributes.color, vb * 3, nv * 3); up(g.attributes.uv, vb * 2, nv * 2); up(g.index, ib, this.cix);
    g.setDrawRange(0, this.cUsed * this.cix);
    // Cápsula del cadáver (los disparos lo salpican), heridas fijas y charco que se extiende
    z.zones(); const rec = this.cl[slot]; rec.on = true; rec.a.copy(z.bodyA); rec.b.copy(z.bodyB); rec.a.y += lift; rec.b.y += lift; rec.r = z.T.body * z.V.scale * 0.85;
    for (const k of z.wounds.slice()) { const w = this.wl[k]; if (!w.on) continue; _gm.multiplyMatrices(w.bone.matrixWorld, w.local); _gm.elements[13] += lift; this.wounds.setMatrixAt(k, _gm); w.corpse = slot; w.z = null; w.bone = null; }
    z.wounds.length = 0; this.wounds.instanceMatrix.needsUpdate = true;
    const pc = z.headless ? _gv.set(0, z.VD.rest.head[1], 0).applyMatrix4(z.b.chest.matrixWorld) : _gv.copy(z.bodyB).lerp(z.bodyA, 0.3);
    this.pool(slot, pc.x, pc.z, rand(0.6, 0.95) * z.V.scale * (z.type === 'bloater' ? 1.6 : 1) * (z.headless ? 1.25 : 1));
    return true;
  }
  // Compila (JIT) el horneado y la búsqueda de superficie durante la carga: el primer cadáver no da tirones
  prewarm(z) {
    try {
      const n = this.cNext, u = this.cUsed, o = z.pos.clone().add(new THREE.Vector3(0, 1.2, 2)), d = new THREE.Vector3(0, -0.15, -1).normalize();
      for (let i = 0; i < 3; i++) { this.bake(z); this.freeCorpse(n); this.cNext = n; this.cUsed = u; this.surface(z, o, d, GORE_BONES.body); this.surface(z, o, d, GORE_BONES.head); }
      this.cgeo.setDrawRange(0, this.cUsed * this.cix);
    } catch (e) { /* solo es una optimización */ }
  }
  rayCorpse(o, d, maxT) {
    let best = null;
    for (let i = 0; i < this.cap; i++) { const c = this.cl[i]; if (!c.on) continue; const t = rayCapsule(o, d, c.a, c.b, c.r); if (t < maxT && (!best || t < best.t)) best = { corpse: c, t }; }
    return best;
  }

  /* ---------- Bucle ---------- */
  stepPts(P, dt, big) {
    if (!(this.clock <= P.until)) return; // nada vivo: no se recorre ni se sube a la GPU
    let any = false;
    for (let i = 0; i < P.n; i++) {
      if (P.life[i] <= 0) continue; any = true;
      P.life[i] -= dt; P.v[i * 3 + 1] -= 9.8 * dt;
      P.p[i * 3] += P.v[i * 3] * dt; P.p[i * 3 + 1] += P.v[i * 3 + 1] * dt; P.p[i * 3 + 2] += P.v[i * 3 + 2] * dt;
      if (P.p[i * 3 + 1] < 0.02) { // toca el suelo: deja una gota (con un tope por fotograma)
        if (P.v[i * 3 + 1] < -0.5 && this.dropBudget > 0 && Math.random() < (big ? 0.5 : 0.06)) { this.dropBudget--; this.drop(P.p[i * 3], P.p[i * 3 + 2], big ? rand(0.1, 0.2) : rand(0.05, 0.1)); }
        P.p[i * 3 + 1] = 0.02; P.v[i * 3] = P.v[i * 3 + 1] = P.v[i * 3 + 2] = 0; P.life[i] = Math.min(P.life[i], 0.25);
      }
      if (P.life[i] <= 0) P.p[i * 3 + 1] = -999;
    }
    if (any) P.o.geometry.attributes.position.needsUpdate = true;
  }
  update(dt) {
    this.dropBudget = 4; this.frame = (this.frame || 0) + 1; this.clock = (this.clock || 0) + dt;
    this.stepPts(this.fine, dt, false); this.stepPts(this.gob, dt, true);
    // Heridas sobre cuerpos en movimiento (y el goteo de las que sangran)
    for (const z of this.sys.pool) if (z.active && z.wounds.length) z.mesh.updateMatrixWorld(true);
    let moved = false;
    for (let k = 0; k < this.wl.length; k++) {
      const w = this.wl[k]; if (!w.on || w.corpse >= 0) continue;
      if (!w.z || !w.z.active) { this.dropWound(k); continue; }
      _gm.multiplyMatrices(w.bone.matrixWorld, w.local); this.wounds.setMatrixAt(k, _gm); moved = true;
      w.drip -= dt;
      if (w.drip <= 0) { w.drip = rand(0.2, 0.6); const e = _gm.elements; this.emit(this.fine, e[12], e[13], e[14], rand(-0.2, 0.2), rand(-0.4, 0.1), rand(-0.2, 0.2), rand(0.6, 1.2)); }
    }
    if (moved) this.wounds.instanceMatrix.needsUpdate = true;
    // Chorros (cuello reventado, garganta)
    for (let i = this.fountains.length - 1; i >= 0; i--) {
      const f = this.fountains[i]; f.t -= dt;
      if (f.t <= 0 || !f.z.active) { this.fountains.splice(i, 1); continue; }
      const bm = f.z.b[f.bone].matrixWorld, p = _gv.fromArray(f.lp).applyMatrix4(bm), d = _gn.fromArray(f.ld).transformDirection(bm), k = f.t / f.T;
      const n = Math.floor(70 * k * (0.45 + 0.55 * Math.max(0, Math.sin((f.T - f.t) * f.pulse))) * dt + Math.random());
      for (let j = 0; j < n; j++) { const sp = rand(1.6, 3.2) * (0.5 + 0.5 * k); this.emit(Math.random() < 0.3 ? this.gob : this.fine, p.x, p.y, p.z, d.x * sp + rand(-0.4, 0.4), d.y * sp + rand(-0.2, 0.4), d.z * sp + rand(-0.4, 0.4), rand(0.6, 1.1)); }
    }
    // Trozos con física
    let gm = false; const w = this.game.world;
    for (let k = 0; k < this.gl.length; k++) {
      const g = this.gl[k]; if (!g.on || g.rest) continue; gm = true; g.t += dt;
      g.vy -= 9.8 * dt; g.x += g.vx * dt; g.y += g.vy * dt; g.z += g.vz * dt; g.rx += g.wx * dt; g.ry += g.wy * dt; g.rz += g.wz * dt;
      if (g.y < 1.7 && (k + this.frame) % 3 === 0) w.resolve(g, g.s); // no atraviesan paredes (comprobado cada 3 fotogramas)
      const floor = g.s * 0.45;
      if (g.y < floor) {
        g.y = floor;
        if (!g.hit) { g.hit = true; this.drop(g.x, g.z, rand(0.08, 0.16)); }
        if (g.vy < -1.2) { g.vy = -g.vy * 0.28; g.vx *= 0.55; g.vz *= 0.55; g.wx *= 0.5; g.wy *= 0.5; g.wz *= 0.5; }
        else { g.vy = 0; g.vx *= 0.8; g.vz *= 0.8; g.wx *= 0.7; g.wy *= 0.7; g.wz *= 0.7; if (Math.hypot(g.vx, g.vz) < 0.15) g.rest = true; }
      }
      if (g.t < 0.7 && Math.random() < 0.35) this.emit(this.fine, g.x, g.y, g.z, g.vx * 0.2, g.vy * 0.2, g.vz * 0.2, 0.5);
      _ge.set(g.rx, g.ry, g.rz); _gq.setFromEuler(_ge); this.gibs.setMatrixAt(k, _gm.compose(_gv.set(g.x, g.y, g.z), _gq, _gs.set(g.s, g.s, g.s)));
    }
    if (gm) this.gibs.instanceMatrix.needsUpdate = true;
    // Charcos que se extienden bajo los cuerpos
    let pm = false;
    for (let i = 0; i < this.poolL.length; i++) {
      const P = this.poolL[i]; if (!P.on || P.t >= P.dur) continue; pm = true;
      P.t = Math.min(P.dur, P.t + dt); const k = 1 - (1 - P.t / P.dur) ** 2, s = P.r * (0.12 + 0.88 * k);
      _ge.set(0, P.a, 0); _gq.setFromEuler(_ge); this.pools.setMatrixAt(i, _gm.compose(_gv.set(P.x, 0.01, P.z), _gq, _gs.set(s, 1, s * 0.85)));
    }
    if (pm) this.pools.instanceMatrix.needsUpdate = true;
    for (const m of this.mists) {
      if (m.userData.life <= 0) continue;
      m.userData.life -= dt * 1.2; const q = 1 - m.userData.life;
      m.scale.setScalar((0.2 + q * 0.9) * m.userData.s); m.material.opacity = Math.max(0, m.userData.life) * 0.45;
    }
  }
}
