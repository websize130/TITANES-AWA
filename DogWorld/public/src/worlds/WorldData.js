// Los 6 mundos temáticos, sus portales en el Hub y sus misiones cooperativas.
// Datos puros (sin Three.js): los usan el cliente (construcción y lógica) y el
// servidor (desbloqueos, validación de distancias/razas y estado de misiones).
//
// Coordenadas de cada mundo: recorrido en línea hacia -z sobre "pads" (islas
// flotantes planas). Cada pad = [x, z, ancho, fondo, alturaSuperior].
//
// Tipos de objetivo:
//   break  — Placaje (Tyson) derriba un muro.              { wall:{x,z,w,h,d} }
//   freeze — Aliento de hielo (Blizzard) congela agua.     { water:{x,z,w,d}, bridge }
//   dig    — Excavar (Digger) desentierra una llave/objeto. { gate }
//   cheer  — Ladrido Festivo (Rufus) anima a un personaje. { critter, gate }
//   sniff  — Súper Olfato (Scout) revela un camino oculto. { stones:[[x,z,y]], gap }
//   switch — Interruptor con puerta temporizada (Rayder).   { switch:{x,z}, door:{x,z,w,h}, duration }
//   plates — Placas de presión (cooperativo o con el pedrusco de Goliath). { plates:[[x,z]], heavy, gate }

export const HUB_ZONE = 'hub';

export const ABILITY_FOR_TYPE = Object.freeze({
  break: 'tackle', freeze: 'ice', dig: 'dig', cheer: 'party', sniff: 'sniff',
});
export const BREED_FOR_TYPE = Object.freeze({
  break: 'tyson', freeze: 'blizzard', dig: 'digger', cheer: 'rufus', sniff: 'scout', switch: 'rayder', plates: 'goliath',
});

/** Plaza de los portales, delante del portón del castillo. */
export const PORTAL_PLAZA = Object.freeze({ x: 0, z: -93, returnSpawn: { x: 0, z: -88 } });

const portalPos = (x) => {
  const z = -99 + 0.008 * x * x;
  // Cada portal mira hacia el puente (punto 0, -78).
  const yaw = Math.atan2(0 - x, -78 - z);
  return { x, z, yaw };
};

