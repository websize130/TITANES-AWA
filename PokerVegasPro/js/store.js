/* PokerVegasPro — perfil del jugador.
 * Cuenta registrada: Supabase es la fuente de verdad de monedas, nivel (pago único) y compras, con cambios en
 * tiempo real. Preferencias, estadísticas y XP se guardan en su perfil (columnas que el jugador sí puede editar).
 * Invitado: todo en localStorage, sin compras.
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const KEY_GUEST = 'pvp.guest.v1';
  const GUEST_COINS = 10000;
  const SIGNUP_BONUS = 50000;
  const XP_PER_LEVEL = 600;
  const MAX_CREDIT = 6000000; // límite por movimiento de pvp_adjust_coins
  const KEY_DAILY = 'pvp.daily.v1';
  const KEY_CODE_USES = 'pvp.codeuses.v1';
  const KEY_DEVICE = 'pvp.device.v1';

  /** Fecha de hoy (YYYY-MM-DD) y día ISO (1 = lunes … 7 = domingo) en la zona horaria del juego. */
  function todayInfo() {
    const tz = (PVP.Config.DAILY && PVP.Config.DAILY.timeZone) || undefined;
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const date = `${get('year')}-${get('month')}-${get('day')}`;
    const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday')) + 1;
    const d = new Date(date + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - (dow - 1));
    return { date, dow, weekStart: d.toISOString().slice(0, 10) };
  }

  function dailyAmount(dow) {
    const D = PVP.Config.DAILY || { base: 4000, factor: 2 };
    return D.base * Math.pow(D.factor, dow - 1);
  }

  function read(key, fallback) {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* modo privado */ }
  }

  function defaultPrefs() {
    return {
      table: 'classic', deck: 'classic', orientation: 'auto', sound: true, music: true, musicStyle: 'lounge', autoPeek: true, speed: 1,
      look: { base: 'marco' }, avatarImg: null, v: 4,
    };
  }
  function defaultStats() {
    return { hands: 0, won: 0, biggestPot: 0, bestHand: 0, bestHandName: '', tournaments: 0, tournamentWins: 0, itm: 0, knockouts: 0, net: 0 };
  }
  function newGuestId() {
    const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let id = 'INV-';
    for (let i = 0; i < 6; i++) id += abc[Math.floor(Math.random() * abc.length)];
    return id;
  }

  /** Normaliza un perfil (local o remoto) a la forma que usa el juego. */
  function normalize(p) {
    p.prefs = Object.assign(defaultPrefs(), p.prefs || {});
    if ((p.prefs.v || 0) < 3) p.prefs.autoPeek = true;
    if ((p.prefs.v || 0) < 4) { p.prefs.orientation = 'auto'; p.prefs.v = 4; } // la mesa se adapta sola al girar el móvil
    delete p.prefs.view; delete p.prefs.camera; // la vista 3D ya no existe
    p.stats = Object.assign(defaultStats(), p.stats || {});
    if (!PVP.Catalog.TIERS[p.tier]) p.tier = 'free';
    if (!Array.isArray(p.redeemed)) p.redeemed = [];
    return p;
  }

  function fromRow(row) {
    return normalize({
      uid: row.id, id: row.player_code, name: row.username, guest: false, remote: true, coins: Number(row.coins),
      xp: row.xp || 0, tier: row.tier, prefs: row.prefs, stats: row.stats, adv: row.adv, isAdmin: !!row.is_admin, createdAt: row.created_at,
    });
  }

  /** Id aleatorio y persistente del dispositivo (para canjes de invitado). */
  function deviceId() {
    let id = deviceId.mem || read(KEY_DEVICE, null);
    if (!id) {
      const a = new Uint8Array(12);
      (root.crypto || globalThis.crypto).getRandomValues(a);
      id = 'dev-' + Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
      write(KEY_DEVICE, id);
    }
    deviceId.mem = id;
    return id;
  }

  async function sha256Hex(text) {
    const buf = await root.crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  class Store extends PVP.Emitter {
    constructor(backend) {
      super();
      this.backend = backend || PVP.Backend;
      this.profile = null;
      this._saveT = null;
    }

    get online() { return !!(this.profile && this.profile.remote); }

    /** Restaura la sesión: primero una cuenta de Supabase; si no, el invitado local. */
    async restore() {
      if (this.backend && this.backend.available) {
        try {
          const s = await this.backend.session();
          if (s && s.user) { await this._loadRemote(s.user); return true; }
        } catch (e) { /* sin conexión: se sigue como invitado si lo hay */ }
      }
      const g = read(KEY_GUEST, null);
      if (g && g.active) { this.profile = normalize(g); this.emit('change', this.profile); return true; }
      return false;
    }

    async _loadRemote(user) {
      const row = await this.backend.ensureProfile((user.user_metadata && user.user_metadata.username) || '');
      this.profile = fromRow(row);
      this.backend.subscribe(row.id, (r) => this._onRemoteProfile(r), (row2, old) => this.emit('purchase', row2, old));
      this.emit('change', this.profile);
    }

    _onRemoteProfile(row) {
      if (!this.profile || !this.profile.remote) return;
      const before = this.profile.tier;
      this.profile.coins = Number(row.coins);
      this.profile.tier = row.tier;
      this.profile.isAdmin = !!row.is_admin;
      this.emit('change', this.profile);
      if (PVP.Catalog.TIERS[row.tier].rank > PVP.Catalog.TIERS[before].rank) this.emit('tierUp', row.tier);
    }

    async refresh() {
      if (!this.online) return;
      const row = await this.backend.fetchProfile(this.profile.uid);
      this._onRemoteProfile(row);
    }

    playAsGuest() {
      let g = read(KEY_GUEST, null);
      if (!g) {
        g = {
          id: newGuestId(), name: 'Invitado_' + Math.floor(1000 + Math.random() * 9000), guest: true, coins: GUEST_COINS,
          xp: 0, tier: 'free', prefs: defaultPrefs(), stats: defaultStats(), adv: null, redeemed: [],
        };
      }
      g.active = true;
      this.profile = normalize(g);
      this.save();
      return this.profile;
    }

    /** Alta en Supabase. Devuelve { bonus } o { confirm: true } si hay que confirmar el correo. */
    async register(user, email, password) {
      user = String(user || '').trim();
      if (!/^[\wÀ-ÿ.\-]{3,16}$/.test(user)) throw new Error('El usuario debe tener entre 3 y 16 caracteres (letras, números, . _ -).');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) throw new Error('Introduce un correo válido.');
      if (String(password || '').length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      if (!this.backend || !this.backend.available) throw new Error('El registro online no está disponible ahora mismo. Puedes jugar como invitado.');
      if (!(await this.backend.rpc('pvp_username_available', { p_username: user }))) throw new Error('Ese nombre de usuario ya existe.');

      const guest = this.profile && this.profile.guest ? this.profile : null;
      const res = await this.backend.signUp(email, password, user);
      if (!res.session) return { confirm: true };
      await this._loadRemote(res.user);
      if (guest) await this._importGuest(guest);
      await this._claimGuestCodes();
      return { bonus: SIGNUP_BONUS };
    }

    async login(email, password) {
      if (!this.backend || !this.backend.available) throw new Error('El inicio de sesión online no está disponible ahora mismo.');
      const guest = this.profile && this.profile.guest ? this.profile : null;
      const res = await this.backend.signIn(String(email || '').trim(), password);
      await this._loadRemote(res.user);
      if (guest && !this.profile.stats.hands) await this._importGuest(guest);
      await this._claimGuestCodes();
      return this.profile;
    }

    /** Los packs canjeados como invitado en este dispositivo (p. ej. damaocho) pasan a la cuenta. */
    async _claimGuestCodes() {
      try {
        await this.backend.claimGuestCodes(deviceId());
        await this.refresh(); // si cambia el nivel, _onRemoteProfile avisa con «tierUp»
      } catch (e) { /* sin canjes previos o servidor sin la función: nada que traspasar */ }
    }

    /** Conserva avatar, preferencias y estadísticas del invitado (las monedas no: el servidor da el bono). */
    async _importGuest(g) {
      this.profile.prefs = Object.assign({}, this.profile.prefs, g.prefs);
      this.profile.stats = g.stats;
      this.profile.adv = g.adv;
      this.profile.xp = Math.max(this.profile.xp, g.xp || 0);
      await this._flush();
      const local = read(KEY_GUEST, null);
      if (local) { local.active = false; write(KEY_GUEST, local); }
    }

    async logout() {
      if (this.online) { await this._flush(); await this.backend.signOut(); }
      const local = read(KEY_GUEST, null);
      if (local) { local.active = false; write(KEY_GUEST, local); }
      this.profile = null;
    }

    /** Guarda: invitado → localStorage; cuenta → perfil remoto (agrupado para no saturar). */
    save() {
      if (!this.profile) return;
      if (!this.online) write(KEY_GUEST, Object.assign({}, this.profile, { active: true }));
      else {
        clearTimeout(this._saveT);
        this._saveT = setTimeout(() => this._flush(), 1500);
      }
      this.emit('change', this.profile);
    }

    async _flush() {
      clearTimeout(this._saveT);
      if (!this.online) return;
      const p = this.profile;
      try {
        await this.backend.updateProfile(p.uid, { prefs: p.prefs, stats: p.stats, adv: p.adv, xp: Math.max(0, Math.round(p.xp)) });
      } catch (e) { this.emit('error', e.message); }
    }

    /** Suma monedas (cobros, premios, recompensas). En cuenta online lo registra el servidor. */
    addCoins(n, reason) {
      n = Math.round(n);
      if (!n) return;
      this.profile.coins = Math.max(0, this.profile.coins + n);
      if (!this.online) { this.save(); return; }
      this.emit('change', this.profile);
      this._remoteCoins(n, reason || 'cash_out');
    }

    /** Gasta monedas (entradas, recompras). Devuelve false si no hay saldo. */
    spend(n, reason) {
      n = Math.round(n);
      if (this.profile.coins < n) return false;
      this.profile.coins -= n;
      if (!this.online) { this.save(); return true; }
      this.emit('change', this.profile);
      this._remoteCoins(-n, reason || 'buy_in');
      return true;
    }

    async _remoteCoins(delta, reason) {
      try {
        let left = delta;
        while (left !== 0) {
          const step = left > 0 ? Math.min(left, MAX_CREDIT) : left;
          const bal = await this.backend.adjustCoins(step, reason);
          left -= step;
          if (left === 0) { this.profile.coins = Number(bal); this.emit('change', this.profile); }
        }
      } catch (e) {
        this.emit('error', 'No se pudo actualizar tu saldo: ' + e.message);
        this.refresh().catch(() => {});
      }
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

    tier() { return this.profile ? this.profile.tier : 'free'; }
    owns(itemTier) { return PVP.Catalog.tierAllows(this.tier(), itemTier); }
    hasCoach() { return this.tier() === 'legend'; }

    sanitizePrefs() {
      const p = this.profile.prefs;
      if (!this.owns(PVP.Catalog.table(p.table).tier)) p.table = 'classic';
      if (!this.owns(PVP.Catalog.deck(p.deck).tier)) p.deck = 'classic';
    }

    /** Canjea un código promocional o de creador. Con cuenta lo valida Supabase; como invitado, el navegador. */
    /**
     * Canjea un código. Basta con escribirlo: funciona con cuenta y también como invitado (sin registro).
     * Los códigos con usos limitados (damaocho: 15) se cuentan en el servidor cuando está disponible.
     */
    async redeem(raw) {
      const code = String(raw || '').replace(/\s+/g, '').toUpperCase();
      if (!code) throw new Error('Escribe un código.');
      const fmt = PVP.util.fmt;
      const T = PVP.Catalog.TIERS;
      const before = this.tier();
      let res;
      if (this.online) {
        res = await this.backend.redeem(code);
        await this.refresh();
      } else {
        const hash = await sha256Hex(code);
        if (this.profile.redeemed.includes(hash)) throw new Error('Ya canjeaste este código.');
        if (this.backend && this.backend.available) {
          try { res = await this.backend.redeemGuest(code, deviceId()); } catch (e) {
            // Solo si el servidor aún no tiene la función se usa la lista local; los demás errores se muestran.
            if (!/no está preparado/.test(e.message)) throw e;
          }
        }
        if (!res) {
          const c = (PVP.Config.LOCAL_CODES || []).find((x) => x.hash === hash);
          if (!c) throw new Error('Código no válido.');
          if (c.maxUses) {
            const uses = read(KEY_CODE_USES, {});
            if ((uses[hash] || 0) >= c.maxUses) throw new Error(`Este código ha expirado: ya se alcanzó su límite de ${c.maxUses} usos.`);
            uses[hash] = (uses[hash] || 0) + 1;
            write(KEY_CODE_USES, uses);
          }
          res = { kind: c.kind, coins: c.coins, tier: c.tier };
        }
        this.profile.redeemed.push(hash);
        this.profile.coins += Number(res.coins) || 0;
        if (res.tier && T[res.tier].rank > T[this.profile.tier].rank) this.profile.tier = res.tier;
        this.save();
      }
      this.sanitizePrefs();
      if (this.tier() !== before) this._showcase();
      if (res.kind === 'creator') return '¡Código de creador! Pack Leyenda activado: todo desbloqueado';
      const parts = [];
      if (res.tier) parts.push(T[res.tier].name + ' activado');
      if (res.coins) parts.push(`+${fmt(res.coins)} monedas`);
      return parts.join(' · ') || 'Código aplicado';
    }

    /** Al desbloquear un pack se estrenan la mejor mesa y baraja disponibles (si el jugador seguía con las básicas). */
    _showcase() {
      const p = this.profile.prefs;
      const best = this.tier() === 'legend' ? { table: 'royale', deck: 'gold' } : { table: 'space', deck: 'ruby' };
      if (PVP.Catalog.table(p.table).tier === 'free') p.table = best.table;
      if (PVP.Catalog.deck(p.deck).tier === 'free') p.deck = best.deck;
      this.save();
      if (!this.online) this.emit('tierUp', this.tier());
    }

    /* ---------- recompensa diaria semanal ---------- */

    /** { today, claimed: [días ISO], amounts: [7 importes], canClaim } */
    async dailyStatus() {
      const amounts = [1, 2, 3, 4, 5, 6, 7].map(dailyAmount);
      if (this.online) {
        const s = await this.backend.dailyStatus();
        const claimed = s.claimed || [];
        return { today: s.today, claimed, amounts, canClaim: !claimed.includes(s.today) };
      }
      const t = todayInfo();
      const d = this._localDaily(t);
      return { today: t.dow, claimed: d.claimed.slice(), amounts, canClaim: !d.claimed.includes(t.dow) };
    }

    /**
     * Estado del bonus del invitado. Vive en el propio perfil (en memoria y guardado con él), así que aunque el
     * navegador no permita guardar datos (modo privado, visores de archivos) no se puede cobrar dos veces en la sesión.
     */
    _localDaily(t) {
      const p = this.profile;
      let d = p.daily;
      if (!d) {
        const old = read(KEY_DAILY, null); // versión anterior: estado fuera del perfil
        if (old && old.player === p.id) d = { weekStart: old.weekStart, claimed: old.claimed || [] };
      }
      if (!d || d.weekStart !== t.weekStart) d = { weekStart: t.weekStart, claimed: [] };
      p.daily = d;
      return d;
    }

    /** Reclama el premio de hoy. Devuelve el importe. */
    async claimDaily() {
      if (this.online) {
        if (this._claiming) throw new Error('Un momento…');
        this._claiming = true;
        try {
          const r = await this.backend.claimDaily();
          this.profile.coins = Number(r.balance);
          this.emit('change', this.profile);
          return Number(r.amount);
        } finally {
          this._claiming = false;
        }
      }
      if (this._claiming) throw new Error('Un momento…');
      const t = todayInfo();
      const d = this._localDaily(t);
      if (d.claimed.includes(t.dow)) throw new Error('Ya reclamaste la recompensa de hoy');
      d.claimed.push(t.dow);
      const amount = dailyAmount(t.dow);
      this.profile.coins += amount;
      this.save();
      return amount;
    }

    /* ---------- compras (pago único) ---------- */

    async createPurchase(pack) {
      if (!this.online) throw new Error('Necesitas una cuenta registrada para comprar.');
      return this.backend.createPurchase(pack, PVP.Config.PAYMENT_PROVIDER);
    }
    myPurchases() { return this.online ? this.backend.myPurchases(this.profile.uid) : Promise.resolve([]); }
    cancelPurchase(id) { return this.backend.cancelPurchase(id); }
  }

  PVP.Store = Store;
  PVP.Store.todayInfo = todayInfo;
  PVP.Store.dailyAmount = dailyAmount;
  PVP.Store.SIGNUP_BONUS = SIGNUP_BONUS;
  PVP.Store.GUEST_COINS = GUEST_COINS;
})(typeof window !== 'undefined' ? window : globalThis);
