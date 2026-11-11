/**
 * HUD propio del juego: vitales, título de zona, mensajes contextuales y
 * acciones. Se actualiza por eventos (no por frame).
 */
export class GameHUD {
  constructor(el, bus) {
    this.el = el;
    this.health = el.querySelector('.bar-health i');
    this.aether = el.querySelector('.bar-aether i');
    this.zone = el.querySelector('.hud-zone');
    this.msg = el.querySelector('.hud-message');
    this.#msgTimer = 0;
    bus.on('player:vitals', ({ health, aether }) => {
      this.health.style.transform = `scaleX(${health})`;
      this.aether.style.transform = `scaleX(${aether})`;
    });
    bus.on('hud:message', (text) => this.message(text));
  }

  #msgTimer;

  show() { this.el.classList.add('is-active'); }
  hide() { this.el.classList.remove('is-active', 'is-paused'); }
  setPaused(p) { this.el.classList.toggle('is-paused', p); }

  showZone(name, subtitle) {
    this.zone.querySelector('small').textContent = subtitle;
    this.zone.querySelector('strong').textContent = name;
    this.zone.classList.remove('is-in');
    void this.zone.offsetWidth; // reinicia la animación
    this.zone.classList.add('is-in');
  }

  message(text) {
    this.msg.textContent = text;
    this.msg.classList.add('is-in');
    clearTimeout(this.#msgTimer);
    this.#msgTimer = setTimeout(() => this.msg.classList.remove('is-in'), 1800);
  }
}
