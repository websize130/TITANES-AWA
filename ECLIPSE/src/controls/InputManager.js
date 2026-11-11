import { PAD, detectFamily } from './GamepadProfiles.js';

/**
 * Entrada unificada: teclado + ratón, mando (Gamepad API) y controles táctiles.
 * - Detecta el dispositivo activo y emite 'input:device' al cambiar.
 * - Contexto 'menu': emite 'ui:input' { type: nav|confirm|back|start|other, dir }.
 * - Contexto 'game': expone move, lookDelta y wasPressed(acción).
 * Teclado/ratón y mando pueden usarse a la vez; manda el último que se tocó.
 */

const DEADZONE = 0.18;
const NAV_THRESHOLD = 0.55;
const NAV_DELAY = 0.38;
const NAV_REPEAT = 0.11;

const MENU_KEYS = {
  ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right',
  Enter: 'confirm', NumpadEnter: 'confirm', Space: 'confirm',
  Escape: 'back', Backspace: 'back',
};

const GAME_KEYS = {
  Space: 'dodge', ShiftLeft: 'dodge', ShiftRight: 'dodge',
  KeyE: 'interact', KeyQ: 'skill', KeyJ: 'attack',
  Escape: 'pause', KeyP: 'pause',
};

const GAME_PAD = [
  ['interact', PAD.SOUTH], ['dodge', PAD.EAST], ['attack', PAD.WEST], ['skill', PAD.NORTH],
  ['pause', PAD.START], ['pause', PAD.SELECT],
];

// Teclas cuyo comportamiento por defecto del navegador se bloquea (scroll, foco, atrás)
const BLOCKED = new Set(['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab', 'Backspace', 'Enter']);
const IGNORED_AS_ANY = /^(F\d+|Meta|Alt|Control|OS|ContextMenu|Tab)/;

function radial(x, y, out) {
  const len = Math.hypot(x, y);
  if (len < DEADZONE) { out.x = 0; out.y = 0; return; }
  const scaled = Math.min(1, (len - DEADZONE) / (1 - DEADZONE)) / len;
  out.x = x * scaled;
  out.y = y * scaled;
}

export class InputManager {
  constructor(bus, settings) {
    this.bus = bus;
    this.settings = settings;
    this.device = matchMedia('(pointer: coarse)').matches ? 'touch' : 'kbm';
    this.padFamily = 'generic';
    this.padIndex = -1;
    this.context = 'menu';

    this.move = { x: 0, y: 0 };
    this.lookDelta = { x: 0, y: 0 };
    this.virtualMove = { x: 0, y: 0 };

    this.#padMove = { x: 0, y: 0 };
    this.#padLook = { x: 0, y: 0 };
    this.#bind();
  }

  #held = new Set();
  #pending = new Set();
  #pressed = new Set();
  #prevButtons = [];
  #padMove; #padLook;
  #mouseDX = 0; #mouseDY = 0;
  #touchDX = 0; #touchDY = 0;
  #navDir = null; #navTimer = 0;

  setContext(ctx) {
    this.context = ctx;
    this.#held.clear();
    this.#pending.clear();
    this.#pressed.clear();
    this.#navDir = null;
    this.virtualMove.x = this.virtualMove.y = 0;
  }

