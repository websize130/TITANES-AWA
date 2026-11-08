// DogWorld — servidor HTTP estático + WebSocket de salas en tiempo real.
// Uso: npm install && npm start  ->  http://localhost:8080
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import {
  MSG, NET, PROTOCOL_VERSION, ANIM, PLAYER_COLORS, sanitizeName, sanitizeRoom,
} from '../public/src/net/protocol.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const THREE_DIR = path.join(ROOT, 'node_modules', 'three');
const PORT = Number(process.env.PORT) || 8080;
const HOST = process.env.HOST || '0.0.0.0';

const MAX_MESSAGE_BYTES = 1024;
const MAX_MESSAGES_PER_SECOND = 40;
const WORLD_BOUNDS = 400; // |x|,|z| máximos aceptados
const MAX_SPEED_PER_MSG = 25; // metros por mensaje (anti-teleport básico)

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
}

class Client {
  constructor(ws) {
    this.ws = ws;
    this.id = nextPlayerId++;
    this.room = null;
    this.name = 'Perrito';
    this.color = PLAYER_COLORS[0];
    this.p = [0, 0, 0];
    this.r = 0;
    this.a = ANIM.IDLE;
    this.score = 0;
    this.dirty = false;
    this.msgCount = 0;
    this.msgWindow = Date.now();
    this.alive = true;
  }

  info() {
    return { id: this.id, name: this.name, color: this.color, p: this.p, r: this.r, a: this.a, score: this.score };
  }

  send(obj) {
    if (this.ws.readyState === this.ws.OPEN) this.ws.send(JSON.stringify(obj));
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
  room.players.delete(client.id);
  client.room = null;
  room.broadcast({ t: MSG.PLAYER_LEAVE, id: client.id });
  if (room.players.size === 0) rooms.delete(room.code);
}

const isFiniteNum = (n) => typeof n === 'number' && Number.isFinite(n);

function handleMessage(client, msg) {
  switch (msg.t) {
    case MSG.JOIN: {
      if (msg.v !== PROTOCOL_VERSION) {
        client.send({ t: MSG.ERROR, code: 'version', msg: 'Versión del cliente desactualizada. Recarga la página.' });
        return;
      }
      const code = sanitizeRoom(msg.room);
      const room = getOrCreateRoom(code);
      if (room.players.size >= NET.MAX_PLAYERS_PER_ROOM) {
        client.send({ t: MSG.ERROR, code: 'full', msg: 'La sala está llena.' });
        if (room.players.size === 0) rooms.delete(code);
        return;
      }
      leaveRoom(client);
      client.name = sanitizeName(msg.name);
      client.color = PLAYER_COLORS.includes(msg.color) ? msg.color : PLAYER_COLORS[client.id % PLAYER_COLORS.length];
      client.score = 0;
      client.room = room;
      room.players.set(client.id, client);

      client.send({
        t: MSG.WELCOME,
        id: client.id,
        room: code,
        players: room.infoList().filter((p) => p.id !== client.id),
        collected: [...room.collected.keys()],
      });
      room.broadcast({ t: MSG.PLAYER_JOIN, player: client.info() }, client.id);
      break;
    }

    case MSG.STATE: {
      if (!client.room || !Array.isArray(msg.p) || msg.p.length !== 3) return;
      const [x, y, z] = msg.p;
      if (!isFiniteNum(x) || !isFiniteNum(y) || !isFiniteNum(z) || !isFiniteNum(msg.r)) return;
      if (Math.abs(x) > WORLD_BOUNDS || Math.abs(z) > WORLD_BOUNDS || y < -200 || y > 300) return;
      const dx = x - client.p[0];
      const dz = z - client.p[2];
      // Respawn tras caída: permitimos saltos grandes solo hacia el punto de aparición.
      const nearSpawn = Math.abs(x) < 6 && Math.abs(z - 20) < 6;
      if (dx * dx + dz * dz > MAX_SPEED_PER_MSG * MAX_SPEED_PER_MSG && !nearSpawn) return;
      client.p = [round2(x), round2(y), round2(z)];
      client.r = round2(msg.r);
      client.a = Number.isInteger(msg.a) && msg.a >= 0 && msg.a <= 3 ? msg.a : ANIM.IDLE;
      client.dirty = true;
      break;
    }

    case MSG.COLLECT: {
      const room = client.room;
      const id = msg.id;
      if (!room || !Number.isInteger(id) || id < 0 || id >= NET.COLLECTIBLE_COUNT) return;
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
    const s = [];
    for (const c of room.players.values()) {
      if (!c.dirty) continue;
      c.dirty = false;
      s.push([c.id, c.p[0], c.p[1], c.p[2], c.r, c.a]);
    }
    if (s.length) room.broadcast({ t: MSG.SNAPSHOT, ts: now, s });

    for (const [id, respawnAt] of room.collected) {
      if (now >= respawnAt) {
        room.collected.delete(id);
        room.broadcast({ t: MSG.RESPAWN, id });
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
