// Controlador de interfaz: portada, dossiers de forajidos, modos, capítulos con página de cómic, sorteo de
// cartas, pausa, viñeta final / portada pulp y el Muro de los Condenados.
import { Save, xpForLevel } from '../core/save.js';
import { Input } from '../core/input.js';
import { Sfx } from '../core/audio.js';
import { HEROES, WEAPONS, MILESTONES, MAX_LEVEL } from '../data/heroes.js';
import { MISSIONS } from '../data/story.js';
import { SIGNATURE, RARITY, CARDS } from '../data/cards.js';
import { renderPage, renderPulpCover, paintScene } from '../art/comicPage.js';
import { drawCard } from '../art/cardArt.js';
import { drawHero } from '../art/heroArt.js';
import { makeCanvas } from '../art/ink.js';
import { Game } from '../game/engine.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const heroById = (id) => HEROES.find((h) => h.id === id);
const fmt = (n) => Math.round(n).toLocaleString('es-ES');
const dprOf = () => Math.min(2, window.devicePixelRatio || 1);

let fontsReady = null;
function fonts() {
  if (!fontsReady) fontsReady = Promise.race([
    Promise.all([document.fonts.load('20px "Holtwood One SC"'), document.fonts.load('bold 20px "Courier Prime"'), document.fonts.load('20px "Courier Prime"')]).catch(() => null),
    new Promise((r) => setTimeout(r, 2000)),
  ]);
  return fontsReady;
}

// ---------------------------------------------------------------- utilidades
let toastT = 0;
function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }
function modal(html, bind) {
  const m = $('#modal'), b = $('#modal-box');
  b.innerHTML = html; m.classList.remove('hidden');
  const close = () => m.classList.add('hidden');
  m.onclick = (e) => { if (e.target === m) close(); };
  $$('[data-close]', b).forEach((x) => x.addEventListener('click', () => { Sfx.play('click'); close(); }));
  bind && bind(b, close);
  return close;
}

let current = 'title', previous = 'title';
function show(id) {
  if (id !== current) previous = current;
  current = id;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + id));
  window.scrollTo(0, 0);
  if (id === 'title') drawTitle();
  if (id === 'select') renderDossiers();
  if (id === 'modes') renderModes();
  if (id === 'story') renderChapters();
  if (id === 'records') renderRecords();
}

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]'), act = e.target.closest('[data-act]'), back = e.target.closest('[data-back]');
  if (go || act || back) { Sfx.unlock(); Sfx.play('click'); }
  if (back) show(previous === 'records' ? 'title' : previous);
  if (go) {
    const to = go.dataset.go;
    if ((to === 'modes' || to === 'story') && !Save.data.hero) { toast('Primero elige un forajido'); show('select'); return; }
    show(to);
  }
  if (!act) return;
  switch (act.dataset.act) {
    case 'settings': openSettings(); break;
    case 'survival': startRun('survival', null); break;
    case 'resume': game.pause(false); break;
    case 'abandon': $('#pause').classList.add('hidden'); game.state = 'play'; game.finish(false); break;
    case 'toggle-sound': Save.setSetting('sound', !Save.data.settings.sound); applySettings(); break;
    case 'toggle-aim': Save.setSetting('aim', Save.data.settings.aim === 'auto' ? 'mouse' : 'auto'); applySettings(); break;
    default: break;
  }
});

function applySettings() {
  const s = Save.data.settings;
  Sfx.setEnabled(s.sound); Sfx.setMusic(s.music);
  $$('[data-sound]').forEach((x) => { x.textContent = s.sound ? 'Sí' : 'No'; });
  $$('[data-aim]').forEach((x) => { x.textContent = s.aim === 'auto' ? 'Auto' : 'Ratón'; });
}

