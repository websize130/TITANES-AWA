// Vida en el escenario: macizos de flores con pétalos y mariposas que revolotean.
// Todo instanciado (pocas draw calls) y determinista (mismo mundo para todos).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mulberry32 } from './Textures.js';

const FLOWER_COLORS = ['#ffffff', '#ffd84a', '#ff8fc8', '#b47cff', '#6fc3ff', '#ff7a5a', '#fff2a8'].map((c) => new THREE.Color(c));
const BUTTERFLY_COLORS = ['#ff8fc8', '#ffd84a', '#6fd3ff', '#ffa94d', '#c78bff', '#ffffff'].map((c) => new THREE.Color(c));

/**
 * Flores en macizos. sample(rnd) -> {x, y, z} | null (posición válida en el suelo).
 */
export function buildFlowerPatches(sample, count, seed = 9) {
  const rnd = mulberry32(seed);
  const petals = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const p = new THREE.SphereGeometry(1, 8, 6);
    p.scale(0.07, 0.018, 0.04);
    p.translate(0.065, 0, 0);
    p.rotateY(a);
    petals.push(p.toNonIndexed());
  }
  const petalGeo = mergeGeometries(petals);
  const centerGeo = new THREE.SphereGeometry(0.035, 8, 6);
  centerGeo.scale(1, 0.6, 1);
  const stemGeo = new THREE.CylinderGeometry(0.008, 0.01, 1, 4);
  stemGeo.translate(0, -0.5, 0);

  const petalsMesh = new THREE.InstancedMesh(petalGeo, new THREE.MeshStandardMaterial({ roughness: 0.55, emissive: '#2a1a2a', emissiveIntensity: 0.15, side: THREE.DoubleSide }), count);
  const centers = new THREE.InstancedMesh(centerGeo, new THREE.MeshStandardMaterial({ color: '#ffb020', roughness: 0.6, emissive: '#5a3000', emissiveIntensity: 0.2 }), count);
  const stems = new THREE.InstancedMesh(stemGeo, new THREE.MeshLambertMaterial({ color: '#3f8a2a' }), count);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const e = new THREE.Euler();
  let n = 0;
  for (let tries = 0; n < count && tries < count * 3;) {
    // Centro del macizo y flores alrededor (todas del mismo color o dos colores).
    const c = sample(rnd);
    tries++;
    if (!c) continue;
    const colA = FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)];
    const colB = FLOWER_COLORS[Math.floor(rnd() * FLOWER_COLORS.length)];
    const k = 8 + Math.floor(rnd() * 14);
    for (let j = 0; j < k && n < count; j++) {
      const a = rnd() * Math.PI * 2;
      const r = Math.sqrt(rnd()) * 1.6;
      const x = c.x + Math.cos(a) * r;
      const z = c.z + Math.sin(a) * r;
      const y = c.yAt ? c.yAt(x, z) : c.y;
      if (!Number.isFinite(y)) continue;
      const h = 0.18 + rnd() * 0.22;
      const sc = 1.3 + rnd() * 0.9;
      e.set((rnd() - 0.5) * 0.4, rnd() * Math.PI, (rnd() - 0.5) * 0.4);
      q.setFromEuler(e);
      p.set(x, y + h, z);
      s.setScalar(sc);
      petalsMesh.setMatrixAt(n, m.compose(p, q, s));
      centers.setMatrixAt(n, m);
      s.set(1, h, 1);
      stems.setMatrixAt(n, m.compose(p, q, s));
      petalsMesh.setColorAt(n, rnd() < 0.7 ? colA : colB);
      n++;
    }
  }
  for (const im of [petalsMesh, centers, stems]) {
    im.count = n;
    im.frustumCulled = false;
    im.receiveShadow = true;
  }
  const group = new THREE.Group();
  group.name = 'Flowers';
  group.add(stems, petalsMesh, centers);
  return group;
}

/** Mariposas que revolotean alrededor de puntos de interés. */
export class Butterflies {
  constructor(homes, count = 30, seed = 4) {
    const rnd = mulberry32(seed);
    const wing = new THREE.CircleGeometry(0.16, 10);
    wing.scale(1, 0.7, 1);
    wing.translate(0.15, 0.03, 0);
    const lower = new THREE.CircleGeometry(0.1, 8);
    lower.translate(0.1, -0.08, 0);
    const geoR = mergeGeometries([wing.toNonIndexed(), lower.toNonIndexed()]);
    geoR.rotateX(-Math.PI / 2);
    const geoL = geoR.clone();
    geoL.scale(-1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.5, emissive: '#331a33', emissiveIntensity: 0.25 });
    this.right = new THREE.InstancedMesh(geoR, mat, count);
    this.left = new THREE.InstancedMesh(geoL, mat, count);
    this.list = [];
    for (let i = 0; i < count; i++) {
      const home = homes[Math.floor(rnd() * homes.length)];
      const col = BUTTERFLY_COLORS[Math.floor(rnd() * BUTTERFLY_COLORS.length)];
      this.right.setColorAt(i, col);
      this.left.setColorAt(i, col);
      this.list.push({ home, phase: rnd() * 100, speed: 0.4 + rnd() * 0.5, radius: 1.5 + rnd() * 3, flap: 14 + rnd() * 8, h: 0.6 + rnd() * 1.6 });
    }
    for (const im of [this.right, this.left]) im.frustumCulled = false;
    this.group = new THREE.Group();
    this.group.name = 'Butterflies';
    this.group.add(this.right, this.left);
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._qw = new THREE.Quaternion();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
    this._e = new THREE.Euler();
    this._ax = new THREE.Vector3(0, 0, 1);
  }

  update(t) {
    const { _m, _q, _qw, _p, _s, _e, _ax } = this;
    for (let i = 0; i < this.list.length; i++) {
      const b = this.list[i];
      const tt = t * b.speed + b.phase;
      // Trayectoria en "ocho" con altibajos.
      const x = b.home.x + Math.sin(tt) * b.radius;
      const z = b.home.z + Math.sin(tt * 2) * b.radius * 0.5;
      const y = b.home.y + b.h + Math.sin(tt * 3.1) * 0.35;
      const dx = Math.cos(tt) * b.radius;
      const dz = Math.cos(tt * 2) * b.radius;
      _e.set(0, Math.atan2(dx, dz), 0);
      _q.setFromEuler(_e);
      _p.set(x, y, z);
      const flap = Math.sin(t * b.flap + b.phase) * 0.9;
      _qw.setFromAxisAngle(_ax, flap).premultiply(_q);
      this.right.setMatrixAt(i, _m.compose(_p, _qw, _s));
      _qw.setFromAxisAngle(_ax, -flap).premultiply(_q);
      this.left.setMatrixAt(i, _m.compose(_p, _qw, _s));
    }
    this.right.instanceMatrix.needsUpdate = true;
    this.left.instanceMatrix.needsUpdate = true;
  }
}
