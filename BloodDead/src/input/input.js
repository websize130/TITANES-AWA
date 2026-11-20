import { $, IS_TOUCH, clamp } from '../core/utils.js';
import { CONFIG } from '../data/config.js';

/* =====================================================================
   ENTRADA
   Input      → jugador 1: teclado + ratón (pointer lock) + joystick táctil (+ mando si se le asigna)
   PadInput   → jugador 2: un mando físico o el móvil usado como mando
   Pads       → Gamepad API (PlayStation / Xbox por USB o Bluetooth), vibración y navegación de menús
   RemoteLink → el móvil como mando inalámbrico (WebRTC con emparejamiento por el servidor público de PeerJS)
   Botones con el mapeado estándar: 0 A/✕ usar · 1 B/○ agacharse · 2 X/□ recargar · 3 Y/△ arma · 4 LB hombro
   5 RB cuchillo · 6 LT apuntar · 7 RT disparar · 8 Select · 9 Start · 10 L3 correr · 11 R3 cuchillo · 12 ↑ linterna
   ===================================================================== */
export const padName = (label = '') => /xbox|xinput|045e/i.test(label) ? 'Mando Xbox' : /playstation|dualsense|dualshock|054c/i.test(label) ? 'Mando PlayStation' : /nintendo|switch|057e/i.test(label) ? 'Mando Nintendo' : 'Mando';
export const PAD_ACTIONS = { 0: 'interact', 1: 'crouch', 2: 'reload', 3: 'swap', 4: 'shoulder', 5: 'knife', 9: 'pause', 8: 'pause', 11: 'knife', 12: 'flashlight' };
// Aplica el estado de un mando a una entrada (movimiento, cámara con curva, gatillos y pulsaciones)
export function applyPad(inp, ps, dt) {
  const P = CONFIG.pad, dz = P.deadzone, curve = (v) => { const a = Math.abs(v); return a < dz ? 0 : Math.sign(v) * ((a - dz) / (1 - dz)) ** 1.6; };
  const lm = Math.hypot(ps.lx, ps.ly);
  if (lm > dz) { const k = Math.min(1, (lm - dz) / (1 - dz)) / lm; inp.move.x = ps.lx * k; inp.move.y = -ps.ly * k; }
  const ads = inp.aim ? P.aimSlow : 1;
  inp.look.x += curve(ps.rx) * P.look * ads * dt; inp.look.y += curve(ps.ry) * P.look * 0.72 * ads * dt;
  if (ps.look) { inp.look.x += ps.look.x * CONFIG.input.touch; inp.look.y += ps.look.y * CONFIG.input.touch; ps.look.x = ps.look.y = 0; } // arrastre en el móvil
  if (ps.b[6] > 0.3) inp.aim = true;
  if (ps.b[7] > 0.3) inp.fireHeld = true;
  if (ps.b[0] > 0.5) inp.use = true;
  if (ps.b[1] > 0.5) inp.crouchHeld = true;
  if (ps.down[10]) ps.sprint = !ps.sprint; // L3 alterna correr; empujar el stick al máximo hacia delante también corre
  if (lm < 0.3) ps.sprint = false;
  if (ps.sprint || (lm > 0.93 && -ps.ly > 0.75)) inp.run = true;
  if (ps.down[7]) inp.fire();
  for (const i in PAD_ACTIONS) if (ps.down[i]) inp.pressed.add(PAD_ACTIONS[i]);
  if (ps.down[13]) inp.pressed.add('slot1');
  if (lm > dz || ps.down.some((v) => v)) inp.lastPad = performance.now();
}

