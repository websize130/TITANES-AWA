import { $, clamp } from '../core/utils.js';
import { icon } from './icons.js';
import { QUALITY } from '../data/config.js';
import { CHARACTERS } from '../data/characters.js';
import { CHAPTERS } from '../data/levels.js';
import { Settings } from '../core/settings.js';
import { padName } from '../input/input.js';

/* =====================================================================
   INTERFAZ: selección de personaje, pausa, modales y descarga
   ===================================================================== */
export const fmt1 = (n) => n.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export class UI {
  constructor(game) {
    this.game = game;
    const m = (f) => Math.max(...CHARACTERS.map((c) => f(c.stats)));
    this.max = { hp: m((s) => s.maxHealth), run: m((s) => s.runSpeed), st: m((s) => s.stamina), crit: m((s) => s.critChance) };
    this.renderList(); this.bind(); this.syncQuality(); this.syncSettings();
  }
  setBoot(p, text) { $('#bootBar i').style.transform = `scaleX(${clamp(p, 0, 1)})`; if (text) $('#bootText').textContent = text; }
  showBoot(text) { const b = $('#boot'); b.hidden = false; b.classList.remove('is-out'); this.setBoot(0.15, text); }
  hideBoot() { const b = $('#boot'); b.classList.add('is-out'); setTimeout(() => { if (b.classList.contains('is-out')) b.hidden = true; }, 520); }
  renderList() {
    $('#charList').innerHTML = CHARACTERS.map((c, i) => `
      <button class="char-card" role="option" aria-selected="false" data-id="${c.id}" style="animation-delay:${80 + i * 70}ms">
        <span class="cc-idx">0${i + 1}</span>
        <span class="cc-avatar" style="--c:${c.accent}">${c.initials}</span>
        <span class="cc-body"><span class="cc-name">${c.name}</span><span class="cc-role">${c.role} · ${c.archetype}</span></span>
        <span class="cc-chip">${c.chip}</span>
      </button>`).join('');
  }
  renderDetail(def, s) {
    $('#cdRole').textContent = def.role; $('#cdName').textContent = def.name; $('#cdArch').textContent = def.archetype; $('#cdBio').textContent = def.bio;
    const stars = $('#cdStars'); stars.innerHTML = [1, 2, 3].map((i) => icon('star', i <= def.difficulty ? 'on' : 'off')).join('');
    stars.setAttribute('aria-label', `Dificultad ${def.difficulty} de 3`);
    const rows = [
      ['heart', 'Salud', `${s.maxHealth} PV${s.armor ? ` · −${Math.round(s.armor * 100)} %` : ''}`, s.maxHealth / this.max.hp],
      ['run', 'Velocidad', `${fmt1(s.speed)} · ${fmt1(s.runSpeed)} m/s`, s.runSpeed / this.max.run],
      ['zap', 'Resistencia', `${s.stamina}`, s.stamina / this.max.st],
      ['target', 'Crítico', `${Math.round(s.critChance * 100)} % · ×${fmt1(s.critMult)}`, s.critChance / this.max.crit],
    ];
    const box = $('#cdStats');
    if (!box.children.length) box.innerHTML = rows.map((r) => `<div class="stat-row"><span class="lbl">${icon(r[0])}${r[1]}</span><span class="val"></span><div class="meter"><i></i></div></div>`).join('');
    [...box.children].forEach((row, i) => { row.querySelector('.val').textContent = rows[i][2]; row.querySelector('.meter i').style.setProperty('--v', clamp(rows[i][3], 0.05, 1).toFixed(3)); });
    $('#cdPerkName').textContent = def.perk.name; $('#cdPerkText').textContent = def.perk.text;
    document.querySelectorAll('.char-card').forEach((c) => c.setAttribute('aria-selected', String(c.dataset.id === def.id)));
    this.setGlbStatus(def.look.model && def.look.model.url ? 'busy' : 'none', def);
  }
  // Estado del modelo GLB del personaje seleccionado
  setGlbStatus(state, def = this.game.selected) {
    const el = $('#glbStatus'), name = (def.look.model && def.look.model.name) || 'modelo .glb';
    el.className = 'glb-status' + (state === 'ok' ? ' ok' : state === 'err' ? ' err' : state === 'busy' ? ' busy' : '');
    el.innerHTML = state === 'busy' ? `${icon('loader')} Cargando ${name}…` : state === 'ok' ? `Modelo activo: ${name}` : state === 'err' ? 'No se pudo cargar; se usa la malla procedural' : 'Malla procedural esculpida';
    $('#btnGlbClear').hidden = !(def.look.model && def.look.model.url);
  }
  syncQuality() {
    document.querySelectorAll('#qualitySeg button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.q === Settings.data.quality)));
    const auto = $('#qualitySeg [data-q="auto"]'); auto.title = `Auto · ${QUALITY[Settings.quality()].label}`;
  }
  syncSettings() {
    const d = Settings.data;
    $('#rngBright').value = d.brightness; $('#rngSens').value = d.sens;
    $('#swSound').setAttribute('aria-checked', String(!d.muted));
    $('#swFps').setAttribute('aria-checked', String(d.fps));
    $('#swAssist').setAttribute('aria-checked', String(d.autoAim !== false));
    $('#swFull').setAttribute('aria-checked', String(!!(document.fullscreenElement || document.webkitFullscreenElement)));
    $('#swTv').setAttribute('aria-checked', String(!!d.tv));
    $('#fps').hidden = !d.fps;
  }
  toggleFullscreen() {
    const el = document.documentElement;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      const fn = el.requestFullscreen || el.webkitRequestFullscreen;
      if (fn) { const p = fn.call(el); if (p && p.catch) p.catch(() => {}); }
    } else {
      const fn = document.exitFullscreen || document.webkitExitFullscreen;
      if (fn) fn.call(document);
    }
    setTimeout(() => this.syncSettings(), 300);
  }
  confirm(btn) { // feedback de confirmación ~220 ms
    btn.style.transform = 'scale(0.95)'; btn.style.background = 'rgba(139,0,0,.38)'; btn.style.borderColor = 'rgba(255,26,26,.75)';
    setTimeout(() => { btn.style.transform = ''; btn.style.background = ''; btn.style.borderColor = ''; }, 220);
  }
  modalOpen() { return !!document.querySelector('.modal-wrap[id^="modal-"]:not([hidden])'); }
  openModal(name) {
    const w = $('#modal-' + name); if (!w) return; this.lastFocus = document.activeElement; w.hidden = false; const c = w.querySelector('[data-close]'); if (c) c.focus({ preventScroll: true });
    if (name === 'pads') { this.renderPads(); this.game.remote.open().then(() => this.renderPads()); }
  }
  // Capa interactiva visible (para navegar con el mando)
  activeLayer() {
    const open = [...document.querySelectorAll('.modal-wrap:not([hidden])')].pop(); if (open) return open;
    const st = this.game.state; return st === 'title' ? $('#title') : st === 'menu' ? $('#select') : null;
  }
  cycleCharacter(d) { const g = this.game; if (g.state !== 'menu' || this.modalOpen()) return; const n = CHARACTERS.length, i = CHARACTERS.indexOf(g.selected); g.selectCharacter(CHARACTERS[(i + d + n) % n].id); }
  toast(title, sub = '') {
    const el = $('#uiToast'); el.children[0].textContent = title; el.children[1].textContent = sub;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); clearTimeout(this.toastT); this.toastT = setTimeout(() => el.classList.remove('show'), 3200);
  }
  // Mandos conectados y a quién controlan (panel «Mandos y móvil»)
  renderPads() {
    const g = this.game, box = $('#padList'); if (!box) return;
    const rows = [...g.pads.st.values()].filter((s) => s.connected);
    box.textContent = '';
    if (!rows.length) { const p = document.createElement('p'); p.className = 'pad-empty'; p.textContent = 'Ningún mando detectado. Conecta uno por USB o Bluetooth y pulsa cualquier botón.'; box.appendChild(p); }
    for (const s of rows) {
      const o = g.padOwner(s.key), row = document.createElement('div'); row.className = 'pad-row';
      row.innerHTML = `${icon(s.kind === 'remote' ? 'phone' : 'gamepad')}<span class="pr-name"></span><span class="pr-own ${o ? 'on' : ''}">${o ? 'Jugador ' + o : 'Libre'}</span>` +
        (o !== 1 ? `<button class="btn btn-ghost pr-btn" data-to="1" aria-label="Asignar al jugador 1">J1</button>` : '') + (o !== 2 ? `<button class="btn btn-ghost pr-btn" data-to="2" aria-label="Asignar al jugador 2">J2</button>` : '');
      row.querySelector('.pr-name').textContent = s.kind === 'remote' ? 'Móvil' : padName(s.label);
      row.dataset.pk = s.key; box.appendChild(row);
    }
    document.querySelectorAll('#padTarget button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.t === g.remoteTarget)));
    this.renderPlayers();
  }
  renderPlayers() {
    const g = this.game, p2 = g.players[1], duo = !!(p2 && p2.active), el = $('#plStatus'); if (!el) return;
    const p1in = g.input.pad ? (g.input.pad.startsWith('r:') ? 'móvil' : 'mando') : g.input.usingTouch ? 'táctil' : 'teclado y ratón';
    el.textContent = duo ? `Dúo · J1 ${p1in} · J2 ${p2.input.pad ? (p2.input.pad.startsWith('r:') ? 'móvil' : 'mando') : 'sin mando'}` : g.p2Pad ? `J1 ${p1in} · J2 preparado` : `Solo · ${p1in}`;
    $('#btnP2Leave').hidden = !duo && !g.p2Pad;
  }
  closeModal(w) { w.hidden = true; if (this.lastFocus && this.lastFocus.focus) this.lastFocus.focus({ preventScroll: true }); }
  renderTitleInfo() {
    const d = Settings.data, u = Math.min(CHAPTERS.length, d.unlocked || 1), done = (d.done || []).filter(Boolean).length;
    $('#storyInfo').textContent = done >= CHAPTERS.length ? '5 capítulos · historia completada' : `5 capítulos · ${u} desbloqueado${u > 1 ? 's' : ''}`;
    $('#survInfo').textContent = `Rondas cada vez más duras · Récord: ${d.bestRound ? 'ronda ' + d.bestRound : '—'}`;
  }
  renderChapters() {
    const d = Settings.data, u = d.unlocked || 1;
    $('#chList').innerHTML = CHAPTERS.map((c, i) => {
      const lock = i >= u, ok = d.done && d.done[i];
      return `<button class="ch-card" role="listitem" data-ch="${i}" ${lock ? 'disabled aria-disabled="true"' : ''} style="animation-delay:${60 + i * 60}ms">
        <span class="ch-num">${i + 1}</span>
        <span class="ch-body"><b>${c.title}</b><span>${c.place} · <em>${lock ? 'Bloqueado' : c.boss}</em></span></span>
        <span class="ch-state ${ok ? 'ok' : ''}">${icon(lock ? 'lock' : ok ? 'check' : 'chevron')}</span>
      </button>`;
    }).join('');
  }
  showChapters(on) {
    $('#tModes').hidden = on; $('#tChapters').hidden = !on;
    if (on) { this.renderChapters(); const b = $('#chList .ch-card:not([disabled])'); if (b) b.focus({ preventScroll: true }); }
    else $('#btnStory').focus({ preventScroll: true });
  }
  showPause(def, touch) {
    const g = this.game, duo = g.activePlayers.length > 1;
    $('#pauseChar').textContent = duo ? `${def.name} y ${g.players[1].def.name} · Dúo` : `${def.name} · ${def.role}`;
    this.renderPlayers();
    const m = this.game.mode; $('#pauseObj').textContent = m && m.currentText ? (m.kind === 'story' ? `Capítulo ${m.idx + 1} · ` : '') + m.currentText : '';
    const q = `<span class="eyebrow">Controles · Calidad ${QUALITY[Settings.quality()].label}</span>`;
    const k = (t) => `<span class="kbd">${t}</span>`;
    $('#controlsHelp').innerHTML = g.input.pad || duo
      ? `${q}<div>${k('LS')}Moverse · ${k('L3')}Correr · ${k('RS')}Cámara · ${k('LT')}Apuntar · ${k('RT')}Disparar</div><div>${k('B / ○')}Agacharse (corriendo: deslizamiento) · ${k('RB')}Cuchillo · ${k('X / □')}Recargar · ${k('Y / △')}Arma</div><div>${k('A / ✕')}Usar (mantén) · ${k('↑')}Linterna · ${k('LB')}Hombro · ${k('START')}Pausa</div>`
      : touch
      ? `${q}<div>Joystick izquierdo: empuja poco para caminar y llévalo al borde superior para correr · Desliza a la derecha: cámara</div><div>${icon('crosshair')} Disparar (mantén para ráfaga) · ${icon('scan')} Apuntar (fija al infectado más cercano) · ${icon('reload')} Recargar · ${icon('gun')} Cambiar arma</div><div>${icon('slide')} Agacharse (corriendo: deslizamiento táctico) · ${icon('hand')} Usar (mantén) · ${icon('knife')} Cuchillo · ${icon('flashlight')} Linterna · ${icon('swap')} Hombro</div>`
      : `${q}<div>${k('W A S D')}Moverse · ${k('Shift')}Correr · ${k('C')}/${k('Ctrl')}Agacharse (corriendo: deslizamiento)</div><div>${k('Ratón')}Cámara · ${k('Clic dcho.')}Apuntar · ${k('Clic izq.')}Disparar (mantén: automático)</div><div>${k('R')}Recargar · ${k('1')}${k('2')}/${k('Rueda')}Armas · ${k('E')}Usar (mantén)</div><div>${k('V')}Cuchillo · ${k('F')}Linterna · ${k('Q')}Hombro · ${k('Esc')}Pausa</div>`;
    this.syncSettings(); $('#pause').hidden = false; $('#btnResume').focus({ preventScroll: true });
  }
  hidePause() { $('#pause').hidden = true; }
  bind() {
    const g = this.game;
    $('#charList').addEventListener('click', (e) => { const b = e.target.closest('.char-card'); if (b) g.selectCharacter(b.dataset.id); });
    addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const open = document.querySelector('.modal-wrap[id^="modal-"]:not([hidden])');
        if (open) { this.closeModal(open); return; }
        if (g.state === 'title' && !$('#tChapters').hidden) { this.showChapters(false); return; }
        if (g.state === 'menu') { g.showTitle(); return; }
        // Ignora el mismo Esc que liberó el puntero y abrió la pausa
        if (g.state === 'paused' && performance.now() - g.pausedAt > 400) { g.resume(); return; }
      }
      if (g.state !== 'menu' || this.modalOpen()) return;
      const i = CHARACTERS.findIndex((c) => c.id === g.selected.id), n = CHARACTERS.length;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); g.selectCharacter(CHARACTERS[(i + 1) % n].id); }
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); g.selectCharacter(CHARACTERS[(i + n - 1) % n].id); }
      if (e.key === 'Enter' && !(e.target && e.target.closest && e.target.closest('button'))) { e.preventDefault(); g.startGame(); }
    });
    $('#btnStart').addEventListener('click', () => g.startGame());
    $('#btnStory').addEventListener('click', () => { if (g.audio.ensure()) g.audio.startAmbience(); this.showChapters(true); });
    $('#btnSurvival').addEventListener('click', () => { if (g.audio.ensure()) g.audio.startAmbience(); g.chooseMode('survival'); });
    $('#btnChBack').addEventListener('click', () => this.showChapters(false));
    $('#chList').addEventListener('click', (e) => { const b = e.target.closest('.ch-card'); if (b && !b.disabled) g.chooseMode('story', +b.dataset.ch); });
    $('#btnSelBack').addEventListener('click', () => g.showTitle());
    $('#btnNext').addEventListener('click', () => g.nextChapter());
    $('#btnCmpMenu').addEventListener('click', () => g.backToTitle());
    // Primer plano del rostro en el escenario del menú
    $('#faceBtn').addEventListener('click', (e) => {
      const b = e.currentTarget, on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on)); b.querySelector('span').textContent = on ? 'Ver cuerpo' : 'Ver rostro';
      if (g.menu) g.menu.setFaceMode(on);
    });
    // Importar un modelo .glb para el personaje seleccionado (solo en esta sesión)
    const input = $('#glbInput');
    $('#btnGlb').addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
      const f = input.files && input.files[0]; input.value = '';
      if (!f) return;
      const def = g.selected, prev = def.look.model && def.look.model.url;
      if (prev && prev.startsWith('blob:')) URL.revokeObjectURL(prev);
      def.look.model = { ...(def.look.model || {}), url: URL.createObjectURL(f), name: f.name };
      this.setGlbStatus('busy', def); g.menu.setCharacter(def);
    });
    $('#btnGlbClear').addEventListener('click', () => {
      const def = g.selected, url = def.look.model && def.look.model.url;
      if (url && url.startsWith('blob:')) URL.revokeObjectURL(url);
      def.look.model = { ...(def.look.model || {}), url: null, name: null };
      this.setGlbStatus('none', def); g.menu.setCharacter(def);
    });
    g.events.on('model:loaded', ({ def }) => { if (def === g.selected) this.setGlbStatus('ok', def); });
    g.events.on('model:error', ({ def }) => { if (def === g.selected) this.setGlbStatus('err', def); });
    $('#qualitySeg').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; Settings.data.quality = b.dataset.q; Settings.save(); this.syncQuality(); });
    const st = $('#selStage'); let dragId = null, lx = 0;
    st.addEventListener('pointerdown', (e) => { if (e.target.closest('.stage-btn')) return; dragId = e.pointerId; lx = e.clientX; st.setPointerCapture(e.pointerId); });
    st.addEventListener('pointermove', (e) => { if (e.pointerId !== dragId || !g.menu) return; g.menu.drag(e.clientX - lx); lx = e.clientX; });
    const end = (e) => { if (e.pointerId === dragId) dragId = null; };
    st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
    $('#btnPause').addEventListener('click', () => g.pause());
    $('#btnResume').addEventListener('click', () => g.resume());
    $('#btnMenu').addEventListener('click', () => g.backToTitle());
    $('#btnRetry').addEventListener('click', () => g.retry());
    $('#btnDeathMenu').addEventListener('click', () => g.backToTitle());
    $('#rngBright').addEventListener('input', (e) => { Settings.data.brightness = +e.target.value; g.engine.applyBrightness(); g.needsRender = true; Settings.save(); });
    $('#rngSens').addEventListener('input', (e) => { Settings.data.sens = +e.target.value; Settings.save(); });
    $('#swSound').addEventListener('click', () => { Settings.data.muted = !Settings.data.muted; g.audio.setMuted(Settings.data.muted); Settings.save(); this.syncSettings(); });
    $('#swFps').addEventListener('click', () => { Settings.data.fps = !Settings.data.fps; Settings.save(); this.syncSettings(); });
    $('#swAssist').addEventListener('click', () => { Settings.data.autoAim = Settings.data.autoAim === false; Settings.save(); this.syncSettings(); });
    $('#swFull').addEventListener('click', () => this.toggleFullscreen());
    $('#swTv').addEventListener('click', () => {
      const d = Settings.data; d.tv = !d.tv; d.tvSet = true; Settings.save(); g.applyTv();
      if (d.tv && !document.fullscreenElement && !document.webkitFullscreenElement) this.toggleFullscreen(); // en la TV, un jugador a pantalla completa
      this.syncSettings(); g.onResize();
    });
    $('#btnP2Leave').addEventListener('click', () => { g.removePlayer2(); this.renderPlayers(); });
    $('#padList').addEventListener('click', (e) => {
      const b = e.target.closest('[data-to]'); if (!b) return; const key = b.closest('.pad-row').dataset.pk, o = g.padOwner(key);
      if (b.dataset.to === '1') { if (o === 2) { if (g.players[1]) g.players[1].input.pad = null; if (g.p2Pad === key) g.p2Pad = null; } g.assignP1(key); }
      else { if (o === 1) g.input.pad = null; g.addPlayer2(key); }
      this.renderPads();
    });
    $('#padTarget').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; g.remoteTarget = b.dataset.t; this.renderPads(); });
    document.addEventListener('fullscreenchange', () => this.syncSettings());
    document.querySelectorAll('[data-modal]').forEach((b) => b.addEventListener('click', () => this.openModal(b.dataset.modal)));
    document.querySelectorAll('.modal-wrap[id^="modal-"]').forEach((w) => w.addEventListener('click', (e) => { if (e.target === w || e.target.closest('[data-close]')) this.closeModal(w); }));
    // Descarga la versión autónoma (un solo .html con todo dentro) que genera «npm run build»
    $('#dlBtn').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      try {
        const res = await fetch('blood-dead.html', { cache: 'no-store' }); if (!res.ok) throw new Error(res.status);
        const a = document.createElement('a'); a.href = URL.createObjectURL(await res.blob()); a.download = 'blood-dead.html';
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1500); this.confirm(btn);
      } catch (err) { this.toast('Descarga no disponible', 'La versión de un solo archivo se genera con «npm run build».'); }
    });
  }
}
