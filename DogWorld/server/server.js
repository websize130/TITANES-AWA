// DogWorld — servidor HTTP estático + WebSocket de salas en tiempo real.
// Uso: npm install && npm start  ->  http://localhost:8080
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import {
  MSG, NET, PROTOCOL_VERSION, ANIM, ANIM_MAX, sanitizeName, sanitizeRoom,
} from '../public/src/net/protocol.js';
import { BREED_BY_ID, BREED_IDS, ABILITY } from '../public/src/breeds/BreedData.js';
import { ROCKS, DIG_SPOTS, BOULDERS, INTERACT } from '../public/src/world/InteractableLayout.js';
import {
  initRoomZones, getZone, zoneMembers, broadcastZone, moveToZone, onClientLeaving, releaseZoneBoulders,
  handlePortal, tickPortals, handleExit, handleAct, abilityOnObjective, onWorldBoulderDropped, HUB_ZONE,
} from './zones.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const THREE_DIR = path.join(ROOT, 'node_modules', 'three');
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const MAX_MESSAGE_BYTES = 1024;
const MAX_MESSAGES_PER_SECOND = 40;
const WORLD_BOUNDS = 400; // |x|,|z| máximos aceptados
const MAX_SPEED = 30; // m/s máximos aceptados (esprint + placaje + margen)

// ---------------------------------------------------------------------------
// HTTP estático
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.glb': 'model/gltf-binary',
  '.ico': 'image/x-icon',
};

function resolveSafe(baseDir, urlPath) {
  const decoded = decodeURIComponent(urlPath);
  const full = path.normalize(path.join(baseDir, decoded));
  return full.startsWith(baseDir + path.sep) || full === baseDir ? full : null;
}

function serveFile(res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404');
      return;
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

const httpServer = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let filePath = null;

  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, rooms: rooms.size, players: clients.size }));
    return;
  }

  if (url.pathname.startsWith('/vendor/three/')) {
    filePath = resolveSafe(THREE_DIR, url.pathname.slice('/vendor/three'.length));
  } else {
    const p = url.pathname === '/' ? '/index.html' : url.pathname;
    filePath = resolveSafe(PUBLIC_DIR, p);
  }

  if (!filePath) {
    res.writeHead(400);
    res.end();
    return;
  }
  serveFile(res, filePath);
});

// ---------------------------------------------------------------------------
// Salas
// ---------------------------------------------------------------------------
/** @type {Map<string, Room>} */
const rooms = new Map();
/** @type {Map<import('ws').WebSocket, Client>} */
const clients = new Map();
let nextPlayerId = 1;

class Room {
  constructor(code) {
    this.code = code;
    /** @type {Map<number, Client>} */
    this.players = new Map();
    /** @type {Map<number, number>} id coleccionable -> timestamp de reaparición */
    this.collected = new Map();
    // Objetos de habilidades: estado autoritativo.
    this.rocks = ROCKS.map(() => 0);        // 0 = intacta, si no timestamp de reaparición
    this.digs = DIG_SPOTS.map(() => 0);     // 0 = con tesoro, si no timestamp de reaparición
    this.boulders = BOULDERS.map((b) => ({ p: [b.x, null, b.z], h: 0 })); // h = id del portador
    initRoomZones(this);
  }

  broadcast(obj, exceptId = -1) {
    const data = JSON.stringify(obj);
    for (const c of this.players.values()) {
      if (c.id !== exceptId && c.ws.readyState === c.ws.OPEN) c.ws.send(data);
    }
  }

  infoList() {
    const list = [];
    for (const c of this.players.values()) list.push(c.info());
    return list;
  }

  takenBreeds(exceptId = -1) {
    const taken = [];
    for (const c of this.players.values()) if (c.id !== exceptId) taken.push(c.breed);
    return taken;
  }

  objectsState() {
    return {
      rocks: this.rocks.map((v) => (v ? 1 : 0)),
      digs: this.digs.map((v) => (v ? 1 : 0)),
      boulders: this.boulders.map((b) => [b.p[0], b.p[1], b.p[2], b.h]),
    };
  }

  /** Suelta el pedrusco que lleve un jugador (desconexión o cambio de raza). */
  releaseBoulders(client) {
    this.boulders.forEach((b, i) => {
      if (b.h !== client.id) return;
      b.h = 0;
      b.p = [client.p[0], client.p[1], client.p[2]];
      broadcastZone(this, HUB_ZONE, { t: MSG.OBJECT, z: HUB_ZONE, k: 'boulder', i, s: [b.p[0], b.p[1], b.p[2], 0] });
    });
  }
}

