// Disposición de los objetos interactivos de las habilidades (datos puros: cliente y servidor).
// Coordenadas XZ del Hub; la altura la calcula el cliente a partir del terreno.

/** Rocas agrietadas con tesoro (las rompe el Placaje de Tyson). */
export const ROCKS = Object.freeze([
  { x: -30, z: -28 }, { x: 27, z: 25 }, { x: 34, z: -4 }, { x: -12, z: -46 },
]);

/** Montículos de tierra con tesoro enterrado (los excava Digger). */
export const DIG_SPOTS = Object.freeze([
  { x: -8, z: 27 }, { x: 19, z: -1 }, { x: -27, z: 1 }, { x: 15, z: -41 }, { x: -37, z: 21 }, { x: 36, z: 12 },
]);

/** Pedruscos que Goliath puede levantar y recolocar. */
export const BOULDERS = Object.freeze([
  { x: 7, z: 13 }, { x: -15, z: -24 }, { x: 25, z: -10 },
]);

export const INTERACT = Object.freeze({
  ROCK_REWARD: 2,
  DIG_REWARD: 3,
  ROCK_RESPAWN_MS: 45000,
  DIG_RESPAWN_MS: 60000,
  ICE_LIFETIME: 10,
  TACKLE_RANGE: 3.6,
  DIG_RANGE: 2.8,
  LIFT_RANGE: 3.4,
  DROP_RANGE: 5,
});
