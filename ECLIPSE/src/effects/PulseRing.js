import * as THREE from 'three';

/** Anillo de energía reutilizable (sin crear objetos por disparo). */
export class PulseRing {
  constructor(scene, color = 0xffa25a) {
    this.mesh = new THREE.Mesh(
      new THREE.RingGeometry(0.85, 1, 48),
      new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0, depthWrite: false,
        blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      }),
    );
    this.mesh.rotation.x = -Math.PI / 2;
    this.mesh.visible = false;
    this.duration = 0.7;
    this.t = 0;
    scene.add(this.mesh);
  }

  trigger(position) {
    this.mesh.position.set(position.x, 0.06, position.z);
    this.t = 0;
    this.mesh.visible = true;
  }

  update(dt) {
    if (!this.mesh.visible) return;
    this.t += dt;
    const k = this.t / this.duration;
    if (k >= 1) { this.mesh.visible = false; return; }
    const s = 0.6 + k * 6;
    this.mesh.scale.set(s, s, s);
    this.mesh.material.opacity = (1 - k) * (1 - k);
  }
}
