// Persistencia local: progreso, monedas, armas, skins y ajustes en localStorage.
import { CONFIG } from '../config.js';
import { HEROES } from '../data/heroes.js';
import { WEAPONS } from '../data/weapons.js';

function defaults() {
  const skins = {};
  HEROES.forEach((h) => { skins[h.id] = { owned: [0], equipped: 0 }; });
  const weapons = {};
  WEAPONS.forEach((w) => { weapons[w.id] = { owned: w.price === 0, level: 1 }; });
  return {
    v: 1,
    coins: 0,
    hero: 'hunter',
    skins,
    weapons,
    weapon: 'peacemaker',
    missions: {},
    settings: { sound: true, music: true, aim: 'auto', shake: true },
    stats: { kills: 0, runs: 0, bosses: 0, gold: 0 },
  };
}

function merge(base, src) {
  if (!src || typeof src !== 'object') return base;
  for (const k of Object.keys(base)) {
    if (!(k in src)) continue;
    const b = base[k], s = src[k];
    if (b && typeof b === 'object' && !Array.isArray(b)) base[k] = merge(b, s);
    else if (typeof s === typeof b || (Array.isArray(b) && Array.isArray(s))) base[k] = s;
  }
  // claves dinámicas (misiones completadas)
  if (src.missions && typeof src.missions === 'object') base.missions = src.missions;
  return base;
}

class SaveManager {
  constructor() {
    this.data = defaults();
    this.listeners = new Set();
    this._timer = 0;
    try {
      const raw = localStorage.getItem(CONFIG.saveKey);
      if (raw) this.data = merge(defaults(), JSON.parse(raw));
    } catch (e) { console.warn('Partida guardada ilegible, se reinicia.', e); }
    if (!this.data.weapons[this.data.weapon]?.owned) this.data.weapon = 'peacemaker';
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  commit() {
    this.listeners.forEach((fn) => fn(this.data));
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.flush(), 120);
  }

  flush() {
    try { localStorage.setItem(CONFIG.saveKey, JSON.stringify(this.data)); } catch (e) { /* cuota llena o modo privado */ }
  }

  get coins() { return this.data.coins; }
  addCoins(n) { this.data.coins = Math.max(0, Math.round(this.data.coins + n)); if (n > 0) this.data.stats.gold += Math.round(n); this.commit(); }
  spend(n) { if (this.data.coins < n) return false; this.data.coins -= n; this.commit(); return true; }

  skinOf(heroId) { return this.data.skins[heroId]; }
  ownsSkin(heroId, i) { return this.data.skins[heroId].owned.includes(i); }
  equipSkin(heroId, i) { if (!this.ownsSkin(heroId, i)) return false; this.data.skins[heroId].equipped = i; this.commit(); return true; }
  buySkin(heroId, i, price) {
    if (this.ownsSkin(heroId, i)) return true;
    if (!this.spend(price)) return false;
    this.data.skins[heroId].owned.push(i);
    this.data.skins[heroId].equipped = i;
    this.commit();
    return true;
  }

  selectHero(id) { this.data.hero = id; this.commit(); }

  weaponState(id) { return this.data.weapons[id]; }
  buyWeapon(w) {
    const st = this.data.weapons[w.id];
    if (st.owned) return true;
    if (!this.spend(w.price)) return false;
    st.owned = true; this.data.weapon = w.id; this.commit();
    return true;
  }
  upgradeWeapon(id, cost) {
    const st = this.data.weapons[id];
    if (!st.owned || st.level >= 5 || !this.spend(cost)) return false;
    st.level++; this.commit();
    return true;
  }
  equipWeapon(id) { if (!this.data.weapons[id].owned) return false; this.data.weapon = id; this.commit(); return true; }

  missionDone(id) { return !!this.data.missions[id]?.done; }
  completeMission(id, info) {
    const prev = this.data.missions[id] || { done: false, wins: 0, best: 0 };
    prev.done = true; prev.wins = (prev.wins || 0) + 1;
    prev.best = Math.max(prev.best || 0, info.kills || 0);
    this.data.missions[id] = prev;
    this.commit();
  }

  setSetting(k, v) { this.data.settings[k] = v; this.commit(); }
  addStats(kills, boss) { this.data.stats.kills += kills; this.data.stats.runs++; if (boss) this.data.stats.bosses++; this.commit(); }

  reset() { this.data = defaults(); this.commit(); this.flush(); }
}

export const Save = new SaveManager();
window.addEventListener('pagehide', () => Save.flush());
