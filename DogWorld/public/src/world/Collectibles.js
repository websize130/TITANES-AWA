// Huesos dorados coleccionables (InstancedMesh: una draw call para todos).
// El servidor es la autoridad: el cliente predice la recogida y el servidor confirma.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { NET } from '../net/protocol.js';
import { terrainHeight, pathX } from './Terrain.js';
import { glowTexture } from './Textures.js';

const PICKUP_RADIUS = 1.3;
const HIDDEN = new THREE.Matrix4().makeScale(0, 0, 0);

function boneGeometry() {
  const shaft = new THREE.CylinderGeometry(0.13, 0.13, 0.9, 10);
  shaft.rotateZ(Math.PI / 2);
  const parts = [shaft];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const knob = new THREE.SphereGeometry(0.2, 12, 8);
      knob.translate(sx * 0.47, sy * 0.13, 0);
      parts.push(knob);
    }
  }
  // Las esferas y el cilindro no comparten índices/uv idénticos: normalizamos a no indexado.
  return mergeGeometries(parts.map((g) => g.toNonIndexed()));
}

export class Collectibles {
  constructor(platforms, collision) {
    this.positions = buildLayout(platforms, collision);
    this.count = this.positions.length;
    this.active = new Uint8Array(this.count).fill(1);
    this.pending = new Uint8Array(this.count); // recogido localmente, a la espera del servidor
    this.onCollect = null; // (id) => void

    const mat = new THREE.MeshStandardMaterial({
      color: '#ffcf4a', metalness: 0.9, roughness: 0.22, emissive: '#ff9d00', emissiveIntensity: 0.45,
    });
    this.mesh = new THREE.InstancedMesh(boneGeometry(), mat, this.count);
    this.mesh.castShadow = true;
    this.mesh.frustumCulled = false;

    // Halo brillante bajo cada hueso.
    const haloPos = new Float32Array(this.count * 3);
    this.positions.forEach((p, i) => p.toArray(haloPos, i * 3));
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
    this.halos = new THREE.Points(haloGeo, new THREE.PointsMaterial({
      map: glowTexture(), color: '#ffd76a', size: 2.4, transparent: true, opacity: 0.55,
      depthWrite: false, blending: THREE.AdditiveBlending,
    }));

    this.group = new THREE.Group();
    this.group.name = 'Collectibles';
    this.group.add(this.mesh, this.halos);

    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3(1, 1, 1);
  }

  /** Estado inicial enviado por el servidor al entrar en la sala. */
  setCollected(ids) {
    this.active.fill(1);
    this.pending.fill(0);
    for (const id of ids) if (id >= 0 && id < this.count) this.active[id] = 0;
    this.refreshHalos();
  }

  confirmCollected(id) {
    if (id < 0 || id >= this.count) return;
    this.active[id] = 0;
    this.pending[id] = 0;
    this.refreshHalos();
  }

  respawn(id) {
    if (id < 0 || id >= this.count) return;
    this.active[id] = 1;
    this.pending[id] = 0;
    this.refreshHalos();
  }

  refreshHalos() {
    const attr = this.halos.geometry.attributes.position;
    for (let i = 0; i < this.count; i++) {
      const p = this.positions[i];
      attr.setXYZ(i, p.x, this.active[i] && !this.pending[i] ? p.y : -9999, p.z);
    }
    attr.needsUpdate = true;
  }

  update(t, playerPos) {
    for (let i = 0; i < this.count; i++) {
      if (!this.active[i] || this.pending[i]) {
        this.mesh.setMatrixAt(i, HIDDEN);
        continue;
      }
      const p = this.positions[i];
      this._e.set(0.35, t * 2.2 + i, 0.2);
      this._q.setFromEuler(this._e);
      this._p.set(p.x, p.y + Math.sin(t * 2.5 + i * 0.7) * 0.18, p.z);
      this.mesh.setMatrixAt(i, this._m.compose(this._p, this._q, this._s));

      if (playerPos) {
        const dx = playerPos.x - p.x;
        const dy = playerPos.y + 0.5 - p.y;
        const dz = playerPos.z - p.z;
        if (dx * dx + dy * dy + dz * dz < PICKUP_RADIUS * PICKUP_RADIUS) {
          this.pending[i] = 1;
          this.refreshHalos();
          this.onCollect?.(i);
        }
      }
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

function buildLayout(platforms, collision) {
  const pts = [];
  // Altura = superficie más alta en (x, z): terreno, plataformas, vigas o puente.
  const add = (x, z, y) => pts.push(new THREE.Vector3(x, (y ?? collision.groundHeight(x, z, 1000, 0)) + 1.0, z));

  // Sobre las plataformas fijas (las 11 primeras).
  for (let i = 0; i < Math.min(platforms.length - 1, 11); i++) {
    const p = platforms[i];
    add(p.x, p.z, p.top);
  }
  // Viga de las ruinas.
  add(-12, 12);
  // A lo largo del camino.
  for (const z of [10, -2, -16, -28, -42]) add(pathX(z), z);
  // Por el césped.
  for (const [x, z] of [[-16, -4], [18, 12], [-30, 18], [30, -16], [-24, -38], [6, 34]]) add(x, z);
  // En el puente.
  add(0, -66);

  // Rellenar / recortar hasta COLLECTIBLE_COUNT para coincidir con el servidor.
  let k = 0;
  while (pts.length < NET.COLLECTIBLE_COUNT) {
    const a = k * 2.399;
    const r = 14 + (k % 5) * 6;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    add(x, z, terrainHeight(x, z));
    k++;
  }
  return pts.slice(0, NET.COLLECTIBLE_COUNT);
}
