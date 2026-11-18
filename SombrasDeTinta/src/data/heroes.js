// Los tres forajidos: dossier de origen, pasiva única, carta de firma, armas y aspectos por hitos de nivel.
// Hitos cada 10 niveles alternando: 10 aspecto · 20 arma · 30 aspecto · 40 arma · 50 aspecto legendario.

export const MAX_LEVEL = 50;
export const MILESTONES = [
  { level: 10, kind: 'skin', idx: 1 },
  { level: 20, kind: 'weapon', idx: 1 },
  { level: 30, kind: 'skin', idx: 2 },
  { level: 40, kind: 'weapon', idx: 2 },
  { level: 50, kind: 'skin', idx: 3 },
];

export const HEROES = [
  {
    id: 'silas', name: 'Silas "El Tuerto" O\'Connor', short: 'Silas', alias: 'EL TUERTO',
    role: 'Crítico a larga distancia · Resistencia',
    lore: 'Cazó a cuarenta y dos hombres para la Compañía Ferroviaria. El cuarenta y tres fue su propio socio, que le vació un ojo y lo enterró vivo en Boot Hill. Silas salió de la tumba tres días después. Algo le devolvió el aliento… y ese algo todavía espera cobrarse la deuda.',
    panels: [
      { scene: 'grave', cap: 'Boot Hill, 1879. Le cerraron la tapa del ataúd con un ojo menos y una bala de sobra.' },
      { scene: 'eye', cap: 'Tres noches después, la tierra se abrió.' },
      { scene: 'hero', cap: 'Ahora caza lo que ni la muerte quiere.', say: 'Me deben un ojo. Y pienso cobrarlo con intereses.' },
    ],
    passive: { name: 'Ojo de la Muerte', desc: '+12% de crítico y los críticos hacen más daño cuanto más lejos está el blanco. +20% de vida máxima.' },
    stats: { hp: 130, speed: 175, dmg: 1, crit: 0.17, critMult: 2.2, armor: 1, dodge: 0, closeBonus: 0, farCrit: true, trapMaster: false, luck: 0 },
    signature: 'tuerto',
    weapons: ['sharps', 'cyclops', 'leviathan'],
    skins: [
      { name: 'Cazarrecompensas Traicionado', pal: { coat: '#7a4a22', coatDark: '#4a2a12', hat: '#3e2614', band: '#1e120a', scarf: '#8a1c14', shirt: '#2a201a', pants: '#3a2c22', boots: '#3a2214', skin: '#b07a55', metal: '#c9a54a', patch: '#120a06', eye: '#ffcf6a', glow: '#ffb347', shot: '#ffd27a', core: '#fff4d6' } },
      { name: 'Abrigo del Verdugo', pal: { coat: '#5a1a10', coatDark: '#360c06', hat: '#1e0e08', band: '#8a1c14', scarf: '#2a0a06', shirt: '#1a120e', pants: '#2a1c16', boots: '#1e120a', skin: '#a8724e', metal: '#b8862e', patch: '#0a0604', eye: '#ff7a3a', glow: '#ff6a2a', shot: '#ff9a4a', core: '#fff0c0' } },
      { name: 'Marshal de Hueso', pal: { coat: '#c8a878', coatDark: '#8a6e48', hat: '#e2d0a8', band: '#5a3a1e', scarf: '#6a2a14', shirt: '#3a2a1e', pants: '#5a4430', boots: '#4a3018', skin: '#b88a62', metal: '#d8d8d0', patch: '#2a1a0e', eye: '#ffe08a', glow: '#ffd27a', shot: '#fff0b0', core: '#ffffff' } },
      { name: 'El Tuerto Inmortal', pal: { coat: '#160c08', coatDark: '#0a0604', hat: '#120a06', band: '#ffb02a', scarf: '#ff6a12', shirt: '#0e0806', pants: '#1a120e', boots: '#120a06', skin: '#7a5a48', metal: '#ffc04a', patch: '#ffb02a', eye: '#ffb02a', glow: '#ffb02a', shot: '#ffcf4a', core: '#ffffff', ember: true } },
    ],
  },
  {
    id: 'maeve', name: 'Maeve "La Sota de Picas" Duprat', short: 'Maeve', alias: 'LA SOTA DE PICAS',
    role: 'Magia de control · Barajas arcanas · Suerte',
    lore: 'Desplumó a tahúres de Nueva Orleans a San Francisco. Una noche, en un saloon sin nombre, un caballero de guantes rojos le ofreció una última mano. Maeve ganó la partida y perdió la sombra. Desde entonces, las cartas le obedecen… y los muertos la buscan por el olor a azufre.',
    panels: [
      { scene: 'devil', cap: 'Saloon sin nombre, medianoche. La apuesta: su sombra contra el bote del diablo.' },
      { scene: 'cards', cap: 'Ganó. Pero al amanecer, el suelo no quiso devolverle la silueta.' },
      { scene: 'hero', cap: 'Ahora reparte cartas que cortan como cuchillas.', say: 'La casa siempre gana, cariño. Y la casa soy yo.' },
    ],
    passive: { name: 'Mano Marcada', desc: 'Mejor probabilidad de cartas de rareza alta, las cartas de habilidad se recargan un 25% más rápido y un 12% de esquivar (no tiene sombra que golpear).' },
    stats: { hp: 100, speed: 195, dmg: 1, crit: 0.06, critMult: 2, armor: 0, dodge: 0.12, closeBonus: 0, farCrit: false, trapMaster: false, luck: 1, cardCd: 0.75 },
    signature: 'deadhand',
    weapons: ['cards', 'devildeck', 'pepperbox'],
    skins: [
      { name: 'La Sota de Picas', pal: { coat: '#5a1018', coatDark: '#360810', hat: '#160a0c', band: '#c9a54a', corset: '#120a0c', hair: '#2a140e', skin: '#c08a68', metal: '#c9a54a', lips: '#8a1018', eye: '#2a0a0a', glow: '#ff5a4a', shot: '#ffe8d0', core: '#ffffff', card: '#f2e6cc' } },
      { name: 'Reina de Corazones', pal: { coat: '#9a1a22', coatDark: '#5e0c12', hat: '#2a0a0e', band: '#ffd27a', corset: '#3a0a10', hair: '#5a1a0e', skin: '#c89070', metal: '#e8c25a', lips: '#c41a22', eye: '#3a0a0a', glow: '#ff3a4a', shot: '#ffd0d0', core: '#ffffff', card: '#ffe8e0' } },
      { name: 'Dama de Cobre', pal: { coat: '#7a4218', coatDark: '#4a2408', hat: '#2a1608', band: '#e8a24a', corset: '#3a1e0a', hair: '#8a3a12', skin: '#c08a62', metal: '#e8a24a', lips: '#9a2a14', eye: '#2a1408', glow: '#ffa040', shot: '#ffe0a0', core: '#ffffff', card: '#f8e8c0' } },
      { name: 'La Que Ganó al Diablo', pal: { coat: '#2a0806', coatDark: '#160402', hat: '#0e0302', band: '#ff4a12', corset: '#0a0202', hair: '#0e0606', skin: '#a07058', metal: '#ff6a2a', lips: '#ff2a12', eye: '#ff4a12', glow: '#ff4a12', shot: '#ffb070', core: '#ffffff', card: '#ffd0a0', ember: true } },
    ],
  },
  {
    id: 'caleb', name: 'Caleb Blackwood', short: 'Caleb', alias: 'EL PURGADOR',
    role: 'Tanque · Corta distancia · Trampas letales',
    lore: 'Predicó treinta años en la parroquia de Gallow\'s Rest. La noche en que los muertos subieron del cementerio, tocó la campana hasta sangrar mientras su rebaño ardía. Enterró la Biblia junto a su fe y desenterró la escopeta de su padre. Ahora reparte la extremaunción en calibre doce.',
    panels: [
      { scene: 'chapel', cap: 'Gallow\'s Rest. La campana sonó toda la noche. Nadie vino.' },
      { scene: 'cross', cap: 'Al alba, de la parroquia solo quedaba la cruz… y un hombre con una escopeta.' },
      { scene: 'hero', cap: 'Dios dejó de escuchar. Caleb no.', say: 'Polvo eres. Y yo te devolveré al polvo.' },
    ],
    passive: { name: 'Extremaunción', desc: '+35% de daño a corta distancia, +4 de armadura y vida extra. Las trampas y barriles hacen el doble de daño a la horda y no le hieren.' },
    stats: { hp: 175, speed: 168, dmg: 1, crit: 0.05, critMult: 2, armor: 4, dodge: 0, closeBonus: 0.35, farCrit: false, trapMaster: true, luck: 0 },
    signature: 'beartrap',
    weapons: ['penance', 'psalm', 'purifier'],
    skins: [
      { name: 'Predicador Purgador', pal: { coat: '#2a1c14', coatDark: '#160e08', hat: '#120a06', band: '#3a2618', collar: '#e8e2d4', shirt: '#1a1210', pants: '#2a2018', boots: '#24160c', skin: '#b08060', metal: '#b8a070', eye: '#ffd27a', glow: '#ffb347', shot: '#ffcf6a', core: '#fff4d6' } },
      { name: 'Hábito de Ceniza', pal: { coat: '#5a4a3a', coatDark: '#3a2e24', hat: '#2a2018', band: '#7a6a5a', collar: '#d8d0c0', shirt: '#2a2018', pants: '#3a2e24', boots: '#2a1e14', skin: '#a8805e', metal: '#a89878', eye: '#ffcf8a', glow: '#ffc070', shot: '#ffe0a0', core: '#ffffff' } },
      { name: 'Cruzado del Plomo', pal: { coat: '#6a2a10', coatDark: '#401806', hat: '#2a1206', band: '#b8b8b0', collar: '#e8e2d4', shirt: '#7a7a80', pants: '#3a2414', boots: '#2a1a0e', skin: '#b08060', metal: '#d0d0c8', eye: '#ffa060', glow: '#ff8a3a', shot: '#ffb070', core: '#fff0d0', plate: true } },
      { name: 'Arcángel de Pólvora', pal: { coat: '#e8d8b0', coatDark: '#b0a07a', hat: '#f2e8cc', band: '#c9a227', collar: '#ffffff', shirt: '#c9a227', pants: '#d8c8a0', boots: '#a8822a', skin: '#c09070', metal: '#ffd24a', eye: '#ffe08a', glow: '#ffd27a', shot: '#fff0b0', core: '#ffffff', halo: true } },
    ],
  },
];

