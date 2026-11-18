// Armería del Forajido: 6 armas, niveles 1–5. Solo Monedas de Oro Maldito (sin dinero real).

export const WEAPONS = [
  {
    id: 'peacemaker', name: 'Revólveres Gemelos', nick: '"Peacemaker"', price: 0,
    desc: 'Dos revólveres que alternan disparos. Fiables y rápidos.',
    levels: [
      { dmg: 12, rate: 5.2, speed: 780, range: 520, count: 1, spread: 0.06, pierce: 0, kb: 70 },
      { dmg: 15, rate: 5.8, speed: 800, range: 540, count: 1, spread: 0.06, pierce: 0, kb: 75 },
      { dmg: 17, rate: 6.4, speed: 820, range: 560, count: 2, spread: 0.10, pierce: 0, kb: 80 },
      { dmg: 21, rate: 7.0, speed: 860, range: 580, count: 2, spread: 0.10, pierce: 1, kb: 85 },
      { dmg: 26, rate: 7.8, speed: 900, range: 600, count: 3, spread: 0.14, pierce: 1, kb: 90 },
    ],
    perks: ['', '+daño, +cadencia', 'Disparo doble', 'Balas perforantes', 'Disparo triple'],
  },
  {
    id: 'widow', name: 'Escopeta Recortada', nick: '"La Viuda"', price: 500,
    desc: 'Cono de perdigones con empuje devastador a corta distancia.',
    levels: [
      { dmg: 9, rate: 1.5, speed: 720, range: 300, count: 6, spread: 0.55, pierce: 0, kb: 260 },
      { dmg: 11, rate: 1.6, speed: 740, range: 310, count: 7, spread: 0.55, pierce: 0, kb: 280 },
      { dmg: 12, rate: 1.75, speed: 760, range: 330, count: 9, spread: 0.6, pierce: 0, kb: 300 },
      { dmg: 15, rate: 1.9, speed: 780, range: 340, count: 10, spread: 0.6, pierce: 1, kb: 320 },
      { dmg: 18, rate: 2.1, speed: 800, range: 360, count: 12, spread: 0.65, pierce: 1, kb: 360 },
    ],
    perks: ['', '+1 perdigón', '+2 perdigones', 'Perdigones perforantes', 'Doble cañón brutal'],
  },
  {
    id: 'winchester', name: 'Rifle de Palanca', nick: '"Winchester Maldito"', price: 1200,
    desc: 'Disparos perforantes de largo alcance que atraviesan filas enteras.',
    levels: [
      { dmg: 32, rate: 1.8, speed: 1250, range: 760, count: 1, spread: 0.0, pierce: 3, kb: 120 },
      { dmg: 40, rate: 1.95, speed: 1300, range: 780, count: 1, spread: 0.0, pierce: 4, kb: 130 },
      { dmg: 48, rate: 2.1, speed: 1350, range: 800, count: 1, spread: 0.0, pierce: 5, kb: 140 },
      { dmg: 58, rate: 2.3, speed: 1400, range: 820, count: 1, spread: 0.0, pierce: 7, kb: 150 },
      { dmg: 70, rate: 2.5, speed: 1450, range: 860, count: 2, spread: 0.04, pierce: 9, kb: 160 },
    ],
    perks: ['', '+perforación', '+daño', '+cadencia', 'Doble bala maldita'],
  },
  {
    id: 'grenade', name: 'Lanzagranadas', nick: 'de Pólvora Negra', price: 2500,
    desc: 'Granadas en arco que explotan en área y dejan fuego en el suelo.',
    levels: [
      { dmg: 42, rate: 0.9, speed: 520, range: 420, count: 1, spread: 0.0, radius: 72, fire: 10, kb: 200 },
      { dmg: 50, rate: 0.95, speed: 540, range: 430, count: 1, spread: 0.0, radius: 80, fire: 13, kb: 210 },
      { dmg: 58, rate: 1.0, speed: 560, range: 440, count: 1, spread: 0.0, radius: 88, fire: 16, kb: 220 },
      { dmg: 66, rate: 1.05, speed: 580, range: 450, count: 2, spread: 0.3, radius: 92, fire: 20, kb: 230 },
      { dmg: 78, rate: 1.15, speed: 600, range: 460, count: 3, spread: 0.35, radius: 100, fire: 26, kb: 250 },
    ],
    perks: ['', '+radio', '+fuego', 'Doble granada', 'Triple granada'],
  },
  {
    id: 'crossbow', name: 'Ballesta de Plata', nick: 'y Runas', price: 4000,
    desc: 'Virotes pesados de plata rúnica. Cada baja te cura.',
    levels: [
      { dmg: 60, rate: 1.1, speed: 1000, range: 640, count: 1, spread: 0.0, pierce: 1, heal: 2, kb: 180 },
      { dmg: 72, rate: 1.2, speed: 1050, range: 660, count: 1, spread: 0.0, pierce: 2, heal: 2, kb: 190 },
      { dmg: 85, rate: 1.3, speed: 1100, range: 680, count: 1, spread: 0.0, pierce: 2, heal: 3, kb: 200 },
      { dmg: 100, rate: 1.4, speed: 1150, range: 700, count: 2, spread: 0.12, pierce: 3, heal: 3, kb: 210 },
      { dmg: 120, rate: 1.55, speed: 1200, range: 740, count: 3, spread: 0.16, pierce: 3, heal: 4, kb: 230 },
    ],
    perks: ['', '+daño', '+curación', 'Doble virote', 'Abanico rúnico'],
  },
  {
    id: 'gatling', name: 'Cañón Gatling', nick: 'Steampunk', price: 7500,
    desc: 'Lluvia de plomo rotativa. Gira, se calienta y no perdona.',
    levels: [
      { dmg: 8, rate: 14, speed: 900, range: 560, count: 1, spread: 0.13, pierce: 0, kb: 40 },
      { dmg: 9, rate: 16, speed: 920, range: 570, count: 1, spread: 0.13, pierce: 0, kb: 45 },
      { dmg: 11, rate: 18, speed: 940, range: 580, count: 1, spread: 0.12, pierce: 1, kb: 50 },
      { dmg: 12, rate: 20, speed: 960, range: 600, count: 1, spread: 0.12, pierce: 1, kb: 55 },
      { dmg: 14, rate: 24, speed: 1000, range: 620, count: 1, spread: 0.11, pierce: 2, kb: 60 },
    ],
    perks: ['', '+cadencia', 'Plomo perforante', '+cadencia', 'Tormenta de plomo'],
  },
];

export const weaponById = (id) => WEAPONS.find((w) => w.id === id) || WEAPONS[0];

const BASE_UPGRADE = [200, 400, 700, 1100];
// Coste de subir de `level` a `level+1` (level 1..4).
export function upgradeCost(w, level) {
  if (level >= 5) return Infinity;
  return Math.round((BASE_UPGRADE[level - 1] * (1 + w.price / 2500)) / 10) * 10;
}
