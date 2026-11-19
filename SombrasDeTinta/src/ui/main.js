// Controlador de interfaz: portada, dossiers de forajidos, modos, capítulos con página de cómic, sorteo de
// cartas, pausa, viñeta final / portada pulp y el Muro de los Condenados.
import { Save, xpForLevel } from '../core/save.js';
import { Input } from '../core/input.js';
import { Sfx } from '../core/audio.js';
import { HEROES, MAX_LEVEL, SKIN_RULES, SKIN_TIER } from '../data/heroes.js';
import { WEAPONS, WEAPON_LIST, CATEGORIES, canEquip } from '../data/weapons.js';
import { drawWeaponIcon } from '../art/weaponArt.js';
import { drawPet } from '../art/petArt.js';
import { petStats, PET_TIER } from '../data/pets.js';
import { MISSIONS } from '../data/story.js';
import { SIGNATURE, RARITY, CARDS } from '../data/cards.js';
import { renderPage, renderPulpCover, paintScene } from '../art/comicPage.js';
import { drawCard, TAROT } from '../art/cardArt.js';
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
  if (id === 'shop') renderShop();
  $$('[data-gold]').forEach((x) => { x.textContent = fmt(Save.coins); });
}

document.addEventListener('click', (e) => {
  const go = e.target.closest('[data-go]'), act = e.target.closest('[data-act]'), back = e.target.closest('[data-back]');
  if (go || act || back || e.target.closest('.btn, .naipe button, .mode-card, .chapter')) { Sfx.unlock(); Sfx.play('click'); }
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

// Cada forajido es un naipe gótico: palo e índice en las esquinas, doble marco ornamentado y sello.
const SUIT = { silas: ['K', '♣', false], maeve: ['J', '♠', false], caleb: ['A', '♦', true], barnaby: ['7', '♥', true] };
function petPreview(cv, h, level) {
  const S = petStats(h.id, level), d = dprOf(), W = 96, H = 72;
  cv.width = W * d; cv.height = H * d;
  const x = cv.getContext('2d'); x.scale(d, d);
  const gr = x.createRadialGradient(W / 2, H * 0.7, 4, W / 2, H * 0.7, W * 0.6);
  gr.addColorStop(0, S.tier ? 'rgba(255,180,90,0.35)' : 'rgba(239,226,196,0.15)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = '#1a100a'; x.fillRect(0, 0, W, H); x.fillStyle = gr; x.fillRect(0, 0, W, H);
  x.save(); x.translate(W / 2, H - 6); const k = 0.42 * (0.85 + (S.size - 1) * 0.6); x.scale(k, k); drawPet(x, S.def.id, 1, S.tier); x.restore();
}
function petBlock(h, st) {
  const S = petStats(h.id, st.level), P = S.def;
  return `<div class="blk pet"><canvas data-pet="${h.id}"></canvas><div><b>Mascota · ${P.name}</b><small>${P.kind} · ${PET_TIER[S.tier]}</small>
    <span class="petstats">Daño ${S.dmg} · ${P.attack === 'bolt' ? 'Tinta a distancia' : P.attack === 'swoop' ? 'Picado' : 'Embestida'}${st.petKills ? ' · ☠ ' + fmt(st.petKills) : ''}</span></div></div>`;
}

function renderDossiers() {
  const box = $('#dossiers');
  box.innerHTML = HEROES.map((h, i) => {
    const st = Save.hero(h.id), pct = st.level >= MAX_LEVEL ? 100 : (st.xp / xpForLevel(st.level)) * 100;
    const [rank, suit, red] = SUIT[h.id] || ['A', '♠', false];
    return `<article class="naipe ${red ? 'red' : ''} ${Save.data.hero === h.id ? 'selected' : ''}" style="--rot:${[-1.2, 0.8, -0.6, 1][i]}deg">
      <div class="naipe-in">
        <span class="idx tl">${rank}<i>${suit}</i></span><span class="idx br">${rank}<i>${suit}</i></span>
        <span class="ribbon">EXPEDIENTE Nº ${['047', '113', '666', '208'][i]}</span>
        ${st.level >= 50 ? '<span class="stampmark">LEYENDA</span>' : ''}
        <div class="portrait"><canvas data-portrait="${h.id}"></canvas><span class="suit-wm">${suit}</span></div>
        <h3>${h.name}</h3>
        <div class="badges"><span class="seal">${h.alias}</span><span class="seal blood">${h.temper}</span><span class="seal gold">${SKIN_TIER[st.skin]}</span></div>
        <p class="role">${h.role} · <b>${WEAPONS[st.weapon].name}</b></p>
        <div class="flourish"><span>${suit}</span></div>
        ${petBlock(h, st)}
        <div class="blk pas"><b>Pasiva · ${h.passive.name}</b><p>${h.passive.desc}</p></div>
        <div class="lvl"><b>NV ${st.level}</b><span class="xpbar"><i style="width:${pct}%"></i></span><span>${st.level >= MAX_LEVEL ? 'MÁX' : fmt(st.xp) + '/' + fmt(xpForLevel(st.level))}</span></div>
        <div class="row"><button class="btn small" data-dossier="${h.id}">Abrir dossier</button><button class="btn btn-blood" data-pick="${h.id}">Elegir</button></div>
      </div>
    </article>`;
  }).join('');
  fonts().then(() => {
    $$('canvas[data-portrait]', box).forEach((cv) => {
      const h = heroById(cv.dataset.portrait), d = dprOf(), W = cv.clientWidth || 300, H = W * 0.75;
      cv.width = W * d; cv.height = H * d;
      const x = cv.getContext('2d'); x.scale(d, d);
      paintScene(x, 'hero', 0, 0, W, H, h, heroPal(h));
    });
    $$('canvas[data-pet]', box).forEach((cv) => petPreview(cv, heroById(cv.dataset.pet), Save.hero(cv.dataset.pet).level));
  });
  $$('[data-pick]', box).forEach((b) => b.addEventListener('click', () => { Save.selectHero(b.dataset.pick); Sfx.play('stamp'); show('modes'); }));
  $$('[data-dossier]', box).forEach((b) => b.addEventListener('click', () => openDossier(heroById(b.dataset.dossier))));
}

function openDossier(h) {
  const st = Save.hero(h.id), w = WEAPONS[st.weapon];
  modal(`<h3>${h.name} <small style="font-size:14px">· ${h.alias}</small></h3>
    <canvas class="origin" id="origin"></canvas>
    <p>${h.lore}</p>
    <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:flex-start">
      <canvas id="sigcard" class="tarot" width="200" height="350" style="width:160px;height:280px"></canvas>
      <div style="flex:1;min-width:240px">
        <p><b>Pasiva · ${h.passive.name}:</b> ${h.passive.desc}</p>
        <p><b>Nivel ${st.level}</b> de ${MAX_LEVEL}.</p>
        <p><b>Arma equipada:</b> ${w.name} <span class="dmg">DAÑO ${w.power}</span><br><span style="font-size:13px">${w.desc}</span></p>
        <div class="row" style="justify-content:flex-start"><button class="btn small" data-armory>Abrir la Armería ⚙</button></div>
        <div class="naipe-pet">${petBlock(h, st)}<p class="petdesc">${petStats(h.id, st.level).def.desc} Crece con el nivel del forajido: <b>Curtida</b> en NV 10 y <b>Leyenda</b> en NV 30.</p></div>
      </div>
    </div>
    <p><b>Aspectos</b></p>
    <div class="skins">${h.skins.map((s, i) => { const ok = Save.skinUnlocked(h.id, i); return `<button data-skin="${i}" class="skin ${st.skin === i ? 'on' : ''} ${ok ? '' : 'locked'} tier${i}" ${ok ? '' : 'disabled'}>
      <canvas data-skinart="${i}" width="180" height="200"></canvas>
      <span class="tier">${SKIN_TIER[i]}</span><span class="sname">${s.name}</span>
      <span class="req">${ok ? (st.skin === i ? 'EQUIPADO' : 'Disponible') : '🔒 ' + SKIN_RULES[i].text}</span></button>`; }).join('')}</div>
    <div class="row"><button class="btn" data-close>Cerrar</button><button class="btn btn-blood" data-choose>Elegir a ${h.short}</button></div>`,
  (b, close) => {
    fonts().then(() => {
      const cv = b.querySelector('#origin'), W = Math.min(860, b.clientWidth - 40), H = Math.round(W * (window.innerWidth < 640 ? 1.25 : 0.46));
      renderPage(cv, h.panels, h, heroPal(h), { w: W, h: H, title: 'ORIGEN' });
      cv.style.width = '100%'; cv.style.height = 'auto';
      const sc = b.querySelector('#sigcard'), x = sc.getContext('2d'); drawCard(x, SIGNATURE[h.signature], 200, 350, 0, 'Carta de firma: empieza en tu mano.');
      $$('canvas[data-pet]', b).forEach((cv) => petPreview(cv, h, st.level));
      $$('canvas[data-skinart]', b).forEach((c) => {
        const i = +c.dataset.skinart, x2 = c.getContext('2d');
        const gr = x2.createLinearGradient(0, 0, 0, 200); gr.addColorStop(0, i === 2 ? '#3a0a06' : i === 1 ? '#2a1a10' : '#1a120c'); gr.addColorStop(1, '#0a0605');
        x2.fillStyle = gr; x2.fillRect(0, 0, 180, 200);
        x2.save(); x2.translate(90, 196); x2.scale(0.86, 0.86); drawHero(x2, h.id, h.skins[i].pal, 1, 7); x2.restore();
        if (!Save.skinUnlocked(h.id, i)) { x2.fillStyle = 'rgba(5,3,2,0.72)'; x2.fillRect(0, 0, 180, 200); }
      });
    });
    $$('[data-skin]', b).forEach((x) => x.addEventListener('click', () => { Save.setSkin(h.id, +x.dataset.skin); Sfx.play('stamp'); close(); openDossier(h); renderDossiers(); }));
    b.querySelector('[data-armory]').addEventListener('click', () => { close(); shopHero = h.id; show('shop'); });
    b.querySelector('[data-choose]').addEventListener('click', () => { Save.selectHero(h.id); close(); Sfx.play('stamp'); show('modes'); });
  });
}

// ---------------------------------------------------------------- Armería del Oeste Oculto
let shopHero = null;
function renderShop() {
  const hid = shopHero || Save.data.hero || HEROES[0].id, st = Save.hero(hid);
  shopHero = hid;
  $('#shop-heroes').innerHTML = HEROES.map((x) => `<button class="btn small ${x.id === hid ? 'btn-blood' : ''}" data-shophero="${x.id}">${x.short}</button>`).join('');
  const box = $('#shop');
  let html = '';
  for (const [cid, cat] of Object.entries(CATEGORIES)) {
    const list = WEAPON_LIST.filter((w) => w.cat === cid);
    html += `<section class="cat" style="--cat:${cat.color}"><h3>${cat.name}</h3><p class="catdesc">${cat.desc}</p><div class="guns">`;
    for (const w of list) {
      const own = Save.owns(w.id), eq = st.weapon === w.id, fits = canEquip(w, hid), afford = Save.coins >= w.price;
      const ownerName = w.owner ? heroById(w.owner).short : '';
      const btn = eq ? '<span class="eq">EQUIPADA</span>'
        : own ? (fits ? `<button class="btn small" data-equip="${w.id}">Equipar</button>` : `<span class="na">Solo ${ownerName}</span>`)
        : `<button class="btn small ${afford ? 'btn-blood' : ''}" data-buy="${w.id}" ${afford ? '' : 'disabled'}>Comprar · ${fmt(w.price)} ⛀</button>`;
      html += `<article class="gun ${eq ? 'on' : ''} ${w.legendary ? 'legend' : ''} ${own ? 'owned' : ''}">
        <canvas data-gun="${w.id}"></canvas>
        <div class="ginfo"><b>${w.name}</b>${w.owner ? `<span class="owner">${w.legendary ? 'LEGENDARIA · ' : 'DE SERIE · '}${ownerName}</span>` : ''}
          <span class="desc">${w.desc}</span>
          <span class="stats"><span class="dmg">DAÑO ${w.power}</span> · Cargador ${w.mag} · Recarga ${w.reload}s · Alcance ${w.range}</span></div>
        <div class="gact">${btn}</div></article>`;
    }
    html += '</div></section>';
  }
  box.innerHTML = html;
  const d = dprOf();
  $$('canvas[data-gun]', box).forEach((cv) => {
    const W = 150, H = 70; cv.width = W * d; cv.height = H * d; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    const x = cv.getContext('2d'); x.scale(d, d); drawWeaponIcon(x, WEAPONS[cv.dataset.gun], W, H, 0);
  });
  $$('[data-shophero]').forEach((b) => b.addEventListener('click', () => { Sfx.play('click'); shopHero = b.dataset.shophero; renderShop(); }));
  $$('[data-buy]', box).forEach((b) => b.addEventListener('click', () => {
    const w = WEAPONS[b.dataset.buy];
    if (Save.buy(w.id)) { Sfx.play('buy'); toast('Comprada: ' + w.name); if (canEquip(w, hid)) Save.setWeapon(hid, w.id); show('shop'); }
    else { Sfx.play('deny'); toast('No te llega el Oro Maldito'); }
  }));
  $$('[data-equip]', box).forEach((b) => b.addEventListener('click', () => { if (Save.setWeapon(hid, b.dataset.equip)) { Sfx.play('card'); renderShop(); } }));
  $$('[data-gold]').forEach((x) => { x.textContent = fmt(Save.coins); });
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
  game.start({ mode, mission, hero: h, skin: st.skin, weaponId: st.weapon, level: st.level, settings: Save.data.settings });
  lastRun = { mode, mission };
  Sfx.startMusic();
}
let lastRun = null;

let draftRaf = 0;
function showDraft(choices, reason) {
  const small = window.innerWidth < 640, box = $('#draft-cards'), d = dprOf();
  const W = small ? Math.min(118, Math.floor((window.innerWidth - 96) / 3)) : 200, H = Math.round(W * TAROT);
  $('#draft-title').textContent = reason === 'bonus' ? 'Recompensa: roba una carta' : '¡Nivel ' + game.level + '! Roba una carta';
  box.innerHTML = choices.map((c, i) => `<div class="slot r${c.r}" style="--i:${i}"><canvas class="tarot" data-i="${i}" style="width:${W}px;height:${H}px"></canvas><span>[${i + 1}] ${RARITY[c.r].name}</span></div>`).join('');
  const cvs = $$('canvas', box);
  cvs.forEach((cv) => { cv.width = W * d; cv.height = H * d; });
  const t0 = performance.now();
  const loop = () => {
    draftRaf = requestAnimationFrame(loop);
    const t = (performance.now() - t0) / 1000;
    cvs.forEach((cv, i) => { const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, W, H); drawCard(x, choices[i], W, H, t, choices[i].t === 'action' && game.hand.every((hh) => hh) ? 'Mano llena: sustituirá tu carta de menor rareza.' : ''); });
    if (choices.every((c) => c.r < 2)) cancelAnimationFrame(draftRaf);
  };
  loop();
  $('#draft').classList.remove('hidden');
  const pick = (i) => {
    if (!choices[i]) return;
    cancelAnimationFrame(draftRaf); window.removeEventListener('keydown', onKey);
    const rect = cvs[i].getBoundingClientRect();
    $('#draft').classList.add('hidden');
    Sfx.play(choices[i].r === 4 ? 'curse' : 'card');
    game.takeCard(choices[i]);
    // la carta "se juega": estallido de tinta y pólvora en su posición
    game.uiBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, RARITY[choices[i].r].glow, 60, true);
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
  const skinsBefore = h.skins.map((_, i) => Save.skinUnlocked(h.id, i));
  const gain = Save.addXp(h.id, r.profileXp, r.kills);
  Save.addCoins(r.gold || 0);
  Save.addPetKills(h.id, r.petKills || 0);
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
  const unl = h.skins.map((s, i) => (!skinsBefore[i] && Save.skinUnlocked(h.id, i) ? `<div class="unlock"><b>¡Aspecto ${SKIN_TIER[i]} desbloqueado!</b><br>${s.name} · equípalo desde el dossier.</div>` : '')).join('');
  const mi = r.missionId ? MISSIONS.findIndex((x) => x.id === r.missionId) : -1;
  const next = r.mode === 'story' && r.win && MISSIONS[mi + 1];
  const mm = Math.floor(r.time / 60) + ':' + String(Math.floor(r.time % 60)).padStart(2, '0');
  const head = r.mode === 'survival' ? `${h.short.toUpperCase()} CAE EN LA RONDA ${r.round}` : r.win ? `¡${h.short.toUpperCase()} CIERRA EL CASO!` : `TRAGEDIA PARA ${h.short.toUpperCase()}`;
  const mName = mi >= 0 ? MISSIONS[mi].name : 'El Cruce de los Condenados';
  const lede = r.mode === 'survival'
    ? `El forajido resistió ${mm} en el Cruce y dejó ${fmt(r.kills)} muertos vivientes de vuelta en sus tumbas antes de que la tinta le alcanzara.`
    : r.win ? `Tras ${mm} de plomo y pólvora, «${mName}» queda resuelto. Los vecinos vuelven a encender los faroles.`
      : `«${mName}» sigue abierto. El forajido no volvió de la noche, y la horda celebra con un gruñido.`;
  $('#end-info').innerHTML = `
    <div class="gazette">
      <div class="g-mast"><span>Año 1879 · Edición nocturna</span><b>LA GACETA DE TINTA</b><span>Precio: un alma</span></div>
      <div class="g-rule"></div>
      <h2 class="g-head">${head}</h2>
      <p class="g-lede"><b>${mName.toUpperCase()}.</b> ${lede}</p>
      <div class="g-cols">
        <dl>
          ${r.mode === 'survival' ? `<dt>Ronda alcanzada</dt><dd>${r.round}</dd>` : ''}
          <dt>Zombis abatidos</dt><dd>☠ ${fmt(r.kills)}</dd>
          <dt>Bajas de ${r.petName || 'la mascota'}</dt><dd>🐾 ${fmt(r.petKills || 0)}</dd>
          <dt>Tiempo</dt><dd>${mm}</dd>
          <dt>Mejor mano</dt><dd>${r.bestHand || '—'}</dd>
          <dt>Cartas en el mazo</dt><dd>${r.deck}</dd>
        </dl>
        <dl>
          <dt>XP ganada</dt><dd>+${fmt(r.profileXp)}</dd>
          <dt>${h.short}</dt><dd>NV ${st.level}${gain.levelsGained ? ' (+' + gain.levelsGained + ')' : ''}</dd>
          <dt>Oro Maldito</dt><dd>+${fmt(r.gold || 0)} ⛀</dd>
          <dt>Bolsa total</dt><dd>${fmt(Save.coins)} ⛀</dd>
        </dl>
      </div>
      ${rank >= 0 ? `<p class="g-note">Su nombre queda grabado en el Muro de los Condenados: <b>puesto ${rank + 1}</b>.</p>` : ''}
      ${unl}
      <div class="g-rule thin"></div>
      <div class="row center">
        <button class="btn btn-blood" data-end="retry">Otra vez</button>
        ${next ? '<button class="btn" data-end="next">Siguiente caso ▶</button>' : ''}
        <button class="btn" data-end="modes">Modos</button>
        <button class="btn" data-end="shop">Armería</button>
        ${r.mode === 'survival' ? '<button class="btn" data-end="records">El Muro</button>' : ''}
      </div>
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
window.__tinta = { game, Save, HEROES, MISSIONS, CARDS, WEAPONS }; // gancho de depuración (pruebas automáticas)
