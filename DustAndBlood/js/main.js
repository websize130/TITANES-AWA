// Controlador de interfaz: menús, Cartas Vivas, Guardarropa Maldito, Mapa de Campaña, Armería, resumen y partida.
import { Save } from './core/save.js';
import { InGameLock, initAds, fillAds } from './core/adlock.js';
import { Input } from './core/input.js';
import { Sfx } from './core/audio.js';
import { HEROES, heroById } from './data/heroes.js';
import { WEAPONS, weaponById, upgradeCost } from './data/weapons.js';
import { SCENARIOS, ALL_MISSIONS, missionById, REPLAY_FACTOR } from './data/campaign.js';
import { VanguardCard } from './art/cards.js';
import { drawWeaponIcon } from './art/propArt.js';
import { Game, computeReward } from './game/game.js';
import { applyUpgrade } from './game/combat.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const fmt = (n) => Math.round(n).toLocaleString('es-ES');

// ---------------------------------------------------------------- utilidades UI
let toastT = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200);
}

function modal(html, onBind) {
  const m = $('#modal'), box = $('#modal-box');
  box.innerHTML = html;
  m.classList.remove('hidden');
  const close = () => m.classList.add('hidden');
  m.onclick = (e) => { if (e.target === m) close(); };
  $$('[data-close]', box).forEach((b) => b.addEventListener('click', () => { Sfx.play('click'); close(); }));
  onBind && onBind(box, close);
  return close;
}

function confirmBuy(title, text, price, onYes) {
  const can = Save.coins >= price;
  modal(`<h3>${title}</h3><p>${text}</p>
    <p>Precio: <b style="color:var(--gold-hi)">${fmt(price)}</b> monedas · Tienes <b>${fmt(Save.coins)}</b></p>
    <div class="row"><button class="btn small" data-close>Cancelar</button>
    <button class="btn btn-gold small" data-yes ${can ? '' : 'disabled'}>${can ? 'Comprar' : 'Oro insuficiente'}</button></div>`,
  (box, close) => box.querySelector('[data-yes]').addEventListener('click', () => { close(); onYes(); }));
}

function updateCoins() { $$('[data-coins]').forEach((el) => { el.textContent = fmt(Save.coins); }); }
Save.onChange(updateCoins);

// ---------------------------------------------------------------- pantallas
let current = 'main';
function showScreen(id) {
  current = id;
  $$('.screen').forEach((s) => s.classList.toggle('active', s.id === 'screen-' + id));
  window.scrollTo(0, 0);
  if (id === 'main') { layoutCards(); startCards(); } else stopCards();
  if (id === 'map') renderMap();
  if (id === 'armory') renderArmory();
  requestAnimationFrame(() => fillAds($('#screen-' + id)));
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-action]');
  if (!b) return;
  Sfx.unlock();
  const a = b.dataset.action;
  switch (a) {
    case 'campaign': Sfx.play('click'); showScreen('map'); break;
    case 'armory': Sfx.play('click'); showScreen('armory'); break;
    case 'back': Sfx.play('click'); showScreen('main'); break;
    case 'settings': Sfx.play('click'); openSettings(); break;
    case 'resume': game.pause(false); break;
    case 'abandon': $('#pause').classList.add('hidden'); game.state = 'play'; game.finish(false, 'Has abandonado la misión.'); break;
    case 'toggle-sound': Save.setSetting('sound', !Save.data.settings.sound); applySettings(); break;
    case 'toggle-aim': Save.setSetting('aim', Save.data.settings.aim === 'auto' ? 'mouse' : 'auto'); applySettings(); break;
    default: break;
  }
});

function applySettings() {
  const s = Save.data.settings;
  Sfx.setEnabled(s.sound); Sfx.setMusic(s.music);
  $$('[data-sound]').forEach((el) => { el.textContent = s.sound ? 'Sí' : 'No'; });
  $$('[data-aim]').forEach((el) => { el.textContent = s.aim === 'auto' ? 'Auto' : 'Ratón'; });
}

