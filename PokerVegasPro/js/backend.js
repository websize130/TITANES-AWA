/* PokerVegasPro — capa de datos sobre Supabase (Auth, tablas pvp_* y funciones RPC, tiempo real).
 * Si Supabase no está configurado, no carga o el esquema no existe, `available` queda en false y el juego
 * funciona en modo local (invitado).
 */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});

  const Backend = {
    client: null,
    available: false,
    channel: null,

    init() {
      const cfg = PVP.Config.SUPABASE || {};
      if (!cfg.url || !cfg.key || !root.supabase || !root.supabase.createClient) return false;
      this.client = root.supabase.createClient(cfg.url, cfg.key, {
        auth: { persistSession: true, autoRefreshToken: true, storageKey: 'pvp.auth' },
      });
      this.available = true;
      return true;
    },

    _err(error) {
      if (!error) return;
      const msg = error.message || String(error);
      // Mensajes de Supabase Auth más claros para el jugador.
      if (/Invalid login credentials/i.test(msg)) throw new Error('Correo o contraseña incorrectos.');
      if (/Email not confirmed/i.test(msg)) throw new Error('Confirma tu correo con el enlace que te enviamos y vuelve a entrar.');
      if (/already registered/i.test(msg)) throw new Error('Ese correo ya tiene cuenta. Inicia sesión.');
      if (/Password should be/i.test(msg)) throw new Error('La contraseña debe tener al menos 6 caracteres.');
      if (/pvp_|schema cache|does not exist/i.test(msg) && /function|relation|table/i.test(msg)) {
        throw new Error('El servidor del juego aún no está preparado (falta aplicar la migración de Supabase).');
      }
      throw new Error(msg);
    },

    /** Comprueba que el esquema pvp_* existe; si no, el juego sigue en modo local. */
    async probe() {
      if (!this.available) return false;
      try {
        const { error } = await this.client.rpc('pvp_pack_info', { p_pack: 'elite' });
        if (error) this.available = false;
      } catch (e) {
        this.available = false;
      }
      return this.available;
    },

    async rpc(fn, args) {
      const { data, error } = await this.client.rpc(fn, args || {});
      this._err(error);
      return data;
    },

    /* ---------- autenticación ---------- */

    async session() {
      if (!this.available) return null;
      const { data } = await this.client.auth.getSession();
      return data.session;
    },

    async signUp(email, password, username) {
      const { data, error } = await this.client.auth.signUp({
        email, password, options: { data: { username, app: 'pokervegaspro' }, emailRedirectTo: location.href.split('#')[0] },
      });
      this._err(error);
      return data; // data.session es null si hay que confirmar el correo
    },

    async signIn(email, password) {
      const { data, error } = await this.client.auth.signInWithPassword({ email, password });
      this._err(error);
      return data;
    },

    async signOut() {
      this.unsubscribe();
      if (this.available) await this.client.auth.signOut();
    },

    async resetPassword(email) {
      const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] });
      this._err(error);
    },

    /* ---------- perfil ---------- */

    ensureProfile(username) { return this.rpc('pvp_ensure_profile', { p_username: username || '' }); },

    async fetchProfile(uid) {
      const { data, error } = await this.client.from('pvp_profiles').select('*').eq('id', uid).single();
      this._err(error);
      return data;
    },

    async updateProfile(uid, fields) {
      const { error } = await this.client.from('pvp_profiles').update(Object.assign({ updated_at: new Date().toISOString() }, fields)).eq('id', uid);
      this._err(error);
    },

    dailyStatus() { return this.rpc('pvp_daily_status'); },
    claimDaily() { return this.rpc('pvp_claim_daily'); },

    adjustCoins(delta, reason) { return this.rpc('pvp_adjust_coins', { p_delta: Math.round(delta), p_reason: reason }); },
    redeem(code) { return this.rpc('pvp_redeem_code', { p_code: code }); },
    /** Canje sin cuenta (invitado): identifica el dispositivo con un id aleatorio. */
    redeemGuest(code, device) { return this.rpc('pvp_redeem_guest', { p_code: code, p_device: device }); },
    claimGuestCodes(device) { return this.rpc('pvp_claim_guest_codes', { p_device: device }); },

    /* ---------- compras (pago único) ---------- */

    createPurchase(pack, provider) { return this.rpc('pvp_create_purchase', { p_pack: pack, p_provider: provider || 'paypal_me' }); },
    cancelPurchase(id) { return this.rpc('pvp_cancel_purchase', { p_id: id }); },

    async myPurchases(uid) {
      const { data, error } = await this.client.from('pvp_purchases').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(20);
      this._err(error);
      return data || [];
    },

    /** Cambios en tiempo real del perfil y de las compras del jugador. */
    subscribe(uid, onProfile, onPurchase) {
      this.unsubscribe();
      this.channel = this.client.channel('pvp-user-' + uid)
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pvp_profiles', filter: 'id=eq.' + uid }, (p) => onProfile && onProfile(p.new))
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pvp_purchases', filter: 'user_id=eq.' + uid }, (p) => onPurchase && onPurchase(p.new, p.old))
        .subscribe();
    },

    unsubscribe() {
      if (this.channel && this.client) this.client.removeChannel(this.channel);
      this.channel = null;
    },

    /* ---------- administración (requiere is_admin) ---------- */

    async adminPurchases(status) {
      let q = this.client.from('pvp_purchases').select('*, pvp_profiles!pvp_purchases_user_id_fkey(username, player_code, tier)').order('created_at', { ascending: false }).limit(200);
      if (status) q = q.eq('status', status);
      const { data, error } = await q;
      this._err(error);
      return data || [];
    },

    async adminUsers(query) {
      let q = this.client.from('pvp_profiles').select('id, username, player_code, coins, tier, is_admin, created_at').order('created_at', { ascending: false }).limit(100);
      const s = String(query || '').trim().replace(/[%,()]/g, '');
      if (s) q = q.or(`username.ilike.%${s}%,player_code.ilike.%${s}%`);
      const { data, error } = await q;
      this._err(error);
      return data || [];
    },

    async adminCodes() {
      const { data, error } = await this.client.from('pvp_codes').select('*').order('created_at', { ascending: false });
      this._err(error);
      return data || [];
    },

    adminConfirm(id, ref) { return this.rpc('pvp_admin_confirm_purchase', { p_id: id, p_provider_ref: ref || null }); },
    adminReject(id, note) { return this.rpc('pvp_admin_reject_purchase', { p_id: id, p_note: note || null }); },
    adminGrant(uid, pack, note) { return this.rpc('pvp_admin_grant_pack', { p_user: uid, p_pack: pack, p_note: note || null }); },
    adminCoins(uid, delta, note) { return this.rpc('pvp_admin_adjust_coins', { p_user: uid, p_delta: Math.round(delta), p_note: note || null }); },
    adminTier(uid, tier) { return this.rpc('pvp_admin_set_tier', { p_user: uid, p_tier: tier }); },
    adminCreateCode(o) {
      return this.rpc('pvp_admin_create_code', {
        p_code: o.code, p_kind: o.kind || 'promo', p_coins: o.coins || 0, p_tier: o.tier || null,
        p_max_uses: o.maxUses || null, p_expires_at: o.expires || null, p_label: o.label || '',
      });
    },
    adminCodeActive(hash, active) { return this.rpc('pvp_admin_set_code_active', { p_hash: hash, p_active: active }); },

    subscribeAdmin(onChange) {
      this.unsubscribe();
      this.channel = this.client.channel('pvp-admin')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'pvp_purchases' }, () => onChange())
        .subscribe();
    },
  };

  PVP.Backend = Backend;
})(typeof window !== 'undefined' ? window : globalThis);
