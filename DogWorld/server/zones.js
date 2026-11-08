// Zonas (Hub + 6 mundos) dentro de una sala: portales con cuenta atrás compartida,
// estado autoritativo de las misiones cooperativas y desbloqueo de mundos.
import { MSG } from '../public/src/net/protocol.js';
import {
  HUB_ZONE, WORLDS, WORLD_BY_ID, WORLD_IDS, isUnlocked, worldSpawn, PORTAL_PLAZA,
  ABILITY_FOR_TYPE, BREED_FOR_TYPE, OBJECTIVE_RANGE, PORTAL_COUNTDOWN_MS, PORTAL_ALL_READY_MS,
} from '../public/src/worlds/WorldData.js';

const UNLOCK_ALL = process.env.DOGWORLD_UNLOCK_ALL === '1';
const PORTAL_RANGE = 4.5;       // distancia al portal para marcarse "listo"
const PLATE_WINDOW_MS = 1300;   // placas: ocupación simultánea
const DOOR_GRACE_MS = 450;      // margen de latencia al cruzar puertas temporizadas
const BOULDER_ON_PLATE = 1.8;

const dist = (ax, az, bx, bz) => Math.hypot(ax - bx, az - bz);

export function initRoomZones(room) {
  room.progress = new Set(UNLOCK_ALL ? WORLD_IDS : []);
  room.zones = new Map();
  room.portals = new Map(); // worldId -> { ready:Set<id>, endsAt }
}

function newZone(worldId) {
  const w = WORLD_BY_ID[worldId];
  return {
    id: worldId,
    solved: new Set(),
    doorUntil: new Map(),
    plateOcc: new Map(w.objectives.filter((o) => o.type === 'plates').map((o) => [o.key, o.plates.map(() => 0)])),
    boulders: w.boulders.map(([x, z]) => ({ p: [x, null, z], h: 0 })),
    complete: false,
  };
}

export function getZone(room, worldId) {
  let z = room.zones.get(worldId);
  if (!z) {
    z = newZone(worldId);
    room.zones.set(worldId, z);
  }
  return z;
}

export function zoneMembers(room, zoneId) {
  const list = [];
  for (const c of room.players.values()) if (c.zone === zoneId) list.push(c);
  return list;
}

export function broadcastZone(room, zoneId, obj, exceptId = -1) {
  const data = JSON.stringify(obj);
  for (const c of room.players.values()) {
    if (c.zone === zoneId && c.id !== exceptId && c.ws.readyState === c.ws.OPEN) c.ws.send(data);
  }
}

/** Estado de misión para un cliente que entra en el mundo. */
function zoneSnapshot(zone) {
  const now = Date.now();
  const doors = {};
  for (const [k, until] of zone.doorUntil) if (until > now) doors[k] = until - now;
  return {
    solved: [...zone.solved],
    doors,
    boulders: zone.boulders.map((b) => [b.p[0], b.p[1], b.p[2], b.h]),
    complete: zone.complete,
  };
}

/** Mueve un jugador a otra zona (Hub o mundo) y avisa a todos. */
export function moveToZone(room, client, zoneId) {
  const from = client.zone;
  if (from === zoneId) return;
  releaseZoneBoulders(room, client);
  clearReady(room, client);
  client.zone = zoneId;
  const spawn = zoneId === HUB_ZONE ? PORTAL_PLAZA.returnSpawn : worldSpawn(zoneId);
  client.p = [spawn.x, zoneId === HUB_ZONE ? 5 : 0.2, spawn.z];
  client.lastStateAt = 0;
  client.dirty = true;

  const payload = {
    t: MSG.ZONE, z: zoneId,
    players: zoneMembers(room, zoneId).filter((c) => c.id !== client.id).map((c) => c.id),
  };
  if (zoneId !== HUB_ZONE) payload.state = zoneSnapshot(getZone(room, zoneId));
  client.send(payload);
  room.broadcast({ t: MSG.PLAYER_ZONE, id: client.id, z: zoneId, p: client.p }, client.id);

  // Un mundo vacío se reinicia para la siguiente expedición.
  if (from && from !== HUB_ZONE && zoneMembers(room, from).length === 0) room.zones.delete(from);
}

