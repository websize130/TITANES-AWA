// Partida guardada (una ranura) en localStorage.

const KEY = 'eclipse.save.slot1';
const VERSION = 1;

export class SaveSystem {
  load() {
    try {
      const data = JSON.parse(localStorage.getItem(KEY));
      if (data && data.version === VERSION) return data;
    } catch { /* datos corruptos: se ignoran */ }
    return null;
  }

  exists() { return this.load() !== null; }

  save(state) {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: VERSION, savedAt: Date.now(), ...state }));
      return true;
    } catch { return false; }
  }

  clear() {
    try { localStorage.removeItem(KEY); } catch { /* nada */ }
  }
}

export function formatPlayTime(seconds) {
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${m % 60} min`;
}
