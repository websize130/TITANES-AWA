// Física de plataformas del jugador local: aceleración, salto variable, doble salto,
// coyote time, buffer de salto, plataformas móviles y reaparición al caer al vacío.
import * as THREE from 'three';
import { ANIM } from '../net/protocol.js';
import { STEP_HEIGHT } from '../world/CollisionWorld.js';
import { DogAvatar } from './DogAvatar.js';

const CFG = {
  radius: 0.45,
  height: 1.3,
  walkSpeed: 7,
  sprintSpeed: 10.5,
  groundAccel: 55,
  airAccel: 20,
  gravity: 28,
  maxFall: 40,
  jumpVelocity: 10.2,
  doubleJumpVelocity: 9,
  jumpCut: 0.5,
  coyoteTime: 0.12,
  jumpBuffer: 0.14,
  snapDown: 0.35,
  turnSpeed: 14,
};

export class PlayerController {
  constructor(world, input, furColor) {
    this.world = world;
    this.input = input;
    this.collision = world.collision;

    this.position = world.spawnPoint.clone();
    this.velocity = new THREE.Vector3();
    this.yaw = Math.PI; // mirando hacia el castillo (-z)
    this.grounded = false;
    this.groundY = this.position.y;
    this.coyote = 0;
    this.jumpBufferT = 0;
    this.canDoubleJump = false;
    this.jumpCutDone = false;
    this.anim = ANIM.IDLE;
    this.cameraYaw = 0;

    this.avatar = new DogAvatar(furColor);
    this.avatar.root.position.copy(this.position);
    this.avatar.root.rotation.y = this.yaw;

    this.onRespawn = null;
    this._wish = new THREE.Vector3();
  }

  setFurColor(color) {
    this.avatar.materials[0].color.set(color);
    this.avatar.materials[1].color.set(color).lerp(new THREE.Color('#fff8ec'), 0.6);
  }

  respawn() {
    this.position.copy(this.world.spawnPoint);
    this.velocity.set(0, 0, 0);
    this.yaw = Math.PI;
    this.onRespawn?.();
  }

  update(dt) {
    const input = this.input;
    const pos = this.position;
    const vel = this.velocity;

    // --- Dirección deseada relativa a la cámara ---
    const cy = this.cameraYaw;
    const fx = -Math.sin(cy), fz = -Math.cos(cy);  // adelante (de cámara a jugador)
    const rx = Math.cos(cy), rz = -Math.sin(cy);   // derecha
    const mx = input.move.x, my = input.move.y;
    const wish = this._wish.set(rx * mx + fx * my, 0, rz * mx + fz * my);
    const wishLen = Math.min(1, wish.length());
    const maxSpeed = input.sprint ? CFG.sprintSpeed : CFG.walkSpeed;

    const targetVX = wish.x * maxSpeed;
    const targetVZ = wish.z * maxSpeed;
    const accel = (this.grounded ? CFG.groundAccel : CFG.airAccel) * dt;
    vel.x = approach(vel.x, targetVX, accel);
    vel.z = approach(vel.z, targetVZ, accel);

    if (wishLen > 0.05) {
      const targetYaw = Math.atan2(wish.x, wish.z);
      this.yaw = lerpAngle(this.yaw, targetYaw, Math.min(1, CFG.turnSpeed * dt));
    }

    // --- Salto ---
    if (input.jumpPressed) this.jumpBufferT = CFG.jumpBuffer;
    else this.jumpBufferT -= dt;
    this.coyote = this.grounded ? CFG.coyoteTime : this.coyote - dt;

    if (this.jumpBufferT > 0) {
      if (this.coyote > 0) {
        vel.y = CFG.jumpVelocity;
        this.grounded = false;
        this.coyote = 0;
        this.jumpBufferT = 0;
        this.canDoubleJump = true;
        this.jumpCutDone = false;
      } else if (this.canDoubleJump && input.jumpPressed) {
        vel.y = CFG.doubleJumpVelocity;
        this.canDoubleJump = false;
        this.jumpBufferT = 0;
        this.jumpCutDone = false;
      }
    }
    // Salto variable: soltar pronto corta la subida.
    if (!input.jumpHeld && vel.y > 0 && !this.jumpCutDone && !this.grounded) {
      vel.y *= CFG.jumpCut;
      this.jumpCutDone = true;
    }

    vel.y = Math.max(vel.y - CFG.gravity * dt, -CFG.maxFall);

    // --- Movimiento horizontal con colisiones ---
    const prevY = pos.y;
    const terrain = this.collision.terrainHeight;
    const nx = pos.x + vel.x * dt;
    const nz = pos.z + vel.z * dt;
    // Paredes del terreno (laderas demasiado altas para subirlas de un paso).
    const blocked = (x, z) => {
      const t = terrain(x, z);
      return t > pos.y + STEP_HEIGHT;
    };
    if (!blocked(nx, nz)) {
      pos.x = nx; pos.z = nz;
    } else if (!blocked(nx, pos.z)) {
      pos.x = nx; vel.z = 0;
    } else if (!blocked(pos.x, nz)) {
      pos.z = nz; vel.x = 0;
    } else {
      vel.x = 0; vel.z = 0;
    }
    this.collision.resolveHorizontal(pos, CFG.radius, CFG.height);

    // --- Movimiento vertical ---
    pos.y += vel.y * dt;
    if (vel.y > 0) {
      const ceil = this.collision.ceilingHeight(pos.x, pos.z, prevY + CFG.height);
      if (pos.y + CFG.height > ceil) {
        pos.y = ceil - CFG.height;
        vel.y = 0;
      }
    }

    const ground = this.collision.groundHeight(pos.x, pos.z, Math.max(prevY, pos.y), CFG.radius);
    this.groundY = ground;
    const wasGrounded = this.grounded;
    if (vel.y <= 0 && pos.y <= ground) {
      pos.y = ground;
      vel.y = 0;
      this.grounded = true;
    } else if (wasGrounded && vel.y <= 0 && pos.y - ground < CFG.snapDown) {
      pos.y = ground; // pegarse a rampas y plataformas que bajan
      vel.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }
    if (this.grounded) this.canDoubleJump = false;

    if (pos.y < this.world.fallLimitY) this.respawn();

    // --- Animación ---
    const hSpeed = Math.hypot(vel.x, vel.z);
    if (this.grounded) this.anim = hSpeed > 0.6 ? ANIM.RUN : ANIM.IDLE;
    else this.anim = vel.y > 0 ? ANIM.JUMP : ANIM.FALL;

    if (input.actionPressed) this.avatar.bark();

    this.avatar.root.position.copy(pos);
    this.avatar.root.rotation.y = this.yaw;
    this.avatar.update(dt, this.anim, Math.min(1, hSpeed / CFG.walkSpeed), Number.isFinite(ground) ? pos.y - ground : Infinity);
  }
}

function approach(v, target, delta) {
  if (v < target) return Math.min(v + delta, target);
  return Math.max(v - delta, target);
}

export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
