/* PokerVegasPro — usuarios, sesión, monedas, suscripciones, canjes y preferencias (localStorage).
 * Demo 100% cliente: en producción las cuentas, monedas y compras deben validarse en un backend.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});

  const KEY_ACCOUNTS = 'pvp.accounts.v1';
  const KEY_SESSION = 'pvp.session.v1';
  const KEY_GUEST = 'pvp.guest.v1';

  const GUEST_COINS = 10000;
  const SIGNUP_BONUS = 50000;
  const XP_PER_LEVEL = 600;
  const DAY = 86400000;

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* modo privado: se juega sin persistencia */ }
  }

  async function hash(text) {
    if (root.crypto && root.crypto.subtle && root.TextEncoder) {
      const buf = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode('pvp:' + text));
      return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    let h = 0;
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return 'h' + h;
  }

  /** ID de jugador corto y legible para la nota del pago de PayPal (sin 0/O/1/I). */
  function newPlayerId() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = 'PVP-';
    for (let i = 0; i < 6; i++) id += abc[Math.floor(Math.random() * abc.length)];
    return id;
  }

  function newProfile(name, guest, coins) {
    return {
      id: newPlayerId(), name, guest, coins, xp: 0, createdAt: Date.now(),
      tier: 'free', tierUntil: 0, tierSource: '', tierV: 2, redeemed: [],
      prefs: { table: 'classic', deck: 'classic', view: '2d', orientation: 'auto', camera: 'player', sound: true, autoPeek: false, speed: 1 },
      stats: { hands: 0, won: 0, biggestPot: 0, bestHand: 0, bestHandName: '', tournaments: 0, tournamentWins: 0, itm: 0, knockouts: 0, net: 0 },
      adv: null,
    };
  }

  /** Nivel vigente: un pack mensual caducado vuelve a «free». tierUntil 0 = permanente. */
  function effectiveTier(p) {
    if (!p || p.tier === 'free') return 'free';
    if (p.tierUntil && Date.now() > p.tierUntil) return 'free';
    return p.tier;
  }

  /**
   * Aplica un pack a un perfil: suma monedas y activa/prolonga el nivel.
   * days = 0 → permanente. Un nivel inferior al vigente solo suma monedas.
   */
  function grantPack(p, tier, days, coins, source) {
    const T = PVP.Catalog.TIERS;
    const cur = effectiveTier(p);
    p.coins = Math.round((p.coins || 0) + (coins || 0));
    if (!tier || tier === 'free') return p;
    const now = Date.now();
    const permanent = cur !== 'free' && !p.tierUntil;
    if (T[tier].rank > T[cur].rank) {
      p.tier = tier;
      p.tierUntil = days ? now + days * DAY : 0;
      p.tierSource = source || 'pack';
    } else if (T[tier].rank === T[cur].rank && !permanent) {
      p.tierUntil = days ? Math.max(p.tierUntil || now, now) + days * DAY : 0;
      if (!days) p.tierSource = source || 'pack';
    }
    return p;
  }

  /** Completa perfiles antiguos con campos nuevos. */
  function migrate(p) {
    const fresh = newProfile(p.name, p.guest, p.coins);
    p.prefs = Object.assign(fresh.prefs, p.prefs || {});
    p.stats = Object.assign(fresh.stats, p.stats || {});
    if (!p.id) p.id = fresh.id;
    if (!Array.isArray(p.redeemed)) p.redeemed = [];
    if (p.tierV !== 2) {
      // La versión anterior solo tenía desbloqueos de demostración: se retiran.
      p.tier = 'free'; p.tierUntil = 0; p.tierSource = ''; p.tierV = 2;
    }
    if (!PVP.Catalog.TIERS[p.tier]) p.tier = 'free';
    return p;
  }

  class Store extends PVP.Emitter {
    constructor() {
      super();
      this.profile = null;
      this.username = null;
      // Si el panel de admin (u otra pestaña) cambia esta cuenta, recargar.
      if (root.addEventListener) {
        root.addEventListener('storage', (e) => {
          if (this.profile && (e.key === KEY_ACCOUNTS || e.key === KEY_GUEST)) this.reload();
        });
      }
    }

    /** Restaura la sesión anterior (cuenta o invitado). */
    restore() {
      const session = read(KEY_SESSION, null);
      if (!session) return false;
      if (session.type === 'account') {
        const acc = read(KEY_ACCOUNTS, {})[session.user];
        if (!acc) return false;
        this.username = session.user;
        this.profile = migrate(acc.profile);
      } else {
        const g = read(KEY_GUEST, null);
        if (!g) return false;
        this.username = null;
        this.profile = migrate(g);
      }
      this.emit('change', this.profile);
      return true;
    }

    reload() {
      const src = this.username ? (read(KEY_ACCOUNTS, {})[this.username] || {}).profile : read(KEY_GUEST, null);
      if (!src) return;
      this.profile = migrate(src);
      this.emit('change', this.profile);
    }

    playAsGuest() {
      let g = read(KEY_GUEST, null);
      if (!g) g = newProfile('Invitado_' + Math.floor(1000 + Math.random() * 9000), true, GUEST_COINS);
      this.profile = migrate(g);
      this.username = null;
      write(KEY_SESSION, { type: 'guest' });
      this.save();
      return this.profile;
    }

    async register(user, email, password) {
      user = String(user || '').trim();
      if (!/^[\wÀ-ÿ.\-]{3,16}$/.test(user)) throw new Error('El usuario debe tener entre 3 y 16 caracteres (letras, números, . _ -).');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) throw new Error('Introduce un correo válido.');
      if (String(password || '').length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      const accounts = read(KEY_ACCOUNTS, {});
      const key = user.toLowerCase();
      if (accounts[key]) throw new Error('Ese nombre de usuario ya existe.');

      // Si venía de invitado conserva su progreso (y su ID) y suma el bono de bienvenida.
      const base = this.profile && this.profile.guest ? this.profile : newProfile(user, false, 0);
      const profile = Object.assign(base, { name: user, guest: false });
      profile.coins += SIGNUP_BONUS;
      accounts[key] = { email, pass: await hash(password), profile, createdAt: Date.now() };
      write(KEY_ACCOUNTS, accounts);
      write(KEY_SESSION, { type: 'account', user: key });
      try { localStorage.removeItem(KEY_GUEST); } catch (e) { /* sin almacenamiento */ }
      this.username = key;
      this.profile = migrate(profile);
      this.emit('change', this.profile);
      return SIGNUP_BONUS;
    }

    async login(user, password) {
      const accounts = read(KEY_ACCOUNTS, {});
      const key = String(user || '').trim().toLowerCase();
      const acc = accounts[key];
      if (!acc || acc.pass !== (await hash(password))) throw new Error('Usuario o contraseña incorrectos.');
      write(KEY_SESSION, { type: 'account', user: key });
      this.username = key;
      this.profile = migrate(acc.profile);
      this.emit('change', this.profile);
      return this.profile;
    }

    logout() {
      write(KEY_SESSION, null);
      this.profile = null;
      this.username = null;
    }

    save() {
      if (!this.profile) return;
      if (this.username) {
        const accounts = read(KEY_ACCOUNTS, {});
        if (accounts[this.username]) {
          accounts[this.username].profile = this.profile;
          write(KEY_ACCOUNTS, accounts);
        }
      } else {
        write(KEY_GUEST, this.profile);
      }
      this.emit('change', this.profile);
    }

    addCoins(n) {
      this.profile.coins = Math.max(0, Math.round(this.profile.coins + n));
      this.save();
    }

    spend(n) {
      if (this.profile.coins < n) return false;
      this.profile.coins -= n;
      this.save();
      return true;
    }

    addXp(n) {
      const before = this.level();
      this.profile.xp += n;
      this.save();
      if (this.level() > before) this.emit('levelUp', this.level());
    }

    level() { return Math.floor((this.profile ? this.profile.xp : 0) / XP_PER_LEVEL) + 1; }
    levelProgress() { return ((this.profile ? this.profile.xp : 0) % XP_PER_LEVEL) / XP_PER_LEVEL; }

    setPref(key, value) {
      this.profile.prefs[key] = value;
      this.save();
    }

    tier() { return effectiveTier(this.profile); }
    owns(itemTier) { return PVP.Catalog.tierAllows(this.tier(), itemTier); }
    hasCoach() { return this.tier() === 'legend'; }

    /** Si el nivel caducó, vuelve a las mesas/barajas gratuitas equipadas. */
    sanitizePrefs() {
      const p = this.profile.prefs;
      if (!this.owns(PVP.Catalog.table(p.table).tier)) p.table = 'classic';
      if (!this.owns(PVP.Catalog.deck(p.deck).tier)) p.deck = 'classic';
    }

    /**
     * Canjea un código: firmado por el admin (pack o monedas), código secreto de creador o promo pública.
     * Devuelve un texto con lo obtenido o lanza un error con el motivo.
     */
    async redeem(raw) {
      const V = PVP.Vouchers, C = PVP.Config, T = PVP.Catalog.TIERS;
      const p = this.profile;
      const code = V.normalize(raw);
      if (!code) throw new Error('Escribe un código.');
      const fmt = PVP.util.fmt;

      if (V.isSigned(code)) {
        if (!C.ADMIN) throw new Error('Los códigos de activación aún no están habilitados.');
        const v = await V.verify(code, C.ADMIN.publicKey);
        if (!v) throw new Error('Código no válido o alterado.');
        if (v.x && Date.now() > v.x) throw new Error('Este código ha caducado.');
        if (v.u && v.u !== '*' && v.u !== p.id) throw new Error(`Este código es para el jugador ${v.u}. Tu ID es ${p.id}.`);
        if (p.redeemed.includes(v.n)) throw new Error('Ya canjeaste este código.');
        grantPack(p, v.t, v.d || 0, v.c || 0, v.u === '*' ? 'promo' : 'paypal');
        p.redeemed.push(v.n);
        this.sanitizePrefs();
        this.save();
        const parts = [];
        if (v.t && v.t !== 'free') parts.push(`${T[v.t].name} ${v.d ? 'activo ' + v.d + ' días' : 'permanente'}`);
        if (v.c) parts.push(`+${fmt(v.c)} monedas`);
        return parts.join(' · ') || 'Código aplicado';
      }

      if (C.CREATOR_CODE && (await V.checkSecret(code, C.CREATOR_CODE))) {
        if (effectiveTier(p) === 'legend' && !p.tierUntil) throw new Error('Ya tienes el acceso total activado.');
        grantPack(p, 'legend', 0, 0, 'creator');
        this.save();
        return 'Código de creador: acceso total permanente (Pack Leyenda)';
      }

      const h = await V.promoHash(code);
      const promo = (C.PROMO_CODES || []).find((x) => x.hash === h);
      if (promo) {
        if (promo.until && Date.now() > promo.until) throw new Error('Esta promoción ha terminado.');
        if (p.redeemed.includes('promo:' + h.slice(0, 16))) throw new Error('Ya canjeaste este código.');
        p.redeemed.push('promo:' + h.slice(0, 16));
        grantPack(p, null, 0, promo.coins);
        this.save();
        return `+${fmt(promo.coins)} monedas`;
      }
      throw new Error('Código no válido.');
    }
  }

  /* ---------- acceso directo para el panel de administración (mismo navegador) ---------- */
  Store.listAccounts = function () {
    const out = [];
    const accounts = read(KEY_ACCOUNTS, {});
    for (const key of Object.keys(accounts)) {
      out.push({ key, email: accounts[key].email, profile: migrate(accounts[key].profile), createdAt: accounts[key].createdAt || accounts[key].profile.createdAt });
    }
    const g = read(KEY_GUEST, null);
    if (g) out.push({ key: '@guest', email: '', profile: migrate(g), createdAt: g.createdAt });
    return out;
  };

  Store.updateAccount = function (key, fn) {
    if (key === '@guest') {
      const g = migrate(read(KEY_GUEST, null));
      fn(g);
      write(KEY_GUEST, g);
      return g;
    }
    const accounts = read(KEY_ACCOUNTS, {});
    if (!accounts[key]) throw new Error('Cuenta no encontrada');
    const prof = migrate(accounts[key].profile);
    fn(prof);
    accounts[key].profile = prof;
    write(KEY_ACCOUNTS, accounts);
    return prof;
  };

  PVP.Store = Store;
  PVP.Store.SIGNUP_BONUS = SIGNUP_BONUS;
  PVP.Store.GUEST_COINS = GUEST_COINS;
  PVP.Store.effectiveTier = effectiveTier;
  PVP.Store.grantPack = grantPack;
})(typeof window !== 'undefined' ? window : globalThis);
