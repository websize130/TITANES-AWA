// La Horda: siluetas asimétricas, paleta fría y desaturada. Colosos de élite desde la Ronda 6.
export const ZOMBIES = {
  walker: { name: 'Errante', hp: 22, speed: 62, r: 14, dmg: 9, xp: 1, soul: 1 },
  runner: { name: 'Corredor', hp: 15, speed: 150, r: 12, dmg: 7, xp: 1, soul: 1 },
  bloater: { name: 'Hinchado', hp: 55, speed: 48, r: 20, dmg: 12, xp: 2, soul: 2, gas: { r: 90, dps: 10, time: 5 } },
  armored: { name: 'Acorazado', hp: 40, armor: 90, speed: 66, r: 16, dmg: 13, xp: 3, soul: 3 },
  forker: { name: 'Horquero', hp: 38, speed: 92, r: 14, dmg: 14, xp: 2, soul: 2, lunge: true },
  dynamiter: { name: 'Dinamitero', hp: 26, speed: 118, r: 14, dmg: 30, xp: 2, soul: 2, bomb: { r: 95 } },
};

export const COLOSSI = {
  foreman: { name: 'El Capataz de la Mina', hp: 2200, speed: 62, r: 40, dmg: 26, xp: 40, soul: 60,
    taunts: ['¡A trabajar, carroña!', 'La mina no perdona.', 'Tu pico, tu tumba.'] },
  faceless: { name: 'El Predicador sin Rostro', hp: 2600, speed: 74, r: 34, dmg: 24, xp: 45, soul: 70,
    taunts: ['…', 'No hay rostro que juzgar.', 'Arrodíllate ante el silencio.'] },
  beast: { name: 'La Bestia de la Ciénaga', hp: 3000, speed: 88, r: 44, dmg: 30, xp: 50, soul: 80,
    taunts: ['GRRRAAAAOOOH', '*chapoteo*', 'HHHRRRRK'] },
};
