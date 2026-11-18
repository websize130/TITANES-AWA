// Persistencia local: niveles por forajido (1–50), desbloqueos por hito, historia, récords y ajustes.
import { HEROES, MILESTONES, MAX_LEVEL } from '../data/heroes.js';

const KEY = 'sombrasdetinta.save.v1';

export function xpForLevel(l) { return 50 + l * 20; } // XP para pasar de l a l+1

function defaults() {
  const heroes = {};
  HEROES.forEach((h) => { heroes[h.id] = { level: 1, xp: 0, skin: 0, weapon: 0, kills: 0 }; });
  return {
    v: 1, hero: null, heroes,
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
        this.data = base;
      }
    } catch (e) { console.warn('Partida guardada ilegible; se empieza de cero.', e); }
  }

  flush() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { /* modo privado */ } }

  hero(id) { return this.data.heroes[id]; }
  selectHero(id) { this.data.hero = id; this.flush(); }

  // Aspectos/armas desbloqueados según el nivel del forajido.
  unlocked(id, kind) {
    const lv = this.data.heroes[id].level;
    const list = [0];
    for (const m of MILESTONES) if (m.kind === kind && lv >= m.level) list.push(m.idx);
    return list;
  }
  setSkin(id, i) { if (this.unlocked(id, 'skin').includes(i)) { this.data.heroes[id].skin = i; this.flush(); } }
  setWeapon(id, i) { if (this.unlocked(id, 'weapon').includes(i)) { this.data.heroes[id].weapon = i; this.flush(); } }

  // Suma XP de perfil y devuelve { levelsGained, unlocks: [milestone] }.
  addXp(id, xp, kills = 0) {
    const h = this.data.heroes[id];
    const before = h.level;
    h.kills += kills;
    h.xp += Math.round(xp);
    while (h.level < MAX_LEVEL && h.xp >= xpForLevel(h.level)) { h.xp -= xpForLevel(h.level); h.level++; }
    if (h.level >= MAX_LEVEL) h.xp = 0;
    const unlocks = MILESTONES.filter((m) => m.level > before && m.level <= h.level);
    // equipa automáticamente lo recién desbloqueado (alternancia de hitos)
    for (const m of unlocks) { if (m.kind === 'skin') h.skin = m.idx; else h.weapon = m.idx; }
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