  wasPressed(action) { return this.#pressed.has(action); }

  // ---- API para controles táctiles ----
  setVirtualMove(x, y) { this.virtualMove.x = x; this.virtualMove.y = y; this.#setDevice('touch'); }
  addTouchLook(dx, dy) { this.#touchDX += dx; this.#touchDY += dy; }
  pressVirtual(action) { this.#pending.add(action); this.#setDevice('touch'); }

  /** Llamar una vez por frame, antes de la lógica del juego. */
  update(dt) {
    this.#pressed.clear();
    for (const a of this.#pending) this.#pressed.add(a);
    this.#pending.clear();
    this.#pollGamepads(dt);
    this.#computeAxes(dt);
  }

  rumble(strength = 0.5, ms = 80) {
    if (!this.settings.get('vibration')) return;
    if (this.device === 'gamepad') {
      const pad = navigator.getGamepads?.()[this.padIndex];
      pad?.vibrationActuator?.playEffect?.('dual-rumble', {
        startDelay: 0, duration: ms, weakMagnitude: strength, strongMagnitude: strength * 0.6,
      })?.catch?.(() => {});
    } else if (this.device === 'touch') {
      navigator.vibrate?.(Math.round(ms * 0.6));
    }
  }

  requestPointerLock(el) {
    if (this.device !== 'kbm' || document.pointerLockElement || !el.requestPointerLock) return;
    try { Promise.resolve(el.requestPointerLock()).catch(() => {}); } catch { /* no soportado */ }
  }

  exitPointerLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  // ----------------------------------------------------------------------

  #setDevice(device) {
    if (device === this.device) return;
    this.device = device;
    this.bus.emit('input:device', { device, family: this.padFamily });
  }

  #ui(type, dir) { this.bus.emit('ui:input', { type, dir }); }

  #bind() {
    window.addEventListener('keydown', (e) => {
      if (BLOCKED.has(e.code)) e.preventDefault();
      this.#setDevice('kbm');
      if (this.context === 'menu') {
        const m = MENU_KEYS[e.code];
        if (m === 'up' || m === 'down' || m === 'left' || m === 'right') this.#ui('nav', m);
        else if (e.repeat) return;
        else if (m) this.#ui(m);
        else if (!IGNORED_AS_ANY.test(e.key)) this.#ui('other');
      } else {
        this.#held.add(e.code);
        const a = GAME_KEYS[e.code];
        if (a && !e.repeat) this.#pending.add(a);
      }
    });
    window.addEventListener('keyup', (e) => this.#held.delete(e.code));
    window.addEventListener('blur', () => this.#held.clear());

    window.addEventListener('pointerdown', (e) => {
      this.#setDevice(e.pointerType === 'mouse' ? 'kbm' : 'touch');
      if (this.context === 'game' && e.pointerType === 'mouse' && document.pointerLockElement) {
        if (e.button === 0) this.#pending.add('attack');
        else if (e.button === 2) this.#pending.add('skill');
      }
    });
    window.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse' && (e.movementX || e.movementY)) this.#setDevice('kbm');
    });
    // Con el puntero bloqueado, movementX/Y llegan por mousemove
    window.addEventListener('mousemove', (e) => {
      if (!document.pointerLockElement) return;
      this.#mouseDX += e.movementX;
      this.#mouseDY += e.movementY;
    });
    window.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('gamepadconnected', (e) => {
      const family = detectFamily(e.gamepad);
      if (this.padIndex < 0) { this.padIndex = e.gamepad.index; this.padFamily = family; }
      this.bus.emit('input:gamepad', { connected: true, family, id: e.gamepad.id, standard: e.gamepad.mapping === 'standard' });
    });
    window.addEventListener('gamepaddisconnected', (e) => {
      const wasActive = e.gamepad.index === this.padIndex;
      if (wasActive) this.padIndex = -1;
      this.#prevButtons[e.gamepad.index] = null;
      this.bus.emit('input:gamepad', { connected: false, family: detectFamily(e.gamepad), id: e.gamepad.id, wasActive });
      if (wasActive && this.device === 'gamepad') {
        this.#setDevice(matchMedia('(pointer: coarse)').matches ? 'touch' : 'kbm');
      }
    });
  }

  #pollGamepads(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : null;
    this.#padMove.x = this.#padMove.y = 0;
    this.#padLook.x = this.#padLook.y = 0;
    if (!pads) return;

    // El mando activo es el último que ha recibido entrada
    let active = this.padIndex >= 0 ? pads[this.padIndex] : null;
    for (let i = 0; i < pads.length; i++) {
      const p = pads[i];
      if (!p || !p.connected) continue;
      if (!active) active = p;
      if (p !== active && this.#hasActivity(p)) active = p;
    }
    if (!active) return;
    if (active.index !== this.padIndex) {
      this.padIndex = active.index;
      this.padFamily = detectFamily(active);
      if (this.device === 'gamepad') this.bus.emit('input:device', { device: 'gamepad', family: this.padFamily });
    }

    let prev = this.#prevButtons[active.index];
    if (!prev) prev = this.#prevButtons[active.index] = new Array(active.buttons.length).fill(true); // evita disparos al conectar
    const down = (i) => { const b = active.buttons[i]; return b ? b.pressed || b.value > 0.5 : false; };
    const edge = (i) => down(i) && !prev[i];

    if (this.#hasActivity(active)) {
      if (this.device !== 'gamepad') {
        this.device = 'gamepad';
        this.bus.emit('input:device', { device: 'gamepad', family: this.padFamily });
      }
    }

    radial(active.axes[0] ?? 0, active.axes[1] ?? 0, this.#padMove);
    radial(active.axes[2] ?? 0, active.axes[3] ?? 0, this.#padLook);

    if (this.context === 'menu') {
      if (edge(PAD.SOUTH)) this.#ui('confirm');
      else if (edge(PAD.EAST)) this.#ui('back');
      else if (edge(PAD.START)) this.#ui('start');
      else {
        for (let i = 0; i < active.buttons.length; i++) {
          if (i >= PAD.UP && i <= PAD.RIGHT) continue;
          if (edge(i)) { this.#ui('other'); break; }
        }
      }
      // Navegación con cruceta o stick, con repetición al mantener
      let dir = null;
      if (down(PAD.UP) || this.#padMove.y < -NAV_THRESHOLD) dir = 'up';
      else if (down(PAD.DOWN) || this.#padMove.y > NAV_THRESHOLD) dir = 'down';
      else if (down(PAD.LEFT) || this.#padMove.x < -NAV_THRESHOLD) dir = 'left';
      else if (down(PAD.RIGHT) || this.#padMove.x > NAV_THRESHOLD) dir = 'right';
      if (dir !== this.#navDir) {
        this.#navDir = dir;
        this.#navTimer = NAV_DELAY;
        if (dir) this.#ui('nav', dir);
      } else if (dir) {
        this.#navTimer -= dt;
        if (this.#navTimer <= 0) { this.#navTimer = NAV_REPEAT; this.#ui('nav', dir); }
      }
    } else {
      for (let i = 0; i < GAME_PAD.length; i++) {
        if (edge(GAME_PAD[i][1])) this.#pressed.add(GAME_PAD[i][0]);
      }
    }

    for (let i = 0; i < active.buttons.length; i++) prev[i] = down(i);
  }

  #hasActivity(p) {
    for (let i = 0; i < p.buttons.length; i++) if (p.buttons[i].pressed) return true;
    for (let i = 0; i < p.axes.length; i++) if (Math.abs(p.axes[i]) > 0.5) return true;
    return false;
  }

  #computeAxes(dt) {
    const look = this.lookDelta;
    if (this.context !== 'game') {
      this.move.x = this.move.y = look.x = look.y = 0;
      this.#mouseDX = this.#mouseDY = this.#touchDX = this.#touchDY = 0;
      return;
    }
    const h = this.#held;
    let x = 0, y = 0;
    if (h.has('KeyD') || h.has('ArrowRight')) x += 1;
    if (h.has('KeyA') || h.has('ArrowLeft')) x -= 1;
    if (h.has('KeyW') || h.has('ArrowUp')) y += 1;
    if (h.has('KeyS') || h.has('ArrowDown')) y -= 1;
    x += this.virtualMove.x + this.#padMove.x;
    y += this.virtualMove.y - this.#padMove.y;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.move.x = x;
    this.move.y = y;

    const sens = this.settings.get('lookSensitivity');
    const inv = this.settings.get('invertY') ? -1 : 1;
    look.x = (this.#mouseDX * 0.0022 + this.#touchDX * 0.0055 + this.#padLook.x * 2.6 * dt) * sens;
    look.y = (this.#mouseDY * 0.0022 + this.#touchDY * 0.0055 + this.#padLook.y * 1.8 * dt) * sens * inv;
    this.#mouseDX = this.#mouseDY = this.#touchDX = this.#touchDY = 0;
  }
}