// Armas (base + exclusivas por hito). kind determina la lógica de disparo.
export const WEAPONS = {
  sharps: { name: 'Rifle Sharps "Viuda de Boot Hill"', kind: 'rifle', dmg: 34, rate: 1.7, speed: 1350, range: 760, count: 1, spread: 0, pierce: 2, kb: 140, desc: 'Un disparo, un muerto. Perfora dos cuerpos.' },
  cyclops: { name: 'Carabina "Ojo de Cíclope"', kind: 'rifle', dmg: 24, rate: 3.4, speed: 1400, range: 720, count: 1, spread: 0.02, pierce: 3, kb: 110, desc: 'Palanca rápida y mira de latón tallada en un ojo de vidrio.' },
  leviathan: { name: 'Arpón-Rifle "Leviatán"', kind: 'harpoon', dmg: 80, rate: 1.05, speed: 1100, range: 820, count: 1, spread: 0, pierce: 99, kb: 260, radius: 72, desc: 'Arpón ballenero que atraviesa la horda y estalla al primer impacto.' },
  cards: { name: 'Naipes Afilados', kind: 'cards', dmg: 15, rate: 4, speed: 640, range: 480, count: 1, spread: 0.08, pierce: 0, kb: 50, chain: 1, desc: 'Cartas de canto de acero que rebotan a un segundo blanco.' },
  devildeck: { name: 'Baraja del Diablo', kind: 'cards', dmg: 14, rate: 3.4, speed: 600, range: 500, count: 3, spread: 0.25, pierce: 0, kb: 40, chain: 1, homing: 3, desc: 'Tres naipes que buscan carne por sí solos.' },
  pepperbox: { name: 'Pimienta "Ruleta Rusa"', kind: 'pepper', dmg: 19, rate: 1.6, speed: 900, range: 520, count: 6, spread: 0.55, pierce: 0, kb: 90, critBonus: 0.3, desc: 'Seis cañones giratorios. Nunca sabes cuál escupe el diablo.' },
  penance: { name: 'Escopeta "Penitencia"', kind: 'shotgun', dmg: 10, rate: 1.4, speed: 760, range: 320, count: 7, spread: 0.55, pierce: 0, kb: 300, desc: 'La escopeta de su padre. Siete perdigones de penitencia.' },
  psalm: { name: 'Doble Cañón "Salmo 23"', kind: 'shotgun', dmg: 11, rate: 1.25, speed: 800, range: 340, count: 12, spread: 0.6, pierce: 1, kb: 380, desc: '"Aunque ande en valle de sombra de muerte…" Doce perdigones.' },
  purifier: { name: 'Lanzallamas "Fuego Purificador"', kind: 'flame', dmg: 5, rate: 16, speed: 430, range: 240, count: 1, spread: 0.32, pierce: 99, kb: 30, burn: 9, desc: 'Un tanque de queroseno bendecido. Purifica todo lo que toca.' },
};

