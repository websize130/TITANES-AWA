// Isabel, la bruja guía y guardiana de los portales.
// Modelo procedural estilizado: vestido acampanado, sombrero de punta, capa,
// bastón con cristal brillante. Flota suavemente y mira al perro más cercano.
import * as THREE from 'three';
import { glowTexture } from '../world/Textures.js';

export class Isabel {
  constructor() {
    this.root = new THREE.Group();
    this.root.name = 'Isabel';
    const body = new THREE.Group();
    this.body = body;
    this.root.add(body);

    const robeMat = new THREE.MeshStandardMaterial({ color: '#5b2a9e', roughness: 0.65 });
    const robeDark = new THREE.MeshStandardMaterial({ color: '#3a1870', roughness: 0.7 });
    const gold = new THREE.MeshStandardMaterial({ color: '#f5b630', metalness: 0.85, roughness: 0.3 });
    const skin = new THREE.MeshStandardMaterial({ color: '#f3c9a8', roughness: 0.7 });
    const hair = new THREE.MeshStandardMaterial({ color: '#8a3a2a', roughness: 0.8 });
    const dark = new THREE.MeshStandardMaterial({ color: '#1b1020', roughness: 0.4 });
    const add = (geo, mat, x, y, z, parent = body) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      parent.add(m);
      return m;
    };

