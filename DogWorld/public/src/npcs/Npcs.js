// NPCs del Hub (Isabel vive en la Plaza de los Portales). Coloca a cada personaje
// en un sitio libre, construye su decorado (tienda, pastelería, dojo…) y detecta
// cuándo el jugador está cerca para hablar con ellos.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { NPCS } from './NpcData.js';
import { NpcCharacter } from './NpcModel.js';
import { terrainHeight } from '../world/Terrain.js';
import { getMaterials, shadow } from '../world/Materials.js';
import { glowTexture, drawPaw, woodTexture } from '../world/Textures.js';
import { StatusSprite } from '../worlds/PortalFX.js';
import { mergeStatic } from '../world/mergeStatic.js';

const TALK_RADIUS = 3.2;

export class Npcs {
  constructor(scene, collision, fx) {
    this.fx = fx;
    this.collision = collision;
    this.group = new THREE.Group();
    this.group.name = 'NPCs';
    scene.add(this.group);
    this.list = [];
    for (const def of NPCS) {
      if (!def.spot) continue; // Isabel está en la plaza
      const spot = this.findFreeSpot(def.spot.x, def.spot.z, 2.6);
      const y = terrainHeight(spot.x, spot.z);
      const npc = new NpcCharacter(def);
      npc.root.position.set(spot.x, y, spot.z);
      // Mirando hacia la explanada central.
      npc.root.rotation.y = Math.atan2(0 - spot.x, 10 - spot.z);
      this.group.add(npc.root);
      const decor = new THREE.Group();
      decor.position.set(spot.x, y, spot.z);
      decor.rotation.y = npc.root.rotation.y;
      this.group.add(decor);
      DECOR[def.decor]?.(decor, def, this);
      mergeStatic(decor);
      collision.addCylinder(spot.x, spot.z, 0.5, y, y + 2.2);
      // Colisión del decorado detrás del personaje.
      const back = new THREE.Vector3(0, 0, -1.8).applyAxisAngle(new THREE.Vector3(0, 1, 0), decor.rotation.y);
      if (def.decor === 'shop' || def.decor === 'bakery') collision.addCylinder(spot.x + back.x, spot.z + back.z, 1.4, y, y + 1.1);

      const label = new StatusSprite(2.6);
      label.set(`${def.portrait} ${def.name}`, hexToRgba(def.color, 0.85));
      label.sprite.position.set(spot.x, y + 2.75, spot.z);
      this.group.add(label.sprite);
      // Indicador "!" para invitar a hablar.
      const bang = new StatusSprite(0.9);
      bang.set('💬', 'rgba(255,255,255,0.9)');
      bang.sprite.position.set(spot.x, y + 3.35, spot.z);
      this.group.add(bang.sprite);
      this.list.push({ def, npc, pos: new THREE.Vector3(spot.x, y, spot.z), label, bang, talked: false });
    }
  }

  /** Busca en espiral un punto sin cilindros ni cajas de colisión cerca. */
  findFreeSpot(x, z, r) {
    const ok = (px, pz) => {
      if (!Number.isFinite(terrainHeight(px, pz))) return false;
      for (const c of this.collision.cylinders) if (Math.hypot(c.x - px, c.z - pz) < c.r + r) return false;
      for (const b of this.collision.boxes) {
        if (px > b.minX - r && px < b.maxX + r && pz > b.minZ - r && pz < b.maxZ + r) return false;
      }
      return true;
    };
    for (let i = 0; i < 80; i++) {
      const a = i * 2.4;
      const d = i * 0.35;
      const px = x + Math.cos(a) * d;
      const pz = z + Math.sin(a) * d;
      if (ok(px, pz)) return { x: px, z: pz };
    }
    return { x, z };
  }

