// Definición de las 7 razas jugables. Datos puros (sin Three.js): lo importan
// tanto el cliente como el servidor (que valida razas únicas y cooldowns).
// Paleta tomada de la ilustración de referencia del grupo.

export const ABILITY = Object.freeze({
  PARTY: 'party',     // Rufus
  SPRINT: 'sprint',   // Rayder
  TACKLE: 'tackle',   // Tyson
  ICE: 'ice',         // Blizzard
  DIG: 'dig',         // Digger
  SNIFF: 'sniff',     // Scout
  LIFT: 'lift',       // Goliath
});

export const BREEDS = Object.freeze([
  {
    id: 'rufus',
    name: 'Rufus',
    breed: 'Bichón Maltés',
    tagline: 'El alma de la fiesta',
    personality: 'Adorable, alegre e incansable. Ladra de felicidad y baila sobre sus patitas traseras a la mínima ocasión.',
    accent: '#ff8fc8',
    stats: { speed: 0.95, jump: 1.12, strength: 0.3, scale: 0.72 },
    ability: {
      id: ABILITY.PARTY, name: 'Ladrido Festivo', icon: '🎉', cooldown: 15, duration: 6, radius: 10,
      description: 'Un ladrido feliz que da súper salto y +15 % de velocidad a todo el equipo cercano durante 6 s.',
      anim: 'rufusDance',
    },
    gesture: 'rufusDance',
    model: {
      body: { w: 0.62, h: 0.56, l: 0.82 }, legLen: 0.36, legW: 0.17,
      head: { w: 0.62, h: 0.56, d: 0.52 }, snout: { l: 0.18, w: 0.26, h: 0.2 },
      ears: 'fluffy', tail: 'plume', fluffy: true,
      colors: { base: '#f7f4ef', white: '#ffffff', shade: '#e6ddcf', eyes: '#2a1a12', nose: '#151010', tongue: '#ff7fa6' },
      markings: {}, collar: { color: '#ff8fc8', tag: '#ffd34a' },
    },
  },
  {
    id: 'rayder',
    name: 'Rayder',
    breed: 'Galgo',
    tagline: 'Un rayo con patas',
    personality: 'Elegante, nervioso y competitivo. Siempre está estirándose, listo para salir disparado.',
    accent: '#ffb347',
    stats: { speed: 1.15, jump: 1.0, strength: 0.4, scale: 1.0 },
    ability: {
      id: ABILITY.SPRINT, name: 'Esprint', icon: '💨', cooldown: 8, duration: 3,
      description: 'Acelera hasta un 85 % más rápido durante 3 s. Ideal para saltos largos entre islotes.',
      anim: 'rayderReady',
    },
    gesture: 'rayderReady',
    model: {
      body: { w: 0.42, h: 0.46, l: 1.12 }, legLen: 0.62, legW: 0.11,
      head: { w: 0.34, h: 0.34, d: 0.42 }, snout: { l: 0.42, w: 0.18, h: 0.15 },
      ears: 'rose', tail: 'thin', waist: true,
      colors: { base: '#c98d4f', white: '#ecd2ae', shade: '#a8713a', eyes: '#3a2210', nose: '#2a1a14', tongue: '#ff7f8f' },
      markings: { chest: true, muzzle: false, paws: true },
    },
  },
  {
    id: 'tyson',
    name: 'Tyson',
    breed: 'Bulldog',
    tagline: 'Duro por fuera, tierno por dentro',
    personality: 'Gruñón, testarudo y leal. Rasca el suelo antes de embestir y presume de su collar de pinchos.',
    accent: '#e2563b',
    stats: { speed: 0.92, jump: 0.92, strength: 0.9, scale: 0.95 },
    ability: {
      id: ABILITY.TACKLE, name: 'Placaje', icon: '💥', cooldown: 4, duration: 0.35, radius: 3,
      description: 'Embestida frontal que rompe rocas agrietadas (con tesoro dentro) y empuja a otros perros.',
      anim: 'tysonTackle',
    },
    gesture: 'tysonTough',
    model: {
      body: { w: 0.86, h: 0.6, l: 0.86 }, legLen: 0.3, legW: 0.22,
      head: { w: 0.72, h: 0.56, d: 0.5 }, snout: { l: 0.16, w: 0.5, h: 0.28 },
      ears: 'fold', tail: 'stub', jowls: true,
      colors: { base: '#b0683a', white: '#f2e8dc', shade: '#8a4e2a', eyes: '#3a1f10', nose: '#1b1210', tongue: '#e8768a' },
      markings: { chest: true, muzzle: true, blaze: true, paws: true },
      collar: { color: '#4a2a1a', spikes: '#d8dde4' },
    },
  },
  {
    id: 'blizzard',
    name: 'Blizzard',
    breed: 'Husky Siberiano',
    tagline: 'Corazón de hielo, mirada azul',
    personality: 'Aventurero, cantarín y algo dramático. Aúlla a las nubes y su aliento escarcha el aire.',
    accent: '#6fd3ff',
    stats: { speed: 1.05, jump: 1.0, strength: 0.6, scale: 1.08 },
    ability: {
      id: ABILITY.ICE, name: 'Aliento de Hielo', icon: '❄️', cooldown: 6, duration: 10,
      description: 'Congela el aire y crea una plataforma de hielo delante durante 10 s. ¡Todo el equipo puede usarla!',
      anim: 'blizzardBreath',
    },
    gesture: 'blizzardHowl',
    model: {
      body: { w: 0.6, h: 0.58, l: 1.0 }, legLen: 0.48, legW: 0.16,
      head: { w: 0.5, h: 0.46, d: 0.46 }, snout: { l: 0.3, w: 0.24, h: 0.19 },
      ears: 'upright', tail: 'curlBushy',
      colors: { base: '#4b4f5a', white: '#f1f3f6', shade: '#2f323a', eyes: '#6fc3ff', nose: '#16181c', tongue: '#ff8fa0' },
      markings: { chest: true, belly: true, muzzle: true, mask: true, paws: true },
    },
  },
  {
    id: 'digger',
    name: 'Digger',
    breed: 'Corgi',
    tagline: 'Pequeño excavador, gran sonrisa',
    personality: 'Curioso, glotón y siempre sonriente. Mueve el culete al excavar y nunca suelta su pala.',
    accent: '#ffa94d',
    stats: { speed: 0.98, jump: 0.95, strength: 0.5, scale: 0.8 },
    ability: {
      id: ABILITY.DIG, name: 'Excavar', icon: '⛏️', cooldown: 3, duration: 1.2, radius: 2.6,
      description: 'Excava en los montículos de tierra para desenterrar tesoros (+3 huesos).',
      anim: 'diggerDig',
    },
    gesture: 'diggerDig',
    model: {
      body: { w: 0.6, h: 0.5, l: 1.02 }, legLen: 0.22, legW: 0.16,
      head: { w: 0.5, h: 0.44, d: 0.44 }, snout: { l: 0.24, w: 0.24, h: 0.18 },
      ears: 'bigUpright', tail: 'fluffStub',
      colors: { base: '#e08a3c', white: '#fbf3e8', shade: '#b86a2a', eyes: '#2a1a10', nose: '#1a1210', tongue: '#ff6f8a', dirt: '#6b4a2e' },
      markings: { chest: true, belly: true, muzzle: true, blaze: true, paws: true, dirtyPaws: true },
    },
  },
  {
    id: 'scout',
    name: 'Scout',
    breed: 'Border Collie',
    tagline: 'El cerebro del equipo',
    personality: 'Listísimo, atento y organizador. Olfatea cada rincón y señala con la patita lo que encuentra.',
    accent: '#7be07b',
    stats: { speed: 1.08, jump: 1.05, strength: 0.5, scale: 0.98 },
    ability: {
      id: ABILITY.SNIFF, name: 'Súper Olfato', icon: '👃', cooldown: 12, duration: 8, radius: 16,
      description: 'Revela rastros hacia huesos, montículos y rocas con tesoro. Los aliados cercanos también los ven.',
      anim: 'scoutSniff',
    },
    gesture: 'scoutSniff',
    model: {
      body: { w: 0.54, h: 0.54, l: 1.0 }, legLen: 0.46, legW: 0.14,
      head: { w: 0.46, h: 0.42, d: 0.44 }, snout: { l: 0.3, w: 0.22, h: 0.17 },
      ears: 'semi', tail: 'feather', ruff: true,
      colors: { base: '#1d1d22', white: '#f5f3ef', shade: '#101014', eyes: '#c98a2c', nose: '#121214', tongue: '#ff8395' },
      markings: { chest: true, muzzle: true, blaze: true, paws: true, collarRing: true },
    },
  },
  {
    id: 'goliath',
    name: 'Goliath',
    breed: 'San Bernardo',
    tagline: 'El gigante bonachón',
    personality: 'Tranquilo, protector y forzudo. Se toma su tiempo, pero levanta lo que haga falta por sus amigos.',
    accent: '#c8642a',
    stats: { speed: 0.88, jump: 0.94, strength: 1.0, scale: 1.32 },
    ability: {
      id: ABILITY.LIFT, name: 'Levantar Objetos', icon: '💪', cooldown: 0.6, duration: 0,
      radius: 3.2,
      description: 'Levanta pedruscos pesados y suéltalos donde quieras para crear escalones al equipo.',
      anim: 'goliathLift',
    },
    gesture: 'goliathLift',
    model: {
      body: { w: 0.78, h: 0.7, l: 1.12 }, legLen: 0.48, legW: 0.22,
      head: { w: 0.66, h: 0.6, d: 0.56 }, snout: { l: 0.26, w: 0.36, h: 0.26 },
      ears: 'floppy', tail: 'long', jowls: true, ruff: true,
      colors: { base: '#c8642a', white: '#f7f1e8', shade: '#5a2e14', eyes: '#3a1e0e', nose: '#1a1210', tongue: '#e87a8a' },
      markings: { chest: true, belly: true, muzzle: true, blaze: true, paws: true, eyeMask: true },
    },
  },
]);

export const BREED_IDS = BREEDS.map((b) => b.id);
export const BREED_BY_ID = Object.freeze(Object.fromEntries(BREEDS.map((b) => [b.id, b])));

export function getBreed(id) {
  return BREED_BY_ID[id] || BREEDS[0];
}
