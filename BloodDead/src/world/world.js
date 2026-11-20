import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { TAU, clamp, damp, rand, smooth } from '../core/utils.js';
import { Noise, uvBox, uvScale } from '../render/textures.js';
import { LEVEL_BUILDERS } from './levelBuilders.js';
import { ZOMBIE_SPAWNS } from '../zombies/zombieSystem.js';

/* =====================================================================
   MUNDO: pueblo en ruinas + colisiones (AABB / círculos) + raycast
   La geometría estática se fusiona por material → pocas draw calls.
   ===================================================================== */
export const UP = new THREE.Vector3(0, 1, 0), ONE = new THREE.Vector3(1, 1, 1);

export class World {
  constructor(game, mats) {
    this.game = game; this.scene = game.scene; this.mats = mats;
    this.buckets = new Map(); this.meshes = [];
    this.boxes = []; this.circles = []; this.rayBoxes = [];
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._p = new THREE.Vector3(); this._s = new THREE.Vector3();
    this.firePos = new THREE.Vector3(0, 0, 0); this.fires = [];
    this.lights = []; this.doors = new Map(); this.moving = []; this.uses = []; this.poi = {}; this.groups = {}; this.reserved = [];
    this.bounds = { x0: -24.5, x1: 24.5, z0: -28.5, z1: 28.5 };
    this.spawn = { player: new THREE.Vector3(0, 0, 24), yaw: 0 };
  }

