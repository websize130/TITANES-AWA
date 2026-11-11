import * as THREE from 'three';

/**
 * Cámara orbital en tercera persona que sigue a un objetivo.
 * yaw/pitch se controlan con InputManager.lookDelta (ratón, stick o arrastre).
 */
export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0.6;
    this.pitch = 0.32;
    this.distance = 6.5;
    this.height = 1.1;
    this.minPitch = -0.1;
    this.maxPitch = 1.15;
    this.forward = new THREE.Vector3();
    this.right = new THREE.Vector3();
    this.#focus = new THREE.Vector3();
    this.#updateBasis();
  }

  #focus;

  snapTo(target) { this.#focus.copy(target); }

  update(dt, look, target) {
    this.yaw -= look.x;
    this.pitch = THREE.MathUtils.clamp(this.pitch + look.y, this.minPitch, this.maxPitch);
    this.#focus.lerp(target, 1 - Math.exp(-dt * 9));
    const cp = Math.cos(this.pitch);
    const f = this.#focus;
    this.camera.position.set(
      f.x + Math.sin(this.yaw) * cp * this.distance,
      f.y + this.height + Math.sin(this.pitch) * this.distance,
      f.z + Math.cos(this.yaw) * cp * this.distance,
    );
    this.camera.lookAt(f.x, f.y + this.height, f.z);
    this.#updateBasis();
  }

  /** Vectores de suelo para mover al personaje relativo a la cámara. */
  #updateBasis() {
    this.forward.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    this.right.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }
}
