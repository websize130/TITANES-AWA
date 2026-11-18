// Modo Historia: cada misión abre con una página de cómic, se combate con bocadillos y cierra con
// una viñeta final ("CASO CERRADO" o "FINAL TRÁGICO").
// obj.type: survive | kill | defend | boss | escape

export const MAPS = {
  crossroads: { name: 'El Cruce de los Condenados', ground: '#2a2420', g2: '#3a302a', g3: '#15100c', props: ['gravecross', 'deadtree', 'rock', 'fence', 'skullpile', 'post'], fog: false, zoned: true },
  town: { name: 'Hollow Creek', ground: '#3a2a20', g2: '#4a3628', g3: '#1a120c', props: ['barrel', 'crate', 'fence', 'wheel', 'post', 'deadtree'], fog: false },
  chapel: { name: 'Capilla de Gallow\'s Rest', ground: '#2a2228', g2: '#3a2e34', g3: '#140e12', props: ['gravecross', 'tomb', 'deadtree', 'fence', 'pew'], fog: true },
  mine: { name: 'Minas de Plata Negra', ground: '#2a2622', g2: '#3a342c', g3: '#12100c', props: ['rock', 'beam', 'cart', 'crate', 'ore'], fog: false },
  swamp: { name: 'Pantano de Saint-Mort', ground: '#1e2620', g2: '#2a3428', g3: '#0c120c', props: ['deadtree', 'reeds', 'rock', 'stump', 'bones'], fog: true },
  pulpit: { name: 'El Púlpito del Abismo', ground: '#2a1a1a', g2: '#3a2222', g3: '#140808', props: ['gravecross', 'pew', 'rock', 'skullpile', 'tomb'], fog: false },
};

