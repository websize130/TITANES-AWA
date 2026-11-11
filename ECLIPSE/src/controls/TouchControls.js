/**
 * Controles táctiles: stick virtual dinámico (mitad izquierda), arrastre para
 * cámara (mitad derecha) y botones de acción. Escribe en InputManager.
 */
export class TouchControls {
  constructor(root, input) {
    this.root = root;
    this.input = input;
    this.zone = root.querySelector('.tc-stick-zone');
    this.base = root.querySelector('.tc-stick');
    this.knob = root.querySelector('.tc-knob');
    this.lookZone = root.querySelector('.tc-look-zone');
    this.#stickId = null;
    this.#lookId = null;
    this.#bindStick();
    this.#bindLook();
    this.#bindButtons();
  }

  #stickId; #lookId;
  #ox = 0; #oy = 0; #radius = 1;
  #lx = 0; #ly = 0;

  #bindStick() {
    const z = this.zone;
    z.addEventListener('pointerdown', (e) => {
      if (this.#stickId !== null) return;
      e.preventDefault();
      this.#stickId = e.pointerId;
      z.setPointerCapture(e.pointerId);
      const zr = z.getBoundingClientRect();
      this.#radius = this.base.offsetWidth * 0.42;
      this.#ox = e.clientX;
      this.#oy = e.clientY;
      // El stick aparece donde se apoya el pulgar
      this.base.style.left = `${e.clientX - zr.left}px`;
      this.base.style.top = `${e.clientY - zr.top}px`;
      this.base.classList.add('is-active');
      this.#moveKnob(0, 0);
    });
    z.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.#stickId) return;
      let dx = e.clientX - this.#ox;
      let dy = e.clientY - this.#oy;
      const len = Math.hypot(dx, dy);
      if (len > this.#radius) { dx *= this.#radius / len; dy *= this.#radius / len; }
      this.#moveKnob(dx, dy);
      this.input.setVirtualMove(dx / this.#radius, -dy / this.#radius);
    });
    const end = (e) => {
      if (e.pointerId !== this.#stickId) return;
      this.#stickId = null;
      this.base.classList.remove('is-active');
      this.base.style.left = '';
      this.base.style.top = '';
      this.#moveKnob(0, 0);
      this.input.setVirtualMove(0, 0);
    };
    z.addEventListener('pointerup', end);
    z.addEventListener('pointercancel', end);
  }

  #moveKnob(dx, dy) {
    this.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }

  #bindLook() {
    const z = this.lookZone;
    z.addEventListener('pointerdown', (e) => {
      if (this.#lookId !== null) return;
      e.preventDefault();
      this.#lookId = e.pointerId;
      z.setPointerCapture(e.pointerId);
      this.#lx = e.clientX;
      this.#ly = e.clientY;
    });
    z.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.#lookId) return;
      this.input.addTouchLook(e.clientX - this.#lx, e.clientY - this.#ly);
      this.#lx = e.clientX;
      this.#ly = e.clientY;
    });
    const end = (e) => { if (e.pointerId === this.#lookId) this.#lookId = null; };
    z.addEventListener('pointerup', end);
    z.addEventListener('pointercancel', end);
  }

  #bindButtons() {
    for (const btn of this.root.querySelectorAll('[data-touch-action]')) {
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        btn.classList.add('is-pressed');
        this.input.pressVirtual(btn.dataset.touchAction);
      });
      const up = () => btn.classList.remove('is-pressed');
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
      btn.addEventListener('pointerleave', up);
    }
  }

  reset() {
    this.#stickId = this.#lookId = null;
    this.base.classList.remove('is-active');
    this.base.style.left = this.base.style.top = '';
    this.#moveKnob(0, 0);
    // Sin pasar por setVirtualMove: no debe cambiar el dispositivo activo
    this.input.virtualMove.x = this.input.virtualMove.y = 0;
  }
}