function openSettings() {
  const s = Save.data.settings;
  modal(`<h3>Ajustes</h3>
    <div class="setting"><span>Efectos de sonido</span><button class="btn small" data-k="sound">${s.sound ? 'Sí' : 'No'}</button></div>
    <div class="setting"><span>Música</span><button class="btn small" data-k="music">${s.music ? 'Sí' : 'No'}</button></div>
    <div class="setting"><span>Apuntado en PC</span><button class="btn small" data-k="aim">${s.aim === 'auto' ? 'Automático' : 'Con ratón'}</button></div>
    <div class="setting"><span>Temblor de pantalla</span><button class="btn small" data-k="shake">${s.shake ? 'Sí' : 'No'}</button></div>
    <div class="setting"><span>Borrar progreso</span><button class="btn small btn-blood" data-reset>Reiniciar</button></div>
    <p>PC: WASD/flechas mover · disparo automático · 1·2·3 (o Q·E·R) juegan las cartas de la mano · clic derecho: carta 1 · Esc: pausa.<br>
    Móvil: arrastra en cualquier punto (joystick) y toca las cartas de la esquina.</p>
    <div class="row"><button class="btn" data-close>Cerrar</button></div>`, (b, close) => {
    $$('[data-k]', b).forEach((x) => x.addEventListener('click', () => {
      const k = x.dataset.k;
      if (k === 'aim') Save.setSetting('aim', s.aim === 'auto' ? 'mouse' : 'auto'); else Save.setSetting(k, !s[k]);
      applySettings(); close(); openSettings();
    }));
    b.querySelector('[data-reset]').addEventListener('click', () => { if (confirm('¿Borrar niveles, historia y récords?')) { Save.reset(); close(); show('title'); toast('Progreso borrado'); } });
  });
}

// ---------------------------------------------------------------- portada
function drawTitle() {
  const c = $('#title-art'), d = dprOf(), W = window.innerWidth, H = window.innerHeight;
  c.width = W * d; c.height = H * d;
  const x = c.getContext('2d'); x.scale(d, d);
  const h = heroById(Save.data.hero) || HEROES[0];
  paintScene(x, 'horde', 0, 0, W, H, h, h.skins[0].pal);
  x.fillStyle = 'rgba(0,0,0,0.45)'; x.fillRect(0, 0, W, H);
}

// ---------------------------------------------------------------- dossiers
function heroPal(h) { return h.skins[Save.hero(h.id).skin].pal; }

function renderDossiers() {
  const box = $('#dossiers');
  box.innerHTML = HEROES.map((h, i) => {
    const st = Save.hero(h.id), pct = st.level >= MAX_LEVEL ? 100 : (st.xp / xpForLevel(st.level)) * 100;
    return `<article class="dossier ${Save.data.hero === h.id ? 'selected' : ''}" style="--rot:${[-1.2, 0.8, -0.6][i]}deg">
      <span class="tab">EXPEDIENTE Nº ${['047', '113', '666'][i]}</span>
      ${st.level >= 50 ? '<span class="stampmark">LEYENDA</span>' : ''}
      <canvas data-portrait="${h.id}"></canvas>
      <h3>${h.name}</h3><span class="alias">${h.alias}</span>
      <p><b>${h.role}</b></p>
      <p class="passive"><b>Pasiva · ${h.passive.name}:</b> ${h.passive.desc}</p>
      <div class="lvl"><b>NV ${st.level}</b><span class="xpbar"><i style="width:${pct}%"></i></span><span>${st.level >= MAX_LEVEL ? 'MÁX' : fmt(st.xp) + '/' + fmt(xpForLevel(st.level))}</span></div>
      <div class="row"><button class="btn small" data-dossier="${h.id}">Abrir dossier</button><button class="btn btn-blood" data-pick="${h.id}">Elegir</button></div>
    </article>`;
  }).join('');
  fonts().then(() => $$('canvas[data-portrait]', box).forEach((cv) => {
    const h = heroById(cv.dataset.portrait), d = dprOf(), W = cv.clientWidth || 300, H = W * 0.75;
    cv.width = W * d; cv.height = H * d;
    const x = cv.getContext('2d'); x.scale(d, d);
    paintScene(x, 'hero', 0, 0, W, H, h, heroPal(h));
  }));
  $$('[data-pick]', box).forEach((b) => b.addEventListener('click', () => { Save.selectHero(b.dataset.pick); Sfx.play('stamp'); show('modes'); }));
  $$('[data-dossier]', box).forEach((b) => b.addEventListener('click', () => openDossier(heroById(b.dataset.dossier))));
}