// Frases en combate (bocadillos flotantes).
export const BARKS = {
  silas: {
    start: ['Hora de cobrar.', 'Un ojo me basta.', 'Que se pongan en fila.'],
    streak: ['Siguiente.', 'Cuarenta y cuatro…', '¿Eso es todo?'],
    low: ['Ya estuve muerto una vez…', 'No vuelvo a esa tumba.'],
    card: ['Mira esto.', 'Bala con tu nombre.'],
    boss: ['Tú vales una buena recompensa.', 'Grande. Más fácil de acertar.'],
    trap: ['Cuidado dónde pisas.'],
  },
  maeve: {
    start: ['Barajemos.', 'La banca abre.', 'Apuesten, caballeros.'],
    streak: ['Escalera de color.', 'Full de muertos.', 'Otra mano perdida.'],
    low: ['Malas cartas…', 'Aún me queda un as.'],
    card: ['Mi carta.', 'Ases y ochos.'],
    boss: ['Tú hueles a mi antiguo socio.', 'Subo la apuesta.'],
    trap: ['Mal paso, cariño.'],
  },
  caleb: {
    start: ['Oremos.', 'Polvo al polvo.', 'Que Dios me perdone. Yo no a vosotros.'],
    streak: ['Amén.', 'Descansad.', 'Otra alma devuelta.'],
    low: ['Señor, aún no…', 'Mi cruz pesa…'],
    card: ['¡Arrepentíos!', 'Fuego y azufre.'],
    boss: ['Abominación.', 'Tu sermón termina aquí.'],
    trap: ['Bendito cepo.'],
  },
  zombie: ['Grrrhh…', 'Caaarne…', 'Hhhaaa…', '…sed…', 'Grrk.', 'Mmmhhh…'],
};
