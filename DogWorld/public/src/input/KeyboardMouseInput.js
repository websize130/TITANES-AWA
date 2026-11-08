// Teclado (WASD / flechas, Espacio, Shift, E habilidad, Q gesto) + ratón (pointer lock para mirar).
const MOUSE_SENSITIVITY = 0.0025;

export class KeyboardMouseInput {
  constructor(canvas, input) {
    this.canvas = canvas;
    this.input = input;
    this.keys = new Set();
    this.moveX = 0;
    this.moveY = 0;
    this.jumpHeld = false;
    this.sprint = false;
    this.dragging = false;

    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => this.reset());

    // Clic en el canvas: captura el ratón (solo PC). Si se deniega, arrastrar también sirve.
    canvas.addEventListener('mousedown', (e) => {
      if (!this.input.enabled || this.input.isTouchDevice) return;
      if (e.button === 0 && document.pointerLockElement !== canvas) {
        canvas.requestPointerLock?.()?.catch?.(() => {});
      } else if (e.button === 2) {
        this.input.pressAbility(); // clic derecho = habilidad
      }
      this.dragging = true;
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (!this.input.enabled) return;
      if (document.pointerLockElement === canvas || this.dragging) {
        this.input.addLook(e.movementX * MOUSE_SENSITIVITY, e.movementY * MOUSE_SENSITIVITY);
      }
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  onKey(e, down) {
    if (e.target instanceof HTMLInputElement) return;
    const code = e.code;
    if (down) {
      if (this.keys.has(code)) return; // autorepetición
      this.keys.add(code);
      if (code === 'Space') { this.input.pressJump(); e.preventDefault(); }
      if (code === 'KeyE' || code === 'KeyF') this.input.pressAbility();
      if (code === 'KeyQ' || code === 'KeyG') this.input.pressEmote();
    } else {
      this.keys.delete(code);
    }
    this.recompute();
  }

  recompute() {
    const k = this.keys;
    this.moveX = (k.has('KeyD') || k.has('ArrowRight') ? 1 : 0) - (k.has('KeyA') || k.has('ArrowLeft') ? 1 : 0);
    this.moveY = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
    this.jumpHeld = k.has('Space');
    this.sprint = k.has('ShiftLeft') || k.has('ShiftRight');
  }

  releasePointerLock() {
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
  }

  reset() {
    this.keys.clear();
    this.dragging = false;
    this.recompute();
  }
}