function openSettings() {
  const s = Save.data.settings;
  modal(`<h3>Ajustes</h3>
    <div class="setting"><span>Efectos de sonido</span><button class="btn small" data-k="sound">${s.sound ? 'Sí' : 'No'}</button></div>
    <div class="setting"><span>Música</span><button class="btn small" data-k="music">${s.music ? 'Sí' : 'No'}</button></div>
    <div class="setting"><span>Apuntado en PC</span><button class="btn small" data-k="aim">${s.aim === 'auto' ? 'Automático' : 'Con ratón'}</button></div>
    <div class="setting"><span>Temblor de pantalla</span><button class="btn small" data-k="shake">${s.shake ? 'Sí' : 'No'}</button></div>
    <div class="setting"><span>Estadísticas</span><span class="chip">☠ ${fmt(Save.data.stats.kills)} bajas · ${Save.data.stats.runs} misiones · ${Save.data.stats.bosses} jefes</span></div>
    <div class="setting"><span>Borrar progreso</span><button class="btn small btn-red" data-reset>Reiniciar</button></div>
    <p style="font-size:12px">Controles PC: WASD/flechas mover · ratón apuntar · Q o clic derecho: habilidad · Espacio: Racha de Pólvora · Esc: pausa.<br>
    Móvil: arrastra en cualquier punto para el joystick · botones a la derecha.</p>
    <div class="row"><button class="btn btn-gold small" data-close>Cerrar</button></div>`,
  (box, close) => {
    $$('[data-k]', box).forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.k;
      if (k === 'aim') Save.setSetting('aim', s.aim === 'auto' ? 'mouse' : 'auto');
      else Save.setSetting(k, !s[k]);
      applySettings(); Sfx.play('click'); close(); openSettings();
    }));
    box.querySelector('[data-reset]').addEventListener('click', () => {
      if (confirm('¿Seguro? Se perderán monedas, armas, skins y misiones.')) { Save.reset(); close(); buildCards(); updateCoins(); toast('Progreso reiniciado'); }
    });
  });
}

// ---------------------------------------------------------------- Cartas Vivas
const cards = [];
let cardRaf = 0, cardLast = 0, cardTime = 0;

