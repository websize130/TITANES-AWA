/* PokerVegasPro — usuarios, sesión y preferencias (localStorage).
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

  function newProfile(name, guest, coins) {
    return {
      name, guest, coins, xp: 0, tier: 'free', createdAt: Date.now(),
      prefs: { table: 'classic', deck: 'classic', view: '2d', orientation: 'auto', camera: 'player', sound: true, autoPeek: false, speed: 1 },
      stats: { hands: 0, won: 0, biggestPot: 0, bestHand: 0, bestHandName: '', tournaments: 0, tournamentWins: 0, itm: 0, knockouts: 0, net: 0 },
    };
  }

  class Store extends PVP.Emitter {
    constructor() {
      super();
      this.profile = null;
      this.username = null;
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

      // Si venía de invitado conserva su progreso y suma el bono de bienvenida.
      const base = this.profile && this.profile.guest ? this.profile : newProfile(user, false, 0);
      const profile = Object.assign(base, { name: user, guest: false });
      profile.coins += SIGNUP_BONUS;
      accounts[key] = { email, pass: await hash(password), profile };
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

    owns(itemTier) { return PVP.Catalog.tierAllows(this.profile.tier, itemTier); }

    /** Activa un nivel de pago. Sin pasarela conectada solo se usa en modo demo. */
    unlockTier(tier) {
      if (PVP.Catalog.TIERS[tier].rank > PVP.Catalog.TIERS[this.profile.tier].rank) {
        this.profile.tier = tier;
        this.save();
      }
    }
  }

  /** Completa perfiles antiguos con campos nuevos. */
  function migrate(p) {
    const fresh = newProfile(p.name, p.guest, p.coins);
    p.prefs = Object.assign(fresh.prefs, p.prefs || {});
    p.stats = Object.assign(fresh.stats, p.stats || {});
    if (!PVP.Catalog.TIERS[p.tier]) p.tier = 'free';
    return p;
  }

  PVP.Store = Store;
  PVP.Store.SIGNUP_BONUS = SIGNUP_BONUS;
  PVP.Store.GUEST_COINS = GUEST_COINS;
})(typeof window !== 'undefined' ? window : globalThis);
