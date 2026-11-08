// Cámara en tercera persona orbitando al jugador, con modo "atracción" para el menú.
import * as THREE from 'three';
import { terrainHeight } from '../world/Terrain.js';

const MIN_PITCH = -0.15;
const MAX_PITCH = 1.05;

export class ThirdPersonCamera {
  constructor(camera, input, { distance = 7.5, autoFollow = false } = {}) {
    this.camera = camera;
    this.input = input;
    this.yaw = 0;          // 0 = cámara detrás del jugador mirando a -z
    this.pitch = 0.32;
    this.distance = distance;
    this.autoFollow = autoFollow;
    this.sinceLook = 10;
    this.target = new THREE.Vector3();
    this.smoothedTarget = new THREE.Vector3();
    this._desired = new THREE.Vector3();
    this.initialized = false;
  }

  snapTo(pos) {
    this.smoothedTarget.copy(pos);
    this.initialized = true;
  }

  update(dt, player) {
    const look = this.input.look;
    if (look.x || look.y) {
      this.yaw -= look.x;
      this.pitch = THREE.MathUtils.clamp(this.pitch + look.y, MIN_PITCH, MAX_PITCH);
      this.sinceLook = 0;
    } else {
      this.sinceLook += dt;
    }

    // En móvil, la cámara se recoloca suavemente detrás del perro al correr.
    if (this.autoFollow && this.sinceLook > 1.0 && player.anim !== 0) {
      const behind = player.yaw + Math.PI;
      const moveMag = Math.hypot(this.input.move.x, this.input.move.y);
      let d = (behind - this.yaw) % (Math.PI * 2);
      if (d > Math.PI) d -= Math.PI * 2;
      if (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, dt * 0.9 * moveMag);
    }

    this.target.set(player.position.x, player.position.y + 1.3, player.position.z);
    if (!this.initialized) this.snapTo(this.target);
    // Suavizado vertical más lento (no marea al saltar).
    const k = 1 - Math.exp(-dt * 12);
    const ky = 1 - Math.exp(-dt * 6);
    this.smoothedTarget.x += (this.target.x - this.smoothedTarget.x) * k;
    this.smoothedTarget.z += (this.target.z - this.smoothedTarget.z) * k;
    this.smoothedTarget.y += (this.target.y - this.smoothedTarget.y) * ky;

    const cp = Math.cos(this.pitch);
    const d = this._desired.set(
      Math.sin(this.yaw) * cp * this.distance,
      Math.sin(this.pitch) * this.distance,
      Math.cos(this.yaw) * cp * this.distance,
    ).add(this.smoothedTarget);

    // No atravesar el terreno.
    const groundY = terrainHeight(d.x, d.z);
    if (Number.isFinite(groundY) && d.y < groundY + 0.6) d.y = groundY + 0.6;

    this.camera.position.copy(d);
    this.camera.lookAt(this.smoothedTarget);
    player.cameraYaw = this.yaw;
  }

  /** Órbita cinematográfica lenta alrededor del Hub (fondo del menú). */
  updateAttract(t) {
    const a = 0.25 * Math.sin(t * 0.07);
    this.camera.position.set(Math.sin(a) * 30, 9 + Math.sin(t * 0.11) * 1.5, 34 + Math.cos(a) * 4);
    this.camera.lookAt(0, 12, -100);
  }
}