function openDossier(h) {
  const st = Save.hero(h.id);
  const skinsOk = Save.unlocked(h.id, 'skin'), wOk = Save.unlocked(h.id, 'weapon');
  const reqLevel = (kind, idx) => (MILESTONES.find((m) => m.kind === kind && m.idx === idx) || { level: 1 }).level;
  modal(`<h3>${h.name} <small style="font-size:14px">· ${h.alias}</small></h3>
    <canvas class="origin" id="origin"></canvas>
    <p>${h.lore}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <canvas id="sigcard" width="200" height="290" style="width:160px;height:232px"></canvas>
      <div style="flex:1;min-width:240px">
        <p><b>Pasiva · ${h.passive.name}:</b> ${h.passive.desc}</p>
        <p><b>Nivel ${st.level}</b> de ${MAX_LEVEL}. Hitos de desbloqueo:</p>
        <div class="track">${MILESTONES.map((m) => `<div class="ms ${st.level >= m.level ? '' : 'off'}"><b>NV ${m.level}</b>${m.kind === 'skin' ? '🎩 ' + h.skins[m.idx].name : '🔫 ' + WEAPONS[h.weapons[m.idx]].name}</div>`).join('')}</div>
      </div>
    </div>
    <p><b>Aspecto</b></p>
    <div class="pick">${h.skins.map((s, i) => `<button data-skin="${i}" class="${st.skin === i ? 'on' : ''}" ${skinsOk.includes(i) ? '' : 'disabled'}><span class="swatch" style="background:${s.pal.coat}"></span>${s.name}${skinsOk.includes(i) ? '' : ' · NV ' + reqLevel('skin', i)}</button>`).join('')}</div>
    <p><b>Arma</b></p>
    <div class="pick">${h.weapons.map((wid, i) => { const w = WEAPONS[wid]; return `<button data-weapon="${i}" class="${st.weapon === i ? 'on' : ''}" ${wOk.includes(i) ? '' : 'disabled'}>${w.name}${wOk.includes(i) ? '' : ' · NV ' + reqLevel('weapon', i)}<br><span style="font-weight:400">${w.desc}</span></button>`; }).join('')}</div>
    <div class="row"><button class="btn" data-close>Cerrar</button><button class="btn btn-blood" data-choose>Elegir a ${h.short}</button></div>`,
  (b, close) => {
    fonts().then(() => {
      const cv = b.querySelector('#origin'), W = Math.min(860, b.clientWidth - 40), H = Math.round(W * (window.innerWidth < 640 ? 1.25 : 0.46));
      renderPage(cv, h.panels, h, heroPal(h), { w: W, h: H, title: 'ORIGEN' });
      cv.style.width = '100%'; cv.style.height = 'auto';
      const sc = b.querySelector('#sigcard'), x = sc.getContext('2d'); drawCard(x, SIGNATURE[h.signature], 200, 290, 0, 'Carta de firma: empieza en tu mano.');
    });
    $$('[data-skin]', b).forEach((x) => x.addEventListener('click', () => { Save.setSkin(h.id, +x.dataset.skin); close(); openDossier(h); renderDossiers(); }));
    $$('[data-weapon]', b).forEach((x) => x.addEventListener('click', () => { Save.setWeapon(h.id, +x.dataset.weapon); close(); openDossier(h); }));
    b.querySelector('[data-choose]').addEventListener('click', () => { Save.selectHero(h.id); close(); Sfx.play('stamp'); show('modes'); });
  });
}

// ---------------------------------------------------------------- modos y capítulos
function renderModes() {
  const h = heroById(Save.data.hero), st = Save.hero(h.id);
  $('#modes-hero').textContent = `${h.short} · NV ${st.level}`;
  $('#story-meta').textContent = `${MISSIONS.filter((m) => Save.storyDone(m.id)).length}/${MISSIONS.length} casos cerrados`;
  $('#surv-meta').textContent = Save.bestRound() ? `Mejor ronda: ${Save.bestRound()}` : 'Aún nadie ha sobrevivido al cruce';
}

