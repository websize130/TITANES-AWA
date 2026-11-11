// APIs de plataforma con comprobación de soporte. Ninguna está garantizada:
// - Fullscreen API: Chrome/Firefox/Edge/Samsung Internet sí; Safari en iPhone NO
//   (solo vídeo); Safari iPadOS con prefijo webkit.
// - screen.orientation.lock: solo Android (Chrome/Samsung) y solo en pantalla
//   completa o como PWA instalada. No disponible en iOS ni en escritorio.
// - Wake Lock: Chrome/Edge/Safari recientes; Firefox parcialmente.

const doc = document;
const root = document.documentElement;

export const Platform = {
  get fullscreenSupported() {
    const fn = root.requestFullscreen || root.webkitRequestFullscreen;
    const enabled = doc.fullscreenEnabled ?? doc.webkitFullscreenEnabled ?? false;
    return Boolean(fn) && enabled;
  },

  get isFullscreen() {
    return Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);
  },

  /** Instalada como PWA (sin barra del navegador). */
  get isStandalone() {
    return matchMedia('(display-mode: fullscreen)').matches
      || matchMedia('(display-mode: standalone)').matches
      || navigator.standalone === true;
  },

  get orientationLockSupported() {
    return typeof screen.orientation?.lock === 'function';
  },

  isPortrait() { return matchMedia('(orientation: portrait)').matches; },

  /**
   * Debe llamarse de forma síncrona dentro de un gesto del usuario
   * (clic, toque o tecla). Los botones del mando NO cuentan como gesto
   * en la mayoría de navegadores. Resuelve true si se consiguió.
   */
  requestFullscreen() {
    if (this.isFullscreen) return Promise.resolve(true);
    if (!this.fullscreenSupported) return Promise.resolve(false);
    try {
      const p = root.requestFullscreen
        ? root.requestFullscreen({ navigationUI: 'hide' })
        : root.webkitRequestFullscreen();
      return Promise.resolve(p).then(() => this.isFullscreen, () => false);
    } catch {
      return Promise.resolve(false);
    }
  },

  exitFullscreen() {
    if (!this.isFullscreen) return Promise.resolve();
    try {
      const p = doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen();
      return Promise.resolve(p).catch(() => {});
    } catch {
      return Promise.resolve();
    }
  },

  async lockLandscape() {
    if (!this.orientationLockSupported) return false;
    try { await screen.orientation.lock('landscape'); return true; } catch { return false; }
  },

  unlockOrientation() {
    try { screen.orientation?.unlock?.(); } catch { /* no soportado */ }
  },

  onFullscreenChange(fn) {
    doc.addEventListener('fullscreenchange', fn);
    doc.addEventListener('webkitfullscreenchange', fn);
  },

  // Mantiene la pantalla encendida durante la partida (se libera solo al ocultar la pestaña)
  _wakeLock: null,
  async requestWakeLock() {
    if (!('wakeLock' in navigator) || this._wakeLock) return;
    try {
      this._wakeLock = await navigator.wakeLock.request('screen');
      this._wakeLock.addEventListener('release', () => { this._wakeLock = null; });
    } catch { /* denegado o no soportado */ }
  },
  releaseWakeLock() {
    this._wakeLock?.release().catch(() => {});
    this._wakeLock = null;
  },
};
