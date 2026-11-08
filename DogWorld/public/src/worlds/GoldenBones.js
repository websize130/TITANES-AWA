// Huesos Dorados globales: coleccionables únicos repartidos por el Hub y los 6 mundos.
// Cada jugador conserva su colección (álbum persistente); el servidor valida la
// recogida (zona y distancia) y anuncia el hallazgo a toda la sala.
// Están sobre pequeños pilares: hace falta saltar (o el doble salto) para alcanzarlos.

export const GOLDEN_BONES = Object.freeze([
  { id: 0, zone: 'hub', x: -30, z: -95, pillar: 1.4, hint: 'en el patio del castillo, junto a la cascada' },
  { id: 1, zone: 'hub', x: 42, z: 20, pillar: 2.2, hint: 'en la colina del este' },
  { id: 2, zone: 'hub', x: -44, z: -6, pillar: 2.4, hint: 'cerca del borde oeste de la isla' },
  { id: 3, zone: 'park', x: -6.3, z: 5, pillar: 1.8, hint: 'en la entrada del Parque' },
  { id: 4, zone: 'park', x: 7.6, z: -61, pillar: 2.2, hint: 'junto al balancín del Parque' },
  { id: 5, zone: 'forest', x: -5.5, z: -34, pillar: 2.0, hint: 'tras la niebla del Bosque' },
  { id: 6, zone: 'forest', x: 4.8, z: -69, pillar: 1.6, hint: 'al lado de la Bellota Dorada' },
  { id: 7, zone: 'ice', x: -6, z: -48, pillar: 2.2, hint: 'en la explanada helada' },
  { id: 8, zone: 'ice', x: 4.8, z: -84, pillar: 1.8, hint: 'en la cima de las Cumbres' },
  { id: 9, zone: 'factory', x: 5.5, z: -36, pillar: 2.2, hint: 'sobre la cinta de la Fábrica' },
  { id: 10, zone: 'factory', x: -5, z: -58, pillar: 1.8, hint: 'junto a la máquina de engranajes' },
  { id: 11, zone: 'desert', x: 5.5, z: -12, pillar: 2.0, hint: 'entre las palmeras del Desierto' },
  { id: 12, zone: 'desert', x: -5.5, z: -44, pillar: 2.2, hint: 'tras el oasis' },
  { id: 13, zone: 'fortress', x: 6, z: -41, pillar: 2.2, hint: 'en el patio de los Gatos' },
  { id: 14, zone: 'fortress', x: -6, z: -92, pillar: 2.4, hint: 'cerca de la sala del trono' },
]);

export const GOLDEN_BONE_REWARD = 10; // galletas por hueso
/** Recompensas de Josh Pablosky por número de Huesos Dorados. */
export const GUARDIAN_REWARDS = Object.freeze([
  { count: 5, item: 'lion_cape' },
  { count: 10, item: 'crown' },
  { count: GOLDEN_BONES.length, item: 'golden_wings' },
]);
