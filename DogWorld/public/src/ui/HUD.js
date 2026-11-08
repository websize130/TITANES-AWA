// HUD de partida ultra limpio: contador de huesos, jugadores, estado de red y pausa.
// Deliberadamente sin marca ni logos (solo aparecen en el menú principal).
export class HUD {
  constructor(isTouch = false) {
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

    // Botones de habilidad: táctil o widget de PC (mismo comportamiento).
    this.abilityEls = [document.getElementById(isTouch ? 'btn-action' : 'hud-ability')];
    document.getElementById('hud-ability').classList.toggle('hidden', isTouch);
    this.buffEl = document.getElementById('hud-buff');
    this.buffText = '';
    this.readyTimer = 0;
  }

  /** Muestra el icono y color de la habilidad de la raza actual. */
  setAbility(breed) {
    document.documentElement.style.setProperty('--accent', breed.accent);
    for (const el of this.abilityEls) {
      el.querySelector('.ab-icon').textContent = breed.ability.icon;
      el.title = `${breed.ability.name}: ${breed.ability.description}`;
      el.setAttribute('aria-label', breed.ability.name);
      el.classList.remove('cooling');
    }
  }

  /** Publica el inicio del cooldown; la animación CSS se encarga del resto. */
  startCooldown(seconds) {
    clearTimeout(this.readyTimer);
    for (const el of this.abilityEls) {
      el.classList.remove('cooling', 'ready');
      void el.offsetWidth;
      el.style.setProperty('--cd', `${seconds}s`);
      el.classList.add('cooling');
    }
    this.readyTimer = setTimeout(() => {
      for (const el of this.abilityEls) {
        el.classList.remove('cooling');
        el.classList.add('ready');
      }
    }, seconds * 1000);
  }

  /** Efectos activos (se actualiza solo cuando cambia el texto). */
  setBuffs(text) {
    if (text === this.buffText) return;
    this.buffText = text;
    this.buffEl.innerHTML = text;
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
