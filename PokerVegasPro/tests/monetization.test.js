/* Pruebas de packs, códigos firmados, código de creador, promos y estadísticas del Coach:
 * `node tests/monetization.test.js` */
'use strict';
const assert = require('assert');
const path = require('path');

// localStorage mínimo para Node
const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};

for (const f of ['core.js', 'catalog.js', 'config.js', 'vouchers.js', 'store.js', 'poker/evaluator.js', 'poker/engine.js', 'poker/bots.js', 'stats.js']) {
  require(path.join(__dirname, '..', 'js', f));
}
const { Vouchers: V, Store, Config, Stats, PokerEngine, Bots } = globalThis.PVP;
const DAY = 86400000;

(async () => {
  // --- Llave de admin cifrada con contraseña ---
  const { admin, privateKey } = await V.createAdmin('una-contraseña-larga');
  await assert.rejects(V.unlockAdmin('incorrecta-123456', admin), /Contraseña incorrecta/);
  const unlocked = await V.unlockAdmin('una-contraseña-larga', admin);
  Config.ADMIN = admin;
  Config.CREATOR_CODE = await V.hashSecret('CreadorVegas2026');
  assert.ok(!JSON.stringify(Config.CREATOR_CODE).includes('CreadorVegas'), 'el código de creador no se guarda en claro');

  // --- Jugador registrado ---
  const store = new Store();
  await store.register('Josue', 'j@example.com', 'secreto1');
  const id = store.profile.id;
  assert.match(id, /^PVP-[A-Z2-9]{6}$/);
  assert.strictEqual(store.profile.coins, 50000);
  assert.strictEqual(store.tier(), 'free');
  assert.ok(!store.owns('elite'));

  // Pack Élite firmado para su ID
  const elite = await V.sign(unlocked, { k: 'pack', u: id, t: 'elite', d: 30, c: 500000, x: 0 });
  const msg = await store.redeem(elite);
  assert.match(msg, /Pack Élite/);
  assert.strictEqual(store.profile.coins, 550000);
  assert.strictEqual(store.tier(), 'elite');
  assert.ok(store.owns('elite') && !store.owns('legend') && !store.hasCoach());
  await assert.rejects(store.redeem(elite), /Ya canjeaste/);

  // Un código para otro jugador no sirve
  const other = await V.sign(unlocked, { k: 'pack', u: 'PVP-AAAAAA', t: 'legend', d: 30, c: 1, x: 0 });
  await assert.rejects(store.redeem(other), /es para el jugador PVP-AAAAAA/);

  // Código alterado (cambiar las monedas rompe la firma)
  const [data, sig] = elite.slice(V.PREFIX.length).split('.');
  const forged = JSON.parse(Buffer.from(data, 'base64url').toString());
  forged.c = 99999999; forged.n = 'x';
  await assert.rejects(store.redeem(V.PREFIX + Buffer.from(JSON.stringify(forged)).toString('base64url') + '.' + sig), /no válido o alterado/);

  // Código firmado con otra llave
  const rogue = await V.createAdmin('otra-contraseña-larga');
  await assert.rejects(store.redeem(await V.sign(rogue.privateKey, { k: 'coins', u: id, t: '', d: 0, c: 1e9, x: 0 })), /no válido/);

  // Código caducado
  await assert.rejects(store.redeem(await V.sign(unlocked, { k: 'coins', u: id, t: '', d: 0, c: 5, x: Date.now() - 1000 })), /caducado/);

  // Renovar Élite suma 30 días más sobre la fecha vigente
  const until1 = store.profile.tierUntil;
  await store.redeem(await V.sign(unlocked, { k: 'pack', u: id, t: 'elite', d: 30, c: 500000, x: 0 }));
  assert.ok(Math.abs(store.profile.tierUntil - (until1 + 30 * DAY)) < 5000);

  // Subir a Leyenda: acceso total + Coach
  await store.redeem(await V.sign(unlocked, { k: 'pack', u: id, t: 'legend', d: 30, c: 2000000, x: 0 }));
  assert.strictEqual(store.tier(), 'legend');
  assert.ok(store.hasCoach() && store.owns('legend'));
  assert.strictEqual(store.profile.coins, 3050000);

  // Caducidad: al vencer vuelve a gratis y se desequipan los cosméticos de pago
  store.profile.prefs.table = 'cyberpunk';
  store.profile.tierUntil = Date.now() - 1;
  assert.strictEqual(store.tier(), 'free');
  store.sanitizePrefs();
  assert.strictEqual(store.profile.prefs.table, 'classic');

  // Código de creador: Leyenda permanente
  await assert.rejects(store.redeem('codigo-inventado'), /no válido/);
  assert.match(await store.redeem('  creadorvegas2026 '), /permanente/);
  assert.strictEqual(store.tier(), 'legend');
  assert.strictEqual(store.profile.tierUntil, 0);
  // Un Élite posterior solo suma monedas: no rebaja el acceso permanente
  await store.redeem(await V.sign(unlocked, { k: 'pack', u: id, t: 'elite', d: 30, c: 500000, x: 0 }));
  assert.strictEqual(store.tier(), 'legend');
  assert.strictEqual(store.profile.tierUntil, 0);

  // Promos públicas: una vez por cuenta
  const before = store.profile.coins;
  assert.match(await store.redeem('bienvenido'), /10\.000/);
  await assert.rejects(store.redeem('BIENVENIDO'), /Ya canjeaste/);
  assert.strictEqual(store.profile.coins, before + 10000);
  // Promo firmada genérica
  const promo = await V.sign(unlocked, { k: 'coins', u: '*', t: '', d: 0, c: 25000, x: 0 });
  await store.redeem(promo);
  await assert.rejects(store.redeem(promo), /Ya canjeaste/);

  // Panel admin: listar y modificar cuentas del navegador
  const accs = Store.listAccounts();
  assert.strictEqual(accs.length, 1);
  Store.updateAccount(accs[0].key, (p) => { p.tier = 'free'; p.tierUntil = 0; });
  store.reload();
  assert.strictEqual(store.tier(), 'free');
  Store.updateAccount(accs[0].key, (p) => Store.grantPack(p, 'legend', 30, 2000000));
  store.reload();
  assert.strictEqual(store.tier(), 'legend');

  // PayPal
  assert.strictEqual(Config.paypalLink('elite'), 'https://www.paypal.me/Josue2698/4.99EUR');
  assert.strictEqual(Config.paypalLink('legend'), 'https://www.paypal.me/Josue2698/9.99EUR');

  // --- Rastreador de estadísticas con partidas simuladas ---
  const tracker = new Stats.Tracker(store, 0);
  tracker.startSession('private', 'Test');
  const queue = [];
  const engine = new PokerEngine({ seats: 6, sb: 25, bb: 50, schedule: (fn) => queue.push(fn) });
  engine.sit(0, { name: 'Héroe', stack: 5000 });
  for (let s = 1; s < 6; s++) engine.sit(s, Object.assign(Bots.createPersona('medium'), { stack: 5000 }));
  engine.on('handStart', () => tracker.handStart(engine));
  engine.on('street', ({ street }) => tracker.street(engine, street));
  engine.on('handEnd', ({ result }) => tracker.handEnd(engine, result));
  engine.on('turn', ({ seat }) => queue.push(() => {
    const a = Bots.decide(engine, seat);
    if (seat === 0) tracker.decision(engine, a);
    engine.act(seat, a);
  }));
  for (let h = 0; h < 80 && engine.canStart(); h++) {
    engine.startHand();
    while (queue.length) queue.shift()();
  }
  const adv = store.profile.adv;
  assert.ok(adv.hands > 0 && adv.decisions > 0);
  assert.ok(adv.vpip <= adv.hands && adv.pfr <= adv.vpip, 'PFR ≤ VPIP ≤ manos');
  assert.ok(adv.wsd <= adv.wtsd && adv.wtsd <= adv.sawFlop);
  const m = Stats.metrics(adv);
  for (const k of ['vpip', 'pfr', 'accuracy']) assert.ok(m[k] >= 0 && m[k] <= 100, k);
  assert.ok(Array.isArray(Stats.coach(adv)));
  assert.strictEqual(adv.sessions[adv.sessions.length - 1].hands, adv.hands);

  // Posiciones
  const pe = new PokerEngine({ seats: 6, sb: 1, bb: 2, schedule: () => {} });
  for (let s = 0; s < 6; s++) pe.sit(s, { name: 'p' + s, stack: 100 });
  pe.dealer = 5; pe.startHand(); // botón en 0
  assert.deepStrictEqual([0, 1, 2, 3, 4, 5].map((s) => Stats.positionOf(pe, s)), ['late', 'blinds', 'blinds', 'early', 'middle', 'late']);

  console.log(`OK — códigos firmados, packs, creador, promos, admin y Coach (${adv.hands} manos, ${adv.decisions} decisiones, aciertos ${m.accuracy.toFixed(0)}%).`);
})().catch((e) => { console.error(e); process.exit(1); });
