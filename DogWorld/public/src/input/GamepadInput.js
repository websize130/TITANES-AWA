// Mando (Gamepad API, mapeo estándar). Extra: funciona en PC y en móviles con mando.
const DEADZONE = 0.18;
const LOOK_SPEED = 0.045;

const dz = (v) => (Math.abs(v) < DEADZONE ? 0 : (v - Math.sign(v) * DEADZONE) / (1 - DEADZONE));

export class GamepadInput {
  constructor(input) {
    this.input = input;
    this.moveX = 0;
    this.moveY = 0;
    this.jumpHeld = false;
    this.sprint = false;
    this.prevJump = false;
    this.prevAction = false;
  }

  poll() {
    this.moveX = 0; this.moveY = 0; this.jumpHeld = false; this.sprint = false;
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    for (let i = 0; i < pads.length; i++) {
      const gp = pads[i];
      if (!gp || !gp.connected || gp.mapping !== 'standard') continue;
      this.moveX = dz(gp.axes[0]);
      this.moveY = -dz(gp.axes[1]);
      const lx = dz(gp.axes[2]);
      const ly = dz(gp.axes[3]);
      if (lx || ly) this.input.addLook(lx * LOOK_SPEED, ly * LOOK_SPEED);

      const jump = gp.buttons[0]?.pressed ?? false;      // A / Cruz
      const action = gp.buttons[2]?.pressed ?? false;    // X / Cuadrado
      if (jump && !this.prevJump) this.input.pressJump();
      if (action && !this.prevAction) this.input.pressAction();
      this.prevJump = jump;
      this.prevAction = action;
      this.jumpHeld = jump;
      this.sprint = gp.buttons[7]?.pressed || gp.buttons[10]?.pressed || false; // RT / L3
      return; // solo el primer mando
    }
  }
}
