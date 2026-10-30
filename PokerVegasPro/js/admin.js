/* PokerVegasPro — panel de administración sobre Supabase.
 * Solo funciona con una cuenta con is_admin = true: las funciones pvp_admin_* lo comprueban en el servidor.
 */
(function (root) {
  'use strict';

  const PVP = root.PVP;
  const U = PVP.util;
  const B = PVP.Backend;
  const T = PVP.Catalog.TIERS;
  const $ = (s, r) => (r || document).querySelector(s);
  const money = (n) => Number(n).toFixed(2).replace('.', ',') + ' €';
  const STATUS = { pending: 'Pendiente', paid: 'Pagado', rejected: 'Rechazado', cancelled: 'Cancelado' };

  let purchases = [];

  function toast(msg, ms) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = msg;
    $('#toasts').appendChild(t);
    setTimeout(() => t.classList.add('out'), ms || 2800);
    setTimeout(() => t.remove(), (ms || 2800) + 400);
  }
  const fail = (e) => toast('⚠️ ' + U.esc(e.message || e), 4500);

  function view(name) {
    for (const s of ['login', 'panel', 'offline']) $('#sec-' + s).classList.toggle('hidden', s !== name);
    $('#btn-logout').classList.toggle('hidden', name !== 'panel');
  }

  /* ---------- acceso ---------- */

  async function enter() {
    const s = await B.session();
    if (!s) return view('login');
    const prof = await B.ensureProfile('');
    if (!prof.is_admin) {
      view('login');
      $('#sec-login [data-error]').textContent = `La cuenta ${s.user.email} no es administradora. Márcala con is_admin = true en la tabla pvp_profiles.`;
      return;
    }
    view('panel');
    B.subscribeAdmin(() => loadPurchases());
    await Promise.all([loadPurchases(), loadUsers(), loadCodes()]);
  }

  $('#form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const err = $('[data-error]', e.target);
    err.textContent = '';
    try {
      await B.signIn(e.target.email.value.trim(), e.target.pass.value);
      e.target.reset();
      await enter();
    } catch (ex) { err.textContent = ex.message; }
  });

  $('#btn-logout').addEventListener('click', async () => { await B.signOut(); view('login'); });

  /* ---------- pagos ---------- */

  async function loadPurchases() {
    try { purchases = await B.adminPurchases(); } catch (e) { return fail(e); }
    renderPending();
    renderHistory();
  }

  const who = (r) => r.pvp_profiles || {};

  function renderPending() {
    const q = $('#pending-search').value.trim().toLowerCase();
    const rows = purchases.filter((r) => r.status === 'pending' && (!q || [r.reference, who(r).username, who(r).player_code].some((x) => String(x || '').toLowerCase().includes(q))));
    $('#pending-count').textContent = purchases.filter((r) => r.status === 'pending').length;
    $('#pending-table').innerHTML = `<thead><tr><th>Fecha</th><th>Jugador</th><th>Pack</th><th>Importe</th><th>Referencia</th><th>ID PayPal (opcional)</th><th></th></tr></thead><tbody>${
      rows.map((r) => `<tr data-id="${r.id}">
        <td>${new Date(r.created_at).toLocaleString('es-ES')}</td>
        <td><b>${U.esc(who(r).username || '?')}</b><br><small>${U.esc(who(r).player_code || '')}</small></td>
        <td>${U.esc(PVP.Config.PACKS[r.pack].name)}</td><td><b>${money(r.amount)}</b></td>
        <td><code>${U.esc(r.reference)}</code></td>
        <td><input class="adm-search sm" data-ref placeholder="Ej. 5TY12345AB678901C" /></td>
        <td class="adm-actions"><button class="lux-btn sm" data-act="confirm"><span>Confirmar</span></button><button class="ghost-btn sm" data-act="reject">Rechazar</button></td>
      </tr>`).join('') || '<tr><td colspan="7">No hay pagos pendientes.</td></tr>'
    }</tbody>`;
  }
  $('#pending-search').addEventListener('input', renderPending);

  $('#pending-table').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const row = b.closest('tr');
    const id = row.dataset.id;
    const p = purchases.find((x) => x.id === id);
    b.disabled = true;
    try {
      if (b.dataset.act === 'confirm') {
        if (!confirm(`¿Confirmar el pago de ${money(p.amount)} de ${who(p).username} (${p.reference})?`)) return;
        await B.adminConfirm(id, $('[data-ref]', row).value.trim());
        toast(`✓ ${PVP.Config.PACKS[p.pack].name} activado para ${U.esc(who(p).username)}`);
      } else {
        const note = prompt('Motivo del rechazo (opcional):', 'Pago no encontrado');
        if (note === null) return;
        await B.adminReject(id, note);
        toast('Compra rechazada');
      }
      await Promise.all([loadPurchases(), loadUsers()]);
    } catch (ex) { fail(ex); } finally { b.disabled = false; }
  });

  function renderHistory() {
    $('#history-table').innerHTML = `<thead><tr><th>Fecha</th><th>Jugador</th><th>Pack</th><th>Importe</th><th>Vía</th><th>Referencia</th><th>ID PayPal</th><th>Estado</th></tr></thead><tbody>${
      purchases.map((r) => `<tr><td>${new Date(r.created_at).toLocaleString('es-ES')}</td><td>${U.esc(who(r).username || '?')}</td>
        <td>${U.esc(PVP.Config.PACKS[r.pack].name)}</td><td>${money(r.amount)}</td><td>${U.esc(r.provider)}</td>
        <td><code>${U.esc(r.reference)}</code></td><td>${U.esc(r.provider_ref || '')}</td><td><span class="st st-${r.status}">${STATUS[r.status]}</span></td></tr>`).join('')
      || '<tr><td colspan="8">Sin compras todavía.</td></tr>'
    }</tbody>`;
  }

  $('#btn-export').addEventListener('click', () => {
    const esc = (v) => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
    const csv = ['fecha,usuario,id_jugador,pack,importe,via,referencia,id_paypal,estado']
      .concat(purchases.map((r) => [r.created_at, who(r).username, who(r).player_code, r.pack, r.amount, r.provider, r.reference, r.provider_ref, r.status].map(esc).join(',')))
      .join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'pokervegaspro-compras.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });

  /* ---------- usuarios ---------- */

  let searchT = null;
  $('#user-search').addEventListener('input', () => { clearTimeout(searchT); searchT = setTimeout(loadUsers, 300); });

  async function loadUsers() {
    let users = [];
    try { users = await B.adminUsers($('#user-search').value); } catch (e) { return fail(e); }
    $('#user-table').innerHTML = `<thead><tr><th>Jugador</th><th>ID</th><th>Monedas</th><th>Nivel</th><th>Alta</th><th>Acciones</th></tr></thead><tbody>${
      users.map((u) => `<tr data-uid="${u.id}" data-name="${U.esc(u.username)}">
        <td><b>${U.esc(u.username)}</b>${u.is_admin ? ' <small>(admin)</small>' : ''}</td><td><code>${U.esc(u.player_code)}</code></td>
        <td>${U.fmt(u.coins)}</td><td>${u.tier === 'free' ? 'Gratis' : `<span class="tier static t-${u.tier}">${T[u.tier].short}</span>`}</td>
        <td>${new Date(u.created_at).toLocaleDateString('es-ES')}</td>
        <td class="adm-actions">
          <button class="lux-btn sm" data-act="elite"><span>Pack Élite</span></button>
          <button class="lux-btn sm" data-act="legend"><span>Pack Leyenda</span></button>
          <button class="ghost-btn sm" data-act="coins">± Monedas</button>
          <select class="adm-select" data-act="tier" aria-label="Nivel"><option value="">Nivel…</option><option value="free">Gratis</option><option value="elite">Élite</option><option value="legend">Leyenda</option></select>
        </td></tr>`).join('') || '<tr><td colspan="6">Sin resultados.</td></tr>'
    }</tbody>`;
  }

  $('#user-table').addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]');
    if (!b) return;
    const row = b.closest('tr');
    const uid = row.dataset.uid, name = row.dataset.name;
    try {
      if (b.dataset.act === 'elite' || b.dataset.act === 'legend') {
        const pk = PVP.Config.PACKS[b.dataset.act];
        if (!confirm(`¿Entregar ${pk.name} (${U.fmt(pk.coins)} monedas + desbloqueos) a ${name}? Se registra como compra manual.`)) return;
        await B.adminGrant(uid, b.dataset.act, 'Entrega manual desde el panel');
        toast(`✓ ${pk.name} entregado a ${U.esc(name)}`);
      } else if (b.dataset.act === 'coins') {
        const n = Math.round(+prompt(`Monedas a sumar a ${name} (negativo para restar):`, '100000'));
        if (!n) return;
        await B.adminCoins(uid, n, 'Ajuste manual');
        toast(`✓ ${n > 0 ? '+' : ''}${U.fmt(n)} monedas a ${U.esc(name)}`);
      }
      await Promise.all([loadUsers(), loadPurchases()]);
    } catch (ex) { fail(ex); }
  });

  $('#user-table').addEventListener('change', async (e) => {
    const s = e.target.closest('select[data-act="tier"]');
    if (!s || !s.value) return;
    const row = s.closest('tr');
    try {
      await B.adminTier(row.dataset.uid, s.value);
      toast(`Nivel de ${U.esc(row.dataset.name)}: ${T[s.value].name}`);
      loadUsers();
    } catch (ex) { fail(ex); }
  });

  /* ---------- códigos ---------- */

  async function loadCodes() {
    let codes = [];
    try { codes = await B.adminCodes(); } catch (e) { return fail(e); }
    $('#code-table').innerHTML = `<thead><tr><th>Etiqueta</th><th>Tipo</th><th>Monedas</th><th>Desbloquea</th><th>Usos</th><th>Caduca</th><th>Activo</th></tr></thead><tbody>${
      codes.map((c) => `<tr data-hash="${c.code_hash}"><td>${U.esc(c.label || c.code_hash.slice(0, 10) + '…')}</td><td>${c.kind === 'creator' ? 'Creador' : 'Promo'}</td>
        <td>${U.fmt(c.coins)}</td><td>${c.grants_tier ? T[c.grants_tier].name : '—'}</td><td>${c.uses}${c.max_uses ? ' / ' + c.max_uses : ''}</td>
        <td>${c.expires_at ? new Date(c.expires_at).toLocaleDateString('es-ES') : '—'}</td>
        <td><label class="toggle-field"><input type="checkbox" data-active ${c.active ? 'checked' : ''}/><span class="tg"></span></label></td></tr>`).join('')
      || '<tr><td colspan="7">Sin códigos.</td></tr>'
    }</tbody>`;
  }

  $('#code-table').addEventListener('change', async (e) => {
    const c = e.target.closest('[data-active]');
    if (!c) return;
    try { await B.adminCodeActive(c.closest('tr').dataset.hash, c.checked); toast(c.checked ? 'Código activado' : 'Código desactivado'); } catch (ex) { fail(ex); }
  });

  $('#form-code').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target;
    const creator = f.kind.value === 'creator';
    try {
      await B.adminCreateCode({
        code: f.code.value, kind: f.kind.value, coins: +f.coins.value || 0, tier: f.tier.value || (creator ? 'legend' : null),
        maxUses: f.max.value ? +f.max.value : null, expires: f.until.value ? new Date(f.until.value + 'T23:59:59').toISOString() : null,
        // Los códigos de creador no se etiquetan con su texto (es secreto).
        label: creator ? 'Creador' : f.code.value.trim().toUpperCase(),
      });
      toast('Código creado');
      f.reset();
      loadCodes();
    } catch (ex) { fail(ex); }
  });

  /* ---------- arranque ---------- */
  B.init();
  B.probe().then((ok) => (ok ? enter() : view('offline'))).catch(() => view('offline'));
})(window);