class Client {
  constructor(ws) {
    this.ws = ws;
    this.id = nextPlayerId++;
    this.room = null;
    this.name = 'Perrito';
    this.breed = BREED_IDS[0];
    this.p = [0, 0, 0];
    this.r = 0;
    this.a = ANIM.IDLE;
    this.score = 0;
    this.dirty = false;
    this.msgCount = 0;
    this.msgWindow = Date.now();
    this.alive = true;
    this.lastAbility = 0;
    this.lastStateAt = 0;
    this.zone = null;
  }

  info() {
    return { id: this.id, name: this.name, b: this.breed, z: this.zone, p: this.p, r: this.r, a: this.a, score: this.score };
  }

  send(obj) {
    if (this.ws.readyState === this.ws.OPEN) this.ws.send(JSON.stringify(obj));
  }

  addScore(gain) {
    this.score += gain;
    this.room?.broadcast({ t: MSG.SCORE, id: this.id, score: this.score, gain });
  }
}

function getOrCreateRoom(code) {
  let room = rooms.get(code);
  if (!room) {
    room = new Room(code);
    rooms.set(code, room);
  }
  return room;
}

function leaveRoom(client) {
  const room = client.room;
  if (!room) return;
  onClientLeaving(room, client);
  room.players.delete(client.id);
  client.room = null;
  room.broadcast({ t: MSG.PLAYER_LEAVE, id: client.id });
  if (room.players.size === 0) rooms.delete(room.code);
}

const isFiniteNum = (n) => typeof n === 'number' && Number.isFinite(n);
const dist2D = (p, o) => Math.hypot(p[0] - o.x, p[2] - o.z);

function roomInfo(code) {
  const room = rooms.get(code);
  return {
    t: MSG.ROOM_INFO,
    room: code,
    max: NET.MAX_PLAYERS_PER_ROOM,
    players: room ? [...room.players.values()].map((c) => ({ name: c.name, b: c.breed })) : [],
  };
}

function handleMessage(client, msg) {
  switch (msg.t) {
    case MSG.ROOM_QUERY:
      client.send(roomInfo(sanitizeRoom(msg.room)));
      break;

    case MSG.JOIN: {
      if (msg.v !== PROTOCOL_VERSION) {
        client.send({ t: MSG.ERROR, code: 'version', msg: 'Versión del cliente desactualizada. Recarga la página.' });
        return;
      }
      const code = sanitizeRoom(msg.room);
      const breed = BREED_BY_ID[msg.b] ? msg.b : null;
      if (!breed) {
        client.send({ t: MSG.ERROR, code: 'breed', msg: 'Raza desconocida.' });
        return;
      }
      const existing = rooms.get(code);
      if (existing && existing.players.size >= NET.MAX_PLAYERS_PER_ROOM && client.room !== existing) {
        client.send({ t: MSG.ERROR, code: 'full', msg: 'La sala está llena (7 perros).' });
        return;
      }
      if (existing && existing.takenBreeds(client.id).includes(breed)) {
        client.send({
          t: MSG.ERROR, code: 'breed', msg: `${BREED_BY_ID[breed].name} ya está en esta sala. ¡Elige otro perro!`,
          taken: existing.takenBreeds(client.id),
        });
        return;
      }
      leaveRoom(client);
      const room = getOrCreateRoom(code);
      client.name = sanitizeName(msg.name);
      client.breed = breed;
      client.score = 0;
      client.room = room;
      client.zone = HUB_ZONE;
      room.players.set(client.id, client);

      client.send({
        t: MSG.WELCOME,
        id: client.id,
        room: code,
        players: room.infoList().filter((p) => p.id !== client.id),
        collected: [...room.collected.keys()],
        objects: room.objectsState(),
        progress: [...room.progress],
      });
      room.broadcast({ t: MSG.PLAYER_JOIN, player: client.info() }, client.id);
      break;
    }

    case MSG.BREED: {
      const room = client.room;
      if (!room || !BREED_BY_ID[msg.b] || msg.b === client.breed) return;
      if (room.takenBreeds(client.id).includes(msg.b)) {
        client.send({ t: MSG.ERROR, code: 'breed', msg: `${BREED_BY_ID[msg.b].name} ya está en esta sala.`, taken: room.takenBreeds(client.id) });
        return;
      }
      releaseZoneBoulders(room, client);
      client.breed = msg.b;
      client.lastAbility = 0;
      room.broadcast({ t: MSG.PLAYER_BREED, id: client.id, b: client.breed });
      break;
    }

    case MSG.STATE: {
      if (!client.room || !Array.isArray(msg.p) || msg.p.length !== 3) return;
      const [x, y, z] = msg.p;
      if (!isFiniteNum(x) || !isFiniteNum(y) || !isFiniteNum(z) || !isFiniteNum(msg.r)) return;
      if (Math.abs(x) > WORLD_BOUNDS || Math.abs(z) > WORLD_BOUNDS || y < -200 || y > 300) return;
      // Anti-teletransporte por velocidad: distancia permitida según el tiempo transcurrido
      // (tolera tirones de red). Reaparecer en el punto de inicio siempre está permitido.
      const now = Date.now();
      const elapsed = Math.min(5, (now - client.lastStateAt) / 1000);
      const allowed = MAX_SPEED * elapsed + 3;
      const nearSpawn = Math.abs(x) < 6 && Math.abs(z - 20) < 6;
      if (Math.hypot(x - client.p[0], z - client.p[2]) > allowed && !nearSpawn) {
        if (process.env.DOGWORLD_DEBUG) console.log("[st] rechazado", client.name, [x, z], client.p, allowed.toFixed(1));
        return;
      }
      client.lastStateAt = now;
      client.p = [round2(x), round2(y), round2(z)];
      client.r = round2(msg.r);
      client.a = Number.isInteger(msg.a) && msg.a >= 0 && msg.a <= ANIM_MAX ? msg.a : ANIM.IDLE;
      client.dirty = true;
      break;
    }

    case MSG.ABILITY:
      handleAbility(client, msg);
      break;

    case MSG.PORTAL:
      if (client.room) handlePortal(client.room, client, msg);
      break;

    case MSG.EXIT:
      if (client.room) handleExit(client.room, client);
      break;

    case MSG.ACT:
      if (client.room) handleAct(client.room, client, msg);
      break;

    case MSG.COLLECT: {
      const room = client.room;
      const id = msg.id;
      if (!room || client.zone !== HUB_ZONE || !Number.isInteger(id) || id < 0 || id >= NET.COLLECTIBLE_COUNT) return;
      if (room.collected.has(id)) return; // otro jugador llegó antes
      room.collected.set(id, Date.now() + NET.COLLECTIBLE_RESPAWN_MS);
      client.score += 1;
      room.broadcast({ t: MSG.COLLECTED, id, by: client.id, score: client.score });
      break;
    }

    case MSG.PING:
      if (isFiniteNum(msg.ts)) client.send({ t: MSG.PONG, ts: msg.ts });
      break;

    default:
      break;
  }
}

