// Monedero y colección del jugador, guardados en el navegador (localStorage):
// galletas, accesorios comprados/equipados, álbum de Huesos Dorados y recompensas.
import { COSMETIC_BY_ID, sanitizeCosmetics } from '../cosmetics/CosmeticData.js';
import { GOLDEN_BONES } from '../worlds/GoldenBones.js';

const KEY = 'dogworld.wallet';

export class Wallet {
  constructor() {
    const d = load();
    this.cookies = Number.isFinite(d.cookies) ? Math.max(0, Math.floor(d.cookies)) : 0;
    this.owned = new Set((d.owned || []).filter((id) => COSMETIC_BY_ID[id]));
    this.equipped = sanitizeCosmetics(d.equipped);
    for (const slot of Object.keys(this.equipped)) if (!this.owned.has(this.equipped[slot])) delete this.equipped[slot];
    this.golden = new Set((d.golden || []).filter((i) => GOLDEN_BONES.some((b) => b.id === i)));
    this.flags = d.flags || {};
    this.listeners = new Set();
  }

  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        cookies: this.cookies, owned: [...this.owned], equipped: this.equipped, golden: [...this.golden], flags: this.flags,
      }));
    } catch { /* modo privado: solo en memoria */ }
    for (const cb of this.listeners) cb(this);
  }

  addCookies(n) {
    if (!(n > 0)) return;
    this.cookies += Math.floor(n);
    this.save();
  }

  /** Compra un accesorio. Devuelve true si se ha podido. */
  buy(id) {
    const item = COSMETIC_BY_ID[id];
    if (!item || item.reward || this.owned.has(id) || this.cookies < item.price) return false;
    this.cookies -= item.price;
    this.owned.add(id);
    this.save();
    return true;
  }

  /** Regalo (recompensa de un NPC). */
  grant(id) {
    if (!COSMETIC_BY_ID[id] || this.owned.has(id)) return false;
    this.owned.add(id);
    this.save();
    return true;
  }

  equip(id) {
    const item = COSMETIC_BY_ID[id];
    if (!item || !this.owned.has(id)) return false;
    this.equipped[item.slot] = id;
    this.save();
    return true;
  }

  unequip(slot) {
    delete this.equipped[slot];
    this.save();
  }

  hasGolden(id) {
    return this.golden.has(id);
  }

  addGolden(id) {
    if (this.golden.has(id)) return false;
    this.golden.add(id);
    this.save();
    return true;
  }

  /** Banderas de un solo uso (regalos, diálogos…). */
  flag(name, value) {
    if (value === undefined) return this.flags[name];
    this.flags[name] = value;
    this.save();
    return value;
  }
}

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
}
