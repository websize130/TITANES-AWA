// Jugadores remotos: avatar + búfer de instantáneas con interpolación temporal.
import { DogAvatar } from '../player/DogAvatar.js';
import { lerpAngle } from '../player/PlayerController.js';
import { NET, ANIM } from './protocol.js';
import { terrainHeight } from '../world/Terrain.js';

const BUFFER_SIZE = 32;

class RemotePlayer {
  constructor(info, fx) {
    this.id = info.id;
    this.name = info.name;
    this.score = info.score ?? 0;
    this.breedId = info.b;
    this.zone = info.z ?? 'hub';
    this.fx = fx;
    this.avatar = new DogAvatar(info.b, fx);
    this.avatar.setName(info.name);
    this.avatar.setCosmetics(info.c);
    this.carrying = false;
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
    this.avatar.carrying = this.carrying;
    this.avatar.update(dt, anim, Math.min(1, Math.hypot(vx, vz) / 7), anim === ANIM.IDLE || anim === ANIM.RUN || anim >= ANIM.EMOTE ? 0 : gap);
  }

  /** Efecto inmediato de una habilidad recibida (la animación llega por el estado). */
  playAction() {
    this.avatar.bark();
  }
}

export class RemotePlayers {
  constructor(scene) {
    this.scene = scene;
    /** @type {Map<number, RemotePlayer>} */
    this.players = new Map();
  }

  get count() { return this.players.size; }

  setEffects(fx) { this.fx = fx; }

  add(info) {
    if (this.players.has(info.id)) return this.players.get(info.id);
    const p = new RemotePlayer(info, this.fx);
    this.players.set(info.id, p);
    this.scene.add(p.avatar.root);
    p.avatar.root.visible = p.zone === (this.myZone ?? 'hub');
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

  /** Cambio de raza de un jugador: se reconstruye su avatar conservando la posición. */
  setBreed(id, breedId) {
    const p = this.players.get(id);
    if (!p || p.breedId === breedId) return p;
    const old = p.avatar;
    this.scene.remove(old.root);
    const cos = old.cosmeticSet;
    p.avatar = new DogAvatar(breedId, this.fx);
    p.avatar.setName(p.name);
    p.avatar.setCosmetics(cos);
    p.avatar.root.position.copy(old.root.position);
    p.avatar.root.rotation.y = old.root.rotation.y;
    p.breedId = breedId;
    old.dispose();
    this.scene.add(p.avatar.root);
    p.avatar.root.visible = p.zone === (this.myZone ?? 'hub');
    this.fx?.emit('sparkle', p.avatar.root.position.x, p.avatar.root.position.y + 1, p.avatar.root.position.z);
    return p;
  }

  /** Accesorios equipados por otro jugador. */
  setCosmetics(id, c) {
    this.players.get(id)?.avatar.setCosmetics(c);
  }

  /** Jugador remoto más cercano delante (para el placaje). */
  nearestInFront(pos, yaw, range) {
    const fx = Math.sin(yaw);
    const fz = Math.cos(yaw);
    let best = null;
    let bd = range;
    for (const p of this.players.values()) {
      if (p.zone !== this.myZone) continue;
      const rp = p.avatar.root.position;
      const dx = rp.x - pos.x;
      const dz = rp.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d < bd && (dx * fx + dz * fz) > -0.3 && Math.abs(rp.y - pos.y) < 2) {
        bd = d;
        best = p;
      }
    }
    return best;
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
    for (const p of this.players.values()) if (p.zone === this.myZone) p.update(now, dt);
  }

  /** Cambia la escena/zona visible: solo se ven los perros de mi misma zona. */
  setMyZone(zone, scene) {
    this.myZone = zone;
    this.scene = scene;
    for (const p of this.players.values()) {
      scene.add(p.avatar.root);
      p.avatar.root.visible = p.zone === zone;
    }
  }

  /** Otro jugador cambió de zona (entró en un mundo o volvió al Hub). */
  setZone(id, zone, pos) {
    const p = this.players.get(id);
    if (!p) return null;
    p.zone = zone;
    p.avatar.root.visible = zone === this.myZone;
    if (pos) {
      p.size = 0;
      p.pushRaw(performance.now(), pos[0], pos[1], pos[2], 0, 0);
      p.avatar.root.position.set(pos[0], pos[1], pos[2]);
    }
    return p;
  }

  countInZone(zone) {
    let n = 0;
    for (const p of this.players.values()) if (p.zone === zone) n++;
    return n;
  }
}
