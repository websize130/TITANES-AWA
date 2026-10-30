/* PokerVegasPro — baraja y evaluador de manos de Texas Hold'em (5 a 7 cartas). */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});

  // Carta = entero 0..51 · rango = c >> 2 (0 = 2 … 12 = As) · palo = c & 3.
  const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const SUITS = ['s', 'h', 'd', 'c'];
  const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'];
  const RED = [false, true, true, false];

  const CATEGORY_NAMES = [
    'Carta alta', 'Pareja', 'Doble pareja', 'Trío', 'Escalera',
    'Color', 'Full', 'Póker', 'Escalera de color',
  ];

  const rankOf = (c) => c >> 2;
  const suitOf = (c) => c & 3;

  function newDeck() {
    const d = new Array(52);
    for (let i = 0; i < 52; i++) d[i] = i;
    return PVP.util.shuffle(d);
  }

  function cardInfo(c) {
    const s = suitOf(c);
    return { rank: RANKS[rankOf(c)], suit: SUITS[s], symbol: SUIT_SYMBOLS[s], red: RED[s] };
  }

  function cardLabel(c) {
    const i = cardInfo(c);
    return i.rank + i.symbol;
  }

  /** Devuelve la carta más alta de una escalera dentro de una máscara de rangos, o -1. */
  function straightHigh(mask) {
    for (let hi = 12; hi >= 4; hi--) {
      if (((mask >> (hi - 4)) & 31) === 31) return hi;
    }
    // Escalera baja A-2-3-4-5.
    return (mask & 0x100f) === 0x100f ? 3 : -1;
  }

  function score(cat, a, b, c, d, e) {
    return cat * 1048576 + (a | 0) * 65536 + (b | 0) * 4096 + (c | 0) * 256 + (d | 0) * 16 + (e | 0);
  }

  const counts = new Int8Array(13);
  const suitCount = new Int8Array(4);
  const suitMask = new Int32Array(4);

  /** Puntuación comparable de la mejor mano de 5 cartas contenida en `cards` (5–7 cartas). */
  function evaluate(cards) {
    counts.fill(0); suitCount.fill(0); suitMask.fill(0);
    let rankMask = 0;
    for (let i = 0; i < cards.length; i++) {
      const r = cards[i] >> 2, s = cards[i] & 3;
      counts[r]++; suitCount[s]++; suitMask[s] |= 1 << r; rankMask |= 1 << r;
    }

    let flushSuit = -1;
    for (let s = 0; s < 4; s++) if (suitCount[s] >= 5) flushSuit = s;
    if (flushSuit >= 0) {
      const sf = straightHigh(suitMask[flushSuit]);
      if (sf >= 0) return score(8, sf);
    }

    let quad = -1, t1 = -1, t2 = -1, p1 = -1, p2 = -1, p3 = -1;
    for (let r = 12; r >= 0; r--) {
      const n = counts[r];
      if (n === 4) quad = r;
      else if (n === 3) { if (t1 < 0) t1 = r; else if (t2 < 0) t2 = r; }
      else if (n === 2) { if (p1 < 0) p1 = r; else if (p2 < 0) p2 = r; else if (p3 < 0) p3 = r; }
    }

    if (quad >= 0) return score(7, quad, highest(rankMask & ~(1 << quad), 1)[0]);
    if (t1 >= 0 && (t2 >= 0 || p1 >= 0)) return score(6, t1, Math.max(t2, p1));

    if (flushSuit >= 0) {
      const k = highest(suitMask[flushSuit], 5);
      return score(5, k[0], k[1], k[2], k[3], k[4]);
    }

    const st = straightHigh(rankMask);
    if (st >= 0) return score(4, st);

    if (t1 >= 0) {
      const k = highest(rankMask & ~(1 << t1), 2);
      return score(3, t1, k[0], k[1]);
    }
    if (p1 >= 0 && p2 >= 0) {
      const k = highest(rankMask & ~(1 << p1) & ~(1 << p2), 1);
      return score(2, p1, p2, k[0]);
    }
    if (p1 >= 0) {
      const k = highest(rankMask & ~(1 << p1), 3);
      return score(1, p1, k[0], k[1], k[2]);
    }
    const k = highest(rankMask, 5);
    return score(0, k[0], k[1], k[2], k[3], k[4]);
  }

  const kick = [0, 0, 0, 0, 0];
  function highest(mask, n) {
    let found = 0;
    for (let r = 12; r >= 0 && found < n; r--) if (mask & (1 << r)) kick[found++] = r;
    for (let i = found; i < 5; i++) kick[i] = 0;
    return kick;
  }

  function category(sc) { return Math.floor(sc / 1048576); }

  function handName(sc) {
    const cat = category(sc);
    if (cat === 8 && ((sc >> 16) & 15) === 12) return 'Escalera real';
    return CATEGORY_NAMES[cat];
  }

  /** Las 5 cartas que forman la mejor mano (para resaltarlas en el showdown). */
  function bestFive(cards) {
    const target = evaluate(cards);
    const n = cards.length;
    if (n <= 5) return cards.slice();
    const combo = [0, 0, 0, 0, 0];
    for (let a = 0; a < n; a++)
      for (let b = a + 1; b < n; b++)
        for (let c = b + 1; c < n; c++)
          for (let d = c + 1; d < n; d++)
            for (let e = d + 1; e < n; e++) {
              combo[0] = cards[a]; combo[1] = cards[b]; combo[2] = cards[c]; combo[3] = cards[d]; combo[4] = cards[e];
              if (evaluate(combo) === target) return combo.slice();
            }
    return cards.slice(0, 5);
  }

  /**
   * Equidad estimada por Monte Carlo de `hole` frente a `opponents` manos aleatorias.
   * Reutiliza buffers para no generar basura en cada iteración.
   */
  const mcDeck = new Int8Array(52);
  const mcHand = [];
  const mcOpp = [];
  function equity(hole, board, opponents, iterations) {
    opponents = Math.max(1, opponents);
    const used = new Uint8Array(52);
    for (const c of hole) used[c] = 1;
    for (const c of board) used[c] = 1;
    let n = 0;
    for (let c = 0; c < 52; c++) if (!used[c]) mcDeck[n++] = c;

    const need = 5 - board.length;
    let wins = 0;
    for (let it = 0; it < iterations; it++) {
      // Fisher–Yates parcial: solo las cartas que vamos a usar.
      const draw = need + opponents * 2;
      for (let i = 0; i < draw; i++) {
        const j = i + Math.floor(Math.random() * (n - i));
        const t = mcDeck[i]; mcDeck[i] = mcDeck[j]; mcDeck[j] = t;
      }
      mcHand.length = 0;
      for (const c of board) mcHand.push(c);
      for (let i = 0; i < need; i++) mcHand.push(mcDeck[i]);
      const boardLen = mcHand.length;
      mcHand.push(hole[0], hole[1]);
      const mine = evaluate(mcHand);

      let best = 0, ties = 0, lost = false;
      for (let o = 0; o < opponents; o++) {
        mcOpp.length = 0;
        for (let i = 0; i < boardLen; i++) mcOpp.push(mcHand[i]);
        mcOpp.push(mcDeck[need + o * 2], mcDeck[need + o * 2 + 1]);
        const s = evaluate(mcOpp);
        if (s > mine) { lost = true; break; }
        if (s === mine) ties++;
        if (s > best) best = s;
      }
      if (!lost) wins += ties ? 1 / (ties + 1) : 1;
    }
    return wins / iterations;
  }

  PVP.Cards = {
    RANKS, SUITS, SUIT_SYMBOLS,
    newDeck, cardInfo, cardLabel, rankOf, suitOf,
    evaluate, category, handName, bestFive, equity,
  };
})(typeof window !== 'undefined' ? window : globalThis);
