import { IS_TOUCH } from './utils.js';
import { QUALITY } from '../data/config.js';

/* Ajustes persistentes */
export const Settings = {
  key: 'ceniza.settings.v1',
  data: { quality: 'auto', sens: 1, brightness: 1, muted: false, fps: false, autoAim: true, unlocked: 1, done: [], bestRound: 0, tv: false, tvSet: false },
  load() { try { const raw = localStorage.getItem(this.key); if (raw) Object.assign(this.data, JSON.parse(raw)); } catch (e) { /* almacenamiento no disponible */ } },
  save() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) { /* almacenamiento no disponible */ } },
  quality() { const q = this.data.quality; return q !== 'auto' && QUALITY[q] ? q : IS_TOUCH ? 'medio' : 'alto'; },
};
