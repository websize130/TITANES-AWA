/* PokerVegasPro — controlador de partida: conecta motor, bots, vistas y HUD de acciones.
 * Modos: 'public' (cash con monedas), 'private' (reglas propias, fichas de juego) y 'tournament' (rangos).
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const U = PVP.util;
  const HERO = 0;

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
      this.tracker = new PVP.Stats.Tracker(this.store, HERO);

      this.engine = new PVP.PokerEngine({
        seats: cfg.seats, sb: cfg.sb, bb: cfg.bb,
        schedule: (fn, ms) => this._later(fn, ms / (this.prefs.speed || 1)),
      });

      const hero = this.engine.sit(HERO, {
        id: 'hero', name: this.store.profile.name, isBot: false, stack: cfg.stack, bounty: cfg.bounty || 0,
        look: this.prefs.look || { base: 'marco' }, img: this.prefs.avatarImg || null,
      });
      hero.isHero = true;
      const taken = [hero.name];
      for (let s = 1; s < cfg.players; s++) this._addBot(s, taken);

      this._mountViews();
      this.engine.on('*', (type, payload) => this._onEngine(type, payload));
      this.hud.bind(this);
    }

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
        heroSeat: HERO,
        deck: this.prefs.deck,
        table,
        orientation: this._orientation(),
        isPrivate: this.cfg.mode === 'private',
        onSeatClick: (s) => this.addBotAt(s),
        onKick: (s) => this.kick(s),
      });
      this.view.build(this.cfg.seats);
      this.view.setPeek(this.peek);
      this.view.render(this.snap());
      if (this.prefs.view === '3d') this.setViewMode('3d');
    }

    _orientation() {
      const o = this.prefs.orientation;
      if (o === 'h' || o === 'v') return o;
      return root.innerWidth < root.innerHeight ? 'v' : 'h';
    }

    setViewMode(mode) {
      if (mode === '3d' && !PVP.Table3D.supported()) {
        this.hud.toast('Tu navegador no soporta WebGL: se mantiene la vista 2D.');
        mode = '2d';
      }
      this.store.setPref('view', mode);
      if (mode === '3d' && !this.view3d) {
        this.view.set3D(true);
        this.view3d = new PVP.Table3D(this.host, this.view, {
          heroSeat: HERO, table: PVP.Catalog.table(this.prefs.table), orientation: this._orientation(), camera: this.prefs.camera,
        });
        this.view3d.peek = this.peek;
        this.view3d.sync(this.snap(), false);
      } else if (mode === '2d' && this.view3d) {
        this.view3d.destroy();
        this.view3d = null;
        this.view.set3D(false);
        this.view.render(this.snap());
      }
      this.hud.syncToggles();
    }

    setOrientation(o) {
      if (this.prefs.orientation !== o) this.store.setPref('orientation', o);
      const real = this._orientation();
      if (real !== this.view.orientation) {
        this.view.setOrientation(real);
        if (this.view3d) this.view3d.setOrientation(real);
      }
      this.hud.syncToggles();
    }

    setCamera(preset) {
      this.store.setPref('camera', preset);
      if (this.view3d) this.view3d.setCamera(preset);
      this.hud.syncToggles();
    }

    setTable(id) {
      const t = PVP.Catalog.table(id);
      if (!this.store.owns(t.tier)) return false;
      this.store.setPref('table', id);
      this.view.setTable(t);
      if (this.view3d) this.view3d.setTable(t);
      return true;
    }

    setDeck(id) {
      const d = PVP.Catalog.deck(id);
      if (!this.store.owns(d.tier)) return false;
      this.store.setPref('deck', id);
      this.view.setDeck(id);
      if (this.view3d) this.view3d.setDeck(id);
      return true;
    }

    setPeek(on) {
      this.peek = on;
      this.view.setPeek(on);
      if (this.view3d) this.view3d.setPeek(on);
      this.hud.syncPeek(on);
    }

    /* ---------- ciclo ---------- */

    start() {
      this.tracker.startSession(this.cfg.mode, this.cfg.title);
      this.hud.log(`Mesa abierta · Ciegas ${U.fmt(this.engine.sb)}/${U.fmt(this.engine.bb)}`, 'sys');
      // Saludos humanizados
      for (const p of this.engine.players()) {
        if (p.isBot && p.chatty > 0.55) this._later(() => this._botSay(p, PVP.Bots.chatLine('greet')), U.randInt(600, 4000));
      }
      this._later(() => this._nextHand(), 900);
      this._tick = setInterval(() => this._updateLevelClock(), 1000);
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
        this.hud.log(`Nivel ${next + 1}: ciegas ${U.fmt(sb)}/${U.fmt(sb * 2)}`, 'sys');
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
        if (p.leaving) { this.hud.log(`${p.name} abandona la mesa`, 'sys'); this.engine.leave(p.seat); continue; }
        if (p.sittingOut && p.isBot && p.stack > 0) p.sittingOut = false;
      }
      this.view.render(this.snap());
    }

    _refillPublic(chance) {
      for (let s = 1; s < this.cfg.seats; s++) {
        if (!this.engine.seats[s] && Math.random() < chance) {
          const p = this._addBot(s);
          this.hud.log(`${p.name} se sienta en la mesa`, 'sys');
        }
      }
    }

    /* ---------- eventos del motor ---------- */

    _onEngine(type, payload) {
      const snap = this.snap();
      this.view.onEvent(type, payload, snap);
      if (this.view3d) this.view3d.onEvent(type, payload, snap);

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

    _onTurn(seat) {
      const p = this.engine.seats[seat];
      this.view.stopTimer();
      if (p.isHero) {
        const legal = this.engine.legal(seat);
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
      const decision = PVP.Bots.decide(this.engine, seat);
      // El anillo muestra el tiempo de turno completo, igual que para el jugador.
      this.view.startTimer(seat, (this.cfg.turnSeconds || 30) * 1000);
      const hand = this.engine.handNo;
      this._later(() => {
        if (this.engine.handNo !== hand || this.engine.toAct !== seat) return;
        this.engine.act(seat, decision);
      }, decision.delay);
    }

    heroAct(action) {
      if (this.engine.toAct !== HERO) return;
      clearTimeout(this._heroTimeout);
      this.timers.delete(this._heroTimeout);
      this.hud.hideActions();
      this.view.stopTimer();
      this.tracker.decision(this.engine, action);
      this.engine.act(HERO, action);
    }

    _onAction({ seat, action, player }) {
      this.view.stopTimer();
      const label = { fold: 'se retira', check: 'pasa', call: 'paga', bet: 'apuesta', raise: 'sube a', allin: 'va ALL-IN con' }[action.type] || action.type;
      this.hud.log(`${player.name} ${label}${action.amount && action.type !== 'check' && action.type !== 'fold' ? ' ' + U.fmt(action.amount) : ''}`, player.isHero ? 'hero' : '');
      if (action.type === 'allin') {
        const t = PVP.Catalog.table(this.prefs.table);
        if (t.shark) this.view.shark();
        if (player.isBot && Math.random() < 0.4) this._botSay(player, PVP.Bots.chatLine('allin'));
      }
    }

    _onHandEnd({ result, busted }) {
      this.hud.hideActions();
      this.view.stopTimer();
      clearTimeout(this._heroTimeout);
      const hero = this.engine.seats[HERO];
      const winners = [];
      for (const pot of result.pots) for (const s of pot.winners) if (!winners.includes(s)) winners.push(s);

      // Banner y registro
      const parts = winners.map((s) => {
        const p = this.engine.seats[s];
        const h = result.hands[s];
        return `<b>${U.esc(p.name)}</b> gana ${U.fmt(result.winnings[s])}${h ? ` · <em>${h.name}</em>` : ''}`;
      });
      this.view.banner(parts.join('<br>'), 3200);
      this.view.highlight(result);
      if (this.view3d) this.view3d.highlight(result);
      this.view.animatePotTo(winners);
      for (const s of winners) {
        const h = result.hands[s];
        this.hud.log(`🏆 ${this.engine.seats[s].name} gana ${U.fmt(result.winnings[s])}${h ? ' con ' + h.name : ''}`, 'win');
      }

      // Estadísticas del héroe
      if (hero && hero.inHand) {
        const st = this.store.profile.stats;
        st.hands++;
        const won = result.winnings[HERO] || 0;
        const potSize = result.pots.reduce((t, p) => t + p.amount, 0);
        if (won) {
          st.won++;
          st.biggestPot = Math.max(st.biggestPot, potSize);
          if (PVP.Sound) PVP.Sound.win();
        }
        const h = result.hands[HERO];
        if (h && h.score > st.bestHand) { st.bestHand = h.score; st.bestHandName = h.name; }
        this.store.addXp(won ? 25 : 8);
      }

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
      const hero = this.engine.seats[HERO];

      for (const s of busted) {
        const p = this.engine.seats[s];
        if (!p || p.isHero) continue;
        if (this.cfg.mode === 'tournament') {
          this.tPlaces.unshift(p.name);
          this.hud.log(`${p.name} queda eliminado`, 'sys');
          p.leaving = true;
        } else if (this.cfg.mode === 'private' && this.cfg.rebuys > (p.rebuys || 0) && Math.random() < 0.75) {
          p.rebuys = (p.rebuys || 0) + 1;
          p.stack = this.cfg.stack;
          this.hud.log(`${p.name} hace recompra (${p.rebuys}/${this.cfg.rebuys})`, 'sys');
        } else {
          p.leaving = true;
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
          onYes: () => { this.rebuysUsed++; this.engine.seats[HERO].stack = cfg.stack; this._nextHand(); },
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
            this.engine.seats[HERO].stack = cfg.buyIn;
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

    /* ---------- puestos dinámicos (privadas) ---------- */

    addBotAt(seat) {
      if (this.cfg.mode !== 'private' || this.engine.seats[seat]) return;
      const inHand = this.engine.phase !== 'ended' && this.engine.phase !== 'idle';
      const p = this._addBot(seat, null, inHand);
      this.hud.log(`${p.name} se une a la mesa${inHand ? ' (entra en la próxima mano)' : ''}`, 'sys');
      this.view.render(this.snap());
      if (this.view3d) this.view3d.sync(this.snap(), false);
      if (this.engine.phase === 'idle' && this.engine.canStart()) this._nextHand();
    }

    kick(seat) {
      const p = this.engine.seats[seat];
      if (!p || !p.isBot || this.cfg.mode !== 'private') return;
      const live = this.engine.players().filter((x) => !x.leaving).length;
      if (live <= 2) return this.hud.toast('La mesa necesita al menos 2 jugadores.');
      if (this.engine.phase === 'idle' || this.engine.phase === 'ended' || !p.inHand) {
        this.engine.leave(seat);
        this.hud.log(`${p.name} abandona la mesa`, 'sys');
        this.view.render(this.snap());
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
      this.view.bubble(HERO, text);
      const bots = this.engine.players().filter((p) => p.isBot);
      if (bots.length && Math.random() < 0.55) {
        const b = U.pick(bots);
        this._later(() => this._botSay(b, PVP.Bots.chatLine('reply')), U.randInt(1200, 3500));
      }
    }

    emote(emoji) {
      this.view.emote(HERO, emoji);
      this.hud.log(`${this.store.profile.name}: ${emoji}`, 'chat hero');
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
    }

    _botEmote(p, e) {
      if (this.engine.seats[p.seat] !== p) return;
      this.view.emote(p.seat, e);
    }

    /* ---------- salida ---------- */

    /** Abandona la mesa: en cash se devuelven las fichas como monedas. */
    leave() {
      if (this.over) return;
      const hero = this.engine.seats[HERO];
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
      this._stop();
      this.emit('exit');
    }

    _stop() {
      this.over = true;
      clearInterval(this._tick);
      for (const id of this.timers) clearTimeout(id);
      this.timers.clear();
      this.engine.dispose();
    }

    destroy() {
      this._stop();
      if (this.view3d) this.view3d.destroy();
      this.view.destroy();
      this.hud.unbind();
    }
  }

  PVP.GameController = GameController;
})(typeof window !== 'undefined' ? window : globalThis);
