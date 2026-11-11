import * as THREE from 'three';
import { createTestScene } from '../world/TestScene.js';
import { ThirdPersonCamera } from '../camera/ThirdPersonCamera.js';
import { WispAvatar } from '../player/WispAvatar.js';
import { PulseRing } from '../effects/PulseRing.js';

/**
 * Una partida en curso: mundo + jugador + cámara + efectos.
 * Se crea al entrar en el juego y se destruye (liberando GPU) al volver al menú.
 */
export class GameSession {
  constructor({ renderer, bus, saveData }) {
    this.bus = bus;
    this.world = createTestScene(renderer);
    this.camera = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 400);
    this.cam = new ThirdPersonCamera(this.camera);
    this.player = new WispAvatar(this.world.scene, bus);
    this.player.group.position.set(0, 0, 10);
    this.effects = { ring: new PulseRing(this.world.scene) };
    this.playTime = saveData?.playTime ?? 0;
    this.zone = 'Santuario del Eclipse';
    this.debugOrbit = null;
    if (saveData) {
      this.player.restore(saveData.player);
      if (typeof saveData.cameraYaw === 'number') this.cam.yaw = saveData.cameraYaw;
    }
    this.cam.snapTo(this.player.position);
    this.cam.update(0, { x: 0, y: 0 }, this.player.position);
  }

  get scene() { return this.world.scene; }

  update(dt, input) {
    this.playTime += dt;
    if (this.debugOrbit) {
      this.debugOrbit.update();
    } else {
      this.player.update(dt, input, this.cam, this.effects);
      this.cam.update(dt, input.lookDelta, this.player.position);
    }
    this.effects.ring.update(dt);
    this.world.update(dt, this.camera);
  }

  serialize() {
    return {
      playTime: this.playTime,
      zone: this.zone,
      player: this.player.serialize(),
      cameraYaw: this.cam.yaw,
    };
  }

  dispose() {
    this.debugOrbit?.dispose();
    this.world.dispose();
  }
}
