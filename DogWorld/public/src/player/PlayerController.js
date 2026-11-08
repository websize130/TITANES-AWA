// Física de plataformas del jugador local: aceleración, salto variable, doble salto,
// coyote time, buffer de salto, plataformas móviles y reaparición al caer al vacío.
import * as THREE from 'three';
import { ANIM } from '../net/protocol.js';
import { STEP_HEIGHT } from '../world/CollisionWorld.js';
import { DogAvatar } from './DogAvatar.js';
import { getBreed } from '../breeds/BreedData.js';

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
  constructor(world, input, breedId, fx) {
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

    this.fx = fx;
    this.mods = { speed: 1, jump: 1, noDoubleJump: false };
    this.dashT = 0;
    this.dashSpeed = 0;
    this.stunT = 0;
    this.emoteT = 0;
    this.actionActive = false;
    this.carrying = false;
    this.avatar = null;
    this.setBreed(breedId);

    this.onRespawn = null;
    this._wish = new THREE.Vector3();
  }

  /** Cambia de raza: nuevo modelo y estadísticas (velocidad, salto, tamaño). */
  setBreed(breedId) {
    const parent = this.avatar?.root.parent;
    const visible = this.avatar ? this.avatar.root.visible : false;
    if (this.avatar) {
      parent?.remove(this.avatar.root);
      this.avatar.dispose();
    }
    this.breed = getBreed(breedId);
    this.stats = this.breed.stats;
    this.radius = CFG.radius * Math.max(0.8, Math.min(1.25, this.stats.scale));
    const cos = this.avatar?.cosmeticSet;
    this.avatar = new DogAvatar(this.breed.id, this.fx);
    if (cos) this.avatar.setCosmetics(cos);
    this.avatar.root.position.copy(this.position);
    this.avatar.root.rotation.y = this.yaw;
    this.avatar.root.visible = visible;
    parent?.add(this.avatar.root);
    this.carrying = false;
  }

  /** Embestida (Placaje): velocidad fija hacia delante durante `duration`. */
  startDash(speed, duration) {
    this.dashSpeed = speed;
    this.dashT = duration;
  }

  /** Empujón externo (placaje de otro jugador). */
  applyImpulse(vx, vy, vz) {
    this.velocity.set(vx, vy, vz);
    this.grounded = false;
    this.stunT = 0.45;
  }

  /** Gesto de personalidad (tecla Q / botón 🐾). Se cancela al moverse. */
  playEmote() {
    if (this.grounded) this.emoteT = 3.2;
  }

  /** Cambia el mundo de colisiones (Hub o mundo temático). */
  setWorld(world) {
    this.world = world;
    this.collision = world.collision;
  }

  respawn() {
    this.position.copy(this.world.respawnPoint?.() ?? this.world.spawnPoint);
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
    const maxSpeed = (input.sprint ? CFG.sprintSpeed : CFG.walkSpeed) * this.stats.speed * this.mods.speed;

    this.stunT = Math.max(0, this.stunT - dt);
    if (this.dashT > 0) {
      // Placaje: avanza recto en la dirección en la que mira.
      this.dashT -= dt;
      vel.x = Math.sin(this.yaw) * this.dashSpeed;
      vel.z = Math.cos(this.yaw) * this.dashSpeed;
    } else {
      const targetVX = wish.x * maxSpeed;
      const targetVZ = wish.z * maxSpeed;
      const control = this.stunT > 0 ? 0.15 : 1;
      const accel = (this.grounded ? CFG.groundAccel : CFG.airAccel) * dt * control;
      vel.x = approach(vel.x, targetVX, accel);
      vel.z = approach(vel.z, targetVZ, accel);
    }

    if (wishLen > 0.05 && this.dashT <= 0) {
      const targetYaw = Math.atan2(wish.x, wish.z);
      this.yaw = lerpAngle(this.yaw, targetYaw, Math.min(1, CFG.turnSpeed * dt));
    }

    // --- Salto ---
    if (input.jumpPressed) this.jumpBufferT = CFG.jumpBuffer;
    else this.jumpBufferT -= dt;
    this.coyote = this.grounded ? CFG.coyoteTime : this.coyote - dt;

    if (this.jumpBufferT > 0) {
      if (this.coyote > 0) {
        vel.y = CFG.jumpVelocity * this.stats.jump * this.mods.jump;
        this.grounded = false;
        this.coyote = 0;
        this.jumpBufferT = 0;
        this.canDoubleJump = true;
        this.jumpCutDone = false;
      } else if (this.canDoubleJump && input.jumpPressed && !this.mods.noDoubleJump) {
        vel.y = CFG.doubleJumpVelocity * this.stats.jump * this.mods.jump;
        this.fx?.emit('dust', pos.x, pos.y, pos.z);
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
    this.collision.resolveHorizontal(pos, this.radius, CFG.height * this.stats.scale);

    // --- Movimiento vertical ---
    pos.y += vel.y * dt;
    if (vel.y > 0) {
      const h = CFG.height * this.stats.scale;
      const ceil = this.collision.ceilingHeight(pos.x, pos.z, prevY + h);
      if (pos.y + h > ceil) {
        pos.y = ceil - h;
        vel.y = 0;
      }
    }

    const ground = this.collision.groundHeight(pos.x, pos.z, Math.max(prevY, pos.y), this.radius);
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
    if (input.emotePressed) this.playEmote();
    if (wishLen > 0.2 || !this.grounded || this.actionActive) this.emoteT = 0;
    this.emoteT = Math.max(0, this.emoteT - dt);

    if (this.actionActive) this.anim = ANIM.ACTION;
    else if (this.grounded) this.anim = this.emoteT > 0 ? ANIM.EMOTE : hSpeed > 0.6 ? ANIM.RUN : ANIM.IDLE;
    else this.anim = vel.y > 0 ? ANIM.JUMP : ANIM.FALL;
    this.avatar.carrying = this.carrying;

    this.avatar.root.position.copy(pos);
    this.avatar.root.rotation.y = this.yaw;
    this.avatar.update(dt, this.anim, Math.min(1, hSpeed / (CFG.walkSpeed * this.stats.speed)), Number.isFinite(ground) ? pos.y - ground : Infinity);
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
