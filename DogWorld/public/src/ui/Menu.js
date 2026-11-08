// Menú principal: marca, nombre, sala, pantalla completa e invitación.
import { sanitizeName, sanitizeRoom } from '../net/protocol.js';
import { Fullscreen } from '../core/Fullscreen.js';

const STORAGE_KEY = 'dogworld.profile';

export class Menu {
  constructor(isTouch) {
    this.root = document.getElementById('menu');
    this.form = document.getElementById('menu-form');
    this.nameInput = document.getElementById('input-name');
    this.roomInput = document.getElementById('input-room');
    this.playBtn = document.getElementById('btn-play');
    this.changeDogBtn = document.getElementById('btn-change-dog');
    this.fsBtn = document.getElementById('btn-fullscreen');
    this.shareBtn = document.getElementById('btn-share');
    this.status = document.getElementById('menu-status');
    this.help = document.getElementById('menu-help');
    this.onPlay = null;      // ({ name, room }) => Promise<void>
    this.onChangeDog = null; // () => void

    const saved = loadProfile();
    const urlRoom = new URLSearchParams(location.search).get('room');
    this.nameInput.value = saved.name || '';
    this.roomInput.value = urlRoom ? sanitizeRoom(urlRoom) : saved.room || '';
    this.breed = saved.breed || null;

    this.help.innerHTML = isTouch
      ? 'Joystick: toca y arrastra a la izquierda · Cámara: arrastra a la derecha<br>Botones: saltar (doble salto), habilidad y gesto 🐾'
      : 'WASD / flechas: moverse · Ratón: cámara (clic para capturar)<br>Espacio: saltar · Shift: correr · E / clic dcho.: habilidad · Q: gesto · Esc: menú';

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
    this.changeDogBtn.addEventListener('click', () => this.onChangeDog?.());
    // Modo TV en esta pantalla, o convertir este dispositivo en mando.
    this.onTvMode = null;
    document.getElementById('btn-tv').addEventListener('click', () => {
      Fullscreen.enter();
      this.onTvMode?.();
    });
    document.getElementById('btn-pad').addEventListener('click', () => {
      location.href = `${location.pathname}?mando=`;
    });
  }

  async submit() {
    const profile = {
      name: sanitizeName(this.nameInput.value),
      room: sanitizeRoom(this.roomInput.value),
      breed: this.breed,
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
    if (visible) this.playBtn.textContent = this.inGame ? 'Continuar' : 'Elegir perro';
    this.changeDogBtn.classList.toggle('hidden', !this.inGame);
  }
}

export function loadProfile() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

export function saveProfile(p) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(p)); } catch { /* modo privado */ }
}