  /** NPC más cercano dentro del radio para hablar (o null). */
  nearest(pos) {
    let best = null;
    let bd = TALK_RADIUS;
    for (const n of this.list) {
      const d = Math.hypot(pos.x - n.pos.x, pos.z - n.pos.z);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  get(id) {
    return this.list.find((n) => n.def.id === id) ?? null;
  }

  update(dt, playerPos) {
    const t = performance.now() / 1000;
    for (const n of this.list) {
      const near = playerPos && n.pos.distanceTo(playerPos) < 12;
      n.npc.update(dt, near ? playerPos : null, this.fx);
      n.bang.sprite.visible = !n.talked;
      n.bang.sprite.position.y = n.pos.y + 3.35 + Math.sin(t * 3 + n.pos.x) * 0.1;
    }
    if (this.spinners) for (const s of this.spinners) s.rotation.y += dt * 0.8;
  }
}

function hexToRgba(hex, a) {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255 * 0.75)},${Math.round(c.g * 255 * 0.75)},${Math.round(c.b * 255 * 0.75)},${a})`;
}

/** Toldo de rayas para puestos. */
function stripedTexture(a, b) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 16;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? a : b;
    g.fillRect(i * 16, 0, 16, 16);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signSprite(text, color) {
  const s = new StatusSprite(3.4);
  s.set(text, color);
  return s.sprite;
}

function stall(g, colors, sign, signColor) {
  const wood = new THREE.MeshStandardMaterial({ map: woodTexture(), color: '#e8b070' });
  const counter = new THREE.Mesh(new RoundedBoxGeometry(3.2, 1.0, 1.0, 2, 0.08), wood);
  counter.position.set(0, 0.5, -1.6);
  g.add(shadow(counter));
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.8, 8), wood);
    post.position.set(sx * 1.55, 1.4, -2.0);
    g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 3.6, 16, 1, false, 0, Math.PI), new THREE.MeshStandardMaterial({ map: stripedTexture(colors[0], colors[1]), side: THREE.DoubleSide }));
  roof.rotation.z = Math.PI / 2;
  roof.position.set(0, 2.8, -1.8);
  roof.scale.set(1, 1, 0.6);
  g.add(shadow(roof));
  const s = signSprite(sign, signColor);
  s.position.set(0, 3.7, -1.8);
  g.add(s);
}

const DECOR = {
  shop(g) {
    stall(g, ['#ff8fc8', '#fff3fa'], '👗 Tienda de Cheila', 'rgba(220,60,150,0.9)');
    // Percha con accesorios de muestra.
    const colors = ['#ff6b6b', '#ffd84a', '#6fd3ff', '#7be07b', '#b47cff'];
    colors.forEach((c, i) => {
      const hat = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.34, 12), new THREE.MeshStandardMaterial({ color: c }));
      hat.position.set(-1.2 + i * 0.6, 1.22, -1.6);
      g.add(hat);
    });
    // Maniquí de perro con lazo.
    const dummy = new THREE.Mesh(new THREE.SphereGeometry(0.3, 14, 10), new THREE.MeshStandardMaterial({ color: '#f2e8dc' }));
    dummy.position.set(2.1, 0.35, -0.8);
    dummy.scale.set(1, 0.9, 1.4);
    g.add(dummy);
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.05, 8, 12), new THREE.MeshStandardMaterial({ color: '#ff4f9a' }));
    bow.position.set(2.1, 0.7, -0.6);
    g.add(bow);
  },
  bakery(g) {
    stall(g, ['#ffb36b', '#fff6e8'], '🍪 Galletas de Chalai', 'rgba(200,110,30,0.9)');
    for (let i = 0; i < 3; i++) {
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 14), new THREE.MeshPhysicalMaterial({ color: '#ffffff', transparent: true, opacity: 0.4, roughness: 0.05 }));
      jar.position.set(-1 + i, 1.25, -1.6);
      g.add(jar);
      for (let k = 0; k < 3; k++) {
        const ck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.05, 12), new THREE.MeshStandardMaterial({ color: '#d9a05a' }));
        ck.position.set(-1 + i, 1.08 + k * 0.08, -1.6);
        g.add(ck);
      }
    }
    // Galleta gigante decorativa.
    const big = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.15, 24), new THREE.MeshStandardMaterial({ color: '#d9a05a' }));
    big.rotation.x = Math.PI / 2;
    big.position.set(-2.2, 1.0, -1.2);
    g.add(big);
  },
  dojo(g) {
    const mat = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 0.06, 32), new THREE.MeshStandardMaterial({ color: '#b02a2a', roughness: 0.9 }));
    mat.position.y = 0.04;
    g.add(mat);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.05, 6, 40), getMaterials().gold);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;
    g.add(ring);
    // Muñeco de entrenamiento de madera.
    const wood = new THREE.MeshStandardMaterial({ color: '#8a5a2e' });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.8, 10), wood);
    post.position.set(-1.6, 0.9, -1.2);
    g.add(shadow(post));
    for (const y of [1.2, 0.8]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8), wood);
      arm.rotation.z = Math.PI / 2;
      arm.position.set(-1.6, y, -0.95);
      g.add(arm);
    }
    // Gong.
    const gong = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.06, 24), getMaterials().gold);
    gong.rotation.x = Math.PI / 2;
    gong.position.set(1.6, 1.2, -1.4);
    g.add(gong);
  },
  guard(g) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.6, 8), getMaterials().gold);
    pole.position.set(-1.3, 1.8, -0.6);
    g.add(pole);
    const c = document.createElement('canvas');
    c.width = 64; c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#c0302a'; ctx.fillRect(0, 0, 64, 128);
    ctx.fillStyle = '#ffcf4a'; ctx.beginPath(); ctx.arc(32, 50, 18, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c0302a'; ctx.beginPath(); ctx.arc(32, 52, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffcf4a'; ctx.fillRect(26, 66, 12, 34);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.8), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide }));
    flag.position.set(-0.85, 2.6, -0.6);
    g.add(flag);
    // Pedestal de los Huesos Dorados.
    const ped = new THREE.Mesh(new RoundedBoxGeometry(0.9, 1.0, 0.9, 2, 0.08), getMaterials().stoneRough);
    ped.position.set(1.4, 0.5, -0.6);
    g.add(shadow(ped));
    const bone = new THREE.Group();
    const gold = getMaterials().gold;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.6, 10), gold);
    shaft.rotation.z = Math.PI / 2;
    bone.add(shaft);
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
      const k = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), gold);
      k.position.set(sx * 0.32, sy * 0.08, 0);
      bone.add(k);
    }
    bone.position.set(1.4, 1.35, -0.6);
    bone.traverse((o) => { o.userData.dynamic = true; });
    g.add(bone);
  },
  pixel(g) {
    // Farol de bloques y perro de bloques (compañero de PixelHugo).
    const wood = new THREE.MeshStandardMaterial({ color: '#9a6a3a', flatShading: true });
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.6, 0.3), wood);
    post.position.set(-1.4, 1.3, -0.6);
    g.add(post);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 0.2), wood);
    arm.position.set(-1.05, 2.5, -0.6);
    g.add(arm);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.35), new THREE.MeshStandardMaterial({ color: '#ffd27a', emissive: '#ffb020', emissiveIntensity: 1.2 }));
    lamp.position.set(-0.7, 2.2, -0.6);
    g.add(lamp);
    const fur = new THREE.MeshStandardMaterial({ color: '#c9c9c9', flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2a2a' });
    const red = new THREE.MeshStandardMaterial({ color: '#c0302a' });
    const box = (w, h, d, x, y, z, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); g.add(b); };
    const dx = 1.2, dz = 0.6;
    box(0.5, 0.4, 0.8, dx, 0.55, dz, fur);
    box(0.45, 0.45, 0.45, dx, 0.9, dz + 0.5, fur);
    box(0.25, 0.18, 0.2, dx, 0.82, dz + 0.8, fur);
    box(0.08, 0.08, 0.02, dx - 0.1, 0.98, dz + 0.73, dark);
    box(0.08, 0.08, 0.02, dx + 0.1, 0.98, dz + 0.73, dark);
    box(0.1, 0.18, 0.08, dx - 0.15, 1.2, dz + 0.45, fur);
    box(0.1, 0.18, 0.08, dx + 0.15, 1.2, dz + 0.45, fur);
    box(0.5, 0.08, 0.1, dx, 0.72, dz + 0.32, red);
    for (const [x, z] of [[-0.15, -0.25], [0.15, -0.25], [-0.15, 0.25], [0.15, 0.25]]) box(0.14, 0.35, 0.14, dx + x, 0.18, dz + z, fur);
  },
  magic(g, def, mgr) {
    const red = new THREE.MeshStandardMaterial({ color: '#ff5a7a', emissive: '#ff2050', emissiveIntensity: 0.8, roughness: 0.2 });
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), red);
      c.scale.set(0.7, 1.6, 0.7);
      c.position.set(Math.cos(a) * 1.8, 0.35, Math.sin(a) * 1.8);
      g.add(c);
    }
    const moon = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.12, 10, 24, Math.PI * 1.35), new THREE.MeshStandardMaterial({ color: '#ffd84a', emissive: '#ffb020', emissiveIntensity: 0.9 }));
    moon.position.set(0, 3.5, -0.6);
    moon.rotation.z = 0.9;
    moon.userData.dynamic = true;
    g.add(moon);
    (mgr.spinners ||= []).push(moon);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ff6a8a', transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending }));
    glow.scale.setScalar(2.4);
    glow.position.set(0, 3.5, -0.6);
    g.add(glow);
  },
};

export { drawPaw };
