// HUD de partida ultra limpio: contador de huesos, jugadores, estado de red y pausa.
// Deliberadamente sin marca ni logos (solo aparecen en el menú principal).
export class HUD {
  constructor() {
    this.root = document.getElementById('hud');
    this.bonesPill = document.getElementById('hud-bones');
    this.bones = document.getElementById('hud-bones-count');
    this.players = document.getElementById('hud-players-count');
    this.netDot = document.getElementById('hud-net-dot');
    this.toastEl = document.getElementById('hud-toast');
    this.pauseBtn = document.getElementById('hud-pause');
    this.toastTimer = 0;
    this.onPause = null;
    this.pauseBtn.addEventListener('click', () => this.onPause?.());
  }

  show(visible) {
    this.root.classList.toggle('hidden', !visible);
  }

  setBones(n) {
    if (this.bones.textContent === String(n)) return;
    this.bones.textContent = String(n);
    this.bonesPill.classList.remove('bump');
    void this.bonesPill.offsetWidth; // reiniciar animación
    this.bonesPill.classList.add('bump');
  }

  setPlayers(n) {
    this.players.textContent = String(n);
  }

  /** 'online' | 'offline' | 'local' */
  setNetwork(state) {
    this.netDot.classList.toggle('online', state === 'online');
    this.netDot.classList.toggle('offline', state === 'offline');
    this.netDot.title = state === 'online' ? 'Conectado' : state === 'offline' ? 'Reconectando…' : 'Modo local';
  }

  toast(text, ms = 2200) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }
}
