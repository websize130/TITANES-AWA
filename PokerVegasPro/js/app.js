/* PokerVegasPro — aplicación: navegación entre pantallas, usuarios, lobby, tienda y ciclo de partidas. */
(function (root) {
  'use strict';

  const PVP = root.PVP;
  const U = PVP.util;
  const C = PVP.Catalog;
  const ui = PVP.ui;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  const store = new PVP.Store();
  const hud = new PVP.Hud(store);
  let game = null;
  let current = null;

  /* ---------- navegación ---------- */

  const RENDER = {
    public: renderPublic,
    private: renderPrivate,
    tournaments: renderTournaments,
    shop: renderShop,
    stats: renderStats,
  };

  function go(name, opts) {
    if (!store.profile && name !== 'welcome') name = 'welcome';
    // Historial del navegador: el botón/gesto «atrás» del móvil vuelve al menú en lugar de salir del juego.
    if (!(opts && opts.pop) && name !== current) {
      try {
        if (name === 'menu' || name === 'welcome') history.replaceState({ s: name }, '');
        else history.pushState({ s: name }, '');
      } catch (e) { /* visores sin historial */ }
    }
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    $('#topbar').classList.toggle('hidden', name === 'welcome' || name === 'game');
    document.body.dataset.screen = name;
    current = name;
    if (RENDER[name]) RENDER[name]();
    PVP.Legal.onScreen(name);
    if (name === 'menu') PVP.DailyUI.autoOpen(store);
    root.scrollTo(0, 0);
  }

  /* ---------- música, bonus diario y partículas ---------- */

  function musicWanted() { return !store.profile || store.profile.prefs.music !== false; }
  function musicStyle() { return (store.profile && store.profile.prefs.musicStyle) || 'lounge'; }
  function syncMusicFab() {
    const on = musicWanted();
    const fab = $('#music-fab');
    fab.classList.toggle('off', !on);
    fab.setAttribute('aria-pressed', on ? 'true' : 'false');
    fab.title = on ? 'Música: ' + PVP.Audio.STYLES[musicStyle()].name : 'Música desactivada';
    $('#btn-music').classList.toggle('off', !on);
    const t = $('#mp-toggle');
    t.setAttribute('aria-pressed', on ? 'true' : 'false');
    t.textContent = on ? 'Activada' : 'Silenciada';
    $$('#mp-styles button').forEach((b) => b.classList.toggle('on', b.dataset.style === musicStyle()));
    PVP.Audio.setStyle(musicStyle());
  }
  $('#mp-styles').innerHTML = Object.keys(PVP.Audio.STYLES).map((id) => {
    const st = PVP.Audio.STYLES[id];
    return `<button type="button" data-style="${id}"><b>${st.name}</b><small>${st.desc}</small></button>`;
  }).join('');
  function setMusic(on, style) {
    if (store.profile) {
      if (style) store.setPref('musicStyle', style);
      store.setPref('music', on);
    }
    if (style) PVP.Audio.setStyle(style);
    PVP.Audio.setMusic(on);
    syncMusicFab();
  }
  // Los navegadores solo permiten audio tras una interacción: la música arranca con el primer toque.
  document.addEventListener('pointerdown', function firstTouch() {
    document.removeEventListener('pointerdown', firstTouch);
    PVP.Audio.setStyle(musicStyle());
    if (musicWanted()) PVP.Audio.startMusic();
  });
  // Selector compacto: botón pequeño que abre un menú con on/off y estilos.
  function toggleMusicPop(anchor) {
    const pop = $('#music-pop');
    if (pop.classList.contains('open')) return pop.classList.remove('open');
    syncMusicFab();
    pop.classList.add('open');
    const r = anchor.getBoundingClientRect(), pw = pop.offsetWidth, ph = pop.offsetHeight;
    const left = U.clamp(r.left + r.width / 2 - pw / 2, 8, root.innerWidth - pw - 8);
    const below = r.top < root.innerHeight / 2;
    pop.style.left = left + 'px';
    pop.style.top = (below ? r.bottom + 8 : r.top - ph - 8) + 'px';
  }
  $('#music-fab').addEventListener('click', (e) => { e.stopPropagation(); toggleMusicPop(e.currentTarget); });
  $('#btn-music').addEventListener('click', (e) => { e.stopPropagation(); toggleMusicPop(e.currentTarget); });
  $('#mp-toggle').addEventListener('click', () => setMusic(!musicWanted()));
  $('#mp-styles').addEventListener('click', (e) => {
    const b = e.target.closest('[data-style]');
    if (b) setMusic(true, b.dataset.style);
  });
  document.addEventListener('click', (e) => { if (!e.target.closest('#music-pop')) $('#music-pop').classList.remove('open'); });

  // Pantalla completa dentro de la mesa (se oculta si el navegador no la permite, p. ej. iPhone).
  (function fullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    const btn = $('#btn-fs');
    if (!req || document.fullscreenEnabled === false) { btn.hidden = true; return; }
    btn.addEventListener('click', () => {
      const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
      if (fsEl) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      else {
        const p = req.call(el, { navigationUI: 'hide' });
        if (p && p.then) p.then(() => { try { if (screen.orientation && screen.orientation.lock && root.innerWidth > root.innerHeight) screen.orientation.lock('landscape').catch(() => {}); } catch (e) { /* opcional */ } }).catch(() => ui.toast('El navegador no permitió la pantalla completa.'));
      }
    });
  })();
  $('#btn-daily').addEventListener('click', () => PVP.DailyUI.open(store));
  PVP.Particles.start();

  // Paralaje suave de la escena del menú con el ratón (solo transform, una vez por frame).
  (function parallax() {
    if (root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const scene = $('#mv-scene');
    let raf = 0, tx = 0, ty = 0;
    $('#screen-menu').addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      tx = (e.clientX / root.innerWidth - 0.5) * -10;
      ty = (e.clientY / root.innerHeight - 0.5) * -6;
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; scene.style.setProperty('--px', tx.toFixed(1) + 'px'); scene.style.setProperty('--py', ty.toFixed(1) + 'px'); });
    });
  })();
  $('#mv-profile').addEventListener('click', () => $('#btn-profile').click());

  $('#btn-profile').addEventListener('click', () => {
    PVP.ProfileUI.open(store, () => { renderTopbar(); if (current === 'stats') renderStats(); });
  });
  PVP.Legal.init();

  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { go(g.dataset.go); if (PVP.Sound) PVP.Sound.click(); }
    const m = e.target.closest('[data-modal]');
    if (m) { syncSettings(); ui.open('modal-' + m.dataset.modal); }
    if (e.target.closest('[data-close]') || e.target.classList.contains('modal')) {
      const modal = e.target.closest('.modal');
      if (modal && modal.id !== 'modal-confirm' && modal.id !== 'modal-match' && modal.id !== 'modal-join') modal.classList.remove('open');
    }
  });

  /* ---------- barra superior ---------- */

  function renderTopbar() {
    const p = store.profile;
    if (!p) return;
    $('#tb-name').textContent = p.name;
    $('#tb-avatar').innerHTML = PVP.Avatars.avatarHTML(p.prefs.look, p.prefs.avatarImg);
    $('#tb-level').textContent = 'Nivel ' + store.level();
    $('#tb-xp').style.width = Math.round(store.levelProgress() * 100) + '%';
    $('#tb-coins').textContent = U.fmt(p.coins);
    const tier = $('#tb-tier');
    const t = store.tier();
    tier.textContent = t !== 'free' ? C.TIERS[t].short : p.guest ? 'Invitado' : 'Gratis';
    tier.dataset.tier = t !== 'free' ? t : p.guest ? 'guest' : 'free';
    PVP.Sound.enabled = p.prefs.sound !== false;
    syncMusicFab();
    // Barra integrada en la escena del menú.
    $('#mv-name').textContent = p.name;
    $('#mv-level').textContent = 'Nivel ' + store.level();
    $('#mv-xp').style.width = Math.round(store.levelProgress() * 100) + '%';
    $('#mv-coins').textContent = U.fmt(p.coins);
    $('#mv-tier').textContent = t !== 'free' ? C.TIERS[t].short : p.guest ? 'Invitado' : 'Gratis';
    const avKey = JSON.stringify(p.prefs.look) + (p.prefs.avatarImg ? p.prefs.avatarImg.length : 0);
    if ($('#mv-avatar').dataset.k !== avKey) {
      $('#mv-avatar').dataset.k = avKey;
      $('#mv-avatar').innerHTML = PVP.Avatars.avatarHTML(p.prefs.look, p.prefs.avatarImg);
    }
  }
  store.on('change', renderTopbar);
  store.on('levelUp', (lvl) => ui.toast(`⭐ ¡Subes a nivel ${lvl}!`));

  /* ---------- bienvenida / cuentas ---------- */

  function authTab(name) {
    $$('.auth-tabs button').forEach((b) => b.classList.toggle('active', b.dataset.auth === name));
    $$('.auth-pane').forEach((p) => p.classList.toggle('active', p.dataset.pane === name));
  }
  $$('.auth-tabs button').forEach((b) => b.addEventListener('click', () => authTab(b.dataset.auth)));
  $('#btn-register-cta').addEventListener('click', () => authTab('register'));
  $('#btn-guest').addEventListener('click', () => {
    store.playAsGuest();
    renderTopbar();
    go('menu');
    ui.toast(`Bienvenido, <b>${U.esc(store.profile.name)}</b>. Tienes ${U.fmt(store.profile.coins)} monedas.`);
  });

  function bindForm(id, handler) {
    const f = $(id);
    f.addEventListener('submit', async (e) => {
      e.preventDefault();
      const err = $('[data-error]', f);
      err.textContent = '';
      const data = Object.fromEntries(new FormData(f).entries());
      try {
        await handler(data);
        f.reset();
      } catch (ex) {
        err.textContent = ex.message;
      }
    });
  }

  bindForm('#form-register', async (d) => {
    const res = await store.register(d.user, d.email, d.pass);
    if (res.confirm) {
      authTab('login');
      ui.confirm({
        title: 'Confirma tu correo', hideNo: true, yes: 'Entendido',
        text: `Te hemos enviado un enlace a <b>${U.esc(d.email)}</b>. Ábrelo y después inicia sesión: recibirás <b>50.000 monedas</b> de bienvenida.`,
      });
      return;
    }
    renderTopbar();
    go('menu');
    ui.toast(`🎁 ¡Cuenta creada! +${U.fmt(res.bonus)} monedas de bienvenida.`, 4000);
  });

  bindForm('#form-login', async (d) => {
    await store.login(d.email, d.pass);
    renderTopbar();
    go('menu');
    ui.toast(`Hola de nuevo, <b>${U.esc(store.profile.name)}</b>.`);
  });

  /* ---------- ajustes ---------- */

  function syncSettings() {
    if (!store.profile) return;
    const p = store.profile.prefs;
    $$('#modal-settings [data-pref]').forEach((i) => { i.checked = !!p[i.dataset.pref]; });
    $$('#modal-settings [data-pref-seg]').forEach((seg) => {
      $$('button', seg).forEach((b) => b.classList.toggle('on', b.dataset.v === String(p[seg.dataset.prefSeg])));
    });
  }

  $$('#modal-settings [data-pref]').forEach((i) => i.addEventListener('change', () => {
    store.setPref(i.dataset.pref, i.checked);
    if (i.dataset.pref === 'autoPeek' && game) game.setPeek(i.checked);
    if (i.dataset.pref === 'music') setMusic(i.checked);
  }));
  $$('#modal-settings [data-pref-seg]').forEach((seg) => seg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const key = seg.dataset.prefSeg;
    const v = key === 'speed' ? +b.dataset.v : b.dataset.v;
    store.setPref(key, v);
    if (key === 'musicStyle') setMusic(true, v);
    if (game && key === 'orientation') game.setOrientation(v);
    syncSettings();
  }));
  $('#btn-logout').addEventListener('click', async () => {
    if (game) exitGame();
    await store.logout();
    document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open'));
    go('welcome');
  });

  /* ---------- partidas públicas ---------- */

  let pubStake = C.STAKES[0].id;

  function renderPublic() {
    $('#stake-grid').innerHTML = C.STAKES.map((s) => {
      const can = store.profile.coins >= s.buyIn;
      return `<button class="stake-card${s.id === pubStake ? ' on' : ''}${can ? '' : ' locked'}" data-stake="${s.id}">
        <span class="sc-name">${s.name}</span>
        <span class="sc-blinds">${U.short(s.sb)} / ${U.short(s.bb)}</span>
        <span class="sc-buy">Entrada <b>${U.fmt(s.buyIn)}</b></span>
      </button>`;
    }).join('');
  }
  $('#stake-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-stake]');
    if (!b) return;
    pubStake = b.dataset.stake;
    renderPublic();
  });
  segGroup('#pub-level');
  segGroup('#pub-size');

  function segGroup(sel) {
    $(sel).addEventListener('click', (e) => {
      const b = e.target.closest('button[data-v]');
      if (!b) return;
      $$('button', $(sel)).forEach((x) => x.classList.toggle('on', x === b));
    });
  }
  const segVal = (sel) => { const b = $(sel + ' button.on'); return b ? b.dataset.v : null; };

  $('#btn-find').addEventListener('click', () => {
    const stake = C.STAKES.find((s) => s.id === pubStake);
    if (store.profile.coins < stake.buyIn) {
      ui.toast(`Necesitas ${U.fmt(stake.buyIn)} monedas para esta mesa.`);
      return;
    }
    const size = +segVal('#pub-size');
    matchmaking(size, segVal('#pub-level'), () => {
      if (!store.spend(stake.buyIn, 'buy_in')) return ui.toast('Monedas insuficientes.');
      startGame({
        mode: 'public', title: `Mesa ${stake.name} · ${U.short(stake.sb)}/${U.short(stake.bb)}`,
        seats: size, players: size, sb: stake.sb, bb: stake.bb, stack: stake.buyIn, buyIn: stake.buyIn,
        botLevel: segVal('#pub-level'), turnSeconds: 30,
      });
    });
  });

  /** Sala de espera de 1 minuto: los asientos se van llenando con jugadores (bots humanizados). */
  function matchmaking(size, level, onStart) {
    const WAIT = 60;
    const list = $('#mm-list');
    const prog = $('.mm-prog');
    const circ = 2 * Math.PI * 54;
    prog.style.strokeDasharray = circ;
    const names = [store.profile.name];
    list.innerHTML = `<li class="me">${PVP.Avatars.avatarHTML(store.profile.prefs.look, store.profile.prefs.avatarImg, 'mm-av')}${U.esc(store.profile.name)} <em>Tú</em></li>`;
    for (let i = 1; i < size; i++) list.innerHTML += '<li class="wait">Esperando jugador…</li>';
    $('#mm-info').textContent = `Margen de espera: 1 minuto. Si no hay suficientes jugadores conectados, completamos la mesa con rivales virtuales.`;
    ui.open('modal-match');

    const t0 = Date.now();
    let joined = 1;
    let nextJoin = U.rand(1.5, 6);
    const timer = setInterval(() => {
      const el = (Date.now() - t0) / 1000;
      const left = Math.max(0, WAIT - el);
      $('#mm-time').textContent = Math.ceil(left);
      prog.style.strokeDashoffset = circ * (1 - left / WAIT);
      if (el > nextJoin && joined < size) {
        const persona = PVP.Bots.createPersona(level === 'mixed' ? 'medium' : level, names);
        names.push(persona.name);
        const li = list.children[joined];
        li.className = 'joined';
        li.innerHTML = `${PVP.Avatars.avatarHTML(persona.look, null, 'mm-av')}${U.esc(persona.name)}`;
        joined++;
        nextJoin = el + U.rand(2, 9);
        if (PVP.Sound) PVP.Sound.click();
      }
      if (left <= 0 || joined >= size) done(true);
    }, 250);

    function done(start) {
      clearInterval(timer);
      ui.close('modal-match');
      $('#mm-start').onclick = $('#mm-cancel').onclick = null;
      if (start) onStart();
    }
    $('#mm-start').onclick = () => done(true);
    $('#mm-cancel').onclick = () => done(false);
  }

  /* ---------- salas privadas ---------- */

  let code = PVP.Net.roomCode();

  function renderPrivate() {
    $('#room-code').textContent = code;
    syncPrivShare();
    updatePrivate();
  }
  function syncPrivShare() {
    const name = $('#form-private').name.value || 'Sala privada';
    $('#priv-wa').href = PVP.Net.whatsappUrl(PVP.Net.shareText(code, name));
  }
  $('#form-private').name.addEventListener('input', syncPrivShare);

  function updatePrivate() {
    const f = $('#form-private');
    const seats = +f.seats.value;
    const sb = +f.blinds.value, bb = sb * 2;
    const out = (k, v) => { const o = $(`[data-out="${k}"]`, f); if (o) o.textContent = v; };
    out('seats', seats);
    out('bbs', f.bbs.value + ' BB');
    out('minutes', f.minutes.value + ' min');
    out('rebuys', f.rebuys.value === '0' ? 'No' : f.rebuys.value);
    $('[data-bounty]', f).style.display = f.bountyOn.checked ? '' : 'none';
    const stack = bb * +f.bbs.value;
    $('#priv-summary').innerHTML = `
      <div class="ps-row"><span>Stack inicial</span><b>${U.fmt(stack)} fichas</b></div>
      <div class="ps-row"><span>Ciegas</span><b>${U.fmt(sb)} / ${U.fmt(bb)} · suben cada ${f.minutes.value} min</b></div>
      <div class="ps-row"><span>Recompras</span><b>${f.rebuys.value === '0' ? 'Sin recompras' : f.rebuys.value + ' por jugador'}</b></div>
      <div class="ps-row"><span>Bounty</span><b>${f.bountyOn.checked ? U.fmt(+f.bounty.value) + ' monedas por eliminación' : 'Desactivado'}</b></div>`;
  }
  $('#form-private').addEventListener('input', updatePrivate);
  $('#form-private').addEventListener('click', (e) => {
    const b = e.target.closest('.seg button[data-v]');
    if (!b) return;
    $$('button', b.parentElement).forEach((x) => x.classList.toggle('on', x === b));
  });
  $('#btn-copy-code').addEventListener('click', async () => {
    const text = PVP.Net.inviteLink(code) || PVP.Net.shareText(code, $('#form-private').name.value);
    try { await navigator.clipboard.writeText(text); ui.toast('Invitación copiada: pégala en tu grupo'); } catch (e) { ui.toast(U.esc(text), 6000); }
  });
  $('#form-private').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const btn = $('.priv-submit', f);
    const sb = +f.blinds.value;
    const cfg = {
      mode: 'private', code, title: `${(f.name.value || 'Sala privada').trim()} · #${code}`,
      seats: +f.seats.value, players: +f.seats.value, sb, bb: sb * 2, stack: sb * 2 * +f.bbs.value,
      blindMinutes: +f.minutes.value, rebuys: +f.rebuys.value,
      bounty: f.bountyOn.checked ? +f.bounty.value : 0, turnSeconds: +f.turn.value,
    };
    // Sala solo para amigos (sin bots): necesita conexión para que entren los demás.
    btn.disabled = true;
    try {
      const room = await new PVP.Net.Room(code, 'host').connect();
      cfg.net = { role: 'host', room };
    } catch (err) {
      ui.toast('⚠️ No se pudo abrir la sala online. Comprueba tu conexión e inténtalo de nuevo.', 5000);
      return;
    } finally {
      btn.disabled = false;
    }
    startGame(cfg);
    code = PVP.Net.roomCode();
  });

  /* Unirse a una sala: con el código o abriendo el enlace de invitación (#sala=CÓDIGO). */
  let joining = null;
  $('#form-join').addEventListener('submit', (e) => {
    e.preventDefault();
    joinRoom(e.target.code.value);
  });
  $('#jn-cancel').addEventListener('click', () => cancelJoin());

  function cancelJoin(msg) {
    if (!joining) return;
    const j = joining;
    joining = null;
    clearInterval(j.timer);
    j.off();
    j.room.close();
    ui.close('modal-join');
    if (msg) ui.toast(msg, 5000);
  }

  async function joinRoom(raw) {
    const roomId = PVP.Net.normalizeCode(raw);
    if (roomId.length !== 6) return ui.toast('El código de sala tiene 6 caracteres.');
    if (!store.profile) { store.playAsGuest(); renderTopbar(); go('menu'); }
    if (joining) cancelJoin();
    if (game) exitGame();
    $('#jn-title').textContent = 'Entrando en la sala #' + roomId;
    $('#jn-text').textContent = 'Conectando…';
    ui.open('modal-join');
    const room = new PVP.Net.Room(roomId, 'client');
    const j = (joining = { room, timer: 0, off: () => {} });
    try { await room.connect(); } catch (err) { if (joining === j) cancelJoin('⚠️ ' + U.esc(err.message)); return; }
    if (joining !== j) return room.close();
    $('#jn-text').textContent = room.online ? 'Buscando al anfitrión…' : 'Buscando al anfitrión (modo local)…';
    const p = store.profile;
    const hello = () => room.send('hello', { name: p.name, look: p.prefs.look, img: p.prefs.avatarImg || null, pub: room.pub, v: 1 });
    const started = Date.now();
    j.off = room.on('welcome', (w, from) => {
      if (joining !== j) return;
      joining = null;
      clearInterval(j.timer);
      j.off();
      ui.close('modal-join');
      w.hostCid = from;
      const c = w.cfg || {};
      startGame({
        mode: 'private', code: roomId, title: c.title || 'Sala #' + roomId, seats: c.seats, players: c.players, sb: c.sb, bb: c.bb, stack: c.stack,
        blindMinutes: c.blindMinutes, rebuys: c.rebuys, bounty: c.bounty, turnSeconds: c.turnSeconds,
        net: { role: 'client', room, welcome: w },
      });
    });
    hello();
    // El anfitrión puede tardar en abrir la sala: se reintenta durante un minuto.
    j.timer = setInterval(() => {
      if (Date.now() - started > 60000) return cancelJoin('No se encontró la sala #' + roomId + '. Comprueba el código o pide a tu amigo que la abra.');
      $('#jn-text').textContent = 'Esperando a que el anfitrión abra la sala… (' + Math.round((Date.now() - started) / 1000) + ' s)';
      hello();
    }, 2500);
  }

  function handleRoomHash() {
    const m = location.hash.match(/#sala=([A-Za-z0-9]+)/);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    joinRoom(m[1]);
  }
  root.addEventListener('hashchange', handleRoomHash);
  root.addEventListener('popstate', () => {
    const open = document.querySelector('.modal.open:not(#modal-confirm):not(#modal-join)');
    if (current === 'game' && game) {
      try { history.pushState({ s: 'game' }, ''); } catch (e) { /* sin historial */ }
      if (open) open.classList.remove('open'); else $('#btn-leave').click();
      return;
    }
    if (open) open.classList.remove('open');
    if (current !== 'menu' && current !== 'welcome') go('menu', { pop: true });
  });
  root.addEventListener('pagehide', () => { if (game && game.net) game.leave(); });
  function segValIn(form, name) {
    const b = $(`[data-name="${name}"] button.on`, form);
    return b ? b.dataset.v : 'medium';
  }

  /* ---------- torneos ---------- */

  function renderTournaments() {
    $('#tour-grid').innerHTML = C.TOURNAMENTS.map((t) => {
      const can = store.profile.coins >= t.fee;
      return `<article class="tour-card" style="--t1:${t.color[0]};--t2:${t.color[1]}">
        <div class="tc-gem"><span>${t.name[0]}</span></div>
        <h3>${t.name}</h3>
        <p class="tc-prize">${U.short(t.prize)}<small> monedas garantizadas</small></p>
        <ul>
          <li><span>Entrada</span><b>${U.fmt(t.fee)}</b></li>
          <li><span>Jugadores</span><b>${t.players}</b></li>
          <li><span>Stack</span><b>${U.short(t.stack)}</b></li>
          <li><span>Ciegas</span><b>${U.short(t.sb)}/${U.short(t.sb * 2)} · +cada ${t.handsPerLevel} manos</b></li>
          <li><span>Premios</span><b>3 primeros puestos</b></li>
        </ul>
        <button class="lux-btn w-full${can ? '' : ' disabled'}" data-tour="${t.id}"><span>${can ? 'Inscribirse' : 'Monedas insuficientes'}</span></button>
      </article>`;
    }).join('');
  }
  $('#tour-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tour]');
    if (!b) return;
    const t = C.TOURNAMENTS.find((x) => x.id === b.dataset.tour);
    if (!store.spend(t.fee, 'tournament_fee')) return ui.toast(`Necesitas ${U.fmt(t.fee)} monedas.`);
    startGame({
      mode: 'tournament', title: `Torneo ${t.name}`, tournament: t,
      seats: t.players, players: t.players, sb: t.sb, bb: t.sb * 2, stack: t.stack,
      botLevel: t.bot, handsPerLevel: t.handsPerLevel, turnSeconds: 25,
    });
  });

  /* ---------- tienda: packs PayPal, códigos y catálogo ---------- */

  let shopTab = 'packs';
  $('#shop-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    setShopTab(b.dataset.v);
  });

  function setShopTab(tab) {
    shopTab = tab;
    $$('#shop-tabs button').forEach((x) => x.classList.toggle('on', x.dataset.v === tab));
    renderShop();
  }

  const money = (n) => n.toFixed(2).replace('.', ',') + ' €';

  function tierLabel(tier) {
    return tier === 'free' ? '<span class="tier t-free">Gratis</span>'
      : `<span class="tier t-${tier}">${C.TIERS[tier].short}</span>`;
  }

  function planStatus() {
    const p = store.profile;
    const t = store.tier();
    const tierTxt = t === 'free' ? 'Plan gratuito' : `${C.TIERS[t].name} · <strong>desbloqueado para siempre</strong>`;
    if (!store.online) return p.guest ? `${tierTxt} · Invitado: <strong>crea una cuenta</strong> para comprar y guardar tu progreso` : tierTxt;
    return tierTxt;
  }

  const STATUS_ES = { pending: 'Pendiente de confirmar', paid: 'Pagado · activado', rejected: 'Rechazado', cancelled: 'Cancelado' };

  async function renderPurchases() {
    const box = $('#purchases');
    if (!box) return;
    if (!store.online) { box.innerHTML = ''; return; }
    let rows = [];
    try { rows = await store.myPurchases(); } catch (e) { box.innerHTML = `<p class="coach-note">${U.esc(e.message)}</p>`; return; }
    const pending = rows.filter((r) => r.status === 'pending');
    box.innerHTML = (pending.length ? pending.map((r) => `
        <div class="pending-card glass-card">
          <div><small>Pago pendiente · ${U.esc(PVP.Config.PACKS[r.pack].name)} · ${money(Number(r.amount))}</small>
            <b>Referencia: <code>${U.esc(r.reference)}</code></b>
            <p>Escribe esta referencia en la nota de PayPal. En cuanto confirmemos el pago se activará aquí automáticamente.</p></div>
          <div class="pc-actions">
            <a class="lux-btn sm" href="${PVP.Config.paypalLink(r.pack)}" target="_blank" rel="noopener noreferrer"><span>Abrir PayPal</span></a>
            <button class="ghost-btn sm" data-copy-ref="${U.esc(r.reference)}">Copiar referencia</button>
            <button class="ghost-btn sm" data-cancel="${r.id}">Cancelar</button>
          </div>
        </div>`).join('') : '') +
      (rows.length ? `<details class="glass-card my-purchases"><summary>Tus compras (${rows.length})</summary>
        <table class="sess-table"><thead><tr><th>Fecha</th><th>Pack</th><th>Importe</th><th>Referencia</th><th>Estado</th></tr></thead><tbody>
        ${rows.map((r) => `<tr><td>${new Date(r.created_at).toLocaleDateString('es-ES')}</td><td>${U.esc(PVP.Config.PACKS[r.pack].name)}</td><td>${money(Number(r.amount))}</td>
          <td><code>${U.esc(r.reference)}</code></td><td><span class="st st-${r.status}">${STATUS_ES[r.status]}</span></td></tr>`).join('')}
        </tbody></table></details>` : '');
  }

  function renderShop() {
    const p = store.profile;
    $('#shop-id').textContent = p.id;
    $('#shop-plan').innerHTML = planStatus();
    const body = $('#shop-body');
    if (shopTab === 'packs') {
      const cur = store.tier();
      const cards = ['elite', 'legend'].map((id) => {
        const pk = PVP.Config.PACKS[id];
        const owned = C.TIERS[cur].rank >= C.TIERS[id].rank;
        return `<article class="plan-card p-${id}${cur === id ? ' current' : ''}">
          ${id === 'legend' ? '<span class="plan-ribbon">Acceso total</span>' : ''}
          <h3>${pk.name}</h3>
          <p class="plan-price">${money(pk.price)}<small> · pago único</small></p>
          <ul>${pk.perks.map((i) => `<li>${U.esc(i)}</li>`).join('')}</ul>
          ${owned ? '<span class="plan-own">✓ Desbloqueado para siempre</span>'
            : `<button class="lux-btn w-full paypal-btn" data-buy="${id}"><span>Comprar con PayPal · ${money(pk.price)}</span></button>`}
        </article>`;
      }).join('');
      body.innerHTML = `
        <div id="purchases"></div>
        <div class="plan-grid two">${cards}</div>
        <ol class="pay-steps glass-card">
          <li><b>Pulsa «Comprar con PayPal».</b> Te damos una referencia de compra y se abre PayPal con el importe.</li>
          <li><b>Escribe la referencia</b> (por ejemplo <code>PV-7K3Q9M</code>) en la nota del pago.</li>
          <li><b>Listo:</b> cuando el pago se confirma, las monedas y los desbloqueos aparecen solos en tu cuenta, sin códigos.</li>
        </ol>
        <p class="text-[11px] text-white/40 mt-3">Pago único y permanente, sin suscripciones. Las monedas son virtuales y no se pueden canjear por dinero. <a href="#" data-legal="terms" class="underline">Condiciones de compra</a>.</p>`;
      renderPurchases();
      return;
    }
    const items = shopTab === 'tables' ? C.TABLES : C.DECKS;
    const prefKey = shopTab === 'tables' ? 'table' : 'deck';
    body.innerHTML = `<div class="shop-grid">${items.map((it) => {
      const owned = store.owns(it.tier);
      const equipped = p.prefs[prefKey] === it.id;
      const preview = shopTab === 'tables'
        ? PVP.Art.tableSwatch(it)
        : `<div class="deck-preview">${PVP.Art.cardHTML(-1, it.id, false)}${PVP.Art.cardHTML(48 + (it.id.length % 4), it.id, true)}</div>`;
      const sub = shopTab === 'tables' ? it.desc : `${it.rarity}${it.fx ? ' · ' + it.fx : ''}`;
      return `<article class="shop-item${owned ? '' : ' locked'}${equipped ? ' equipped' : ''}">
        <div class="si-preview">${preview}${tierLabel(it.tier)}</div>
        <h4>${U.esc(it.name)}</h4><p>${U.esc(sub)}</p>
        ${equipped ? '<span class="si-state">✓ En uso</span>'
          : owned ? `<button class="ghost-btn sm w-full" data-equip="${prefKey}:${it.id}">Usar</button>`
          : `<button class="lux-btn sm w-full" data-tab="packs"><span>🔒 ${PVP.Config.PACKS[it.tier].name} · ${money(PVP.Config.PACKS[it.tier].price)}</span></button>`}
      </article>`;
    }).join('')}</div>`;
  }

  async function buy(pack, btn) {
    if (!store.online) {
      return ui.confirm({
        title: 'Crea tu cuenta para comprar',
        text: 'Las compras se guardan en tu cuenta para que no las pierdas nunca. Regístrate gratis y recibe 50.000 monedas de bienvenida.',
        yes: 'Registrarme', no: 'Ahora no',
        onYes: () => { go('welcome'); authTab('register'); },
      });
    }
    // Abrimos la pestaña en el mismo clic para que el navegador no la bloquee.
    const win = root.open('about:blank', '_blank');
    btn.disabled = true;
    try {
      const purchase = await store.createPurchase(pack);
      PVP.Payments.current().checkout(purchase, win);
      copyText(purchase.reference);
      ui.toast(`Referencia <b>${U.esc(purchase.reference)}</b> copiada: pégala en la nota del pago de PayPal.`, 6000);
      renderPurchases();
    } catch (e) {
      if (win) win.close();
      ui.toast('⚠️ ' + U.esc(e.message), 4500);
    } finally {
      btn.disabled = false;
    }
  }

  $('#shop-body').addEventListener('click', async (e) => {
    const eq = e.target.closest('[data-equip]');
    if (eq) {
      const [k, id] = eq.dataset.equip.split(':');
      store.setPref(k, id);
      renderShop();
      return;
    }
    const tab = e.target.closest('[data-tab]');
    if (tab) { setShopTab(tab.dataset.tab); return; }
    const b = e.target.closest('[data-buy]');
    if (b) return buy(b.dataset.buy, b);
    const cr = e.target.closest('[data-copy-ref]');
    if (cr) { copyText(cr.dataset.copyRef).then(() => ui.toast('Referencia copiada')); return; }
    const cancel = e.target.closest('[data-cancel]');
    if (cancel) {
      try { await store.cancelPurchase(cancel.dataset.cancel); renderPurchases(); } catch (err) { ui.toast('⚠️ ' + U.esc(err.message)); }
    }
  });

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); } catch (e) { /* sin portapapeles: el ID sigue visible */ }
  }
  $('#btn-copy-id').addEventListener('click', () => copyText(store.profile.id).then(() => ui.toast('ID copiado')));

  /* Barra de códigos promocionales / activación / creador: basta con escribir el código (también como invitado). */
  async function redeemCode(raw, btn, msgEl) {
    if (btn) btn.disabled = true;
    if (msgEl) { msgEl.className = msgEl.className.replace(/ (ok|err)/g, ''); msgEl.textContent = 'Comprobando…'; }
    try {
      const msg = await store.redeem(raw);
      if (msgEl) { msgEl.textContent = '🎉 ' + msg; msgEl.classList.add('ok'); } else ui.toast(`🎉 ${msg}`, 4500);
      if (PVP.Sound) PVP.Sound.win();
      renderTopbar();
      if (current === 'shop') renderShop();
      return true;
    } catch (err) {
      if (msgEl) { msgEl.textContent = '⚠️ ' + err.message; msgEl.classList.add('err'); } else ui.toast(`⚠️ ${U.esc(err.message)}`, 4000);
      return false;
    } finally {
      if (btn) btn.disabled = false;
    }
  }
  $('#form-redeem').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = $('#redeem-input');
    if (await redeemCode(input.value, $('#form-redeem button'))) input.value = '';
  });

  /* ---------- estadísticas + Coach ---------- */

  function renderStats() {
    const p = store.profile;
    const s = p.stats;
    const rate = s.hands ? Math.round((s.won / s.hands) * 100) : 0;
    const tiles = [
      ['Manos jugadas', U.fmt(s.hands)], ['Manos ganadas', U.fmt(s.won)], ['% de victorias', rate + '%'],
      ['Bote más grande', U.fmt(s.biggestPot)], ['Mejor mano', s.bestHandName || '—'], ['Eliminaciones (bounty)', U.fmt(s.knockouts)],
      ['Torneos jugados', U.fmt(s.tournaments)], ['Torneos ganados', U.fmt(s.tournamentWins)], ['En premios (ITM)', U.fmt(s.itm)],
    ];
    const t = store.tier();
    $('#stats-body').innerHTML = `
      <div class="stats-head glass-card">
        <span class="pp-avatar big">${PVP.Avatars.avatarHTML(p.prefs.look, p.prefs.avatarImg)}</span>
        <div><h3>${U.esc(p.name)}</h3><p>Nivel ${store.level()} · ${p.guest ? 'Invitado' : C.TIERS[t].name} · ID <b class="text-white/80">${U.esc(p.id)}</b></p>
        <div class="pp-bar wide"><i style="width:${Math.round(store.levelProgress() * 100)}%"></i></div></div>
        <div class="sh-coins"><small>Monedas</small><b>${U.fmt(p.coins)}</b></div>
      </div>
      <div class="stat-grid">${tiles.map(([k, v]) => `<div class="stat-tile"><small>${k}</small><b>${v}</b></div>`).join('')}</div>
      ${p.guest ? '<button class="lux-btn mt-6" id="btn-upgrade"><span>Registrarme y recibir 50.000 monedas</span></button>' : ''}
      <section class="coach" id="coach"></section>`;
    const up = $('#btn-upgrade');
    if (up) up.addEventListener('click', () => { go('welcome'); authTab('register'); });
    PVP.CoachUI.render($('#coach'), store, { onUnlock: () => { go('shop'); setShopTab('packs'); } });
  }


  /* ---------- partida ---------- */

  function startGame(cfg) {
    if (game) exitGame();
    store.sanitizePrefs();
    go('game');
    $('#game-host').innerHTML = '';
    game = new PVP.GameController(cfg, { store, host: $('#game-host'), hud });
    game.on('exit', exitGame);
    game.start();
  }

  function exitGame() {
    if (!game) return;
    const fsEl = document.fullscreenElement || document.webkitFullscreenElement;
    if (fsEl) { const r = (document.exitFullscreen || document.webkitExitFullscreen).call(document); if (r && r.catch) r.catch(() => {}); }
    const g = game;
    game = null;
    g.destroy();
    ui.close('modal-confirm');
    go('menu');
  }

  $('#btn-leave').addEventListener('click', () => {
    if (!game) return;
    if (game.over) return exitGame();
    const mode = game.cfg.mode;
    ui.confirm({
      title: '¿Salir de la mesa?',
      text: mode === 'public' ? 'Tus fichas vuelven a tu saldo de monedas (lo apostado en la mano en curso se pierde).'
        : mode === 'tournament' ? 'Abandonarás el torneo y perderás la entrada.'
          : game.isClient ? 'Saldrás de la sala de tu amigo.' : game.net ? 'La sala se cerrará para todos los jugadores.' : 'La sala privada se cerrará.',
      yes: 'Salir', no: 'Seguir jugando',
      onYes: () => game && game.leave(),
    });
  });

  root.addEventListener('resize', () => {
    if (game && store.profile.prefs.orientation === 'auto') game.setOrientation('auto');
  });

  /* ---------- arranque ---------- */

  store.on('error', (msg) => ui.toast('⚠️ ' + U.esc(msg), 4500));
  store.on('tierUp', (tier) => {
    ui.toast(`✨ ¡${C.TIERS[tier].name} activado! Tus desbloqueos ya están disponibles.`, 6000);
    if (PVP.Sound) PVP.Sound.win();
  });
  store.on('purchase', (row) => {
    if (row && row.status === 'rejected') ui.toast('Tu pago no se ha podido verificar. Escríbenos si crees que es un error.', 6000);
    if (current === 'shop') renderPurchases();
  });

  PVP.Backend.init();
  $('#app').classList.add('booting');
  PVP.Backend.probe().then(() => store.restore()).then((ok) => {
    $('#app').classList.remove('booting');
    document.body.classList.toggle('offline-mode', !PVP.Backend.available);
    if (ok) { renderTopbar(); go('menu'); } else go('welcome');
    handleRedeemHash();
    handleRoomHash();
  });
  // Enlace directo de canje: index.html#canjear=CÓDIGO → se canjea solo (si no hay perfil, se entra como invitado).
  function handleRedeemHash() {
    const m = location.hash.match(/#canjear=([^&]+)/);
    if (!m) return;
    history.replaceState(null, '', location.pathname + location.search);
    if (!store.profile) { store.playAsGuest(); renderTopbar(); go('menu'); }
    redeemCode(decodeURIComponent(m[1]));
  }
  root.addEventListener('hashchange', handleRedeemHash);
  store.on('change', () => { if (current === 'shop') { $('#shop-plan').innerHTML = planStatus(); } });

  PVP.app = { store, go, startGame, get game() { return game; } };
})(window);
