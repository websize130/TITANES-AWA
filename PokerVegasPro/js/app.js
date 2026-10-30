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

  function go(name) {
    if (!store.profile && name !== 'welcome') name = 'welcome';
    $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + name));
    $('#topbar').classList.toggle('hidden', name === 'welcome' || name === 'game');
    document.body.dataset.screen = name;
    current = name;
    if (RENDER[name]) RENDER[name]();
    root.scrollTo(0, 0);
  }

  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { go(g.dataset.go); if (PVP.Sound) PVP.Sound.click(); }
    const m = e.target.closest('[data-modal]');
    if (m) { syncSettings(); ui.open('modal-' + m.dataset.modal); }
    if (e.target.closest('[data-close]') || e.target.classList.contains('modal')) {
      const modal = e.target.closest('.modal');
      if (modal && modal.id !== 'modal-confirm' && modal.id !== 'modal-match') modal.classList.remove('open');
    }
  });

  /* ---------- barra superior ---------- */

  function renderTopbar() {
    const p = store.profile;
    if (!p) return;
    $('#tb-name').textContent = p.name;
    $('#tb-avatar').textContent = U.initials(p.name);
    $('#tb-level').textContent = 'Nivel ' + store.level();
    $('#tb-xp').style.width = Math.round(store.levelProgress() * 100) + '%';
    $('#tb-coins').textContent = U.fmt(p.coins);
    const tier = $('#tb-tier');
    tier.textContent = p.guest ? 'Invitado' : C.TIERS[p.tier].name.split(' ·')[0];
    tier.dataset.tier = p.guest ? 'guest' : p.tier;
    PVP.Sound.enabled = p.prefs.sound !== false;
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
    const bonus = await store.register(d.user, d.email, d.pass);
    renderTopbar();
    go('menu');
    ui.toast(`🎁 ¡Cuenta creada! +${U.fmt(bonus)} monedas de bienvenida.`, 4000);
  });

  bindForm('#form-login', async (d) => {
    await store.login(d.user, d.pass);
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
  }));
  $$('#modal-settings [data-pref-seg]').forEach((seg) => seg.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    const key = seg.dataset.prefSeg;
    const v = key === 'speed' ? +b.dataset.v : b.dataset.v;
    store.setPref(key, v);
    if (game && key === 'view') game.setViewMode(v);
    if (game && key === 'orientation') game.setOrientation(v);
    syncSettings();
  }));
  $('#btn-logout').addEventListener('click', () => {
    if (game) exitGame();
    store.logout();
    ui.close('modal-settings');
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
      if (!store.spend(stake.buyIn)) return ui.toast('Monedas insuficientes.');
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
    list.innerHTML = `<li class="me">${U.esc(store.profile.name)} <em>Tú</em></li>`;
    for (let i = 1; i < size; i++) list.innerHTML += '<li class="wait">Esperando jugador…</li>';
    $('#mm-info').textContent = `Margen de espera: 1 minuto. Si la mesa no se llena, la completamos con bots.`;
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
        li.innerHTML = `${U.esc(persona.name)} <em>IA</em>`;
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

  const roomCode = () => Array.from({ length: 6 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[U.randInt(0, 31)]).join('');
  let code = roomCode();

  function renderPrivate() {
    $('#room-code').textContent = code;
    updatePrivate();
  }

  function updatePrivate() {
    const f = $('#form-private');
    const seats = +f.seats.value;
    f.players.max = seats;
    if (+f.players.value > seats) f.players.value = seats;
    const sb = +f.blinds.value, bb = sb * 2;
    const out = (k, v) => { const o = $(`[data-out="${k}"]`, f); if (o) o.textContent = v; };
    out('seats', seats);
    out('players', f.players.value);
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
    const link = location.href.split('#')[0] + '#sala=' + code;
    try { await navigator.clipboard.writeText(link); ui.toast('Enlace de invitación copiado'); } catch (e) { ui.toast(link); }
  });
  $('#form-private').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const sb = +f.blinds.value;
    startGame({
      mode: 'private', title: `${f.name.value || 'Sala privada'} · #${code}`,
      seats: +f.seats.value, players: +f.players.value, sb, bb: sb * 2, stack: sb * 2 * +f.bbs.value,
      botLevel: segValIn(f, 'botLevel'), blindMinutes: +f.minutes.value, rebuys: +f.rebuys.value,
      bounty: f.bountyOn.checked ? +f.bounty.value : 0, turnSeconds: +f.turn.value,
    });
    code = roomCode();
  });
  function segValIn(form, name) {
    const b = $(`[data-name="${name}"] button.on`, form);
    return b ? b.dataset.v : 'medium';
  }

  /* ---------- torneos ---------- */

  function renderTournaments() {
    $('#tour-grid').innerHTML = C.TOURNAMENTS.map((t) => {
      const can = store.profile.coins >= t.fee;
      const lvl = t.bot === 'mixed' ? 'Mixto' : PVP.Bots.LEVELS[t.bot].label;
      return `<article class="tour-card" style="--t1:${t.color[0]};--t2:${t.color[1]}">
        <div class="tc-gem"><span>${t.name[0]}</span></div>
        <h3>${t.name}</h3>
        <p class="tc-prize">${U.short(t.prize)}<small> monedas garantizadas</small></p>
        <ul>
          <li><span>Entrada</span><b>${U.fmt(t.fee)}</b></li>
          <li><span>Jugadores</span><b>${t.players}</b></li>
          <li><span>Stack</span><b>${U.short(t.stack)}</b></li>
          <li><span>Ciegas</span><b>${U.short(t.sb)}/${U.short(t.sb * 2)} · +cada ${t.handsPerLevel} manos</b></li>
          <li><span>Rivales</span><b>IA ${lvl}</b></li>
        </ul>
        <button class="lux-btn w-full${can ? '' : ' disabled'}" data-tour="${t.id}"><span>${can ? 'Inscribirse' : 'Monedas insuficientes'}</span></button>
      </article>`;
    }).join('');
  }
  $('#tour-grid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tour]');
    if (!b) return;
    const t = C.TOURNAMENTS.find((x) => x.id === b.dataset.tour);
    if (!store.spend(t.fee)) return ui.toast(`Necesitas ${U.fmt(t.fee)} monedas.`);
    startGame({
      mode: 'tournament', title: `Torneo ${t.name}`, tournament: t,
      seats: t.players, players: t.players, sb: t.sb, bb: t.sb * 2, stack: t.stack,
      botLevel: t.bot, handsPerLevel: t.handsPerLevel, turnSeconds: 25,
    });
  });

  /* ---------- tienda ---------- */

  let shopTab = 'tables';
  $('#shop-tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button[data-v]');
    if (!b) return;
    shopTab = b.dataset.v;
    $$('#shop-tabs button').forEach((x) => x.classList.toggle('on', x === b));
    renderShop();
  });

  function tierLabel(tier) {
    return tier === 'free' ? '<span class="tier t-free">Gratis</span>'
      : tier === 'premium' ? '<span class="tier t-premium">4,99 €</span>' : '<span class="tier t-elite">9,99 €</span>';
  }

  function renderShop() {
    const p = store.profile;
    const body = $('#shop-body');
    if (shopTab === 'plans') {
      const plans = [
        { id: 'free', name: 'Gratis', price: '0 €', items: ['3 mesas: Casino Clásico, Playa, Bosque', '2 barajas estándar', 'Partidas públicas, salas privadas y torneos'] },
        { id: 'premium', name: 'Premium', price: '4,99 €', items: ['+ Mesa Espacio', '+ Mesa Bajo el Agua (tiburón en All-In)', '+ 5 barajas épicas a todo color'] },
        { id: 'elite', name: 'Élite', price: '9,99 €', items: ['Todo lo de Premium', '+ Globo Aerostático, Cyberpunk y Vegas Royale', '+ Barajas de lujo: Oro 24K, Holográfica y Neón', 'Acceso total a futuras mesas'] },
      ];
      body.innerHTML = `<div class="plan-grid">${plans.map((pl) => {
        const owned = C.TIERS[p.tier].rank >= C.TIERS[pl.id].rank;
        return `<article class="plan-card p-${pl.id}${p.tier === pl.id ? ' current' : ''}">
          <h3>${pl.name}</h3><p class="plan-price">${pl.price}</p>
          <ul>${pl.items.map((i) => `<li>${i}</li>`).join('')}</ul>
          ${pl.id === 'free' ? '<span class="plan-own">Incluido</span>' : owned ? '<span class="plan-own">✓ Activo</span>' : `<button class="lux-btn w-full" data-buy="${pl.id}"><span>Comprar ${pl.price}</span></button>`}
        </article>`;
      }).join('')}</div>
      <p class="text-[11px] text-white/40 mt-4">Pagos únicos. La pasarela de pago aún no está conectada (ver README): la compra se puede activar en modo demo.</p>`;
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
          : `<button class="lux-btn sm w-full" data-buy="${it.tier}"><span>🔒 ${it.tier === 'premium' ? 'Premium 4,99 €' : 'Élite 9,99 €'}</span></button>`}
      </article>`;
    }).join('')}</div>`;
  }

  $('#shop-body').addEventListener('click', (e) => {
    const eq = e.target.closest('[data-equip]');
    if (eq) {
      const [k, id] = eq.dataset.equip.split(':');
      store.setPref(k, id);
      renderShop();
      return;
    }
    const buy = e.target.closest('[data-buy]');
    if (buy) purchase(buy.dataset.buy);
  });

  function purchase(tier) {
    const t = C.TIERS[tier];
    ui.confirm({
      title: `${t.name} · ${t.price.toFixed(2).replace('.', ',')} €`,
      text: `La pasarela de pago todavía no está conectada.<br>Puedes activar el plan <b>${t.name}</b> en <b>modo demo</b> para probar todo su contenido en este navegador.`,
      yes: 'Activar demo', no: 'Cancelar',
      onYes: () => { store.unlockTier(tier); renderShop(); renderTopbar(); ui.toast(`✨ ${t.name} activado (demo)`); },
    });
  }

  /* ---------- estadísticas ---------- */

  function renderStats() {
    const p = store.profile;
    const s = p.stats;
    const rate = s.hands ? Math.round((s.won / s.hands) * 100) : 0;
    const tiles = [
      ['Manos jugadas', U.fmt(s.hands)], ['Manos ganadas', U.fmt(s.won)], ['% de victorias', rate + '%'],
      ['Bote más grande', U.fmt(s.biggestPot)], ['Mejor mano', s.bestHandName || '—'], ['Eliminaciones (bounty)', U.fmt(s.knockouts)],
      ['Torneos jugados', U.fmt(s.tournaments)], ['Torneos ganados', U.fmt(s.tournamentWins)], ['En premios (ITM)', U.fmt(s.itm)],
    ];
    $('#stats-body').innerHTML = `
      <div class="stats-head glass-card">
        <span class="pp-avatar big">${U.esc(U.initials(p.name))}</span>
        <div><h3>${U.esc(p.name)}</h3><p>Nivel ${store.level()} · ${p.guest ? 'Invitado' : C.TIERS[p.tier].name}</p>
        <div class="pp-bar wide"><i style="width:${Math.round(store.levelProgress() * 100)}%"></i></div></div>
        <div class="sh-coins"><small>Monedas</small><b>${U.fmt(p.coins)}</b></div>
      </div>
      <div class="stat-grid">${tiles.map(([k, v]) => `<div class="stat-tile"><small>${k}</small><b>${v}</b></div>`).join('')}</div>
      ${p.guest ? '<button class="lux-btn mt-6" id="btn-upgrade"><span>Registrarme y recibir 50.000 monedas</span></button>' : ''}`;
    const up = $('#btn-upgrade');
    if (up) up.addEventListener('click', () => { go('welcome'); authTab('register'); });
  }

  /* ---------- partida ---------- */

  function startGame(cfg) {
    if (game) exitGame();
    go('game');
    $('#game-host').innerHTML = '';
    game = new PVP.GameController(cfg, { store, host: $('#game-host'), hud });
    game.on('exit', exitGame);
    game.start();
  }

  function exitGame() {
    if (!game) return;
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
        : mode === 'tournament' ? 'Abandonarás el torneo y perderás la entrada.' : 'La sala privada se cerrará.',
      yes: 'Salir', no: 'Seguir jugando',
      onYes: () => game && game.leave(),
    });
  });

  root.addEventListener('resize', () => {
    if (game && store.profile.prefs.orientation === 'auto') game.setOrientation('auto');
  });

  /* ---------- arranque ---------- */

  if (store.restore()) { renderTopbar(); go('menu'); } else go('welcome');
  if (/#sala=/.test(location.hash) && store.profile) ui.toast('Invitación recibida: el multijugador online estará disponible con el servidor de salas.');

  PVP.app = { store, go, startGame };
})(window);
