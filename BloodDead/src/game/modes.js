import * as THREE from 'three';
import { WEAPONS } from '../data/weapons.js';
import { CHAPTERS } from '../data/levels.js';
import { SURVIVAL } from '../data/survival.js';
import { Settings } from '../core/settings.js';

/* =====================================================================
   MODOS DE JUEGO
   StoryMode    → capítulos con pasos declarativos (CHAPTERS), jefes con entrada cinematográfica
                  y combate final por fases contra el Parásito Alpha
   SurvivalMode → rondas de 2–3 min en el pueblo con dificultad creciente e infectados fuertes
   Ambos exponen hasTarget/target (marcador en pantalla), currentText (pausa) y update(dt)
   ===================================================================== */
export const fmtClock = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

// Estado del jefe para la barra superior: texto y si es un momento crítico
export function bossStatus(z) {
  const s = z.state, T = z.T;
  if (!z.alive) return ['ABATIDO', false];
  if (s === 'intro') return ['', false];
  switch (z.type) {
    case 'subject': return s === 'stunned' ? ['¡ATURDIDO! DISPARA', true] : s === 'windup' || s === 'charge' ? ['¡EMBESTIDA!', true] : ['PLACA DE HUESO FRONTAL', false];
    case 'stalker': return s === 'exposed' ? ['¡AL DESCUBIERTO! DISPARA', true] : s === 'pounceWind' || s === 'pounce' ? ['¡SALTA!', true] : z.cloak > 0.5 ? ['OCULTO · USA LA LINTERNA', false] : ['VISIBLE', false];
    case 'behemoth': return s === 'slam' ? ['¡ONDA DE CHOQUE!', true] : s === 'chain' ? ['¡CADENAS!', true] : z.armor > 0 ? [`BLINDAJE ${Math.max(0, Math.ceil((z.armor / (T.armor || 1)) * 100))} %`, false] : ['SIN PLACAS · CARNE EXPUESTA', true];
    case 'queen': return s === 'brood' ? ['¡ENJAMBRE!', true] : s === 'spit' ? ['¡ÁCIDO!', true] : z.sys.fx.crawlers ? [`CRÍAS ${z.sys.fx.crawlers}`, true] : ['A LA CABEZA', false];
    case 'alpha':
      if (z.phase === 1) return z.shield ? ['FASE 1 · ESCUDO ACTIVO', false] : ['FASE 1 · ¡VULNERABLE!', true];
      if (z.phase === 2) return z.podsAlive() ? [`FASE 2 · VAINAS ${z.podsAlive()}/3`, false] : ['FASE 2 · ¡NÚCLEO EXPUESTO!', true];
      return ['FASE 3 · FURIA', true];
    case 'acolyte': return s === 'spit' ? ['¡ESPORAS!', true] : ['CIEGO · TE OYE', false];
  }
  return ['', false];
}
export const bossShielded = (z) => (z.type === 'alpha' ? z.shield : z.type === 'behemoth' ? z.armor > 0 : z.helmet > 0);

