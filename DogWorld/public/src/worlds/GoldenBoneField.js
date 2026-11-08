// Huesos Dorados de una zona: pilar de piedra + hueso dorado giratorio con halo.
// Se ocultan los que el jugador ya tiene en su álbum.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { GOLDEN_BONES } from './GoldenBones.js';
import { getMaterials } from '../world/Materials.js';
import { glowTexture } from '../world/Textures.js';

const PICK_RADIUS = 1.4;

function boneMesh() {
  const g = new THREE.Group();
  const gold = new THREE.MeshStandardMaterial({ color: '#ffd24a', metalness: 0.95, roughness: 0.15, emissive: '#ff9a00', emissiveIntensity: 0.6 });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1.1, 12), gold);
  shaft.rotation.z = Math.PI / 2;
  g.add(shaft);
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const k = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 10), gold);
    k.position.set(sx * 0.58, sy * 0.16, 0);
    g.add(k);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

export class GoldenBoneField {
  /** heightFn(x, z) -> altura del suelo en ese punto. */
  constructor(zone, scene, collision, heightFn, wallet) {
    this.wallet = wallet;
    this.group = new THREE.Group();
    this.group.name = 'GoldenBones';
    scene.add(this.group);
    this.items = [];
    const M = getMaterials();
    for (const b of GOLDEN_BONES) {
      if (b.zone !== zone) continue;
      const y0 = heightFn(b.x, b.z);
      const top = y0 + b.pillar;
      const pillar = new THREE.Mesh(new RoundedBoxGeometry(1.3, b.pillar + 0.6, 1.3, 2, 0.12), M.stoneRough);
      pillar.position.set(b.x, y0 + (b.pillar - 0.6) / 2, b.z);
      pillar.castShadow = true;
      pillar.receiveShadow = true;
      const trim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 24), M.gold);
      trim.rotation.x = Math.PI / 2;
      trim.position.set(b.x, top + 0.02, b.z);
      collision.addBox(b.x - 0.65, y0 - 0.6, b.z - 0.65, b.x + 0.65, top, b.z + 0.65);
      const bone = boneMesh();
      bone.position.set(b.x, top + 1.1, b.z);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: '#ffd84a', transparent: true, opacity: 0.75, depthWrite: false, blending: THREE.AdditiveBlending }));
      glow.scale.setScalar(3.2);
      glow.position.copy(bone.position);
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 18, 12, 1, true), new THREE.MeshBasicMaterial({
        color: '#ffd84a', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }));
      beam.position.set(b.x, top + 9, b.z);
      this.group.add(pillar, trim, bone, glow, beam);
      this.items.push({ def: b, bone, glow, beam, top, pending: false });
    }
    this.refresh();
  }

  /** Oculta los huesos que ya están en el álbum del jugador. */
  refresh() {
    for (const it of this.items) {
      const have = this.wallet.hasGolden(it.def.id);
      it.bone.visible = !have && !it.pending;
      it.glow.visible = it.bone.visible;
      it.beam.visible = it.bone.visible;
    }
  }

  /** Devuelve el hueso tocado este frame (o null). */
  update(dt, t, pos) {
    let touched = null;
    for (const it of this.items) {
      if (!it.bone.visible) continue;
      it.bone.rotation.y = t * 1.8 + it.def.id;
      it.bone.position.y = it.top + 1.1 + Math.sin(t * 2.2 + it.def.id) * 0.15;
      it.glow.position.y = it.bone.position.y;
      it.glow.material.opacity = 0.6 + Math.sin(t * 3) * 0.15;
      if (pos && Math.hypot(pos.x - it.def.x, pos.z - it.def.z) < PICK_RADIUS && Math.abs(pos.y + 0.5 - it.bone.position.y) < 1.6) {
        it.pending = true;
        touched = it.def;
      }
    }
    if (touched) this.refresh();
    return touched;
  }
}
