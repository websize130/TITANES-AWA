// Catálogo de accesorios de la Tienda de Cheila (datos puros: cliente y servidor).
// Ranuras: head (cabeza), eyes (gafas), neck (cuello), back (espalda).
// `reward` = no se vende: lo regala un NPC (Josh por Huesos Dorados, PixelHugo…).

export const SLOTS = Object.freeze([
  { id: 'head', name: 'Sombreros', icon: '🎩' },
  { id: 'eyes', name: 'Gafas', icon: '🕶️' },
  { id: 'neck', name: 'Cuello', icon: '🎀' },
  { id: 'back', name: 'Espalda', icon: '🦸' },
]);

export const COSMETICS = Object.freeze([
  { id: 'party_hat', slot: 'head', name: 'Gorro de fiesta', icon: '🎉', price: 15, color: '#ff8fc8' },
  { id: 'bow', slot: 'head', name: 'Lazo rosa', icon: '🎀', price: 10, color: '#ff4f9a' },
  { id: 'flower_crown', slot: 'head', name: 'Corona de flores', icon: '🌼', price: 18, color: '#ffd84a' },
  { id: 'straw_hat', slot: 'head', name: 'Sombrero del maestro', icon: '👒', price: 20, color: '#c9933f' },
  { id: 'witch_hat', slot: 'head', name: 'Sombrero de bruja', icon: '🧙', price: 30, color: '#6b2fb8' },
  { id: 'crown', slot: 'head', name: 'Corona dorada', icon: '👑', price: 0, color: '#ffcf4a', reward: 'Josh: 10 Huesos Dorados' },

  { id: 'sunglasses', slot: 'eyes', name: 'Gafas de sol', icon: '🕶️', price: 15, color: '#2a1a10' },
  { id: 'round_glasses', slot: 'eyes', name: 'Gafas de sabio', icon: '👓', price: 12, color: '#3a3a3a' },
  { id: 'heart_glasses', slot: 'eyes', name: 'Gafas de corazón', icon: '💖', price: 20, color: '#ff4f9a' },
  { id: 'pixel_glasses', slot: 'eyes', name: 'Gafas pixeladas', icon: '🟫', price: 0, color: '#1a1a1a', reward: 'Regalo de PixelHugo' },

  { id: 'bandana', slot: 'neck', name: 'Pañuelo aventurero', icon: '🧣', price: 8, color: '#e2563b' },
  { id: 'bowtie', slot: 'neck', name: 'Pajarita elegante', icon: '🤵', price: 12, color: '#3a5ae0' },
  { id: 'scarf', slot: 'neck', name: 'Bufanda de invierno', icon: '❄️', price: 14, color: '#6fd3ff' },
  { id: 'medal', slot: 'neck', name: 'Medalla de campeón', icon: '🏅', price: 25, color: '#ffcf4a' },

  { id: 'backpack', slot: 'back', name: 'Mochila exploradora', icon: '🎒', price: 22, color: '#ffa94d' },
  { id: 'moon_cape', slot: 'back', name: 'Capa lunar', icon: '🌙', price: 35, color: '#3a2a8a' },
  { id: 'fairy_wings', slot: 'back', name: 'Alas de hada', icon: '🧚', price: 40, color: '#bff0ff' },
  { id: 'lion_cape', slot: 'back', name: 'Capa del león', icon: '🦁', price: 0, color: '#c0302a', reward: 'Josh: 5 Huesos Dorados' },
  { id: 'golden_wings', slot: 'back', name: 'Alas doradas', icon: '✨', price: 0, color: '#ffcf4a', reward: 'Josh: todos los Huesos Dorados' },
]);

export const COSMETIC_BY_ID = Object.freeze(Object.fromEntries(COSMETICS.map((c) => [c.id, c])));

/** Valida un conjunto equipado { head, eyes, neck, back } (ids o null). */
export function sanitizeCosmetics(c) {
  const out = {};
  if (!c || typeof c !== 'object') return out;
  for (const s of SLOTS) {
    const id = c[s.id];
    if (typeof id === 'string' && COSMETIC_BY_ID[id]?.slot === s.id) out[s.id] = id;
  }
  return out;
}