export class StoryMode {
  constructor(game, idx) {
    this.game = game; this.kind = 'story'; this.idx = idx; this.ch = CHAPTERS[idx];
    this.i = -1; this.step = null; this.target = new THREE.Vector3(); this.hasTarget = false; this.time = 0; this.done = false; this.endT = 0; this.boss = null; this.TT = null; this.deadT = 0;
    const E = game.events;
    this.unsubs = [E.on('boss:phase', (e) => this.onPhase(e)), E.on('boss:pod', (e) => { if (e.z === this.boss) this.game.hud.trackerProg('pods', `${3 - e.left}/3`); })];
  }
  get currentText() { return this.step ? this.step.text : this.done ? 'Capítulo completado' : ''; }
  prepare() { const z = this.game.zombies; z.setDirector(this.ch.director); z.initialWave(this.ch.director.initial || 0); }
  start() {
    const g = this.game, ch = this.ch;
    g.hud.trackerReset(); g.hud.trackerHead('Objetivo');
    g.hud.alert(ch.title, `Capítulo ${this.idx + 1} · ${ch.place}`, 'chapter', 4);
    g.audio.sting();
    this.next();
  }
  next() {
    const g = this.game; this.i++; const s = (this.step = this.ch.steps[this.i] || null);
    if (!s) return this.finish();
    this.prog = 0; this.need = s.use ? s.use.length : 1; this.deadT = 0;
    if (s.dir) g.zombies.setDirector(s.dir, true);
    const B = s.boss || s.alpha;
    if (s.start && !B) this.act(s.start); // con jefe, el aviso llega al terminar su presentación
    if (s.use) for (const id of s.use) g.interact.enable(id, true);
    g.hud.trackerAdd('s' + this.i, s.text, s.use && s.use.length > 1 ? `0/${s.use.length}` : '');
    if (this.i > 0) g.audio.objective();
    if (B) this.spawnBoss(B, s);
    if (s.alpha) this.startAlpha(s.alpha);
    g.events.emit('mission:objective', { id: 's' + this.i, text: s.text, chapter: this.ch.id });
  }
  act(a) {
    const g = this.game, w = g.world;
    if (a.alert) { const [t, sub, kind] = a.alert; g.hud.alert(t, sub, kind || 'info', kind === 'danger' ? 4.4 : 3); if (kind === 'danger') g.audio.alarm(); }
    if (a.door && w.openDoor(a.door)) g.audio.door();
    if (a.power) { w.setPower('power'); g.audio.power(); }
    if (a.give) for (const p of g.players) p.weapons.give(a.give);
    if (a.sfx && g.audio[a.sfx]) g.audio[a.sfx]();
  }
  // El jefe aparece con una entrada cinematográfica (barras negras, cámara de presentación y rótulo)
  spawnBoss(b, s) {
    const g = this.game, p = g.world.poi[b.at];
    this.boss = g.zombies.spawnBoss(b.type, p.x, p.z, { intro: true });
    g.hud.bossShow(this.boss.T.name);
    g.cine.bossIntro(this.boss, { eyebrow: `Capítulo ${this.idx + 1} · Jefe final`, title: this.boss.T.name, sub: this.boss.T.epithet, onEnd: () => { if (s && s.start) this.act(s.start); } });
  }
  startAlpha(t) {
    this.TT = { nodes: t.nodes, on: new Set(), window: t.window, down: 0, reT: 0 };
    for (const id of t.nodes) this.game.interact.enable(id, true);
    this.game.hud.trackerAdd('tn', 'Activa los nodos', `0/${t.nodes.length}`, true);
  }
  // Fases del Parásito Alpha: 2 → vainas que lo regeneran; 3 → furia del núcleo
  onPhase({ z, phase }) {
    const g = this.game; if (z !== this.boss) return;
    if (phase === 2) {
      if (this.TT) { for (const id of this.TT.nodes) g.interact.enable(id, false); g.hud.trackerRemove('tn'); g.hud.trackerRemove('tc'); this.TT = null; }
      g.hud.trackerAdd('pods', 'Revienta las vainas parasitarias', '0/3', true);
      g.cine.phaseIntro(z, { eyebrow: 'El Parásito Alpha · Fase 2', title: 'Vainas parasitarias', sub: 'Lo regeneran y blindan su núcleo', onEnd: () => g.hud.alert('Fase 2', 'Revienta las tres vainas: mientras vivan, se regenera', 'danger', 3.6) });
    } else if (phase === 3) {
      g.hud.trackerDone('pods'); g.hud.trackerAdd('core3', '¡Destruye el núcleo!', '', true);
      g.zombies.setDirector({ target: 6, every: [3, 5.5], fury: true }, true);
      g.cine.phaseIntro(z, { eyebrow: 'El Parásito Alpha · Fase 3', title: 'Furia del núcleo', sub: 'Más rápido, más letal. El núcleo late al descubierto', onEnd: () => g.hud.alert('Fase final', 'Vacía el cargador en el núcleo del pecho', 'danger', 3.4) });
    }
  }
  onUse(id) {
    const s = this.step; if (!s || this.done) return;
    if (this.TT && this.TT.nodes.includes(id)) return this.nodeOn(id);
    if (!s.use || !s.use.includes(id)) return;
    this.prog++;
    if (s.use.length > 1) { this.game.hud.trackerProg('s' + this.i, `${this.prog}/${this.need}`); this.game.audio.objective(); }
    if (this.prog >= this.need) this.complete();
  }
  nodeOn(id) {
    const T = this.TT, g = this.game; if (T.down > 0) return;
    T.on.add(id); g.hud.trackerProg('tn', `${T.on.size}/${T.nodes.length}`); g.audio.objective();
    if (T.on.size < T.nodes.length) { g.hud.alert(`Nodo ${T.on.size} de ${T.nodes.length}`, 'Activa los demás', 'info', 1.8); return; }
    T.down = T.window; this.boss.setShield(false);
    g.hud.trackerDone('tn'); g.hud.trackerAdd('tc', '¡Dispara al núcleo del pecho!', '', true);
    g.hud.alert('¡Escudo caído!', `Dispara al núcleo del pecho: ${T.window} segundos`, 'danger', 3); g.audio.alarm();
  }
  shieldUp() {
    const T = this.TT, g = this.game; T.down = 0; T.on.clear(); T.reT = 2.2;
    g.hud.trackerRemove('tc');
    if (this.boss.alive && this.boss.phase === 1) { this.boss.setShield(true); g.hud.alert('El escudo se regenera', 'Vuelve a activar los tres nodos', 'danger', 3); g.hud.trackerAdd('tn', 'Activa los nodos', `0/${T.nodes.length}`, true); }
  }
  complete() {
    const g = this.game, s = this.step;
    g.hud.trackerDone('s' + this.i); g.audio.chime();
    if (s.done) this.act(s.done);
    if (s.boss || s.alpha) g.hud.bossHide();
    for (const k of ['tn', 'tc', 'pods', 'core3']) g.hud.trackerRemove(k);
    this.TT = null;
    this.next();
  }
  finish() {
    const g = this.game, d = Settings.data;
    this.done = true; this.hasTarget = false; this.endT = 2.6; this.step = null;
    for (const p of g.players) p.iframes = 999;
    g.zombies.setDirector({ paused: true }, true);
    d.unlocked = Math.min(CHAPTERS.length, Math.max(d.unlocked || 1, this.idx + 2)); d.done = d.done || []; d.done[this.idx] = true; Settings.save();
    g.hud.trackerHead('Completado');
  }
  updateNodes(dt) {
    const T = this.TT, g = this.game, b = this.boss;
    if (T.reT > 0) { T.reT -= dt; if (T.reT <= 0) for (const id of T.nodes) g.interact.reset(id); }
    if (T.down > 0) {
      T.down -= dt; g.hud.trackerTime(fmtClock(T.down), T.down < 5);
      if (T.down <= 0 && b.alive) this.shieldUp();
      return b.alive ? b.coreC : null;
    }
    // siguiente nodo pendiente más cercano
    const P = g.player.position; let best = null, bd = Infinity;
    for (const id of T.nodes) { const it = g.interact.get(id); if (!it || T.on.has(id) || !g.interact.available(it)) continue; const d = Math.hypot(P.x - it.x, P.z - it.z); if (d < bd) { bd = d; best = it; } }
    return best ? this.target.set(best.x, 1.2, best.z) : null;
  }
  update(dt) {
    const g = this.game; if (!g.player) return;
    this.time += dt;
    if (this.done) { if (this.endT > 0 && (this.endT -= dt) <= 0) g.onChapterComplete(this); return; }
    const s = this.step, P = g.player.position; let tgt = null;
    if (s.reach) { // basta con que llegue uno de los jugadores
      const p = g.world.poi[s.reach]; tgt = this.target.set(p.x, 1.2, p.z);
      if (g.activePlayers.some((q) => q.alive && Math.hypot(q.position.x - p.x, q.position.z - p.z) < (s.r || 3))) this.complete();
    } else if (s.use) {
      let bd = Infinity;
      for (const id of s.use) { const it = g.interact.get(id); if (!it || !g.interact.available(it)) continue; const d = Math.hypot(P.x - it.x, P.z - it.z); if (d < bd) { bd = d; tgt = this.target.set(it.x, 1.2, it.z); } }
    } else if (s.boss || s.alpha) {
      const b = this.boss;
      if (b && b.alive && s.alpha) {
        if (b.phase === 1 && this.TT) { const t = this.updateNodes(dt); if (t) tgt = t === this.target ? t : this.target.copy(t); }
        else if (b.phase === 2 && b.podsAlive()) { b.zones(); const i = b.podHp.findIndex((h) => h > 0); tgt = this.target.copy(b.podC[i]); }
        else { b.zones(); tgt = this.target.copy(b.coreC); }
      }
      if (b && !b.alive) { if ((this.deadT += dt) > 1.4) { this.complete(); return; } }
      else if (b && !tgt) tgt = this.target.set(b.pos.x, 1.7 * b.V.scale, b.pos.z);
      if (b) { const [txt, hot] = bossStatus(b); g.hud.bossUpdate(Math.max(0, b.hp) / b.maxHp, bossShielded(b), txt, hot); }
    }
    this.hasTarget = !!tgt;
    if (!this.TT || this.TT.down <= 0) g.hud.trackerTime(fmtClock(this.time), false);
  }
  dispose() { this.game.hud.bossHide(); for (const u of this.unsubs) u(); }
}