/**
 * Habilidades: el servidor comprueba raza y cooldown, aplica los efectos sobre
 * objetos compartidos y reenvía el evento a la sala para que todos lo vean.
 */
function handleAbility(client, msg) {
  const room = client.room;
  if (!room || typeof msg.a !== 'string') return;
  const breed = BREED_BY_ID[client.breed];
  if (breed.ability.id !== msg.a) return; // habilidad de otra raza
  const now = Date.now();
  if (now - client.lastAbility < breed.ability.cooldown * 1000 * 0.85) return; // margen por latencia
  if (!Array.isArray(msg.p) || msg.p.length !== 3 || !msg.p.every(isFiniteNum) || !isFiniteNum(msg.r)) return;
  // La posición declarada debe estar cerca de la última posición conocida.
  if (Math.hypot(msg.p[0] - client.p[0], msg.p[2] - client.p[2]) > 6) return;
  client.lastAbility = now;

  const x = msg.x && typeof msg.x === 'object' ? msg.x : {};
  const out = { t: MSG.ABILITY, id: client.id, a: msg.a, p: msg.p.map(round2), r: round2(msg.r) };
  const inHub = client.zone === HUB_ZONE;
  // Dentro de un mundo, la habilidad puede resolver un objetivo de misión.
  if (!inHub && typeof x.obj === 'string') abilityOnObjective(room, client, msg.a, x.obj, msg.p);

  switch (msg.a) {
    case ABILITY.TACKLE: {
      if (inHub && Number.isInteger(x.rock) && x.rock >= 0 && x.rock < ROCKS.length && !room.rocks[x.rock]
        && dist2D(msg.p, ROCKS[x.rock]) < INTERACT.TACKLE_RANGE + 1) {
        room.rocks[x.rock] = now + INTERACT.ROCK_RESPAWN_MS;
        broadcastZone(room, HUB_ZONE, { t: MSG.OBJECT, z: HUB_ZONE, k: 'rock', i: x.rock, s: 1 });
        client.addScore(INTERACT.ROCK_REWARD);
      }
      if (Number.isInteger(x.hit) && room.players.has(x.hit) && x.hit !== client.id) {
        const target = room.players.get(x.hit);
        if (Math.hypot(target.p[0] - msg.p[0], target.p[2] - msg.p[2]) < INTERACT.TACKLE_RANGE + 1.5) out.x = { hit: x.hit };
      }
      break;
    }
    case ABILITY.DIG: {
      if (inHub && Number.isInteger(x.dig) && x.dig >= 0 && x.dig < DIG_SPOTS.length && !room.digs[x.dig]
        && dist2D(msg.p, DIG_SPOTS[x.dig]) < INTERACT.DIG_RANGE + 1) {
        room.digs[x.dig] = now + INTERACT.DIG_RESPAWN_MS;
        broadcastZone(room, HUB_ZONE, { t: MSG.OBJECT, z: HUB_ZONE, k: 'dig', i: x.dig, s: 1 });
        client.addScore(INTERACT.DIG_REWARD);
      }
      break;
    }
    case ABILITY.LIFT: {
      const boulders = inHub ? room.boulders : getZone(room, client.zone).boulders;
      const i = Number.isInteger(x.lift) ? x.lift : Number.isInteger(x.drop) ? x.drop : -1;
      if (i < 0 || i >= boulders.length) return;
      const b = boulders[i];
      if (Number.isInteger(x.lift)) {
        const bx = { x: b.p[0], z: b.p[2] };
        if (b.h || boulders.some((o) => o.h === client.id) || dist2D(msg.p, bx) > INTERACT.LIFT_RANGE + 1) return;
        b.h = client.id;
      } else {
        const p = x.p;
        if (b.h !== client.id || !Array.isArray(p) || p.length !== 3 || !p.every(isFiniteNum)) return;
        if (Math.hypot(p[0] - msg.p[0], p[2] - msg.p[2]) > INTERACT.DROP_RANGE) return;
        b.h = 0;
        b.p = p.map(round2);
      }
      broadcastZone(room, client.zone, { t: MSG.OBJECT, z: client.zone, k: 'boulder', i, s: [b.p[0], b.p[1], b.p[2], b.h] });
      if (!inHub && !b.h) onWorldBoulderDropped(room, client);
      return; // el estado del objeto ya informa a todos
    }
    default:
      break; // party, sprint, ice, sniff: solo efecto visual/buff en los clientes
  }
  broadcastZone(room, client.zone, out, client.id);
}

