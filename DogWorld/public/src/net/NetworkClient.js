// Cliente WebSocket: sala, envío de estado a frecuencia fija, ping y reconexión automática.
import { MSG, NET, PROTOCOL_VERSION } from './protocol.js';

export class NetworkClient {
  constructor(url = NetworkClient.defaultUrl()) {
    this.url = url;
    this.ws = null;
    this.connected = false;
    this.joined = false;
    this.playerId = -1;
    this.room = null;
    this.joinInfo = null;
    this.rtt = 0;
    this.retry = 0;
    this.closedByUser = false;

    this.sendInterval = 1 / NET.SEND_RATE_HZ;
    this.sendAccum = 0;
    this.lastSent = { x: NaN, y: NaN, z: NaN, r: NaN, a: -1 };
    this.lastSendAt = 0;

    // Callbacks (asignados por Game).
    this.onStatus = null;       // (connected: boolean) => void
    this.onWelcome = null;      // (msg) => void
    this.onPlayerJoin = null;   // (player) => void
    this.onPlayerLeave = null;  // (id) => void
    this.onSnapshot = null;     // (msg) => void
    this.onCollected = null;    // (msg) => void
    this.onRespawn = null;      // (id) => void
    this.onError = null;        // (msg) => void
    this.onRoomInfo = null;     // (msg) => void
    this.onPlayerBreed = null;  // (id, breedId) => void
    this.onAbility = null;      // (msg) => void
    this.onObject = null;       // (msg) => void
    this.onScore = null;        // (msg) => void
    this.onZone = null;         // (msg) => void  yo cambio de zona
    this.onPlayerZone = null;   // (msg) => void  otro jugador cambia de zona
    this.onPortalStatus = null; // (msg) => void
    this.onMission = null;      // (msg) => void
    this.onWorldComplete = null; // (msg) => void

    this.pingTimer = null;
  }