export class SurvivalMode {
  constructor(game) {
    this.game = game; this.kind = 'survival'; this.round = 0; this.phase = 'prep'; this.t = 8; this.dur = 0; this.time = 0;
    this.hasTarget = false; this.target = new THREE.Vector3(); this.strong = []; this.focus = null; this.killsAt = 0;
    this.mapKey = SURVIVAL.maps[game.survivalMap] ? game.survivalMap : 'village'; this.map = SURVIVAL.maps[this.mapKey];
  }
  get total() { return SURVIVAL.total; }
  get level() { return SURVIVAL.levels[Math.max(0, this.round - 1)]; }
  get currentText() { return this.phase === 'round' ? `Nivel ${this.round}/${this.total} · quedan ${fmtClock(this.t)}` : this.round ? `Descanso antes del nivel ${this.round + 1}` : 'Prepárate'; }
  prepare() {
    const g = this.game;
    g.zombies.setDirector({ paused: true, target: 0, groups: null });
    g.interact.setLock('weapon', (it) => { const r = SURVIVAL.unlock[it.weapon] || 1; return this.round < r ? `${WEAPONS[it.weapon].short}: disponible en el nivel ${r}` : null; });
  }
  start() {
    const g = this.game;
    g.hud.trackerReset(); g.hud.trackerHead(`Supervivencia · ${this.map.name}`);
    g.hud.alert(`Supervivencia · ${this.map.name}`, `${this.total} niveles: sobrevive a todos`, 'chapter', 3.4);
    g.hud.trackerAdd('prep', `Prepárate: el nivel 1 de ${this.total} está a punto de empezar`, '');
    g.audio.sting();
  }
  startRound(n) {
    const g = this.game, Z = g.zombies, L = SURVIVAL.levels[n - 1]; this.round = n; this.phase = 'round'; this.t = this.dur = L.dur;
    // Multijugador (local u online): el doble de infectados, más agresivos y murciélagos desde el nivel 2
    const duo = g.activePlayers.length > 1, C = SURVIVAL.coop;
    const m = (this.m = duo ? { ...L.mult, spd: L.mult.spd * C.spd } : L.mult);
    const bats = !duo ? L.bats : L.bats ? { max: L.bats.max + 1, every: L.bats.every.map((v) => v * 0.85) } : n >= C.batsFrom ? { ...C.earlyBats } : null;
    Z.setDirector({ target: L.target, every: L.every, groups: null, minDist: 13, mult: m, fury: L.fury || (duo && n >= C.furyFrom), aggro: Math.min(1, L.aggro + (duo ? C.aggro : 0)), cull: false, weights: L.weights, bats,
      coopMult: C.zombies, coopCap: C.zombies });
    if (g.ambush) g.ambush.setRate(L.ambush);
    const k = L.strong.length; this.strong = [];
    for (let i = 0; i < k; i++) this.strong.push({ at: this.dur * (0.15 + (0.6 * i) / Math.max(1, k)), type: L.strong[i], z: null, done: false });
    this.killsAt = Z.kills;
    g.interact.refresh(['ammo', 'med']);
    const d = Settings.data; d.best = d.best || {};
    if (n > (d.best[this.mapKey] || 0)) d.best[this.mapKey] = n;
    if (n > (d.bestRound || 0)) d.bestRound = n;
    Settings.save();
    g.hud.trackerReset(); g.hud.trackerHead(`Supervivencia · Nivel ${n}/${this.total}`);
    g.hud.trackerAdd('r', `Sobrevive al nivel ${n}`, '');
    g.hud.trackerAdd('k', 'Infectados abatidos', '0', true);
    if (k) g.hud.trackerAdd('f', 'Infectados fuertes abatidos', `0/${k}`, true);
    const news = n === 1 ? 'Busca armas y munición' : n === 4 ? '¡Murciélagos zombi en el cielo!' : n === 7 ? 'Cuidado con el zombi araña' : n === this.total ? 'Nivel final' : 'Más rápidos y más letales';
    g.hud.alert(`Nivel ${n} de ${this.total}`, `${fmtClock(this.dur)} · ${news}${k ? ` · ${k} fuerte${k > 1 ? 's' : ''}` : ''}`, 'danger', 3.2);
    for (const w in SURVIVAL.unlock) if (SURVIVAL.unlock[w] === n && n > 1) g.hud.alert('Nueva arma disponible', `${WEAPONS[w].name} en el armero`, 'success', 2.4);
    g.audio.roundStart();
  }
  endRound() {
    const g = this.game, L = this.level;
    g.zombies.setDirector({ paused: true, bats: null }, true); g.zombies.bats.retreat();
    if (g.ambush) g.ambush.setRate(null);
    if (this.round >= this.total) { this.phase = 'won'; g.hud.trackerDone('r'); g.onSurvivalComplete(this); return; }
    this.phase = 'break'; this.t = SURVIVAL.intermission;
    g.hud.trackerDone('r'); g.hud.trackerAdd('b', 'Abastécete antes del siguiente nivel', '');
    g.hud.alert(`Nivel ${this.round} superado`, `Respira: munición y botiquines repuestos (+${L.heal} de salud)`, 'success', 3.2);
    for (const p of g.activePlayers) { if (!p.alive) g.revivePlayer(p); p.heal(L.heal); }
    g.interact.refresh(['ammo', 'med']); g.audio.roundEnd();
  }
  update(dt) {
    const g = this.game, Z = g.zombies; if (!g.player || this.phase === 'won') return;
    this.time += dt; this.t -= dt;
    if (this.phase !== 'round') {
      g.hud.trackerTime(fmtClock(this.t), this.t < 4);
      if (this.t <= 0) this.startRound(this.round + 1);
      return;
    }
    g.hud.trackerTime(fmtClock(this.t), this.t < 10);
    const el = this.dur - this.t;
    for (const s of this.strong) {
      if (s.done || el < s.at) continue;
      const z = Z.spawnAt(s.type, 15, true, { spd: this.m.spd * 0.95, dmg: this.m.dmg, hp: SURVIVAL.strongHp(this.round, g.activePlayers.length > 1), fury: true });
      if (z) { s.done = true; s.z = z; this.focus = z; g.hud.bossShow(z.T.name); g.hud.alert('¡Infectado fuerte!', z.T.name, 'danger', 2.2); g.audio.alarm(); }
    }
    g.hud.trackerProg('k', String(Z.kills - this.killsAt));
    if (this.strong.length) g.hud.trackerProg('f', `${this.strong.filter((s) => s.z && !s.z.alive).length}/${this.strong.length}`);
    if (!this.focus || !this.focus.alive) { const n = this.strong.find((s) => s.z && s.z.alive); if (this.focus && !n) g.hud.bossHide(); this.focus = n ? n.z : null; if (n) g.hud.bossShow(n.z.T.name); }
    if (this.focus) { const [txt, hot] = bossStatus(this.focus); g.hud.bossUpdate(Math.max(0, this.focus.hp) / this.focus.maxHp, bossShielded(this.focus), txt, hot); }
    if (this.t <= 0) this.endRound();
  }
  dispose() { this.game.hud.bossHide(); }
}
