import * as THREE from 'three';
import { $, TAU, rand } from '../core/utils.js';
import { WEAPONS } from '../data/weapons.js';
import { TextureFactory } from '../render/textures.js';
import { CharacterFactory } from '../characters/characterFactory.js';

/* =====================================================================
   INTERACCIÓN: objetivos (generador, paneles, nodos…), munición, botiquines y armas.
   Cada jugador tiene su propio aviso; los objetivos son del equipo.
   ===================================================================== */
export class InteractSystem {
  constructor(game) {
    this.game = game; this.items = []; this.objs = []; this.st = [{ cur: null, holdT: 0 }, { cur: null, holdT: 0 }]; this.cache = {}; this.locks = {};
    const sc = game.scene, csm = game.lighting.csm, T = TextureFactory, track = (o) => { sc.add(o); this.objs.push(o); return o; };
    const std = (p) => { const m = new THREE.MeshStandardMaterial(p); if (csm) csm.setupMaterial(m); this.objs.push({ material: m, isMat: true }); return m; };
    this.mats = {
      box: std({ color: 0x2c2f33, roughness: 0.55, metalness: 0.6 }), band: std({ color: 0x220000, emissive: 0xff1a1a, emissiveIntensity: 1.2, roughness: 0.4 }),
      med: std({ color: 0xd8d4cc, roughness: 0.45 }), gun: std({ color: 0x161719, roughness: 0.4, metalness: 0.85 }),
    };
    const S = CharacterFactory.prepareShared();
    for (const u of game.world.uses) {
      const it = { ...u, enabled: u.kind !== 'objective', used: false, cd: 0, props: [] };
      const beacon = track(new THREE.Sprite(new THREE.SpriteMaterial({ map: T.dot, color: u.kind === 'objective' ? 0xff1a1a : 0xd8d4cc, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending })));
      beacon.position.set(u.x, u.kind === 'objective' ? 1.75 : 0.95, u.z); beacon.scale.setScalar(u.kind === 'objective' ? 0.55 : 0.36); it.beacon = beacon;
      // Atrezo de los recogibles (los objetivos ya están construidos en el escenario)
      const add = (geo, mat, x, y, z, ry = 0) => { const m = track(new THREE.Mesh(geo, mat)); m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = m.receiveShadow = true; it.props.push(m); return m; };
      const ry = rand(0, TAU);
      if (u.kind === 'ammo') { const m = add(new THREE.BoxGeometry(0.56, 0.3, 0.34), this.mats.box, u.x, 0.15, u.z, ry); const b2 = new THREE.Mesh(new THREE.BoxGeometry(0.57, 0.05, 0.35), this.mats.band); b2.position.y = 0.06; m.add(b2); }
      else if (u.kind === 'med') { const m = add(new THREE.BoxGeometry(0.5, 0.26, 0.34), this.mats.med, u.x, 0.13, u.z, ry); for (const [w, d] of [[0.06, 0.2], [0.2, 0.06]]) { const c = new THREE.Mesh(new THREE.BoxGeometry(w, 0.01, d), this.mats.band); c.position.y = 0.135; m.add(c); } }
      else if (u.kind === 'weapon') {
        const m = add(new THREE.BoxGeometry(1.15, 0.2, 0.44), this.mats.box, u.x, 0.1, u.z, ry);
        const gm = new THREE.Mesh(S.guns[u.weapon] || S.gun, this.mats.gun); gm.userData.shared = true; gm.scale.setScalar(1.35); gm.rotation.set(-Math.PI / 2, 0, Math.PI / 2); gm.position.set(-0.05, 0.13, 0); m.add(gm);
        const b2 = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.04, 0.45), this.mats.band); b2.position.y = -0.05; m.add(b2);
      }
      this.items.push(it);
    }
    this.view = [{ show: false, text: '', ring: 0 }, { show: false, text: '', ring: 0 }]; // estado del aviso por jugador (lo lee el multijugador online)
    this.el = [
      { box: $('#prompt'), text: $('#promptText'), key: $('#promptKey'), ring: $('#promptRing'), use: $('#tUse') },
      { box: $('#prompt2'), text: $('#prompt2Text'), key: $('#prompt2Key'), ring: $('#prompt2Ring'), use: null },
    ];
  }
  get(id) { return this.items.find((i) => i.id === id); }
  // Acción contextual temporal para un jugador concreto (p. ej. «Zafarse» al ser agarrado): sigue su posición,
  // tiene prioridad sobre el resto y usa el mismo aviso, anillo de progreso y botón de mano táctil
  addAction(a) { const it = { kind: 'action', enabled: true, used: false, cd: 0, props: [], beacon: null, r: 1.5, hold: 1, x: 0, z: 0, ...a }; this.items.push(it); return it; }
  removeAction(it) { const i = this.items.indexOf(it); if (i >= 0) this.items.splice(i, 1); for (const S of this.st) if (S.cur === it) { S.cur = null; S.holdT = 0; } }
  enable(id, on = true) { const it = this.get(id); if (it) { it.enabled = on; if (on) it.used = false; } }
  reset(id) { const it = this.get(id); if (it) { it.used = false; it.enabled = true; it.cd = 0; } }
  refresh(kinds) { for (const it of this.items) if (kinds.includes(it.kind)) { it.used = false; it.cd = 0; } }
  setLock(kind, fn) { this.locks[kind] = fn; } // fn(item) → texto si está bloqueado
  available(it) { return it.enabled && !it.used && it.cd <= 0; }
  activate(it, p = this.game.player) {
    const g = this.game, w = p.weapons, hud = p.idx ? g.hud2 : g.hud;
    if (it.kind === 'action') { this.removeAction(it); if (it.onUse) it.onUse(p); g.events.emit('interact:used', { id: it.id, kind: it.kind, item: it, player: p }); return; }
    if (it.kind === 'ammo') { if (!w.refill()) { hud.alert('Munición completa', '', 'info', 1.4); return; } hud.alert('Munición', 'Reserva al máximo', 'info', 1.4); }
    else if (it.kind === 'med') { if (p.health >= p.stats.maxHealth) { hud.alert('Salud completa', '', 'info', 1.4); return; } p.heal(55); g.audio.heal(); hud.alert('Botiquín', '+55 de salud', 'info', 1.4); }
    else if (it.kind === 'weapon') { w.give(it.weapon); hud.alert(WEAPONS[it.weapon].name, 'Arma equipada · munición completa', 'success', 1.8); }
    else if (it.sfx === 'fire') { g.world.lightFire(it.id); g.audio.ignite(); }
    else { const s = it.sfx && g.audio[it.sfx]; if (s) s.call(g.audio); else g.audio.pickup(); }
    if (it.kind === 'weapon' && g.modeKind === 'survival') { it.cd = 2; } // el armero de supervivencia se puede reutilizar (recarga esa arma)
    else if (it.respawn) { it.used = true; it.cd = it.respawn; }
    else if (it.kind === 'ammo' || it.kind === 'med') { if (g.activePlayers.length > 1) { it.used = true; it.cd = 25; } else it.used = true; } // en dúo, los recogibles reaparecen
    else it.used = true;
    g.events.emit('interact:used', { id: it.id, kind: it.kind, item: it, player: p });
  }
  update(dt, game) {
    for (const it of this.items) {
      if (it.cd > 0) { it.cd -= dt; if (it.cd <= 0 && (it.respawn || it.kind === 'ammo' || it.kind === 'med')) it.used = false; }
      if (!it.beacon) { if (it.follow) { it.x = it.follow.position.x; it.z = it.follow.position.z; } continue; } // acción temporal
      const vis = this.available(it);
      it.beacon.visible = vis; const showProp = vis || (it.kind === 'weapon' && game.modeKind === 'survival'); for (const m of it.props) m.visible = showProp;
      if (vis) { const k = 0.75 + 0.25 * Math.sin(game.time * 4 + it.x); it.beacon.material.opacity = k; it.beacon.position.y = (it.kind === 'objective' ? 1.75 : 0.95) + Math.sin(game.time * 2 + it.z) * 0.06; }
    }
    for (let i = 0; i < 2; i++) this.updatePlayer(dt, game, game.players[i], i);
  }
  updatePlayer(dt, game, P, i) {
    const S = this.st[i], E = this.el[i]; if (!E.box) return;
    let best = null, bd = Infinity;
    if (P && P.active && P.alive) for (const it of this.items) {
      if (!this.available(it) || (it.only && it.only !== P)) continue;
      const d = it.follow ? 0 : Math.hypot(P.position.x - it.x, P.position.z - it.z), sc = it.kind === 'action' ? d - 100 : d; // las acciones mandan
      if (d < it.r && sc < bd) { bd = sc; best = it; }
    }
    if (best !== S.cur) { S.cur = best; S.holdT = 0; }
    const it = S.cur, lock = it && this.locks[it.kind] ? this.locks[it.kind](it) : null, inp = P ? P.input : null;
    if (it && !lock && inp && inp.use) {
      S.holdT += dt;
      if (S.holdT >= it.hold) { S.holdT = 0; this.activate(it, P); }
    } else S.holdT = Math.max(0, S.holdT - dt * 3);
    // Indicador en pantalla (texto + anillo de progreso) y botón táctil contextual (solo jugador 1)
    const touch = !!(inp && inp.usingTouch && !inp.pad), show = !!it, text = it ? lock || (it.label || (it.kind === 'ammo' ? 'Coger munición' : it.kind === 'med' ? 'Usar botiquín' : it.kind === 'weapon' ? 'Coger ' + WEAPONS[it.weapon].short.toLowerCase() : 'Usar')) : '';
    const V = this.view[i]; V.show = show; V.text = text; V.ring = it ? S.holdT / it.hold : 0;
    const set = (k, v, fn) => { k = i + k; if (this.cache[k] !== v) { this.cache[k] = v; fn(v); } };
    set('show', show, (v) => { E.box.classList.toggle('show', v); if (E.use) E.use.hidden = !v || !touch || !!lock; });
    set('lock', !!lock, (v) => { E.box.classList.toggle('lock', v); if (E.use) E.use.hidden = !show || !touch || v; });
    set('text', text, (v) => { E.text.textContent = v; });
    set('key', touch ? '' : inp && inp.pad ? 'A' : 'E', (v) => { E.key.textContent = v; E.key.hidden = !v; });
    set('ring', it ? Math.round((S.holdT / it.hold) * 40) : 0, (v) => { E.ring.style.strokeDashoffset = String(62.8 * (1 - v / 40)); });
  }
  dispose() {
    this.objs.forEach((o) => { if (o.isMat) { o.material.dispose(); return; } o.removeFromParent(); o.traverse((c) => { if (c.geometry && !c.isSprite && !c.userData.shared) c.geometry.dispose(); }); if (o.material && o.isSprite) o.material.dispose(); });
    for (const E of this.el) { if (E.box) E.box.classList.remove('show'); if (E.use) E.use.hidden = true; }
  }
}
