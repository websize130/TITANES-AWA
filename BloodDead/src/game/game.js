import * as THREE from 'three';
import { $, IS_TOUCH, TAU, clamp, damp, nextFrame } from '../core/utils.js';
import { hydrateIcons } from '../ui/icons.js';
import { CONFIG, QUALITY } from '../data/config.js';
import { CHARACTERS } from '../data/characters.js';
import { WEAPONS } from '../data/weapons.js';
import { CHAPTERS, LEVELS, SURVIVAL } from '../data/levels.js';
import { Settings } from '../core/settings.js';
import { EventBus } from '../core/events.js';
import { TextureFactory } from '../render/textures.js';
import { MaterialLibrary } from '../render/materials.js';
import { CharacterFactory } from '../characters/characterFactory.js';
import { Engine } from '../render/engine.js';
import { MenuStage } from '../scene/menuStage.js';
import { World } from '../world/world.js';
import { Lighting } from '../render/lighting.js';
import { Effects } from '../render/effects.js';
import { Player } from '../player/player.js';
import { Input, PadInput } from '../input/input.js';
import { Pads } from '../input/pads.js';
import { RemoteLink } from '../net/remoteLink.js';
import { AudioSystem } from '../audio/audioSystem.js';
import { ZombieFactory } from '../zombies/zombieFactory.js';
import { ZombieSystem } from '../zombies/zombieSystem.js';
import { WeaponSystem } from '../weapons/weaponSystem.js';
import { InteractSystem } from './interactSystem.js';
import { StoryMode, SurvivalMode, fmtClock } from './modes.js';
import { HUD, HudLite } from '../ui/hud.js';
import { Cinematic } from '../ui/cinematic.js';
import { UI } from '../ui/ui.js';

/* =====================================================================
   JUEGO: orquesta estados (boot → menú → jugando ⇄ pausa) y sistemas.
   Uno o dos jugadores (dúo local): el jugador 2 se precarga inactivo y al unirse
   la pantalla se divide en horizontal (arriba J1, abajo J2) sin recompilar shaders.
   ===================================================================== */