export const MISSIONS = [
  {
    id: 'm1', name: 'Polvo en la Tumba', map: 'town', reward: 150,
    obj: { type: 'survive', time: 100 }, spawn: { walker: 8, runner: 2, hound: 1 }, rate: 1.1,
    intro: [
      { scene: 'town', cap: 'Hollow Creek, Territorio de Arizona. El reloj de la iglesia se paró a las 3:15. Nadie lo ha vuelto a dar cuerda.' },
      { scene: 'hero', cap: 'El telegrama decía "trabajo fácil". Los telegramas siempre mienten.', say: 'Huele a cementerio removido.' },
      { scene: 'horde', cap: 'Al caer el sol, el pueblo entero salió a recibirle.', say2: 'Grrrhhh…' },
      { scene: 'trap', cap: 'CONSEJO: dispara a faroles y barriles. Los cepos muerden a quien los pise.' },
    ],
    win: { scene: 'sunrise', cap: 'Amaneció sobre Hollow Creek. Los muertos volvieron a callar… por ahora.' },
    lose: { scene: 'fallen', cap: 'El reloj de la iglesia marcó las 3:15. Otra vez.' },
  },
  {
    id: 'm2', name: 'La Campana de Gallow\'s Rest', map: 'chapel', reward: 220,
    obj: { type: 'defend', time: 110, hp: 1800, label: 'DEFIENDE A LOS SUPERVIVIENTES', miniboss: { type: 'plague', at: 55 } }, spawn: { walker: 6, runner: 3, bloater: 1, spider: 2 }, rate: 1.25,
    intro: [
      { scene: 'chapel', cap: 'La capilla quemada aún humea. Dentro, tres niños y una viuda rezan junto a la campana.' },
      { scene: 'hero', cap: 'Alguien tiene que mantener la puerta cerrada hasta el alba.', say: 'Nadie entra. Nadie sale.' },
      { scene: 'grave', cap: 'Del cementerio llegan rasguños. Primero pocos. Luego cientos.' },
      { scene: 'boss_plague', cap: 'Y entre las lápidas, un predicador con un farol verde que devuelve la vida a lo que no debería tenerla.', say2: '¡Levantaos!' },
    ],
    win: { scene: 'sunrise', cap: 'La campana sonó al alba. Esta vez, alguien respondió.' },
    lose: { scene: 'chapel', cap: 'La campana dejó de sonar antes del amanecer.' },
  },
  {
    id: 'm3', name: 'Plata Negra', map: 'mine', reward: 320, boss: 'spawn',
    obj: { type: 'boss', boss: 'spawn' }, spawn: { walker: 5, runner: 2, armored: 2, dynamiter: 1, spider: 2, abomination: 0.4 }, rate: 1.1,
    intro: [
      { scene: 'mine', cap: 'Minas de Plata Negra. Ciento doce mineros murieron en el derrumbe del 76. Ninguno dejó de trabajar.' },
      { scene: 'horde', cap: 'Picos, palas y dinamita. La horda tiene herramientas.' },
      { scene: 'boss_spawn', cap: 'En el fondo del pozo, algo hecho de mineros y mineral se arrastra con un fardo de dinamita en la espalda.', say2: 'GRRRHHH… DINAMITA…' },
    ],
    win: { scene: 'mine', cap: 'La dinamita de su espalda hizo el resto. El silbato del turno no volvió a sonar.' },
    lose: { scene: 'fallen', cap: 'Ciento trece mineros. La cuadrilla está completa.' },
  },
  {
    id: 'm4', name: 'Aguas de Saint-Mort', map: 'swamp', reward: 420,
    obj: { type: 'kill', count: 140, label: 'PURGA LA CIÉNAGA' }, spawn: { walker: 5, runner: 3, bloater: 2, forker: 2, hound: 2, spider: 2 }, rate: 1.5,
    intro: [
      { scene: 'swamp', cap: 'Pantano de Saint-Mort. Los cajún dicen que el agua tiene memoria… y hambre.' },
      { scene: 'hero', cap: 'La niebla traga los disparos. Hay que vaciar la ciénaga uno a uno.', say: 'Que salgan del barro.' },
      { scene: 'eyes', cap: 'Algo enorme observa desde los juncos. Paciente.' },
    ],
    win: { scene: 'swamp', cap: 'Ciento cuarenta cuerpos devueltos al fango. El agua se quedó quieta.' },
    lose: { scene: 'fallen', cap: 'El pantano siempre se cobra su diezmo.' },
  },
  {
    id: 'm5', name: 'La Bestia de la Ciénaga', map: 'swamp', reward: 520, boss: 'beast',
    obj: { type: 'boss', boss: 'beast' }, spawn: { walker: 4, runner: 3, forker: 2, bloater: 1, hound: 2, abomination: 0.4 }, rate: 1.1,
    intro: [
      { scene: 'eyes', cap: 'Lo que observaba desde los juncos ha perdido la paciencia.' },
      { scene: 'boss_beast', cap: 'Mitad caimán, mitad pesadilla. Se tragó una diligencia entera en el 81.', say2: 'GRRRAAAAOOOH' },
      { scene: 'hero', cap: 'No hay bala lo bastante grande. Habrá que disparar muchas.', say: 'Ven a por mí, lagarto.' },
    ],
    win: { scene: 'swamp', cap: 'La Bestia se hundió por última vez. Las ranas volvieron a cantar.' },
    lose: { scene: 'fallen', cap: 'En Saint-Mort hay una nueva leyenda. No es la tuya.' },
  },
  {
    id: 'm6', name: 'El Último Sermón', map: 'pulpit', reward: 800, boss: 'faceless',
    obj: { type: 'boss', boss: 'faceless' }, spawn: { walker: 4, runner: 3, armored: 2, dynamiter: 1, bloater: 1, hound: 2, spider: 2, abomination: 0.5 }, rate: 1.25,
    intro: [
      { scene: 'pulpit', cap: 'Todas las huellas llevan al mismo sitio: una iglesia que no aparece en ningún mapa.' },
      { scene: 'boss_faceless', cap: 'En el púlpito, un predicador sin rostro recita un sermón sin palabras. Y los muertos escuchan.' },
      { scene: 'hero', cap: 'Se acabaron los sermones.', say: 'Amén, hijo de perra.' },
    ],
    win: { scene: 'sunrise', cap: 'El púlpito ardió hasta los cimientos. Por primera vez en años, el Oeste durmió de un tirón.' },
    lose: { scene: 'pulpit', cap: 'El sermón continúa. Ahora con un feligrés más.' },
  },
];

export const SURVIVAL = { id: 'survival', name: 'El Cruce de los Condenados', map: 'crossroads' };

// Comarca conectada (supervivencia): pueblo al oeste, cementerio en el centro, mina al este.
export const ZONES = [
  { id: 'town', name: 'EL PUEBLO', x0: -1, x1: -1 / 3, ground: '#3a2a20', g2: '#4a3628', g3: '#1a120c', props: ['barrel', 'crate', 'fence', 'wheel', 'post', 'deadtree'], mini: '#6a4a30' },
  { id: 'cemetery', name: 'EL CEMENTERIO', x0: -1 / 3, x1: 1 / 3, ground: '#2a2228', g2: '#3a2e34', g3: '#140e12', props: ['gravecross', 'tomb', 'deadtree', 'skullpile', 'fence', 'gravecross'], mini: '#4a3a4a' },
  { id: 'mine', name: 'LA MINA', x0: 1 / 3, x1: 1, ground: '#2a2622', g2: '#3a342c', g3: '#12100c', props: ['rock', 'beam', 'cart', 'crate', 'ore', 'rock'], mini: '#4a4238' },
];