export function releaseZoneBoulders(room, client) {
  if (!client.zone || client.zone === HUB_ZONE) {
    room.releaseBoulders?.(client);
    return;
  }
  const zone = room.zones.get(client.zone);
  if (!zone) return;
  zone.boulders.forEach((b, i) => {
    if (b.h !== client.id) return;
    b.h = 0;
    b.p = [client.p[0], client.p[1], client.p[2]];
    broadcastZone(room, client.zone, { t: MSG.OBJECT, z: client.zone, k: 'boulder', i, s: [b.p[0], b.p[1], b.p[2], 0] });
  });
}

export function onClientLeaving(room, client) {
  releaseZoneBoulders(room, client);
  clearReady(room, client);
  const from = client.zone;
  client.zone = null;
  if (from && from !== HUB_ZONE && zoneMembers(room, from).length === 0) room.zones.delete(from);
}

// ---------------------------------------------------------------- portales
function clearReady(room, client) {
  for (const [w, portal] of room.portals) {
    if (portal.ready.delete(client.id)) broadcastPortal(room, w);
  }
}

function broadcastPortal(room, worldId) {
  const portal = room.portals.get(worldId);
  const ready = portal ? [...portal.ready] : [];
  const remaining = portal && portal.endsAt ? Math.max(0, portal.endsAt - Date.now()) : 0;
  room.broadcast({ t: MSG.PORTAL_STATUS, w: worldId, ready, ms: ready.length ? remaining : 0 });
  if (portal && !ready.length) room.portals.delete(worldId);
}

/** El jugador se coloca (w) o se aparta (w = null) de un portal del Hub. */
export function handlePortal(room, client, msg) {
  if (client.zone !== HUB_ZONE) return;
  const w = msg.w;
  if (w === null || w === undefined) {
    clearReady(room, client);
    return;
  }
  const world = WORLD_BY_ID[w];
  if (!world) return;
  if (!isUnlocked(w, room.progress)) {
    client.send({ t: MSG.ERROR, code: 'locked', msg: `El portal de ${world.title} sigue sellado.` });
    return;
  }
  if (dist(client.p[0], client.p[2], world.portal.x, world.portal.z) > PORTAL_RANGE) {
    if (process.env.DOGWORLD_DEBUG) console.log('[portal] lejos', client.name, client.p, world.portal);
    return;
  }

  // Si ya hay una expedición en marcha en ese mundo, se une directamente.
  if (zoneMembers(room, w).length > 0) {
    moveToZone(room, client, w);
    return;
  }
  clearReady(room, client);
  let portal = room.portals.get(w);
  if (!portal) {
    portal = { ready: new Set(), endsAt: Date.now() + PORTAL_COUNTDOWN_MS };
    room.portals.set(w, portal);
  }
  portal.ready.add(client.id);
  // Si todo el equipo del Hub está listo, se acorta la espera.
  const hubCount = zoneMembers(room, HUB_ZONE).length;
  if (portal.ready.size >= hubCount) portal.endsAt = Math.min(portal.endsAt, Date.now() + PORTAL_ALL_READY_MS);
  broadcastPortal(room, w);
}

/** Llamado en cada tick del servidor. */
export function tickPortals(room, now) {
  for (const [w, portal] of room.portals) {
    if (!portal.ready.size) {
      room.portals.delete(w);
      continue;
    }
    if (now < portal.endsAt) continue;
    const ids = [...portal.ready];
    room.portals.delete(w);
    for (const id of ids) {
      const c = room.players.get(id);
      if (c && c.zone === HUB_ZONE) moveToZone(room, c, w);
    }
    room.broadcast({ t: MSG.PORTAL_STATUS, w, ready: [], ms: 0 });
  }
}

export function handleExit(room, client) {
  if (client.zone && client.zone !== HUB_ZONE) moveToZone(room, client, HUB_ZONE);
}

