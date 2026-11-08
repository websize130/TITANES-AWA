// Objetos compartidos que las habilidades modifican: rocas con tesoro (Tyson),
// montículos (Digger), pedruscos (Goliath) y plataformas de hielo (Blizzard).
// El estado lo decide el servidor; aquí solo se representa y se colisiona.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ROCKS, DIG_SPOTS, BOULDERS, INTERACT } from './InteractableLayout.js';
import { terrainHeight } from './Terrain.js';
import { getMaterials } from './Materials.js';
import { mulberry32, glowTexture, rockNoiseTexture } from './Textures.js';

const ICE_POOL = 8;
const BOULDER_SIZE = 1.5;

export class Interactables {
  constructor(scene, collision, fx) {
    this.collision = collision;
    this.fx = fx;
    this.group = new THREE.Group();
    this.group.name = 'Interactables';
    scene.add(this.group);
    const M = getMaterials();
    const rnd = mulberry32(555);

    // ---------------- Rocas agrietadas ----------------
    const crackMat = new THREE.MeshStandardMaterial({
      color: '#8f7a92', roughness: 0.9, bumpMap: rockNoiseTexture(), bumpScale: 2,
      emissive: '#ffb020', emissiveIntensity: 0.0,
    });
    this.crackMat = crackMat;
    this.rocks = ROCKS.map((r, i) => {
      const y = terrainHeight(r.x, r.z);
      const parts = [];
      for (let k = 0; k < 5; k++) {
        const s = 0.55 + rnd() * 0.4;
        const g = new THREE.DodecahedronGeometry(s, 0);
        g.translate((rnd() - 0.5) * 1.3, s * 0.7 + (k > 2 ? 0.6 : 0), (rnd() - 0.5) * 1.3);
        parts.push(g);
      }
      const mesh = new THREE.Mesh(mergeGeometries(parts), crackMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.position.set(r.x, y, r.z);
      // Grietas doradas: brillo del tesoro que se escapa entre las rocas.
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture(), color: '#ffcf4a', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      glow.scale.setScalar(2.4);
      glow.position.y = 0.9;
      mesh.add(glow);
      const rubble = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.3, 0.25, 9), M.rock);
      rubble.position.set(r.x, y + 0.1, r.z);
      rubble.visible = false;
      this.group.add(mesh, rubble);
      const col = collision.addCylinder(r.x, r.z, 1.25, y - 1, y + 1.7);
      return { ...r, y, mesh, rubble, col, glow, broken: false, colMaxY: y + 1.7, colMinY: y - 1, i };
    });

