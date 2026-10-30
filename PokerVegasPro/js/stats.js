/* PokerVegasPro — estadísticas avanzadas y Coach.
 * Registra cada decisión del jugador: VPIP, PFR, 3-bet, factor de agresividad, WTSD, W$SD y posición.
 * Cada decisión se puntúa con la equidad Monte Carlo frente a las pot odds para detectar errores.
 * Se registra para todos; el panel Coach solo se muestra con el Pack Leyenda.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const MAX_SESSIONS = 40;
  const MAX_EXAMPLES = 8;
  const STREET_ES = { preflop: 'Preflop', flop: 'Flop', turn: 'Turn', river: 'River' };

  function emptyAdv() {
    return {
      v: 1, hands: 0, vpip: 0, pfr: 0, threeBet: 0, threeBetOpp: 0,
      bets: 0, raises: 0, calls: 0, sawFlop: 0, wtsd: 0, wsd: 0,
      decisions: 0, good: 0, bluffs: 0,
      mistakes: { tightFold: 0, looseCall: 0, missedValue: 0 },
      pos: { early: { h: 0, v: 0 }, middle: { h: 0, v: 0 }, late: { h: 0, v: 0 }, blinds: { h: 0, v: 0 } },
      sessions: [], examples: [],
    };
  }

  /** Posición del asiento en esta mano: blinds, early, middle o late. */
  function positionOf(engine, seat) {
    const n = engine.seats.length;
    const order = [];
    for (let i = 1; i <= n; i++) {
      const s = (engine.dealer + i) % n;
      const p = engine.seats[s];
      if (p && p.inHand) order.push(s);
    }
    if (order.length === 2) return seat === engine.dealer ? 'late' : 'blinds';
    const idx = order.indexOf(seat);
    if (idx <= 1) return 'blinds';
    const fromEnd = order.length - 1 - idx;
    if (fromEnd <= 1) return 'late';
    const rest = order.length - 2;
    return idx - 2 < Math.max(1, Math.floor(rest / 3)) ? 'early' : 'middle';
  }

  class Tracker {
    constructor(store, seat) {
      this.store = store;
      this.seat = seat;
      this.h = null;
      this.session = null;
    }

    adv() {
      const p = this.store.profile;
      if (!p.adv || p.adv.v !== 1) p.adv = emptyAdv();
      return p.adv;
    }

    startSession(mode, title) {
      const a = this.adv();
      this.session = { t: Date.now(), mode, title: title || '', hands: 0, dec: 0, good: 0, vpip: 0, pfr: 0, net: 0 };
      a.sessions.push(this.session);
      if (a.sessions.length > MAX_SESSIONS) a.sessions.shift();
    }

    handStart(engine) {
      const hero = engine.seats[this.seat];
      this.h = hero && hero.inHand ? {
        pos: positionOf(engine, this.seat), start: hero.stack + hero.bet, vpip: false, pfr: false,
        threeBet: false, threeBetOpp: false, sawFlop: false,
      } : null;
    }

    /** Llamar ANTES de ejecutar la acción del héroe. */
    decision(engine, action) {
      const h = this.h;
      if (!h) return;
      const legal = engine.legal(this.seat);
      if (!legal) return;
      const hero = engine.seats[this.seat];
      const street = engine.street;
      let type = action.type;
      if (type === 'allin') type = legal.canRaise ? 'raise' : (legal.canCheck ? 'check' : 'call');
      if (type === 'call' && legal.canCheck) type = 'check';
      if (type === 'check' && !legal.canCheck) type = 'call';
      if (type === 'raise' && !legal.canRaise) type = legal.canCheck ? 'check' : 'call';

      const a = this.adv();
      // Contadores de estilo
      if (street === 'preflop') {
        const facingRaise = engine.currentBet > engine.bb;
        if (facingRaise) h.threeBetOpp = true;
        if (type === 'call' || type === 'raise') h.vpip = true;
        if (type === 'raise') { h.pfr = true; if (facingRaise) h.threeBet = true; }
      } else if (type === 'raise') {
        if (legal.isBet) a.bets++; else a.raises++;
      } else if (type === 'call') a.calls++;

      // Calidad de la decisión: equidad frente a lo que exige el bote.
      const opps = Math.max(1, engine.live().length - 1);
      const eq = PVP.Cards.equity(hero.cards, engine.board, opps, 260);
      const odds = legal.toCall > 0 ? legal.toCall / (legal.pot + legal.toCall) : 0;
      const rel = eq * (opps + 1);
      let verdict = 'good';
      if (legal.toCall > 0) {
        if (type === 'fold' && eq >= odds + 0.1 && !(street === 'preflop' && legal.toCall <= engine.bb && rel < 1.1)) verdict = 'tightFold';
        else if (type === 'call' && eq < odds - 0.1) verdict = 'looseCall';
        else if (type === 'raise' && eq < odds) verdict = 'bluff';
      } else {
        if (type === 'check' && street !== 'preflop' && rel > 2.1 && eq > 0.62) verdict = 'missedValue';
        else if (type === 'raise' && rel < 0.9) verdict = 'bluff';
      }

      if (verdict === 'bluff') a.bluffs++;
      else {
        a.decisions++;
        if (this.session) this.session.dec++;
        if (verdict === 'good') { a.good++; if (this.session) this.session.good++; }
        else {
          a.mistakes[verdict]++;
          a.examples.unshift({
            t: Date.now(), kind: verdict, street: STREET_ES[street] || street, eq: Math.round(eq * 100), need: Math.round(odds * 100),
            toCall: legal.toCall, pot: legal.pot, cards: hero.cards.map(PVP.Cards.cardLabel).join(' '),
            board: engine.board.map(PVP.Cards.cardLabel).join(' '),
          });
          if (a.examples.length > MAX_EXAMPLES) a.examples.length = MAX_EXAMPLES;
        }
      }
    }

    street(engine, street) {
      if (this.h && street === 'flop') {
        const hero = engine.seats[this.seat];
        if (hero && hero.inHand && !hero.folded) this.h.sawFlop = true;
      }
    }

    handEnd(engine, result) {
      const h = this.h;
      this.h = null;
      if (!h) return;
      const a = this.adv();
      const hero = engine.seats[this.seat];
      const sd = !result.uncontested && hero && !hero.folded;
      const won = (result.winnings && result.winnings[this.seat]) || 0;
      a.hands++;
      a.pos[h.pos].h++;
      if (h.vpip) { a.vpip++; a.pos[h.pos].v++; }
      if (h.pfr) a.pfr++;
      if (h.threeBetOpp) a.threeBetOpp++;
      if (h.threeBet) a.threeBet++;
      if (h.sawFlop) a.sawFlop++;
      if (h.sawFlop && sd) { a.wtsd++; if (won > 0) a.wsd++; }
      if (this.session) {
        const s = this.session;
        s.hands++;
        if (h.vpip) s.vpip++;
        if (h.pfr) s.pfr++;
        s.net += (hero ? hero.stack : 0) - h.start;
      }
      this.store.save();
    }
  }

  /* ---------- métricas y Coach ---------- */

  const pct = (a, b) => (b ? (a / b) * 100 : null);

  function metrics(adv) {
    adv = adv || emptyAdv();
    const post = adv.calls;
    return {
      hands: adv.hands,
      vpip: pct(adv.vpip, adv.hands),
      pfr: pct(adv.pfr, adv.hands),
      threeBet: pct(adv.threeBet, adv.threeBetOpp),
      af: post ? (adv.bets + adv.raises) / post : (adv.bets + adv.raises ? adv.bets + adv.raises : null),
      wtsd: pct(adv.wtsd, adv.sawFlop),
      wsd: pct(adv.wsd, adv.wtsd),
      accuracy: pct(adv.good, adv.decisions),
      decisions: adv.decisions,
      posVpip: {
        early: pct(adv.pos.early.v, adv.pos.early.h), middle: pct(adv.pos.middle.v, adv.pos.middle.h),
        late: pct(adv.pos.late.v, adv.pos.late.h), blinds: pct(adv.pos.blinds.v, adv.pos.blinds.h),
      },
    };
  }

  /** Rangos orientativos para mesas de 6–9 jugadores. */
  const RANGES = {
    vpip: [18, 30], pfr: [13, 24], threeBet: [4, 11], af: [1.5, 3.5], wtsd: [24, 34], wsd: [48, 100], accuracy: [80, 100],
  };

  function rate(value, key) {
    if (value == null) return 'none';
    const [lo, hi] = RANGES[key];
    if (value >= lo && value <= hi) return 'good';
    const span = hi - lo;
    return value < lo - span * 0.5 || value > hi + span * 0.5 ? 'bad' : 'warn';
  }

  /** Áreas de mejora detectadas, ordenadas por gravedad. */
  function coach(adv) {
    adv = adv || emptyAdv();
    const m = metrics(adv);
    const out = [];
    const add = (level, title, text) => out.push({ level, title, text });

    if (m.hands < 30) add('info', 'Muestra pequeña', `Llevas ${m.hands} manos analizadas. A partir de unas 30 manos las conclusiones empiezan a ser fiables, y a partir de 200, sólidas.`);

    if (m.vpip != null && m.hands >= 15) {
      if (m.vpip > 38) add('bad', 'Juegas demasiadas manos', `Entras en el ${m.vpip.toFixed(0)}% de las manos. Reduce tu rango inicial, sobre todo en posiciones tempranas: apunta a un 20–28%.`);
      else if (m.vpip < 14) add('warn', 'Demasiado tight', `Solo entras en el ${m.vpip.toFixed(0)}% de las manos. Abre más desde el botón y el cutoff para robar ciegas.`);
    }
    if (m.vpip != null && m.pfr != null && m.hands >= 15 && m.vpip - m.pfr > 12) {
      add('warn', 'Pasivo preflop (limp/call)', `Entre tu VPIP (${m.vpip.toFixed(0)}%) y tu PFR (${m.pfr.toFixed(0)}%) hay ${(m.vpip - m.pfr).toFixed(0)} puntos. Cuando entres en una mano, hazlo subiendo más a menudo en lugar de solo igualar.`);
    }
    if (m.af != null && adv.calls + adv.bets + adv.raises >= 10) {
      if (m.af < 1.2) add('warn', 'Pasivo postflop', `Tu factor de agresividad es ${m.af.toFixed(1)}. Pagas mucho más de lo que apuestas: con manos fuertes y proyectos, apuesta para ganar el bote.`);
      else if (m.af > 4.5) add('warn', 'Agresividad excesiva', `Tu factor de agresividad es ${m.af.toFixed(1)}. Los rivales que pagan te castigarán. Selecciona mejor tus faroles.`);
    }
    if (m.wtsd != null && adv.sawFlop >= 15) {
      if (m.wtsd > 38) add('warn', 'Llegas demasiado al showdown', `Ves el showdown en el ${m.wtsd.toFixed(0)}% de los flops. Suelta antes las manos marginales cuando el rival muestra fuerza.`);
      if (m.wsd != null && adv.wtsd >= 8 && m.wsd < 45) add('bad', 'Pierdes en el showdown', `Solo ganas el ${m.wsd.toFixed(0)}% de los showdowns. Paga con manos más fuertes en el river.`);
    }
    const mk = adv.mistakes;
    if (mk.looseCall >= 3) add('bad', 'Pagas sin las pot odds', `${mk.looseCall} veces pagaste con menos equidad de la que exigía el bote. Antes de pagar, compara tu probabilidad de ganar con lo que pones frente al bote final.`);
    if (mk.tightFold >= 3) add('warn', 'Abandonas manos rentables', `${mk.tightFold} veces te retiraste teniendo equidad de sobra para pagar. No sueltes manos que las pot odds hacen rentables.`);
    if (mk.missedValue >= 3) add('warn', 'Pierdes valor con manos fuertes', `${mk.missedValue} veces pasaste con una mano muy por delante. Apuesta tus manos fuertes para que te paguen.`);
    const pv = m.posVpip;
    if (pv.early != null && pv.late != null && adv.pos.early.h >= 8 && adv.pos.late.h >= 8 && pv.early > pv.late) {
      add('warn', 'No aprovechas la posición', `Juegas más manos en posición temprana (${pv.early.toFixed(0)}%) que en el botón y el cutoff (${pv.late.toFixed(0)}%). Debería ser al revés.`);
    }
    if (m.accuracy != null && m.decisions >= 20 && m.accuracy >= 85) add('good', 'Decisiones sólidas', `El ${m.accuracy.toFixed(0)}% de tus decisiones son matemáticamente correctas. ¡Sigue así!`);
    if (m.pfr != null && m.vpip != null && m.hands >= 30 && rate(m.vpip, 'vpip') === 'good' && rate(m.pfr, 'pfr') === 'good') {
      add('good', 'Rango preflop equilibrado', `VPIP ${m.vpip.toFixed(0)}% / PFR ${m.pfr.toFixed(0)}%: un perfil TAG (tight-agresivo), el más rentable a largo plazo.`);
    }
    const order = { bad: 0, warn: 1, info: 2, good: 3 };
    return out.sort((a, b) => order[a.level] - order[b.level]);
  }

  const MISTAKE_TEXT = {
    tightFold: (e) => `Te retiraste con ${e.eq}% de equidad cuando bastaba con ${e.need}%.`,
    looseCall: (e) => `Pagaste ${PVP.util.fmt(e.toCall)} con ${e.eq}% de equidad; necesitabas ${e.need}%.`,
    missedValue: (e) => `Pasaste con ${e.eq}% de equidad: había que apostar por valor.`,
  };

  PVP.Stats = { Tracker, emptyAdv, positionOf, metrics, coach, rate, RANGES, MISTAKE_TEXT };
})(typeof window !== 'undefined' ? window : globalThis);
