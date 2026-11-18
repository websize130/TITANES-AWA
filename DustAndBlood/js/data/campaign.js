// Campaña: 4 escenarios, 22 misiones. Recompensas crecientes (150 → 1.500).
// obj.type: survive | destroy | defend | purify | elites | collect | bridge | boss | infinite
// mods: night | fog | meteors | carts | storm | noHeal | bloodmoon | dark

export const SCENARIOS = [
  {
    id: 'reddust', name: 'Pueblo Fantasma de Red Dust', short: 'Red Dust', theme: 'town',
    desc: 'Un pueblo minero tragado por la arena roja. Los muertos aún beben en el saloon.',
    hpMult: 1, dmgMult: 1, color: '#c0562a',
    missions: [
      { id: 'rd1', name: 'Polvo y Plomo', brief: 'Sobrevive 2 minutos a la primera oleada de forajidos.',
        obj: { type: 'survive', time: 120 }, reward: 150, spawn: { outlaw: 8, hound: 2 }, rate: 1.1 },
      { id: 'rd2', name: 'Tótems de Ceniza', brief: 'Destruye los 3 Tótems de Ceniza que invocan a los muertos.',
        obj: { type: 'destroy', count: 3, kind: 'totem', hp: 420 }, reward: 180, spawn: { outlaw: 6, hound: 2, miner: 1 }, rate: 1.1 },
      { id: 'rd3', name: 'Horda Nocturna', brief: 'Cae la noche. Sobrevive 3 minutos con la luz de tu farol.',
        obj: { type: 'survive', time: 180 }, mods: ['night'], reward: 220, spawn: { outlaw: 6, hound: 3, miner: 1 }, rate: 1.3 },
      { id: 'rd4', name: 'Defensa del Saloon', brief: 'Defiende el Saloon durante 90 segundos. Si cae, todo está perdido.',
        obj: { type: 'defend', time: 90, kind: 'saloon', hp: 1400 }, reward: 260, spawn: { outlaw: 7, miner: 2, shaman: 1 }, rate: 1.35 },
      { id: 'rd5', name: 'El Sheriff Ahorcado', brief: 'La soga cruje en la plaza. Acaba con el Sheriff Ahorcado.',
        obj: { type: 'boss', boss: 'sheriff' }, reward: 420, spawn: { outlaw: 5, hound: 2 }, rate: 0.8, boss: true },
    ],
  },
  {
    id: 'cemetery', name: 'Cementerio de la Luna de Sangre', short: 'Luna de Sangre', theme: 'cemetery',
    desc: 'Bajo la luna carmesí, las lápidas susurran nombres olvidados.',
    hpMult: 1.4, dmgMult: 1.2, color: '#9a1a3a',
    missions: [
      { id: 'cm1', name: 'Tierra Removida', brief: 'Sobrevive 3 minutos entre las tumbas abiertas.',
        obj: { type: 'survive', time: 180 }, mods: ['bloodmoon'], reward: 300, spawn: { outlaw: 6, hound: 3, shaman: 1 }, rate: 1.3 },
      { id: 'cm2', name: 'Lápidas Malditas', brief: 'Purifica 4 Lápidas Malditas permaneciendo junto a ellas.',
        obj: { type: 'purify', count: 4, time: 4.5 }, mods: ['bloodmoon'], reward: 340, spawn: { outlaw: 6, hound: 2, shaman: 2 }, rate: 1.3 },
      { id: 'cm3', name: 'Niebla de Difuntos', brief: 'Sobrevive 3 minutos bajo una niebla densa.',
        obj: { type: 'survive', time: 180 }, mods: ['fog', 'bloodmoon'], reward: 380, spawn: { outlaw: 5, hound: 4, sniper: 1 }, rate: 1.4 },
      { id: 'cm4', name: 'Cacería de Nigromantes', brief: 'Elimina 5 Nigromantes Élites que alzan a los muertos.',
        obj: { type: 'elites', count: 5, enemy: 'shaman', label: 'Nigromante' }, mods: ['bloodmoon'], reward: 420, spawn: { outlaw: 6, hound: 2, shaman: 2 }, rate: 1.4 },
      { id: 'cm5', name: 'Cielo en Llamas', brief: 'Sobrevive 4 minutos mientras llueven meteoritos.',
        obj: { type: 'survive', time: 240 }, mods: ['meteors', 'bloodmoon'], reward: 480, spawn: { outlaw: 6, hound: 3, shaman: 1, miner: 1 }, rate: 1.5 },
      { id: 'cm6', name: 'La Novia Espectral', brief: 'Su velo aún espera al novio. Destruye a la Novia Espectral.',
        obj: { type: 'boss', boss: 'bride' }, mods: ['bloodmoon'], reward: 650, spawn: { outlaw: 4, hound: 3 }, rate: 0.9, boss: true },
    ],
  },
  {
    id: 'mine', name: 'Mina de Oro Abandonada', short: 'La Mina', theme: 'mine',
    desc: 'Galerías malditas donde el oro sangra y las vagonetas corren solas.',
    hpMult: 1.9, dmgMult: 1.4, color: '#c9a227',
    missions: [
      { id: 'mn1', name: 'Vagonetas Fantasma', brief: 'Sobrevive 3 minutos esquivando las vagonetas desbocadas.',
        obj: { type: 'survive', time: 180 }, mods: ['carts', 'dark'], reward: 500, spawn: { outlaw: 4, miner: 4, hound: 2 }, rate: 1.4 },
      { id: 'mn2', name: 'Cristales de Azufre', brief: 'Recoge 15 Cristales de Azufre dispersos por la mina.',
        obj: { type: 'collect', count: 15 }, mods: ['dark'], reward: 560, spawn: { outlaw: 4, miner: 3, hound: 2, sniper: 1 }, rate: 1.4 },
      { id: 'mn3', name: 'El Taladro de Vapor', brief: 'Defiende el Taladro de Vapor durante 2 minutos.',
        obj: { type: 'defend', time: 120, kind: 'drill', hp: 2200 }, mods: ['dark'], reward: 620, spawn: { outlaw: 5, miner: 4, shaman: 1 }, rate: 1.5 },
      { id: 'mn4', name: 'El Capataz de Hierro', brief: 'El capataz no permite huelgas. Derríbalo.',
        obj: { type: 'boss', boss: 'foreman' }, mods: ['dark'], reward: 850, spawn: { miner: 3, outlaw: 3 }, rate: 0.9, boss: true },
    ],
  },
  {
    id: 'canyon', name: 'El Cañón del Diablo', short: 'Cañón del Diablo', theme: 'canyon',
    desc: 'La grieta donde el desierto se abre al infierno. Aquí acaba el camino.',
    hpMult: 2.5, dmgMult: 1.7, color: '#ff5a1a',
    missions: [
      { id: 'cn1', name: 'Tormenta de Polvo', brief: 'Sobrevive 3 minutos bajo la tormenta eléctrica.',
        obj: { type: 'survive', time: 180 }, mods: ['storm'], reward: 650, spawn: { outlaw: 5, hound: 3, shaman: 1, sniper: 1 }, rate: 1.5 },
      { id: 'cn2', name: 'El Puente Colgante', brief: 'Cruza hasta el Puente Colgante y defiéndelo 60 segundos.',
        obj: { type: 'bridge', time: 60 }, reward: 700, spawn: { outlaw: 6, hound: 3, miner: 1, shaman: 1 }, rate: 1.5 },
      { id: 'cn3', name: 'Jinetes del Apocalipsis', brief: 'Caza a los 3 Jinetes del Apocalipsis.',
        obj: { type: 'elites', count: 3, enemy: 'rider', label: 'Jinete' }, reward: 760, spawn: { outlaw: 5, hound: 4, shaman: 1 }, rate: 1.5 },
      { id: 'cn4', name: 'Sin Whiskey', brief: 'Sobrevive 4 minutos. No hay curaciones posibles.',
        obj: { type: 'survive', time: 240 }, mods: ['noHeal'], reward: 820, spawn: { outlaw: 5, hound: 3, miner: 2, shaman: 1, sniper: 1 }, rate: 1.55 },
      { id: 'cn5', name: 'El Altar de Sangre', brief: 'Destruye el Altar de Sangre que alimenta el abismo.',
        obj: { type: 'destroy', count: 1, kind: 'altar', hp: 4200 }, reward: 880, spawn: { outlaw: 5, shaman: 2, miner: 2, hound: 2 }, rate: 1.6 },
      { id: 'cn6', name: 'Oleada Infinita', brief: 'Resiste 5 minutos a una horda que nunca deja de crecer.',
        obj: { type: 'infinite', time: 300 }, mods: ['storm'], reward: 950, spawn: { outlaw: 5, hound: 4, miner: 2, shaman: 2, sniper: 1 }, rate: 1.7 },
      { id: 'cn7', name: 'El Predicador del Abismo', brief: 'El último sermón. Silencia al Predicador del Abismo.',
        obj: { type: 'boss', boss: 'preacher' }, reward: 1500, spawn: { outlaw: 4, hound: 3, shaman: 1 }, rate: 1.0, boss: true },
    ],
  },
];

export const ALL_MISSIONS = [];
SCENARIOS.forEach((s, si) => s.missions.forEach((m, mi) => {
  m.scenario = s; m.si = si; m.mi = mi; m.index = ALL_MISSIONS.length;
  ALL_MISSIONS.push(m);
}));

export const missionById = (id) => ALL_MISSIONS.find((m) => m.id === id);
export const REPLAY_FACTOR = 0.6;