export class Game {
  constructor() {
    hydrateIcons();
    Settings.load();
    document.body.dataset.touch = IS_TOUCH ? '1' : '0';
    this.events = new EventBus(); this.clock = new THREE.Clock(); this.time = 0;
    this.qName = Settings.quality();
    this.engine = new Engine($('#scene'), this.qName);
    this.audio = new AudioSystem();
    this.selected = CHARACTERS[0]; this.selectedStats = { ...CHARACTERS[0].stats };
    this.menu = null; this.scene = null; this.camera = null; this.camera2 = null; this.world = null; this.mode = null; this.interact = null; this.lighting = null; this.hud = null; this.hud2 = null;
    this.players = []; this.split = false; this.p2Pad = null; this.remoteTarget = 'p2'; this.flash = null;
    this.modeKind = 'story'; this.chapterIdx = 0; this.fogBase = 0.05;
    this.systems = []; this.needsRender = false; this.fpsAcc = 0; this.fpsFrames = 0; this.pausedAt = 0; this.disableCSM = false;
    this.setState('boot');
    this.ui = new UI(this);
    this.input = new Input(this);
    this.pads = new Pads(this); this.remote = new RemoteLink(this); this.cine = new Cinematic(this);
    this.applyTv();
    addEventListener('resize', () => this.onResize());
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.state === 'playing') this.pause(); });
    const first = () => { if (this.audio.ensure()) this.audio.startAmbience(); };
    addEventListener('pointerdown', first, { once: true }); addEventListener('keydown', first, { once: true });
    this.events.on('player:step', (e) => this.audio.footstep(e.running));
    this.events.on('flashlight:toggle', () => { this.audio.click(); if (this.player) $('#tLight').classList.toggle('on', this.player.flashlight.on); });
    this.events.on('flashlight:flicker', () => this.audio.click());
    this.events.on('player:died', (e) => { this.audio.hurt(); this.audio.thud(0, 0.8); if (e.player) { e.player.rig.shake(0.08, 0.5); e.player.respawnT = 0; this.pads.rumble(e.player, 1, 1, 500); } });
    this.events.on('interact:used', (e) => { if (this.mode && e.kind === 'objective') this.mode.onUse && this.mode.onUse(e.id); });
  }
  // Atajos al jugador 1 (compatibilidad con los sistemas de un jugador)
  get player() { return this.players[0] || null; }
  get rig() { return this.players[0] ? this.players[0].rig : null; }
  get weapons() { return this.players[0] ? this.players[0].weapons : null; }
  get activePlayers() { return this.players.filter((p) => p.active); }
  setState(s) { this.state = s; document.body.dataset.state = s; }
  applyTv() { document.body.classList.toggle('tv', !!Settings.data.tv); }
  async boot() {
    try {
      await TextureFactory.generateAll((p, t) => this.ui.setBoot(0.08 + p * 0.6, t));
      this.ui.setBoot(0.7, 'Esculpiendo anatomía…'); await nextFrame();
      CharacterFactory.prepareShared();
      for (let i = 0; i < CHARACTERS.length; i++) { // rostros y cuerpos: una vez por personaje (se cachean)
        this.ui.setBoot(0.72 + (0.16 * i) / CHARACTERS.length, `Esculpiendo rostro · ${CHARACTERS[i].name}`); await nextFrame();
        CharacterFactory.build(CHARACTERS[i]);
      }
      this.ui.setBoot(0.885, 'Esculpiendo infectados…'); await nextFrame();
      ZombieFactory.prepare();
      this.ui.setBoot(0.9, 'Preparando escenario…'); await nextFrame();
      this.envMap = this.engine.buildEnvironment();
      this.hud = new HUD(this); this.hud2 = new HudLite(this);
      this.menu = new MenuStage(this);
      this.selectCharacter(Settings.data.lastChar || 'alex');
      this.ui.setBoot(1, 'Listo'); await nextFrame();
      this.showTitle();
      this.loop();
    } catch (err) {
      console.error(err);
      this.ui.setBoot(1, 'No se pudo iniciar el motor 3D. Prueba con un navegador actualizado.');
    }
  }
  selectCharacter(id) {
    const def = CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
    this.selected = def;
    this.selectedStats = { ...def.stats }; // estadísticas reales que usará el jugador
    Settings.data.lastChar = def.id; Settings.save();
    this.ui.renderDetail(def, this.selectedStats);
    if (this.menu) this.menu.setCharacter(def);
    if (this.audio.ctx) this.audio.click();
    this.events.emit('character:selected', { def, stats: this.selectedStats });
  }
  get selected2() { const i = CHARACTERS.indexOf(this.selected); return CHARACTERS[(i + 1) % CHARACTERS.length]; } // el compañero lleva al siguiente personaje
  showTitle() {
    this.setState('title'); $('#select').hidden = true; $('#title').hidden = false; this.ui.hideBoot();
    this.ui.renderTitleInfo(); this.ui.showChapters(false);
    requestAnimationFrame(() => this.layoutMenu());
  }
  chooseMode(kind, idx = 0) {
    this.modeKind = kind; this.chapterIdx = clamp(idx, 0, CHAPTERS.length - 1);
    $('#modeBadge').textContent = kind === 'survival' ? 'Modo Supervivencia' : `Historia · Capítulo ${this.chapterIdx + 1}: ${CHAPTERS[this.chapterIdx].title}`;
    if (this.audio.ctx) this.audio.click();
    this.showMenu();
  }
  showMenu() {
    this.setState('menu'); $('#select').hidden = false; $('#title').hidden = true; this.ui.hideBoot();
    requestAnimationFrame(() => this.layoutMenu());
  }
  layoutMenu() { if (this.menu) this.menu.layout($(this.state === 'title' ? '#titleStage' : '#selStage').getBoundingClientRect()); }
  bootInfo() { // pantalla de carga con el título y la sinopsis del capítulo
    const story = this.modeKind === 'story', ch = CHAPTERS[this.chapterIdx];
    $('#bootEyebrow').textContent = story ? `Capítulo ${this.chapterIdx + 1} · ${ch.place}` : 'Modo Supervivencia · El pueblo';
    $('#bootTitle').textContent = story ? ch.title : 'Supervivencia';
    $('#bootStory').textContent = story ? ch.intro : 'Rondas de dos a tres minutos. Cada ronda los infectados son más rápidos y letales, y aparecen infectados fuertes. Busca armas, munición y botiquines por el pueblo.';
    $('#bootTip').textContent = this.input.pad ? 'B / ○ agacharse · corriendo, deslizarse · RB cuchillo · segundo mando: START para unirse' : this.input.usingTouch ? 'Botón de deslizar mientras corres: deslizamiento táctico · mantén la mano para activar objetos' : 'C o Ctrl corriendo: deslizamiento táctico · V cuchillo · mantén E para activar objetos';
  }
  async startGame() {
    if (this.state !== 'menu') return;
    if (this.audio.ensure()) this.audio.startAmbience();
    if (!this.input.usingTouch && !this.input.pad) this.input.requestLock();
    this.bootInfo();
    this.setState('loading'); this.ui.showBoot('Construyendo el escenario…'); $('#select').hidden = true; $('#title').hidden = true;
    await nextFrame(); await nextFrame();
    try {
      await this.buildGame();
      if (this.lighting.csm && this.engine.shaderErrors > 0) { // GPU incompatible con CSM → reconstruir sin cascadas
        console.warn('[BLOOD DEAD] Sombras en cascada desactivadas por errores de shader; se usa sombra direccional.');
        this.teardownGame(); this.disableCSM = true;
        this.ui.setBoot(0.3, 'Ajustando sombras a tu GPU…');
        await this.buildGame();
      }
    } catch (err) {
      console.error(err); this.teardownGame(); this.ui.setBoot(1, 'Error al construir la escena');
      setTimeout(() => this.showTitle(), 1600); return;
    }
    this.ui.hideBoot();
    this.input.reset();
    const touchUI = this.input.usingTouch && !this.input.pad;
    this.hud.show(this.selected, touchUI); if (this.input.pad) this.hud.showHint(false, true);
    $('#touch').hidden = !touchUI;
    $('#tLight').classList.add('on');
    this.pads.clearEdges(); this.setState('playing'); this.clock.getDelta();
    if (this.p2Pad) { const k = this.p2Pad; this.p2Pad = null; this.addPlayer2(k, true); }
    this.mode.start();
    this.hud.setLockHint(!this.input.locked && !this.input.usingTouch && !this.input.pad);
    this.events.emit('game:start', { def: this.selected, stats: this.player.stats });
  }
  makeCamera() {
    const c = new THREE.PerspectiveCamera(CONFIG.camera.fov, this.engine.width / this.engine.height, 0.05, CONFIG.render.far);
    c.layers.enable(1); return c; // capa 1: infectados (ver ZombieFactory.instance)
  }
  async buildGame() {
    const q = (this.quality = QUALITY[Settings.quality()]);
    const story = this.modeKind === 'story', ch = CHAPTERS[this.chapterIdx], levelKey = story ? ch.level : SURVIVAL.level, L = (this.levelDef = LEVELS[levelKey]);
    this.engine.setPixelRatio(q.pixelRatio);
    this.engine.shaderErrors = 0; this.engine.levelExposure = L.exposure; this.engine.applyBrightness();
    const sc = (this.scene = new THREE.Scene());
    sc.background = new THREE.Color(L.fog);
    sc.fog = new THREE.FogExp2(L.fog, L.density); this.fogBase = L.density;
    sc.environment = this.envMap;
    this.camera = this.makeCamera(); this.camera2 = this.makeCamera();
    this.lighting = new Lighting(this); await this.lighting.init(q);
    this.ui.setBoot(0.35, `Levantando ${L.name.toLowerCase()}…`); await nextFrame();
    this.materials = new MaterialLibrary(this.lighting.csm);
    this.world = new World(this, this.materials); this.world.build(levelKey);
    this.ui.setBoot(0.55, 'Esculpiendo a los jefes…'); await nextFrame();
    ZombieFactory.ensure(story ? ch.steps.filter((s) => s.boss || s.alpha).map((s) => (s.boss || s.alpha).type) : SURVIVAL.strongTypes);
    this.ui.setBoot(0.7, 'Encendiendo luces…'); await nextFrame();
    this.effects = new Effects(this); this.effects.build(q);
    // Destello de boca compartido por los dos jugadores (una sola luz: el número de luces no cambia → sin recompilar)
    this.flash = { light: new THREE.PointLight(0xffb066, 0, 7, 2), t: 0 }; sc.add(this.flash.light);
    const model = await CharacterFactory.createAsync(this.selected, { csm: this.lighting.csm, onError: () => this.events.emit('model:error', { def: this.selected }) });
    const p1 = new Player(this, this.selected, this.selectedStats, model, { idx: 0, input: this.input, camera: this.camera });
    const d2 = this.selected2, p2 = new Player(this, d2, { ...d2.stats }, CharacterFactory.create(d2, { csm: this.lighting.csm }), { idx: 1, input: new PadInput(this, null), camera: this.camera2, active: true, shadow: false, spawn: this.spotNear(p1.position) });
    this.players = [p1, p2];
    for (const p of this.players) p.weapons = new WeaponSystem(this, p);
    this.interact = new InteractSystem(this);
    this.zombies = new ZombieSystem(this);
    this.mode = story ? new StoryMode(this, this.chapterIdx) : new SurvivalMode(this);
    this.mode.prepare(); this.zombies.prewarm();
    this.systems = [this.mode, this.interact, this.zombies];
    this.runTime = 0; this.deadT = 0; this.setSplit(false, true);
    const dt = 1 / 60;
    for (const p of this.players) { p.input.update(dt); p.update(dt); p.rig.update(dt); p.flashlight.update(dt, p.rig, p); p.input.endFrame(); }
    this.lighting.update(p1.position);
    this.ui.setBoot(0.9, 'Compilando shaders…'); await nextFrame();
    this.camera.updateMatrixWorld(); this.lighting.onCameraChange(); this.lighting.beforeRender();
    try { // se compila con el jugador 2 activo (luces incluidas) y luego en solitario: unirse a mitad de partida no provoca tirones
      const r = this.engine.renderer, comp = async () => { if (r.compileAsync) await Promise.race([r.compileAsync(sc, this.camera), new Promise((res) => setTimeout(res, 5000))]); else r.compile(sc, this.camera); };
      await comp(); this.render();
      p2.setActive(false); await comp();
    } catch (e) { p2.setActive(false); /* se compilará en el primer render */ }
    this.render(); // fotograma oculto: valida los shaders (onShaderError) antes de mostrar nada
  }
  // Punto libre junto a una posición (para unirse o reaparecer al lado del compañero)
  spotNear(pos) {
    const w = this.world;
    for (let r = 1.2; r < 4; r += 0.6) for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU + r, x = pos.x + Math.sin(a) * r, z = pos.z + Math.cos(a) * r; if (w.isFree(x, z, 0.45)) return new THREE.Vector3(x, 0, z); }
    return pos.clone();
  }
  /* ---------- Dúo local ---------- */
  padOwner(key) { if (!key) return 0; if (this.input.pad === key) return 1; const p2 = this.players[1]; if ((p2 && p2.input.pad === key) || this.p2Pad === key) return 2; return 0; }
  onPadConnected(key, label) {
    const remote = key.startsWith('r:'), name = remote ? 'Móvil' : /xbox|xinput/i.test(label) ? 'Mando Xbox' : /playstation|dualsense|dualshock|054c/i.test(label) ? 'Mando PlayStation' : 'Mando';
    if (remote) { // el móvil se asigna según el selector del panel de mandos
      if (this.remoteTarget === 'p1') this.assignP1(key);
      else this.addPlayer2(key);
    } else if (!Settings.data.tvSet && !IS_TOUCH && innerWidth >= 1200) { Settings.data.tv = true; Settings.save(); this.applyTv(); this.ui.syncSettings(); }
    this.notify(`${name} conectado`, remote ? (this.remoteTarget === 'p1' ? 'Controla al jugador 1' : 'Jugador 2') : 'Pulsa un botón para jugar · START en un segundo mando para el dúo');
    this.ui.renderPads();
  }
  onPadLost(key) {
    const o = this.padOwner(key);
    if (o === 1) { this.input.pad = null; this.notify('Mando desconectado', 'Jugador 1: vuelve a conectarlo o usa teclado/táctil'); if (this.state === 'playing') this.pause(); }
    else if (o === 2) { this.notify('Mando del jugador 2 desconectado', 'Reconéctalo o quita al jugador 2 desde la pausa'); if (this.state === 'playing') this.pause(); if (this.p2Pad === key) this.p2Pad = null; }
    this.ui.renderPads();
  }
  // Primera pulsación de un mando sin dueño: jugador 1 si aún no tiene mando; START en un segundo mando: jugador 2
  onPadActivity(s) {
    if (s.kind === 'remote' || this.padOwner(s.key)) return;
    const inGame = this.state === 'playing' || this.state === 'paused', kbm = performance.now() - (this.input.lastKbm || 0) < 8000;
    if (!this.input.pad && !(inGame && s.down[9] && kbm)) { this.assignP1(s.key); if (inGame) s.down.fill(false); return; }
    if (s.down[9]) { s.down.fill(false); if (inGame) this.addPlayer2(s.key); else { this.p2Pad = s.key; this.notify('Jugador 2 preparado', 'Se unirá al empezar la partida'); this.ui.renderPads(); } }
  }
  assignP1(key) {
    this.input.pad = key; this.input.usingTouch = false;
    if (this.state === 'playing') { $('#touch').hidden = true; document.body.dataset.touch = '0'; this.hud.showHint(false, true); this.hud.setLockHint(false); }
    this.ui.renderPads();
  }
  notify(title, sub) { if (this.state === 'playing' && this.hud) this.hud.alert(title, sub, 'info', 2.6); else this.ui.toast(title, sub); }
  addPlayer2(key, silent = false) {
    const p2 = this.players[1];
    if (!p2 || !(this.state === 'playing' || this.state === 'paused')) { this.p2Pad = key; this.ui.renderPads(); return; }
    p2.input.pad = key;
    if (!p2.active) {
      const p1 = this.player; p2.setActive(true); p2.revive(this.spotNear(p1.position), 1); p2.health = p2.stats.maxHealth; p2.stamina = p2.stats.stamina;
      p2.rig.yaw = p1.rig.yaw; p2.rig.pitch = p1.rig.pitch; p2.facing = p1.facing; p2.kills = 0;
      for (const k of p1.weapons.inv) if (k !== 'pistol') p2.weapons.give(k); // llega con el mismo armamento
      this.setSplit(true); this.audio.chime();
      if (!silent) this.hud.alert('Jugador 2 se une', `${p2.def.name} · pantalla dividida`, 'success', 2.6);
      this.hud2.alert('¡A jugar!', 'Mantente cerca de tu compañero', 'success', 2.4);
      this.events.emit('player:joined', { player: p2 });
    }
    this.ui.renderPads();
  }
  removePlayer2() {
    const p2 = this.players[1]; if (!p2 || !p2.active) { this.p2Pad = null; this.ui.renderPads(); return; }
    p2.setActive(false); p2.input.pad = null; this.setSplit(false);
    this.hud.alert('Jugador 2 abandona', 'Vuelves a jugar en solitario', 'info', 2.2);
    this.events.emit('player:left', { player: p2 }); this.ui.renderPads();
  }
  setSplit(on, quiet = false) {
    this.split = on; document.body.classList.toggle('split', on);
    if (this.hud2) { if (on) this.hud2.show(this.players[1].def); else this.hud2.hide(); }
    if (!quiet) this.onResize();
  }
  revivePlayer(p) {
    const mate = this.activePlayers.find((q) => q !== p && q.alive);
    p.revive(mate ? this.spotNear(mate.position) : p.position.clone(), 0.6); p.respawnT = 0;
    if (p.weapons) { const A = p.weapons.ammo.pistol; A.mag = WEAPONS.pistol.mag; }
    (p.idx ? this.hud2 : this.hud).alert('¡De vuelta!', 'Tu compañero te ha cubierto', 'success', 1.8);
  }
  /* ---------- Estados ---------- */
  pause() {
    if (this.state !== 'playing') return;
    if (this.cine.on) this.cine.end(true);
    this.pausedAt = performance.now();
    this.setState('paused'); for (const p of this.players) p.input.reset(); this.input.exitLock();
    this.ui.showPause(this.selected, this.input.usingTouch && !this.input.pad); this.needsRender = true;
  }
  resume() {
    if (this.state !== 'paused') return;
    this.ui.hidePause(); for (const p of this.players) p.input.reset(); this.pads.clearEdges(); this.setState('playing'); this.clock.getDelta();
    $('#tLight').classList.toggle('on', this.player.flashlight.on);
    if (!this.input.usingTouch && !this.input.pad) this.input.requestLock();
    this.hud.setLockHint(!this.input.locked && !this.input.usingTouch && !this.input.pad);
  }
  backToTitle() {
    this.ui.hidePause(); $('#death').hidden = true; $('#complete').hidden = true; this.hud.hide(); this.hud2.hide(); $('#touch').hidden = true; this.input.exitLock();
    if (this.cine.on) this.cine.end(true);
    this.teardownGame(); this.showTitle();
  }
  backToMenu() { this.backToTitle(); }
  keepP2() { const p2 = this.players[1]; if (p2 && p2.active && p2.input.pad) this.p2Pad = p2.input.pad; } // el dúo sigue en la siguiente partida
  showDeath() {
    this.setState('dead'); for (const p of this.players) p.input.reset(); this.input.exitLock(); this.needsRender = true;
    const z = this.zombies, t = Math.floor(this.runTime), m = this.mode, surv = m && m.kind === 'survival', duo = this.activePlayers.length > 1;
    $('#dKills').textContent = z ? z.kills : 0;
    $('#dCoins').textContent = surv ? m.round : z ? z.coins : 0; $('#dMidLabel').textContent = surv ? 'Ronda' : 'Monedas';
    $('#dTime').textContent = fmtClock(t);
    $('#deathChar').textContent = `${this.selected.name}${duo ? ' y ' + this.players[1].def.name : ''} · ${surv ? 'Supervivencia' : `Capítulo ${this.chapterIdx + 1}`}`;
    $('#deathTitle').textContent = duo ? 'Habéis caído' : 'Has muerto';
    $('#dNote').textContent = surv ? `Récord: ronda ${Settings.data.bestRound || m.round}` : m && m.currentText ? `Objetivo: ${m.currentText}` : '';
    $('#death').hidden = false; $('#btnRetry').focus({ preventScroll: true });
    this.events.emit('game:over', { kills: z ? z.kills : 0, coins: z ? z.coins : 0, time: this.runTime, round: surv ? m.round : 0 });
  }
  retry() {
    this.keepP2(); $('#death').hidden = true; this.hud.hide(); this.hud2.hide(); $('#touch').hidden = true;
    this.teardownGame(); this.setState('menu'); this.startGame();
  }
  // Fin de capítulo: estadísticas y paso al siguiente (el último desbloquea la supervivencia como cierre)
  onChapterComplete(m) {
    if (this.state !== 'playing' || !this.activePlayers.some((p) => p.alive)) return;
    this.setState('complete'); for (const p of this.players) p.input.reset(); this.input.exitLock(); this.needsRender = true;
    const z = this.zombies, last = m.idx >= CHAPTERS.length - 1, ch = m.ch;
    $('#cmpEyebrow').textContent = last ? 'Historia completada' : `Capítulo ${m.idx + 1} completado`;
    $('#cmpTitle').textContent = ch.title; $('#cmpText').textContent = ch.outro;
    $('#cKills').textContent = z ? z.kills : 0; $('#cCoins').textContent = z ? z.coins : 0; $('#cTime').textContent = fmtClock(m.time);
    $('#btnNextLabel').textContent = last ? 'Jugar supervivencia' : `Capítulo ${m.idx + 2}`;
    $('#complete').hidden = false; $('#btnNext').focus({ preventScroll: true });
    this.audio.sting(); this.events.emit('chapter:complete', { idx: m.idx, time: m.time, kills: z ? z.kills : 0 });
  }
  nextChapter() {
    this.keepP2(); $('#complete').hidden = true; this.hud.hide(); this.hud2.hide(); $('#touch').hidden = true;
    if (this.modeKind === 'story' && this.chapterIdx < CHAPTERS.length - 1) this.chapterIdx++; else this.modeKind = 'survival';
    this.teardownGame(); this.setState('menu'); this.startGame();
  }
  teardownGame() {
    for (const s of this.systems) if (s.dispose) s.dispose();
    try {
      for (const p of this.players) { if (p.weapons) p.weapons.dispose(); p.dispose(); }
      if (this.flash) { this.flash.light.removeFromParent(); this.flash.light.dispose(); }
      if (this.effects) this.effects.dispose();
      if (this.world) this.world.dispose();
      if (this.materials) this.materials.dispose();
      if (this.lighting) this.lighting.dispose();
      if (this.scene) this.scene.clear();
      this.engine.renderer.renderLists.dispose();
    } catch (e) { console.warn('Limpieza incompleta', e); }
    this.players = []; this.split = false; document.body.classList.remove('split', 'cine');
    this.world = this.effects = this.materials = this.lighting = this.mode = this.interact = this.zombies = this.scene = this.camera = this.camera2 = this.flash = null;
    this.systems = [];
  }
  loop = () => {
    requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.time += dt; this.tickFps(dt);
    this.pads.poll();
    if ((this.state === 'menu' || this.state === 'title') && this.menu) { this.menu.update(dt); this.engine.renderer.render(this.menu.scene, this.menu.camera); }
    else if (this.state === 'playing') { this.update(dt); this.render(); }
    else if ((this.state === 'paused' || this.state === 'dead' || this.state === 'complete') && this.needsRender) { this.needsRender = false; this.render(); }
  };
  muzzleFlash(pos, k) { const f = this.flash; if (!f) return; f.light.position.copy(pos); f.light.intensity = k; f.t = 0.06; }
  update(dt) {
    const ps = this.activePlayers, P1 = this.player;
    this.audio.ears = ps.map((p) => p.camera);
    if (this.cine.on) { // cinemática: solo se mueven el jefe, el escenario y los efectos
      this.cine.update(dt); this.zombies.cineUpdate(dt, this.cine.z);
      this.world.update(dt); this.effects.update(dt, this.time, P1.flashlight, this.camera);
      this.audio.update(dt, this);
      for (const p of ps) p.input.endFrame();
      return;
    }
    for (const p of ps) p.input.update(dt);
    if (ps.some((p) => p.input.consume('pause'))) { for (const p of ps) p.input.endFrame(); this.pause(); return; }
    for (const p of ps) {
      const inp = p.input;
      if (inp.consume('flashlight')) p.flashlight.toggle();
      if (inp.consume('shoulder')) p.rig.side *= -1;
      if (inp.consume('knife')) p.knife();
      p.weapons.handleInput(inp);
      p.update(dt);
      p.rig.update(dt);
      p.flashlight.update(dt, p.rig, p);
    }
    const c = ps.length > 1 ? this.v2 || (this.v2 = new THREE.Vector3()) : null;
    this.lighting.update(c ? c.copy(ps[0].position).add(ps[1].position).multiplyScalar(0.5) : P1.position);
    this.effects.update(dt, this.time, P1.flashlight, this.camera);
    this.world.update(dt);
    this.mode.update(dt, this); this.interact.update(dt, this);
    for (const p of ps) p.weapons.update(dt);
    this.zombies.update(dt, this);
    const f = this.flash; if (f.t > 0) f.t -= dt; else f.light.intensity = damp(f.light.intensity, 0, 30, dt);
    const sp = this.zombies ? this.zombies.fx.spore : 0; // nube de esporas o ácido: menos visibilidad
    this.hud.setSpore(sp); if (this.scene.fog) this.scene.fog.density = this.fogBase * (1 + 2.4 * sp);
    this.audio.update(dt, this);
    this.hud.update(dt); if (this.split) this.hud2.update(dt);
    // Dúo: el caído reaparece junto a su compañero; la partida termina solo si caen los dos
    const anyAlive = ps.some((p) => p.alive);
    if (anyAlive) { this.runTime += dt; this.deadT = 0; for (const p of ps) if (!p.alive && (p.respawnT = (p.respawnT || 0) + dt) >= CONFIG.coop.respawn) this.revivePlayer(p); }
    else if ((this.deadT += dt) > 2.2) { for (const p of ps) p.input.endFrame(); this.showDeath(); return; } // deja ver la caída antes del rótulo
    for (const p of ps) p.input.endFrame();
  }
  render() {
    if (!this.scene || !this.camera) return;
    const r = this.engine.renderer, ps = this.activePlayers, csm = this.lighting.csm;
    if (!this.split || ps.length < 2 || this.cine.on) {
      for (const p of this.players) p.model.root.visible = p.active && (this.cine.on || p !== this.player || p.rig.modelVisible);
      this.camera.updateMatrixWorld(); this.lighting.beforeRender();
      r.render(this.scene, this.camera); return;
    }
    // Pantalla dividida en horizontal: arriba el jugador 1, abajo el 2 (las cascadas de sombra se recalculan por vista)
    const W = this.engine.width, H = this.engine.height, h = Math.floor(H / 2);
    r.setScissorTest(true);
    for (let i = 0; i < 2; i++) {
      const p = ps[i], cam = p.camera, y = i === 0 ? h : 0, vh = i === 0 ? H - h : h;
      r.setViewport(0, y, W, vh); r.setScissor(0, y, W, vh);
      for (const q of ps) q.model.root.visible = q !== p || p.rig.modelVisible;
      cam.updateMatrixWorld();
      if (csm) { csm.camera = cam; csm.updateFrustums(); }
      this.lighting.beforeRender();
      r.render(this.scene, cam);
    }
    r.setScissorTest(false); r.setViewport(0, 0, W, H);
    if (csm) { csm.camera = this.camera; csm.updateFrustums(); }
  }
  tickFps(dt) {
    this.fpsAcc += dt; this.fpsFrames++;
    if (this.fpsAcc < 0.5) return;
    const fps = Math.round(this.fpsFrames / this.fpsAcc); this.fpsAcc = 0; this.fpsFrames = 0;
    if (this.state === 'playing') { // resolución dinámica con histéresis: prioriza la fluidez (60 FPS)
      const e = this.engine; this.lowW = fps < 52 ? (this.lowW || 0) + 1 : 0; this.highW = fps >= 58 ? (this.highW || 0) + 1 : 0;
      if (this.lowW >= 2) { e.setScale(e.prScale - 0.12); this.lowW = 0; } else if (this.highW >= 8 && e.prScale < 1) { e.setScale(e.prScale + 0.08); this.highW = 0; }
    }
    if (Settings.data.fps) $('#fps').textContent = fps + ' FPS';
  }
  onResize() {
    this.engine.resize();
    const W = this.engine.width, H = this.engine.height, split = this.split && this.activePlayers.length > 1 && !this.cine.on;
    for (const c of [this.camera, this.camera2]) if (c) { c.aspect = W / (split ? H / 2 : H); c.updateProjectionMatrix(); }
    if (this.camera) { if (this.lighting) this.lighting.onCameraChange(); this.needsRender = true; }
    if (this.state === 'menu' || this.state === 'title') this.layoutMenu();
    else if (this.hud) this.hud.sizeECG();
    if (this.input.resetJoy) this.input.resetJoy();
  }
}
