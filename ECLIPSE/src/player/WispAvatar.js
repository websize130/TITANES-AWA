import * as THREE from 'three';

/**
 * Avatar PROVISIONAL ("Eco del Eclipse") para probar controles, cámara y HUD.
 * Se sustituirá por el personaje GLB animado (Mixamo) en la siguiente fase.
 */
const SPEED = 5.5;
const DASH_SPEED = 17;
const DASH_TIME = 0.18;
const DASH_COOLDOWN = 0.45;
const ARENA_RADIUS = 27;
const SKILL_COST = 30;
const BLOCK_SPEED_FACTOR = 0.4;

export class WispAvatar {
  constructor(scene, bus) {
    this.bus = bus;
    this.group = new THREE.Group();
    this.core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.34, 2),
      new THREE.MeshStandardMaterial({
        color: 0x1d1428, emissive: 0xffa25a, emissiveIntensity: 1.8, roughness: 0.3, metalness: 0.2,
      }),
    );
    this.core.castShadow = true;
    this.shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.56, 1),
      new THREE.MeshBasicMaterial({ color: 0xffc58a, wireframe: true, transparent: true, opacity: 0.22 }),
    );
    const decal = new THREE.Mesh(
      new THREE.CircleGeometry(0.55, 24),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    decal.rotation.x = -Math.PI / 2;
    decal.position.y = 0.02;
    this.body = new THREE.Group();
    this.body.add(this.core, this.shell);
    this.body.position.y = 1;
    this.group.add(this.body, decal);
    scene.add(this.group);

    this.health = 100;
    this.aether = 100;
    this.blocking = false;
    this.#dir = new THREE.Vector3();
    this.#dashDir = new THREE.Vector3(0, 0, -1);
  }

  #dir; #dashDir;
  #t = 0; #dash = 0; #dashCd = 0; #attack = 0;
  #lastAether = -1;

  get position() { return this.group.position; }

  update(dt, input, cam, effects) {
    this.#t += dt;
    const d = this.#dir.set(0, 0, 0)
      .addScaledVector(cam.right, input.move.x)
      .addScaledVector(cam.forward, input.move.y);
    const moving = d.lengthSq() > 0.0001;

    // Bloqueo (mantener): reduce la velocidad e impide atacar; esquivar lo cancela
    const blocking = input.isHeld('block') && this.#dash <= 0;
    if (blocking !== this.blocking) {
      this.blocking = blocking;
      this.bus.emit('player:block', blocking);
      this.shell.material.color.setHex(blocking ? 0x9b7bff : 0xffc58a);
      this.shell.material.opacity = blocking ? 0.6 : 0.22;
    }

    this.#dashCd -= dt;
    if (input.wasPressed('dodge') && this.#dashCd <= 0) {
      if (moving) this.#dashDir.copy(d).normalize();
      else this.#dashDir.set(-Math.sin(this.group.rotation.y), 0, -Math.cos(this.group.rotation.y));
      this.#dash = DASH_TIME;
      this.#dashCd = DASH_COOLDOWN;
      input.rumble(0.25, 60);
      this.bus.emit('sfx', 'dodge');
    }

    const p = this.group.position;
    if (this.#dash > 0) {
      this.#dash -= dt;
      p.addScaledVector(this.#dashDir, DASH_SPEED * dt);
    } else if (moving) {
      p.addScaledVector(d, SPEED * (this.blocking ? BLOCK_SPEED_FACTOR : 1) * dt);
    }
    const r = Math.hypot(p.x, p.z);
    if (r > ARENA_RADIUS) { p.x *= ARENA_RADIUS / r; p.z *= ARENA_RADIUS / r; }

    if (moving) {
      const targetYaw = Math.atan2(-d.x, -d.z);
      let diff = targetYaw - this.group.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.group.rotation.y += diff * (1 - Math.exp(-dt * 12));
    }

    if (input.wasPressed('attack') && !this.blocking) {
      this.#attack = 0.22;
      input.rumble(0.45, 70);
      this.bus.emit('sfx', 'attack');
    }
    if (input.wasPressed('skill') && !this.blocking) {
      if (this.aether >= SKILL_COST) {
        this.aether -= SKILL_COST;
        effects.ring.trigger(p);
        input.rumble(0.8, 160);
        this.bus.emit('sfx', 'skill');
      } else {
        this.bus.emit('hud:message', 'Éter insuficiente');
        this.bus.emit('sfx', 'error');
      }
    }
    if (input.wasPressed('interact')) this.bus.emit('hud:message', 'No hay nada con lo que interactuar');

    this.aether = Math.min(100, this.aether + dt * 9);
    const a = Math.round(this.aether);
    if (a !== this.#lastAether) {
      this.#lastAether = a;
      this.bus.emit('player:vitals', { health: this.health / 100, aether: this.aether / 100 });
    }

    // Animación procedural
    this.#attack = Math.max(0, this.#attack - dt);
    const pulse = 1 + this.#attack * 2.2;
    this.core.scale.setScalar(pulse);
    this.body.position.y = 1 + Math.sin(this.#t * 2.2) * 0.12;
    this.shell.scale.setScalar(this.blocking ? 1.25 : 1);
    this.shell.rotation.y += dt * (this.blocking ? 0.2 : 0.8 + this.#attack * 20);
    this.shell.rotation.x += dt * 0.5;
  }

  serialize() {
    const p = this.group.position;
    return { x: p.x, z: p.z, yaw: this.group.rotation.y, health: this.health, aether: this.aether };
  }

  restore(s) {
    if (!s) return;
    this.group.position.set(s.x ?? 0, 0, s.z ?? 0);
    this.group.rotation.y = s.yaw ?? 0;
    this.health = s.health ?? 100;
    this.aether = s.aether ?? 100;
  }
}
