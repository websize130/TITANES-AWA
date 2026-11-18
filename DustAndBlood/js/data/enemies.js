// Bestiario del Oeste Oculto.
export const ENEMIES = {
  outlaw: { name: 'Forajido Putrefacto', hp: 18, speed: 112, r: 13, dmg: 9, xp: 1, coin: 0.14, combo: 4 },
  miner: { name: 'Minero Maldito', hp: 78, speed: 52, r: 19, dmg: 16, xp: 3, coin: 0.4, combo: 7,
    explode: { r: 82, dmg: 22 } },
  shaman: { name: 'Chamán Corrupto', hp: 44, speed: 70, r: 14, dmg: 8, xp: 3, coin: 0.4, combo: 7,
    ranged: { range: 300, cd: 2.5, speed: 230, dmg: 12 } },
  hound: { name: 'Sabueso del Desierto', hp: 15, speed: 196, r: 12, dmg: 7, xp: 1, coin: 0.1, combo: 3, pack: [3, 6] },
  sniper: { name: 'Francotirador Espectral', hp: 36, speed: 0, r: 14, dmg: 24, xp: 4, coin: 0.6, combo: 9 },
  rider: { name: 'Jinete del Apocalipsis', hp: 60, speed: 150, r: 22, dmg: 20, xp: 5, coin: 1, combo: 15 },
};

export const ELITE = { hp: 7, r: 1.35, dmg: 1.4, xp: 8, coins: 6, combo: 3 };

export const BOSSES = {
  sheriff: { name: 'El Sheriff Ahorcado', hp: 2600, speed: 70, r: 34, dmg: 22, coins: 60 },
  bride: { name: 'La Novia Espectral', hp: 4200, speed: 95, r: 30, dmg: 24, coins: 90 },
  foreman: { name: 'El Capataz de Hierro', hp: 6200, speed: 60, r: 42, dmg: 30, coins: 120 },
  preacher: { name: 'El Predicador del Abismo', hp: 9500, speed: 72, r: 38, dmg: 30, coins: 200 },
};
