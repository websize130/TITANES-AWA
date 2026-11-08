// Modo TV (pantalla grande): pide un código al servidor, recibe las entradas del
// móvil emparejado y las inyecta en el InputManager. Devuelve vibración y estado
// (raza, habilidad, modo) al mando. La interfaz se reduce al mínimo.
import { NetworkClient } from '../net/NetworkClient.js';

// Bits de botones del mando (deben coincidir con RemotePad).
export const PAD = Object.freeze({
  A: 1, B: 2, X: 4, Y: 8, START: 16, SPRINT: 32, UP: 64, DOWN: 128, LEFT: 256, RIGHT: 512, BACK: 1024,
});

export class TvHost {
  constructor(game) {
    this.game = game;
    this.active = false;
    this.paired = false;
    this.code = null;
    this.prevBits = 0;
    this.lastState = '';
    this.el = document.getElementById('tv-pair');
    this.codeEl = document.getElementById('tv-code');
    this.urlEl = document.getElementById('tv-url');
    this.statusEl = document.getElementById('tv-status');
    // Estado del mando inyectado en InputManager.
    this.remote = { moveX: 0, moveY: 0, jumpHeld: false, sprint: false };
    game.input.remote = this.remote;
  }

  async enable() {
    if (this.active) return;
    this.active = true;
    document.body.classList.add('tv-mode');
    this.el.classList.remove('hidden');
    this.statusEl.textContent = 'Conectando…';
    // Conexión propia: el emparejamiento sobrevive a cambios de sala.
    this.net = new NetworkClient();
    this.net.onTvCode = (code) => this.showCode(code);
    this.net.onTvPaired = () => this.onPaired();
    this.net.onTvLost = () => this.onLost();
    this.net.onTvInput = (msg) => this.onInput(msg);
    try {
      await this.net.connect();
      this.net.tvHost();
    } catch {
      this.statusEl.textContent = 'El Modo TV necesita el servidor del juego (npm start).';
    }
  }

  disable() {
    if (!this.active) return;
    this.active = false;
    this.paired = false;
    document.body.classList.remove('tv-mode');
    this.el.classList.add('hidden');
    this.net?.close();
  }

  showCode(code) {
    this.code = code;
    this.codeEl.textContent = code;
    const url = `${location.origin}/?mando=${code}`;
    this.urlEl.textContent = url;
    this.statusEl.textContent = 'En el móvil: abre el juego → «🎮 Usar como mando» y escribe el código.';
  }

  onPaired() {
    this.paired = true;
    this.el.classList.add('paired');
    this.statusEl.textContent = '🎮 ¡Mando conectado!';
    this.game.hud.toast('🎮 Mando conectado', 2000);
    setTimeout(() => { if (this.paired) this.el.classList.add('hidden'); }, 1500);
    this.lastState = '';
    this.sendState();
    this.haptic([30, 40, 30]);
  }

  onLost() {
    this.paired = false;
    this.el.classList.remove('hidden', 'paired');
    this.statusEl.textContent = 'Mando desconectado. Vuelve a conectarlo con el mismo código.';
    Object.assign(this.remote, { moveX: 0, moveY: 0, jumpHeld: false, sprint: false });
  }

  /** Entradas del móvil: movimiento, cámara y flancos de botones. */
  onInput(msg) {
    const g = this.game;
    const bits = msg.b | 0;
    const pressed = bits & ~this.prevBits;
    this.prevBits = bits;
    const [mx, my] = msg.m;
    this.remote.moveX = mx;
    this.remote.moveY = my;
    this.remote.jumpHeld = Boolean(bits & PAD.A);
    this.remote.sprint = Boolean(bits & PAD.SPRINT);
    if (msg.l[0] || msg.l[1]) g.input.addLook(msg.l[0], msg.l[1]);

    if (!pressed) return;
    // Menús, selección, tienda y diálogos se manejan con el mando como un D-pad.
    if (g.handleRemoteMenu(pressed)) return;
    if (pressed & PAD.A) g.input.pressJump();
    if (pressed & PAD.B) g.input.pressAbility();
    if (pressed & PAD.X) g.input.pressInteract();
    if (pressed & PAD.Y) g.input.pressEmote();
    if (pressed & PAD.START) g.pause();
  }

  /** Vibración en el móvil (patrón en ms). */
  haptic(pattern) {
    if (this.paired) this.net.tvFeedback({ hap: pattern });
  }

  /** Envía al mando el estado relevante solo cuando cambia. */
  sendState() {
    if (!this.paired) return;
    const g = this.game;
    const b = g.player.breed;
    const st = {
      mode: g.breedSelect.isOpen ? 'select' : g.shop.isOpen ? 'shop' : g.dialog.isOpen ? 'dialog' : g.state,
      icon: b.ability.icon,
      ability: b.ability.name,
      accent: b.accent,
      cookies: g.wallet.cookies,
      prompt: g.hud.promptText || '',
    };
    const key = JSON.stringify(st);
    if (key === this.lastState) return;
    this.lastState = key;
    this.net.tvFeedback({ st });
  }
}
