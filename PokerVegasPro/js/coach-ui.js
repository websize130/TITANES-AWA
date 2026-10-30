/* PokerVegasPro — panel Coach Pro (exclusivo del Pack Leyenda): métricas, áreas de mejora y evolución. */
(function (root) {
  'use strict';

  const PVP = root.PVP;
  const U = PVP.util;

  const STATUS = {
    good: { icon: '✓', label: 'En rango' },
    warn: { icon: '!', label: 'Revisar' },
    bad: { icon: '✕', label: 'Fuga' },
    none: { icon: '·', label: 'Sin datos' },
    low: { icon: '…', label: 'Muestra corta' },
    info: { icon: 'i', label: 'Nota' },
  };
  const SERIES = { accuracy: '#e8b54a', vpip: '#3987e5', pfr: '#d95926' };
  const MODE_ES = { public: 'Pública', private: 'Privada', tournament: 'Torneo' };

  const fmtPct = (v) => (v == null ? '—' : v.toFixed(0) + '%');

  function metricTile(label, value, key, rangeText, help, enough) {
    const st = value != null && !enough ? 'low' : PVP.Stats.rate(value, key);
    const s = STATUS[st];
    const shown = value == null ? '—' : key === 'af' ? value.toFixed(1) : value.toFixed(0) + '%';
    return `<div class="metric-tile" title="${U.esc(help)}">
      <small>${label}</small><b>${shown}</b>
      <span class="m-range">Óptimo ${rangeText}</span>
      <span class="m-status s-${st}"><i>${s.icon}</i>${s.label}</span>
    </div>`;
  }

  function render(el, store, opts) {
    const adv = store.profile.adv || PVP.Stats.emptyAdv();
    if (!store.hasCoach()) return renderLocked(el, adv, opts);

    const m = PVP.Stats.metrics(adv);
    const R = PVP.Stats.RANGES;
    const insights = PVP.Stats.coach(adv);
    const sessions = adv.sessions.filter((s) => s.hands > 0);
    const pos = [['Temprana', 'early'], ['Media', 'middle'], ['Tardía (CO/BTN)', 'late'], ['Ciegas', 'blinds']];

    el.innerHTML = `
      <header class="coach-head">
        <div><h3>Coach Pro</h3><p>${U.fmt(m.hands)} manos y ${U.fmt(m.decisions)} decisiones analizadas con equidad Monte Carlo.</p></div>
        <span class="tier t-legend static">Leyenda</span>
      </header>
      <div class="metric-grid">
        ${metricTile('VPIP', m.vpip, 'vpip', `${R.vpip[0]}–${R.vpip[1]}%`, 'Manos en las que pones dinero voluntariamente antes del flop', m.hands >= 20)}
        ${metricTile('PFR', m.pfr, 'pfr', `${R.pfr[0]}–${R.pfr[1]}%`, 'Manos en las que subes antes del flop', m.hands >= 20)}
        ${metricTile('3-Bet', m.threeBet, 'threeBet', `${R.threeBet[0]}–${R.threeBet[1]}%`, 'Resubidas cuando alguien ya subió preflop', adv.threeBetOpp >= 10)}
        ${metricTile('Agresividad (AF)', m.af, 'af', `${R.af[0]}–${R.af[1]}`, '(Apuestas + subidas) / pagos después del flop', adv.bets + adv.raises + adv.calls >= 10)}
        ${metricTile('WTSD', m.wtsd, 'wtsd', `${R.wtsd[0]}–${R.wtsd[1]}%`, 'Llegas al showdown tras ver el flop', adv.sawFlop >= 10)}
        ${metricTile('W$SD', m.wsd, 'wsd', `≥ ${R.wsd[0]}%`, 'Showdowns que ganas', adv.wtsd >= 8)}
        ${metricTile('Aciertos', m.accuracy, 'accuracy', `≥ ${R.accuracy[0]}%`, 'Decisiones correctas según equidad y pot odds', m.decisions >= 15)}
      </div>

      <div class="coach-cols">
        <div class="glass-card coach-card">
          <h4>Áreas de mejora</h4>
          <ul class="insights">${insights.length ? insights.map((i) => `
            <li class="lv-${i.level}"><span class="m-status s-${i.level}"><i>${STATUS[i.level].icon}</i>${STATUS[i.level].label}</span>
              <div><b>${U.esc(i.title)}</b><p>${U.esc(i.text)}</p></div></li>`).join('')
            : '<li class="lv-info"><div><p>Juega unas manos para recibir recomendaciones.</p></div></li>'}</ul>
        </div>
        <div class="glass-card coach-card">
          <h4>VPIP por posición</h4>
          <div class="pos-bars">${pos.map(([label, k]) => {
            const v = m.posVpip[k];
            const h = adv.pos[k].h;
            return `<div class="pos-row"><span>${label}</span><div class="pos-track"><i style="width:${v == null ? 0 : Math.min(100, v)}%"></i></div><b>${fmtPct(v)}</b><small>${h} manos</small></div>`;
          }).join('')}</div>
          <p class="coach-note">Lo ideal es jugar más manos cuanto más tarde hablas (cutoff y botón).</p>
        </div>
      </div>

      <div class="glass-card coach-card">
        <h4>Evolución de aciertos por sesión</h4>
        <div class="chart" id="chart-acc"></div>
      </div>
      <div class="glass-card coach-card">
        <h4>VPIP y PFR por sesión</h4>
        <div class="chart-legend"><span><i style="background:${SERIES.vpip}"></i>VPIP</span><span><i style="background:${SERIES.pfr}"></i>PFR</span></div>
        <div class="chart" id="chart-style"></div>
      </div>

      <div class="glass-card coach-card">
        <h4>Últimos errores detectados</h4>
        ${adv.examples.length ? `<ul class="mistakes">${adv.examples.map((e) => `
          <li><span class="mk-street">${e.street}</span><div><b>${U.esc(e.cards)}</b>${e.board ? ` <span class="mk-board">sobre ${U.esc(e.board)}</span>` : ''}
          <p>${U.esc(PVP.Stats.MISTAKE_TEXT[e.kind](e))}</p></div></li>`).join('')}</ul>` : '<p class="coach-note">Sin errores registrados todavía. 👌</p>'}
      </div>

      <details class="glass-card coach-card">
        <summary>Registro de sesiones (tabla)</summary>
        <div class="table-wrap"><table class="sess-table">
          <thead><tr><th>#</th><th>Fecha</th><th>Modo</th><th>Manos</th><th>Aciertos</th><th>VPIP</th><th>PFR</th><th>Resultado</th></tr></thead>
          <tbody>${sessions.map((s, i) => `<tr><td>${i + 1}</td><td>${new Date(s.t).toLocaleDateString('es-ES')}</td><td>${MODE_ES[s.mode] || s.mode}</td>
            <td>${s.hands}</td><td>${s.dec ? Math.round((s.good / s.dec) * 100) + '%' : '—'}</td><td>${Math.round((s.vpip / s.hands) * 100)}%</td>
            <td>${Math.round((s.pfr / s.hands) * 100)}%</td><td class="${s.net >= 0 ? 'pos' : 'neg'}">${s.net >= 0 ? '+' : ''}${U.fmt(s.net)}</td></tr>`).reverse().join('') || '<tr><td colspan="8">Sin sesiones</td></tr>'}</tbody>
        </table></div>
      </details>`;

    const labels = sessions.map((s, i) => `Sesión ${i + 1} · ${new Date(s.t).toLocaleDateString('es-ES')} · ${s.hands} manos`);
    const draw = () => {
      lineChart(el.querySelector('#chart-acc'), {
        labels, series: [{ name: 'Aciertos', color: SERIES.accuracy, values: sessions.map((s) => (s.dec ? (s.good / s.dec) * 100 : null)) }],
      });
      lineChart(el.querySelector('#chart-style'), {
        labels, direct: true, series: [
          { name: 'VPIP', color: SERIES.vpip, values: sessions.map((s) => (s.vpip / s.hands) * 100) },
          { name: 'PFR', color: SERIES.pfr, values: sessions.map((s) => (s.pfr / s.hands) * 100) },
        ],
      });
    };
    draw();
    if (el._ro) el._ro.disconnect();
    if (root.ResizeObserver) {
      let w = el.clientWidth;
      el._ro = new ResizeObserver(() => { if (Math.abs(el.clientWidth - w) > 4) { w = el.clientWidth; draw(); } });
      el._ro.observe(el);
    }
  }

  function renderLocked(el, adv, opts) {
    el.innerHTML = `
      <div class="coach-locked">
        <div class="coach-blur" aria-hidden="true">
          <div class="metric-grid">${['VPIP', 'PFR', '3-Bet', 'AF', 'WTSD', 'W$SD', 'Aciertos'].map((k) => `<div class="metric-tile"><small>${k}</small><b>··%</b><span class="m-range">Óptimo ··</span></div>`).join('')}</div>
          <div class="glass-card coach-card" style="height:140px"></div>
        </div>
        <div class="coach-cta glass-card">
          <span class="tier t-legend static">Leyenda</span>
          <h3>Coach Pro</h3>
          <p>VPIP, PFR, 3-bet y factor de agresividad, fugas detectadas en tus partidas y la evolución de tus aciertos sesión a sesión.</p>
          <p class="coach-note">Ya estamos registrando tu juego: <b>${U.fmt(adv.hands)} manos</b> analizadas te esperan.</p>
          <button class="lux-btn" id="btn-coach-unlock"><span>Desbloquear con Pack Leyenda</span></button>
        </div>
      </div>`;
    el.querySelector('#btn-coach-unlock').addEventListener('click', () => opts && opts.onUnlock && opts.onUnlock());
  }

  /** Gráfico de líneas SVG (eje 0–100 %), con cruceta y tooltip al pasar el ratón. */
  function lineChart(host, { labels, series, direct }) {
    if (!host) return;
    const n = labels.length;
    if (n < 1) { host.innerHTML = '<p class="coach-note">Juega una sesión para ver tu evolución.</p>'; return; }
    const W = Math.max(280, host.clientWidth || 600), H = 210;
    const pad = { l: 38, r: direct ? 54 : 16, t: 12, b: 26 };
    const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
    const x = (i) => pad.l + (n === 1 ? iw / 2 : (i * iw) / (n - 1));
    const y = (v) => pad.t + (1 - v / 100) * ih;

    let svg = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${series.map((s) => s.name).join(' y ')} por sesión">`;
    for (const g of [0, 25, 50, 75, 100]) {
      svg += `<line x1="${pad.l}" x2="${W - pad.r}" y1="${y(g)}" y2="${y(g)}" class="grid"/><text x="${pad.l - 8}" y="${y(g) + 4}" class="axis" text-anchor="end">${g}%</text>`;
    }
    const step = Math.max(1, Math.ceil(n / 8));
    for (let i = 0; i < n; i += step) svg += `<text x="${x(i)}" y="${H - 6}" class="axis" text-anchor="middle">${i + 1}</text>`;

    for (const s of series) {
      let d = '', pen = false;
      s.values.forEach((v, i) => {
        if (v == null) { pen = false; return; }
        d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
        pen = true;
      });
      svg += `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
      if (n <= 24) s.values.forEach((v, i) => { if (v != null) svg += `<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="${s.color}" stroke="#120c14" stroke-width="2"/>`; });
      if (direct) {
        let li = s.values.length - 1;
        while (li >= 0 && s.values[li] == null) li--;
        if (li >= 0) svg += `<text x="${x(li) + 8}" y="${y(s.values[li]) + 4}" class="dlabel">${s.name}</text>`;
      }
    }
    svg += `<line class="xhair" x1="0" x2="0" y1="${pad.t}" y2="${pad.t + ih}" style="opacity:0"/>`;
    svg += `<rect class="hit" x="${pad.l - 10}" y="0" width="${iw + 20}" height="${H}" fill="transparent"/></svg>`;
    host.innerHTML = svg + '<div class="chart-tip"></div>';

    const hair = host.querySelector('.xhair');
    const tip = host.querySelector('.chart-tip');
    const move = (e) => {
      const r = host.getBoundingClientRect();
      const px = e.clientX - r.left;
      const i = n === 1 ? 0 : Math.round(U.clamp((px - pad.l) / iw, 0, 1) * (n - 1));
      hair.setAttribute('x1', x(i)); hair.setAttribute('x2', x(i));
      hair.style.opacity = 1;
      tip.innerHTML = `<b>${U.esc(labels[i])}</b>` + series.map((s) => `<span><i style="background:${s.color}"></i>${s.name}<em>${fmtPct(s.values[i])}</em></span>`).join('');
      tip.style.opacity = 1;
      const left = x(i) + 12 + 200 > W ? x(i) - 212 : x(i) + 12;
      tip.style.left = Math.max(0, left) + 'px';
    };
    const hit = host.querySelector('.hit');
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', () => { hair.style.opacity = 0; tip.style.opacity = 0; });
  }

  PVP.CoachUI = { render, lineChart };
})(window);