  static defaultUrl() {
    const custom = new URLSearchParams(location.search).get('server');
    if (custom) return custom;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/ws`;
  }

  /** Conecta y entra en la sala. Resuelve con el mensaje WELCOME o rechaza si no hay servidor. */
  join(room, name, breed) {
    this.joinInfo = { room, name, breed };
    this.closedByUser = false;
    return new Promise((resolve, reject) => {
      this._pendingJoin = { resolve, reject };
      this.open();
    });
  }

  /** Abre la conexión sin entrar en ninguna sala (para consultar razas ocupadas). */
  connect() {
    this.closedByUser = false;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      this._pendingConnect = { resolve, reject };
      this.open();
    });
  }

  /** Pregunta qué razas están ocupadas en una sala. */
  async queryRoom(room) {
    await this.connect();
    return new Promise((resolve) => {
      this._pendingQuery = resolve;
      this.send({ t: MSG.ROOM_QUERY, room });
    });
  }

  changeBreed(breed) {
    if (this.joinInfo) this.joinInfo.breed = breed;
    this.send({ t: MSG.BREED, b: breed });
  }

  /** Listo junto a un portal del Hub (w) o fuera de él (null). */
  portal(w) {
    this.send({ t: MSG.PORTAL, w });
  }

  exitWorld() {
    this.send({ t: MSG.EXIT });
  }

  act(k, v) {
    this.send({ t: MSG.ACT, k, v });
  }

  ability(msg) {
    msg.t = MSG.ABILITY;
    this.send(msg);
  }

  open() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.ws.readyState === WebSocket.OPEN && this.joinInfo) this.sendJoin();
      return;
    }
    let ws;
    try {
      ws = new WebSocket(this.url);
    } catch (err) {
      this.failPending(err);
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this.connected = true;
      this.retry = 0;
      this.onStatus?.(true);
      if (this._pendingConnect) {
        this._pendingConnect.resolve();
        this._pendingConnect = null;
      }
      if (this.joinInfo) this.sendJoin();
      clearInterval(this.pingTimer);
      this.pingTimer = setInterval(() => this.send({ t: MSG.PING, ts: performance.now() }), 2000);
    };

    ws.onmessage = (ev) => {
      let msg;
      try { msg = JSON.parse(ev.data); } catch { return; }
      this.handle(msg);
    };

    ws.onclose = () => {
      const wasConnected = this.connected;
      this.connected = false;
      this.joined = false;
      clearInterval(this.pingTimer);
      if (wasConnected) this.onStatus?.(false);
      if (!wasConnected) this.failPending(new Error('No se pudo conectar con el servidor'));
      // Reintentar solo si ya hubo conexión (caída de red); el primer fallo pasa a modo sin conexión.
      if (!this.closedByUser && this.joinInfo && (wasConnected || this.retry > 0)) this.scheduleReconnect();
    };

    ws.onerror = () => { /* onclose se encarga */ };
  }

  scheduleReconnect() {
    const delay = Math.min(10000, 500 * 2 ** this.retry);
    this.retry++;
    setTimeout(() => {
      if (!this.closedByUser) this.open();
    }, delay);
  }

  failPending(err) {
    if (this._pendingConnect) {
      this._pendingConnect.reject(err);
      this._pendingConnect = null;
    }
    if (this._pendingJoin) {
      this._pendingJoin.reject(err);
      this._pendingJoin = null;
    }
  }

  sendJoin() {
    const { room, name, breed } = this.joinInfo;
    this.send({ t: MSG.JOIN, v: PROTOCOL_VERSION, room, name, b: breed });
  }

  handle(msg) {
    switch (msg.t) {
      case MSG.WELCOME:
        this.joined = true;
        this.playerId = msg.id;
        this.room = msg.room;
        this.lastSent.a = -1; // forzar envío inmediato del estado
        this.onWelcome?.(msg);
        if (this._pendingJoin) {
          this._pendingJoin.resolve(msg);
          this._pendingJoin = null;
        }
        break;
      case MSG.PLAYER_JOIN: this.onPlayerJoin?.(msg.player); break;
      case MSG.PLAYER_LEAVE: this.onPlayerLeave?.(msg.id); break;
      case MSG.SNAPSHOT: this.onSnapshot?.(msg); break;
      case MSG.COLLECTED: this.onCollected?.(msg); break;
      case MSG.RESPAWN: this.onRespawn?.(msg.id); break;
      case MSG.PONG: this.rtt = performance.now() - msg.ts; break;
      case MSG.ROOM_INFO:
        this.onRoomInfo?.(msg);
        if (this._pendingQuery) {
          this._pendingQuery(msg);
          this._pendingQuery = null;
        }
        break;
      case MSG.PLAYER_BREED: this.onPlayerBreed?.(msg.id, msg.b); break;
      case MSG.ABILITY: this.onAbility?.(msg); break;
      case MSG.OBJECT: this.onObject?.(msg); break;
      case MSG.SCORE: this.onScore?.(msg); break;
      case MSG.ZONE: this.onZone?.(msg); break;
      case MSG.PLAYER_ZONE: this.onPlayerZone?.(msg); break;
      case MSG.PORTAL_STATUS: this.onPortalStatus?.(msg); break;
      case MSG.MISSION: this.onMission?.(msg); break;
      case MSG.WORLD_COMPLETE: this.onWorldComplete?.(msg); break;
      case MSG.ERROR:
        this.onError?.(msg);
        if (this._pendingJoin) {
          const err = new Error(msg.msg);
          err.code = msg.code;
          err.taken = msg.taken;
          this.joinInfo = null; // no reintentar con datos rechazados
          this._pendingJoin.reject(err);
          this._pendingJoin = null;
        }
        break;
      default: break;
    }
  }

  send(obj) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  /** Llamar cada frame: envía a SEND_RATE_HZ solo si el estado cambió (o latido cada 2 s). */
  update(dt, pos, yaw, anim) {
    if (!this.joined) return;
    this.sendAccum += dt;
    if (this.sendAccum < this.sendInterval) return;
    this.sendAccum %= this.sendInterval;

    const l = this.lastSent;
    const moved = Math.abs(pos.x - l.x) > 0.01 || Math.abs(pos.y - l.y) > 0.01 || Math.abs(pos.z - l.z) > 0.01
      || Math.abs(yaw - l.r) > 0.02 || anim !== l.a;
    // Latido en tiempo real (no de frames): reenvía el estado aunque el móvil vaya lento.
    const now = performance.now();
    if (!moved && now - this.lastSendAt < 1000) return;

    this.lastSendAt = now;
    l.x = pos.x; l.y = pos.y; l.z = pos.z; l.r = yaw; l.a = anim;
    this.send({ t: MSG.STATE, p: [round2(pos.x), round2(pos.y), round2(pos.z)], r: round2(yaw), a: anim });
  }

  collect(id) {
    this.send({ t: MSG.COLLECT, id });
  }

  close() {
    this.closedByUser = true;
    this.joined = false;
    clearInterval(this.pingTimer);
    this.ws?.close();
  }
}

const round2 = (n) => Math.round(n * 100) / 100;