    // ---------------- Montículos de tierra ----------------
    const dirtMat = new THREE.MeshStandardMaterial({ color: '#7a5233', roughness: 1, bumpMap: rockNoiseTexture(), bumpScale: 1 });
    const holeMat = new THREE.MeshBasicMaterial({ color: '#2a1a10' });
    this.digs = DIG_SPOTS.map((d) => {
      const y = terrainHeight(d.x, d.z);
      const mound = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), dirtMat);
      mound.scale.set(1, 0.45, 1);
      mound.position.set(d.x, y - 0.05, d.z);
      mound.receiveShadow = true;
      // Marca en forma de X (tesoro enterrado).
      const xGeo = mergeGeometries([new THREE.BoxGeometry(0.9, 0.04, 0.14), new THREE.BoxGeometry(0.14, 0.04, 0.9)]);
      xGeo.rotateY(Math.PI / 4);
      const mark = new THREE.Mesh(xGeo, new THREE.MeshStandardMaterial({ color: '#f2d27a', emissive: '#c08a1a', emissiveIntensity: 0.4 }));
      mark.position.set(d.x, y + 0.38, d.z);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTexture(), color: '#9dff7a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      glow.position.set(d.x, y + 0.8, d.z);
      glow.scale.setScalar(3);
      const hole = new THREE.Mesh(new THREE.CircleGeometry(0.6, 16).rotateX(-Math.PI / 2), holeMat);
      hole.position.set(d.x, y + 0.04, d.z);
      hole.visible = false;
      this.group.add(mound, mark, glow, hole);
      return { ...d, y, mound, mark, glow, hole, dug: false };
    });

    // ---------------- Pedruscos ----------------
    const boulderGeo = new THREE.DodecahedronGeometry(BOULDER_SIZE * 0.62, 1);
    const pos = boulderGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const n = 1 + Math.sin(pos.getX(i) * 5) * 0.05 + Math.cos(pos.getZ(i) * 6) * 0.05;
      pos.setXYZ(i, pos.getX(i) * n, pos.getY(i) * n * 0.9, pos.getZ(i) * n);
    }
    boulderGeo.computeVertexNormals();
    const boulderMat = new THREE.MeshStandardMaterial({ color: '#b39a8a', roughness: 0.9, bumpMap: rockNoiseTexture(), bumpScale: 2 });
    this.boulders = BOULDERS.map((b) => {
      const mesh = new THREE.Mesh(boulderGeo, boulderMat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const y = terrainHeight(b.x, b.z);
      const half = BOULDER_SIZE / 2;
      const col = collision.addBox(b.x - half, y - 0.5, b.z - half, b.x + half, y + BOULDER_SIZE * 0.95, b.z + half);
      this.group.add(mesh);
      const o = { mesh, col, holder: 0, x: b.x, y, z: b.z };
      this.placeBoulder(o, b.x, y, b.z);
      return o;
    });

    // ---------------- Plataformas de hielo (pool) ----------------
    const iceMat = new THREE.MeshPhysicalMaterial({
      color: '#bdefff', emissive: '#4fc3ff', emissiveIntensity: 0.35, roughness: 0.08, metalness: 0,
      transparent: true, opacity: 0.82, clearcoat: 1, clearcoatRoughness: 0.05,
    });
    const iceGeo = new THREE.CylinderGeometry(1.5, 1.1, 0.5, 7);
    this.ice = [];
    for (let i = 0; i < ICE_POOL; i++) {
      const mesh = new THREE.Mesh(iceGeo, iceMat);
      mesh.visible = false;
      mesh.castShadow = true;
      this.group.add(mesh);
      const col = collision.addBox(0, -1000, 0, 0, -1000, 0);
      this.ice.push({ mesh, col, life: 0 });
    }
    this.iceCursor = 0;

    this.time = 0;
  }

  // ------------------------------------------------------------------ estado
  applyState(objects) {
    if (!objects) return;
    objects.rocks?.forEach((s, i) => this.setRock(i, s, true));
    objects.digs?.forEach((s, i) => this.setDig(i, s, true));
    objects.boulders?.forEach((s, i) => this.setBoulder(i, s));
  }

  resetLocal() {
    this.rocks.forEach((_, i) => this.setRock(i, 0, true));
    this.digs.forEach((_, i) => this.setDig(i, 0, true));
    BOULDERS.forEach((b, i) => this.setBoulder(i, [b.x, null, b.z, 0]));
  }

  setRock(i, broken, silent = false) {
    const r = this.rocks[i];
    if (!r) return;
    const was = r.broken;
    r.broken = Boolean(broken);
    r.mesh.visible = !r.broken;
    r.rubble.visible = r.broken;
    r.col.maxY = r.broken ? -1000 : r.colMaxY;
    r.col.minY = r.broken ? -1001 : r.colMinY;
    if (!silent && r.broken && !was && this.fx) {
      this.fx.emit('rubble', r.x, r.y + 1, r.z);
      this.fx.emit('gold', r.x, r.y + 1.2, r.z);
    }
  }

  setDig(i, dug, silent = false) {
    const d = this.digs[i];
    if (!d) return;
    const was = d.dug;
    d.dug = Boolean(dug);
    d.mound.visible = !d.dug;
    d.mark.visible = !d.dug;
    d.hole.visible = d.dug;
    if (!silent && d.dug && !was && this.fx) {
      this.fx.emit('dirt', d.x, d.y + 0.4, d.z, null, 4);
      this.fx.emit('gold', d.x, d.y + 0.8, d.z);
    }
  }

  /** s = [x, y|null, z, holderId] */
  setBoulder(i, s) {
    const b = this.boulders[i];
    if (!b || !Array.isArray(s)) return;
    b.holder = s[3] || 0;
    if (!b.holder) {
      const y = s[1] == null ? terrainHeight(s[0], s[2]) : s[1];
      this.placeBoulder(b, s[0], Number.isFinite(y) ? y : 0, s[2]);
    } else {
      b.col.maxY = -1000;
      b.col.minY = -1001;
    }
  }

  placeBoulder(b, x, y, z) {
    const half = BOULDER_SIZE / 2;
    b.x = x; b.y = y; b.z = z;
    b.mesh.position.set(x, y + BOULDER_SIZE * 0.45, z);
    b.mesh.rotation.set(0, (x + z) * 0.7, 0);
    b.col.minX = x - half; b.col.maxX = x + half;
    b.col.minZ = z - half; b.col.maxZ = z + half;
    b.col.minY = y - 0.5; b.col.maxY = y + BOULDER_SIZE * 0.95;
  }

  /** Crea una plataforma de hielo (todos los clientes calculan lo mismo a partir del evento). */
  spawnIce(px, py, pz, yaw) {
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    const x = px + fx * 3.2;
    const z = pz + fz * 3.2;
    const top = py - 0.15;
    const slot = this.ice[this.iceCursor];
    this.iceCursor = (this.iceCursor + 1) % ICE_POOL;
    slot.life = INTERACT.ICE_LIFETIME;
    slot.mesh.visible = true;
    slot.mesh.position.set(x, top - 0.25, z);
    slot.mesh.scale.setScalar(0.1);
    slot.col.minX = x - 1.35; slot.col.maxX = x + 1.35;
    slot.col.minZ = z - 1.35; slot.col.maxZ = z + 1.35;
    slot.col.minY = top - 0.5; slot.col.maxY = top;
    if (this.fx) this.fx.emit('frost', x, top, z);
  }

  // --------------------------------------------------------------- consultas
  nearestRock(x, z, range) {
    let best = -1; let bd = range;
    this.rocks.forEach((r, i) => {
      if (r.broken) return;
      const d = Math.hypot(r.x - x, r.z - z);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  nearestDig(x, z, range) {
    let best = -1; let bd = range;
    this.digs.forEach((d, i) => {
      if (d.dug) return;
      const dd = Math.hypot(d.x - x, d.z - z);
      if (dd < bd) { bd = dd; best = i; }
    });
    return best;
  }

  nearestBoulder(x, z, range) {
    let best = -1; let bd = range;
    this.boulders.forEach((b, i) => {
      if (b.holder) return;
      const d = Math.hypot(b.x - x, b.z - z);
      if (d < bd) { bd = d; best = i; }
    });
    return best;
  }

  heldBy(playerId) {
    return this.boulders.findIndex((b) => b.holder === playerId);
  }

  /** Objetivos que revela el Súper Olfato. */
  forEachScentTarget(cb) {
    for (const r of this.rocks) if (!r.broken) cb(r.x, r.y + 1, r.z);
    for (const d of this.digs) if (!d.dug) cb(d.x, d.y + 0.5, d.z);
  }

  // ---------------------------------------------------------------- bucle
  /** getAvatarRoot(id) -> Object3D del portador para colocar el pedrusco encima. */
  update(dt, getAvatar, sniffActive) {
    this.time += dt;
    const t = this.time;
    for (const r of this.rocks) {
      if (!r.broken) r.glow.material.opacity = 0.35 + Math.sin(t * 3 + r.x) * 0.15 + (sniffActive ? 0.35 : 0);
    }
    for (const d of this.digs) {
      const target = sniffActive && !d.dug ? 0.85 : 0;
      d.glow.material.opacity += (target - d.glow.material.opacity) * Math.min(1, dt * 4);
      if (!d.dug) d.mark.rotation.y = Math.sin(t * 1.5 + d.x) * 0.1;
    }
    for (const b of this.boulders) {
      if (!b.holder) continue;
      const av = getAvatar(b.holder);
      if (!av) continue;
      const root = av.root;
      b.mesh.position.set(root.position.x, root.position.y + av.height + BOULDER_SIZE * 0.35, root.position.z);
      b.mesh.rotation.y = root.rotation.y;
      b.x = root.position.x; b.z = root.position.z;
    }
    for (const ice of this.ice) {
      if (ice.life <= 0) continue;
      ice.life -= dt;
      const grow = Math.min(1, (INTERACT.ICE_LIFETIME - ice.life) * 6);
      const fade = ice.life < 1 ? ice.life : 1;
      ice.mesh.scale.set(grow * fade, grow, grow * fade);
      if (ice.life <= 0) {
        ice.mesh.visible = false;
        ice.col.minY = -1001;
        ice.col.maxY = -1000;
      }
    }
  }
}
