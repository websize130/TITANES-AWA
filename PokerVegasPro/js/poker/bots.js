/* PokerVegasPro — bots humanizados con tres niveles de dificultad.
 * Fácil: suelto y pasivo, comete errores. Medio: juega por equidad y pot odds.
 * Difícil: Monte Carlo más profundo, posición, semi-faroles, slowplay y tamaños variados.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const U = PVP.util;

  const LEVELS = {
    easy: {
      label: 'Fácil', iters: 70, noise: 0.16, bluff: 0.03, aggr: 0.25, loose: 0.1,
      raiseRel: 1.9, reraiseRel: 2.4, slowplay: 0, think: [700, 2100], mistake: 0.12,
    },
    medium: {
      label: 'Medio', iters: 160, noise: 0.07, bluff: 0.07, aggr: 0.45, loose: 0.03,
      raiseRel: 1.6, reraiseRel: 2.0, slowplay: 0.05, think: [900, 2700], mistake: 0.04,
    },
    hard: {
      label: 'Difícil', iters: 380, noise: 0.025, bluff: 0.12, aggr: 0.65, loose: 0,
      raiseRel: 1.42, reraiseRel: 1.8, slowplay: 0.14, think: [1100, 3500], mistake: 0,
    },
  };

  const NAMES = [
    'Lucía', 'Marco', 'VegasKid', 'La Duquesa', 'Don Ernesto', 'Sakura', 'Jake', 'Nadia', 'Óscar', 'Rocco',
    'Valentina', 'Iván', 'Chen', 'Amara', 'Diego', 'Freya', 'Hugo', 'Kenji', 'Lola', 'Mateo', 'Bianca',
    'Sasha', 'Thiago', 'Elena', 'Gael', 'Noor', 'Rafa', 'Mila', 'Bruno', 'Zoe', 'AceHunter', 'RiverRat',
  ];

  const CHAT = {
    win: ['¡Gracias por las fichas! 😎', 'Así se juega 💰', 'Bonito bote', 'La suerte está de mi lado 🍀', 'gg'],
    lose: ['Uff… por poco', 'Bien jugado', 'Esa carta del river… 😩', 'Me la has leído', 'Próxima es mía'],
    allin: ['¡Todo dentro! 🔥', 'Voy con todo', 'A ver si me sigues…', 'All-in, sin miedo'],
    greet: ['¡Hola mesa! 👋', 'Buena suerte a todos', 'Vamos allá 🃏', 'Hola, ¿qué tal?', 'Que salgan buenas cartas'],
    reply: ['jaja 😂', 'Totalmente', '¡Suerte!', '👍', 'Concentración…', 'Ya veremos 😏'],
  };
  const EMOTES_FOR = { win: ['😎', '💰', '🔥', '👏'], lose: ['😩', '😱', '😡', '🍀'] };

  /** Puntuación de Chen normalizada a 0..1 para manos iniciales. */
  function chen(hole) {
    const r1 = hole[0] >> 2, r2 = hole[1] >> 2;
    const hi = Math.max(r1, r2), lo = Math.min(r1, r2);
    const val = (r) => (r === 12 ? 10 : r === 11 ? 8 : r === 10 ? 7 : r === 9 ? 6 : (r + 2) / 2);
    let s = val(hi);
    if (r1 === r2) s = Math.max(5, s * 2);
    else {
      if ((hole[0] & 3) === (hole[1] & 3)) s += 2;
      const gap = hi - lo - 1;
      s -= gap <= 0 ? 0 : gap === 1 ? 1 : gap === 2 ? 2 : gap === 3 ? 4 : 5;
      if (gap <= 1 && hi < 10) s += 1;
    }
    return U.clamp((Math.ceil(s) + 1) / 21, 0, 1);
  }

  function createPersona(level, taken) {
    const free = NAMES.filter((n) => !taken || !taken.includes(n));
    return {
      name: U.pick(free.length ? free : NAMES),
      isBot: true,
      level,
      hue: U.randInt(0, 359),
      chatty: Math.random(),
    };
  }

  /**
   * Decide la acción de un bot. Devuelve { type, amount, delay }.
   * No modifica el motor: el controlador ejecuta la acción tras `delay` ms.
   */
  function decide(engine, seat) {
    const p = engine.seats[seat];
    const legal = engine.legal(seat);
    const prof = LEVELS[p.level] || LEVELS.medium;
    const board = engine.board;
    const live = engine.live();
    const opps = Math.max(1, live.length - 1);
    const bb = engine.bb;
    const pot = legal.pot;
    const preflop = board.length === 0;

    let eq = PVP.Cards.equity(p.cards, board, opps, prof.iters);
    if (preflop) eq = eq * 0.7 + chen(p.cards) * (1 / (opps + 1)) * 2 * 0.3; // mezcla con la intuición de Chen
    eq = U.clamp(eq + U.rand(-prof.noise, prof.noise), 0, 1);

    const fair = 1 / (opps + 1);
    const rel = eq / fair;
    const potOdds = legal.toCall / (pot + legal.toCall || 1);
    const latePos = isLatePosition(engine, seat);
    const r = Math.random();

    let action;
    if (legal.canCheck) {
      if (rel > prof.raiseRel && r < prof.aggr + 0.3 && legal.canRaise) {
        if (!preflop && rel > 2.6 && Math.random() < prof.slowplay) action = { type: 'check' };
        else action = { type: 'raise', amount: sizeBet(engine, legal, eq, rel, preflop, prof) };
      } else if (legal.canRaise && Math.random() < prof.bluff * (latePos ? 1.6 : 0.8) * (opps <= 2 ? 1.4 : 0.6)) {
        action = { type: 'raise', amount: U.clamp(U.roundTo(pot * U.rand(0.4, 0.7), engine.sb), legal.minTo, legal.maxTo) };
      } else {
        action = { type: 'check' };
      }
    } else {
      const commit = legal.toCall / Math.max(1, p.stack);
      const needed = potOdds + (commit > 0.5 ? 0.06 : 0) - prof.loose;
      if (rel > prof.reraiseRel && r < prof.aggr && legal.canRaise) {
        action = { type: 'raise', amount: sizeRaise(engine, legal, rel, preflop) };
      } else if (eq >= needed) {
        action = { type: 'call' };
      } else if (commit < 0.12 && Math.random() < prof.mistake + (preflop ? 0.05 : 0)) {
        action = { type: 'call' };
      } else if (legal.canRaise && commit < 0.25 && Math.random() < prof.bluff * 0.5 && latePos) {
        action = { type: 'raise', amount: sizeRaise(engine, legal, 1, preflop) };
      } else {
        action = { type: 'fold' };
      }
    }

    // Si la subida compromete casi todo el stack, ir all-in (solo con mano fuerte) o conformarse con pagar.
    if (action.type === 'raise' && action.amount >= legal.maxTo * 0.6) {
      if (rel > 1.7 || eq > 0.6) action = { type: 'allin' };
      else action = legal.canCheck ? { type: 'check' } : (eq >= potOdds ? { type: 'call' } : { type: 'fold' });
    }

    action.delay = thinkTime(prof, legal, p, action);
    action.equity = eq;
    return action;
  }

  function isLatePosition(engine, seat) {
    const live = engine.live().map((p) => p.seat);
    const n = engine.seats.length;
    const dist = (seat - engine.dealer + n) % n;
    let later = 0;
    for (const s of live) if (((s - engine.dealer + n) % n) > dist) later++;
    return later <= 1 || seat === engine.dealer;
  }

  function sizeBet(engine, legal, eq, rel, preflop, prof) {
    const bb = engine.bb;
    if (preflop) return U.clamp(U.roundTo(bb * U.pick([2.5, 3, 3, 3.5]), engine.sb), legal.minTo, legal.maxTo);
    const f = rel > 2.4 ? U.pick([0.75, 1, 1.2]) : rel > 1.8 ? U.pick([0.6, 0.75]) : U.pick([0.4, 0.5, 0.66]);
    const variance = prof === LEVELS.hard ? U.rand(0.9, 1.1) : 1;
    return U.clamp(U.roundTo(legal.pot * f * variance, engine.sb), legal.minTo, legal.maxTo);
  }

  function sizeRaise(engine, legal, rel, preflop) {
    const base = engine.currentBet;
    const mult = preflop ? U.pick([2.5, 3, 3, 3.5]) : U.pick([2.2, 2.5, 3]);
    const extra = rel > 2.6 ? 1.3 : 1;
    return U.clamp(U.roundTo(base * mult * extra, engine.sb), legal.minTo, legal.maxTo);
  }

  /** Tiempo de reflexión "humano": más largo en decisiones caras, a veces instantáneo en checks triviales. */
  function thinkTime(prof, legal, p, action) {
    let t = U.rand(prof.think[0], prof.think[1]);
    const pressure = legal.toCall / Math.max(1, p.stack);
    if (pressure > 0.3) t *= 1.5;
    if (action.type === 'allin') t *= 1.3;
    if (action.type === 'check' && Math.random() < 0.35) t *= 0.45;
    if (action.type === 'fold' && pressure < 0.05 && Math.random() < 0.5) t *= 0.6;
    return Math.round(t);
  }

  function chatLine(kind) { return U.pick(CHAT[kind] || CHAT.reply); }
  function emoteFor(kind) { return U.pick(EMOTES_FOR[kind] || EMOTES_FOR.win); }

  PVP.Bots = { LEVELS, NAMES, decide, chen, createPersona, chatLine, emoteFor };
})(typeof window !== 'undefined' ? window : globalThis);
