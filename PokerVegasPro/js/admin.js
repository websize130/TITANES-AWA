/* PokerVegasPro — panel de administración: configuración de llaves, códigos de activación, promos,
 * gestión directa de cuentas de este navegador y registro de activaciones.
 * La llave privada solo vive en memoria mientras la sesión está abierta.
 */
(function (root) {
  'use strict';

  const PVP = root.PVP;
  const U = PVP.util;
  const V = PVP.Vouchers;
  const C = PVP.Config;
  const T = PVP.Catalog.TIERS;
  const $ = (s, r) => (r || document).querySelector(s);
  const LEDGER = 'pvp.admin.ledger';
  const DAY = 86400000;

  let privateKey = null;
  let lastVoucher = null;
  let lastPromo = null;

  function toast(msg, ms) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), ms || 2600);
    setTimeout(() => t.remove(), (ms || 2600) + 400);
  }

  async function copy(text, label) {
    try { await navigator.clipboard.writeText(text); toast((label || 'Copiado') + ' ✓'); } catch (e) { toast('No se pudo copiar: selecciónalo a mano.'); }
  }

  const show = (id, on) => $(id).classList.toggle('hidden', !on);

  function view(name) {
    show('#sec-setup', name === 'setup');
    show('#sec-login', name === 'login');
    show('#sec-panel', name === 'panel');
    show('#btn-logout', name === 'panel');
  }

  /* ---------- configuración inicial ---------- */

  $('#form-setup').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const err = $('[data-error]', f);
    err.textContent = '';
    const out = {};
    try {
      if (f.pass.value || !C.ADMIN) {
        if (f.pass.value !== f.pass2.value) throw new Error('Las contraseñas no coinciden.');
        const res = await V.createAdmin(f.pass.value);
        out.ADMIN = res.admin;
        privateKey = res.privateKey;
      }
      if (f.creator.value) {
        if (f.creator.value.trim().length < 8) throw new Error('El código de creador debe tener al menos 8 caracteres.');
        if (V.isSigned(f.creator.value)) throw new Error('El código de creador no puede empezar por «PVP1-».');
        out.CREATOR_CODE = await V.hashSecret(f.creator.value);
      }
    } catch (ex) {
      err.textContent = ex.message;
      return;
    }
    const lines = [];
    if (out.ADMIN) lines.push('    ADMIN: ' + JSON.stringify(out.ADMIN) + ',');
    if (out.CREATOR_CODE) lines.push('    CREATOR_CODE: ' + JSON.stringify(out.CREATOR_CODE) + ',');
    $('#setup-snippet').value = lines.join('\n');
    $('#setup-out')._cfg = out;
    show('#setup-out', true);
    f.reset();
    toast('Configuración generada');
  });

  $('#btn-copy-snippet').addEventListener('click', () => copy($('#setup-snippet').value, 'Configuración copiada'));
  $('#btn-apply-local').addEventListener('click', () => {
    const cfg = $('#setup-out')._cfg || {};
    let cur = {};
    try { cur = JSON.parse(localStorage.getItem(C.LOCAL_KEY) || '{}') || {}; } catch (e) { cur = {}; }
    localStorage.setItem(C.LOCAL_KEY, JSON.stringify(Object.assign(cur, cfg)));
    toast('Aplicado en este navegador. Recargando…');
    setTimeout(() => location.reload(), 900);
  });
  $('#btn-show-setup').addEventListener('click', () => view('setup'));

  /* ---------- acceso ---------- */

  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('[data-error]', e.target);
    err.textContent = '';
    const btn = $('button', e.target);
    btn.disabled = true;
    try {
      privateKey = await V.unlockAdmin(e.target.pass.value, C.ADMIN);
      e.target.reset();
      openPanel();
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
    }
  });

  $('#btn-logout').addEventListener('click', () => { privateKey = null; view('login'); });

  function openPanel() {
    view('panel');
    renderUsers();
    renderLedger();
  }

  /* ---------- códigos ---------- */

  const PACK_PRESET = {
    elite: { t: 'elite', d: 30, c: C.PACKS.elite.coins, label: 'Pack Élite' },
    legend: { t: 'legend', d: 30, c: C.PACKS.legend.coins, label: 'Pack Leyenda' },
    friend: { t: 'legend', d: 0, c: 0, label: 'Leyenda permanente' },
    coins: { t: '', d: 0, c: 100000, label: 'Monedas' },
  };

  $('#form-voucher').pack.addEventListener('change', (e) => { e.target.form.coins.value = PACK_PRESET[e.target.value].c; });

  async function issue({ uid, note, pack, coins, expiresDays }) {
    if (!privateKey) throw new Error('Sesión cerrada.');
    const pr = PACK_PRESET[pack];
    uid = String(uid).trim().toUpperCase();
    if (!/^PVP-[A-Z0-9]{6}$/.test(uid)) throw new Error('El ID debe tener el formato PVP-XXXXXX.');
    const code = await V.sign(privateKey, {
      k: pr.t ? 'pack' : 'coins', u: uid, t: pr.t, d: pr.d, c: Math.max(0, Math.round(coins)),
      x: expiresDays ? Date.now() + expiresDays * DAY : 0,
    });
    addLedger({ uid, note, pack: pr.label, coins: Math.round(coins), days: pr.d, kind: 'código', ref: code.slice(-10) });
    return code;
  }

  function redeemLink(code) {
    return location.href.replace(/admin\.html.*$/, 'index.html') + '#canjear=' + encodeURIComponent(code);
  }

  $('#form-voucher').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      const code = await issue({ uid: f.uid.value, note: f.note.value, pack: f.pack.value, coins: +f.coins.value, expiresDays: +f.expires.value });
      lastVoucher = { code, pack: PACK_PRESET[f.pack.value], coins: +f.coins.value };
      $('#voucher-code').value = code;
      show('#voucher-out', true);
      toast('Código generado');
      renderLedger();
    } catch (ex) {
      toast('⚠️ ' + U.esc(ex.message), 4000);
    }
  });

  $('#form-promo').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    if (!privateKey) return;
    const until = f.until.value ? new Date(f.until.value + 'T23:59:59').getTime() : 0;
    const code = await V.sign(privateKey, { k: 'coins', u: '*', t: '', d: 0, c: Math.round(+f.coins.value), x: until });
    lastPromo = code;
    $('#promo-code').value = code;
    show('#promo-out', true);
    addLedger({ uid: '*', note: 'Promo', pack: 'Promo de fichas', coins: Math.round(+f.coins.value), days: 0, kind: 'promo', ref: code.slice(-10) });
    renderLedger();
  });

  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-copy]');
    if (!b) return;
    const k = b.dataset.copy;
    if (k === 'code' && lastVoucher) copy(lastVoucher.code, 'Código copiado');
    if (k === 'link' && lastVoucher) copy(redeemLink(lastVoucher.code), 'Enlace copiado');
    if (k === 'msg' && lastVoucher) {
      const pr = lastVoucher.pack;
      const what = [pr.t ? `${T[pr.t].name}${pr.d ? ' (' + pr.d + ' días)' : ' permanente'}` : '', lastVoucher.coins ? U.fmt(lastVoucher.coins) + ' monedas' : ''].filter(Boolean).join(' + ');
      copy(`¡Gracias por tu apoyo en PokerVegasPro! 🎰\nTu activación: ${what}.\n\nCanjéala aquí: ${redeemLink(lastVoucher.code)}\n\nO en Tienda → «Canjear» pega este código:\n${lastVoucher.code}`, 'Mensaje copiado');
    }
    if (k === 'promo' && lastPromo) copy(lastPromo, 'Código copiado');
    if (k === 'promolink' && lastPromo) copy(redeemLink(lastPromo), 'Enlace copiado');
  });

  /* ---------- usuarios de este navegador ---------- */

  function tierText(p) {
    const t = PVP.Store.effectiveTier(p);
    if (t === 'free') return p.tier !== 'free' && p.tierUntil ? `Gratis <small>(caducó ${new Date(p.tierUntil).toLocaleDateString('es-ES')})</small>` : 'Gratis';
    return `<span class="tier static t-${t}">${T[t].short}</span> <small>${p.tierUntil ? 'hasta ' + new Date(p.tierUntil).toLocaleDateString('es-ES') : 'permanente'}</small>`;
  }

  function renderUsers() {
    const q = $('#user-search').value.trim().toLowerCase();
    const list = PVP.Store.listAccounts().filter((a) => !q || [a.profile.name, a.profile.id, a.email].some((x) => String(x || '').toLowerCase().includes(q)));
    $('#user-table').innerHTML = `<thead><tr><th>Jugador</th><th>ID</th><th>Monedas</th><th>Nivel</th><th>Acciones</th></tr></thead><tbody>${
      list.map((a) => `<tr data-key="${U.esc(a.key)}" data-uid="${U.esc(a.profile.id)}" data-name="${U.esc(a.profile.name)}">
        <td><b>${U.esc(a.profile.name)}</b>${a.key === '@guest' ? ' <small>(invitado)</small>' : ''}<br><small>${U.esc(a.email || '')}</small></td>
        <td><code>${U.esc(a.profile.id)}</code></td>
        <td>${U.fmt(a.profile.coins)}</td>
        <td>${tierText(a.profile)}</td>
        <td class="adm-actions">
          <button class="lux-btn sm" data-act="elite"><span>Élite +500K</span></button>
          <button class="lux-btn sm" data-act="legend"><span>Leyenda +2M</span></button>
          <button class="ghost-btn sm" data-act="coins">+ Monedas</button>
          <button class="ghost-btn sm" data-act="friend">Leyenda ∞</button>
          <button class="ghost-btn sm" data-act="revoke">Quitar nivel</button>
          <button class="ghost-btn sm" data-act="code">Código</button>
        </td></tr>`).join('') || '<tr><td colspan="5">No hay cuentas que coincidan en este navegador.</td></tr>'
    }</tbody>`;
  }
  $('#user-search').addEventListener('input', renderUsers);

  $('#user-table').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const row = b.closest('tr');
    const key = row.dataset.key, uid = row.dataset.uid, name = row.dataset.name;
    const act = b.dataset.act;
    const S = PVP.Store;
    try {
      if (act === 'elite' || act === 'legend' || act === 'friend') {
        const pr = PACK_PRESET[act];
        S.updateAccount(key, (p) => S.grantPack(p, pr.t, pr.d, pr.c, act === 'friend' ? 'creator' : 'paypal'));
        addLedger({ uid, note: name, pack: pr.label, coins: pr.c, days: pr.d, kind: 'directo' });
        toast(`✓ ${pr.label} aplicado a ${U.esc(name)}`);
      } else if (act === 'coins') {
        const n = Math.round(+prompt(`¿Cuántas monedas sumar a ${name}?`, '100000'));
        if (!n) return;
        S.updateAccount(key, (p) => S.grantPack(p, null, 0, n));
        addLedger({ uid, note: name, pack: 'Monedas', coins: n, days: 0, kind: 'directo' });
        toast(`✓ +${U.fmt(n)} monedas a ${U.esc(name)}`);
      } else if (act === 'revoke') {
        if (!confirm(`¿Quitar el nivel de pago de ${name}?`)) return;
        S.updateAccount(key, (p) => { p.tier = 'free'; p.tierUntil = 0; p.tierSource = ''; });
        addLedger({ uid, note: name, pack: 'Nivel retirado', coins: 0, days: 0, kind: 'directo' });
        toast(`Nivel retirado a ${U.esc(name)}`);
      } else if (act === 'code') {
        const f = $('#form-voucher');
        f.uid.value = uid;
        f.note.value = name;
        f.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    } catch (ex) {
      toast('⚠️ ' + U.esc(ex.message));
    }
    renderUsers();
    renderLedger();
  });

  /* ---------- registro de activaciones ---------- */

  function ledger() {
    try { return JSON.parse(localStorage.getItem(LEDGER) || '[]'); } catch (e) { return []; }
  }

  function addLedger(entry) {
    const l = ledger();
    l.unshift(Object.assign({ t: Date.now() }, entry));
    localStorage.setItem(LEDGER, JSON.stringify(l.slice(0, 2000)));
  }

  function renderLedger() {
    const q = $('#ledger-search').value.trim().toLowerCase();
    const rows = ledger().filter((r) => !q || [r.uid, r.note, r.pack].some((x) => String(x || '').toLowerCase().includes(q)));
    $('#ledger-table').innerHTML = `<thead><tr><th>Fecha</th><th>ID</th><th>Nota</th><th>Activación</th><th>Monedas</th><th>Vía</th></tr></thead><tbody>${
      rows.slice(0, 300).map((r) => `<tr><td>${new Date(r.t).toLocaleString('es-ES')}</td><td><code>${U.esc(r.uid)}</code></td><td>${U.esc(r.note || '')}</td>
        <td>${U.esc(r.pack)}${r.days ? ` · ${r.days} días` : ''}</td><td>${r.coins ? U.fmt(r.coins) : '—'}</td><td>${U.esc(r.kind)}</td></tr>`).join('')
      || '<tr><td colspan="6">Sin activaciones todavía.</td></tr>'
    }</tbody>`;
  }
  $('#ledger-search').addEventListener('input', renderLedger);

  $('#btn-export').addEventListener('click', () => {
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = ['fecha,id,nota,activacion,dias,monedas,via']
      .concat(ledger().map((r) => [new Date(r.t).toISOString(), r.uid, r.note, r.pack, r.days, r.coins, r.kind].map(esc).join(',')))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'pokervegaspro-activaciones.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  /* ---------- arranque ---------- */
  view(C.ADMIN ? 'login' : 'setup');
})(window);