const OBJ = { survive: (o) => `Sobrevive ${Math.round(o.time / 60 * 10) / 10} min`, defend: (o) => `Defiende el refugio ${o.time}s`, kill: (o) => `Abate ${o.count} zombis`, boss: () => 'Coloso de élite' };
const unlockedMission = (i) => i === 0 || Save.storyDone(MISSIONS[i - 1].id);

function renderChapters() {
  const box = $('#chapters');
  box.innerHTML = MISSIONS.map((m, i) => `<button class="chapter ${m.boss ? 'boss' : ''} ${Save.storyDone(m.id) ? 'done' : ''} ${unlockedMission(i) ? '' : 'locked'}" data-m="${i}">
    <span class="ch-n">CAPÍTULO ${['I', 'II', 'III', 'IV', 'V', 'VI'][i]}</span><span class="ch-name">${m.name}</span>
    <span class="ch-obj">${OBJ[m.obj.type](m.obj)} · +${m.reward} XP</span></button>`).join('');
  $$('[data-m]', box).forEach((b) => b.addEventListener('click', () => {
    const i = +b.dataset.m;
    if (!unlockedMission(i)) { toast('Cierra el caso anterior primero'); return; }
    startRun('story', MISSIONS[i]);
  }));
}

// ---------------------------------------------------------------- página de cómic
function showComic(panels, hero, pal, opts) {
  return new Promise((resolve) => {
    const wrap = $('#comic'), cv = $('#comic-canvas');
    wrap.classList.remove('hidden');
    const vw = window.innerWidth - 20, vh = window.innerHeight - 80;
    let W = Math.min(1180, vw), H = Math.round(W * 0.6);
    if (H > vh) { H = vh; W = Math.min(vw, Math.round(H / 0.6)); }
    if (vw < 640) { W = vw; H = Math.min(vh, Math.round(W * 1.6)); }
    renderPage(cv, panels, hero, pal, { w: W, h: H, ...opts });
    Sfx.play('page');
    cv.style.opacity = '0'; cv.style.transform = 'scale(0.96) rotate(-1deg)'; cv.style.transition = 'opacity .4s, transform .4s';
    requestAnimationFrame(() => { cv.style.opacity = '1'; cv.style.transform = 'none'; });
    const done = () => { wrap.classList.add('hidden'); cv.onclick = null; $('[data-act="comic-go"]').onclick = null; $('[data-act="comic-skip"]').onclick = null; resolve(); };
    $('[data-act="comic-go"]').textContent = opts.button || '¡Al combate!';
    cv.onclick = done; $('[data-act="comic-go"]').onclick = done; $('[data-act="comic-skip"]').onclick = done;
  });
}

// ---------------------------------------------------------------- partida
const canvas = $('#game'), input = new Input(canvas);
const game = new Game(canvas, input, {
  onEnd: (r) => endRun(r),
  onDraft: (choices, reason) => showDraft(choices, reason),
  onPause: (v) => { $('#pause').classList.toggle('hidden', !v); applySettings(); },
});

