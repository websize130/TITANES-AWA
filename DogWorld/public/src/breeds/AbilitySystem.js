// Habilidades únicas de cada raza. El jugador local predice el efecto y avisa al
// servidor; los eventos remotos (party, hielo, placaje, olfato…) se aplican aquí.
import { ABILITY, getBreed } from './BreedData.js';
import { INTERACT } from '../world/InteractableLayout.js';

export class AbilitySystem {
  constructor({ player, net, world, effects, hud, remotes, isOnline }) {
    this.player = player;
    this.getNet = net;          // () => NetworkClient
    this.world = world;
    this.fx = effects;
    this.hud = hud;
    this.remotes = remotes;
    this.isOnline = isOnline;   // () => boolean
    this.breed = getBreed('rufus');
    this.cooldownEnd = 0;
    this.time = 0;

    // Efectos temporales sobre el jugador local.
    this.sprintT = 0;
    this.partyT = 0;
    this.sniffT = 0;
    this.actionT = 0;
    this.trailTimer = 0;
    this.localHeld = -1;
    this.onLocalScore = null; // (gain) => void (modo sin conexión)
  }

  setBreed(breedId) {
    this.breed = getBreed(breedId);
    this.cooldownEnd = 0;
    this.sprintT = 0;
    this.sniffT = 0;
    this.actionT = 0;
    this.localHeld = -1;
    this.player.carrying = false;
    this.hud.setAbility(this.breed);
  }

  get myId() {
    const net = this.getNet();
    return this.isOnline() ? net.playerId : -1;
  }

  /** Intento de activar la habilidad (tecla/botón). */
  activate() {
    const ab = this.breed.ability;
    if (this.time < this.cooldownEnd) return;
    const p = this.player;
    const pos = p.position;
    const yaw = p.yaw;
    let extra;
    // Dentro de un mundo: ¿hay un objetivo de misión al alcance de esta habilidad?
    const mission = this.world.objectiveFor?.(ab.id, pos) ?? null;
    if (mission) {
      extra = { obj: mission.key };
      if (!this.isOnline()) this.world.bridge.solveLocal(mission.key);
      this.hud.toast(`${ab.icon} ¡${mission.def.label.split(':')[0]} lo consigue!`, 1400);
    }

    switch (ab.id) {
      case ABILITY.SPRINT:
        this.sprintT = ab.duration;
        this.fx.emit('wind', pos.x, pos.y + 0.6, pos.z);
        break;
      case ABILITY.PARTY:
        this.applyParty(pos.x, pos.z, pos, true);
        this.actionT = 1.6;
        break;
      case ABILITY.TACKLE: {
        p.startDash(18, ab.duration);
        this.actionT = 0.45;
        const fx = Math.sin(yaw); const fz = Math.cos(yaw);
        const ax = pos.x + fx * 1.8; const az = pos.z + fz * 1.8;
        extra = extra || {};
        const rock = this.world.interactables.nearestRock(ax, az, INTERACT.TACKLE_RANGE);
        if (rock >= 0) {
          extra.rock = rock;
          if (!this.isOnline()) {
            this.world.interactables.setRock(rock, 1);
            this.giveLocal(INTERACT.ROCK_REWARD);
            setTimeout(() => this.world.interactables.setRock(rock, 0, true), INTERACT.ROCK_RESPAWN_MS);
          }
        }
        const hit = this.remotes.nearestInFront(pos, yaw, INTERACT.TACKLE_RANGE);
        if (hit) extra.hit = hit.id;
        break;
      }
      case ABILITY.ICE:
        this.actionT = 0.8;
        this.world.interactables.spawnIce(pos.x, pos.y, pos.z, yaw);
        break;
      case ABILITY.DIG: {
        this.actionT = ab.duration;
        const i = this.world.interactables.nearestDig(pos.x, pos.z, INTERACT.DIG_RANGE);
        if (i >= 0) {
          extra = { ...extra, dig: i };
          if (!this.isOnline()) {
            this.world.interactables.setDig(i, 1);
            this.giveLocal(INTERACT.DIG_REWARD);
            setTimeout(() => this.world.interactables.setDig(i, 0, true), INTERACT.DIG_RESPAWN_MS);
          }
        } else if (!mission) {
          this.hud.toast('Aquí no hay nada… ¡busca un montículo con una X!', 1600);
        }
        break;
      }
      case ABILITY.SNIFF:
        this.sniffT = ab.duration;
        this.actionT = 1.4;
        break;
      case ABILITY.LIFT: {
        const inter = this.world.interactables;
        const held = inter.heldBy(this.myId);
        if (held >= 0 || this.localHeld >= 0) {
          const idx = held >= 0 ? held : this.localHeld;
          // Soltar delante, sobre la superficie más alta.
          const dx = pos.x + Math.sin(yaw) * 2.3;
          const dz = pos.z + Math.cos(yaw) * 2.3;
          let gy = this.world.collision.groundHeight(dx, dz, pos.y + 2.5, 0.3);
          if (!Number.isFinite(gy)) gy = pos.y;
          extra = { drop: idx, p: [round2(dx), round2(gy), round2(dz)] };
          if (!this.isOnline()) inter.setBoulder(idx, [dx, gy, dz, 0]);
          this.localHeld = -1;
          p.carrying = false;
          this.fx.emit('dust', dx, gy + 0.2, dz);
        } else {
          const i = inter.nearestBoulder(pos.x, pos.z, INTERACT.LIFT_RANGE);
          if (i < 0) {
            this.hud.toast('Acércate a un pedrusco para levantarlo', 1500);
            this.cooldownEnd = this.time + 0.3;
            return;
          }
          extra = { lift: i };
          if (!this.isOnline()) {
            inter.setBoulder(i, [0, 0, 0, -1]);
            this.localHeld = i;
            p.carrying = true;
          }
          this.actionT = 0.6;
        }
        break;
      }
      default:
        break;
    }

    this.cooldownEnd = this.time + ab.cooldown;
    this.hud.startCooldown(ab.cooldown);
    if (this.isOnline()) {
      const msg = { a: ab.id, p: [round2(pos.x), round2(pos.y), round2(pos.z)], r: round2(yaw) };
      if (extra) msg.x = extra;
      this.getNet().ability(msg);
    }
  }

