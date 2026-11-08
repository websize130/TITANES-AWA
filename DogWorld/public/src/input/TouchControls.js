// Controles móviles: joystick virtual flotante (aparece donde se apoya el pulgar
// en la mitad izquierda), arrastre en la mitad derecha para la cámara y botones táctiles.
const JOYSTICK_RADIUS = 52;      // px de recorrido máximo del knob
const LOOK_SENSITIVITY = 0.006;  // rad por px

export class TouchControls {
  constructor(input) {
    this.input = input;
    this.layer = document.getElementById('touch-layer');
    this.moveZone = document.getElementById('touch-move-zone');
    this.lookZone = document.getElementById('touch-look-zone');
    this.joystick = document.getElementById('joystick');
    this.knob = this.joystick.querySelector('.joystick-knob');
    this.btnJump = document.getElementById('btn-jump');
    this.btnAction = document.getElementById('btn-action');
    this.btnEmote = document.getElementById('btn-emote');

    this.moveX = 0;
    this.moveY = 0;
    this.jumpHeld = false;

    this.movePointer = -1;
    this.originX = 0;
    this.originY = 0;
    this.lookPointer = -1;
    this.lastLookX = 0;
    this.lastLookY = 0;

    this.bindJoystick();
    this.bindLook();
    this.bindButton(this.btnJump, () => { this.jumpHeld = true; this.input.pressJump(); }, () => { this.jumpHeld = false; });
    this.bindButton(this.btnAction, () => this.input.pressAbility(), null);
    this.bindButton(this.btnEmote, () => this.input.pressEmote(), null);
    this.bindButton(document.getElementById('btn-interact'), () => this.input.pressInteract(), null);
  }

  setVisible(visible) {
    this.layer.classList.toggle('hidden', !visible);
    if (!visible) this.reset();
  }

  reset() {
    this.movePointer = -1;
    this.lookPointer = -1;
    this.moveX = 0;
    this.moveY = 0;
    this.jumpHeld = false;
    this.joystick.classList.add('hidden');
    this.knob.style.transform = 'translate(0px, 0px)';
  }

  bindJoystick() {
    const zone = this.moveZone;
    zone.addEventListener('pointerdown', (e) => {
      if (this.movePointer !== -1) return;
      e.preventDefault();
      this.movePointer = e.pointerId;
      capture(zone, e.pointerId);
      this.originX = e.clientX;
      this.originY = e.clientY;
      this.joystick.style.left = `${e.clientX}px`;
      this.joystick.style.top = `${e.clientY}px`;
      this.joystick.classList.remove('hidden');
      this.updateKnob(e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.movePointer) return;
      e.preventDefault();
      this.updateKnob(e.clientX, e.clientY);
    });
    const end = (e) => {
      if (e.pointerId !== this.movePointer) return;
      this.movePointer = -1;
      this.moveX = 0;
      this.moveY = 0;
      this.joystick.classList.add('hidden');
      this.knob.style.transform = 'translate(0px, 0px)';
    };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  updateKnob(x, y) {
    let dx = x - this.originX;
    let dy = y - this.originY;
    const dist = Math.hypot(dx, dy);

    // Joystick "flotante": si el dedo se aleja demasiado, el centro le sigue.
    if (dist > JOYSTICK_RADIUS * 1.6) {
      const k = (dist - JOYSTICK_RADIUS) / dist;
      this.originX += dx * k;
      this.originY += dy * k;
      this.joystick.style.left = `${this.originX}px`;
      this.joystick.style.top = `${this.originY}px`;
      dx = x - this.originX;
      dy = y - this.originY;
    }

    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, JOYSTICK_RADIUS);
    const nx = len > 0 ? dx / len : 0;
    const ny = len > 0 ? dy / len : 0;
    this.knob.style.transform = `translate(${nx * clamped}px, ${ny * clamped}px)`;

    const mag = clamped / JOYSTICK_RADIUS;
    const deadzone = 0.12;
    const m = mag < deadzone ? 0 : (mag - deadzone) / (1 - deadzone);
    this.moveX = nx * m;
    this.moveY = -ny * m;
  }

  bindLook() {
    const zone = this.lookZone;
    zone.addEventListener('pointerdown', (e) => {
      if (this.lookPointer !== -1) return;
      e.preventDefault();
      this.lookPointer = e.pointerId;
      capture(zone, e.pointerId);
      this.lastLookX = e.clientX;
      this.lastLookY = e.clientY;
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.lookPointer) return;
      e.preventDefault();
      this.input.addLook((e.clientX - this.lastLookX) * LOOK_SENSITIVITY, (e.clientY - this.lastLookY) * LOOK_SENSITIVITY);
      this.lastLookX = e.clientX;
      this.lastLookY = e.clientY;
    });
    const end = (e) => { if (e.pointerId === this.lookPointer) this.lookPointer = -1; };
    zone.addEventListener('pointerup', end);
    zone.addEventListener('pointercancel', end);
  }

  bindButton(btn, onDown, onUp) {
    let pointer = -1;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (pointer !== -1) return;
      pointer = e.pointerId;
      capture(btn, e.pointerId);
      btn.classList.add('pressed');
      navigator.vibrate?.(8);
      onDown();
    });
    const end = (e) => {
      if (e.pointerId !== pointer) return;
      pointer = -1;
      btn.classList.remove('pressed');
      onUp?.();
    };
    btn.addEventListener('pointerup', end);
    btn.addEventListener('pointercancel', end);
  }
}

function capture(el, pointerId) {
  try { el.setPointerCapture(pointerId); } catch { /* puntero ya liberado */ }
}