async function startRun(mode, mission) {
  Sfx.unlock();
  const h = heroById(Save.data.hero);
  if (!h) { show('select'); return; }
  await fonts();
  const st = Save.hero(h.id), pal = h.skins[st.skin].pal;
  if (mode === 'story') await showComic(mission.intro, h, pal, { title: mission.name.toUpperCase() });
  $('#app').classList.add('hidden');
  $('#game-root').classList.remove('hidden');
  $('#draft').classList.add('hidden'); $('#pause').classList.add('hidden');
  if (input.isTouch && document.documentElement.requestFullscreen && !document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
  game.resize();
  game.start({ mode, mission, hero: h, skin: st.skin, weaponIdx: st.weapon, level: st.level, settings: Save.data.settings });
  lastRun = { mode, mission };
  Sfx.startMusic();
}
let lastRun = null;

let draftRaf = 0;
function showDraft(choices, reason) {
  const box = $('#draft-cards'), d = dprOf(), W = window.innerWidth < 640 ? 150 : 210, H = Math.round(W * 1.45);
  $('#draft-title').textContent = reason === 'bonus' ? 'Recompensa: roba una carta' : '¡Nivel ' + game.level + '! Roba una carta';
  box.innerHTML = choices.map((c, i) => `<div class="slot"><canvas data-i="${i}" style="width:${W}px;height:${H}px"></canvas><span>[${i + 1}] ${RARITY[c.r].name}</span></div>`).join('');
  const cvs = $$('canvas', box);
  cvs.forEach((cv) => { cv.width = W * d; cv.height = H * d; });
  const t0 = performance.now();
  const loop = () => {
    draftRaf = requestAnimationFrame(loop);
    const t = (performance.now() - t0) / 1000;
    cvs.forEach((cv, i) => { const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, H); drawCard(x, choices[i], W, H, t, choices[i].t === 'action' && game.hand.every((hh) => hh) ? 'Mano llena: sustituirá tu carta de menor rareza.' : ''); });
    if (choices.every((c) => c.r < 3)) cancelAnimationFrame(draftRaf);
  };
  loop();
  $('#draft').classList.remove('hidden');
  const pick = (i) => {
    if (!choices[i]) return;
    cancelAnimationFrame(draftRaf); window.removeEventListener('keydown', onKey);
    $('#draft').classList.add('hidden');
    Sfx.play(choices[i].r === 4 ? 'curse' : 'card');
    game.takeCard(choices[i]);
  };
  const onKey = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= 3) pick(n - 1); };
  window.addEventListener('keydown', onKey);
  cvs.forEach((cv) => cv.addEventListener('click', () => pick(+cv.dataset.i)));
}

const FAKE = ['La Novia del Pantano', 'El Sepulturero de Tombstone', 'Muerte en la Diligencia', 'El Pozo sin Fondo', 'Balas para el Diablo'];
function stampFor(round) { return round >= 10 ? 'LEYENDA' : round >= 6 ? 'VETERANO' : round >= 4 ? 'SUPERVIVIENTE' : 'CAÍDO'; }

