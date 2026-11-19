// Entrada unificada: teclado + ratón en PC, joystick virtual transparente + botones táctiles en móvil.
// Las acciones puntuales (cartas 1·2·3, pausa) se encolan como flancos para leerlas en el bucle.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, active: false, down: false, lastMove: 0 };
    this.joy = { id: -1, ox: 0, oy: 0, x: 0, y: 0, dx: 0, dy: 0, active: false, radius: 60 };
    this.pressed = { c0: false, c1: false, c2: false, pause: false };
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
        if (k === 'Digit1' || k === 'Numpad1' || k === 'KeyQ') this.pressed.c0 = true;
        if (k === 'Digit2' || k === 'Numpad2' || k === 'KeyE') this.pressed.c1 = true;
        if (k === 'Digit3' || k === 'Numpad3' || k === 'KeyR' || k === 'Space') this.pressed.c2 = true;
        if (k === 'Escape' || k === 'KeyP') this.pressed.pause = true;
      }
      this.keys.add(k);
    };
    this._onKeyUp = (e) => this.keys.delete(e.code);
    this._onBlur = () => { this.keys.clear(); if (this.touches) this.touches.clear(); this._joyEnd(); };

    // Joystick flotante: el primer dedo que toca fuera de los botones lo crea en ese punto exacto. Si el dedo
    // se arrastra más allá del radio, el centro le sigue (sin acumular desfase). Al soltar se recalibra el centro
    // y, si queda otro dedo libre en pantalla, ese dedo toma el relevo desde su posición actual.
    this.touches = new Map(); // pointerId -> { x, y, btn }
    const local = (e) => { const r = c.getBoundingClientRect(); this._px = e.clientX - r.left; this._py = e.clientY - r.top; };
    this._onPointerDown = (e) => {
      local(e);
      const x = this._px, y = this._py;
      for (const b of this.buttons) {
        if ((x - b.x) ** 2 + (y - b.y) ** 2 <= b.r * b.r) {
          this.pressed[b.id] = true;
          if (e.pointerType !== 'mouse') this.touches.set(e.pointerId, { x, y, btn: true });
          e.preventDefault();
          return;
        }
      }
      if (e.pointerType === 'mouse') {
        if (e.button === 2) this.pressed.c0 = true;
        this.mouse.down = e.button === 0;
        return;
      }
      this.touches.set(e.pointerId, { x, y, btn: false });
      if (this.joy.id === -1) this._joyStart(e.pointerId, x, y);
      try { c.setPointerCapture(e.pointerId); } catch (_) { /* no-op */ }
      e.preventDefault();
    };
    this._onPointerMove = (e) => {
      local(e);
      const x = this._px, y = this._py;
      if (e.pointerType === 'mouse') {
        this.mouse.x = x; this.mouse.y = y; this.mouse.active = true; this.mouse.lastMove = performance.now();
        return;
      }
      const t = this.touches.get(e.pointerId);
      if (t) { t.x = x; t.y = y; }
      const j = this.joy;
      if (e.pointerId !== j.id) return;
      let dx = x - j.ox, dy = y - j.oy;
      const d = Math.hypot(dx, dy), R = j.radius;
      if (d > R) { // el centro sigue al dedo: queda exactamente a R del dedo
        j.ox = x - (dx / d) * R; j.oy = y - (dy / d) * R;
        dx = x - j.ox; dy = y - j.oy;
      }
      j.x = x; j.y = y;
      j.dx = Math.max(-1, Math.min(1, dx / R)); j.dy = Math.max(-1, Math.min(1, dy / R));
    };
    this._onPointerUp = (e) => {
      if (e.pointerType === 'mouse') { this.mouse.down = false; return; }
      this.touches.delete(e.pointerId);
      if (e.pointerId !== this.joy.id) return;
      this._joyEnd();
      // relevo: otro dedo libre que siga apoyado pasa a mover al forajido
      for (const [id, t] of this.touches) if (!t.btn) { this._joyStart(id, t.x, t.y); break; }
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
    this.canvas.addEventListener('lostpointercapture', this._onPointerUp);
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
    this.canvas.removeEventListener('lostpointercapture', this._onPointerUp);
    this.canvas.removeEventListener('contextmenu', this._onContext);
    this.canvas.removeEventListener('mouseleave', this._onLeave);
    this.reset();
  }

  _joyStart(id, x, y) {
    const j = this.joy;
    j.id = id; j.active = true; j.ox = x; j.oy = y; j.x = x; j.y = y; j.dx = 0; j.dy = 0;
  }
  _joyEnd() { // centro recalibrado sobre el último punto: ningún desfase residual para el próximo toque
    const j = this.joy;
    j.id = -1; j.active = false; j.dx = 0; j.dy = 0; j.ox = j.x; j.oy = j.y;
  }

  reset() {
    this.keys.clear();
    if (this.touches) this.touches.clear();
    this._joyEnd();
    this.pressed.c0 = this.pressed.c1 = this.pressed.c2 = this.pressed.pause = false;
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
