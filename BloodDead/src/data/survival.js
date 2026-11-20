/* =====================================================================
   MODO SUPERVIVENCIA: 2 mapas exclusivos y 15 niveles con escalada progresiva.
   La curva es lineal y suave: cada nivel sube un poco velocidad, daño, vida, cantidad y cadencia.
   Las amenazas nuevas entran de una en una:
     · Nivel 2: corredores y primeras emboscadas bajo los tablones
     · Nivel 3: hinchados
     · Nivel 4: murciélagos zombi gigantes (siempre en el aire)
     · Nivel 5: primer infectado fuerte (y el 6 da un respiro: ninguno)
     · Nivel 7: el zombi araña (la Reina)
     · Nivel 9: furia (persiguen sin descanso)
     · Nivel 15: final con tres infectados fuertes
   ===================================================================== */

// [nivel, duración s, vivos a la vez, cadencia [mín, máx] s, velocidad, daño, vida, peso corredor, peso hinchado,
//  fuertes, murciélagos a la vez, cadencia murciélagos [mín, máx] s, emboscadas cada [mín, máx] s, furia]
const ROWS = [
  [1, 90, 4, [5.5, 8.5], 1.00, 1.00, 1.00, 0.00, 0.00, [], 0, null, null, false],
  [2, 100, 5, [5.0, 8.0], 1.03, 1.06, 1.04, 0.35, 0.00, [], 0, null, [55, 80], false],
  [3, 110, 6, [4.6, 7.4], 1.06, 1.12, 1.08, 0.55, 0.20, [], 0, null, [50, 75], false],
  [4, 120, 6, [4.3, 7.0], 1.09, 1.18, 1.12, 0.70, 0.25, [], 1, [24, 34], [45, 70], false],
  [5, 125, 7, [4.0, 6.6], 1.12, 1.24, 1.16, 0.80, 0.30, ['subject'], 1, [20, 30], [42, 64], false],
  [6, 130, 7, [3.8, 6.2], 1.15, 1.30, 1.20, 0.90, 0.32, [], 2, [18, 28], [40, 60], false],
  [7, 135, 8, [3.6, 5.9], 1.18, 1.36, 1.25, 1.00, 0.35, ['queen'], 2, [16, 25], [38, 56], false],
  [8, 140, 8, [3.4, 5.6], 1.21, 1.42, 1.30, 1.10, 0.38, ['stalker'], 2, [15, 23], [36, 52], false],
  [9, 145, 9, [3.2, 5.3], 1.24, 1.48, 1.35, 1.20, 0.40, ['subject'], 3, [14, 21], [34, 50], true],
  [10, 150, 9, [3.0, 5.0], 1.27, 1.54, 1.40, 1.30, 0.42, ['queen', 'behemoth'], 3, [13, 20], [32, 47], true],
  [11, 155, 10, [2.9, 4.8], 1.30, 1.60, 1.45, 1.40, 0.44, ['stalker'], 3, [12, 18], [30, 45], true],
  [12, 160, 10, [2.8, 4.6], 1.33, 1.66, 1.50, 1.50, 0.46, ['subject', 'queen'], 4, [11, 17], [28, 42], true],
  [13, 165, 11, [2.7, 4.4], 1.36, 1.72, 1.55, 1.60, 0.48, ['behemoth', 'stalker'], 4, [10, 16], [26, 40], true],
  [14, 170, 11, [2.6, 4.2], 1.39, 1.78, 1.60, 1.70, 0.50, ['queen', 'subject'], 5, [10, 15], [24, 38], true],
  [15, 180, 12, [2.4, 4.0], 1.42, 1.85, 1.65, 1.80, 0.52, ['subject', 'queen', 'behemoth'], 5, [9, 14], [22, 35], true],
];

export const SURVIVAL_LEVELS = ROWS.map(([n, dur, target, every, spd, dmg, hp, runner, bloater, strong, bats, batEvery, ambush, fury]) => ({
  n, dur, target, every, mult: { spd, dmg, hp }, fury,
  aggro: Math.min(1, 0.45 + n * 0.037),
  weights: { villager: 2, woman: 2, police: 1.5, runner, bloater },
  strong, bats: bats ? { max: bats, every: batEvery } : null, ambush: ambush ? { every: ambush } : null,
  heal: n % 5 === 0 ? 35 : 20, // los hitos (5 y 10) curan algo más
}));

export const SURVIVAL = {
  levels: SURVIVAL_LEVELS,
  get total() { return SURVIVAL_LEVELS.length; },
  intermission: 15,
  // Mapas exclusivos del Modo Supervivencia
  maps: {
    village: { level: 'village', name: 'El pueblo', time: 'Noche', icon: 'moon', desc: 'Pueblo en ruinas ampliado: granja, barrio de cabañas y cementerio' },
    island: { level: 'island', name: 'La isla', time: 'Día', icon: 'sun', desc: 'Playa, faro, embarcadero y cabañas sobre la arena' },
  },
  strongTypes: ['subject', 'stalker', 'behemoth', 'queen'],
  unlock: { shotgun: 1, smg: 2, rifle: 4 }, // el fusil llega con los murciélagos
  // Multijugador (2 jugadores, local u online): el doble de infectados (también el tope simultáneo), más agresivos,
  // furia desde el nivel 5 y murciélagos zombi desde el nivel 2 (uno más en los niveles que ya los tienen)
  coop: { zombies: 2, aggro: 0.3, spd: 1.06, furyFrom: 5, batsFrom: 2, earlyBats: { max: 1, every: [22, 32] } },
  // Vida de un infectado fuerte en supervivencia (relativa a su versión de jefe)
  strongHp: (n, duo) => (0.36 + n * 0.05) * (duo ? 1.3 : 1),
};