const round2 = (n) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// WebSocket
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ server: httpServer, path: '/ws', maxPayload: MAX_MESSAGE_BYTES });

wss.on('connection', (ws) => {
  const client = new Client(ws);
  clients.set(ws, client);

  ws.on('pong', () => { client.alive = true; });

  ws.on('message', (data, isBinary) => {
    if (isBinary) return;
    const now = Date.now();
    if (now - client.msgWindow > 1000) {
      client.msgWindow = now;
      client.msgCount = 0;
    }
    if (++client.msgCount > MAX_MESSAGES_PER_SECOND) return; // limitación de ritmo

    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (msg && typeof msg.t === 'string') handleMessage(client, msg);
  });

  ws.on('close', () => {
    leaveRoom(client);
    clients.delete(ws);
  });

  ws.on('error', () => ws.terminate());
});

// Difusión de instantáneas (solo jugadores que han cambiado).
setInterval(() => {
  const now = Date.now();
  for (const room of rooms.values()) {
    // Instantáneas por zona: cada jugador solo recibe a los de su misma zona.
    const byZone = new Map();
    for (const c of room.players.values()) {
      if (!c.dirty) continue;
      c.dirty = false;
      if (!byZone.has(c.zone)) byZone.set(c.zone, []);
      byZone.get(c.zone).push([c.id, c.p[0], c.p[1], c.p[2], c.r, c.a]);
    }
    for (const [zone, s] of byZone) broadcastZone(room, zone, { t: MSG.SNAPSHOT, ts: now, s });
    tickPortals(room, now);

    for (const [id, respawnAt] of room.collected) {
      if (now >= respawnAt) {
        room.collected.delete(id);
        room.broadcast({ t: MSG.RESPAWN, id });
      }
    }
    for (let i = 0; i < room.rocks.length; i++) {
      if (room.rocks[i] && now >= room.rocks[i]) {
        room.rocks[i] = 0;
        broadcastZone(room, HUB_ZONE, { t: MSG.OBJECT, z: HUB_ZONE, k: 'rock', i, s: 0 });
      }
    }
    for (let i = 0; i < room.digs.length; i++) {
      if (room.digs[i] && now >= room.digs[i]) {
        room.digs[i] = 0;
        broadcastZone(room, HUB_ZONE, { t: MSG.OBJECT, z: HUB_ZONE, k: 'dig', i, s: 0 });
      }
    }
  }
}, 1000 / NET.SNAPSHOT_RATE_HZ);

// Heartbeat: cierra conexiones muertas (móviles que pierden cobertura).
setInterval(() => {
  for (const [ws, client] of clients) {
    if (!client.alive) {
      ws.terminate();
      continue;
    }
    client.alive = false;
    ws.ping();
  }
}, 10000);

httpServer.listen(PORT, HOST, () => {
  console.log(`DogWorld listo en http://localhost:${PORT}  (WebSocket en /ws)`);
});
