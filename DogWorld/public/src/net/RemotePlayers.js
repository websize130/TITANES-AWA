// Jugadores remotos: avatar + búfer de instantáneas con interpolación temporal.
import { DogAvatar } from '../player/DogAvatar.js';
import { lerpAngle } from '../player/PlayerController.js';
import { NET, ANIM } from './protocol.js';
import { terrainHeight } from '../world/Terrain.js';

const BUFFER_SIZE = 32;

class RemotePlayer {
  constructor(info) {
    this.id = info.id;
    this.name = info.name;
    this.score = info.score ?? 0;
    this.avatar = new DogAvatar(info.color);
    this.avatar.setName(info.name);
    // Búfer circular de [tiempo, x, y, z, yaw, anim] (sin asignaciones por mensaje).
    this.buf = new Float64Array(BUFFER_SIZE * 6);
    this.head = 0;
    this.size = 0;
    this.lastX = info.p?.[0] ?? 0;
    this.lastZ = info.p?.[2] ?? 0;
    this.pushRaw(performance.now(), info.p?.[0] ?? 0, info.p?.[1] ?? 0, info.p?.[2] ?? 0, info.r ?? 0, info.a ?? 0);
    this.avatar.root.position.set(info.p?.[0] ?? 0, info.p?.[1] ?? 0, info.p?.[2] ?? 0);
  }

  push(t, x, y, z, r, a) {
    // Tras un silencio (jugador quieto), duplicar el último estado justo antes del nuevo
    // para que la interpolación no "estire" el movimiento durante todo el hueco.
    if (this.size > 0) {
      const last = this.entry(0);
      const gap = t - this.buf[last];
      if (gap > 250) this.pushRaw(t - 1000 / NET.SEND_RATE_HZ, this.buf[last + 1], this.buf[last + 2], this.buf[last + 3], this.buf[last + 4], this.buf[last + 5]);
    }
    this.pushRaw(t, x, y, z, r, a);
  }

  pushRaw(t, x, y, z, r, a) {
    const o = this.head * 6;
    const b = this.buf;
    b[o] = t; b[o + 1] = x; b[o + 2] = y; b[o + 3] = z; b[o + 4] = r; b[o + 5] = a;
    this.head = (this.head + 1) % BUFFER_SIZE;
    if (this.size < BUFFER_SIZE) this.size++;
  }

  entry(iFromNewest) {
    return ((this.head - 1 - iFromNewest + BUFFER_SIZE * 2) % BUFFER_SIZE) * 6;
  }

  update(now, dt) {
    const renderT = now - NET.INTERP_DELAY_MS;
    const b = this.buf;
    const root = this.avatar.root;
    let anim = ANIM.IDLE;

    // Buscar el par (antiguo, nuevo) que rodea renderT.
    let found = false;
    for (let i = 0; i < this.size - 1; i++) {
      const newer = this.entry(i);
      const older = this.entry(i + 1);
      if (b[older] <= renderT && renderT <= b[newer]) {
        const span = b[newer] - b[older] || 1;
        const k = (renderT - b[older]) / span;
        root.position.set(
          b[older + 1] + (b[newer + 1] - b[older + 1]) * k,
          b[older + 2] + (b[newer + 2] - b[older + 2]) * k,
          b[older + 3] + (b[newer + 3] - b[older + 3]) * k,
        );
        root.rotation.y = lerpAngle(b[older + 4], b[newer + 4], k);
        anim = b[older + 5];
        found = true;
        break;
      }
    }
    if (!found) {
      // Sin datos suficientes: acercarse suavemente al último estado conocido.
      const n = this.entry(0);
      const k = Math.min(1, dt * 10);
      root.position.x += (b[n + 1] - root.position.x) * k;
      root.position.y += (b[n + 2] - root.position.y) * k;
      root.position.z += (b[n + 3] - root.position.z) * k;
      root.rotation.y = lerpAngle(root.rotation.y, b[n + 4], k);
      anim = b[n + 5];
    }

    const vx = (root.position.x - this.lastX) / Math.max(dt, 1e-3);
    const vz = (root.position.z - this.lastZ) / Math.max(dt, 1e-3);
    this.lastX = root.position.x;
    this.lastZ = root.position.z;
    const ground = terrainHeight(root.position.x, root.position.z);
    const gap = Number.isFinite(ground) ? Math.max(0, root.position.y - ground) : Infinity;
    this.avatar.update(dt, anim, Math.min(1, Math.hypot(vx, vz) / 7), anim === ANIM.IDLE || anim === ANIM.RUN ? 0 : gap);
  }
}

export class RemotePlayers {
  constructor(scene) {
    this.scene = scene;
    /** @type {Map<number, RemotePlayer>} */
    this.players = new Map();
  }

  get count() { return this.players.size; }

  add(info) {
    if (this.players.has(info.id)) return this.players.get(info.id);
    const p = new RemotePlayer(info);
    this.players.set(info.id, p);
    this.scene.add(p.avatar.root);
    return p;
  }

  remove(id) {
    const p = this.players.get(id);
    if (!p) return null;
    this.scene.remove(p.avatar.root);
    p.avatar.dispose();
    this.players.delete(id);
    return p;
  }

  clear() {
    for (const id of [...this.players.keys()]) this.remove(id);
  }

  applySnapshot(msg, selfId) {
    const now = performance.now();
    const s = msg.s;
    for (let i = 0; i < s.length; i++) {
      const e = s[i];
      if (e[0] === selfId) continue;
      const p = this.players.get(e[0]);
      if (p) p.push(now, e[1], e[2], e[3], e[4], e[5]);
    }
  }

  update(dt) {
    const now = performance.now();
    for (const p of this.players.values()) p.update(now, dt);
  }
}
