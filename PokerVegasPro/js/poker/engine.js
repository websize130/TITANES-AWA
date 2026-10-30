/* PokerVegasPro — motor de Texas Hold'em No-Limit.
 * Máquina de estados pura: no toca el DOM. Publica eventos y deja el ritmo (delays) al planificador inyectado.
 * Eventos: handStart, deal, blinds, turn, action, street, reveal, showdown, handEnd, bust.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const C = () => PVP.Cards;

  const STREETS = ['preflop', 'flop', 'turn', 'river'];

  class PokerEngine extends PVP.Emitter {
    /**
     * @param {object} opts
     * @param {number} opts.seats    número de asientos de la mesa (2–10)
     * @param {number} opts.sb       ciega pequeña
     * @param {number} opts.bb       ciega grande
     * @param {function} [opts.schedule] (fn, ms) => void — por defecto setTimeout
     * @param {object} [opts.timing] pausas entre calles / showdown
     */
    constructor(opts) {
      super();
      this.seats = new Array(opts.seats).fill(null);
      this.sb = opts.sb;
      this.bb = opts.bb;
      this.schedule = opts.schedule || ((fn, ms) => setTimeout(fn, ms));
      this.timing = Object.assign({ street: 900, runout: 1300, showdown: 600 }, opts.timing || {});
      this.handNo = 0;
      this.dealer = -1;
      this.phase = 'idle'; // idle | betting | dealing | showdown | ended
      this._resetHandState();
    }

    _resetHandState() {
      this.board = [];
      this.deck = [];
      this.pot = 0;            // fichas ya recogidas de calles anteriores
      this.street = 'preflop';
      this.currentBet = 0;
      this.minRaise = this.bb;
      this.toAct = -1;
      this.sbSeat = -1;
      this.bbSeat = -1;
      this.lastResult = null;
    }

    /* ---------- gestión de jugadores ---------- */

    sit(seat, player) {
      this.seats[seat] = Object.assign({
        seat, stack: 0, bet: 0, total: 0, cards: [], folded: true, allIn: false,
        acted: false, inHand: false, sittingOut: false, lastAction: null, revealed: false,
      }, player, { seat });
      return this.seats[seat];
    }

    leave(seat) { this.seats[seat] = null; }

    players() { return this.seats.filter(Boolean); }

    /** Jugadores con cartas en esta mano y sin retirarse. */
    live() { return this.seats.filter((p) => p && p.inHand && !p.folded); }

    _nextSeat(from, pred) {
      const n = this.seats.length;
      for (let i = 1; i <= n; i++) {
        const s = (from + i + n) % n;
        const p = this.seats[s];
        if (p && pred(p)) return s;
      }
      return -1;
    }

    setBlinds(sb, bb) { this.sb = sb; this.bb = bb; }

    /* ---------- ciclo de la mano ---------- */

    canStart() { return this.seats.filter((p) => p && p.stack > 0 && !p.sittingOut).length >= 2; }

    startHand() {
      if (!this.canStart()) { this.phase = 'idle'; return false; }
      this._resetHandState();
      this.handNo++;
      this.phase = 'dealing';
      this.deck = C().newDeck();

      for (const p of this.seats) {
        if (!p) continue;
        p.bet = 0; p.total = 0; p.cards = []; p.allIn = false; p.acted = false;
        p.lastAction = null; p.revealed = false;
        p.inHand = p.stack > 0 && !p.sittingOut;
        p.folded = !p.inHand;
      }

      const eligible = (p) => p.inHand;
      this.dealer = this._nextSeat(this.dealer < 0 ? -1 : this.dealer, eligible);
      const headsUp = this.live().length === 2;
      this.sbSeat = headsUp ? this.dealer : this._nextSeat(this.dealer, eligible);
      this.bbSeat = this._nextSeat(this.sbSeat, eligible);

      this.emit('handStart', { handNo: this.handNo, dealer: this.dealer, sb: this.sb, bb: this.bb });

      this._post(this.seats[this.sbSeat], this.sb, 'SB');
      this._post(this.seats[this.bbSeat], this.bb, 'BB');
      this.currentBet = this.bb;
      this.minRaise = this.bb;
      this.emit('blinds', { sbSeat: this.sbSeat, bbSeat: this.bbSeat });

      // Reparto de dos cartas, una a una, empezando por la izquierda del botón.
      const order = [];
      let s = this.dealer;
      for (let i = 0; i < this.live().length; i++) { s = this._nextSeat(s, eligible); order.push(s); }
      for (let r = 0; r < 2; r++) for (const seat of order) this.seats[seat].cards.push(this.deck.pop());
      this.emit('deal', { order });

      this.phase = 'betting';
      this.toAct = this._nextSeat(this.bbSeat, (p) => p.inHand && !p.folded && !p.allIn);
      this._continue();
      return true;
    }

    _post(p, amount, tag) {
      const a = Math.min(amount, p.stack);
      p.stack -= a; p.bet += a; p.total += a;
      if (p.stack === 0) p.allIn = true;
      p.lastAction = { type: tag, amount: a };
      return a;
    }

    /** Acciones legales para el jugador en turno. */
    legal(seat) {
      const p = this.seats[seat];
      if (!p || seat !== this.toAct || this.phase !== 'betting') return null;
      const toCall = Math.max(0, this.currentBet - p.bet);
      const maxTo = p.bet + p.stack;
      const minTo = Math.min(maxTo, this.currentBet === 0 ? this.bb : this.currentBet + this.minRaise);
      return {
        toCall: Math.min(toCall, p.stack),
        canCheck: toCall === 0,
        canCall: toCall > 0,
        canRaise: maxTo > this.currentBet && this._othersCanRespond(p),
        minTo, maxTo,
        pot: this.potTotal(),
        isBet: this.currentBet === 0,
      };
    }

    _othersCanRespond(p) {
      return this.live().some((o) => o !== p && !o.allIn);
    }

    potTotal() {
      let t = this.pot;
      for (const p of this.seats) if (p) t += p.bet;
      return t;
    }

    /**
     * Ejecuta una acción. `action` = { type: 'fold'|'check'|'call'|'raise'|'allin', amount?: importe total "subir a" }.
     * Devuelve false si no es válida.
     */
    act(seat, action) {
      const legal = this.legal(seat);
      if (!legal) return false;
      const p = this.seats[seat];
      let type = action.type;

      if (type === 'check' && !legal.canCheck) type = 'call';
      if (type === 'call' && legal.canCheck) type = 'check';
      if (type === 'allin') { type = legal.canRaise ? 'raise' : (legal.canCheck ? 'check' : 'call'); action = { amount: legal.maxTo }; }
      if (type === 'raise' && !legal.canRaise) type = legal.canCheck ? 'check' : 'call';

      if (type === 'fold') {
        p.folded = true;
        p.lastAction = { type: 'fold' };
      } else if (type === 'check') {
        p.lastAction = { type: 'check' };
      } else if (type === 'call') {
        const a = this._post(p, legal.toCall, 'call');
        p.lastAction = { type: p.allIn ? 'allin' : 'call', amount: a };
      } else if (type === 'raise') {
        const to = Math.round(PVP.util.clamp(action.amount || legal.minTo, legal.minTo, legal.maxTo));
        const raiseBy = to - this.currentBet;
        this._post(p, to - p.bet, 'raise');
        if (raiseBy >= this.minRaise) this.minRaise = raiseBy;
        const wasBet = this.currentBet === 0;
        this.currentBet = Math.max(this.currentBet, p.bet);
        // Una subida reabre la acción para el resto.
        for (const o of this.live()) if (o !== p && !o.allIn) o.acted = false;
        p.lastAction = { type: p.allIn ? 'allin' : (wasBet ? 'bet' : 'raise'), amount: p.bet };
      } else {
        return false;
      }

      p.acted = true;
      this.emit('action', { seat, action: p.lastAction, player: p });
      this._continue();
      return true;
    }

    /** Decide qué pasa tras una acción: siguiente turno, siguiente calle o fin de mano. */
    _continue() {
      const live = this.live();
      if (live.length === 1) {
        this._returnUncalled();
        this._collect();
        this._finishUncontested(live[0]);
        return;
      }

      const canAct = live.filter((p) => !p.allIn);
      const pending = canAct.filter((p) => !p.acted || p.bet < this.currentBet);
      // Si solo queda uno con fichas y ya iguala la apuesta, no tiene contra quién apostar.
      const roundDone = pending.length === 0 || (canAct.length === 1 && pending.length === 1 && canAct[0].bet >= this.currentBet);

      if (!roundDone) {
        if (!pending.includes(this.seats[this.toAct]) || this.seats[this.toAct].acted) {
          this.toAct = this._nextSeat(this.toAct, (p) => pending.includes(p));
        }
        this.emit('turn', { seat: this.toAct, legal: this.legal(this.toAct) });
        return;
      }

      this.toAct = -1;
      this._returnUncalled();
      this._collect();

      if (this.street === 'river') {
        this.phase = 'showdown';
        const hand = this.handNo;
        this.schedule(() => { if (hand === this.handNo && !this.disposed) this._showdown(); }, this.timing.showdown);
        return;
      }

      this.phase = 'dealing';
      const runout = canAct.length <= 1;
      if (runout && !live.every((p) => p.revealed)) {
        for (const p of live) p.revealed = true;
        this.emit('reveal', { seats: live.map((p) => p.seat) });
      }
      const hand = this.handNo;
      this.schedule(() => { if (hand === this.handNo && !this.disposed) this._nextStreet(runout); }, runout ? this.timing.runout : this.timing.street);
    }

    _nextStreet(runout) {
      const idx = STREETS.indexOf(this.street) + 1;
      this.street = STREETS[idx];
      this.deck.pop(); // carta quemada
      const n = this.street === 'flop' ? 3 : 1;
      for (let i = 0; i < n; i++) this.board.push(this.deck.pop());
      for (const p of this.live()) { p.acted = false; p.bet = 0; if (!p.allIn) p.lastAction = null; }
      this.currentBet = 0;
      this.minRaise = this.bb;
      this.emit('street', { street: this.street, board: this.board.slice() });

      if (runout) {
        this._continue();
        return;
      }
      this.phase = 'betting';
      this.toAct = this._nextSeat(this.dealer, (p) => p.inHand && !p.folded && !p.allIn);
      this._continue();
    }

    /** Devuelve la parte de la apuesta más alta que nadie ha igualado. */
    _returnUncalled() {
      let top = null, second = 0;
      for (const p of this.seats) {
        if (!p || !p.inHand) continue;
        if (!top || p.bet > top.bet) { if (top) second = Math.max(second, top.bet); top = p; }
        else second = Math.max(second, p.bet);
      }
      if (top && top.bet > second) {
        const back = top.bet - second;
        top.bet -= back; top.total -= back; top.stack += back;
        if (top.stack > 0) top.allIn = false;
      }
    }

    _collect() {
      let moved = 0;
      for (const p of this.seats) if (p && p.bet) { moved += p.bet; p.bet = 0; }
      this.pot += moved;
      if (moved) this.emit('collect', { pot: this.pot });
    }

    _finishUncontested(winner) {
      const amount = this.pot;
      winner.stack += amount;
      this.pot = 0;
      this.phase = 'ended';
      this.lastResult = {
        uncontested: true,
        pots: [{ amount, winners: [winner.seat], eligible: [winner.seat] }],
        winnings: { [winner.seat]: amount },
        hands: {},
      };
      this._endHand();
    }

    /** Construye el bote principal y los laterales a partir de lo aportado por cada jugador. */
    buildPots() {
      const contrib = this.seats.filter((p) => p && p.total > 0).map((p) => ({ p, left: p.total }));
      const pots = [];
      while (contrib.some((c) => c.left > 0)) {
        const live = contrib.filter((c) => c.left > 0 && !c.p.folded);
        const level = (live.length ? live : contrib.filter((c) => c.left > 0)).reduce((m, c) => Math.min(m, c.left), Infinity);
        let amount = 0;
        const eligible = [];
        for (const c of contrib) {
          if (c.left <= 0) continue;
          const take = Math.min(c.left, level);
          amount += take; c.left -= take;
          if (!c.p.folded) eligible.push(c.p.seat);
        }
        if (!eligible.length && pots.length) pots[pots.length - 1].amount += amount;
        else pots.push({ amount, eligible });
      }
      return pots;
    }

    _showdown() {
      const live = this.live();
      const hands = {};
      for (const p of live) {
        const all = p.cards.concat(this.board);
        hands[p.seat] = { score: C().evaluate(all), name: '', best: C().bestFive(all) };
        hands[p.seat].name = C().handName(hands[p.seat].score);
        p.revealed = true;
      }

      const pots = this.buildPots();
      const winnings = {};
      for (const pot of pots) {
        let best = -1, winners = [];
        for (const s of pot.eligible) {
          const sc = hands[s].score;
          if (sc > best) { best = sc; winners = [s]; } else if (sc === best) winners.push(s);
        }
        const share = Math.floor(pot.amount / winners.length);
        let rest = pot.amount - share * winners.length;
        // Las fichas sobrantes van al primer ganador a la izquierda del botón.
        const ordered = winners.slice().sort((a, b) => this._distFromDealer(a) - this._distFromDealer(b));
        for (const s of ordered) {
          const won = share + (rest > 0 ? 1 : 0);
          if (rest > 0) rest--;
          this.seats[s].stack += won;
          winnings[s] = (winnings[s] || 0) + won;
        }
        pot.winners = winners;
      }
      this.pot = 0;
      this.phase = 'ended';
      this.lastResult = { uncontested: false, pots, winnings, hands };
      this.emit('showdown', this.lastResult);
      this._endHand();
    }

    _distFromDealer(seat) {
      const n = this.seats.length;
      return (seat - this.dealer + n) % n || n;
    }

    _endHand() {
      const busted = [];
      for (const p of this.seats) if (p && p.inHand && p.stack === 0) busted.push(p.seat);

      // Para las recompensas (bounty): quién eliminó a cada jugador.
      const knockouts = [];
      if (busted.length && this.lastResult) {
        for (const b of busted) {
          const pots = this.lastResult.pots.filter((pt) => pt.eligible.includes(b));
          const last = pots[pots.length - 1] || this.lastResult.pots[0];
          const by = last && last.winners.find((w) => w !== b);
          if (by !== undefined) knockouts.push({ seat: b, by });
        }
      }

      this.toAct = -1;
      this.emit('handEnd', { result: this.lastResult, busted, knockouts, handNo: this.handNo });
      for (const k of knockouts) this.emit('bust', k);
    }

    dispose() { this.disposed = true; this.phase = 'idle'; this.toAct = -1; }

    /** Instantánea serializable para las vistas. */
    snapshot() {
      return {
        handNo: this.handNo, phase: this.phase, street: this.street, board: this.board.slice(),
        pot: this.pot, potTotal: this.potTotal(), dealer: this.dealer, sbSeat: this.sbSeat, bbSeat: this.bbSeat,
        toAct: this.toAct, currentBet: this.currentBet, sb: this.sb, bb: this.bb, seats: this.seats,
      };
    }
  }

  PVP.PokerEngine = PokerEngine;
})(typeof window !== 'undefined' ? window : globalThis);
