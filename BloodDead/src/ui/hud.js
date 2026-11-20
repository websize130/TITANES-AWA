import * as THREE from 'three';
import { $, damp } from '../core/utils.js';
import { icon } from './icons.js';
import { CONFIG } from '../data/config.js';
import { TextureFactory } from '../render/textures.js';

/* =====================================================================
   HUD: electrocardiograma, resistencia, batería, mira, marcador
   ===================================================================== */
export class HUD {
  constructor(game) {
    this.game = game;
    const ids = { root: 'hud', tracker: 'tracker', trList: 'trList', trMode: 'trModeText', trTime: 'trTime', bb: 'bossBar', bbName: 'bbName', bbState: 'bbState', bbHp: 'bbHp', bbLag: 'bbLag', hpBar: 'hpBar', spore: 'spore', ammoBox: 'ammoBox', ammoName: 'ammoName', ammoMag: 'ammoMag', ammoRes: 'ammoRes', ammoSlot: 'ammoSlot', ammoRl: 'ammoRl', tDesc: 'toastDesc', tReload: 'tReload', tWeapon: 'tWeapon', name: 'hudName', role: 'hudRole', avatar: 'hudAvatar', ecg: 'ecg', ecgState: 'ecgState', hp: 'hpText', stam: 'stamBar', stamWrap: 'stamWrap', batt: 'battBar', battWrap: 'battWrap', cross: 'crosshair', marker: 'marker', mDist: 'markerDist', toast: 'toast', tTitle: 'toastTitle', tSub: 'toastSub', damage: 'damage', hint: 'hint', lock: 'lockHint', grain: 'grain', respawn: 'respawn' };
    this.el = {}; for (const k in ids) this.el[k] = document.getElementById(ids[k]);
    this.el.bpm = document.getElementById('bpmText'); this.ecgT = 0; this.mk = { x: -1, y: -1 }; this.trItems = new Map(); this.alertQ = []; this.alertOn = false;
    this.cache = {}; this.ecgX = 0; this.ecgY = 0; this.ecgPh = 0; this.ecgAcc = 0; this.dpr = 1; this.v = new THREE.Vector3(); this.distT = 0; this.dmg = 0;
    this.el.grain.style.backgroundImage = `url(${TextureFactory.grainURL})`;
    this.el.marker.style.width = '60px';
    this.ctx = this.el.ecg.getContext('2d');
    const mine = (p) => !p || p === game.players[0];
    game.events.on('player:damaged', (e) => { if (mine(e.player)) this.dmg = Math.min(1, this.dmg + 0.6); });
    const coin = $('#coinCount'), pop = $('#coinPop'), kills = $('#killCount'), hm = $('#hitmarker');
    game.events.on('loot:coin', ({ value, total }) => {
      coin.textContent = total; const s = coin.parentElement; s.classList.remove('bump'); void s.offsetWidth; s.classList.add('bump');
      pop.textContent = '+' + value; pop.classList.remove('show'); void pop.offsetWidth; pop.classList.add('show');
    });
    game.events.on('zombie:killed', ({ kills: k }) => { kills.textContent = k; });
    // Marcador de impacto: blanco en el cuerpo, ROJO BRILLANTE en la cabeza, grande al abatir, acero si rebota
    this.onHit = (el, e) => { el.className = ''; void el.offsetWidth; el.className = 'show' + (e.zone === 'head' || e.zone === 'core' || e.zone === 'pod' ? ' head' : '') + (e.killed ? ' kill' : e.blocked || e.armor ? ' armor' : ''); };
    game.events.on('zombie:hit', (e) => { if (mine(e.by)) this.onHit(hm, e); });
    game.events.on('boss:helmet', () => this.alert('¡Casco roto!', 'Ahora, a la cabeza', 'danger', 2.4));
    game.events.on('boss:stunned', () => this.alert('¡Aturdido!', 'Su espalda está expuesta: dispara', 'info', 1.8));
    game.events.on('boss:exposed', () => this.alert('¡Al descubierto!', 'Tras el salto queda expuesto: dispara ya', 'info', 1.6));
    game.events.on('boss:revealed', () => this.alert('¡La luz lo ciega!', 'Mantén la linterna sobre él y dispara', 'info', 1.8));
    game.events.on('boss:plate', ({ left }) => this.alert(left ? '¡Placa arrancada!' : '¡Blindaje destrozado!', left ? `Quedan ${left} placa${left > 1 ? 's' : ''}` : 'La carne está expuesta: ¡a por él!', left ? 'info' : 'danger', 2.2));
    game.events.on('boss:pod', ({ left }) => this.alert(left ? '¡Vaina reventada!' : '¡Núcleo expuesto!', left ? `Quedan ${left}` : 'Ya no se regenera: dispara al núcleo', left ? 'info' : 'danger', 2));
    game.events.on('boss:brood', () => this.alert('¡Enjambre!', 'Cuchillo o disparos: no dejes que se te suban', 'danger', 2));
    game.events.on('weapon:empty', (e) => { if (mine(e.player)) this.alert('Sin munición', 'Busca una caja de munición', 'info', 1.8); });
  }
  show(def, isTouch) {
    this.cache = {};
    $('#coinCount').textContent = '0'; $('#killCount').textContent = '0';
    this.el.name.textContent = def.name; this.el.role.textContent = `${def.role} · ${def.archetype}`;
    this.el.avatar.textContent = def.initials; this.el.avatar.style.setProperty('--c', def.accent);
    document.body.dataset.touch = isTouch ? '1' : '0';
    this.el.root.hidden = false; this.sizeECG(); this.showHint(isTouch);
  }
  hide() {
    this.el.root.hidden = true; this.setLockHint(false); this.bossHide(); this.alertQ.length = 0; clearTimeout(this.toastT); this.el.toast.className = ''; this.alertOn = false;
    $('#prompt').classList.remove('show'); $('#tUse').hidden = true; this.setSpore(0); this.el.respawn.hidden = true;
  }
  /* ---------- Rastreador de misiones ---------- */
  trackerReset() { this.trItems.clear(); this.el.trList.innerHTML = ''; this.trackerTime('', false); }
  trackerHead(t) { this.el.trMode.textContent = t; }
  trackerAdd(id, text, prog = '', sub = false) {
    if (this.trItems.has(id)) this.trackerRemove(id);
    const li = document.createElement('li'); li.className = 'q-item new' + (sub ? ' sub' : '');
    li.innerHTML = `<span class="q-box">${icon('check')}</span><span class="q-text"></span><span class="q-prog"></span>`;
    li.children[1].textContent = text; li.children[2].textContent = prog;
    this.el.trList.appendChild(li); this.trItems.set(id, li); this.trackerPulse();
  }
  trackerProg(id, prog) { const li = this.trItems.get(id); if (li && li.children[2].textContent !== prog) li.children[2].textContent = prog; }
  trackerDone(id) { // casilla marcada + destello; se retira poco después
    const li = this.trItems.get(id); if (!li) return;
    this.trItems.delete(id); li.classList.remove('new'); li.classList.add('done'); this.trackerPulse();
    setTimeout(() => { li.classList.add('gone'); setTimeout(() => li.remove(), 550); }, 2300);
  }
  trackerRemove(id) { const li = this.trItems.get(id); if (!li) return; this.trItems.delete(id); li.classList.add('gone'); setTimeout(() => li.remove(), 550); }
  trackerTime(t, warn) { this.set('trT', t, (v) => { this.el.trTime.textContent = v; }); this.set('trW', !!warn, (v) => this.el.trTime.classList.toggle('warn', v)); }
  trackerPulse() { const tr = this.el.tracker; tr.classList.remove('pulse'); void tr.offsetWidth; tr.classList.add('pulse'); clearTimeout(this.trPT); this.trPT = setTimeout(() => tr.classList.remove('pulse'), 900); }
  /* ---------- Alertas centrales (con cola: las de peligro y capítulo se adelantan) ---------- */
  alert(title, sub = '', kind = 'info', dur = 3, desc = '') {
    const a = { title, sub, kind, dur, desc };
    if (this.alertOn && kind !== 'danger' && kind !== 'chapter') { if (this.alertQ.length < 3) this.alertQ.push(a); return; }
    this.showAlert(a);
  }
  showAlert(a) {
    const el = this.el.toast; clearTimeout(this.toastT); clearTimeout(this.toastQ);
    el.className = a.kind; void el.offsetWidth;
    this.el.tTitle.textContent = a.title; this.el.tSub.textContent = a.sub; this.el.tDesc.textContent = a.desc || '';
    el.classList.add('show'); this.alertOn = true;
    this.toastT = setTimeout(() => { el.classList.remove('show'); this.toastQ = setTimeout(() => { this.alertOn = false; const n = this.alertQ.shift(); if (n) this.showAlert(n); }, 380); }, a.dur * 1000);
  }
  /* ---------- Barra del jefe ---------- */
  bossShow(name) { this.el.bb.hidden = false; this.el.bbName.textContent = name; ['bbh', 'bbs', 'bbt', 'bbhot'].forEach((k) => delete this.cache[k]); this.bossUpdate(1, false, '', false); }
  bossHide() { this.el.bb.hidden = true; }
  bossUpdate(frac, shield, state, hot) {
    this.set('bbh', Math.round(frac * 400) / 400, (v) => { this.el.bbHp.style.transform = `scaleX(${v})`; this.el.bbLag.style.transform = `scaleX(${v})`; });
    this.set('bbs', !!shield, (v) => this.el.bb.classList.toggle('shield', v));
    this.set('bbt', state, (v) => { this.el.bbState.textContent = v; });
    this.set('bbhot', !!hot, (v) => this.el.bbState.classList.toggle('hot', v));
  }
  setSpore(k) { this.set('spore', Math.round(k * 20) / 20, (v) => { this.el.spore.style.opacity = String(v * 0.92); }); }
  sizeECG() {
    const c = this.el.ecg, dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = Math.round((c.clientWidth || 200) * dpr); c.height = Math.round((c.clientHeight || 54) * dpr);
    this.dpr = dpr; this.ecgX = 0; this.ecgY = c.height * 0.66; this.ctx.clearRect(0, 0, c.width, c.height);
  }
  toast(title, sub = '') { this.alert(title, sub, 'info', 3.2); }
  showHint(isTouch, pad = false) {
    const k = (key, txt) => `<span><span class="kbd">${key}</span>${txt}</span>`;
    this.el.hint.innerHTML = pad
      ? [k('LS', 'mover · L3 correr'), k('RS', 'cámara'), k('LT', 'apuntar'), k('RT', 'disparar'), k('B / ○', 'agacharse · deslizar'), k('RB', 'cuchillo'), k('X / □', 'recargar'), k('Y / △', 'arma'), k('A / ✕', 'usar'), k('↑', 'linterna'), k('START', 'pausa')].join('')
      : isTouch
        ? `<span>Joystick: moverse · al borde superior, correr</span><span>Desliza a la derecha: mirar</span><span>${icon('crosshair')} disparar · ${icon('scan')} apuntar · ${icon('slide')} agacharse (corriendo: deslizar) · ${icon('knife')} cuchillo · ${icon('hand')} usar</span>`
        : [k('WASD', 'mover'), k('Ratón', 'mirar'), k('Clic dcho.', 'apuntar'), k('Clic izq.', 'disparar'), k('C / Ctrl', 'agacharse · corriendo: deslizar'), k('V', 'cuchillo'), k('R', 'recargar'), k('E', 'usar'), k('1/2', 'armas'), k('Shift', 'correr'), k('F', 'linterna'), k('Esc', 'pausa')].join('');
    this.el.hint.classList.toggle('touch', isTouch && !pad);
    this.el.hint.classList.remove('out');
    clearTimeout(this.hintT); this.hintT = setTimeout(() => this.el.hint.classList.add('out'), 9000);
  }
  setLockHint(v) { this.el.lock.hidden = !v; }
  set(key, val, fn) { if (this.cache[key] !== val) { this.cache[key] = val; fn(val); } }
  wave(p) {
    const g = (c, w, a) => a * Math.exp(-((p - c) * (p - c)) / (2 * w * w));
    return g(0.15, 0.025, 0.12) + g(0.29, 0.008, -0.15) + g(0.31, 0.01, 1) + g(0.335, 0.009, -0.3) + g(0.55, 0.04, 0.25);
  }
  drawECG(dt, bpm, color) {
    const c = this.el.ecg, ctx = this.ctx, W = c.width, H = c.height, speed = 60 * this.dpr, phPerPx = bpm / 60 / speed;
    this.ecgAcc += speed * dt;
    ctx.lineWidth = 1.7 * this.dpr; ctx.strokeStyle = color; ctx.lineCap = 'round'; // sin shadowBlur: es caro en móviles
    ctx.beginPath(); let started = false;
    while (this.ecgAcc >= 1) {
      this.ecgAcc -= 1;
      const x = this.ecgX; ctx.clearRect(x, 0, 10 * this.dpr, H);
      this.ecgPh += phPerPx;
      const y = H * 0.66 - this.wave(this.ecgPh % 1) * H * 0.5;
      if (!started) { ctx.moveTo(x - 1, this.ecgY); started = true; }
      ctx.lineTo(x, y); this.ecgY = y; this.ecgX = x + 1;
      if (this.ecgX >= W) { ctx.stroke(); ctx.beginPath(); started = false; this.ecgX = 0; }
    }
    ctx.stroke();
  }
  update(dt) {
    const g = this.game, p = g.players[0], el = this.el;
    if (!p) return;
    const rig = p.rig, r = p.health / p.stats.maxHealth, status = r > 0.6 ? 0 : r > 0.3 ? 1 : 2;
    const colors = ['#d6d2ca', '#c8471f', '#ff1a1a'], labels = ['ESTABLE', 'PRECAUCIÓN', 'PELIGRO'];
    this.set('status', status, (s) => { el.ecgState.textContent = labels[s]; el.ecgState.style.setProperty('--stc', colors[s]); el.bpm.style.setProperty('--stc', colors[s]); });
    this.set('hp', Math.ceil(p.health), (v) => { el.hp.textContent = v; });
    this.set('hpb', Math.round(r * 100) / 100, (v) => { el.hpBar.style.transform = `scaleX(${v})`; });
    const w = p.weapons;
    if (w) { // munición: nombre, cargador / reserva, ranura y barra de recarga
      const A = w.A, W = w.W;
      this.set('amN', W.short, (v) => { el.ammoName.textContent = v; });
      this.set('amM', A.mag, (v) => { el.ammoMag.textContent = v; });
      this.set('amR', A.res === Infinity ? '∞' : A.res, (v) => { el.ammoRes.textContent = v; });
      this.set('amS', `${w.cur + 1}/${w.inv.length}`, (v) => { el.ammoSlot.textContent = v; });
      this.set('amL', A.mag === 0 ? 2 : A.mag <= Math.ceil(W.mag * 0.25) ? 1 : 0, (v) => { el.ammoBox.classList.toggle('low', v === 1); el.ammoBox.classList.toggle('empty', v === 2); });
      this.set('amRl', w.reloadT > 0 ? Math.round((1 - w.reloadT / w.reloadDur) * 40) / 40 : 0, (v) => { el.ammoRl.style.transform = `scaleX(${v})`; });
      this.set('amBusy', w.reloadT > 0, (v) => el.tReload.classList.toggle('busy', v));
      this.set('amTw', w.inv.length > 1, (v) => { el.tWeapon.style.opacity = v ? '1' : '0.35'; });
    }
    this.bpm = damp(this.bpm || 72, [72, 98, 128][status] + (p.running ? 30 : 0) + (p.hurtT || 0) * 18, 1.5, dt);
    this.set('bpmv', Math.round(this.bpm), (v) => { el.bpm.textContent = v; });
    this.ecgT += dt; if (this.ecgT >= 1 / 30) { this.drawECG(this.ecgT, this.bpm, colors[status]); this.ecgT = 0; } // 30 Hz basta para el trazo
    this.set('stam', Math.round((p.stamina / p.stats.stamina) * 100) / 100, (v) => { el.stam.style.transform = `scaleX(${v})`; });
    this.set('exh', p.exhausted, (v) => el.stamWrap.classList.toggle('low', v));
    this.set('batt', Math.round(p.flashlight.battery) / 100, (v) => { el.batt.style.transform = `scaleX(${v})`; el.battWrap.classList.toggle('low', v < 0.15); el.battWrap.classList.toggle('gold', v >= 0.15); });
    this.set('cross', rig.aimBlend > 0.55, (v) => el.cross.classList.toggle('on', v));
    this.set('lock', !!rig.lockOn, (v) => el.cross.classList.toggle('lock', v)); // apuntado automático enganchado
    this.set('spread', Math.round(6 + p.speed * 3 + (1 - rig.aimBlend) * 6), (v) => el.cross.style.setProperty('--s', v + 'px'));
    this.dmg = Math.max(0, this.dmg - dt * 1.2);
    const pulse = status === 2 ? 0.35 + Math.sin(performance.now() / 300) * 0.1 : 0;
    this.set('dmg', Math.round(Math.max(this.dmg, pulse) * 50) / 50, (v) => { el.damage.style.opacity = v; });
    // Caído en dúo: cuenta atrás para reaparecer junto al compañero
    const rs = !p.alive && g.activePlayers.length > 1 && g.activePlayers.some((q) => q.alive) ? Math.max(0, Math.ceil(CONFIG.coop.respawn - (p.respawnT || 0))) : -1;
    this.set('resp', rs, (v) => { el.respawn.hidden = v < 0; if (v >= 0) el.respawn.textContent = `Caído · tu compañero puede reanimarte · reapareces en ${v} s`; });
    const m = g.mode, vh = g.split ? innerHeight / 2 : innerHeight;
    if (m && m.hasTarget) {
      const v = this.v.copy(m.target).project(p.camera); let sx = v.x, sy = v.y; const behind = v.z > 1;
      if (behind) { sx = -sx; sy = -sy; }
      const lim = 0.86;
      if (behind || Math.abs(sx) > lim || Math.abs(sy) > lim) { const k = lim / Math.max(Math.abs(sx), Math.abs(sy), 1e-3); sx *= k; sy *= k; }
      const mx = Math.round((sx * 0.5 + 0.5) * innerWidth - 30), my = Math.round((-sy * 0.5 + 0.5) * vh - 7);
      if (mx !== this.mk.x || my !== this.mk.y) { this.mk.x = mx; this.mk.y = my; el.marker.style.transform = `translate3d(${mx}px,${my}px,0)`; } // solo si se mueve
      this.distT -= dt;
      if (this.distT <= 0) { this.distT = 0.2; el.mDist.textContent = Math.round(Math.hypot(p.position.x - m.target.x, p.position.z - m.target.z)) + ' m'; }
      this.set('mk', true, () => el.marker.classList.add('on'));
    } else this.set('mk', false, () => el.marker.classList.remove('on'));
  }
}

