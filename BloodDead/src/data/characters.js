// Estadísticas reales: se copian al jugador al seleccionar personaje
export const CHARACTERS = [
  { id: 'alex', name: 'Alex Vance', role: 'Ex-Militar', archetype: 'Equilibrado', chip: 'Versátil', initials: 'AV', accent: '#8b0000', difficulty: 2,
    bio: 'Veterano de operaciones especiales. Mantiene la sangre fría cuando todo se derrumba y no tiene puntos débiles.',
    perk: { name: 'Disciplina táctica', text: 'Apunta y recarga un 15 % más rápido.' },
    stats: { maxHealth: 100, speed: 3.4, runSpeed: 5.6, stamina: 100, staminaRegen: 18, armor: 0.05, critChance: 0.10, critMult: 2.0, damageMult: 1.0, aimSpeed: 1.15, reloadMult: 1.15 },
    look: {
      scale: 1.0, build: 1.0, hipW: 1.0, skin: 0xc8a083, lip: 0x8f5a50, eyes: 0x5b7180, hair: 0x3a2a1f, hairStyle: 'short', stubble: 0.55,
      face: { cw: 1.0, fw: 1.0, jawW: 1.04, jawR: 0.017, chinW: 1.0, chinZ: 1.0, cheek: 1.0, fat: 1.0, brow: 1.0, noseL: 1.0, noseW: 1.0, lips: 1.0 },
      outfit: 'tactical', top: 0x3f4632, layer: 0x2a2e24, pants: 0x2e302b, boots: 0x231d17, gloves: 0x1d1d1b, fab: { top: 'canvas', layer: 'nylon', pants: 'canvas' },
      gear: ['scarf', 'pack', 'kneepads'], scarf: 0x3b352b, pack: 0x37352b,
      model: { url: null }, // ← ruta a un .glb realista (p. ej. 'models/alex.glb') para sustituir la malla procedural
    } },
  { id: 'marcus', name: 'Marcus Reed', role: 'Detective', archetype: 'Tanque · Más vida', chip: '150 PV', initials: 'MR', accent: '#5d6066', difficulty: 1,
    bio: 'Veinte años en homicidios. Ha visto de todo… hasta esta noche. Aguanta golpes que tumbarían a cualquiera.',
    perk: { name: 'Piel curtida', text: 'Recibe un 20 % menos de daño.' },
    stats: { maxHealth: 150, speed: 3.0, runSpeed: 4.9, stamina: 90, staminaRegen: 14, armor: 0.20, critChance: 0.08, critMult: 1.8, damageMult: 1.05, aimSpeed: 0.9, reloadMult: 0.9 },
    look: {
      scale: 1.05, build: 1.2, hipW: 1.08, skin: 0x7a5038, lip: 0x5a3530, eyes: 0x3b2618, hair: 0x1a1512, hairStyle: 'buzz', beard: true, stubble: 0.3,
      face: { cw: 1.05, fw: 1.08, jawW: 1.18, jawR: 0.0205, chinW: 1.18, chinZ: 1.02, cheek: 1.08, fat: 1.02, brow: 1.32, noseL: 1.02, noseW: 1.2, lips: 1.1 }, // mandíbula ancha y cejas marcadas
      outfit: 'trench', top: 0x5a4c3a, layer: 0x5a4c3a, shirt: 0xb7b2a8, tie: 0x2b1e22, pants: 0x26282c, boots: 0x17130f, fab: { layer: 'denim', pants: 'canvas' },
      model: { url: null },
    } },
  { id: 'julian', name: 'Dr. Julian Cole', role: 'Investigador', archetype: 'Daño crítico', chip: '30 % crít.', initials: 'JC', accent: '#8a8178', difficulty: 3,
    bio: 'Virólogo del laboratorio que nadie debía conocer. Sabe exactamente dónde golpear para que no vuelvan a levantarse.',
    perk: { name: 'Anatomía letal', text: '30 % de probabilidad de crítico con daño ×2,6.' },
    stats: { maxHealth: 90, speed: 3.2, runSpeed: 5.2, stamina: 85, staminaRegen: 16, armor: 0, critChance: 0.30, critMult: 2.6, damageMult: 1.0, aimSpeed: 1.0, reloadMult: 1.0 },
    look: {
      scale: 1.0, build: 0.96, hipW: 0.98, skin: 0xc29a7e, lip: 0x8a5a54, eyes: 0x6b5a3a, hair: 0x7a7168, hairStyle: 'swept', stubble: 0.35, glasses: true,
      face: { cw: 0.98, fw: 0.95, jawW: 0.95, jawR: 0.0155, chinW: 0.9, chinZ: 1.03, cheek: 1.12, fat: 0.72, brow: 0.95, noseL: 1.08, noseW: 0.92, lips: 0.88 },
      outfit: 'field', top: 0x48525c, layer: 0x6f6754, pants: 0x353b42, boots: 0x2a221b, fab: { top: 'canvas', layer: 'canvas', pants: 'denim' },
      model: { url: null },
    } },
  { id: 'valeria', name: 'Valeria Cruz', role: 'Superviviente', archetype: 'Agilidad y velocidad', chip: '6,6 m/s', initials: 'VC', accent: '#b3121b', difficulty: 2,
    bio: 'Lleva semanas sola en la zona cero. Rápida, ligera y con un fondo físico que le permite escapar de cualquier cerco.',
    perk: { name: 'Instinto', text: 'La más rápida a la carrera y con +40 % de resistencia.' },
    stats: { maxHealth: 85, speed: 3.9, runSpeed: 6.6, stamina: 140, staminaRegen: 24, armor: 0, critChance: 0.12, critMult: 2.0, damageMult: 0.95, aimSpeed: 1.1, reloadMult: 1.05 },
    look: {
      scale: 0.95, build: 0.86, hipW: 1.1, female: true, skin: 0xb07c5a, lip: 0x8e4f4a, eyes: 0x4a2f1c, hair: 0x22180f, hairStyle: 'tied', stubble: 0, locks: true,
      face: { cw: 0.95, fw: 0.91, jawW: 0.82, jawR: 0.0125, chinW: 0.78, chinZ: 1.0, cheek: 1.2, fat: 1.0, brow: 0.42, noseL: 0.88, noseW: 0.8, lips: 1.28 }, // pómulos altos, mandíbula fina
      outfit: 'hoodie', top: 0x5b2027, pants: 0x2a2c31, boots: 0x1d1814, pack: 0x3b3429, fab: { top: 'rib', pants: 'denim' },
      model: { url: null },
    } },
];