export const WORLDS = Object.freeze([
  {
    id: 'park',
    name: 'Urban Park',
    title: 'Parque Urbano',
    color: '#ffe066',
    glow: ['#9be37a', '#6fc3ff'],
    requires: [],
    portal: portalPos(-25),
    relicName: 'Hueso de Oro del Parque',
    intro: 'Un parque precioso… ¡pero alguien ha cerrado las puertas y un cachorrito se ha perdido!',
    pads: [[0, 0, 16, 16, 0], [0, -18, 14, 20, 0], [0, -36, 6, 16, 0], [0, -54, 18, 20, 0], [0, -73, 12, 14, 0]],
    boulders: [[6, -50]],
    objectives: [
      {
        key: 'park_key', type: 'dig', x: -4, z: -15,
        label: 'Digger: desentierra la llave del parque en el arenero',
        gate: { x: 0, z: -27.5, w: 14, h: 3.5, d: 0.6 }, checkpoint: [0, -31],
      },
      {
        key: 'puppy', type: 'cheer', x: 0, z: -39,
        label: 'Rufus: anima al cachorrito asustado del puente',
        critter: { kind: 'puppy', x: 0, z: -40 }, gate: { x: 0, z: -40, w: 6, h: 2.5, d: 1.2, invisible: true }, checkpoint: [0, -47],
      },
      {
        key: 'seesaw', type: 'plates', x: 0, z: -56,
        label: 'Equipo: pisad las dos placas a la vez (o usad el pedrusco de Goliath)',
        plates: [[-5, -56], [5, -58]], heavy: false,
        gate: { x: 0, z: -64.5, w: 18, h: 3.5, d: 0.6 }, checkpoint: [0, -68],
      },
    ],
    relic: { x: 0, z: -76 },
  },
  {
    id: 'forest',
    name: 'Forest',
    title: 'Bosque Susurrante',
    color: '#8ef06b',
    glow: ['#4ddb5a', '#b8ff7a'],
    requires: ['park'],
    portal: portalPos(-15),
    relicName: 'Bellota Dorada',
    intro: 'La niebla esconde los caminos y los árboles caídos bloquean el paso. ¡Olfato y fuerza!',
    pads: [[0, 0, 14, 14, 0], [0, -32, 14, 14, 0], [0, -48, 14, 18, 0], [0, -66, 12, 12, 0]],
    boulders: [],
    objectives: [
      {
        key: 'fog_path', type: 'sniff', x: 0, z: -9,
        label: 'Scout: olfatea el camino oculto entre la niebla',
        gap: { x: 0, z: -16, w: 14, d: 18 },
        stones: [[0, -10, 0.2], [2, -14, 0.5], [-1, -18, 0.8], [1, -22, 0.4]], checkpoint: [0, -30],
      },
      {
        key: 'logs', type: 'break', x: 0, z: -39,
        label: 'Tyson: derriba el muro de troncos caídos',
        wall: { x: 0, z: -39.5, w: 14, h: 3.5, d: 1.4 }, checkpoint: [0, -43],
      },
      {
        key: 'mushroom', type: 'dig', x: 4, z: -48,
        label: 'Digger: desentierra la seta mágica que abre las zarzas',
        gate: { x: 0, z: -56.6, w: 14, h: 3.5, d: 0.8 }, checkpoint: [0, -62],
      },
    ],
    relic: { x: 0, z: -68 },
  },
  {
    id: 'ice',
    name: 'Ice Cumbre',
    title: 'Cumbres de Hielo Eterno',
    color: '#a8e8ff',
    glow: ['#6fd3ff', '#ffffff'],
    requires: ['park'],
    portal: portalPos(-5),
    relicName: 'Copo de Cristal Eterno',
    intro: 'Un río helado de verdad y puertas que se cierran en un suspiro. ¡Necesitaréis frío y velocidad!',
    pads: [[0, 0, 14, 14, 0], [0, -38, 16, 34, 0], [0, -64, 14, 16, 0], [0, -80, 12, 12, 0]],
    boulders: [[-4, -60]],
    objectives: [
      {
        key: 'river', type: 'freeze', x: 0, z: -8,
        label: 'Blizzard: congela el río para cruzarlo',
        water: { x: 0, z: -14, w: 14, d: 14 }, bridge: { x: 0, z: -14, w: 5, d: 15 }, checkpoint: [0, -24],
      },
      {
        key: 'ice_gate', type: 'switch', x: 6, z: -24,
        label: 'Rayder: pulsa el interruptor y cruza la puerta antes de que se cierre',
        switch: { x: 6, z: -24 }, door: { x: 0, z: -55, w: 16, h: 4 }, duration: 2.6, checkpoint: [0, -59],
      },
      {
        key: 'ice_plate', type: 'plates', x: 4, z: -66,
        label: 'Goliath: coloca el bloque de hielo sobre la placa pesada',
        plates: [[4, -66]], heavy: true,
        gate: { x: 0, z: -72, w: 14, h: 3.5, d: 0.6 }, checkpoint: [0, -77],
      },
    ],
    relic: { x: 0, z: -82 },
  },
  {
    id: 'factory',
    name: 'Factory',
    title: 'Fábrica de Juguetes',
    color: '#ffa94d',
    glow: ['#ff8a1f', '#ffd84a'],
    requires: ['forest', 'ice'],
    portal: portalPos(5),
    relicName: 'Engranaje de Oro',
    intro: '¡Las máquinas se han vuelto locas! Cajas atascadas, cintas a toda velocidad y pintura hirviendo.',
    pads: [[0, 0, 14, 14, 0], [0, -26, 14, 38, 0], [0, -54, 14, 16, 0], [0, -80, 12, 12, 0]],
    boulders: [[-4, -50]],
    objectives: [
      {
        key: 'crates', type: 'break', x: 0, z: -8,
        label: 'Tyson: embiste la pila de cajas atascadas',
        wall: { x: 0, z: -8, w: 14, h: 3.5, d: 1.4 }, checkpoint: [0, -12],
      },
      {
        key: 'conveyor', type: 'switch', x: -5, z: -12,
        label: 'Rayder: activa la cinta y cruza la compuerta a tiempo',
        switch: { x: -5, z: -12 }, door: { x: 0, z: -44.5, w: 14, h: 4 }, duration: 2.6, checkpoint: [0, -49],
      },
      {
        key: 'gear', type: 'plates', x: 4, z: -56,
        label: 'Goliath: pon el engranaje gigante sobre la placa de la máquina',
        plates: [[4, -56]], heavy: true,
        gate: { x: 0, z: -61.6, w: 14, h: 3.5, d: 0.6 }, checkpoint: [0, -59],
      },
      {
        key: 'paint', type: 'freeze', x: 0, z: -63,
        label: 'Blizzard: congela la pintura hirviendo',
        water: { x: 0, z: -68, w: 14, d: 12 }, bridge: { x: 0, z: -68, w: 5, d: 13 }, checkpoint: [0, -77],
      },
    ],
    relic: { x: 0, z: -82 },
  },
  {
    id: 'desert',
    name: 'Desert',
    title: 'Ruinas del Desierto',
    color: '#ffd27a',
    glow: ['#ffcf4a', '#6fe0d0'],
    requires: ['forest', 'ice'],
    portal: portalPos(15),
    relicName: 'Escarabajo Solar',
    intro: 'Arena, un oasis traicionero y una tormenta que borra los caminos. ¡Todo el equipo hará falta!',
    pads: [[0, 0, 14, 14, 0], [0, -16, 14, 18, 0], [0, -46, 14, 14, 0], [0, -76, 14, 14, 0]],
    boulders: [],
    objectives: [
      {
        key: 'scarab', type: 'dig', x: -4, z: -3,
        label: 'Digger: desentierra el escarabajo-llave de la arena',
        gate: { x: 0, z: -7.2, w: 14, h: 3.5, d: 0.6 }, checkpoint: [0, -12],
      },
      {
        key: 'oasis', type: 'freeze', x: 0, z: -24,
        label: 'Blizzard: congela el oasis para cruzarlo',
        water: { x: 0, z: -32, w: 14, d: 14 }, bridge: { x: 0, z: -32, w: 5, d: 15 }, checkpoint: [0, -42],
      },
      {
        key: 'sand_wall', type: 'break', x: 0, z: -52,
        label: 'Tyson: rompe el muro de arenisca agrietado',
        wall: { x: 0, z: -52.6, w: 14, h: 3.5, d: 1.2 }, checkpoint: [0, -50],
      },
      {
        key: 'storm_path', type: 'sniff', x: 0, z: -52,
        label: 'Scout: encuentra el camino que la tormenta ha cubierto',
        gap: { x: 0, z: -61, w: 14, d: 16 },
        stones: [[0, -56, 0.3], [-2, -60, 0.6], [1, -64, 0.9], [0, -67, 0.4]], checkpoint: [0, -72],
      },
    ],
    relic: { x: 0, z: -78 },
  },
  {
    id: 'fortress',
    name: 'Final Fortress',
    title: 'Castillo de los Gatos Villanos',
    color: '#c78bff',
    glow: ['#9b4dff', '#2a0d4a'],
    requires: ['park', 'forest', 'ice', 'factory', 'desert'],
    portal: portalPos(25),
    relicName: 'Corona del Castillo',
    intro: 'Los Gatos Villanos robaron la Corona del Castillo. ¡Solo los siete perros juntos pueden recuperarla!',
    pads: [[0, 0, 14, 14, 0], [0, -16, 14, 18, 0], [0, -44, 16, 14, 0], [0, -58, 16, 14, 0], [0, -88, 16, 18, 0], [0, -104, 14, 14, 0]],
    boulders: [[-5, -55]],
    objectives: [
      {
        key: 'portcullis', type: 'break', x: 0, z: -7,
        label: 'Tyson: derriba el rastrillo de los gatos',
        wall: { x: 0, z: -7.4, w: 14, h: 4, d: 1.2 }, checkpoint: [0, -12],
      },
      {
        key: 'moat', type: 'freeze', x: 0, z: -24,
        label: 'Blizzard: congela el foso de baba morada',
        water: { x: 0, z: -31, w: 14, d: 12 }, bridge: { x: 0, z: -31, w: 5, d: 13 }, checkpoint: [0, -40],
      },
      {
        key: 'cat_guard', type: 'cheer', x: 0, z: -47,
        label: 'Rufus: distrae al gato guardián con tu baile',
        critter: { kind: 'cat', x: 0, z: -49 }, gate: { x: 0, z: -50.6, w: 16, h: 3.5, d: 0.6 }, checkpoint: [0, -54],
      },
      {
        key: 'cat_plate', type: 'plates', x: 5, z: -60,
        label: 'Goliath: aplasta la placa del mecanismo con el pedrusco',
        plates: [[5, -60]], heavy: true,
        gate: { x: 0, z: -64.6, w: 16, h: 3.5, d: 0.6 }, checkpoint: [0, -62],
      },
      {
        key: 'shadow_path', type: 'sniff', x: 0, z: -66,
        label: 'Scout: rastrea el camino de sombras',
        gap: { x: 0, z: -72, w: 16, d: 14 },
        stones: [[0, -67, 0.3], [2, -71, 0.6], [-1, -75, 0.3]], checkpoint: [0, -82],
      },
      {
        key: 'cat_key', type: 'dig', x: -5, z: -86,
        label: 'Digger: desentierra la llave que escondieron los gatos',
        gate: { x: 0, z: -96.6, w: 16, h: 4, d: 0.6 }, checkpoint: [0, -101],
      },
      {
        key: 'throne_gate', type: 'switch', x: 6, z: -82,
        label: 'Rayder: pulsa el interruptor y atraviesa la puerta del trono a toda prisa',
        switch: { x: 6, z: -82 }, door: { x: 0, z: -95.2, w: 16, h: 4 }, duration: 2.2, checkpoint: [0, -101],
      },
    ],
    relic: { x: 0, z: -106 },
  },
]);

export const WORLD_BY_ID = Object.freeze(Object.fromEntries(WORLDS.map((w) => [w.id, w])));
export const WORLD_IDS = WORLDS.map((w) => w.id);

export function isUnlocked(worldId, progress) {
  const w = WORLD_BY_ID[worldId];
  if (!w) return false;
  const done = progress instanceof Set ? progress : new Set(progress || []);
  return w.requires.every((r) => done.has(r));
}

/** Punto de aparición dentro de un mundo (sobre el primer pad). */
export function worldSpawn(worldId) {
  return { x: 0, z: 3 };
}

/** Portal de salida (vuelta al Hub) dentro de cada mundo. */
export const EXIT_PORTAL = Object.freeze({ x: 5, z: -2, r: 1.4 });

/** Distancia máxima a la que se acepta la acción de un objetivo. */
export const OBJECTIVE_RANGE = Object.freeze({ break: 5, freeze: 9, dig: 3.5, cheer: 9, sniff: 10, switch: 2.8, plates: 2.2 });

export const WORLD_FALL_Y = -14;
export const PORTAL_COUNTDOWN_MS = 6000;
export const PORTAL_ALL_READY_MS = 1500;