    // Vestido acampanado con ribete dorado.
    const robe = new THREE.LatheGeometry([
      new THREE.Vector2(0.01, 1.55), new THREE.Vector2(0.28, 1.5), new THREE.Vector2(0.3, 1.2),
      new THREE.Vector2(0.42, 0.7), new THREE.Vector2(0.62, 0.15), new THREE.Vector2(0.66, 0.0),
    ], 28);
    add(robe, robeMat, 0, 0, 0);
    const hem = add(new THREE.TorusGeometry(0.65, 0.04, 8, 32), gold, 0, 0.04, 0);
    hem.rotation.x = Math.PI / 2;
    const belt = add(new THREE.TorusGeometry(0.31, 0.035, 8, 24), gold, 0, 1.18, 0);
    belt.rotation.x = Math.PI / 2;
    // Capa.
    const cape = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.75, 1.4, 20, 1, true, Math.PI * 0.6, Math.PI * 0.8), robeDark);
    cape.position.set(0, 0.8, -0.05);
    cape.material.side = THREE.DoubleSide;
    body.add(cape);

    // Cabeza, pelo y cara.
    const head = new THREE.Group();
    head.position.set(0, 1.78, 0);
    body.add(head);
    this.head = head;
    add(new THREE.SphereGeometry(0.24, 20, 16), skin, 0, 0, 0, head);
    const hairBack = add(new THREE.SphereGeometry(0.27, 18, 14), hair, 0, 0.02, -0.05, head);
    hairBack.scale.set(1, 1.05, 0.95);
    const braid = add(new THREE.CylinderGeometry(0.1, 0.05, 0.7, 10), hair, 0.12, -0.42, -0.12, head);
    braid.rotation.z = 0.25;
    for (const sx of [-1, 1]) {
      add(new THREE.SphereGeometry(0.035, 10, 8), dark, sx * 0.08, 0.02, 0.215, head);
      add(new THREE.SphereGeometry(0.04, 10, 8), new THREE.MeshStandardMaterial({ color: '#ff9aa8', roughness: 0.9 }), sx * 0.14, -0.07, 0.19, head).scale.set(1, 0.6, 0.4);
    }
    const smile = add(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), dark, 0, -0.07, 0.22, head);
    smile.rotation.z = Math.PI;

    // Sombrero de bruja con ala ancha, banda dorada, estrella y punta doblada.
    const hat = new THREE.Group();
    hat.position.set(0, 0.17, 0);
    hat.rotation.z = -0.08;
    head.add(hat);
    add(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 32), robeDark, 0, 0, 0, hat);
    add(new THREE.CylinderGeometry(0.21, 0.27, 0.08, 24), gold, 0, 0.06, 0, hat);
    add(new THREE.ConeGeometry(0.27, 0.55, 24), robeMat, 0, 0.35, 0, hat);
    const tip = add(new THREE.ConeGeometry(0.13, 0.36, 16), robeMat, 0.08, 0.72, 0, hat);
    tip.rotation.z = -0.7;
    const star = add(new THREE.OctahedronGeometry(0.07, 0), gold, 0, 0.12, 0.26, hat);
    star.scale.set(1, 1, 0.4);

    // Brazos (el derecho sostiene el bastón).
    const armGeo = new THREE.CylinderGeometry(0.06, 0.09, 0.6, 10);
    armGeo.translate(0, -0.3, 0);
    this.armL = add(armGeo, robeMat, -0.3, 1.45, 0);
    this.armL.rotation.z = 0.25;
    this.armR = add(armGeo, robeMat, 0.3, 1.45, 0);
    this.armR.rotation.set(-0.5, 0, -0.35);
    for (const arm of [this.armL, this.armR]) add(new THREE.SphereGeometry(0.06, 10, 8), skin, 0, -0.62, 0, arm);

    // Bastón con cristal.
    const staff = new THREE.Group();
    staff.position.set(0.48, 0.0, 0.32);
    body.add(staff);
    this.staff = staff;
    add(new THREE.CylinderGeometry(0.035, 0.045, 1.9, 8), new THREE.MeshStandardMaterial({ color: '#6b4426', roughness: 0.8 }), 0, 0.95, 0, staff);
    const claw = add(new THREE.TorusGeometry(0.1, 0.025, 6, 12, Math.PI * 1.4), gold, 0, 1.95, 0, staff);
    claw.rotation.z = Math.PI * 0.8;
    this.crystal = add(new THREE.OctahedronGeometry(0.12, 0), new THREE.MeshStandardMaterial({
      color: '#c9a0ff', emissive: '#9b4dff', emissiveIntensity: 2.2, roughness: 0.1,
    }), 0, 2.02, 0, staff);
    this.crystal.scale.set(0.8, 1.4, 0.8);
    this.glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTexture(), color: '#b47cff', transparent: true, opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending,
    }));
    this.glow.scale.setScalar(1.1);
    this.glow.position.set(0, 2.02, 0);
    staff.add(this.glow);

    // Sombra de contacto (flota sobre el suelo).
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.6, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.25, depthWrite: false }));
    shadow.position.y = 0.02;
    this.root.add(shadow);

    this.time = 0;
    this.waveT = 0;
  }

  /** Saludo con la mano (al acercarse un jugador o al hablar). */
  wave() { this.waveT = 1.6; }

  update(dt, lookAt, fx) {
    this.time += dt;
    const t = this.time;
    this.body.position.y = 0.25 + Math.sin(t * 1.6) * 0.08;
    this.body.rotation.z = Math.sin(t * 0.9) * 0.03;
    if (lookAt) {
      const dx = lookAt.x - this.root.position.x;
      const dz = lookAt.z - this.root.position.z;
      const target = Math.atan2(dx, dz);
      let d = target - this.root.rotation.y;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.root.rotation.y += d * Math.min(1, dt * 3);
    }
    this.head.rotation.z = Math.sin(t * 0.7) * 0.08;
    if (this.waveT > 0) {
      this.waveT -= dt;
      this.armL.rotation.set(0, 0, 2.4 + Math.sin(t * 12) * 0.35);
    } else {
      this.armL.rotation.set(0, 0, 0.25 + Math.sin(t * 1.3) * 0.05);
    }
    this.crystal.rotation.y = t * 1.5;
    this.glow.material.opacity = 0.65 + Math.sin(t * 3) * 0.2;
    if (fx && Math.sin(t * 2.3) > 0.985) {
      const p = this.crystal.getWorldPosition(_v);
      fx.emit('sparkle', p.x, p.y, p.z, null, 0.4);
    }
  }
}

const _v = new THREE.Vector3();