  giveLocal(gain) {
    this.onLocalScore?.(gain);
  }

  /** Buff de Rufus: súper salto y algo más de velocidad a quien esté cerca. */
  applyParty(x, z, at, own = false) {
    const pos = this.player.position;
    const ab = getBreed('rufus').ability;
    this.fx.emit('confetti', at.x ?? at[0], (at.y ?? at[1]) + 1.2, at.z ?? at[2]);
    if (Math.hypot(pos.x - x, pos.z - z) <= ab.radius) {
      this.partyT = ab.duration;
      if (!own) this.hud.toast('¡Rufus te anima! Súper salto 🎉', 1800);
    }
  }

  /** Evento de habilidad de otro jugador. */
  onRemoteAbility(msg) {
    const [x, y, z] = msg.p;
    const remote = this.remotes.players.get(msg.id);
    switch (msg.a) {
      case ABILITY.PARTY:
        this.applyParty(x, z, msg.p);
        break;
      case ABILITY.ICE:
        this.world.interactables.spawnIce(x, y, z, msg.r);
        break;
      case ABILITY.TACKLE:
        this.fx.emit('dust', x, y + 0.3, z);
        if (msg.x?.hit === this.myId) {
          // Me han placado: empujón en la dirección de la embestida.
          this.player.applyImpulse(Math.sin(msg.r) * 11, 6, Math.cos(msg.r) * 11);
          this.hud.toast(`¡${remote?.name ?? 'Alguien'} te ha placado!`, 1500);
        }
        break;
      case ABILITY.SNIFF: {
        const pos = this.player.position;
        if (Math.hypot(pos.x - x, pos.z - z) <= getBreed('scout').ability.radius) {
          this.sniffT = Math.max(this.sniffT, 6);
          this.hud.toast('Scout comparte su olfato 👃', 1500);
        }
        break;
      }
      case ABILITY.SPRINT:
        this.fx.emit('wind', x, y + 0.6, z);
        break;
      default:
        break;
    }
    remote?.playAction(msg.a);
  }

  /** Confirmación del servidor sobre pedruscos (para saber si llevo uno). */
  onBoulderState(i, s) {
    if (s[3] === this.myId && this.myId > 0) {
      this.player.carrying = true;
      this.localHeld = i;
    } else if (this.localHeld === i) {
      this.player.carrying = false;
      this.localHeld = -1;
    }
  }

  update(dt) {
    this.time += dt;
    this.sprintT = Math.max(0, this.sprintT - dt);
    this.partyT = Math.max(0, this.partyT - dt);
    this.sniffT = Math.max(0, this.sniffT - dt);
    this.actionT = Math.max(0, this.actionT - dt);

    const p = this.player;
    let speed = 1;
    let jump = 1;
    if (this.sprintT > 0) speed *= 1.85;
    if (this.partyT > 0) { speed *= 1.15; jump *= 1.32; }
    if (p.carrying) { speed *= 0.8; jump *= 0.85; }
    p.mods.speed = speed;
    p.mods.jump = jump;
    p.mods.noDoubleJump = p.carrying;
    p.actionActive = this.actionT > 0;

    const pos = p.position;
    if (this.sprintT > 0 && p.grounded) {
      this.trailTimer -= dt;
      if (this.trailTimer <= 0) {
        this.trailTimer = 0.05;
        this.fx.emit('wind', pos.x, pos.y + 0.5, pos.z, null, 1);
      }
    }
    if (this.partyT > 0) {
      this.partyTimer = (this.partyTimer ?? 0) - dt;
      if (this.partyTimer <= 0) {
        this.partyTimer = 0.4;
        this.fx.emit('note', pos.x, pos.y + 1.6, pos.z);
      }
    }
    // Rastros del olfato hacia los tesoros más cercanos.
    if (this.sniffT > 0) {
      this.sniffTimer = (this.sniffTimer ?? 0) - dt;
      if (this.sniffTimer <= 0) {
        this.sniffTimer = 0.12;
        const ox = pos.x; const oy = pos.y + 0.6; const oz = pos.z;
        this.world.interactables.forEachScentTarget((tx, ty, tz) => {
          if (Math.hypot(tx - ox, tz - oz) < 40) this.fx.emitTrail(ox, oy, oz, tx, ty, tz, '#9dff7a');
        });
        // En los mundos, el olfato señala los objetivos pendientes.
        for (const o of this.world.objectives || []) {
          if (!o.solved) this.fx.emitTrail(ox, oy, oz, o.def.x, 1, o.def.z, '#7fd8ff');
        }
        const col = this.world.collectibles;
        let n = 0;
        for (let i = 0; i < col.count && n < 4; i++) {
          if (!col.active[i]) continue;
          const b = col.positions[i];
          if (Math.hypot(b.x - ox, b.z - oz) < 25) {
            this.fx.emitTrail(ox, oy, oz, b.x, b.y, b.z, '#ffd84a');
            n++;
          }
        }
      }
    }
  }

  get sniffActive() {
    return this.sniffT > 0;
  }
}

const round2 = (n) => Math.round(n * 100) / 100;
