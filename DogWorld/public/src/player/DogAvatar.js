// Perro estilizado procedural (cuerpo, cabeza, orejas, cola, patas) con animación por código.
// Sustituible por un GLB con esqueleto (GLTFLoader + AnimationMixer) manteniendo la API.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ANIM } from '../net/protocol.js';

const sharedGeo = {};
function geo(key, make) {
  if (!sharedGeo[key]) sharedGeo[key] = make();
  return sharedGeo[key];
}

export class DogAvatar {
  constructor(furColor = '#f4b860') {
    this.root = new THREE.Group();
    this.root.name = 'Dog';
    this.anim = ANIM.IDLE;
    this.speed01 = 0;
    this.phase = 0;
    this.barkTimer = 0;

    const fur = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.75 });
    const furLight = new THREE.MeshStandardMaterial({ color: new THREE.Color(furColor).lerp(new THREE.Color('#fff8ec'), 0.6), roughness: 0.8 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2b1d17', roughness: 0.4 });
    const collar = new THREE.MeshStandardMaterial({ color: '#7a3cc8', roughness: 0.5, emissive: '#3a1070', emissiveIntensity: 0.3 });
    const tag = new THREE.MeshStandardMaterial({ color: '#ffcf4a', metalness: 0.9, roughness: 0.25 });
    this.materials = [fur, furLight, dark, collar, tag];

    // Pivote para inclinarse/saltar sin mover la raíz (la raíz es la posición de red).
    this.body = new THREE.Group();
    this.root.add(this.body);

    const torso = new THREE.Mesh(geo('torso', () => new RoundedBoxGeometry(0.62, 0.55, 1.0, 3, 0.24)), fur);
    torso.position.set(0, 0.62, 0);
    this.body.add(torso);
    const belly = new THREE.Mesh(geo('belly', () => new RoundedBoxGeometry(0.5, 0.3, 0.8, 2, 0.14)), furLight);
    belly.position.set(0, 0.47, 0.02);
    this.body.add(belly);

    // Cabeza.
    this.head = new THREE.Group();
    this.head.position.set(0, 0.98, 0.5);
    this.body.add(this.head);
    const skull = new THREE.Mesh(geo('skull', () => new RoundedBoxGeometry(0.56, 0.5, 0.52, 3, 0.22)), fur);
    this.head.add(skull);
    const snout = new THREE.Mesh(geo('snout', () => new RoundedBoxGeometry(0.32, 0.24, 0.3, 2, 0.1)), furLight);
    snout.position.set(0, -0.08, 0.33);
    this.head.add(snout);
    const nose = new THREE.Mesh(geo('nose', () => new THREE.SphereGeometry(0.07, 10, 8)), dark);
    nose.position.set(0, -0.02, 0.49);
    this.head.add(nose);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(geo('eye', () => new THREE.SphereGeometry(0.055, 10, 8)), dark);
      eye.position.set(sx * 0.13, 0.07, 0.26);
      this.head.add(eye);
      const shine = new THREE.Mesh(geo('shine', () => new THREE.SphereGeometry(0.018, 6, 4)), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      shine.position.set(sx * 0.13 + 0.02, 0.095, 0.305);
      this.head.add(shine);
    }
    this.ears = [];
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(geo('ear', () => {
        const g = new RoundedBoxGeometry(0.16, 0.34, 0.08, 2, 0.04);
        g.translate(0, -0.15, 0);
        return g;
      }), fur);
      ear.position.set(sx * 0.27, 0.2, -0.02);
      ear.rotation.z = sx * 0.35;
      this.head.add(ear);
      this.ears.push(ear);
    }
    const collarMesh = new THREE.Mesh(geo('collar', () => new THREE.TorusGeometry(0.24, 0.05, 6, 16)), collar);
    collarMesh.position.set(0, 0.8, 0.43);
    collarMesh.rotation.x = Math.PI / 2 - 0.5;
    this.body.add(collarMesh);
    const tagMesh = new THREE.Mesh(geo('tag', () => new THREE.CylinderGeometry(0.06, 0.06, 0.02, 10)), tag);
    tagMesh.position.set(0, 0.62, 0.62);
    tagMesh.rotation.x = Math.PI / 2;
    this.body.add(tagMesh);

    // Patas (pivote en la cadera).
    this.legs = [];
    const legGeo = geo('leg', () => {
      const g = new RoundedBoxGeometry(0.17, 0.42, 0.18, 2, 0.07);
      g.translate(0, -0.18, 0);
      return g;
    });
    for (const [x, z] of [[-0.19, 0.33], [0.19, 0.33], [-0.19, -0.33], [0.19, -0.33]]) {
      const leg = new THREE.Mesh(legGeo, fur);
      leg.position.set(x, 0.42, z);
      this.body.add(leg);
      this.legs.push(leg);
    }

    // Cola.
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.78, -0.5);
    const tailMesh = new THREE.Mesh(geo('tail', () => {
      const g = new THREE.CylinderGeometry(0.04, 0.08, 0.42, 8);
      g.translate(0, 0.21, 0);
      return g;
    }), fur);
    tailMesh.rotation.x = -0.6;
    this.tail.add(tailMesh);
    this.body.add(this.tail);

    // Sombra de contacto barata (siempre visible, incluso sin shadow maps).
    const blob = new THREE.Mesh(
      geo('blob', () => new THREE.CircleGeometry(0.55, 20).rotateX(-Math.PI / 2)),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.28, depthWrite: false }),
    );
    blob.position.y = 0.03;
    blob.renderOrder = 1;
    this.blob = blob;
    this.root.add(blob);

    this.root.traverse((o) => {
      if (o.isMesh && o !== blob) o.castShadow = true;
    });
  }

  bark() { this.barkTimer = 0.35; }

  /** groundGap: distancia de los pies al suelo (para escalar la sombra). */
  update(dt, anim, speed01, groundGap = 0) {
    this.anim = anim;
    this.speed01 += (speed01 - this.speed01) * Math.min(1, dt * 10);
    const s = this.speed01;

    if (anim === ANIM.RUN) this.phase += dt * (8 + s * 8);
    else this.phase += dt * 2;
    const ph = this.phase;

    if (anim === ANIM.RUN) {
      const swing = 0.9 * s;
      this.legs[0].rotation.x = Math.sin(ph) * swing;
      this.legs[3].rotation.x = Math.sin(ph) * swing;
      this.legs[1].rotation.x = Math.sin(ph + Math.PI) * swing;
      this.legs[2].rotation.x = Math.sin(ph + Math.PI) * swing;
      this.body.position.y = Math.abs(Math.sin(ph)) * 0.08 * s;
      this.body.rotation.x = 0;
    } else if (anim === ANIM.JUMP || anim === ANIM.FALL) {
      const tuck = anim === ANIM.JUMP ? -0.7 : 0.5;
      this.legs[0].rotation.x = tuck;
      this.legs[1].rotation.x = tuck;
      this.legs[2].rotation.x = -tuck;
      this.legs[3].rotation.x = -tuck;
      this.body.rotation.x += ((anim === ANIM.JUMP ? -0.25 : 0.15) - this.body.rotation.x) * Math.min(1, dt * 8);
      this.body.position.y = 0;
    } else {
      for (let i = 0; i < 4; i++) this.legs[i].rotation.x *= 0.8;
      this.body.position.y = Math.sin(ph) * 0.015;
      this.body.rotation.x *= 0.85;
    }

    // Cola feliz y orejas que rebotan.
    const wag = anim === ANIM.IDLE ? 9 : 16;
    this.tail.rotation.y = Math.sin(ph * 0.5 + performance.now() * 0.001 * wag) * 0.6;
    const flop = anim === ANIM.RUN ? Math.sin(ph) * 0.25 : anim === ANIM.FALL ? -0.6 : 0;
    this.ears[0].rotation.z = -0.35 - flop;
    this.ears[1].rotation.z = 0.35 + flop;

    // Ladrido: la cabeza da un golpe hacia arriba.
    if (this.barkTimer > 0) {
      this.barkTimer -= dt;
      this.head.rotation.x = -Math.sin((this.barkTimer / 0.35) * Math.PI) * 0.5;
    } else {
      this.head.rotation.x *= 0.8;
    }

    const k = THREE.MathUtils.clamp(1 - groundGap / 6, 0.2, 1);
    this.blob.position.y = -groundGap + 0.03;
    this.blob.scale.setScalar(k);
    this.blob.material.opacity = 0.28 * k;
    this.blob.visible = Number.isFinite(groundGap) && groundGap < 12;
  }

  setName(name) {
    if (this.label) this.root.remove(this.label);
    this.label = makeNameLabel(name);
    this.label.position.y = 1.75;
    this.root.add(this.label);
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.isSprite) {
        o.material.map?.dispose();
        o.material.dispose();
      }
    });
    for (const m of this.materials) m.dispose();
  }
}

function makeNameLabel(name) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.font = 'bold 30px system-ui, sans-serif';
  const w = Math.min(240, g.measureText(name).width + 28);
  g.fillStyle = 'rgba(30,14,58,0.6)';
  g.beginPath();
  g.roundRect((256 - w) / 2, 10, w, 44, 22);
  g.fill();
  g.fillStyle = '#ffffff';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(name, 128, 33);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, transparent: true }));
  sprite.scale.set(2, 0.5, 1);
  sprite.renderOrder = 2;
  return sprite;
}
