/* Pruebas del motor y del evaluador: `node tests/engine.test.js` */
'use strict';
const assert = require('assert');
const path = require('path');

for (const f of ['core.js', 'poker/evaluator.js', 'poker/engine.js', 'poker/bots.js']) {
  require(path.join(__dirname, '..', 'js', f));
}
const { Cards, PokerEngine, Bots } = globalThis.PVP;

// --- Evaluador ---
const card = (s) => {
  const rank = Cards.RANKS.indexOf(s.slice(0, -1));
  const suit = 'shdc'.indexOf(s.slice(-1));
  return rank * 4 + suit;
};
const ev = (str) => Cards.evaluate(str.split(' ').map(card));
const name = (str) => Cards.handName(ev(str));

assert.strictEqual(name('A♠ K♠ Q♠ J♠ 10♠'.replace(/♠/g, 's')), 'Escalera real');
assert.strictEqual(name('9h 8h 7h 6h 5h 2c As'), 'Escalera de color');
assert.strictEqual(name('As 2d 3c 4h 5s Kd Kh'), 'Escalera');
assert.strictEqual(name('Ks Kd Kh Kc 2s 3d 4h'), 'Póker');
assert.strictEqual(name('Ks Kd Kh 2c 2s 3d 4h'), 'Full');
assert.strictEqual(name('Ks Kd Kh 2c 2s 2d 4h'), 'Full');
assert.strictEqual(name('2h 7h 9h Jh Kh Ks Kd'), 'Color');
assert.strictEqual(name('Ks Kd Kh 2c 7s 3d 9h'), 'Trío');
assert.strictEqual(name('Ks Kd 7h 7c 2s 2d 9h'), 'Doble pareja');
assert.strictEqual(name('Ks Kd 7h 8c 2s 4d 9h'), 'Pareja');
assert.strictEqual(name('Ks Qd 7h 8c 2s 4d 9h'), 'Carta alta');
assert.ok(ev('As 2d 3c 4h 5s') < ev('2s 3d 4c 5h 6s'), 'la rueda es la escalera más baja');
assert.ok(ev('Ks Kd 7h 7c 2s 2d 9h') < ev('Ks Kd 7h 7c 2s 2d Ah'), 'kicker de doble pareja');
assert.ok(ev('Ah Ad 5c 4s 3h') > ev('Kh Kd Ac Qs Jh'));
assert.ok(ev('Ks Kd Kh Kc 2s 3d Ah') > ev('Ks Kd Kh Kc 2s 3d Qh'), 'kicker de póker');
assert.strictEqual(Cards.bestFive('Ks Kd 7h 8c 2s 4d 9h'.split(' ').map(card)).length, 5);
const eqAA = Cards.equity([card('As'), card('Ah')], [], 1, 3000);
assert.ok(eqAA > 0.8 && eqAA < 0.89, 'AA vs aleatoria ≈ 85% (' + eqAA + ')');

// --- Motor con bots: conservación de fichas, botes laterales y fin de partida ---
function runTable(seats, level, hands) {
  const queue = [];
  const engine = new PokerEngine({ seats, sb: 25, bb: 50, schedule: (fn) => queue.push(fn) });
  for (let s = 0; s < seats; s++) {
    engine.sit(s, Object.assign(Bots.createPersona(level), { stack: 1000 + s * 731 }));
  }
  const total = engine.players().reduce((t, p) => t + p.stack, 0);
  engine.on('turn', ({ seat }) => {
    queue.push(() => {
      const a = Bots.decide(engine, seat);
      assert.ok(engine.act(seat, a), 'acción válida');
    });
  });
  let played = 0;
  engine.on('handEnd', () => {
    played++;
    const now = engine.players().reduce((t, p) => t + p.stack, 0);
    assert.strictEqual(now, total, 'las fichas se conservan en la mano ' + played);
    for (const p of engine.players()) assert.ok(p.stack >= 0);
  });
  while (played < hands && engine.canStart()) {
    engine.startHand();
    let guard = 0;
    while (queue.length) {
      queue.shift()();
      if (++guard > 500) throw new Error('bucle infinito en la mano ' + engine.handNo);
    }
    assert.strictEqual(engine.phase, 'ended');
  }
  return played;
}

let hands = 0;
for (const lvl of ['easy', 'medium', 'hard']) {
  for (const n of [2, 3, 6, 10]) hands += runTable(n, lvl, 60);
}

// Bote lateral explícito: A all-in corto gana el principal, B gana el lateral.
{
  const q = [];
  const e = new PokerEngine({ seats: 3, sb: 5, bb: 10, schedule: (fn) => q.push(fn) });
  e.sit(0, { name: 'A', stack: 100 });
  e.sit(1, { name: 'B', stack: 500 });
  e.sit(2, { name: 'C', stack: 500 });
  e.dealer = 2; // botón pasará al asiento 0
  e.startHand();
  // Fuerza cartas: A tiene la mejor, B la segunda.
  e.seats[0].cards = [card('As'), card('Ad')];
  e.seats[1].cards = [card('Ks'), card('Kd')];
  e.seats[2].cards = [card('7c'), card('2h')];
  e.deck = e.deck.filter((c) => ![card('As'), card('Ad'), card('Ks'), card('Kd'), card('7c'), card('2h')].includes(c));
  e.deck.push(card('3s'), card('9d'), card('8h'), card('Jc'), card('4c'), card('5d'), card('Qc'), card('6c'));
  // Orden: botón 0, SB 1, BB 2 → actúa 0.
  assert.ok(e.act(0, { type: 'allin' }));
  assert.ok(e.act(1, { type: 'raise', amount: 300 }));
  assert.ok(e.act(2, { type: 'call' }));
  while (q.length || e.toAct >= 0) {
    if (e.toAct >= 0) e.act(e.toAct, { type: 'check' });
    else q.shift()();
  }
  const r = e.lastResult;
  assert.strictEqual(r.pots.length, 2);
  assert.deepStrictEqual(r.pots[0].winners, [0]);
  assert.strictEqual(r.pots[0].amount, 300);
  assert.deepStrictEqual(r.pots[1].winners, [1]);
  assert.strictEqual(e.seats[0].stack, 300);
  assert.strictEqual(e.seats[1].stack + e.seats[2].stack, 800);
}

console.log('OK — evaluador, botes laterales y ' + hands + ' manos simuladas sin errores.');
