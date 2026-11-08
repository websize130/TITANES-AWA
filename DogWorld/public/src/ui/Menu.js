// Menú principal: marca, nombre, sala, color, pantalla completa e invitación.
import { PLAYER_COLORS, sanitizeName, sanitizeRoom } from '../net/protocol.js';
import { Fullscreen } from '../core/Fullscreen.js';

const STORAGE_KEY = 'dogworld.profile';

export class Menu {
  constructor(isTouch) {
    this.root = document.getElementById('menu');
    this.form = document.getElementById('menu-form');
    this.nameInput = document.getElementById('input-name');
    this.roomInput = document.getElementById('input-room');
    this.picker = document.getElementById('color-picker');
    this.playBtn = document.getElementById('btn-play');
    this.fsBtn = document.getElementById('btn-fullscreen');
    this.shareBtn = document.getElementById('btn-share');
    this.status = document.getElementById('menu-status');
    this.help = document.getElementById('menu-help');
    this.onPlay = null; // ({ name, room, color }) => Promise<void>

    const saved = loadProfile();
    const urlRoom = new URLSearchParams(location.search).get('room');
    this.nameInput.value = saved.name || '';
    this.roomInput.value = urlRoom ? sanitizeRoom(urlRoom) : saved.room || '';
    this.color = PLAYER_COLORS.includes(saved.color) ? saved.color : PLAYER_COLORS[Math.floor(Math.random() * PLAYER_COLORS.length)];
    this.buildPicker();

    this.help.innerHTML = isTouch
      ? 'Joystick: toca y arrastra a la izquierda · Cámara: arrastra a la derecha<br>Botones: saltar (doble salto) y ladrar'
      : 'WASD / flechas: moverse · Ratón: cámara (clic para capturar)<br>Espacio: saltar (doble salto) · Shift: correr · E: ladrar · Esc: menú';

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.submit();
    });
    this.fsBtn.addEventListener('click', () => Fullscreen.toggle());
    if (!Fullscreen.supported) {
      this.fsBtn.textContent = 'Añadir a inicio';
      this.fsBtn.addEventListener('click', () => this.setStatus('En iPhone: Compartir → "Añadir a pantalla de inicio" para jugar a pantalla completa.'));
    }
    Fullscreen.onChange(() => {
      if (Fullscreen.supported) this.fsBtn.textContent = Fullscreen.active ? 'Salir de pantalla completa' : 'Pantalla completa';
    });
    this.shareBtn.addEventListener('click', () => this.share());
  }

  buildPicker() {
    this.picker.innerHTML = '';
    for (const c of PLAYER_COLORS) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'color-swatch';
      b.style.background = c;
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-label', `Pelaje ${c}`);
      b.setAttribute('aria-checked', String(c === this.color));
      b.addEventListener('click', () => {
        this.color = c;
        for (const el of this.picker.children) el.setAttribute('aria-checked', String(el === b));
      });
      this.picker.appendChild(b);
    }
  }

  async submit() {
    const profile = {
      name: sanitizeName(this.nameInput.value),
      room: sanitizeRoom(this.roomInput.value),
      color: this.color,
    };
    saveProfile(profile);
    this.playBtn.disabled = true;
    this.setStatus('Conectando…');
    // En móviles, entrar en pantalla completa con el mismo gesto del usuario.
    if (matchMedia('(pointer: coarse)').matches) Fullscreen.enter();
    try {
      await this.onPlay?.(profile);
    } finally {
      this.playBtn.disabled = false;
    }
  }

  async share() {
    const room = sanitizeRoom(this.roomInput.value);
    const url = new URL(location.href);
    url.searchParams.set('room', room);
    const link = url.toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: 'DogWorld', text: `¡Únete a mi sala ${room} en DogWorld!`, url: link });
      } else {
        await navigator.clipboard.writeText(link);
        this.setStatus(`Enlace copiado: sala ${room}`);
      }
    } catch { /* cancelado */ }
  }

  setStatus(text) {
    this.status.textContent = text;
  }

  show(visible) {
    this.root.classList.toggle('hidden', !visible);
    if (visible) this.playBtn.textContent = this.inGame ? 'Continuar' : 'Jugar';
  }
}

function loadProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function saveProfile(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* modo privado */ }
}
