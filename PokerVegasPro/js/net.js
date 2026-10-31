/* PokerVegasPro — salas privadas online con amigos.
 *
 * Arquitectura «anfitrión con autoridad»: quien crea la sala ejecuta el motor de póker y retransmite cada evento;
 * los demás reciben el estado y solo envían sus acciones. Transporte: canal de difusión de Supabase Realtime (no usa
 * tablas) o, sin servidor, BroadcastChannel entre pestañas del mismo navegador (útil para probar en local).
 *
 * Privacidad: las cartas propias viajan cifradas para cada jugador (ECDH P-256 + AES-GCM): el resto de clientes
 * de la sala no puede leerlas aunque reciban el mensaje.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const U = PVP.util;
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  /* ---------- identidad, códigos y enlaces ---------- */

  function randomId(len) {
    const a = new Uint8Array(len);
    root.crypto.getRandomValues(a);
    return Array.from(a, (b) => ALPHABET[b % ALPHABET.length]).join('');
  }

  /** Id del cliente para esta pestaña (se conserva al recargar, así se puede reconectar al mismo asiento). */
  function clientId() {
    if (clientId.v) return clientId.v;
    let id = null;
    try { id = sessionStorage.getItem('pvp.cid'); } catch (e) { /* sin almacenamiento */ }
    if (!id) {
      id = 'c' + randomId(10);
      try { sessionStorage.setItem('pvp.cid', id); } catch (e) { /* sin almacenamiento */ }
    }
    return (clientId.v = id);
  }

  const roomCode = () => randomId(6);
  const normalizeCode = (c) => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

  /** URL base del juego publicado (para que el enlace abra la sala). En file:// se usa Config.PUBLIC_URL. */
  function baseUrl() {
    if (/^https?:$/.test(location.protocol)) return location.origin + location.pathname;
    return (PVP.Config && PVP.Config.PUBLIC_URL) || '';
  }
  function inviteLink(code) {
    const base = baseUrl();
    return base ? base + '#sala=' + code : '';
  }
  function shareText(code, title) {
    const link = inviteLink(code);
    return `🃏 ¡Te invito a mi mesa de póker en PokerVegasPro${title ? ' «' + title + '»' : ''}!\n` +
      (link ? `Entra directo: ${link}\n` : '') + `Código de sala: ${code}`;
  }
  const whatsappUrl = (text) => 'https://wa.me/?text=' + encodeURIComponent(text);

  /* ---------- transportes ---------- */

  class SupabaseTransport {
    constructor(client, code, onMsg) { this.client = client; this.name = 'pvp-room-' + code; this.onMsg = onMsg; }
    open() {
      return new Promise((resolve, reject) => {
        this.ch = this.client.channel(this.name, { config: { broadcast: { self: false, ack: false } } });
        this.ch.on('broadcast', { event: 'm' }, (msg) => this.onMsg(msg.payload));
        let done = false;
        const t = setTimeout(() => { if (!done) { done = true; reject(new Error('No se pudo conectar con el servidor de salas.')); } }, 10000);
        this.ch.subscribe((status) => {
          if (done) return;
          if (status === 'SUBSCRIBED') { done = true; clearTimeout(t); resolve(); }
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            done = true; clearTimeout(t); reject(new Error('No se pudo conectar con el servidor de salas.'));
          }
        });
      });
    }
    send(msg) { if (this.ch) this.ch.send({ type: 'broadcast', event: 'm', payload: msg }); }
    close() { if (this.ch) { this.client.removeChannel(this.ch); this.ch = null; } }
  }

  class LocalTransport {
    constructor(code, onMsg) { this.name = 'pvp-room-' + code; this.onMsg = onMsg; }
    open() {
      this.bc = new BroadcastChannel(this.name);
      this.bc.onmessage = (e) => this.onMsg(e.data);
      return Promise.resolve();
    }
    send(msg) { if (this.bc) this.bc.postMessage(msg); }
    close() { if (this.bc) { this.bc.close(); this.bc = null; } }
  }

  function makeTransport(code, onMsg) {
    const forceLocal = /[?&]net=local\b/.test(location.search);
    const sb = PVP.Backend && PVP.Backend.client;
    if (!forceLocal && sb && sb.channel) return new SupabaseTransport(sb, code, onMsg);
    if (root.BroadcastChannel) return new LocalTransport(code, onMsg);
    return null;
  }
  const isOnline = () => !/[?&]net=local\b/.test(location.search) && !!(PVP.Backend && PVP.Backend.client);

  /* ---------- cifrado de cartas ---------- */

  const subtle = root.crypto && root.crypto.subtle;
  const b64 = (buf) => btoa(String.fromCharCode.apply(null, new Uint8Array(buf)));
  const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const Crypto = {
    ok: !!subtle,
    async keys() {
      if (!subtle) return { priv: null, pub: null };
      const kp = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']);
      return { priv: kp.privateKey, pub: await subtle.exportKey('jwk', kp.publicKey) };
    },
    async derive(priv, pubJwk) {
      if (!subtle || !priv || !pubJwk) return null;
      const pub = await subtle.importKey('jwk', pubJwk, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
      return subtle.deriveKey({ name: 'ECDH', public: pub }, priv, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    },
    async seal(key, obj) {
      const data = new TextEncoder().encode(JSON.stringify(obj));
      if (!key) return { plain: obj };
      const iv = root.crypto.getRandomValues(new Uint8Array(12));
      return { iv: b64(iv), ct: b64(await subtle.encrypt({ name: 'AES-GCM', iv }, key, data)) };
    },
    async open(key, box) {
      if (!box) return null;
      if (box.plain !== undefined) return box.plain;
      if (!key) return null;
      const out = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
      return JSON.parse(new TextDecoder().decode(out));
    },
  };

  /* ---------- sala ---------- */

  /**
   * Canal de una sala. Mensajes: { k: tipo, f: remitente, to?: destinatario, d: datos }.
   * Emite el tipo de cada mensaje recibido con (datos, remitente). Los envíos salen en orden.
   */
  class Room extends PVP.Emitter {
    constructor(code, role) {
      super();
      this.code = code;
      this.role = role; // 'host' | 'client'
      this.cid = clientId();
      this.peerKeys = new Map(); // cid → clave AES compartida
      this._q = Promise.resolve();
      this.closed = false;
    }

    async connect() {
      const k = await Crypto.keys();
      this.priv = k.priv;
      this.pub = k.pub;
      this.transport = makeTransport(this.code, (m) => this._onMsg(m));
      if (!this.transport) throw new Error('Tu navegador no permite salas online.');
      await this.transport.open();
      this.online = this.transport instanceof SupabaseTransport;
      return this;
    }

    _onMsg(m) {
      if (this.closed || !m || m.f === this.cid) return;
      if (m.to && m.to !== this.cid) return;
      this.lastSeen = Date.now();
      // Cada manejador recibe (datos, remitente); el Emitter genérico solo pasa un argumento.
      const list = this._handlers[m.k];
      if (list) for (const fn of list.slice()) fn(m.d, m.f);
    }

    /** Encola un envío (las tareas asíncronas, como cifrar, no alteran el orden). */
    queue(fn) {
      this._q = this._q.then(fn).catch((e) => { if (root.console) console.warn('[sala]', e); });
      return this._q;
    }

    send(k, d, to) {
      return this.queue(() => { if (!this.closed) this.transport.send({ k, f: this.cid, to: to || undefined, d }); });
    }

    async keyFor(cid, pubJwk) {
      if (this.peerKeys.has(cid)) return this.peerKeys.get(cid);
      const key = await Crypto.derive(this.priv, pubJwk);
      this.peerKeys.set(cid, key);
      return key;
    }

    close() {
      if (this.closed) return;
      this.closed = true;
      if (this.transport) this.transport.close();
    }
  }

  /* ---------- espejo del motor para los invitados ---------- */

  /**
   * Imita la interfaz de PokerEngine con el estado que envía el anfitrión, para que GameController,
   * la mesa y el HUD funcionen igual en el anfitrión y en los invitados.
   */
  class MirrorEngine extends PVP.Emitter {
    constructor(nSeats, myId) {
      super();
      this.myId = myId;
      this.seats = new Array(nSeats).fill(null);
      this.sb = 0; this.bb = 0;
      this.handNo = 0; this.dealer = -1; this.sbSeat = -1; this.bbSeat = -1;
      this.phase = 'idle'; this.street = 'preflop'; this.board = []; this.pot = 0; this._potTotal = 0;
      this.toAct = -1; this.currentBet = 0;
      this.myCards = null; this.myHand = -1;
      this.imgs = Object.create(null);
    }
    players() { return this.seats.filter(Boolean); }
    live() { return this.seats.filter((p) => p && p.inHand && !p.folded); }
    potTotal() { return this._potTotal; }
    legal(seat) { return seat === this.toAct && this._legalSeat === seat ? this._legal : null; }
    canStart() { return false; }
    startHand() { return false; }
    setBlinds() {}
    act() { return false; }
    sit() { return null; }
    leave() {}
    dispose() { this.disposed = true; }
    snapshot() {
      return {
        handNo: this.handNo, phase: this.phase, street: this.street, board: this.board.slice(), pot: this.pot, potTotal: this._potTotal,
        dealer: this.dealer, sbSeat: this.sbSeat, bbSeat: this.bbSeat, toAct: this.toAct, currentBet: this.currentBet, sb: this.sb, bb: this.bb, seats: this.seats,
      };
    }
    mySeat() { const p = this.seats.find((x) => x && x.id === this.myId); return p ? p.seat : -1; }

    /** Aplica una instantánea pública del anfitrión, conservando mis cartas descifradas. */
    apply(s) {
      if (!s) return;
      for (const k of ['handNo', 'phase', 'street', 'board', 'pot', 'dealer', 'sbSeat', 'bbSeat', 'toAct', 'currentBet', 'sb', 'bb']) this[k] = s[k];
      this._potTotal = s.potTotal;
      if (s.handNo !== this.myHand) this.myCards = null;
      this.seats = s.seats.map((p, i) => {
        if (!p) return null;
        const prev = this.seats[i];
        const o = prev && prev.id === p.id ? Object.assign(prev, p) : Object.assign({}, p);
        o.seat = i;
        o.isHero = p.id === this.myId;
        o.img = this.imgs[p.id] || null;
        if (o.isHero && this.myCards && o.inHand) o.cards = this.myCards.slice();
        return o;
      });
    }

    /** Evento del anfitrión → mismo evento que emitiría el motor local. */
    feed(type, payload, s) {
      this.apply(s);
      payload = Object.assign({}, payload);
      if (type === 'turn') { this._legal = payload.legal || null; this._legalSeat = payload.seat; }
      if (type === 'action') payload.player = this.seats[payload.seat] || { name: '?', seat: payload.seat };
      this.emit(type, payload);
    }
  }

  /* ---------- instantánea pública (lado anfitrión) ---------- */

  /** Copia serializable del estado sin cartas ocultas ni fotos (las fotos se envían una vez en la lista de jugadores). */
  function publicSnap(snap) {
    return {
      handNo: snap.handNo, phase: snap.phase, street: snap.street, board: snap.board, pot: snap.pot, potTotal: snap.potTotal,
      dealer: snap.dealer, sbSeat: snap.sbSeat, bbSeat: snap.bbSeat, toAct: snap.toAct, currentBet: snap.currentBet, sb: snap.sb, bb: snap.bb,
      seats: snap.seats.map((p) => p && {
        id: p.id, name: p.name, stack: p.stack, bet: p.bet, total: p.total, folded: p.folded, allIn: p.allIn, inHand: p.inHand,
        sittingOut: !!p.sittingOut, lastAction: p.lastAction, revealed: !!p.revealed, isBot: !!p.isBot, bounty: p.bounty || 0,
        look: p.look || null, remote: !!p.remote,
        cards: p.revealed ? p.cards.slice() : p.cards.map(() => -1),
      }),
    };
  }

  /** Copia del payload de un evento apta para enviar (sin referencias a objetos de jugador). */
  function publicPayload(type, payload) {
    if (!payload) return payload;
    if (type === 'action') return { seat: payload.seat, action: payload.action };
    if (type === 'handEnd') return { result: payload.result, busted: payload.busted, knockouts: payload.knockouts, handNo: payload.handNo };
    return payload;
  }

  PVP.Net = {
    clientId, roomCode, normalizeCode, inviteLink, shareText, whatsappUrl, baseUrl, isOnline,
    Room, MirrorEngine, Crypto, publicSnap, publicPayload,
    available: () => !!(PVP.Backend && PVP.Backend.client) || !!root.BroadcastChannel,
  };
})(typeof window !== 'undefined' ? window : globalThis);
