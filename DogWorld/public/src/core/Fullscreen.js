// Pantalla completa multiplataforma (PC, Android, iPadOS) con bloqueo horizontal en móvil.
// iPhone Safari no expone la Fullscreen API para elementos: allí se recomienda
// "Añadir a pantalla de inicio" (manifest con display: fullscreen) y usamos 100dvh.

export const Fullscreen = {
  get supported() {
    const el = document.documentElement;
    return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
  },

  get active() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  },

  get isStandalone() {
    return window.matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches
      || navigator.standalone === true;
  },

  async enter() {
    if (this.active) return true;
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      else return false;
    } catch {
      return false;
    }
    // En móviles, intentar fijar horizontal (solo funciona en pantalla completa).
    try { await screen.orientation?.lock?.('landscape'); } catch { /* no soportado */ }
    return true;
  },

  async exit() {
    if (!this.active) return;
    try {
      if (document.exitFullscreen) await document.exitFullscreen();
      else document.webkitExitFullscreen?.();
    } catch { /* ignorar */ }
  },

  toggle() {
    return this.active ? this.exit() : this.enter();
  },

  onChange(cb) {
    document.addEventListener('fullscreenchange', cb);
    document.addEventListener('webkitfullscreenchange', cb);
  },
};
