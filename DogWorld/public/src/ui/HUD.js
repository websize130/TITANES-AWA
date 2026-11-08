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
    // Panel de misión plegable (un toque en el título).
    document.getElementById('hud-mission').addEventListener('click', (e) => {
      e.currentTarget.classList.toggle('collapsed');
    });
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

  // --------------------------------------------------------- mundos
  /** Panel de misión: lista de objetivos con el icono de la raza que los resuelve. */
  setMission(world, list) {
    const el = document.getElementById('hud-mission');
    if (!world) {
      el.classList.add('hidden');
      this.missionKey = null;
      return;
    }
    const key = world.id + list.map((o) => (o.solved ? 1 : 0)).join('');
    if (key === this.missionKey) return;
    this.missionKey = key;
    el.classList.remove('hidden');
    document.documentElement.style.setProperty('--world', world.color);
    document.getElementById('hm-title').textContent = world.title;
    const ul = document.getElementById('hm-list');
    ul.innerHTML = '';
    for (const o of list) {
      const li = document.createElement('li');
      li.className = o.solved ? 'done' : '';
      li.innerHTML = '<span class="ic"></span><span class="tx"></span>';
      li.querySelector('.ic').textContent = o.solved ? '✔' : o.icon;
      li.querySelector('.tx').textContent = o.label;
      ul.appendChild(li);
    }
    const relic = document.createElement('li');
    relic.className = 'relic';
    const all = list.every((o) => o.solved);
    relic.innerHTML = '<span class="ic">🏆</span><span class="tx"></span>';
    relic.querySelector('.tx').textContent = all ? `¡A por la reliquia: ${world.relicName}!` : `Reliquia: ${world.relicName}`;
    ul.appendChild(relic);
  }

  /** Acción contextual (tecla R / botón táctil). */
  setPrompt(text, icon = '💬') {
    if (text === this.promptText) return;
    this.promptText = text;
    const el = document.getElementById('hud-prompt');
    el.classList.toggle('hidden', !text);
    if (text) document.getElementById('hud-prompt-text').textContent = text;
    const btn = document.getElementById('btn-interact');
    btn.classList.toggle('hidden', !text);
    btn.textContent = icon;
    document.getElementById('hud-prompt-key').classList.toggle('hidden', !document.getElementById('touch-layer').classList.contains('hidden'));
  }

  /** Cartel central (cuenta atrás de portal, misión cumplida…). */
  setBanner(html, big = false) {
    if (html === this.bannerHtml) return;
    this.bannerHtml = html;
    const el = document.getElementById('hud-banner');
    el.classList.toggle('hidden', !html);
    el.classList.toggle('big', big);
    if (html) el.innerHTML = html;
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

  setGolden(n, total) {
    document.getElementById('hud-golden-count').textContent = `${n}/${total}`;
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
