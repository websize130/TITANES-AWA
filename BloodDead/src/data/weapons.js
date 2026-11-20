/* Armas: daño por proyectil, cadencia (s), cargador, reserva máx., recarga (s), dispersión, perdigones */
export const WEAPONS = {
  pistol: { name: 'Pistola', short: 'Pistola', dmg: 34, rate: 0.32, mag: 12, reserve: Infinity, reload: 1.25, spread: 0.03, aimSpread: 0, pellets: 1, auto: false, kick: 0.02, shake: 0.012, noise: 34, sound: 'pistol' },
  shotgun: { name: 'Escopeta de corredera', short: 'Escopeta', dmg: 17, rate: 0.82, mag: 6, reserve: 30, reload: 2.3, spread: 0.085, aimSpread: 0.055, pellets: 8, auto: false, kick: 0.065, shake: 0.03, noise: 40, sound: 'shotgun', falloff: 13 },
  smg: { name: 'Subfusil', short: 'Subfusil', dmg: 19, rate: 0.085, mag: 32, reserve: 160, reload: 1.8, spread: 0.045, aimSpread: 0.012, pellets: 1, auto: true, kick: 0.008, shake: 0.006, noise: 32, sound: 'smg' },
  rifle: { name: 'Fusil de asalto', short: 'Fusil', dmg: 44, rate: 0.13, mag: 26, reserve: 104, reload: 2.1, spread: 0.035, aimSpread: 0.006, pellets: 1, auto: true, kick: 0.017, shake: 0.01, noise: 38, sound: 'rifle' },
};
