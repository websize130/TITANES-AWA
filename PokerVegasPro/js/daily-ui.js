/* PokerVegasPro — panel de recompensa diaria semanal (lunes 4.000 → domingo 256.000, ×2 cada día). */
(function (root) {
  'use strict';

  const PVP = root.PVP;
  const U = PVP.util;
  const $ = (s, r) => (r || document).querySelector(s);
  const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

  let store = null;
  let status = null;

  async function refresh(st) {
    store = st || store;
    try { status = await store.dailyStatus(); } catch (e) { status = null; }
    const badge = $('#daily-badge');
    if (badge) badge.hidden = !(status && status.canClaim);
    return status;
  }

  function render() {
    if (!status) return;
    $('#daily-grid').innerHTML = status.amounts.map((amt, i) => {
      const d = i + 1;
      const claimed = status.claimed.includes(d);
      const today = d === status.today;
      const past = d < status.today && !claimed;
      const cls = claimed ? 'claimed' : today ? 'today' : past ? 'missed' : 'future';
      return `<div class="daily-day ${cls}${d === 7 ? ' jackpot' : ''}" style="--i:${i}">
        <span class="dd-name">${DAYS[i]}</span>
        <span class="dd-chest" aria-hidden="true">${claimed ? '✓' : d === 7 ? '👑' : '💰'}</span>
        <b class="dd-amt">${U.short(amt)}</b>
        <span class="dd-x">${i === 0 ? 'Base' : '×' + Math.pow(2, i)}</span>
        <span class="dd-state">${claimed ? 'Cobrado' : today ? 'Hoy' : past ? 'Sin reclamar' : 'Próximamente'}</span>
      </div>`;
    }).join('');
    const btn = $('#daily-claim');
    btn.disabled = !status.canClaim;
    btn.querySelector('span').textContent = status.canClaim
      ? `Reclamar ${U.fmt(status.amounts[status.today - 1])} monedas`
      : 'Vuelve mañana para el siguiente premio';
    const total = status.claimed.reduce((t, d) => t + status.amounts[d - 1], 0);
    $('#daily-total').textContent = `Esta semana llevas ${U.fmt(total)} monedas. El ciclo se reinicia cada lunes.`;
  }

  async function open(st) {
    await refresh(st);
    if (!status) return PVP.ui.toast('No se pudo cargar la recompensa diaria.');
    render();
    PVP.ui.open('modal-daily');
  }

  /** Abre el panel automáticamente una vez al día si hay premio pendiente. */
  async function autoOpen(st) {
    await refresh(st);
    if (!status || !status.canClaim) return;
    const key = 'pvp.daily.shown';
    let shown = null;
    try { shown = localStorage.getItem(key); } catch (e) { /* sin almacenamiento */ }
    const stamp = store.profile.id + ':' + PVP.Store.todayInfo().date;
    if (shown === stamp) return;
    try { localStorage.setItem(key, stamp); } catch (e) { /* sin almacenamiento */ }
    render();
    PVP.ui.open('modal-daily');
  }

  document.addEventListener('click', async (e) => {
    if (!e.target.closest('#daily-claim')) return;
    const btn = $('#daily-claim');
    btn.disabled = true;
    try {
      const amount = await store.claimDaily();
      if (PVP.Audio) PVP.Audio.sfx('coins');
      burst();
      PVP.ui.toast(`💰 +${U.fmt(amount)} monedas de recompensa diaria`, 4000);
      await refresh();
      render();
    } catch (err) {
      PVP.ui.toast('⚠️ ' + U.esc(err.message));
      btn.disabled = false;
    }
  });

  /** Lluvia de monedas doradas al reclamar. */
  function burst() {
    const box = $('#modal-daily .modal-card');
    for (let i = 0; i < 26; i++) {
      const c = document.createElement('i');
      c.className = 'coin-fly';
      c.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      c.style.setProperty('--d', (0.9 + Math.random() * 0.8).toFixed(2) + 's');
      c.style.setProperty('--r', Math.round(Math.random() * 720 - 360) + 'deg');
      box.appendChild(c);
      setTimeout(() => c.remove(), 1900);
    }
  }

  PVP.DailyUI = { open, autoOpen, refresh };
})(window);