function buildCards() {
  const wrap = $('#cards');
  wrap.innerHTML = '';
  cards.length = 0;
  HEROES.forEach((h) => {
    const el = document.createElement('div');
    el.className = 'card-wrap';
    el.innerHTML = `<canvas class="card" aria-label="${h.name}"></canvas>
      <div class="skins">${h.skins.map((s, i) => `<button class="gem" data-i="${i}" title="${s.name}${s.price ? ' — ' + s.price + ' monedas' : ''}" style="--c:${s.pal.primary}"></button>`).join('')}</div>
      <div class="skin-name"></div>`;
    wrap.appendChild(el);
    const card = new VanguardCard(h, el.querySelector('canvas'));
    card.el = el;
    card.setSkin(Save.skinOf(h.id).equipped);
    cards.push(card);
    const cv = el.querySelector('canvas');
    cv.addEventListener('pointermove', (e) => {
      const r = cv.getBoundingClientRect();
      card.hover = true;
      card.pointer(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
    });
    cv.addEventListener('pointerleave', () => { card.hover = false; });
    cv.addEventListener('click', () => { Sfx.unlock(); Sfx.play('click'); Save.selectHero(h.id); refreshCards(); el.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' }); });
    $$('.gem', el).forEach((g) => g.addEventListener('click', () => onGem(h, +g.dataset.i)));
  });
  refreshCards();
}

function onGem(h, i) {
  Sfx.unlock();
  const skin = h.skins[i];
  if (Save.ownsSkin(h.id, i)) { Save.equipSkin(h.id, i); Sfx.play('click'); refreshCards(); return; }
  confirmBuy(`Guardarropa Maldito`, `Aspecto <b>${skin.name}</b> para ${h.name}. Cambia colores, aura, partículas y disparos.`, skin.price, () => {
    if (Save.buySkin(h.id, i, skin.price)) { Sfx.play('buy'); toast(`¡${skin.name} desbloqueado!`); refreshCards(); }
    else { Sfx.play('deny'); toast('No tienes suficiente oro maldito'); }
  });
}

function refreshCards() {
  const sel = Save.data.hero;
  cards.forEach((c) => {
    const st = Save.skinOf(c.hero.id);
    c.setSkin(st.equipped);
    c.selected = c.hero.id === sel;
    c.el.classList.toggle('selected', c.selected);
    c.el.style.setProperty('--glow', c.pal.glow);
    $$('.gem', c.el).forEach((g, i) => {
      g.classList.toggle('equipped', i === st.equipped);
      g.classList.toggle('locked', !st.owned.includes(i));
    });
    const sk = c.hero.skins[st.equipped];
    c.el.querySelector('.skin-name').textContent = sk.name;
  });
  renderHeroInfo();
}

function renderHeroInfo() {
  const h = heroById(Save.data.hero);
  const pips = (n) => `<span class="pips">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
  const w = weaponById(Save.data.weapon);
  $('#hero-info').innerHTML = `
    <h3>${h.name}<small>${h.title} · ${h.role}</small></h3>
    <p class="full">${h.desc}</p>
    <div class="ability"><b>${h.ability.name}</b>${h.ability.desc} <kbd>Q</kbd> <kbd>${h.ability.cd}s</kbd></div>
    <div class="ability"><b>★ ${h.ultimate.name}</b>${h.ultimate.desc} <kbd>Racha llena + Espacio</kbd></div>
    <div class="statbars">
      <span>Vida</span>${pips(h.bars.vida)}<span>Velocidad</span>${pips(h.bars.velocidad)}
      <span>Daño</span>${pips(h.bars.daño)}<span>Control</span>${pips(h.bars.control)}
    </div>
    <p>Arma equipada: <b style="color:var(--gold-hi)">${w.name} ${w.nick}</b> · Nv ${Save.weaponState(w.id).level}<br>
    <span style="font-size:12px;color:var(--muted)">La <b>Racha de Pólvora</b> se llena encadenando bajas: multiplica el oro (x1.5 · x2 · x3) y al completarse desata la definitiva.</span></p>`;
}

function layoutCards() {
  const W = Math.min(window.innerWidth, 1180) - 32;
  const mobile = window.innerWidth < 720;
  let cw = mobile ? Math.min(250, window.innerWidth * 0.68) : Math.min(250, (W - 18 * 3) / 4);
  cw = Math.max(160, Math.floor(cw));
  const ch = Math.floor(cw * 1.5);
  cards.forEach((c) => { if (c.W !== cw) c.resize(cw, ch); });
}

function startCards() {
  if (cardRaf) return;
  cardLast = performance.now();
  const loop = (ts) => {
    cardRaf = requestAnimationFrame(loop);
    const dt = Math.min(0.05, (ts - cardLast) / 1000); cardLast = ts; cardTime += dt;
    for (const c of cards) {
      c.update(dt, cardTime);
      c.render(cardTime);
      const tilt = `rotateY(${(c.px * 10).toFixed(2)}deg) rotateX(${(-c.py * 8).toFixed(2)}deg) translateZ(0)`;
      if (c._tilt !== tilt) { c._tilt = tilt; c.canvas.style.transform = tilt; }
    }
  };
  cardRaf = requestAnimationFrame(loop);
}
function stopCards() { cancelAnimationFrame(cardRaf); cardRaf = 0; }
window.addEventListener('resize', () => { if (current === 'main') layoutCards(); });

// ---------------------------------------------------------------- Mapa de Campaña
function missionUnlocked(m) { return m.index === 0 || Save.missionDone(ALL_MISSIONS[m.index - 1].id); }

const OBJ_ICON = { survive: '⏳', infinite: '♾', destroy: '🪓', defend: '🛡', purify: '✝', elites: '🎯', collect: '💎', bridge: '🌉', boss: '☠' };
const MOD_NAME = { night: '🌑 Noche', fog: '🌫 Niebla densa', meteors: '☄ Meteoritos', carts: '🛤 Vagonetas', storm: '⛈ Tormenta', noHeal: '🚫 Sin curaciones', bloodmoon: '🩸 Luna de sangre', dark: '🕯 Oscuridad' };

function renderMap() {
  const box = $('#scenarios');
  box.innerHTML = SCENARIOS.map((s, si) => {
    const open = missionUnlocked(s.missions[0]);
    const done = s.missions.filter((m) => Save.missionDone(m.id)).length;
    return `<article class="scenario ${open ? '' : 'locked'}" style="--sc:${s.color}">
      <h3><span class="sc-num">${['I', 'II', 'III', 'IV'][si]}</span>${s.name} <small style="font-size:13px;color:var(--muted)">${done}/${s.missions.length}</small></h3>
      <p>${s.desc}</p>
      <div class="trail">${s.missions.map((m, mi) => {
        const unlocked = missionUnlocked(m), isDone = Save.missionDone(m.id);
        const cls = ['node', m.boss ? 'boss' : '', isDone ? 'done' : '', unlocked && !isDone ? 'next' : '', unlocked ? '' : 'locked'].join(' ');
        const rew = isDone ? Math.round(m.reward * REPLAY_FACTOR) : m.reward;
        return `${mi ? '<span class="link"></span>' : ''}<button class="${cls}" data-mission="${m.id}" ${unlocked ? '' : 'aria-disabled="true"'}>
          <span class="n-idx">${OBJ_ICON[m.obj.type]} M${mi + 1}</span><span class="n-name">${m.name}</span>
          <span class="n-rew"><i class="coin"></i>${fmt(rew)}</span></button>`;
      }).join('')}</div></article>`;
  }).join('');
  $$('[data-mission]', box).forEach((b) => b.addEventListener('click', () => {
    const m = missionById(b.dataset.mission);
    if (!missionUnlocked(m)) { Sfx.play('deny'); toast('Completa la misión anterior primero'); return; }
    Sfx.play('click');
    briefing(m);
  }));
}

function briefing(m) {
  const h = heroById(Save.data.hero), skin = h.skins[Save.skinOf(h.id).equipped];
  const w = weaponById(Save.data.weapon), wl = Save.weaponState(w.id).level;
  const done = Save.missionDone(m.id);
  const rew = done ? Math.round(m.reward * REPLAY_FACTOR) : m.reward;
  modal(`<h3>${m.boss ? '☠ ' : ''}${m.name}</h3>
    <div class="meta"><span class="chip">${m.scenario.name}</span><span class="chip">${OBJ_ICON[m.obj.type]} ${m.obj.type === 'boss' ? 'Jefe' : 'Misión'} ${m.mi + 1}</span>
    ${(m.mods || []).map((x) => `<span class="chip warn">${MOD_NAME[x]}</span>`).join('')}</div>
    <p>${m.brief}</p>
    <p>Recompensa: <b style="color:var(--gold-hi)">${fmt(rew)}</b> monedas ${done ? '(rejugada)' : ''} + el oro que recojas (multiplicado por tu Racha de Pólvora).</p>
    <p style="font-size:13px">Vanguardia: <b>${h.name}</b> (${skin.name}) · Arma: <b>${w.name} ${w.nick}</b> Nv ${wl}</p>
    <div class="row"><button class="btn small" data-close>Cancelar</button><button class="btn small" data-hero>Cambiar héroe</button>
    <button class="btn btn-gold" data-go>¡A la batalla!</button></div>`,
  (box, close) => {
    box.querySelector('[data-go]').addEventListener('click', () => { close(); startMission(m); });
    box.querySelector('[data-hero]').addEventListener('click', () => { close(); showScreen('main'); });
  });
}

// ---------------------------------------------------------------- Armería
function renderArmory() {
  const box = $('#weapons');
  const maxDmg = 140, maxRate = 24, maxRange = 900;
  box.innerHTML = WEAPONS.map((w) => {
    const st = Save.weaponState(w.id), L = w.levels[st.level - 1];
    const equipped = Save.data.weapon === w.id;
    const dps = L.dmg * (L.count || 1) * L.rate;
    const meter = (v, max) => `<span class="meter"><i style="width:${Math.min(100, (v / max) * 100)}%"></i></span>`;
    let actions = '';
    if (!st.owned) actions = `<button class="btn btn-gold" data-buy="${w.id}"><i class="coin" style="width:14px;height:14px;vertical-align:-2px"></i> Comprar ${fmt(w.price)}</button>`;
    else {
      actions += equipped ? '<span class="tag">✔ Equipada</span>' : `<button class="btn" data-equip="${w.id}">Equipar</button>`;
      actions += st.level < 5 ? `<button class="btn btn-gold" data-up="${w.id}">Mejorar a Nv ${st.level + 1} · ${fmt(upgradeCost(w, st.level))}</button>` : '<span class="tag" style="background:#7a5a1a">Nivel máximo</span>';
    }
    const nextPerk = st.level < 5 ? `Próxima mejora: ${w.perks[st.level]}` : '¡Arma legendaria al máximo!';
    return `<article class="weapon ${equipped ? 'equipped' : ''}">
      <canvas data-icon="${w.id}" width="260" height="140"></canvas>
      <div><h4>${w.name}<small>${w.nick}</small></h4>
        <div class="w-lvl">${[1, 2, 3, 4, 5].map((i) => `<i class="${st.owned && i <= st.level ? 'on' : ''}"></i>`).join('')}
        <span style="font-size:12px;color:var(--muted);margin-left:6px">${st.owned ? 'Nv ' + st.level : 'Bloqueada'}</span></div></div>
      <p>${w.desc}</p>
      <div class="w-stats">
        <span>Daño</span>${meter(L.dmg * (L.count || 1), maxDmg)}<b>${L.dmg}${L.count > 1 ? '×' + L.count : ''}</b>
        <span>Cadencia</span>${meter(L.rate, maxRate)}<b>${L.rate}/s</b>
        <span>Alcance</span>${meter(L.range, maxRange)}<b>${L.range}</b>
        <span>DPS</span>${meter(dps, 400)}<b>${Math.round(dps)}</b>
      </div>
      <div class="w-perk">${st.owned ? nextPerk : 'Gratis al comprar: Nv 1'}</div>
      <div class="w-actions">${actions}</div>
    </article>`;
  }).join('');
  $$('canvas[data-icon]', box).forEach((c) => { const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); drawWeaponIcon(x, c.dataset.icon, c.width, c.height, 0); });
  $$('[data-buy]', box).forEach((b) => b.addEventListener('click', () => {
    const w = weaponById(b.dataset.buy);
    confirmBuy('Armería del Forajido', `<b>${w.name} ${w.nick}</b>: ${w.desc}`, w.price, () => {
      if (Save.buyWeapon(w)) { Sfx.play('buy'); toast(`¡${w.name} comprada y equipada!`); renderArmory(); renderHeroInfo(); }
      else { Sfx.play('deny'); toast('No tienes suficiente oro maldito'); }
    });
  }));
  $$('[data-up]', box).forEach((b) => b.addEventListener('click', () => {
    const w = weaponById(b.dataset.up), st = Save.weaponState(w.id), cost = upgradeCost(w, st.level);
    if (Save.upgradeWeapon(w.id, cost)) { Sfx.play('buy'); toast(`${w.name} sube a Nv ${st.level}`); renderArmory(); renderHeroInfo(); }
    else { Sfx.play('deny'); toast(`Necesitas ${fmt(cost)} monedas`); }
  }));
  $$('[data-equip]', box).forEach((b) => b.addEventListener('click', () => { Save.equipWeapon(b.dataset.equip); Sfx.play('click'); renderArmory(); renderHeroInfo(); }));
}

// ---------------------------------------------------------------- Partida
const gameRoot = $('#game-root');
const canvas = $('#game');
const input = new Input(canvas);
const game = new Game(canvas, input, {
  onEnd: (r) => endMission(r),
  onLevelUp: (choices) => showLevelUp(choices),
  onPause: (v) => { $('#pause').classList.toggle('hidden', !v); applySettings(); },
});

let fontsReady = null;
function ensureFonts() {
  if (!fontsReady) fontsReady = Promise.race([
    Promise.all([document.fonts.load('20px Rye'), document.fonts.load('20px "Special Elite"')]).catch(() => null),
    new Promise((r) => setTimeout(r, 1500)),
  ]);
  return fontsReady;
}

async function startMission(m) {
  Sfx.unlock();
  await ensureFonts();
  stopCards();
  InGameLock.lock();
  gameRoot.classList.remove('hidden');
  $('#levelup').classList.add('hidden'); $('#pause').classList.add('hidden');
  if (input.isTouch && document.documentElement.requestFullscreen && !document.fullscreenElement) {
    document.documentElement.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
  }
  game.resize();
  const h = heroById(Save.data.hero);
  game.start({
    mission: m, hero: h, skin: Save.skinOf(h.id).equipped,
    weaponId: Save.data.weapon, weaponLvl: Save.weaponState(Save.data.weapon).level,
    settings: Save.data.settings,
  });
  Sfx.startMusic();
}

function showLevelUp(choices) {
  const box = $('#upgrade-list');
  box.innerHTML = choices.map((u, i) => `<button class="upgrade" data-i="${i}"><span class="u-icon">${u.icon}</span>
    <span class="u-name">${u.name}</span><span class="u-desc">${u.desc}</span><br><span class="u-key">${i + 1}</span></button>`).join('');
  $('#levelup').classList.remove('hidden');
  const pick = (i) => {
    if (!choices[i]) return;
    window.removeEventListener('keydown', onKey);
    applyUpgrade(game, choices[i]);
    Sfx.play('click');
    $('#levelup').classList.add('hidden');
    game.resumeFromLevelUp();
  };
  const onKey = (e) => { const n = parseInt(e.key, 10); if (n >= 1 && n <= 3) pick(n - 1); };
  window.addEventListener('keydown', onKey);
  $$('.upgrade', box).forEach((b) => b.addEventListener('click', () => pick(+b.dataset.i)));
}

function endMission(r) {
  Sfx.stopMusic();
  const m = missionById(r.missionId);
  const already = Save.missionDone(m.id);
  const reward = computeReward(r, m, already);
  const total = r.coinsRun + reward;
  Save.addCoins(total);
  if (r.win) Save.completeMission(m.id, r);
  Save.addStats(r.kills, r.win && m.boss);
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  gameRoot.classList.add('hidden');
  $('#levelup').classList.add('hidden'); $('#pause').classList.add('hidden');
  InGameLock.unlock();

  const next = ALL_MISSIONS[m.index + 1];
  const unlockedNext = r.win && !already && next;
  const scenarioDone = r.win && !already && m.boss;
  $('#summary').innerHTML = `
    <p class="chip" style="display:inline-block">${m.scenario.name} · M${m.mi + 1}</p>
    <h2 class="verdict ${r.win ? 'win' : 'lose'}">${r.win ? '¡Victoria!' : 'Derrota'}</h2>
    <p class="reason">${r.win ? m.name + ' completada.' : (r.reason || 'El Oeste se cobra otra alma.')}</p>
    <dl>
      <dt>Tiempo</dt><dd>${Math.floor(r.time / 60)}:${String(Math.floor(r.time % 60)).padStart(2, '0')}</dd>
      <dt>Enemigos abatidos</dt><dd>☠ ${fmt(r.kills)}</dd>
      <dt>Mejor racha</dt><dd>${fmt(r.bestCombo)} bajas</dd>
      <dt>Nivel alcanzado</dt><dd>${r.level}</dd>
      <dt>Oro recogido</dt><dd>${fmt(r.coinsRun)}</dd>
      <dt>Recompensa de misión</dt><dd>${r.win ? fmt(reward) + (already ? ' (60%)' : '') : '—'}</dd>
      <dt class="total">Total ganado</dt><dd class="total">+${fmt(total)}</dd>
    </dl>
    ${scenarioDone ? `<p style="color:var(--gold-hi)">★ ¡Escenario superado! ${next ? 'Se abre: ' + next.scenario.name : '¡Has purgado el Oeste Oculto!'}</p>` : ''}
    ${unlockedNext && !scenarioDone ? `<p style="color:var(--amber)">Nueva misión desbloqueada: ${next.name}</p>` : ''}
    <div class="actions">
      <button class="btn" data-sum="retry">↻ Reintentar</button>
      ${r.win && next ? '<button class="btn btn-gold" data-sum="next">Siguiente misión ▶</button>' : ''}
      <button class="btn" data-sum="map">Mapa</button>
      <button class="btn" data-sum="armory">Armería</button>
    </div>`;
  $$('[data-sum]', $('#summary')).forEach((b) => b.addEventListener('click', () => {
    Sfx.play('click');
    const a = b.dataset.sum;
    if (a === 'retry') briefing(m);
    else if (a === 'next') { showScreen('map'); briefing(next); }
    else showScreen(a);
  }));
  showScreen('summary');
}

document.addEventListener('visibilitychange', () => { if (document.hidden && game.running) game.pause(true); });
window.addEventListener('blur', () => { if (game.running) game.pause(true); });

// ---------------------------------------------------------------- arranque
initAds();
applySettings();
updateCoins();
buildCards();
ensureFonts().then(() => cards.forEach((c) => c.W && c.rebuild()));
showScreen('main');

// Atajo de depuración: ?gold=5000 añade oro (solo para pruebas locales)
const qs = new URLSearchParams(location.search);
if (qs.has('gold') && /^(localhost|127\.0\.0\.1)$/.test(location.hostname)) { Save.addCoins(+qs.get('gold') || 0); }
window.__dustblood = { game, Save };
