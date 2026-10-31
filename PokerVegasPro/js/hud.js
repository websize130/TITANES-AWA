/* PokerVegasPro — HUD de la mesa (acciones contextuales, chat, emotes, selectores) y utilidades de UI. */
(function (root) {
  'use strict';

  const PVP = (root.PVP = root.PVP || {});
  const U = PVP.util;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------- utilidades de UI compartidas ---------- */
  const ui = {
    toast(msg, ms) {
      const box = $('#toasts');
      const t = document.createElement('div');
      t.className = 'toast';
      t.innerHTML = msg;
      box.appendChild(t);
      setTimeout(() => t.classList.add('out'), ms || 2600);
      setTimeout(() => t.remove(), (ms || 2600) + 400);
    },
    open(id) { $('#' + id).classList.add('open'); },
    close(id) { $('#' + id).classList.remove('open'); },
    confirm(o) {
      $('#cf-title').innerHTML = o.title || '';
      $('#cf-text').innerHTML = o.text || '';
      const yes = $('#cf-yes'), no = $('#cf-no');
      yes.querySelector('span').textContent = o.yes || 'Aceptar';
      no.textContent = o.no || 'Cancelar';
      yes.style.display = o.canYes === false ? 'none' : '';
      no.style.display = o.hideNo ? 'none' : '';
      yes.onclick = () => { ui.close('modal-confirm'); if (o.onYes) o.onYes(); };
      no.onclick = () => { ui.close('modal-confirm'); if (o.onNo) o.onNo(); };
      ui.open('modal-confirm');
    },
  };
  PVP.ui = ui;

  /* ---------- HUD de la mesa ---------- */
  class Hud {
    constructor(store) {
      this.store = store;
      this.game = null;
      this.legal = null;
      this.bar = $('#action-bar');
      this.range = $('#raise-range');
      this.logEl = $('#chat-log');

      this.bar.addEventListener('click', (e) => {
        const b = e.target.closest('button');
        if (!b || !this.game || !this.legal) return;
        if (b.dataset.act) this._act(b.dataset.act);
        else if (b.dataset.preset) this._preset(b.dataset.preset);
        else if (b.dataset.step) this._setRaise(+this.range.value + +b.dataset.step * this._step());
        if (PVP.Sound) PVP.Sound.click();
      });
      this.range.addEventListener('input', () => this._setRaise(+this.range.value));
      this.input = $('#raise-input');
      this.input.addEventListener('change', () => this._setRaise(+this.input.value || 0));
      this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { this._setRaise(+this.input.value || 0); this._act('raise'); } });

      $('#btn-peek').addEventListener('click', () => this.game && this.game.setPeek(!this.game.peek));
      $('#btn-chat').addEventListener('click', () => this.toggleChat());
      $('#btn-chat-close').addEventListener('click', () => this.toggleChat(false));
      $('#btn-skin').addEventListener('click', (e) => { e.stopPropagation(); this.toggleSkins(); });
      document.addEventListener('click', (e) => { if (!e.target.closest('#skin-pop')) $('#skin-pop').classList.remove('open'); });

      $('#chat-form').addEventListener('submit', (e) => {
        e.preventDefault();
        if (!this.game) return;
        this.game.chat($('#chat-input').value);
        $('#chat-input').value = '';
      });
      $('#emote-row').innerHTML = PVP.Catalog.EMOTES.map((em) => `<button type="button" data-emote="${em}">${em}</button>`).join('');
      $('#emote-row').addEventListener('click', (e) => {
        const b = e.target.closest('[data-emote]');
        if (b && this.game) this.game.emote(b.dataset.emote);
      });

      const seg = (id, fn) => $(id).addEventListener('click', (e) => {
        const b = e.target.closest('button[data-v]');
        if (b && this.game) fn(b.dataset.v);
      });

      document.addEventListener('keydown', (e) => this._key(e));
      root.addEventListener('resize', () => this.layoutBar());
      if (root.visualViewport) root.visualViewport.addEventListener('resize', () => this.layoutBar());

      // Panel de sala online
      $('#btn-share').addEventListener('click', () => this.game && this.game.showRoom());
      $('#rp-close').addEventListener('click', () => this.hideRoom());
      $('#rp-start').addEventListener('click', () => this.room && this.room.onStart && this.room.onStart());
      const copy = async (text, ok) => {
        try { await navigator.clipboard.writeText(text); ui.toast(ok); } catch (e) { ui.toast(U.esc(text), 6000); }
      };
      $('#rp-link').addEventListener('click', () => this.room && copy(PVP.Net.inviteLink(this.room.code) || this.room.code, 'Enlace copiado: pégalo en tu grupo'));
      $('#rp-copy').addEventListener('click', () => this.room && copy(this.room.code, 'Código copiado'));
      $('#rp-native').addEventListener('click', () => {
        if (!this.room || !navigator.share) return;
        const link = PVP.Net.inviteLink(this.room.code);
        navigator.share({ title: 'PokerVegasPro', text: PVP.Net.shareText(this.room.code, this.room.title).replace(/\nEntra directo:.*$/m, ''), url: link || undefined }).catch(() => {});
      });
    }

    dock(hand, status) {
      $('#hd-hand').innerHTML = hand ? 'Tu mano: <b>' + U.esc(hand) + '</b>' : '';
      if (status !== undefined) $('#hd-status').textContent = status;
    }

    /* ----- sala online ----- */

    showRoom(o) {
      this.room = o;
      const link = PVP.Net.inviteLink(o.code);
      $('#rp-title').textContent = o.title || 'Sala privada';
      $('#rp-code').textContent = o.code;
      $('#rp-wa').href = PVP.Net.whatsappUrl(PVP.Net.shareText(o.code, o.title));
      $('#rp-link').hidden = !link;
      $('#rp-native').hidden = !navigator.share;
      $('#rp-start').hidden = !o.isHost || o.begun;
      $('#rp-wait').hidden = o.isHost || o.begun;
      $('#rp-note').textContent = !o.online
        ? 'Modo local: el servidor de salas no está disponible, la sala solo funciona entre pestañas de este navegador.'
        : link ? 'Tus amigos entran directamente a la sala con el enlace, o escribiendo el código en «Salas privadas → Unirse».'
          : 'Tus amigos pueden entrar con el código en «Salas privadas → Unirse». Publica el juego en una web para que el enlace lleve directo a la sala.';
      $('#room-panel').hidden = false;
    }

    hideRoom() { $('#room-panel').hidden = true; }

    roomPlayers(list, bots) {
      $('#rp-count').textContent = `(${list.filter((x) => !x.waiting).length}${bots ? ' + ' + bots + ' virtuales' : ''})`;
      $('#rp-list').innerHTML = list.map((x) => `<li class="${x.waiting ? 'waiting' : ''}${x.away ? ' away' : ''}"><b>${U.esc(x.name)}</b>${x.host ? '<em>Anfitrión</em>' : ''}${x.me ? '<em class="me">Tú</em>' : ''}${x.waiting ? '<em>Esperando asiento</em>' : ''}${x.away ? '<em>Desconectado</em>' : ''}</li>`).join('');
    }

    bind(game) {
      this.game = game;
      this.logEl.innerHTML = '';
      $('#chat-dot').classList.remove('on');
      this.hideActions();
      this.syncToggles();
      this.syncPeek(game.peek);
      $('#btn-share').hidden = !game.net;
      this.hideRoom();
      this.dock('', '');
      this.layoutBar();
      const names = { public: 'Partida pública', private: 'Sala privada', tournament: 'Torneo' };
      $('#game-mode').textContent = game.cfg.title || names[game.cfg.mode];
      this.setLevel('');
    }

    unbind() {
      this.game = null;
      this.hideActions();
      $('#chat-panel').classList.remove('open');
      $('#skin-pop').classList.remove('open');
    }

    syncToggles() {
      if (!this.game) return;
      const mark = (id, v) => $$(id + ' button').forEach((b) => b.classList.toggle('on', b.dataset.v === String(v)));
    }

    syncPeek(on) {
      const b = $('#btn-peek');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('on', on);
      b.querySelector('.lbl').textContent = on ? 'Ocultar' : 'Mirar cartas';
    }

    setLevel(text) { $('#game-level').textContent = text; }

    /* ----- acciones ----- */

    _step() { return this.game ? this.game.engine.sb : 1; }

    showActions(legal, engine) {
      this.legal = legal;
      this.engine = engine;
      const bar = this.bar;
      bar.classList.add('show');
      $('#screen-game').classList.add('bar-open');
      $('[data-act="check"]', bar).style.display = legal.canCheck ? '' : 'none';
      $('[data-act="call"]', bar).style.display = legal.canCheck ? 'none' : '';
      $('#call-amt').textContent = U.fmt(legal.toCall);
      const allInCall = !legal.canCheck && legal.toCall >= engine.seats[this.game ? this.game.hero : 0].stack;
      $('[data-act="call"]', bar).classList.toggle('is-allin', allInCall);
      // visibility (no display) para que el panel no cambie de tamaño y la mesa no salte.
      $('.ab-raise', bar).style.visibility = legal.canRaise ? '' : 'hidden';
      $('[data-act="raise"]', bar).style.display = legal.canRaise ? '' : 'none';
      $('#raise-label').textContent = legal.isBet ? 'Apostar' : 'Subir a';
      $('#ab-pot').textContent = U.fmt(legal.pot);
      $('#ab-tocall').textContent = legal.toCall ? U.fmt(legal.toCall) : '—';
      $('#ab-odds').textContent = legal.toCall ? `Necesitas ${Math.round((legal.toCall / (legal.pot + legal.toCall)) * 100)}% de equidad` : 'Puedes pasar gratis';
      this.input.min = legal.minTo;
      this.input.max = legal.maxTo;
      this.range.min = legal.minTo;
      this.range.max = legal.maxTo;
      this.range.step = 1;
      this._setRaise(legal.minTo);
    }

    /**
     * Reserva el sitio exacto del panel de acciones: abajo (vertical / escritorio) o a la derecha en móviles en
     * horizontal, donde la altura es escasa. Así la mesa usa todo el espacio restante sin quedar tapada.
     */
    layoutBar() {
      const scr = $('#screen-game');
      const side = root.matchMedia && root.matchMedia('(orientation: landscape) and (max-height: 540px)').matches;
      const bar = this.bar;
      scr.style.setProperty('--reserve', side ? '0px' : bar.offsetHeight + 12 + 'px');
      scr.style.setProperty('--gutter', side ? bar.offsetWidth + 10 + 'px' : '0px');
      scr.classList.toggle('side-bar', !!side);
    }

    hideActions() {
      this.legal = null;
      this.bar.classList.remove('show');
      $('#screen-game').classList.remove('bar-open');
    }

    _setRaise(v) {
      const l = this.legal;
      if (!l) return;
      const step = this._step();
      v = v >= l.maxTo ? l.maxTo : Math.round(v / step) * step;
      v = U.clamp(v, l.minTo, l.maxTo);
      this.raiseTo = v;
      this.range.value = v;
      this.input.value = v;
      const pct = l.maxTo > l.minTo ? ((v - l.minTo) / (l.maxTo - l.minTo)) * 100 : 100;
      this.range.style.setProperty('--pct', pct + '%');
      const all = v >= l.maxTo;
      $('#raise-amt').textContent = all ? 'ALL-IN ' + U.short(v) : U.fmt(v);
      $('[data-act="raise"]', this.bar).classList.toggle('is-allin', all);
    }

    _preset(kind) {
      const l = this.legal, e = this.engine;
      if (!l) return;
      if (kind === 'allin') return this._setRaise(l.maxTo);
      if (kind === 'min') return this._setRaise(l.minTo);
      const f = kind === 'half' ? 0.5 : kind === 'twothirds' ? 2 / 3 : 1;
      // Subida "a bote": igualar y después apostar el bote resultante × f.
      this._setRaise(e.currentBet + (l.pot + l.toCall) * f);
    }

    _act(type) {
      if (type === 'raise') this.game.heroAct({ type: this.raiseTo >= this.legal.maxTo ? 'allin' : 'raise', amount: this.raiseTo });
      else this.game.heroAct({ type });
    }

    _key(e) {
      if (!this.game || e.target.closest('input, textarea, select')) return;
      const k = e.key.toLowerCase();
      if (k === ' ' ) { e.preventDefault(); this.game.setPeek(!this.game.peek); return; }
      if (!this.legal) return;
      if (k === 'f') this._act('fold');
      else if (k === 'c') this._act(this.legal.canCheck ? 'check' : 'call');
      else if (k === 'r' && this.legal.canRaise) this._act('raise');
      else if (k === 'a' && this.legal.canRaise) { this._setRaise(this.legal.maxTo); }
      else if (k === 'arrowup' || k === 'arrowright') { e.preventDefault(); this._setRaise(this.raiseTo + this._step() * 2); }
      else if (k === 'arrowdown' || k === 'arrowleft') { e.preventDefault(); this._setRaise(this.raiseTo - this._step() * 2); }
    }

    /* ----- chat / registro ----- */

    log(text, cls) {
      const row = document.createElement('div');
      row.className = 'cl-row ' + (cls || '');
      row.textContent = text;
      this.logEl.appendChild(row);
      while (this.logEl.children.length > 120) this.logEl.firstChild.remove();
      this.logEl.scrollTop = this.logEl.scrollHeight;
      if (/chat/.test(cls || '') && !$('#chat-panel').classList.contains('open')) $('#chat-dot').classList.add('on');
    }

    toggleChat(force) {
      const p = $('#chat-panel');
      const open = force === undefined ? !p.classList.contains('open') : force;
      p.classList.toggle('open', open);
      if (open) { $('#chat-dot').classList.remove('on'); this.logEl.scrollTop = this.logEl.scrollHeight; }
    }

    toggleSkins() {
      const pop = $('#skin-pop');
      const open = !pop.classList.contains('open');
      pop.classList.toggle('open', open);
      if (!open || !this.game) return;
      const prefs = this.store.profile.prefs;
      const C = PVP.Catalog;
      $('#skin-tables').innerHTML = C.TABLES.map((t) => {
        const owned = this.store.owns(t.tier);
        return `<button class="skin-opt${prefs.table === t.id ? ' on' : ''}${owned ? '' : ' locked'}" data-table="${t.id}" title="${U.esc(t.name)}">${PVP.Art.tableSwatch(t)}<span>${U.esc(t.name)}</span></button>`;
      }).join('');
      $('#skin-decks').innerHTML = C.DECKS.map((d) => {
        const owned = this.store.owns(d.tier);
        return `<button class="skin-opt deck${prefs.deck === d.id ? ' on' : ''}${owned ? '' : ' locked'}" data-deck="${d.id}" title="${U.esc(d.name)}">${PVP.Art.cardHTML(-1, d.id, false)}<span>${U.esc(d.name)}</span></button>`;
      }).join('');
      pop.onclick = (e) => {
        const t = e.target.closest('[data-table]'), d = e.target.closest('[data-deck]');
        if (t && !this.game.setTable(t.dataset.table)) ui.toast('🔒 Disponible en la Tienda');
        if (d && !this.game.setDeck(d.dataset.deck)) ui.toast('🔒 Disponible en la Tienda');
        if (t || d) { pop.classList.remove('open'); this.toggleSkins(); }
      };
    }

    toast(msg) { ui.toast(msg); }

    askRebuy(o) {
      ui.confirm({
        title: 'Sin fichas', text: o.text, yes: 'Recomprar', no: 'Salir de la mesa',
        canYes: o.canYes !== false, onYes: o.onYes, onNo: o.onNo,
      });
    }

    showResult(o) {
      ui.confirm({
        title: o.title, text: o.text, yes: 'Volver al lobby', hideNo: true,
        onYes: () => this.game && this.game.emit('exit'),
      });
    }
  }

  PVP.Hud = Hud;
})(typeof window !== 'undefined' ? window : globalThis);
