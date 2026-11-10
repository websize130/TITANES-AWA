/**
 * Bucle principal con límite de FPS y pausa automática cuando la pestaña
 * se oculta (ahorra batería y evita calentamiento en Android).
 */
export class Loop {
  constructor(renderer) {
    this.renderer = renderer;
    this.maxFps = 60;
    this.updaters = [];
    this.onFpsSample = null; // (fps) => void, cada segundo
    this.running = false;
    this.tick = this.tick.bind(this);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else this.start();
    });
  }

  #last = 0;
  #acc = 0;
  #frames = 0;
  #fpsTime = 0;

  add(fn) { this.updaters.push(fn); }

  start() {
    if (this.running) return;
    this.running = true;
    this.#last = performance.now();
    this.#fpsTime = this.#last;
    this.#frames = 0;
    this.renderer.setAnimationLoop(this.tick);
  }

  stop() {
    this.running = false;
    this.renderer.setAnimationLoop(null);
  }

  tick(now) {
    const minFrame = 1000 / this.maxFps;
    this.#acc += now - this.#last;
    this.#last = now;
    // Margen de 1 ms para no perder frames por jitter del vsync
    if (this.#acc < minFrame - 1) return;
    const dt = Math.min(this.#acc / 1000, 0.1); // evita saltos enormes tras pausas
    this.#acc = 0;

    for (let i = 0; i < this.updaters.length; i++) this.updaters[i](dt);

    this.#frames++;
    if (now - this.#fpsTime >= 1000) {
      const fps = (this.#frames * 1000) / (now - this.#fpsTime);
      this.#frames = 0;
      this.#fpsTime = now;
      this.onFpsSample?.(fps);
    }
  }
}