/* HUD compacto del jugador 2 (mitad inferior con la pantalla dividida) */
export class HudLite {
  constructor(game) {
    this.game = game; this.cache = {}; this.dmg = 0;
    const q = (id) => document.getElementById(id);
    this.el = { root: q('hud2'), name: q('h2Name'), avatar: q('h2Avatar'), hp: q('h2Hp'), hpText: q('h2HpText'), mag: q('h2Mag'), res: q('h2Res'), wn: q('h2Weapon'), stam: q('h2Stam'), cross: q('crosshair2'), hm: q('hitmarker2'), toast: q('toast2'), tTitle: q('toast2Title'), tSub: q('toast2Sub'), damage: q('damage2'), respawn: q('respawn2'), input: q('h2Input') };
    const mine = (p) => p && p === game.players[1];
    game.events.on('zombie:hit', (e) => { if (mine(e.by)) game.hud.onHit(this.el.hm, e); });
    game.events.on('player:damaged', (e) => { if (mine(e.player)) this.dmg = Math.min(1, this.dmg + 0.6); });
    game.events.on('weapon:empty', (e) => { if (mine(e.player)) this.alert('Sin munición', 'Busca una caja de munición', 'info', 1.6); });
  }
  show(def) {
    this.cache = {}; this.el.root.hidden = false;
    this.el.name.textContent = def.name; this.el.avatar.textContent = def.initials; this.el.avatar.style.setProperty('--c', def.accent);
  }
  hide() { this.el.root.hidden = true; }
  alert(title, sub = '', kind = 'info', dur = 2) {
    const el = this.el.toast; clearTimeout(this.tT);
    this.el.tTitle.textContent = title; this.el.tSub.textContent = sub; el.className = kind; void el.offsetWidth; el.classList.add('show');
    this.tT = setTimeout(() => el.classList.remove('show'), dur * 1000);
  }
  set(key, val, fn) { if (this.cache[key] !== val) { this.cache[key] = val; fn(val); } }
  update(dt) {
    const g = this.game, p = g.players[1], el = this.el; if (!p || !p.active) return;
    const r = p.health / p.stats.maxHealth, w = p.weapons;
    this.set('hp', Math.ceil(p.health), (v) => { el.hpText.textContent = v; });
    this.set('hpb', Math.round(r * 100) / 100, (v) => { el.hp.style.transform = `scaleX(${v})`; el.root.classList.toggle('low', v < 0.3); });
    this.set('st', Math.round((p.stamina / p.stats.stamina) * 50) / 50, (v) => { el.stam.style.transform = `scaleX(${v})`; });
    if (w) {
      this.set('wn', w.W.short, (v) => { el.wn.textContent = v; });
      this.set('mag', w.A.mag, (v) => { el.mag.textContent = v; });
      this.set('res', w.A.res === Infinity ? '∞' : w.A.res, (v) => { el.res.textContent = v; });
    }
    const rig = p.rig;
    this.set('cross', rig.aimBlend > 0.55, (v) => el.cross.classList.toggle('on', v));
    this.set('lock', !!rig.lockOn, (v) => el.cross.classList.toggle('lock', v));
    this.set('spread', Math.round(6 + p.speed * 3 + (1 - rig.aimBlend) * 6), (v) => el.cross.style.setProperty('--s', v + 'px'));
    this.dmg = Math.max(0, this.dmg - dt * 1.2);
    this.set('dmg', Math.round(this.dmg * 50) / 50, (v) => { el.damage.style.opacity = v; });
    const s = g.pads.state(p.input.pad);
    this.set('in', s ? (s.kind === 'remote' ? 'Móvil' : 'Mando') : 'Sin mando', (v) => { el.input.textContent = v; el.input.classList.toggle('off', v === 'Sin mando'); });
    const rs = !p.alive && g.activePlayers.some((q) => q.alive) ? Math.max(0, Math.ceil(CONFIG.coop.respawn - (p.respawnT || 0))) : -1;
    this.set('resp', rs, (v) => { el.respawn.hidden = v < 0; if (v >= 0) el.respawn.textContent = `Caído · espera la reanimación · ${v} s`; });
  }
}
