// Persistencia local: niveles por forajido (1–50), aspectos desbloqueables, Oro Maldito, armería,
// historia, récords y ajustes.
import { HEROES, SKIN_RULES, MAX_LEVEL } from '../data/heroes.js';
import { WEAPONS, canEquip } from '../data/weapons.js';

const KEY = 'sombrasdetinta.save.v1';

export function xpForLevel(l) { return 50 + l * 20; } // XP para pasar de l a l+1

function defaults() {
  const heroes = {};
  HEROES.forEach((h) => { heroes[h.id] = { level: 1, xp: 0, skin: 0, weapon: h.weapon, kills: 0, petKills: 0 }; });
  return {
    v: 2, hero: null, heroes, coins: 0, owned: HEROES.map((h) => h.weapon),
    story: {},          // id -> { done, wins }
    records: [],        // { round, kills, hero, skin, date, stamp }
    settings: { sound: true, music: true, aim: 'auto', shake: true },
  };
}

class SaveManager {
  constructor() {
    this.data = defaults();
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        const base = defaults();
        Object.assign(base.settings, d.settings || {});
        for (const id of Object.keys(base.heroes)) Object.assign(base.heroes[id], (d.heroes || {})[id] || {});
        base.hero = d.hero || null; base.story = d.story || {}; base.records = Array.isArray(d.records) ? d.records : [];
        base.coins = d.coins | 0;
        if (Array.isArray(d.owned)) for (const w of d.owned) if (WEAPONS[w] && !base.owned.includes(w)) base.owned.push(w);
        // migración v1: arma por índice y 4 aspectos → arma por id y 3 aspectos
        for (const h of HEROES) {
          const st = base.heroes[h.id];
          if (typeof st.weapon !== 'string' || !WEAPONS[st.weapon]) st.weapon = h.weapon;
          if (st.skin > 2) st.skin = 2;
          st.petKills = st.petKills | 0;
        }
        this.data = base;
      }
    } catch (e) { console.warn('Partida guardada ilegible; se empieza de cero.', e); }
  }

  flush() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* modo privado */ } }

  hero(id) { return this.data.heroes[id]; }
  selectHero(id) { this.data.hero = id; this.flush(); }

  // Aspectos: Base siempre · Veterano (nivel 10 o 3 casos) · Legendario (nivel 30 o ronda 8 del Cruce).
  skinUnlocked(id, i) {
    const r = SKIN_RULES[i];
    if (!r) return true;
    const h = this.data.heroes[id];
    if (h.level >= r.level) return true;
    if (r.cases && Object.values(this.data.story).filter((x) => x.done).length >= r.cases) return true;
    if (r.round && this.data.records.some((x) => x.hero === id && x.round >= r.round)) return true;
    return false;
  }
  setSkin(id, i) { if (this.skinUnlocked(id, i)) { this.data.heroes[id].skin = i; this.flush(); } }

  // Oro Maldito y armería
  get coins() { return this.data.coins; }
  addPetKills(id, n) { const h = this.data.heroes[id]; h.petKills = (h.petKills || 0) + (n | 0); this.flush(); }
  addCoins(n) { this.data.coins = Math.max(0, Math.round(this.data.coins + n)); this.flush(); }
  owns(wid) { return this.data.owned.includes(wid); }
  buy(wid) {
    const w = WEAPONS[wid];
    if (!w || this.owns(wid) || this.data.coins < w.price) return false;
    this.data.coins -= w.price; this.data.owned.push(wid); this.flush();
    return true;
  }
  setWeapon(id, wid) { const w = WEAPONS[wid]; if (w && this.owns(wid) && canEquip(w, id)) { this.data.heroes[id].weapon = wid; this.flush(); return true; } return false; }

  // Suma XP de perfil y devuelve { levelsGained, unlocks: [milestone] }.
  addXp(id, xp, kills = 0) {
    const h = this.data.heroes[id];
    const before = h.level;
    h.kills += kills;
    h.xp += Math.round(xp);
    while (h.level < MAX_LEVEL && h.xp >= xpForLevel(h.level)) { h.xp -= xpForLevel(h.level); h.level++; }
    if (h.level >= MAX_LEVEL) h.xp = 0;
    const unlocks = SKIN_RULES.map((r, i) => i).filter((i) => SKIN_RULES[i] && SKIN_RULES[i].level > before && SKIN_RULES[i].level <= h.level);
    this.flush();
    return { levelsGained: h.level - before, unlocks, level: h.level };
  }

  storyDone(id) { return !!this.data.story[id]?.done; }
  completeStory(id) { const s = this.data.story[id] || { done: false, wins: 0 }; s.done = true; s.wins++; this.data.story[id] = s; this.flush(); }

  addRecord(rec) {
    this.data.records.push(rec);
    this.data.records.sort((a, b) => b.round - a.round || b.kills - a.kills);
    this.data.records = this.data.records.slice(0, 10);
    this.flush();
    return this.data.records.indexOf(rec);
  }
  bestRound() { return this.data.records.reduce((m, r) => Math.max(m, r.round), 0); }

  setSetting(k, v) { this.data.settings[k] = v; this.flush(); }
  reset() { this.data = defaults(); this.flush(); }
}

export const Save = new SaveManager();
window.addEventListener('pagehide', () => Save.flush());
