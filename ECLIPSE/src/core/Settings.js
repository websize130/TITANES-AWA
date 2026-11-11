// Preferencias del jugador persistidas en localStorage.

const KEY = 'eclipse.settings.v1';
const LEGACY_PROFILE_KEY = 'eclipse.graphicsProfile';

export const DEFAULT_SETTINGS = Object.freeze({
  graphics: 'auto',          // auto | low | medium | high
  showStats: false,
  masterVolume: 0.8,
  sfxVolume: 0.8,
  musicVolume: 0.5,
  vibration: true,
  invertY: false,
  lookSensitivity: 1,
  promptStyle: 'auto',       // auto | playstation | xbox | generic
  fullscreenOnPlay: true,
});

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? {}; } catch { return {}; }
}

export class Settings {
  constructor(bus) {
    this.bus = bus;
    const stored = read();
    this.values = { ...DEFAULT_SETTINGS };
    // Solo se aceptan claves conocidas y del mismo tipo (datos corruptos o antiguos)
    for (const [k, v] of Object.entries(stored)) {
      if (k in DEFAULT_SETTINGS && typeof v === typeof DEFAULT_SETTINGS[k]) this.values[k] = v;
    }
    // Migración del perfil gráfico guardado por la versión anterior
    try {
      const legacy = localStorage.getItem(LEGACY_PROFILE_KEY);
      if (legacy) {
        if (this.values.graphics === 'auto') this.values.graphics = legacy;
        localStorage.removeItem(LEGACY_PROFILE_KEY);
        this.#persist();
      }
    } catch { /* almacenamiento no disponible */ }
  }

  get(key) { return this.values[key]; }

  set(key, value) {
    if (this.values[key] === value) return;
    this.values[key] = value;
    this.#persist();
    this.bus.emit('settings:changed', { key, value });
  }

  #persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.values)); } catch { /* modo privado */ }
  }
}