// ---------------------------------------------------------------- misiones
function solve(room, zone, obj, by) {
  if (zone.solved.has(obj.key)) return;
  zone.solved.add(obj.key);
  broadcastZone(room, zone.id, { t: MSG.MISSION, z: zone.id, k: obj.key, solved: true, by: by.id });
}

/** Habilidad usada dentro de un mundo sobre un objetivo (x.obj = clave). */
export function abilityOnObjective(room, client, abilityId, key, p) {
  if (!client.zone || client.zone === HUB_ZONE || typeof key !== 'string') return;
  const world = WORLD_BY_ID[client.zone];
  const obj = world.objectives.find((o) => o.key === key);
  if (!obj || ABILITY_FOR_TYPE[obj.type] !== abilityId) return;
  if (client.breed !== BREED_FOR_TYPE[obj.type]) return;
  if (dist(p[0], p[2], obj.x, obj.z) > OBJECTIVE_RANGE[obj.type] + 1) return;
  solve(room, getZone(room, client.zone), obj, client);
}

/** Acciones sin habilidad: interruptores, placas y reliquia. */
export function handleAct(room, client, msg) {
  if (!client.zone || client.zone === HUB_ZONE || typeof msg.k !== 'string') return;
  const world = WORLD_BY_ID[client.zone];
  const zone = getZone(room, client.zone);
  const now = Date.now();
  const [px, , pz] = client.p;

  if (msg.k === 'relic') {
    if (zone.complete || dist(px, pz, world.relic.x, world.relic.z) > 4) return;
    if (!world.objectives.every((o) => zone.solved.has(o.key))) return;
    zone.complete = true;
    room.progress.add(world.id);
    room.broadcast({ t: MSG.WORLD_COMPLETE, w: world.id, by: client.id, name: client.name, progress: [...room.progress] });
    for (const c of zoneMembers(room, world.id)) c.addScore?.(5);
    return;
  }

  const obj = world.objectives.find((o) => o.key === msg.k);
  if (!obj || zone.solved.has(obj.key)) return;

  if (obj.type === 'switch') {
    if (msg.v === 'press') {
      if (dist(px, pz, obj.switch.x, obj.switch.z) > OBJECTIVE_RANGE.switch + 1) return;
      zone.doorUntil.set(obj.key, now + obj.duration * 1000);
      broadcastZone(room, zone.id, { t: MSG.MISSION, z: zone.id, k: obj.key, door: obj.duration * 1000, by: client.id });
    } else if (msg.v === 'cross') {
      const until = zone.doorUntil.get(obj.key) || 0;
      if (now > until + DOOR_GRACE_MS) return;
      if (pz > obj.door.z - 0.3) return; // tiene que estar al otro lado
      solve(room, zone, obj, client);
    }
    return;
  }

  if (obj.type === 'plates' && !obj.heavy && Number.isInteger(msg.v)) {
    const plate = obj.plates[msg.v];
    if (!plate || dist(px, pz, plate[0], plate[1]) > OBJECTIVE_RANGE.plates + 0.5) return;
    zone.plateOcc.get(obj.key)[msg.v] = now;
    checkPlates(room, zone, obj, client);
  }
}

function checkPlates(room, zone, obj, by) {
  const now = Date.now();
  const occ = zone.plateOcc.get(obj.key);
  obj.plates.forEach(([x, z], i) => {
    // Un pedrusco encima cuenta como peso permanente.
    if (zone.boulders.some((b) => !b.h && dist(b.p[0], b.p[2], x, z) < BOULDER_ON_PLATE)) occ[i] = now;
  });
  const allOn = occ.every((t) => now - t < PLATE_WINDOW_MS);
  if (allOn) solve(room, zone, obj, by);
}

/** Tras soltar un pedrusco en un mundo: comprobar placas. */
export function onWorldBoulderDropped(room, client) {
  const world = WORLD_BY_ID[client.zone];
  const zone = getZone(room, client.zone);
  for (const obj of world.objectives) {
    if (obj.type === 'plates' && !zone.solved.has(obj.key)) checkPlates(room, zone, obj, client);
  }
}

export { WORLDS, HUB_ZONE };
