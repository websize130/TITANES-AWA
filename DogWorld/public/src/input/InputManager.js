// Fuente única de verdad del input. Teclado/ratón, táctil y mando escriben aquí;
// el jugador y la cámara solo leen. Sin asignaciones por frame.
import { KeyboardMouseInput } from './KeyboardMouseInput.js';
import { TouchControls } from './TouchControls.js';
import { GamepadInput } from './GamepadInput.js';

export class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.enabled = false;

    // Estado agregado (leído por PlayerController / ThirdPersonCamera).
    this.move = { x: 0, y: 0 };      // x = derecha, y = adelante, |v| <= 1
    this.look = { x: 0, y: 0 };      // delta de cámara acumulado en el frame (radianes)
    this.jumpHeld = false;
    this.jumpPressed = false;        // flanco de subida en este frame
    this.abilityPressed = false;      // habilidad de la raza
    this.emotePressed = false;        // gesto de personalidad
    this.interactPressed = false;     // hablar / pulsar (R)
    this.sprint = false;

    this.isTouchDevice = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

    this.keyboard = new KeyboardMouseInput(canvas, this);
    this.touch = this.isTouchDevice ? new TouchControls(this) : null;
    this.gamepad = new GamepadInput(this);
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    this.touch?.setVisible(enabled);
    if (!enabled) {
      this.keyboard.releasePointerLock();
      this.reset();
    }
  }

  reset() {
    this.move.x = 0; this.move.y = 0;
    this.look.x = 0; this.look.y = 0;
    this.jumpHeld = false; this.jumpPressed = false;
    this.abilityPressed = false; this.emotePressed = false; this.sprint = false;
    this.keyboard.reset();
    this.touch?.reset();
  }

  // Llamado por las fuentes cuando se pulsa el salto.
  pressJump() { if (this.enabled) this.jumpPressed = true; }
  pressAbility() { if (this.enabled) this.abilityPressed = true; }
  pressEmote() { if (this.enabled) this.emotePressed = true; }
  pressInteract() { if (this.enabled) this.interactPressed = true; }
  addLook(dx, dy) {
    if (!this.enabled) return;
    this.look.x += dx;
    this.look.y += dy;
  }

  /** Combina las fuentes de movimiento. Llamar una vez al inicio del frame. */
  update() {
    if (!this.enabled) return;
    this.gamepad.poll();

    let x = this.keyboard.moveX + (this.touch ? this.touch.moveX : 0) + this.gamepad.moveX;
    let y = this.keyboard.moveY + (this.touch ? this.touch.moveY : 0) + this.gamepad.moveY;
    const len = Math.hypot(x, y);
    if (len > 1) { x /= len; y /= len; }
    this.move.x = x;
    this.move.y = y;

    this.jumpHeld = this.keyboard.jumpHeld || (this.touch?.jumpHeld ?? false) || this.gamepad.jumpHeld;
    this.sprint = this.keyboard.sprint || this.gamepad.sprint;
  }

  /** Consumir los eventos de un solo frame. Llamar al final del frame. */
  endFrame() {
    this.look.x = 0;
    this.look.y = 0;
    this.jumpPressed = false;
    this.abilityPressed = false;
    this.emotePressed = false;
    this.interactPressed = false;
  }
}