async function endRun(r) {
  Sfx.stopMusic();
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  $('#game-root').classList.add('hidden'); $('#app').classList.remove('hidden');
  const h = heroById(Save.data.hero), before = Save.hero(h.id).skin, pal = h.skins[before].pal;
  const gain = Save.addXp(h.id, r.profileXp, r.kills);
  let rank = -1;
  if (r.mode === 'story' && r.win) Save.completeStory(r.missionId);
  if (r.mode === 'survival') rank = Save.addRecord({ round: r.round, kills: r.kills, hero: h.id, skin: before, date: new Date().toLocaleDateString('es-ES'), stamp: stampFor(r.round) });
  show('end');
  await fonts();
  const cv = $('#end-art'), vw = Math.min(window.innerWidth - 32, 620);
  if (r.mode === 'story') {
    const m = MISSIONS.find((x) => x.id === r.missionId), panel = r.win ? m.win : m.lose;
    renderPage(cv, [panel], h, pal, { w: vw, h: Math.round(vw * 0.72), stamp: r.win ? 'CASO CERRADO' : 'FINAL TRÁGICO', stampColor: r.win ? '#1a5a1a' : '#b3201a', title: m.name.toUpperCase() });
  } else {
    const verbs = ['DEVORADO', 'DESPEDAZADO', 'CONDENADO', 'ARRASTRADO AL INFIERNO'];
    renderPulpCover(cv, {
      hero: h, pal, issue: 13 + Save.data.records.length, seed: r.kills,
      headline: `¡${h.short.toUpperCase()} ${verbs[r.kills % verbs.length]} EN EL CRUCE!`,
      blurbs: [`Cayó en la RONDA ${r.round} tras abatir ${fmt(r.kills)} muertos vivientes.`, `"${r.killer}" reclama otra alma.`, `Lea también: ${FAKE[r.round % FAKE.length]}.`],
      stamp: stampFor(r.round),
    }, Math.min(vw, 460), Math.round(Math.min(vw, 460) * 1.42));
  }
  const st = Save.hero(h.id);
  const unl = gain.unlocks.map((u) => `<div class="unlock"><b>¡Desbloqueado en NV ${u.level}!</b><br>${u.kind === 'skin' ? 'Aspecto: ' + h.skins[u.idx].name : 'Arma exclusiva: ' + WEAPONS[h.weapons[u.idx]].name} (equipado)</div>`).join('');
  const mi = r.missionId ? MISSIONS.findIndex((x) => x.id === r.missionId) : -1;
  const next = r.mode === 'story' && r.win && MISSIONS[mi + 1];
  $('#end-info').innerHTML = `
    <h2>${r.mode === 'survival' ? 'El cruce se cobra su precio' : r.win ? 'Caso cerrado' : 'Final trágico'}</h2>
    <dl>
      ${r.mode === 'survival' ? `<dt>Ronda alcanzada</dt><dd>${r.round}</dd>` : ''}
      <dt>Zombis abatidos</dt><dd>☠ ${fmt(r.kills)}</dd>
      <dt>Tiempo</dt><dd>${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}</dd>
      <dt>Cartas en el mazo</dt><dd>${r.deck}</dd>
      <dt>XP de forajido</dt><dd>+${fmt(r.profileXp)}</dd>
      <dt>${h.short}</dt><dd>NV ${st.level}${gain.levelsGained ? ' (+' + gain.levelsGained + ')' : ''}</dd>
    </dl>
    ${rank >= 0 ? `<p>Tu nombre queda grabado en el Muro de los Condenados: <b>puesto ${rank + 1}</b>.</p>` : ''}
    ${unl}
    <div class="row">
      <button class="btn btn-blood" data-end="retry">Otra vez</button>
      ${next ? '<button class="btn" data-end="next">Siguiente caso ▶</button>' : ''}
      <button class="btn" data-end="modes">Modos</button>
      ${r.mode === 'survival' ? '<button class="btn" data-end="records">El Muro</button>' : ''}
    </div>`;
  Sfx.play('stamp');
  $$('[data-end]', $('#end-info')).forEach((b) => b.addEventListener('click', () => {
    Sfx.play('click');
    const a = b.dataset.end;
    if (a === 'retry') startRun(lastRun.mode, lastRun.mission);
    else if (a === 'next') startRun('story', next);
    else show(a);
  }));
}

// ---------------------------------------------------------------- Muro de los Condenados
function renderRecords() {
  const box = $('#records'), recs = Save.data.records;
  if (!recs.length) { box.innerHTML = '<p class="empty">El muro está vacío. Aún nadie ha caído en el cruce.</p>'; return; }
  box.innerHTML = recs.map((r, i) => {
    const h = heroById(r.hero) || HEROES[0];
    return `<div class="rec" style="--rot:${((i * 37) % 5 - 2) * 0.4}deg"><span class="big">${i + 1}</span>
      <span class="who"><canvas data-mini="${i}" width="80" height="80"></canvas><span>${h.short}<br><small>${h.alias}</small></span></span>
      <span class="big">R${r.round}</span><span>☠ ${fmt(r.kills)}</span><span class="date">${r.date}</span>
      <span class="inkstamp ${r.stamp.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()}">${r.stamp}</span></div>`;
  }).join('');
  $$('canvas[data-mini]', box).forEach((cv) => {
    const r = recs[+cv.dataset.mini], h = heroById(r.hero) || HEROES[0], x = cv.getContext('2d');
    x.fillStyle = '#120a06'; x.fillRect(0, 0, 80, 80);
    x.save(); x.translate(40, 150); x.scale(0.62, 0.62); drawHero(x, h.id, h.skins[r.skin || 0].pal, 0, 3); x.restore();
  });
}

// ---------------------------------------------------------------- arranque
document.addEventListener('visibilitychange', () => { if (document.hidden && game.running) game.pause(true); });
window.addEventListener('resize', () => { if (current === 'title') drawTitle(); });
applySettings();
fonts().then(() => { if (current === 'title') drawTitle(); });
show('title');
window.__tinta = { game, Save, HEROES, MISSIONS, CARDS }; // gancho de depuración (pruebas automáticas)
