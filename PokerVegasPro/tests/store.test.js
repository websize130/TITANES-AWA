/* Pruebas del perfil (invitado local y cuenta online con un Supabase simulado): `node tests/store.test.js` */
'use strict';
const assert = require('assert');
const path = require('path');

const mem = new Map();
globalThis.localStorage = {
  getItem: (k) => (mem.has(k) ? mem.get(k) : null),
  setItem: (k, v) => mem.set(k, String(v)),
  removeItem: (k) => mem.delete(k),
};
for (const f of ['core.js', 'catalog.js', 'config.js', 'avatars.js', 'store.js']) require(path.join(__dirname, '..', 'js', f));
const { Store, Avatars } = globalThis.PVP;

/** Supabase falso: guarda el perfil y registra las llamadas RPC. */
function fakeBackend() {
  const row = { id: 'uuid-1', player_code: 'PVP-ABC234', username: 'Josue', coins: 50000, tier: 'free', xp: 0, prefs: {}, stats: {}, adv: null, is_admin: false };
  const calls = [];
  const b = {
    available: true, calls, row,
    async session() { return null; },
    async rpc(fn, args) { calls.push([fn, args]); if (fn === 'pvp_username_available') return true; return null; },
    async signUp(email, pass, user) { calls.push(['signUp', email, user]); return { session: {}, user: { user_metadata: { username: user } } }; },
    async signIn() { return { user: { user_metadata: { username: 'Josue' } } }; },
    async signOut() {},
    async ensureProfile(name) { calls.push(['ensure', name]); return Object.assign({}, row); },
    async fetchProfile() { return Object.assign({}, row); },
    async updateProfile(uid, fields) { calls.push(['update', Object.keys(fields).sort().join(',')]); },
    async adjustCoins(delta, reason) { calls.push(['adjust', delta, reason]); row.coins += delta; return row.coins; },
    async redeem(code) { calls.push(['redeem', code]); if (code === 'DAMAOCHO') { row.tier = 'legend'; return { kind: 'creator', coins: 0, tier: 'legend' }; } throw new Error('Código no válido'); },
    async createPurchase(pack) { calls.push(['purchase', pack]); return { id: 'p1', pack, amount: pack === 'elite' ? 4.99 : 9.99, reference: 'PV-XYZ234', status: 'pending' }; },
    async myPurchases() { return []; },
    subscribe(uid, onProfile, onPurchase) { b.onProfile = onProfile; b.onPurchase = onPurchase; },
    unsubscribe() {},
  };
  return b;
}

(async () => {
  // --- Invitado (local) ---
  const guest = new Store({ available: false });
  guest.playAsGuest();
  assert.match(guest.profile.id, /^INV-/);
  assert.strictEqual(guest.profile.coins, 10000);
  assert.strictEqual(guest.profile.prefs.autoPeek, true, 'cartas propias visibles por defecto');
  assert.ok(!guest.owns('elite') && !guest.hasCoach());
  assert.match(await guest.redeem('  damaocho '), /Leyenda/);
  assert.ok(guest.owns('legend') && guest.hasCoach(), 'damaocho da acceso Leyenda');
  assert.match(await guest.redeem('bienvenido'), /10\.000/);
  await assert.rejects(guest.redeem('BIENVENIDO'), /Ya canjeaste/);
  await assert.rejects(guest.redeem('inventado'), /no válido/);
  await assert.rejects(guest.createPurchase('elite'), /cuenta registrada/);
  assert.ok(guest.spend(5000, 'buy_in'));
  assert.ok(!guest.spend(1e9, 'buy_in'));
  const reloaded = new Store({ available: false });
  assert.ok(await reloaded.restore(), 'el invitado se restaura de localStorage');
  assert.strictEqual(reloaded.profile.tier, 'legend');

  // --- Cuenta online (Supabase simulado) ---
  mem.clear();
  const be = fakeBackend();
  const s = new Store(be);
  s.playAsGuest();
  s.setPref('look', { base: 'mei', acc: 'pearls' });
  const res = await s.register('Josue', 'j@example.com', 'secreto1');
  assert.strictEqual(res.bonus, 50000);
  assert.ok(s.online);
  assert.strictEqual(s.profile.id, 'PVP-ABC234');
  assert.strictEqual(s.profile.prefs.look.base, 'mei', 'el avatar del invitado pasa a la cuenta');
  assert.ok(be.calls.some((c) => c[0] === 'update' && c[1] === 'adv,prefs,stats,xp'));

  assert.ok(s.spend(20000, 'buy_in'));
  s.addCoins(9000000, 'tournament_prize');
  await new Promise((r) => setTimeout(r, 20));
  const adj = be.calls.filter((c) => c[0] === 'adjust');
  assert.deepStrictEqual(adj[0], ['adjust', -20000, 'buy_in']);
  assert.deepStrictEqual(adj.slice(1).map((c) => c[1]), [6000000, 3000000], 'los cobros grandes se trocean');
  assert.strictEqual(s.profile.coins, 50000 - 20000 + 9000000);

  const p = await s.createPurchase('legend');
  assert.strictEqual(p.reference, 'PV-XYZ234');

  // Confirmación del admin en tiempo real → nivel nuevo + aviso
  let up = null;
  s.on('tierUp', (t) => { up = t; });
  be.onProfile(Object.assign({}, be.row, { tier: 'legend', coins: be.row.coins + 2000000 }));
  assert.strictEqual(up, 'legend');
  assert.ok(s.hasCoach());

  // Código de creador con cuenta: lo valida el servidor
  const s2 = new Store(fakeBackend());
  await s2.login('j@example.com', 'secreto1');
  assert.match(await s2.redeem('damaocho'), /Leyenda/);

  // Avatares: 10 modelos, 7 hombres y 3 mujeres
  assert.strictEqual(Avatars.ROSTER.length, 10);
  assert.strictEqual(Avatars.ROSTER.filter((r) => r.sex === 'm').length, 7);
  assert.strictEqual(Avatars.ROSTER.filter((r) => r.sex === 'f').length, 3);
  assert.ok(Avatars.portraitSVG({ base: 'amara', acc: 'pearls' }).startsWith('<svg'));
  assert.strictEqual(Avatars.resolve({ base: 'sofia', suit: '#123456' }).suit, '#123456');

  console.log('OK — invitado (damaocho, promos), cuenta online simulada (saldo, compras, tiempo real) y avatares.');
})().catch((e) => { console.error(e); process.exit(1); });