  /* ---------- Primitivas de construcción ---------- */
  mtx(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    this._e.set(rx, ry, rz); this._q.setFromEuler(this._e);
    return this._m.compose(this._p.set(x, y, z), this._q, this._s.set(sx, sy, sz));
  }
  pushM(geo, mat, m, cast = true) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.applyMatrix4(m); g.computeBoundingBox();
    const key = mat + (cast ? '|c' : '|n');
    if (!this.buckets.has(key)) this.buckets.set(key, { mat, cast, list: [] });
    this.buckets.get(key).list.push(g);
    return g.boundingBox;
  }
  addAABB(bb, move = true) {
    const b = { minX: bb.min.x, maxX: bb.max.x, minY: bb.min.y, maxY: bb.max.y, minZ: bb.min.z, maxZ: bb.max.z, move };
    this.boxes.push(b); return b;
  }
  box(x, y, z, w, h, d, mat, o = {}) {
    const g = new THREE.BoxGeometry(w, h, d); uvBox(g, w, h, d, this.mats.texScale[mat] || 2);
    const bb = this.pushM(g, mat, this.mtx(x, y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0), o.cast !== false);
    if (o.collide !== false) this.addAABB(bb, o.move !== false).flat = !(o.rx || o.ry || o.rz); // caja alineada: su cara es la pared real
  }
  cyl(x, y, z, rt, rb, h, seg, mat, o = {}) {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg); const s = this.mats.texScale[mat] || 2;
    uvScale(g, (TAU * Math.max(rt, rb)) / s, h / s);
    const rot = o.rx || o.rz;
    const bb = this.pushM(g, mat, this.mtx(x, y + h / 2, z, o.rx || 0, o.ry || 0, o.rz || 0), o.cast !== false);
    if (o.collide === false) return;
    if (rot) this.addAABB(bb);
    else this.circles.push({ x, z, r: Math.max(rt, rb), minY: y, maxY: y + h });
  }
  rock(x, z, r, o = {}) {
    const g = new THREE.DodecahedronGeometry(1, 0); uvScale(g, r * 2, r * 2);
    this.pushM(g, 'rock', this.mtx(x, r * 0.35 + (o.y || 0), z, rand(0, 3), rand(0, 3), rand(0, 3), r, r * rand(0.55, 0.95), r * rand(0.8, 1.3)));
    if (r > 0.3 && o.collide !== false) this.circles.push({ x, z, r: r * 0.9, minY: 0, maxY: r });
  }
  prism(x, y, z, w, h, len, mat, o = {}) { // prisma triangular (tejado a dos aguas / frontón), cumbrera a lo largo de Z
    const g = new THREE.CylinderGeometry(1, 1, 1, 3, 1, !!o.open); g.rotateX(-Math.PI / 2);
    const s = this.mats.texScale[mat] || 2.5; uvScale(g, (w * 1.2) / s, len / s);
    const sy = h / 1.5;
    this.pushM(g, mat, this.mtx(x, y + 0.5 * sy, z, 0, 0, 0, w / 1.732, sy, len));
    if (o.collide !== false) this.addAABB({ min: { x: x - w / 2, y, z: z - len / 2 }, max: { x: x + w / 2, y: y + h, z: z + len / 2 } }, false);
  }
  isFree(x, z, m = 0.6) { // ¿punto libre de colisionadores, puertas cerradas y puntos de interés?
    for (const b of this.boxes) if (!b.off && b.maxY > 0.3 && x > b.minX - m && x < b.maxX + m && z > b.minZ - m && z < b.maxZ + m) return false;
    for (const c of this.circles) if (c.maxY > 0.3 && Math.hypot(x - c.x, z - c.z) < c.r + m) return false;
    for (const o of this.reserved) if (Math.hypot(x - o.x, z - o.z) < o.r + m) return false;
    return Math.hypot(x - this.spawn.player.x, z - this.spawn.player.z) > 3;
  }
  puddle(x, z, rx, rz, ry = 0) {
    const g = new THREE.CircleGeometry(1, 28); g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, this.mats.get('puddle'));
    m.position.set(x, 0.015, z); m.scale.set(rx, 1, rz); m.rotation.y = ry; m.receiveShadow = true;
    this.scene.add(m); this.meshes.push(m);
  }

  /* ---------- Escenario: suelo, muros con huecos, puertas, luces y puntos de juego ---------- */
  groundPlane(w, d, mat, cx = 0, cz = 0, seed = 101) {
    const g = new THREE.PlaneGeometry(w, d, Math.ceil(w / 1.6), Math.ceil(d / 1.6)); g.rotateX(-Math.PI / 2); g.translate(cx, 0, cz);
    const pos = g.attributes.position, cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const n = Noise.fbm((pos.getX(i) + 200) / 60, (pos.getZ(i) + 200) / 60, 6, 6, 4, seed), c = 0.62 + 0.5 * n;
      cols[i * 3] = c; cols[i * 3 + 1] = c * 0.985; cols[i * 3 + 2] = c * 0.96; pos.setY(i, -0.005);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals(); uvScale(g, w / 4, d / 4);
    const mesh = new THREE.Mesh(g, this.mats.get(mat)); mesh.receiveShadow = true; this.scene.add(mesh); this.meshes.push(mesh);
  }
  perimeter(x0, z0, x1, z1, h, mat, t = 0.6) {
    this.box((x0 + x1) / 2, 0, z0 - t / 2, x1 - x0 + 2 * t, h, t, mat); this.box((x0 + x1) / 2, 0, z1 + t / 2, x1 - x0 + 2 * t, h, t, mat);
    this.box(x0 - t / 2, 0, (z0 + z1) / 2, t, h, z1 - z0, mat); this.box(x1 + t / 2, 0, (z0 + z1) / 2, t, h, z1 - z0, mat);
  }
  // Muro recto a lo largo de X (en z) o de Z (en x) con huecos {c, w, h?}: sobre cada hueco queda un dintel
  wallX(x0, x1, z, h, mat, t = 0.4, gaps = []) { this.wallRun('x', x0, x1, z, h, mat, t, gaps); }
  wallZ(z0, z1, x, h, mat, t = 0.4, gaps = []) { this.wallRun('z', z0, z1, x, h, mat, t, gaps); }
  wallRun(axis, a0, a1, k, h, mat, t, gaps) {
    const seg = (a, b, y0, y1) => { if (b - a < 0.02 || y1 - y0 < 0.02) return; const c = (a + b) / 2; if (axis === 'x') this.box(c, y0, k, b - a, y1 - y0, t, mat); else this.box(k, y0, c, t, y1 - y0, b - a, mat); };
    let cur = a0;
    for (const g of gaps.slice().sort((p, q) => p.c - q.c)) { const a = g.c - g.w / 2, b = g.c + g.w / 2; seg(cur, a, 0, h); if (g.h) seg(a, b, g.h, h); cur = b; }
    seg(cur, a1, 0, h);
  }
  // Puerta o compuerta con colisión propia: al abrirse se desliza dentro del muro, sube o se hunde en el suelo
  door(id, x, z, w, h, axis, mat = 'paintGrey', o = {}) {
    const t = o.t || 0.22, sx = axis === 'x' ? w : t, sz = axis === 'x' ? t : w;
    const g = new THREE.BoxGeometry(sx, h, sz); uvBox(g, sx, h, sz, this.mats.texScale[mat] || 2);
    const mesh = new THREE.Mesh(g, this.mats.get(mat)); mesh.position.set(x, h / 2, z); mesh.castShadow = mesh.receiveShadow = true;
    this.scene.add(mesh); this.meshes.push(mesh);
    if (o.stripe !== false) { // franja de peligro
      const sg = new THREE.BoxGeometry(axis === 'x' ? w * 0.98 : t + 0.02, 0.16, axis === 'x' ? t + 0.02 : w * 0.98), sm = new THREE.Mesh(sg, this.mats.get('lampRed'));
      sm.position.set(0, -h / 2 + 0.5, 0); mesh.add(sm);
    }
    const b = this.addAABB({ min: { x: x - sx / 2, y: 0, z: z - sz / 2 }, max: { x: x + sx / 2, y: h, z: z + sz / 2 } }); b.flat = true; b.door = id;
    this.doors.set(id, { id, mesh, box: b, open: false, t: 0, mode: o.mode || 'slide', axis, w, h, dir: o.dir || 1, x, z });
    this.reserved.push({ x, z, r: w / 2 + 0.6 });
  }
  openDoor(id) {
    const d = this.doors.get(id); if (!d || d.open) return false;
    d.open = true; d.box.off = true; this.moving.push(d); return true;
  }
  // Luz puntual fija (sin sombras): se crean todas al construir el nivel para no recompilar shaders al encenderlas
  light(x, y, z, color, intensity, dist, o = {}) {
    const L = new THREE.PointLight(color, o.off ? 0 : intensity, dist, 2); L.position.set(x, y, z); this.scene.add(L);
    this.lights.push({ L, base: intensity, group: o.group || null, on: !o.off, flicker: o.flicker || 0, pulse: o.pulse || 0, t: rand(0, 10), k: o.off ? 0 : 1 });
    if (o.fixture !== false) this.box(x, y + 0.06, z, 0.5, 0.08, 0.22, color === 0xff1a1a || color === 0xff2a1a ? 'lampRed' : 'lamp', { collide: false, cast: false });
    return L;
  }
  setPower(group = 'power') { for (const l of this.lights) if (l.group === group) l.on = true; }
  poiAt(name, x, z) { this.poi[name] = new THREE.Vector3(x, 0, z); }
  spawns(group, pts) { this.groups[group] = pts; }
  spawnPoints(groups) { const out = []; for (const k of groups || Object.keys(this.groups)) if (this.groups[k]) out.push(...this.groups[k]); return out; }
  // Punto interactivo (objetivo, munición, botiquín o arma); InteractSystem crea su señal y su atrezo
  use(id, x, z, o = {}) { this.uses.push({ id, x, z, kind: 'objective', hold: 1.5, r: 1.6, ...o }); this.reserved.push({ x, z, r: 1.1 }); }
  addFire(x, z, o = {}) { const f = { x, z, lit: o.lit !== false, s: o.s || 1, smoke: !!o.smoke, id: o.id || null, y: o.y || 0 }; this.fires.push(f); if (f.smoke) this.firePos.set(x, 0, z); return f; }
  lightFire(id) { const f = this.fires.find((q) => q.id === id); if (f) f.lit = true; return f; }
  nearFire(p) { let d = Infinity; for (const f of this.fires) if (f.lit) d = Math.min(d, Math.hypot(p.x - f.x, p.z - f.z)); return d; }
  update(dt) {
    for (let i = this.moving.length - 1; i >= 0; i--) {
      const d = this.moving[i]; d.t += dt; const k = smooth(0, 1, d.t / 1.6), m = d.mesh;
      if (d.mode === 'slide') { if (d.axis === 'x') m.position.x = d.x + d.dir * d.w * 0.96 * k; else m.position.z = d.z + d.dir * d.w * 0.96 * k; }
      else if (d.mode === 'up') m.position.y = d.h / 2 + (d.h + 0.15) * k;
      else m.position.y = d.h / 2 - (d.h + 0.05) * k;
      if (d.t >= 1.6) { this.moving.splice(i, 1); if (d.mode === 'sink') m.visible = false; }
    }
    for (const l of this.lights) {
      l.t += dt; l.k = damp(l.k, l.on ? 1 : 0, l.on ? 3 : 8, dt);
      let f = 1;
      if (l.flicker) f *= Math.sin(l.t * 23) > 1 - l.flicker * 0.4 || Math.random() < l.flicker * 0.04 ? 0.15 : 1;
      if (l.pulse) f *= 0.65 + 0.35 * Math.sin(l.t * 2.2);
      l.L.intensity = l.base * l.k * f;
    }
  }

  /* ---------- Atrezo de los escenarios nuevos ---------- */
  rotAABB(x, z, hw, hd, ry, h) { const c = Math.abs(Math.cos(ry)), s = Math.abs(Math.sin(ry)), ex = hw * c + hd * s, ez = hw * s + hd * c; this.addAABB({ min: { x: x - ex, y: 0, z: z - ez }, max: { x: x + ex, y: h, z: z + ez } }); }
  car(x, z, ry, paint = 'carPaint') {
    const c = Math.cos(ry), s = Math.sin(ry), L = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    this.box(x, 0.28, z, 1.8, 0.72, 4.3, paint, { ry, collide: false });
    let p = L(0, -0.25); this.box(p[0], 1.0, p[1], 1.62, 0.58, 2.2, 'rubber', { ry, collide: false });
    p = L(0, -0.25); this.box(p[0], 1.56, p[1], 1.5, 0.06, 1.9, paint, { ry, collide: false });
    for (const [lx, lz] of [[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.35], [0.86, -1.35]]) { p = L(lx, lz); this.cyl(p[0], 0.21, p[1], 0.34, 0.34, 0.26, 12, 'rubber', { rz: Math.PI / 2, ry, collide: false }); }
    for (const sx of [-0.55, 0.55]) { p = L(sx, 2.16); this.box(p[0], 0.62, p[1], 0.3, 0.12, 0.04, 'lamp', { ry, collide: false, cast: false }); }
    this.rotAABB(x, z, 0.92, 2.18, ry, 1.6);
  }
  lamppost(x, z, lit, side = 1) {
    this.cyl(x, 0, z, 0.07, 0.1, 5.4, 8, 'metal', { collide: false }); this.circles.push({ x, z, r: 0.12, minY: 0, maxY: 5.4 });
    this.box(x - side * 0.7, 5.3, z, 1.5, 0.08, 0.1, 'metal', { collide: false });
    this.box(x - side * 1.35, 5.18, z, 0.5, 0.12, 0.26, lit ? 'lamp' : 'metal', { collide: false, cast: false });
    if (lit) this.light(x - side * 1.35, 5.0, z, 0xffc58a, 11, 17, { flicker: lit === 'flicker' ? 0.5 : 0.04, fixture: false });
  }
  container(x, z, along = 'x', paint = 'paintRed', y = 0) {
    const w = along === 'x' ? 6.1 : 2.45, d = along === 'x' ? 2.45 : 6.1;
    this.box(x, y, z, w, 2.6, d, paint, { collide: y === 0 });
    for (let i = -2; i <= 2; i++) { const o = i * 1.2; if (along === 'x') this.box(x + o, y + 0.1, z + d / 2 + 0.02, 0.06, 2.4, 0.04, paint, { collide: false }); else this.box(x + d * 0 + w / 2 + 0.02, y + 0.1, z + o, 0.04, 2.4, 0.06, paint, { collide: false }); }
  }
  silo(x, z, r, h, mat = 'rust') {
    this.cyl(x, 0, z, r, r, h, 28, mat);
    this.cyl(x, h, z, 0.5, r * 1.02, 1.6, 28, mat, { collide: false });
    for (const y of [1.2, h * 0.4, h * 0.75]) this.cyl(x, y, z, r * 1.03, r * 1.03, 0.18, 28, 'metal', { collide: false });
    for (let y = 0.5; y < h - 0.3; y += 0.45) this.box(x - r - 0.18, y, z, 0.06, 0.05, 0.5, 'metal', { collide: false, cast: false });
    this.box(x - r - 0.2, 0, z - 0.27, 0.05, h, 0.05, 'metal', { collide: false }); this.box(x - r - 0.2, 0, z + 0.27, 0.05, h, 0.05, 'metal', { collide: false });
  }
  pipe(x0, z0, x1, z1, y, r = 0.22, mat = 'rust') {
    const len = Math.hypot(x1 - x0, z1 - z0), a = Math.atan2(x1 - x0, z1 - z0);
    this.cyl((x0 + x1) / 2, y - len / 2, (z0 + z1) / 2, r, r, len, 10, mat, { rz: Math.PI / 2, ry: a - Math.PI / 2, collide: false });
  }
  labTube(x, z, broken, s = 1) {
    this.cyl(x, 0, z, 0.78 * s, 0.82 * s, 0.4, 18, 'metal');
    if (broken) {
      for (let i = 0; i < 7; i++) { const a = (i / 7) * TAU + rand(-0.2, 0.2), hh = rand(0.25, 1.1) * s; this.box(x + Math.cos(a) * 0.66 * s, 0.4, z + Math.sin(a) * 0.66 * s, 0.32 * s, hh, 0.03, 'glass', { ry: -a + Math.PI / 2, collide: false, cast: false }); }
      this.puddle(x + rand(-0.6, 0.6), z + 1.2 * s, 1.3 * s, 0.9 * s, rand(0, 3));
      this.cyl(x, 0.4, z, 0.6 * s, 0.6 * s, 0.08, 16, 'fluid', { collide: false, cast: false });
    } else {
      this.cyl(x, 0.4, z, 0.6 * s, 0.6 * s, 2.0 * s, 16, 'fluid', { collide: false, cast: false });
      this.cyl(x, 0.4, z, 0.68 * s, 0.68 * s, 2.3 * s, 18, 'glass', { collide: false, cast: false });
    }
    this.cyl(x, 0.4 + 2.3 * s, z, 0.78 * s, 0.78 * s, 0.32, 18, 'metal', { collide: false });
    this.cyl(x, 0.72 + 2.3 * s, z, 0.1, 0.1, 4.4 - 0.72 - 2.3 * s, 8, 'metal', { collide: false });
  }
  bench(x, z, w, d, screen = true) {
    this.box(x, 0, z, w, 0.86, d, 'paintGrey'); this.box(x, 0.86, z, w + 0.06, 0.05, d + 0.06, 'metal', { collide: false });
    if (screen) this.box(x, 0.91, z + rand(-d * 0.3, d * 0.3), 0.06, 0.4, 0.55, 'screen', { collide: false, ry: rand(-0.2, 0.2) });
  }
  brazier(id, x, z) {
    this.cyl(x, 0, z, 0.32, 0.22, 0.75, 12, 'stone'); this.cyl(x, 0.75, z, 0.55, 0.4, 0.28, 14, 'metal');
    this.cyl(x, 0.98, z, 0.45, 0.45, 0.06, 14, 'charred', { collide: false });
    this.addFire(x, z, { lit: false, s: 0.55, id, y: 1.0 });
    this.use(id, x, z + 0.95, { label: 'Encender el brasero', hold: 1.6, sfx: 'fire' });
  }
  node(id, x, z) { // consola de nodo del Núcleo
    this.box(x, 0, z, 1.1, 1.15, 0.8, 'paintGrey'); this.box(x, 1.15, z - 0.1, 1.0, 0.08, 0.5, 'screen', { collide: false, rx: -0.5 });
    this.cyl(x, 0, z - 0.6, 0.12, 0.12, 3.4, 8, 'metal', { collide: false }); this.box(x, 3.4, z - 0.6, 0.5, 0.18, 0.5, 'lampRed', { collide: false, cast: false });
    this.use(id, x, z + 1.0, { label: 'Activar el nodo', hold: 1.8, sfx: 'node' });
  }
  fungus(x, y, z, n = 5, s = 1) {
    for (let i = 0; i < n; i++) { const r = rand(0.05, 0.16) * s, g = new THREE.SphereGeometry(1, 8, 6); this.pushM(g, 'fungus', this.mtx(x + rand(-0.3, 0.3) * s, y + rand(0, 0.25) * s, z + rand(-0.3, 0.3) * s, 0, 0, 0, r, r * rand(0.5, 1), r), false); }
  }

  /* ---------- Piezas compuestas ---------- */
  wallPiece(S, a, b, y0, y1, mat, t) {
    if (b - a < 0.02 || y1 - y0 < 0.02) return;
    if (S.axis === 'x') this.box(S.cx + (a + b) / 2, y0, S.cz, b - a, y1 - y0, t, mat);
    else this.box(S.cx, y0, S.cz + (a + b) / 2, t, y1 - y0, b - a, mat);
  }
  house(o) {
    const { x, z, w, d, h = 3.1, t = 0.32, wall = 'plaster', roof = 'full', ruined = false, floor = false, open = {} } = o;
    const sides = {
      n: { len: w, cx: x, cz: z - d / 2 + t / 2, axis: 'x' }, s: { len: w, cx: x, cz: z + d / 2 - t / 2, axis: 'x' },
      e: { len: d - 2 * t, cx: x + w / 2 - t / 2, cz: z, axis: 'z' }, w: { len: d - 2 * t, cx: x - w / 2 + t / 2, cz: z, axis: 'z' },
    };
    // Bajo el tejado que sigue en pie los muros conservan su altura; solo se derrumba lo descubierto
    const roofEndZ = roof === 'full' ? Infinity : roof === 'half' ? z : -Infinity;
    for (const key of ['n', 's', 'e', 'w']) {
      const S = sides[key], ops = (open[key] || []).slice().sort((p, q) => p.c - q.c);
      const seg = (a, b, y0, y1, solid) => {
        if (solid && ruined) {
          const n = Math.max(1, Math.round((b - a) / 0.9)), cw = (b - a) / n;
          for (let i = 0; i < n; i++) {
            const cz = S.axis === 'x' ? S.cz : S.cz + a + (i + 0.5) * cw;
            this.wallPiece(S, a + i * cw, a + (i + 1) * cw, y0, cz < roofEndZ - 0.2 ? y1 : y1 * rand(0.5, 1), wall, t);
          }
        } else this.wallPiece(S, a, b, y0, y1, wall, t);
      };
      let cur = -S.len / 2;
      for (const op of ops) {
        const a = op.c - op.w / 2, b = op.c + op.w / 2;
        seg(cur, a, 0, h, true);
        if (op.t === 'door') {
          seg(a, b, 2.15, h, false);
          if (op.closed) this.wallPiece(S, a, b, 0, 2.15, 'woodDark', t * 0.45);
        } else {
          seg(a, b, 0, 1.0, false); seg(a, b, 1.95, h, false);
          if (op.boarded) {
            this.wallPiece(S, a, b, 1.0, 1.95, 'void', t * 0.3);
            for (const yy of [1.2, 1.55]) {
              const L = op.w + 0.2, rz = rand(-0.18, 0.18);
              if (S.axis === 'x') this.box(S.cx + op.c, yy, S.cz + (key === 's' ? t * 0.55 : -t * 0.55), L, 0.16, 0.04, 'wood', { rz, collide: false });
              else this.box(S.cx + (key === 'e' ? t * 0.55 : -t * 0.55), yy, S.cz + op.c, 0.04, 0.16, L, 'wood', { rx: rz, collide: false });
            }
          }
        }
        cur = b;
      }
      seg(cur, S.len / 2, 0, h, true);
    }
    if (floor) this.box(x, 0, z, w - 2 * t, 0.08, d - 2 * t, 'wood', { collide: false });
    if (roof !== 'none') {
      const over = 0.35, rw = w + over * 2, rh = o.roofH || Math.min(2.2, w * 0.32), full = d + over * 2;
      const len = roof === 'half' ? full * 0.5 : full, zc = roof === 'half' ? z - full / 2 + len / 2 : z;
      this.prism(x, h, zc, rw, rh, len, 'roof', { open: true });
      // Frontones del mismo material que los muros, bajo el alero abierto
      const gLen = roof === 'half' ? len - over : d, gz = roof === 'half' ? z - d / 2 + gLen / 2 : z;
      this.prism(x, h, gz, w, rh * (w / rw), gLen, wall, { collide: false });
      if (roof === 'half') {
        for (let i = 0; i < 3; i++) this.box(x + rand(-0.4, 0.4), h - 0.15 - (i === 2 ? 1.2 : 0), z + 0.4 + i * 1.1, w * 0.95, 0.16, 0.18, 'woodDark', { rz: i === 2 ? 0.35 : rand(-0.05, 0.05), collide: false });
        for (let i = 0; i < 6; i++) this.rock(x + rand(-w * 0.3, w * 0.3), z + rand(0.4, d * 0.4), rand(0.12, 0.3), { collide: false });
      }
    }
  }
  tree(x, z, collide = true) {
    const h = rand(4.5, 7.5), r = rand(0.14, 0.24);
    this.cyl(x, 0, z, r * 0.4, r, h, 7, 'bark', { collide });
    const n = 4 + Math.floor(Math.random() * 3), dir = new THREE.Vector3(), p = new THREE.Vector3(), q = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const by = h * rand(0.4, 0.92), len = rand(0.9, 2.3), a = rand(0, TAU), tilt = rand(0.5, 1.15);
      dir.set(Math.sin(a) * Math.sin(tilt), Math.cos(tilt), Math.cos(a) * Math.sin(tilt));
      const g = new THREE.CylinderGeometry(r * 0.08, r * 0.28, len, 5); uvScale(g, 0.5, len / 1.2);
      q.setFromUnitVectors(UP, dir); p.set(x, by, z).addScaledVector(dir, len / 2);
      this.pushM(g, 'bark', this._m.compose(p, q, ONE));
    }
  }
  fence(x, z0, z1) {
    for (let z = z0; z <= z1; z += 2.2) this.cyl(x, 0, z, 0.06, 0.075, 1.35, 6, 'woodDark', { collide: false });
    for (let z = z0; z < z1; z += 0.27) {
      if (Math.random() < 0.14) continue;
      this.box(x + rand(-0.06, 0.06), 0, z, 0.04, rand(1.05, 1.6), 0.13, 'wood', { rz: rand(-0.42, -0.12), ry: rand(-0.15, 0.15), collide: false });
    }
    this.box(x + 0.08, 0.42, (z0 + z1) / 2, 0.06, 0.08, z1 - z0, 'woodDark', { collide: false });
    this.box(x + 0.08, 0.98, (z0 + z1) / 2, 0.06, 0.08, z1 - z0, 'woodDark', { collide: false, rx: 0.01 });
    this.addAABB({ min: { x: x - 0.25, y: 0, z: z0 - 0.1 }, max: { x: x + 0.25, y: 1.4, z: z1 + 0.1 } });
  }
  crate(x, z, s = 0.85, ry = 0, y = 0) { this.box(x, y, z, s, s, s, 'wood', { ry }); }
  barrel(x, z) {
    this.cyl(x, 0, z, 0.29, 0.29, 0.92, 14, 'woodDark');
    for (const y of [0.16, 0.7]) this.cyl(x, y, z, 0.3, 0.3, 0.05, 14, 'metal', { collide: false });
  }
  cart(x, z) {
    this.box(x, 0.55, z, 1.3, 0.14, 2.2, 'wood');
    this.box(x - 0.62, 0.69, z, 0.06, 0.4, 2.2, 'wood', { collide: false });
    this.box(x + 0.62, 0.69, z, 0.06, 0.4, 2.2, 'wood', { collide: false });
    for (const sx of [-1, 1]) this.cyl(x + sx * 0.75, 0, z - 0.3, 0.46, 0.46, 0.08, 14, 'woodDark', { rz: Math.PI / 2, collide: false });
    this.box(x - 0.35, 0.4, z + 1.7, 0.07, 0.07, 1.6, 'woodDark', { rx: 0.25, collide: false });
    this.box(x + 0.35, 0.4, z + 1.7, 0.07, 0.07, 1.6, 'woodDark', { rx: 0.25, collide: false });
    this.addAABB({ min: { x: x - 0.8, y: 0, z: z - 1.2 }, max: { x: x + 0.8, y: 1.1, z: z + 2.4 } });
    this.crate(x + 0.2, z - 0.4, 0.6, 0.3, 0.69);
  }
  well(x, z) {
    this.cyl(x, 0, z, 0.95, 1.0, 0.8, 18, 'stone');
    this.cyl(x, 0.79, z, 0.74, 0.74, 0.02, 18, 'void', { collide: false });
    for (const sx of [-1, 1]) this.box(x + sx * 0.85, 0.8, z, 0.12, 1.6, 0.12, 'woodDark', { collide: false });
    this.box(x, 2.35, z, 1.9, 0.1, 0.12, 'woodDark', { collide: false });
    this.prism(x, 2.4, z, 2.1, 0.7, 1.4, 'roof');
  }
  bonfire(x, z) {
    this.addFire(x, z, { lit: true, s: 1, smoke: true });
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; this.rock(x + Math.cos(a) * 0.8, z + Math.sin(a) * 0.8, rand(0.14, 0.22), { collide: false }); }
    for (let i = 0; i < 5; i++) this.cyl(x, 0.2, z, 0.06, 0.08, 1.3, 7, 'charred', { rx: 1.25, ry: (i / 5) * TAU, collide: false });
    this.cyl(x, 0, z, 0.7, 0.7, 0.03, 16, 'ash', { collide: false });
    this.circles.push({ x, z, r: 0.95, minY: 0, maxY: 1 });
  }

  /* ---------- Nivel: pueblo en ruinas ---------- */
  pathX(z) { return Math.sin(z * 0.15) * 0.8; }
  buildGround() {
    const S = 90, g = new THREE.PlaneGeometry(S, S, 90, 90); g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position, cols = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), n = Noise.fbm((x + S / 2) / S, (z + S / 2) / S, 6, 6, 4, 101);
      const path = z > 3 ? 1 - smooth(1.1, 2.4, Math.abs(x - this.pathX(z))) : 0;
      const m = Math.max(path, 1 - smooth(7, 10, Math.hypot(x, z)));
      const c = (0.55 + 0.5 * n) * (1 - m * 0.3);
      cols[i * 3] = c; cols[i * 3 + 1] = c * 0.97; cols[i * 3 + 2] = c * 0.93;
      pos.setY(i, (1 - m) * n * 0.08 - 0.02);
    }
    g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.computeVertexNormals(); uvScale(g, S / 4, S / 4);
    const mesh = new THREE.Mesh(g, this.mats.get('ground')); mesh.receiveShadow = true;
    this.scene.add(mesh); this.meshes.push(mesh);
  }
  buildPerimeter() {
    const X = 27, Z = 31;
    for (let x = -X; x < X; x += 3.4) {
      this.box(x + 1.7, 0, -Z, 3.6, rand(2.8, 4.6), 1.2, 'stone', { ry: rand(-0.05, 0.05) });
      this.box(x + 1.7, 0, Z, 3.6, rand(2.8, 4.6), 1.2, 'stone', { ry: rand(-0.05, 0.05) });
    }
    for (let z = -Z; z < Z; z += 3.4) {
      this.box(-X, 0, z + 1.7, 1.2, rand(2.8, 4.6), 3.6, 'stone', { ry: rand(-0.05, 0.05) });
      this.box(X, 0, z + 1.7, 1.2, rand(2.8, 4.6), 3.6, 'stone', { ry: rand(-0.05, 0.05) });
    }
    for (let i = 0; i < 44; i++) {
      const a = rand(0, TAU), k = rand(1.08, 1.3);
      this.tree(Math.cos(a) * X * k, Math.sin(a) * Z * k, false);
    }
  }
  build(level = 'village') {
    (LEVEL_BUILDERS[level] || LEVEL_BUILDERS.village)(this);
    this.finalize();
  }
  buildVillage() {
    this.bounds = { x0: -24.5, x1: 24.5, z0: -28.5, z1: 28.5 };
    this.spawn.player.set(0, 0, 24); this.spawn.yaw = 0;
    this.spawns('all', ZOMBIE_SPAWNS);
    // Puntos de suministro de supervivencia: armas (se desbloquean por rondas), munición y botiquines
    this.use('wShotgun', -11.4, 3.1, { kind: 'weapon', weapon: 'shotgun' });
    this.use('wSmg', 2.6, -9.4, { kind: 'weapon', weapon: 'smg' });
    this.use('wRifle', 9.2, -10.6, { kind: 'weapon', weapon: 'rifle' });
    this.use('ammoA', -2.8, 7.6, { kind: 'ammo' }); this.use('ammoB', -15.2, -13, { kind: 'ammo' }); this.use('ammoC', 17.2, -8, { kind: 'ammo' });
    this.use('medA', 1.8, 17.5, { kind: 'med' }); this.use('medB', -9, 8.8, { kind: 'med' });
    this.buildGround();
    this.buildPerimeter();
    // Sendero de entrada (como la imagen de referencia: valla a la izquierda, casas a la derecha)
    this.fence(-3.6, 6, 27);
    this.house({ x: 8.6, z: 15.5, w: 6.4, d: 6, h: 3.1, wall: 'plaster', open: { w: [{ c: -1.2, w: 1.0, t: 'window', boarded: true }, { c: 1.4, w: 1.2, t: 'door', closed: true }], n: [{ c: 0, w: 1.0, t: 'window', boarded: true }] } });
    this.house({ x: -10, z: 17, w: 6.5, d: 7.5, h: 3.0, wall: 'wood', open: { e: [{ c: -1.5, w: 1.0, t: 'window', boarded: true }, { c: 1.6, w: 1.4, t: 'door', closed: true }] } });
    // Casa explorable en ruinas (objetivo 2)
    this.house({ x: -13, z: 1, w: 8, d: 7, h: 3.2, wall: 'plaster', ruined: true, roof: 'half', floor: true,
      open: { e: [{ c: 0.6, w: 1.3, t: 'door' }], n: [{ c: -1.5, w: 1.1, t: 'window' }], s: [{ c: 1.8, w: 1.1, t: 'window' }, { c: -1.8, w: 1.1, t: 'window' }], w: [{ c: 0, w: 1.0, t: 'window' }] } });
    this.box(-12.4, 0.74, -0.6, 1.6, 0.06, 0.9, 'wood', { collide: false });
    for (const [lx, lz] of [[-13.1, -0.95], [-11.7, -0.95], [-13.1, -0.25], [-11.7, -0.25]]) this.box(lx, 0, lz, 0.07, 0.74, 0.07, 'woodDark', { collide: false });
    this.addAABB({ min: { x: -13.2, y: 0, z: -1.05 }, max: { x: -11.6, y: 0.8, z: -0.15 } });
    this.box(-16.2, 0, 2.8, 0.55, 1.9, 1.4, 'woodDark');
    this.box(-11.4, 0, 0.6, 0.45, 0.45, 0.45, 'wood', { ry: 0.4 });
    this.box(-12.6, 0, 0.8, 0.45, 0.45, 0.45, 'wood', { rz: 1.4, ry: 1.1, collide: false });
    this.box(-14.6, 0, 2.6, 1.0, 0.35, 2.0, 'woodDark');
    this.box(-14, 0.9, -1.4, 0.18, 0.18, 3.6, 'woodDark', { rx: 0.42, ry: 0.5, collide: false });
    // Plaza con hoguera
    this.bonfire(0, 0);
    this.well(6, -5);
    this.cart(4.6, 8.5);
    this.house({ x: 13, z: 2, w: 7, d: 6, h: 3.3, wall: 'stone', open: { w: [{ c: 0.5, w: 1.3, t: 'door', closed: true }], n: [{ c: -1.6, w: 1.0, t: 'window', boarded: true }], s: [{ c: 1.5, w: 1.0, t: 'window', boarded: true }] } });
    // Campanario en ruinas (objetivo 3)
    const tx = -4, tz = -15;
    this.box(tx, 0, tz, 4.4, 0.6, 4.4, 'stone');
    this.box(tx, 0.6, tz, 4.0, 8.4, 4.0, 'stone');
    this.box(tx, 9.0, tz, 4.3, 0.35, 4.3, 'stone');
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.box(tx + sx * 1.6, 9.35, tz + sz * 1.6, 0.7, sx > 0 && sz > 0 ? 1.4 : 2.6, 0.7, 'stone');
    this.box(tx - 0.8, 11.95, tz - 1.0, 2.6, 0.5, 1.8, 'stone', { rz: 0.06 });
    this.box(tx + 0.4, 9.4, tz + 0.2, 0.9, 1.1, 0.9, 'metal', { collide: false });
    this.box(tx, 0.6, tz + 2.03, 1.3, 2.4, 0.1, 'woodDark', { collide: false });
    this.box(tx - 0.8, 0.6, tz + 2.1, 0.3, 2.7, 0.3, 'stone'); this.box(tx + 0.8, 0.6, tz + 2.1, 0.3, 2.7, 0.3, 'stone');
    this.box(tx, 3.0, tz + 2.1, 1.9, 0.35, 0.32, 'stone');
    for (let i = 0; i < 8; i++) this.rock(tx + rand(-3, 3), tz + rand(2.6, 5), rand(0.15, 0.45));
    // Capilla y cementerio
    this.house({ x: 9, z: -17, w: 6, d: 9, h: 4.2, wall: 'stone', roofH: 2.8, open: { s: [{ c: 0, w: 1.4, t: 'door', closed: true }], e: [{ c: -1.5, w: 0.8, t: 'window', boarded: true }], w: [{ c: 1.5, w: 0.8, t: 'window', boarded: true }] } });
    this.box(9, 6.6, -12.7, 1.3, 1.6, 0.45, 'stone');
    this.box(9, 8.2, -12.7, 0.12, 0.9, 0.12, 'woodDark', { collide: false }); this.box(9, 8.6, -12.7, 0.5, 0.1, 0.1, 'woodDark', { collide: false });
    for (let i = 0; i < 8; i++) this.box(1 + (i % 4) * 1.4 + rand(-0.2, 0.2), 0, -21 - Math.floor(i / 4) * 2 + rand(-0.2, 0.2), 0.55, rand(0.6, 0.95), 0.14, 'rock', { rx: rand(-0.2, 0.2), rz: rand(-0.15, 0.15) });
    // Ruinas sin tejado
    this.house({ x: -15, z: -13, w: 6, d: 5, h: 2.8, wall: 'stone', ruined: true, roof: 'none', open: { e: [{ c: 0, w: 1.4, t: 'door' }], s: [{ c: 1, w: 1.0, t: 'window' }] } });
    this.house({ x: 17, z: -8, w: 5, d: 6, h: 2.9, wall: 'plaster', ruined: true, roof: 'none', open: { w: [{ c: -0.5, w: 1.3, t: 'door' }] } });
    // Objetos sueltos
    [[5.2, 12.2], [5.9, 12.5], [-6.2, 5.4], [11.6, 9.4], [-7.5, -6], [14.5, -2.6]].forEach(([x, z], i) => this.crate(x, z, rand(0.7, 0.95), rand(0, 1)));
    this.crate(5.5, 12.3, 0.6, 0.4, 0.85);
    [[11.2, 10.4], [12.1, 10.1], [-8.4, -3.2], [-5.6, 6.2], [15.6, -3.3], [-2.2, -11.6]].forEach(([x, z]) => this.barrel(x, z));
    [[-6, 9.5], [5.6, 22.5], [-20, 22], [20, 20], [-22, -6], [21, 10], [-8, -25], [17, -24], [2, -27], [-21, 7], [22, -15], [-12, 26]].forEach(([x, z]) => this.tree(x, z));
    for (let i = 0, n = 0; i < 120 && n < 26; i++) {
      const a = rand(0, TAU), d = rand(9, 24), x = Math.cos(a) * d, z = Math.sin(a) * d;
      if ((Math.abs(x - this.pathX(z)) > 2.5 || z < 4) && this.isFree(x, z)) { this.rock(x, z, rand(0.1, 0.5)); n++; }
    }
    [[0.8, 14, 1.1, 0.6], [-0.4, 18.6, 0.8, 0.5], [1.1, 10.2, 0.7, 0.45], [3, -3, 1.3, 0.8], [-2.5, 4.5, 0.9, 0.5], [-1, -9, 1.2, 0.7], [9, -9, 1.0, 0.6]].forEach(([x, z, a, b]) => this.puddle(x, z, a, b, rand(0, 3)));
  }
  finalize() {
    for (const b of this.buckets.values()) {
      const merged = mergeGeometries(b.list, false);
      const add = (geo) => { const m = new THREE.Mesh(geo, this.mats.get(b.mat)); m.castShadow = b.cast; m.receiveShadow = true; this.scene.add(m); this.meshes.push(m); };
      if (merged) { add(merged); b.list.forEach((g) => g.dispose()); } else b.list.forEach(add);
    }
    this.buckets.clear();
    this.rayBoxes = this.boxes.concat(this.circles.map((c) => ({ minX: c.x - c.r, maxX: c.x + c.r, minY: c.minY, maxY: c.maxY, minZ: c.z - c.r, maxZ: c.z + c.r })));
    this.buildGrid();
  }

  /* ---------- Física ---------- */
  resolve(pos, r) { // empuja un círculo fuera de los colisionadores (altura de jugador); solo mira las celdas cercanas
    const G = this.grid, nb = this.nBoxes;
    for (let it = 0; it < 3; it++) {
      let moved = false;
      const cand = this.cand; cand.length = 0;
      if (G) {
        const id = this.nextStamp(), S = this.stamp, cs = G.cell;
        const ia = clamp(Math.floor((pos.x - r - G.x0) / cs), 0, G.nx - 1), ib = clamp(Math.floor((pos.x + r - G.x0) / cs), 0, G.nx - 1), ja = clamp(Math.floor((pos.z - r - G.z0) / cs), 0, G.nz - 1), jb = clamp(Math.floor((pos.z + r - G.z0) / cs), 0, G.nz - 1);
        for (let j = ja; j <= jb; j++) for (let k = ia; k <= ib; k++) { const L = G.cells[j * G.nx + k]; for (let q = 0; q < L.length; q++) { const i = L[q]; if (S[i] !== id) { S[i] = id; cand.push(i); } } }
        cand.sort((a, b) => a - b); // mismo orden que antes: cajas y después cilindros
      } else for (let i = 0; i < this.rayBoxes.length; i++) cand.push(i);
      for (let q = 0; q < cand.length; q++) {
        const i = cand[q];
        if (i < nb) {
          const b = this.boxes[i];
          if (!b.move || b.off || b.maxY < 0.35 || b.minY > 1.7) continue;
          const cx = clamp(pos.x, b.minX, b.maxX), cz = clamp(pos.z, b.minZ, b.maxZ);
          const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
          if (d2 >= r * r) continue;
          if (d2 > 1e-9) { const d = Math.sqrt(d2), k = (r - d) / d; pos.x += dx * k; pos.z += dz * k; }
          else {
            const l = pos.x - b.minX, rr = b.maxX - pos.x, t = pos.z - b.minZ, bt = b.maxZ - pos.z, m = Math.min(l, rr, t, bt);
            if (m === l) pos.x = b.minX - r; else if (m === rr) pos.x = b.maxX + r; else if (m === t) pos.z = b.minZ - r; else pos.z = b.maxZ + r;
          }
          moved = true;
        } else {
          const c = this.circles[i - nb];
          if (c.maxY < 0.35) continue;
          const dx = pos.x - c.x, dz = pos.z - c.z, rr = r + c.r, d2 = dx * dx + dz * dz;
          if (d2 >= rr * rr || d2 < 1e-9) continue;
          const d = Math.sqrt(d2), k = (rr - d) / d; pos.x += dx * k; pos.z += dz * k; moved = true;
        }
      }
      if (!moved) break;
    }
  }
  /* ---------- Rejilla espacial (4 m): rayos y colisiones solo prueban las cajas de las celdas que atraviesan ---------- */
  buildGrid(cell = 4) {
    const B = this.rayBoxes; let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const b of B) { x0 = Math.min(x0, b.minX); z0 = Math.min(z0, b.minZ); x1 = Math.max(x1, b.maxX); z1 = Math.max(z1, b.maxZ); }
    x0 -= 1; z0 -= 1; x1 += 1; z1 += 1;
    const nx = Math.max(1, Math.ceil((x1 - x0) / cell)), nz = Math.max(1, Math.ceil((z1 - z0) / cell)), cells = Array.from({ length: nx * nz }, () => []);
    B.forEach((b, i) => {
      const ia = clamp(Math.floor((b.minX - x0) / cell), 0, nx - 1), ib = clamp(Math.floor((b.maxX - x0) / cell), 0, nx - 1), ja = clamp(Math.floor((b.minZ - z0) / cell), 0, nz - 1), jb = clamp(Math.floor((b.maxZ - z0) / cell), 0, nz - 1);
      for (let j = ja; j <= jb; j++) for (let k = ia; k <= ib; k++) cells[j * nx + k].push(i);
    });
    this.grid = { x0, z0, x1: x0 + nx * cell, z1: z0 + nz * cell, cell, nx, nz, cells: cells.map((c) => Int32Array.from(c)) };
    this.stamp = new Uint32Array(B.length); this.sid = 0; this.nBoxes = this.boxes.length; this.cand = [];
  }
  nextStamp() { if (++this.sid > 4e9) { this.stamp.fill(0); this.sid = 1; } return this.sid; }
  raycast(o, d, maxT) { // distancia al primer obstáculo o Infinity; deja en hitN / hitBox / hitAxis la cara alcanzada
    const B = this.rayBoxes, G = this.grid, S = this.stamp, id = this.nextStamp();
    let best = maxT, bAx = -1, bBox = null;
    const test = (bi) => {
      if (S[bi] === id) return; S[bi] = id;
      const b = B[bi]; if (b.off) return; let t0 = 0, t1 = best, ax = -1, a, c, s;
      if (d.x > -1e-8 && d.x < 1e-8) { if (o.x < b.minX || o.x > b.maxX) return; }
      else { a = (b.minX - o.x) / d.x; c = (b.maxX - o.x) / d.x; if (a > c) { s = a; a = c; c = s; } if (a > t0) { t0 = a; ax = 0; } if (c < t1) t1 = c; if (t0 > t1) return; }
      if (d.y > -1e-8 && d.y < 1e-8) { if (o.y < b.minY || o.y > b.maxY) return; }
      else { a = (b.minY - o.y) / d.y; c = (b.maxY - o.y) / d.y; if (a > c) { s = a; a = c; c = s; } if (a > t0) { t0 = a; ax = 1; } if (c < t1) t1 = c; if (t0 > t1) return; }
      if (d.z > -1e-8 && d.z < 1e-8) { if (o.z < b.minZ || o.z > b.maxZ) return; }
      else { a = (b.minZ - o.z) / d.z; c = (b.maxZ - o.z) / d.z; if (a > c) { s = a; a = c; c = s; } if (a > t0) { t0 = a; ax = 2; } if (c < t1) t1 = c; if (t0 > t1) return; }
      if (t0 > 0 && t0 < best) { best = t0; bAx = ax; bBox = b; }
    };
    if (!G) for (let i = 0; i < B.length; i++) test(i);
    else {
      // recorta el rayo al rectángulo de la rejilla y la recorre celda a celda (DDA 2D)
      let tA = 0, tB = maxT, a, c, s;
      if (d.x > -1e-9 && d.x < 1e-9) { if (o.x < G.x0 || o.x > G.x1) tB = -1; } else { a = (G.x0 - o.x) / d.x; c = (G.x1 - o.x) / d.x; if (a > c) { s = a; a = c; c = s; } if (a > tA) tA = a; if (c < tB) tB = c; }
      if (d.z > -1e-9 && d.z < 1e-9) { if (o.z < G.z0 || o.z > G.z1) tB = -1; } else { a = (G.z0 - o.z) / d.z; c = (G.z1 - o.z) / d.z; if (a > c) { s = a; a = c; c = s; } if (a > tA) tA = a; if (c < tB) tB = c; }
      if (tA <= tB) {
        const cs = G.cell, px = o.x + d.x * tA, pz = o.z + d.z * tA;
        let ix = clamp(Math.floor((px - G.x0) / cs), 0, G.nx - 1), iz = clamp(Math.floor((pz - G.z0) / cs), 0, G.nz - 1);
        const sx = d.x > 0 ? 1 : -1, sz = d.z > 0 ? 1 : -1;
        const dX = Math.abs(d.x) > 1e-9 ? Math.abs(cs / d.x) : Infinity, dZ = Math.abs(d.z) > 1e-9 ? Math.abs(cs / d.z) : Infinity;
        let mX = Math.abs(d.x) > 1e-9 ? (G.x0 + (ix + (d.x > 0 ? 1 : 0)) * cs - o.x) / d.x : Infinity, mZ = Math.abs(d.z) > 1e-9 ? (G.z0 + (iz + (d.z > 0 ? 1 : 0)) * cs - o.z) / d.z : Infinity;
        for (let guard = 0; guard < 512; guard++) {
          const L = G.cells[iz * G.nx + ix]; for (let k = 0; k < L.length; k++) test(L[k]);
          const tn = mX < mZ ? mX : mZ;
          if (best <= tn || tn > tB) break; // ya hay impacto antes de la siguiente celda, o se acabó el rayo
          if (mX < mZ) { ix += sx; mX += dX; if (ix < 0 || ix >= G.nx) break; } else { iz += sz; mZ += dZ; if (iz < 0 || iz >= G.nz) break; }
        }
      }
    }
    if (d.y < -1e-4) { const tg = (0.02 - o.y) / d.y; if (tg > 0 && tg < best) { best = tg; bAx = 1; bBox = null; } }
    if (!this.hitN) this.hitN = new THREE.Vector3();
    this.hitBox = bBox; this.hitAxis = bAx;
    if (bAx >= 0) this.hitN.set(bAx === 0 ? -Math.sign(d.x) : 0, bAx === 1 ? (bBox ? -Math.sign(d.y) : 1) : 0, bAx === 2 ? -Math.sign(d.z) : 0);
    return best < maxT ? best : Infinity;
  }
  dispose() {
    this.meshes.forEach((m) => { m.removeFromParent(); m.geometry.dispose(); m.children.forEach((c) => c.geometry && c.geometry.dispose()); }); this.meshes = [];
    this.lights.forEach((l) => { l.L.removeFromParent(); l.L.dispose(); }); this.lights = [];
  }
}