export class Input {
  constructor(game) {
    this.game = game; this.canvas = game.engine.canvas;
    this.keys = new Set(); this.pressed = new Set();
    this.move = { x: 0, y: 0 }; this.look = { x: 0, y: 0 };
    this.aim = false; this.run = false; this.mouseAim = false; this.touchAim = false; this.runToggle = false; this.fireHeld = false; this.mouseFire = false; this.touchFire = false; this.use = false; this.touchUse = false; this.wheelT = 0; this.crouchHeld = false;
    this.locked = false; this.wasLocked = false; this.drag = false; this.usingTouch = IS_TOUCH; this.pad = null;
    this.joy = { id: null, x: 0, y: 0, ox: 0, oy: 0, sprint: false }; this.lookId = null; this.lx = 0; this.ly = 0;
    this.bindKeyboard(); this.bindMouse(); this.bindTouch();
  }
  get active() { return this.game.state === 'playing' && !this.game.cine.on; }
  bindKeyboard() {
    const block = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight', 'ControlLeft', 'KeyC']);
    addEventListener('keydown', (e) => {
      this.lastKbm = performance.now();
      if (this.game.cine && this.game.cine.on && !e.repeat) { this.game.cine.skip(); return; }
      if (!this.active) return;
      if (block.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'KeyF') this.pressed.add('flashlight');
      if (e.code === 'KeyQ') this.pressed.add('shoulder');
      if (e.code === 'KeyV') this.pressed.add('knife');
      if (e.code === 'KeyE') this.pressed.add('interact');
      if (e.code === 'KeyR') this.pressed.add('reload');
      if (e.code === 'KeyC' || e.code === 'ControlLeft') this.pressed.add('crouch');
      if (e.code === 'KeyX' || e.code === 'Tab') { e.preventDefault(); this.pressed.add('swap'); }
      if (e.code === 'Digit1') this.pressed.add('slot1');
      if (e.code === 'Digit2') this.pressed.add('slot2');
      if (e.code === 'Escape' || e.code === 'KeyP') this.pressed.add('pause');
    });
    addEventListener('keyup', (e) => this.keys.delete(e.code));
    addEventListener('blur', () => { this.keys.clear(); this.mouseAim = false; });
  }
  requestLock() {
    if (this.usingTouch || !this.canvas.requestPointerLock) return;
    try { const p = this.canvas.requestPointerLock(); if (p && p.catch) p.catch(() => { this.lockFailed = true; }); } catch (e) { this.lockFailed = true; /* sin pointer lock: se usa arrastre */ }
  }
  exitLock() { if (document.pointerLockElement) document.exitPointerLock(); }
  bindMouse() {
    const cv = this.canvas;
    cv.addEventListener('contextmenu', (e) => e.preventDefault());
    cv.addEventListener('pointerdown', (e) => {
      if (this.game.cine && this.game.cine.on) { this.game.cine.skip(); return; }
      if (e.pointerType !== 'mouse' || !this.active) return;
      this.usingTouch = false; this.lastKbm = performance.now();
      if (!this.locked) { this.requestLock(); this.drag = true; this.down = { x: e.clientX, y: e.clientY, t: performance.now() }; }
      if (e.button === 2) this.mouseAim = true;
      if (e.button === 1) { e.preventDefault(); this.pressed.add('knife'); } // rueda: cuchillo
      if (e.button === 0 && this.locked) { this.fire(); this.mouseFire = true; }
    });
    addEventListener('wheel', (e) => { if (!this.active || performance.now() - this.wheelT < 220 || Math.abs(e.deltaY) < 4) return; this.wheelT = performance.now(); this.pressed.add('swap'); }, { passive: true });
    addEventListener('pointerup', (e) => {
      if (e.pointerType !== 'mouse') return;
      if (e.button === 2) this.mouseAim = false;
      if (e.button === 0) {
        this.drag = false; this.mouseFire = false;
        // Sin pointer lock (p. ej. dentro de un iframe): un clic corto sin arrastrar dispara
        const d = this.down; this.down = null;
        if (this.lockFailed && d && this.active && Math.hypot(e.clientX - d.x, e.clientY - d.y) < 6 && performance.now() - d.t < 260) this.fire();
      }
    });
    document.addEventListener('pointerlockerror', () => { this.lockFailed = true; });
    addEventListener('mousemove', (e) => {
      if (!this.active || !(this.locked || this.drag)) return;
      this.lastKbm = performance.now(); this.look.x += e.movementX * CONFIG.input.mouse; this.look.y += e.movementY * CONFIG.input.mouse;
    });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === cv;
      if (this.game.hud) this.game.hud.setLockHint(!this.locked && this.active && !this.usingTouch && !this.pad);
      if (!this.locked && this.wasLocked && this.active) this.game.pause();
      this.wasLocked = this.locked;
    });
  }
  bindTouch() {
    const jz = $('#joyZone'), lz = $('#lookZone'), joy = $('#joy'), knob = $('#joyKnob'), R = 58;
    const setJoy = (x, y) => { joy.style.transform = `translate3d(${x}px,${y}px,0)`; };
    this.resetJoy = () => setJoy(Math.max(96, innerWidth * 0.12), innerHeight - 140);
    this.resetJoy();
    jz.addEventListener('pointerdown', (e) => {
      if (this.joy.id !== null) return;
      this.usingTouch = true; this.lastKbm = performance.now(); this.joy.id = e.pointerId; this.joy.ox = e.clientX; this.joy.oy = e.clientY;
      setJoy(e.clientX, e.clientY); joy.classList.add('active'); jz.setPointerCapture(e.pointerId);
    });
    // Joystick analógico: poco recorrido = caminar despacio; al llevarlo al borde superior se esprinta (sin botón de correr)
    jz.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.joy.id) return;
      let dx = e.clientX - this.joy.ox, dy = e.clientY - this.joy.oy; const l = Math.hypot(dx, dy), lr = l / R, up = l > 1e-3 ? -dy / l : 0;
      if (l > R) { dx *= R / l; dy *= R / l; }
      const m = clamp((Math.min(1, lr) - 0.12) / 0.8, 0, 1), k = l > 1e-3 ? m / Math.min(1, lr) : 0;
      this.joy.x = (dx / R) * k; this.joy.y = (-dy / R) * k;
      const sprint = this.joy.sprint ? lr >= 0.84 && up > 0.3 : lr >= 0.93 && up > 0.42; // con histéresis para que no parpadee
      if (sprint !== this.joy.sprint) { this.joy.sprint = sprint; joy.classList.toggle('sprint', sprint); if (sprint && navigator.vibrate) try { navigator.vibrate(12); } catch (err) { /* sin vibración */ } }
      knob.style.transform = `translate3d(${dx}px,${dy}px,0)`;
    });
    const endJoy = (e) => { if (e.pointerId !== this.joy.id) return; this.joy.id = null; this.joy.x = this.joy.y = 0; this.joy.sprint = false; knob.style.transform = ''; joy.classList.remove('active', 'sprint'); this.resetJoy(); };
    jz.addEventListener('pointerup', endJoy); jz.addEventListener('pointercancel', endJoy);
    lz.addEventListener('pointerdown', (e) => { if (this.game.cine && this.game.cine.on) { this.game.cine.skip(); return; } if (this.lookId !== null) return; this.usingTouch = true; this.lookId = e.pointerId; this.lx = e.clientX; this.ly = e.clientY; lz.setPointerCapture(e.pointerId); });
    lz.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookId) return;
      this.look.x += (e.clientX - this.lx) * CONFIG.input.touch; this.look.y += (e.clientY - this.ly) * CONFIG.input.touch;
      this.lx = e.clientX; this.ly = e.clientY;
    });
    const endLook = (e) => { if (e.pointerId === this.lookId) this.lookId = null; };
    lz.addEventListener('pointerup', endLook); lz.addEventListener('pointercancel', endLook);
    const haptic = (ms) => { if (navigator.vibrate) try { navigator.vibrate(ms); } catch (err) { /* sin vibración */ } };
    const btn = (id, fn) => { const b = $(id); b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); haptic(8); fn(b); }); };
    btn('#tAim', (b) => { this.touchAim = !this.touchAim; b.classList.toggle('on', this.touchAim); });
    btn('#tKnife', (b) => { this.pressed.add('knife'); b.classList.add('fired'); clearTimeout(this.knifeFx); this.knifeFx = setTimeout(() => b.classList.remove('fired'), 180); });
    btn('#tLight', () => this.pressed.add('flashlight'));
    btn('#tShoulder', () => this.pressed.add('shoulder'));
    btn('#tFire', (b) => { this.fire(); this.touchFire = true; b.classList.add('fired'); clearTimeout(this.firedT); this.firedT = setTimeout(() => b.classList.remove('fired'), 150); });
    btn('#tReload', () => this.pressed.add('reload'));
    btn('#tWeapon', () => this.pressed.add('swap'));
    btn('#tSlide', (b) => { this.pressed.add('crouch'); b.classList.add('fired'); clearTimeout(this.slideFx); this.slideFx = setTimeout(() => b.classList.remove('fired'), 220); });
    btn('#tUse', (b) => { this.touchUse = true; b.classList.add('on'); });
    // Botones mantenidos: disparo automático y acción «usar»
    const release = (id, fn) => { const b = $(id); for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) b.addEventListener(ev, () => fn(b)); };
    release('#tFire', () => { this.touchFire = false; });
    release('#tUse', (b) => { this.touchUse = false; b.classList.remove('on'); });
  }
  fire() { this.pressed.add('fire'); this.game.events.emit('input:fire'); }
  update(dt = 1 / 60) {
    const k = this.keys; let x = 0, y = 0;
    if (k.has('KeyW') || k.has('ArrowUp')) y += 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (x || y) { const l = Math.hypot(x, y); x /= l; y /= l; }
    if (this.joy.id !== null) { x = this.joy.x; y = this.joy.y; }
    this.move.x = x; this.move.y = y;
    this.aim = this.mouseAim || this.touchAim;
    this.fireHeld = (this.mouseFire && (this.locked || this.lockFailed)) || this.touchFire;
    this.use = k.has('KeyE') || this.touchUse;
    this.crouchHeld = k.has('KeyC') || k.has('ControlLeft');
    this.run = k.has('ShiftLeft') || k.has('ShiftRight') || (this.joy.id !== null && this.joy.sprint);
    if (this.pad) { const ps = this.game.pads.state(this.pad); if (ps) applyPad(this, ps, dt); } // mando asignado al jugador 1
  }
  consume(a) { if (this.pressed.has(a)) { this.pressed.delete(a); return true; } return false; }
  endFrame() { this.look.x = 0; this.look.y = 0; this.pressed.clear(); }
  reset() {
    this.keys.clear(); this.pressed.clear(); this.mouseAim = this.touchAim = this.runToggle = this.drag = false; this.mouseFire = this.touchFire = this.fireHeld = this.touchUse = this.use = this.crouchHeld = false;
    this.joy.id = null; this.joy.x = this.joy.y = 0; this.joy.sprint = false; this.lookId = null; this.look.x = this.look.y = 0;
    $('#tAim').classList.remove('on'); $('#tUse').classList.remove('on'); $('#joy').classList.remove('active', 'sprint'); $('#joyKnob').style.transform = '';
  }
}

// Entrada del jugador 2: solo mando (físico o móvil)
export class PadInput {
  constructor(game, key) {
    this.game = game; this.pad = key; this.pressed = new Set(); this.move = { x: 0, y: 0 }; this.look = { x: 0, y: 0 };
    this.aim = false; this.run = false; this.fireHeld = false; this.use = false; this.crouchHeld = false; this.usingTouch = false; this.locked = true;
  }
  update(dt = 1 / 60) {
    this.move.x = this.move.y = 0; this.aim = this.run = this.fireHeld = this.use = this.crouchHeld = false;
    const ps = this.game.pads.state(this.pad); if (ps) applyPad(this, ps, dt);
  }
  fire() { this.pressed.add('fire'); }
  consume(a) { if (this.pressed.has(a)) { this.pressed.delete(a); return true; } return false; }
  endFrame() { this.look.x = 0; this.look.y = 0; this.pressed.clear(); }
  reset() { this.pressed.clear(); this.look.x = this.look.y = 0; }
}
