// Entrada unificada: teclado + ratón en PC, joystick virtual transparente + botones táctiles en móvil.
// Las acciones puntuales (habilidad, racha, pausa) se encolan como flancos para leerlas en el bucle.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, active: false, down: false, lastMove: 0 };
    this.joy = { id: -1, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, active: false, radius: 60 };
    this.pressed = { ability: false, ultimate: false, pause: false };
    this.buttons = []; // zonas táctiles registradas por el HUD: {id, x, y, r}
    this.isTouch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
    this.moveOut = { x: 0, y: 0 };
    this._bind();
  }

  _bind() {
    const c = this.canvas;
    this._onKeyDown = (e) => {
      const k = e.code;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(k)) e.preventDefault();
      if (!this.keys.has(k)) {
        if (k === 'KeyQ' || k === 'ShiftLeft' || k === 'ShiftRight') this.pressed.ability = true;
        if (k === 'Space' || k === 'KeyE') this.pressed.ultimate = true;
        if (k === 'Escape' || k === 'KeyP') this.pressed.pause = true;
      }
      this.keys.add(k);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => { this.keys.clear(); this.joy.active = false; this.joy.id = -1; };

    this._onPointerDown = (e) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      for (const b of this.buttons) {
        if ((x - b.x) ** 2 + (y - b.y) ** 2 <= b.r * b.r) {
          this.pressed[b.id] = true;
          e.preventDefault();
          return;
        }
      }
      if (e.pointerType === 'mouse') {
        if (e.button === 2) this.pressed.ability = true;
        this.mouse.down = e.button === 0;
        return;
      }
      if (this.joy.id === -1) {
        this.joy.id = e.pointerId; this.joy.active = true;
        this.joy.ox = x; this.joy.oy = y; this.joy.x = x; this.joy.y = y; this.joy.dx = 0; this.joy.dy = 0;
        try { c.setPointerCapture(e.pointerId); } catch (_) { /* no-op */ }
      }
      e.preventDefault();
    };
    this._onPointerMove = (e) => {
      const r = c.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      if (e.pointerType === 'mouse') {
        this.mouse.x = x; this.mouse.y = y; this.mouse.active = true; this.mouse.lastMove = performance.now();
        return;
      }
      if (e.pointerId === this.joy.id) {
        let dx = x - this.joy.ox, dy = y - this.joy.oy;
        const d = Math.hypot(dx, dy), R = this.joy.radius;
        if (d > R) { // el joystick flotante sigue al dedo
          this.joy.ox += dx * (1 - R / d); this.joy.oy += dy * (1 - R / d);
          dx = x - this.joy.ox; dy = y - this.joy.oy;
        }
        this.joy.x = x; this.joy.y = y;
        this.joy.dx = dx / R; this.joy.dy = dy / R;
      }
    };
    this._onPointerUp = (e) => {
      if (e.pointerType === 'mouse') { this.mouse.down = false; return; }
      if (e.pointerId === this.joy.id) { this.joy.id = -1; this.joy.active = false; this.joy.dx = 0; this.joy.dy = 0; }
    };
    this._onContext = (e) => e.preventDefault();
    this._onLeave = () => { this.mouse.active = false; };
  }

  attach() {
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    window.addEventListener('blur', this._onBlur);
    this.canvas.addEventListener('pointerdown', this._onPointerDown, { passive: false });
    window.addEventListener('pointermove', this._onPointerMove);
    window.addEventListener('pointerup', this._onPointerUp);
    window.addEventListener('pointercancel', this._onPointerUp);
    this.canvas.addEventListener('contextmenu', this._onContext);
    this.canvas.addEventListener('mouseleave', this._onLeave);
    this.reset();
  }

  detach() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    window.removeEventListener('blur', this._onBlur);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    window.removeEventListener('pointermove', this._onPointerMove);
    window.removeEventListener('pointerup', this._onPointerUp);
    window.removeEventListener('pointercancel', this._onPointerUp);
    this.canvas.removeEventListener('contextmenu', this._onContext);
    this.canvas.removeEventListener('mouseleave', this._onLeave);
    this.reset();
  }

  reset() {
    this.keys.clear();
    this.joy.id = -1; this.joy.active = false; this.joy.dx = 0; this.joy.dy = 0;
    this.pressed.ability = this.pressed.ultimate = this.pressed.pause = false;
  }

  consume(name) { const v = this.pressed[name]; this.pressed[name] = false; return v; }

  // Vector de movimiento normalizado (sin asignaciones: reutiliza moveOut).
  move() {
    let x = 0, y = 0;
    const k = this.keys;
    if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
    if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
    if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
    if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
    if (this.joy.active) { x += this.joy.dx; y += this.joy.dy; }
    const d = Math.hypot(x, y);
    if (d > 1) { x /= d; y /= d; }
    else if (d < 0.12) { x = 0; y = 0; }
    this.moveOut.x = x; this.moveOut.y = y;
    return this.moveOut;
  }
}
