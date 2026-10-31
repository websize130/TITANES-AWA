/* PokerVegasPro — controlador de partida: conecta motor, bots, vistas y HUD de acciones.
 * Modos: 'public' (cash con monedas), 'private' (reglas propias, fichas de juego) y 'tournament' (rangos).
 * Las salas privadas pueden ser online (cfg.net): el anfitrión ejecuta el motor y los invitados reciben un espejo
 * (PVP.Net.MirrorEngine) con la misma interfaz, así que vistas, HUD y estadísticas funcionan igual en ambos.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const U = PVP.util;
  const Net = () => PVP.Net;
  const ACTIONS = ['fold', 'check', 'call', 'raise', 'allin'];

  class GameController extends PVP.Emitter {
    /**
     * @param {object} cfg
     *  mode, seats, players (nº inicial incluido el héroe), sb, bb, stack, botLevel ('easy'|'medium'|'hard'|'mixed'),
     *  blindMinutes | handsPerLevel, rebuys, bounty, buyIn, tournament
     * @param {object} deps { store, host, hud }
     */
    constructor(cfg, deps) {
      super();
      this.cfg = cfg;
      this.store = deps.store;
      this.host = deps.host;
      this.hud = deps.hud;
      this.prefs = this.store.profile.prefs;
      this.level = 0;
      this.baseSb = cfg.sb;
      this.levelStart = Date.now();
      this.handsAtLevel = 0;
      this.rebuysUsed = 0;
      this.bountyCoins = 0;
      this.timers = new Set();
      this.peek = !!this.prefs.autoPeek;
      this.over = false;
      this.paused = false;
      this.nextId = 1;
      this.tPlaces = [];
      // Sala online: { role: 'host' | 'client', room, welcome? }
      this.net = cfg.net || null;
      this.isHost = !!(this.net && this.net.role === 'host');
      this.isClient = !!(this.net && this.net.role === 'client');
      this.room = this.net ? this.net.room : null;
      this.myId = this.net ? Net().clientId() : 'hero';
      this.hero = this.isClient ? -1 : 0; // asiento propio (el invitado lo conoce cuando el anfitrión le sienta)
      this.begun = !this.net;
      this.tracker = new PVP.Stats.Tracker(this.store, this.hero);

      if (this.isClient) {
        this.engine = new (Net().MirrorEngine)(cfg.seats, this.myId);
      } else {
        this.engine = new PVP.PokerEngine({
          seats: cfg.seats, sb: cfg.sb, bb: cfg.bb,
          schedule: (fn, ms) => this._later(fn, ms / (this.prefs.speed || 1)),
        });
        const hero = this.engine.sit(0, {
          id: this.myId, name: this.store.profile.name, isBot: false, stack: cfg.stack, bounty: cfg.bounty || 0,
          look: this.prefs.look || { base: 'marco' }, img: this.prefs.avatarImg || null,
        });
        hero.isHero = true;
        // En una sala online los asientos se completan con bots al empezar (los amigos tienen prioridad).
        if (!this.isHost) {
          const taken = [hero.name];
          for (let s = 1; s < cfg.players; s++) this._addBot(s, taken);
        }
      }

      this._mountViews();
      this.engine.on('*', (type, payload) => this._onEngine(type, payload));
      this.hud.bind(this);
      if (this.isHost) this._bindHost();
      if (this.isClient) this._bindClient(this.net.welcome);
    }

    get authority() { return !this.isClient; }

    /* ---------- utilidades ---------- */

    _later(fn, ms) {
      const id = setTimeout(() => { this.timers.delete(id); if (!this.over) fn(); }, ms);
      this.timers.add(id);
      return id;
    }

    _botLevel() {
      const l = this.cfg.botLevel;
      if (l === 'mixed') return U.pick(['easy', 'medium', 'medium', 'hard']);
      return l || 'medium';
    }

    _addBot(seat, taken, sittingOut) {
      taken = taken || this.engine.players().map((p) => p.name);
      const persona = PVP.Bots.createPersona(this._botLevel(), taken);
      taken.push(persona.name);
      const stack = this.cfg.mode === 'public'
        ? Math.round(this.cfg.stack * U.rand(0.6, 1.6) / this.cfg.bb) * this.cfg.bb
        : this.cfg.stack;
      const p = this.engine.sit(seat, Object.assign(persona, { id: 'b' + this.nextId++, stack, bounty: this.cfg.bounty || 0, rebuys: 0 }));
      p.sittingOut = !!sittingOut;
      return p;
    }

    snap() { return this.engine.snapshot(); }

    /* ---------- vistas ---------- */

    _mountViews() {
      const table = PVP.Catalog.table(this.prefs.table);
      this.view = new PVP.TableView(this.host, {
        heroSeat: this.hero,
        deck: this.prefs.deck,
        table,
        orientation: this._orientation(),
        isPrivate: this.cfg.mode === 'private' && this.authority,
        onSeatClick: (s) => this.addBotAt(s),
        onKick: (s) => this.kick(s),
      });
      this.view.build(this.cfg.seats);
      this.view.setPeek(this.peek);
      this.view.render(this.snap());
    }

    _orientation() {
      const o = this.prefs.orientation;
      if (o === 'h' || o === 'v') return o;
      return root.innerWidth < root.innerHeight ? 'v' : 'h';
    }

    setOrientation(o) {
      if (this.prefs.orientation !== o) this.store.setPref('orientation', o);
      const real = this._orientation();
      if (real !== this.view.orientation) {
        this.view.setOrientation(real);
      }
      this.hud.syncToggles();
    }

    setTable(id) {
      const t = PVP.Catalog.table(id);
      if (!this.store.owns(t.tier)) return false;
      this.store.setPref('table', id);
      this.view.setTable(t);
      return true;
    }

    setDeck(id) {
      const d = PVP.Catalog.deck(id);
      if (!this.store.owns(d.tier)) return false;
      this.store.setPref('deck', id);
      this.view.setDeck(id);
      return true;
    }

    setPeek(on) {
      this.peek = on;
      this.view.setPeek(on);
      this.hud.syncPeek(on);
    }

    /* ---------- ciclo ---------- */

    start() {
      if (this.isClient) return this._clientStart();
      if (this.isHost && !this.begun) return this._openLobby();
      this._begin();
    }

    _begin() {
      this.begun = true;
      this.levelStart = Date.now();
      this.tracker.startSession(this.cfg.mode, this.cfg.title);
      if (this.isHost) this._fillBots();
      this._sys(`Mesa abierta · Ciegas ${U.fmt(this.engine.sb)}/${U.fmt(this.engine.bb)}`);
      // Saludos humanizados
      for (const p of this.engine.players()) {
        if (p.isBot && p.chatty > 0.55) this._later(() => this._botSay(p, PVP.Bots.chatLine('greet')), U.randInt(600, 4000));
      }
      this._later(() => this._nextHand(), 900);
      this._tick = setInterval(() => this._updateLevelClock(), 1000);
      this._roomList();
    }

    _nextHand() {
      if (this.over || this.paused) return;
      this._applyLevel();
      this._seatChanges();
      if (this.cfg.mode === 'public') this._refillPublic(0.5);

      if (this.cfg.mode === 'tournament') {
        const alive = this.engine.players().filter((p) => p.stack > 0);
        if (alive.length === 1) return this._finishTournament(alive[0].isHero ? 1 : null);
      }

      if (!this.engine.canStart()) {
        if (this.cfg.mode === 'public') this._refillPublic(1);
        if (!this.engine.canStart()) {
          this.hud.toast('No hay jugadores suficientes. Añade bots o recarga fichas.');
          return;
        }
      }
      this.engine.startHand();
    }

    /** Ciegas progresivas: por tiempo (privadas) o por nº de manos (torneos). */
    _applyLevel() {
      let next = this.level;
      if (this.cfg.blindMinutes) {
        next = Math.floor((Date.now() - this.levelStart) / (this.cfg.blindMinutes * 60000));
      } else if (this.cfg.handsPerLevel) {
        next = Math.floor(this.engine.handNo / this.cfg.handsPerLevel);
      }
      next = Math.min(next, PVP.Catalog.BLIND_LADDER.length - 1);
      if (next !== this.level) {
        this.level = next;
        const sb = U.roundTo(this.baseSb * PVP.Catalog.BLIND_LADDER[next], this.baseSb >= 50 ? 25 : 5);
        this.engine.setBlinds(sb, sb * 2);
        this.hud.toast(`⬆ Suben las ciegas: ${U.fmt(sb)}/${U.fmt(sb * 2)}`);
        this._sys(`Nivel ${next + 1}: ciegas ${U.fmt(sb)}/${U.fmt(sb * 2)}`);
        if (this.isHost) this.room.send('log', { text: `⬆ Suben las ciegas: ${U.fmt(sb)}/${U.fmt(sb * 2)}`, toastOnly: true });
        this._sendLevel();
      }
    }

    _updateLevelClock() {
      let text = `Nivel ${this.level + 1} · ${U.short(this.engine.sb)}/${U.short(this.engine.bb)}`;
      if (this.cfg.blindMinutes) {
        const left = this.cfg.blindMinutes * 60000 - ((Date.now() - this.levelStart) % (this.cfg.blindMinutes * 60000));
        text += ` · ⏱ ${U.mmss(left)}`;
      } else if (this.cfg.handsPerLevel) {
        const left = this.cfg.handsPerLevel - (this.engine.handNo % this.cfg.handsPerLevel);
        text += ` · ${left} mano${left === 1 ? '' : 's'}`;
      }
      this.hud.setLevel(text);
    }

    /** Altas/bajas entre manos (puestos dinámicos). */
    _seatChanges() {
      for (const p of this.engine.players()) {
        if (p.leaving) { this._sys(`${p.name} abandona la mesa`); this.engine.leave(p.seat); continue; }
        if (p.sittingOut && p.isBot && p.stack > 0) p.sittingOut = false;
      }
      if (this.isHost) this._seatPending(false);
      this._render();
    }

    /** Pinta la mesa y, en una sala online, envía el nuevo estado a los invitados. */
    _render() {
      this.view.render(this.snap());
      if (this.isHost) { this.room.send('snap', { s: Net().publicSnap(this.snap()) }); this._roomList(); }
    }

    /** Mensaje de sistema en el registro (y para toda la sala si soy el anfitrión). */
    _sys(text) {
      this.hud.log(text, 'sys');
      if (this.isHost) this.room.send('log', { text, cls: 'sys' });
    }

    _refillPublic(chance) {
      for (let s = 1; s < this.cfg.seats; s++) {
        if (!this.engine.seats[s] && Math.random() < chance) {
          const p = this._addBot(s);
          this._sys(`${p.name} se sienta en la mesa`);
        }
      }
    }

    /* ---------- eventos del motor ---------- */

    _onEngine(type, payload) {
      if (this.isHost) this._broadcastEvent(type, payload);
      if (this.isClient) this._syncHeroSeat();
      const snap = this.snap();
      this.view.onEvent(type, payload, snap);
      this._dock(type, payload);

      switch (type) {
        case 'handStart':
          this.tracker.handStart(this.engine);
          this.hud.hideActions();
          if (this.peek && !this.prefs.autoPeek) this.setPeek(false);
          break;
        case 'turn':
          this._onTurn(payload.seat);
          break;
        case 'action':
          this._onAction(payload);
          break;
        case 'street':
          this.tracker.street(this.engine, payload.street);
          this.hud.log(`— ${{ flop: 'Flop', turn: 'Turn', river: 'River' }[payload.street]}: ${payload.board.map(PVP.Cards.cardLabel).join(' ')}`, 'street');
          break;
        case 'reveal':
          this.hud.log('All-in: se muestran las cartas', 'sys');
          break;
        case 'handEnd':
          this.tracker.handEnd(this.engine, payload.result);
          this._onHandEnd(payload);
          break;
        case 'bust':
          this._onBust(payload);
          break;
        default:
      }
    }

    /** Franja informativa bajo la mesa: tu mejor mano en cada momento y de quién es el turno. */
    _dock(type, payload) {
      const E = this.engine, me = E.seats[this.hero];
      let hand = '';
      if (me && me.inHand && !me.folded && me.cards.length === 2 && me.cards[0] >= 0) {
        const C = PVP.Cards;
        const r = me.cards.slice().sort((x, y) => C.rankOf(y) - C.rankOf(x)).map((c) => C.cardInfo(c).rank);
        const sc = C.evaluate(me.cards.concat(E.board));
        hand = E.board.length ? C.handName(sc) : (r[0] === r[1] ? 'Pareja de ' + r[0] : r.join('-') + (C.suitOf(me.cards[0]) === C.suitOf(me.cards[1]) ? ' del mismo palo' : ''));
      } else if (me && me.inHand && me.folded) hand = 'Te has retirado';
      let status = '';
      if (type === 'turn' && payload) {
        const p = E.seats[payload.seat];
        status = p && p.isHero ? '¡Te toca!' : p ? 'Turno de ' + p.name : '';
      } else if (type === 'handEnd') status = 'Mano terminada';
      else if (type === 'handStart') status = 'Repartiendo…';
      this.hud.dock(hand, status);
    }

    _onTurn(seat) {
      const p = this.engine.seats[seat];
      this.view.stopTimer();
      if (!p) return;
      if (p.isHero) {
        const legal = this.engine.legal(seat);
        if (!legal) return;
        const ms = (this.cfg.turnSeconds || 30) * 1000;
        this.view.startTimer(seat, ms);
        this.hud.showActions(legal, this.engine);
        if (PVP.Sound) PVP.Sound.turn();
        const hand = this.engine.handNo;
        clearTimeout(this._heroTimeout);
        this._heroTimeout = this._later(() => {
          if (this.engine.handNo === hand && this.engine.toAct === seat) {
            this.hud.toast('Tiempo agotado');
            this.heroAct(legal.canCheck ? { type: 'check' } : { type: 'fold' });
          }
        }, ms);
        return;
      }
      // El anillo muestra el tiempo de turno completo, igual que para el jugador.
      this.view.startTimer(seat, (this.cfg.turnSeconds || 30) * 1000);
      if (!this.authority) return; // en un invitado solo se muestra el reloj: decide el anfitrión
      if (p.remote) return this._remoteTurn(p);
      const decision = PVP.Bots.decide(this.engine, seat);
      const hand = this.engine.handNo;
      this._later(() => {
        if (this.engine.handNo !== hand || this.engine.toAct !== seat) return;
        this.engine.act(seat, decision);
      }, decision.delay);
    }

    heroAct(action) {
      if (this.hero < 0 || this.engine.toAct !== this.hero) return;
      clearTimeout(this._heroTimeout);
      this.timers.delete(this._heroTimeout);
      this.hud.hideActions();
      this.view.stopTimer();
      this.tracker.decision(this.engine, action);
      if (this.isClient) this.room.send('act', { hand: this.engine.handNo, action: { type: action.type, amount: action.amount } });
      else this.engine.act(this.hero, action);
    }

    _onAction({ seat, action, player }) {
      this.view.stopTimer();
      const label = { fold: 'se retira', check: 'pasa', call: 'paga', bet: 'apuesta', raise: 'sube a', allin: 'va ALL-IN con' }[action.type] || action.type;
      this.hud.log(`${player.name} ${label}${action.amount && action.type !== 'check' && action.type !== 'fold' ? ' ' + U.fmt(action.amount) : ''}`, player.isHero ? 'hero' : '');
      if (action.type === 'allin') {
        const t = PVP.Catalog.table(this.prefs.table);
        if (t.shark) this.view.shark();
        if (player.isBot && this.authority && Math.random() < 0.4) this._botSay(player, PVP.Bots.chatLine('allin'));
      }
    }

    _onHandEnd({ result, busted }) {
      this.hud.hideActions();
      this.view.stopTimer();
      clearTimeout(this._heroTimeout);
      const hero = this.hero >= 0 ? this.engine.seats[this.hero] : null;
      const winners = [];
      for (const pot of result.pots) for (const s of pot.winners) if (!winners.includes(s)) winners.push(s);

      // Banner y registro
      const parts = winners.map((s) => {
        const p = this.engine.seats[s] || { name: '?' };
        const h = result.hands[s];
        return `<b>${U.esc(p.name)}</b> gana ${U.fmt(result.winnings[s])}${h ? ` · <em>${h.name}</em>` : ''}`;
      });
      this.view.banner(parts.join('<br>'), 3200);
      this.view.highlight(result);
      this.view.animatePotTo(winners);
      for (const s of winners) {
        const h = result.hands[s];
        this.hud.log(`🏆 ${(this.engine.seats[s] || { name: '?' }).name} gana ${U.fmt(result.winnings[s])}${h ? ' con ' + h.name : ''}`, 'win');
      }

      // Estadísticas del héroe
      if (hero && hero.inHand) {
        const st = this.store.profile.stats;
        st.hands++;
        const won = result.winnings[this.hero] || 0;
        const potSize = result.pots.reduce((t, p) => t + p.amount, 0);
        if (won) {
          st.won++;
          st.biggestPot = Math.max(st.biggestPot, potSize);
          if (PVP.Sound) PVP.Sound.win();
        }
        const h = result.hands[this.hero];
        if (h && h.score > st.bestHand) { st.bestHand = h.score; st.bestHandName = h.name; }
        this.store.addXp(won ? 25 : 8);
      }

      if (!this.authority) return; // el anfitrión decide cuándo empieza la siguiente mano

      // Chat humanizado tras manos grandes
      for (const p of this.engine.players()) {
        if (!p.isBot || !p.inHand) continue;
        const potSize = result.pots.reduce((t, x) => t + x.amount, 0);
        if (potSize < this.engine.bb * 12 || Math.random() > p.chatty * 0.5) continue;
        if (winners.includes(p.seat)) { this._later(() => this._botEmote(p, PVP.Bots.emoteFor('win')), 900); break; }
        if (!p.folded && result.hands[p.seat]) { this._later(() => this._botSay(p, PVP.Bots.chatLine('lose')), 1500); break; }
      }

      // Eliminaciones
      const pause = (result.uncontested ? 2200 : 4200) / (this.prefs.speed || 1);
      this._later(() => this._afterHand(busted), pause);
    }

    _onBust({ seat, by }) {
      const victim = this.engine.seats[seat];
      const hunter = this.engine.seats[by];
      if (!victim || !hunter) return;
      if (this.cfg.bounty && victim.bounty) {
        hunter.bountyWon = (hunter.bountyWon || 0) + victim.bounty;
        if (this.isClient && !hunter.isHero) return;
        this.hud.log(`🎯 ${hunter.name} cobra la recompensa de ${victim.name} (${U.fmt(victim.bounty)})`, 'win');
        if (hunter.isHero) {
          this.bountyCoins += victim.bounty;
          this.store.profile.stats.knockouts++;
          this.store.save();
          this.hud.toast(`🎯 ¡Recompensa! +${U.fmt(victim.bounty)} monedas al salir`);
        }
      }
    }

    _afterHand(busted) {
      if (this.over) return;
      const hero = this.engine.seats[this.hero];

      for (const s of busted) {
        const p = this.engine.seats[s];
        if (!p || p.isHero) continue;
        if (this.cfg.mode === 'tournament') {
          this.tPlaces.unshift(p.name);
          this._sys(`${p.name} queda eliminado`);
          p.leaving = true;
        } else if (this.cfg.mode === 'private' && this.cfg.rebuys > (p.rebuys || 0) && (p.remote || Math.random() < 0.75)) {
          // Los amigos recompran automáticamente mientras les queden recompras (son fichas de juego).
          p.rebuys = (p.rebuys || 0) + 1;
          p.stack = this.cfg.stack;
          this._sys(`${p.name} hace recompra (${p.rebuys}/${this.cfg.rebuys})`);
        } else {
          p.leaving = true;
          if (p.remote) this.room.send('toast', { text: 'Te has quedado sin fichas. Puedes seguir mirando la partida.' }, p.id);
        }
      }

      if (hero && hero.stack === 0) return this._heroBusted();
      this._nextHand();
    }

    _heroBusted() {
      const cfg = this.cfg;
      if (cfg.mode === 'tournament') {
        const alive = this.engine.players().filter((p) => p.stack > 0).length;
        return this._finishTournament(alive + 1);
      }
      if (cfg.mode === 'private' && this.rebuysUsed < (cfg.rebuys || 0)) {
        return this.hud.askRebuy({
          text: `Recompra ${this.rebuysUsed + 1}/${cfg.rebuys}: vuelves con ${U.fmt(cfg.stack)} fichas.`,
          onYes: () => { this.rebuysUsed++; this.engine.seats[this.hero].stack = cfg.stack; this._nextHand(); },
          onNo: () => this.leave(),
        });
      }
      if (cfg.mode === 'public') {
        const can = this.store.profile.coins >= cfg.buyIn;
        return this.hud.askRebuy({
          text: can ? `Recargar ${U.fmt(cfg.buyIn)} monedas para seguir jugando.` : 'No tienes monedas suficientes para recargar.',
          canYes: can,
          onYes: () => {
            if (!this.store.spend(cfg.buyIn, 'rebuy')) return this.leave();
            this.reloads = (this.reloads || 0) + 1;
            this.engine.seats[this.hero].stack = cfg.buyIn;
            this._nextHand();
          },
          onNo: () => this.leave(),
        });
      }
      this.hud.askRebuy({ text: 'Te has quedado sin fichas.', canYes: false, onNo: () => this.leave() });
    }

    _finishTournament(place) {
      if (this.over) return;
      const t = this.cfg.tournament;
      const st = this.store.profile.stats;
      st.tournaments++;
      let prize = 0;
      if (place && place <= PVP.Catalog.PAYOUTS.length) {
        prize = Math.round(t.prize * PVP.Catalog.PAYOUTS[place - 1]);
        st.itm++;
        if (place === 1) st.tournamentWins++;
        this.store.addCoins(prize, 'tournament_prize');
      }
      this.store.addXp(place === 1 ? 400 : place && place <= 3 ? 150 : 40);
      this.store.save();
      this._stop();
      this.hud.showResult({
        title: place === 1 ? '🏆 ¡Campeón!' : place ? `Puesto ${place}º` : 'Torneo finalizado',
        text: prize ? `Premio: <b>${U.fmt(prize)}</b> monedas · Torneo ${t.name}` : `Torneo ${t.name}. ¡La próxima vez!`,
        tier: t.id,
      });
    }

    /* ---------- sala online: anfitrión ---------- */

    _bindHost() {
      const room = this.room;
      this.pending = [];             // amigos esperando asiento (tienen prioridad sobre los bots)
      this.peers = new Map();        // cid → { name, look, img, lastSeen }
      room.on('hello', (d, cid) => this._onHello(d || {}, cid));
      room.on('act', (d, cid) => this._onRemoteAct(d || {}, cid));
      room.on('chat', (d, cid) => this._onRemoteChat(d || {}, cid));
      room.on('emote', (d, cid) => this._onRemoteEmote(d || {}, cid));
      room.on('ping', (d, cid) => { const peer = this.peers.get(cid); if (peer) peer.lastSeen = Date.now(); });
      room.on('bye', (d, cid) => this._peerGone(cid, true));
      // Latido: avisa de que la sala sigue abierta y detecta amigos desconectados.
      this._beat = setInterval(() => {
        room.send('ping', {});
        const now = Date.now();
        for (const [cid, peer] of this.peers) {
          if (now - peer.lastSeen > 45000) this._peerGone(cid, false);
          else {
            const p = this._playerById(cid);
            if (p) p.disconnected = now - peer.lastSeen > 15000;
          }
        }
      }, 5000);
    }

    _playerById(id) { return this.engine.players().find((p) => p.id === id) || null; }

    _cleanHello(d) {
      const name = String(d.name || 'Jugador').replace(/[<>]/g, '').trim().slice(0, 18) || 'Jugador';
      let look = d.look && typeof d.look === 'object' ? d.look : null;
      if (look && JSON.stringify(look).length > 600) look = null;
      const img = typeof d.img === 'string' && /^data:image\/(jpeg|png|webp);base64,/.test(d.img) && d.img.length < 60000 ? d.img : null;
      return { name, look: look || { base: 'marco' }, img };
    }

    async _onHello(d, cid) {
      if (this.over || !cid) return;
      const info = this._cleanHello(d);
      const known = this.peers.get(cid);
      this.peers.set(cid, Object.assign(known || {}, info, { lastSeen: Date.now() }));
      await this.room.keyFor(cid, d.pub);
      let p = this._playerById(cid);
      if (p) {
        p.disconnected = false;
        p.leaving = false;
      } else if (!this.pending.includes(cid)) {
        this.pending.push(cid);
        this._sys(`${info.name} ha entrado en la sala`);
        this.hud.toast(`👋 ${U.esc(info.name)} se ha unido a la sala`);
        this._seatPending(this.begun && this.engine.phase !== 'idle' && this.engine.phase !== 'ended');
        p = this._playerById(cid);
        if (!p) this.room.send('toast', { text: 'La mesa está completa: te sentarás en cuanto quede un asiento libre.' }, cid);
      }
      // Bienvenida con la configuración, el estado público, las fotos y (si estaba en la mano) sus cartas cifradas.
      const imgs = {};
      for (const pl of this.engine.players()) if (pl.img) imgs[pl.id] = pl.img;
      const welcome = {
        cfg: this._publicCfg(), snap: Net().publicSnap(this.snap()), imgs, pub: this.room.pub, begun: this.begun,
        level: this._levelInfo(), host: this.store.profile.name,
      };
      if (p && p.inHand && p.cards.length) welcome.priv = await Net().Crypto.seal(this.room.peerKeys.get(cid), { hand: this.engine.handNo, cards: p.cards.slice() });
      this.room.send('welcome', welcome, cid);
      if (info.img) this.room.send('player', { id: cid, img: info.img });
      this._render();
      if (this.begun && this.engine.phase === 'idle' && this.engine.canStart()) this._nextHand();
    }

    _publicCfg() {
      const c = this.cfg;
      return {
        mode: 'private', title: c.title, code: c.code, seats: c.seats, players: c.players, sb: c.sb, bb: c.bb, stack: c.stack,
        blindMinutes: c.blindMinutes, rebuys: c.rebuys, bounty: c.bounty, turnSeconds: c.turnSeconds,
      };
    }

    _levelInfo() { return { level: this.level, elapsed: Date.now() - this.levelStart, blindMinutes: this.cfg.blindMinutes }; }
    _sendLevel() { if (this.isHost) this.room.send('lvl', this._levelInfo()); }

    /**
     * Sienta a los amigos que esperan: primero en asientos libres y, entre manos, ocupando el sitio de un bot
     * (los jugadores reales siempre tienen prioridad). En mitad de una mano solo se usan asientos libres.
     */
    _seatPending(midHand) {
      let changed = false;
      for (const cid of this.pending.slice()) {
        const info = this.peers.get(cid);
        if (!info) { this.pending.splice(this.pending.indexOf(cid), 1); continue; }
        let seat = this.engine.seats.findIndex((x) => !x);
        if (seat < 0 && !midHand) {
          const bots = this.engine.players().filter((x) => x.isBot);
          const bot = bots.find((x) => !x.inHand) || bots[0];
          if (bot) {
            this._sys(`${bot.name} cede su asiento a ${info.name}`);
            this.engine.leave(bot.seat);
            seat = bot.seat;
          }
        }
        if (seat < 0) continue;
        this.engine.sit(seat, {
          id: cid, name: info.name, isBot: false, remote: true, stack: this.cfg.stack, bounty: this.cfg.bounty || 0,
          look: info.look, img: info.img, rebuys: 0,
        });
        this.pending.splice(this.pending.indexOf(cid), 1);
        this._sys(`${info.name} se sienta en la mesa${midHand ? ' (entra en la próxima mano)' : ''}`);
        changed = true;
      }
      if (changed) this._render();
      return changed;
    }

    _peerGone(cid, said) {
      const peer = this.peers.get(cid);
      if (!peer) return;
      this.peers.delete(cid);
      const i = this.pending.indexOf(cid);
      if (i >= 0) this.pending.splice(i, 1);
      const p = this._playerById(cid);
      if (p) {
        p.disconnected = true;
        if (this.engine.phase === 'idle' || this.engine.phase === 'ended' || !p.inHand) { this.engine.leave(p.seat); }
        else p.leaving = true;
        if (this.engine.toAct === p.seat) this._autoAct(p);
      }
      this._sys(`${peer.name} ${said ? 'ha salido de' : 'se ha desconectado de'} la sala`);
      this._render();
    }

    _remoteTurn(p) {
      const hand = this.engine.handNo, seat = p.seat;
      const ms = p.disconnected ? 1500 : (this.cfg.turnSeconds || 30) * 1000 + 1500; // margen por la latencia
      clearTimeout(this._remoteTimeout);
      this._remoteTimeout = this._later(() => {
        if (this.engine.handNo === hand && this.engine.toAct === seat) this._autoAct(p);
      }, ms);
    }

    _autoAct(p) {
      const legal = this.engine.legal(p.seat);
      if (!legal) return;
      this.engine.act(p.seat, legal.canCheck ? { type: 'check' } : { type: 'fold' });
    }

    _onRemoteAct(d, cid) {
      const p = this.engine.seats[this.engine.toAct];
      if (!p || p.id !== cid || d.hand !== this.engine.handNo || !d.action || !ACTIONS.includes(d.action.type)) return;
      clearTimeout(this._remoteTimeout);
      const amount = Number(d.action.amount);
      this.engine.act(p.seat, { type: d.action.type, amount: Number.isFinite(amount) ? amount : undefined });
    }

    _onRemoteChat(d, cid) {
      const p = this._playerById(cid), peer = this.peers.get(cid);
      if (!peer) return;
      const text = String(d.text || '').trim().slice(0, 140);
      if (!text) return;
      if (p) this.view.bubble(p.seat, text);
      this.hud.log(`${peer.name}: ${text}`, 'chat');
      this.room.send('chat', { cid, seat: p ? p.seat : -1, name: peer.name, text });
    }

    _onRemoteEmote(d, cid) {
      const p = this._playerById(cid);
      if (!p || !PVP.Catalog.EMOTES.includes(d.e)) return;
      this.view.emote(p.seat, d.e);
      this.room.send('emote', { cid, seat: p.seat, e: d.e });
    }

    /** Retransmite un evento del motor con el estado público; en el reparto, cada amigo recibe sus cartas cifradas. */
    _broadcastEvent(type, payload) {
      const room = this.room;
      const msg = { t: type, p: Net().publicPayload(type, payload), s: Net().publicSnap(this.snap()) };
      if (type !== 'deal') return room.send('ev', msg);
      const hand = this.engine.handNo;
      const holes = this.engine.players().filter((x) => x.remote && x.inHand).map((x) => [x.id, x.cards.slice()]);
      room.queue(async () => {
        msg.priv = {};
        for (const [id, cards] of holes) msg.priv[id] = await Net().Crypto.seal(room.peerKeys.get(id), { hand, cards });
        if (!room.closed) room.transport.send({ k: 'ev', f: room.cid, d: msg });
      });
    }

    /** Antes de empezar: la sala está abierta para que entren los amigos. */
    _openLobby() {
      this._sys(`Sala #${this.cfg.code} abierta. Invita a tus amigos y pulsa «Empezar» cuando estéis listos.`);
      this.showRoom();
    }

    /** Panel de la sala: código, invitación por WhatsApp / enlace y jugadores conectados. */
    showRoom() {
      if (!this.net) return;
      this.hud.showRoom({
        code: this.cfg.code, title: this.cfg.title, isHost: this.isHost, begun: this.begun, online: this.room.online,
        onStart: () => this.beginRoom(),
      });
      this._roomList();
    }

    /** Completa con bots hasta el nº de jugadores elegido (sin quitar sitio a los amigos que ya están). */
    _fillBots() {
      const want = Math.min(this.cfg.players, this.cfg.seats);
      let seated = this.engine.players().length;
      const taken = this.engine.players().map((p) => p.name);
      for (let s = 1; s < this.cfg.seats && seated < want; s++) {
        if (!this.engine.seats[s]) { this._addBot(s, taken); seated++; }
      }
      this.room.send('begin', {});
      this._sendLevel();
      this._render();
    }

    beginRoom() {
      if (!this.isHost || this.begun) return;
      this.hud.hideRoom();
      this._begin();
    }

    /** Lista de jugadores para el panel de la sala. */
    _roomList() {
      if (!this.net) return;
      const list = this.engine.players().filter((p) => !p.isBot).map((p) => ({ name: p.name, me: p.id === this.myId, host: !p.remote, away: !!p.disconnected }));
      if (this.isHost) for (const cid of this.pending) { const i = this.peers.get(cid); if (i) list.push({ name: i.name, waiting: true }); }
      const bots = this.engine.players().filter((p) => p.isBot).length;
      this.hud.roomPlayers(list, bots);
    }

    /* ---------- sala online: invitado ---------- */

    _bindClient(w) {
      const room = this.room, E = this.engine;
      this.hostCid = w.hostCid;
      this._cq = Promise.resolve();
      const q = (fn) => { this._cq = this._cq.then(fn).catch((e) => console.warn('[sala]', e)); };
      Object.assign(E.imgs, w.imgs || {});
      q(async () => {
        this.hostKey = await room.keyFor(this.hostCid, w.pub);
        if (w.priv) {
          const o = await Net().Crypto.open(this.hostKey, w.priv);
          if (o) { E.myCards = o.cards; E.myHand = o.hand; }
        }
        E.apply(w.snap);
        this._syncHeroSeat();
        this.view.render(this.snap());
        this._roomList();
      });
      if (w.level) this._applyLevelInfo(w.level);
      room.on('ev', (d) => q(async () => {
        if (d.priv && d.priv[this.myId]) {
          const o = await Net().Crypto.open(this.hostKey, d.priv[this.myId]);
          if (o) { E.myCards = o.cards; E.myHand = o.hand; }
        }
        E.feed(d.t, d.p, d.s);
      }));
      room.on('snap', (d) => q(() => { E.apply(d.s); this._syncHeroSeat(); this.view.render(this.snap()); this._roomList(); }));
      room.on('player', (d) => { if (d && d.id) { E.imgs[d.id] = d.img; const p = E.players().find((x) => x.id === d.id); if (p) { p.img = d.img; this.view.render(this.snap()); } } });
      room.on('log', (d) => q(() => { if (d.toastOnly) this.hud.toast(U.esc(d.text)); else this.hud.log(d.text, d.cls || 'sys'); }));
      room.on('toast', (d) => this.hud.toast(U.esc(d.text)));
      room.on('chat', (d) => q(() => {
        if (d.cid === this.myId) return;
        if (d.seat >= 0 && E.seats[d.seat]) this.view.bubble(d.seat, d.text);
        this.hud.log(`${d.name}: ${d.text}`, 'chat');
      }));
      room.on('emote', (d) => q(() => { if (d.cid !== this.myId && E.seats[d.seat]) this.view.emote(d.seat, d.e); }));
      room.on('lvl', (d) => this._applyLevelInfo(d));
      room.on('begin', () => { this.begun = true; this.hud.hideRoom(); this.hud.toast('🃏 ¡Empieza la partida!'); });
      room.on('end', (d) => this._hostEnded((d && d.reason) || 'La sala se ha cerrado.'));
      // Latido: aviso al anfitrión y detección de sala caída.
      this._beat = setInterval(() => {
        room.send('ping', {});
        if (Date.now() - (room.lastSeen || Date.now()) > 35000) this._hostEnded('Se ha perdido la conexión con el anfitrión de la sala.');
      }, 5000);
    }

    _applyLevelInfo(d) {
      this.level = d.level || 0;
      this.levelStart = Date.now() - (d.elapsed || 0);
      this.cfg.blindMinutes = d.blindMinutes || this.cfg.blindMinutes;
    }

    _clientStart() {
      this.tracker.startSession(this.cfg.mode, this.cfg.title);
      this.hud.log(`Conectado a la sala #${this.cfg.code} de ${this.net.welcome.host || 'tu amigo'}`, 'sys');
      this.begun = !!this.net.welcome.begun;
      if (!this.begun) { this.hud.log('Esperando a que el anfitrión empiece la partida…', 'sys'); this.showRoom(); }
      this._tick = setInterval(() => this._updateLevelClock(), 1000);
    }

    /** El invitado se ve siempre abajo: gira la mesa cuando el anfitrión le asigna asiento. */
    _syncHeroSeat() {
      const s = this.engine.mySeat();
      if (s === this.hero) return;
      const first = this.hero < 0 && s >= 0;
      this.hero = s;
      this.tracker.seat = s;
      this.view.setHeroSeat(s);
      if (first) this.hud.toast('🪑 ¡Ya tienes asiento en la mesa!');
    }

    _hostEnded(reason) {
      if (this.over) return;
      if (this.bountyCoins) this.store.addCoins(this.bountyCoins, 'bounty');
      this.store.save();
      if (this.room) this.room.close();
      this._stop();
      this.hud.showResult({ title: 'Sala cerrada', text: U.esc(reason) });
    }

    /* ---------- puestos dinámicos (privadas) ---------- */

    addBotAt(seat) {
      if (this.cfg.mode !== 'private' || !this.authority || this.engine.seats[seat]) return;
      const inHand = this.engine.phase !== 'ended' && this.engine.phase !== 'idle';
      if (this.isHost && this.pending.length) return this._seatPending(inHand); // primero los amigos que esperan
      const p = this._addBot(seat, null, inHand);
      this._sys(`${p.name} se une a la mesa${inHand ? ' (entra en la próxima mano)' : ''}`);
      this._render();
      if (this.begun && this.engine.phase === 'idle' && this.engine.canStart()) this._nextHand();
    }

    kick(seat) {
      const p = this.engine.seats[seat];
      if (!p || !p.isBot || this.cfg.mode !== 'private') return;
      const live = this.engine.players().filter((x) => !x.leaving).length;
      if (live <= 2) return this.hud.toast('La mesa necesita al menos 2 jugadores.');
      if (this.engine.phase === 'idle' || this.engine.phase === 'ended' || !p.inHand) {
        this.engine.leave(seat);
        this._sys(`${p.name} abandona la mesa`);
        this._render();
      } else {
        p.leaving = true;
        this.hud.toast(`${p.name} saldrá al terminar la mano`);
      }
    }

    /* ---------- chat y emotes ---------- */

    chat(text) {
      text = String(text).trim().slice(0, 140);
      if (!text) return;
      this.hud.log(`${this.store.profile.name}: ${text}`, 'chat hero');
      if (this.hero >= 0) this.view.bubble(this.hero, text);
      if (this.net) this.room.send('chat', { cid: this.myId, seat: this.hero, name: this.store.profile.name, text });
      if (!this.authority) return;
      const bots = this.engine.players().filter((p) => p.isBot);
      if (bots.length && Math.random() < 0.55) {
        const b = U.pick(bots);
        this._later(() => this._botSay(b, PVP.Bots.chatLine('reply')), U.randInt(1200, 3500));
      }
    }

    emote(emoji) {
      if (this.hero >= 0) this.view.emote(this.hero, emoji);
      this.hud.log(`${this.store.profile.name}: ${emoji}`, 'chat hero');
      if (this.net) this.room.send('emote', { cid: this.myId, seat: this.hero, e: emoji });
      if (!this.authority) return;
      const bots = this.engine.players().filter((p) => p.isBot);
      if (bots.length && Math.random() < 0.35) {
        const b = U.pick(bots);
        this._later(() => this._botEmote(b, U.pick(PVP.Catalog.EMOTES)), U.randInt(800, 2500));
      }
    }

    _botSay(p, text) {
      if (!this.engine.seats[p.seat] || this.engine.seats[p.seat] !== p) return;
      this.view.bubble(p.seat, text);
      this.hud.log(`${p.name}: ${text}`, 'chat');
      if (this.isHost) this.room.send('chat', { cid: p.id, seat: p.seat, name: p.name, text });
    }

    _botEmote(p, e) {
      if (this.engine.seats[p.seat] !== p) return;
      this.view.emote(p.seat, e);
      if (this.isHost) this.room.send('emote', { cid: p.id, seat: p.seat, e });
    }

    /* ---------- salida ---------- */

    /** Abandona la mesa: en cash se devuelven las fichas como monedas. */
    leave() {
      if (this.over) return;
      const hero = this.engine.seats[this.hero];
      if (this.cfg.mode === 'public' && hero) {
        // Si está en mitad de una mano, lo apostado se pierde (como en una mesa real).
        this.store.addCoins(hero.stack, 'cash_out');
        this.store.profile.stats.net += hero.stack - this.cfg.buyIn * (1 + (this.reloads || 0));
      }
      if (this.bountyCoins) this.store.addCoins(this.bountyCoins, 'bounty');
      if (this.cfg.mode === 'tournament' && !this.over) {
        this.store.profile.stats.tournaments++;
      }
      this.store.save();
      this._closeRoom();
      this._stop();
      this.emit('exit');
    }

    _closeRoom() {
      if (!this.room || this.room.closed) return;
      if (this.isHost) this.room.send('end', { reason: 'El anfitrión ha cerrado la sala.' });
      else this.room.send('bye', {});
      const room = this.room;
      room.queue(() => room.close());
    }

    _stop() {
      this.over = true;
      clearInterval(this._tick);
      clearInterval(this._beat);
      for (const id of this.timers) clearTimeout(id);
      this.timers.clear();
      this.engine.dispose();
    }

    destroy() {
      this._closeRoom();
      this._stop();
      this.hud.hideRoom();
      this.view.destroy();
      this.hud.unbind();
    }
  }

  PVP.GameController = GameController;
})(typeof window !== 'undefined' ? window : globalThis);
