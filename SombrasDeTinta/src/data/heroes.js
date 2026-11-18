// La Cuadrilla de los 4 Condenados: dossier, personalidad (frases), pasiva, carta de firma, armas y aspectos.
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
    id: 'silas', name: 'Silas "El Tuerto" O\'Connor', short: 'Silas', alias: 'EL TUERTO', temper: 'Mal genio',
    role: 'Escopeta de cono corto · Resistencia · Trampas',
    lore: 'Cazó a cuarenta y dos hombres para la Compañía Ferroviaria. El cuarenta y tres fue su propio socio, que le vació un ojo y lo enterró vivo en Boot Hill. Salió de la tumba con más rabia que aliento. No da las gracias, no pide perdón y no falla a tres pasos.',
    panels: [
      { scene: 'grave', cap: 'Boot Hill, 1879. Le cerraron la tapa del ataúd con un ojo menos y una deuda de más.' },
      { scene: 'eye', cap: 'Tres noches después, la tierra escupió a un hombre de muy mal humor.' },
      { scene: 'hero', cap: 'Ahora caza lo que ni la muerte quiere.', say: '¿Qué miras? ¿Nunca has visto a un muerto cabreado?' },
    ],
    passive: { name: 'Mal Genio', desc: 'Con menos de la mitad de vida hace +35% de daño. +25% de vida máxima, +3 de armadura y empuje brutal. Las trampas no le hieren y hacen el doble de daño a la horda.' },
    stats: { hp: 165, speed: 172, dmg: 1, crit: 0.06, critMult: 2, armor: 3, dodge: 0, closeBonus: 0.15, farCrit: false, trapMaster: true, luck: 0, rage: 0.35, kbMult: 1.4 },
    signature: 'rabia',
    weapons: ['sawn', 'grudge', 'badtemper'],
    skins: [
      { name: 'Cazarrecompensas Traicionado', pal: { coat: '#7a4a22', coatDark: '#4a2a12', hat: '#3e2614', band: '#1e120a', scarf: '#8a1c14', shirt: '#2a201a', pants: '#3a2c22', boots: '#3a2214', skin: '#b07a55', metal: '#c9a54a', patch: '#120a06', eye: '#ffcf6a', glow: '#ffb347', shot: '#ffd27a', core: '#fff4d6' } },
      { name: 'Abrigo del Verdugo', pal: { coat: '#5a1a10', coatDark: '#360c06', hat: '#1e0e08', band: '#8a1c14', scarf: '#2a0a06', shirt: '#1a120e', pants: '#2a1c16', boots: '#1e120a', skin: '#a8724e', metal: '#b8862e', patch: '#0a0604', eye: '#ff7a3a', glow: '#ff6a2a', shot: '#ff9a4a', core: '#fff0c0' } },
      { name: 'Marshal de Hueso', pal: { coat: '#c8a878', coatDark: '#8a6e48', hat: '#e2d0a8', band: '#5a3a1e', scarf: '#6a2a14', shirt: '#3a2a1e', pants: '#5a4430', boots: '#4a3018', skin: '#b88a62', metal: '#d8d8d0', patch: '#2a1a0e', eye: '#ffe08a', glow: '#ffd27a', shot: '#fff0b0', core: '#ffffff' } },
      { name: 'El Tuerto Inmortal', pal: { coat: '#160c08', coatDark: '#0a0604', hat: '#120a06', band: '#ffb02a', scarf: '#ff6a12', shirt: '#0e0806', pants: '#1a120e', boots: '#120a06', skin: '#7a5a48', metal: '#ffc04a', patch: '#ffb02a', eye: '#ffb02a', glow: '#ffb02a', shot: '#ffcf4a', core: '#ffffff', ember: true } },
    ],
  },
  {
    id: 'maeve', name: 'Maeve "La Sota de Picas" Duprat', short: 'Maeve', alias: 'LA SOTA DE PICAS', temper: 'Alocada',
    role: 'Naipes explosivos · Ráfagas rápidas · Suerte',
    lore: 'Desplumó a tahúres de Nueva Orleans a San Francisco. Una noche, un caballero de guantes rojos le ofreció una última mano. Maeve ganó la partida, perdió la sombra y se rió tan fuerte que el diablo se marchó sin despedirse. Desde entonces sus cartas estallan… y ella sigue riéndose.',
    panels: [
      { scene: 'devil', cap: 'Saloon sin nombre, medianoche. La apuesta: su sombra contra el bote del diablo.' },
      { scene: 'cards', cap: 'Ganó. Al amanecer el suelo no quiso devolverle la silueta. A ella le hizo gracia.' },
      { scene: 'hero', cap: 'Ahora reparte cartas que vuelan en pedazos.', say: '¡Hagan juego, señores! ¡La casa explota!' },
    ],
    passive: { name: 'Mano Marcada', desc: 'Mejor suerte en la rareza de las cartas, recarga de cartas de habilidad un 25% más rápida, 12% de esquiva (no tiene sombra que golpear) y encuentra un 60% más de naipes de tinta para el póker.' },
    stats: { hp: 105, speed: 195, dmg: 1, crit: 0.08, critMult: 2, armor: 0, dodge: 0.12, closeBonus: 0, farCrit: false, trapMaster: false, luck: 1, cardCd: 0.75, pokerLuck: 0.6 },
    signature: 'deadhand',
    weapons: ['cards', 'devildeck', 'judgement'],
    skins: [
      { name: 'La Sota de Picas', pal: { coat: '#5a1018', coatDark: '#360810', hat: '#160a0c', band: '#c9a54a', corset: '#120a0c', hair: '#2a140e', skin: '#c08a68', metal: '#c9a54a', lips: '#8a1018', eye: '#2a0a0a', glow: '#ff5a4a', shot: '#ffe8d0', core: '#ffffff', card: '#f2e6cc' } },
      { name: 'Reina de Corazones', pal: { coat: '#9a1a22', coatDark: '#5e0c12', hat: '#2a0a0e', band: '#ffd27a', corset: '#3a0a10', hair: '#5a1a0e', skin: '#c89070', metal: '#e8c25a', lips: '#c41a22', eye: '#3a0a0a', glow: '#ff3a4a', shot: '#ffd0d0', core: '#ffffff', card: '#ffe8e0' } },
      { name: 'Dama de Cobre', pal: { coat: '#7a4218', coatDark: '#4a2408', hat: '#2a1608', band: '#e8a24a', corset: '#3a1e0a', hair: '#8a3a12', skin: '#c08a62', metal: '#e8a24a', lips: '#9a2a14', eye: '#2a1408', glow: '#ffa040', shot: '#ffe0a0', core: '#ffffff', card: '#f8e8c0' } },
      { name: 'La Que Ganó al Diablo', pal: { coat: '#2a0806', coatDark: '#160402', hat: '#0e0302', band: '#ff4a12', corset: '#0a0202', hair: '#0e0606', skin: '#a07058', metal: '#ff6a2a', lips: '#ff2a12', eye: '#ff4a12', glow: '#ff4a12', shot: '#ffb070', core: '#ffffff', card: '#ffd0a0', ember: true } },
    ],
  },
  {
    id: 'caleb', name: 'Caleb Blackwood', short: 'Caleb', alias: 'EL POETA', temper: 'Melancólico',
    role: 'Rifle monotiro de precisión · Críticos a distancia',
    lore: 'Predicó treinta años en Gallow\'s Rest y escribía versos que nadie leía. La noche en que los muertos subieron del cementerio, tocó la campana hasta sangrar. Al alba enterró la Biblia, conservó el cuaderno y desenterró el rifle de su padre. Ahora cada disparo es una estrofa, y cada estrofa, un epitafio.',
    panels: [
      { scene: 'chapel', cap: 'Gallow\'s Rest. La campana sonó toda la noche. Nadie vino.' },
      { scene: 'cross', cap: 'Al alba solo quedaba la cruz, un cuaderno de versos… y un rifle.' },
      { scene: 'hero', cap: 'Escribe epitafios con pólvora.', say: 'La luna también sangra… y nadie le pone vendas.' },
    ],
    passive: { name: 'Elegía', desc: '+14% de crítico y los críticos crecen con la distancia del blanco. Cada disparo de su rifle atraviesa a varios cuerpos.' },
    stats: { hp: 120, speed: 180, dmg: 1, crit: 0.2, critMult: 2.2, armor: 1, dodge: 0, closeBonus: 0, farCrit: true, trapMaster: false, luck: 0 },
    signature: 'verso',
    weapons: ['whitworth', 'requiem', 'leviathan'],
    skins: [
      { name: 'Poeta de Luto', pal: { coat: '#2a1c14', coatDark: '#160e08', hat: '#120a06', band: '#3a2618', collar: '#e8e2d4', shirt: '#1a1210', pants: '#2a2018', boots: '#24160c', skin: '#b08060', metal: '#b8a070', eye: '#ffd27a', glow: '#ffb347', shot: '#ffcf6a', core: '#fff4d6' } },
      { name: 'Hábito de Ceniza', pal: { coat: '#5a4a3a', coatDark: '#3a2e24', hat: '#2a2018', band: '#7a6a5a', collar: '#d8d0c0', shirt: '#2a2018', pants: '#3a2e24', boots: '#2a1e14', skin: '#a8805e', metal: '#a89878', eye: '#ffcf8a', glow: '#ffc070', shot: '#ffe0a0', core: '#ffffff' } },
      { name: 'Cruzado del Plomo', pal: { coat: '#6a2a10', coatDark: '#401806', hat: '#2a1206', band: '#b8b8b0', collar: '#e8e2d4', shirt: '#7a7a80', pants: '#3a2414', boots: '#2a1a0e', skin: '#b08060', metal: '#d0d0c8', eye: '#ffa060', glow: '#ff8a3a', shot: '#ffb070', core: '#fff0d0', plate: true } },
      { name: 'Arcángel de Pólvora', pal: { coat: '#e8d8b0', coatDark: '#b0a07a', hat: '#f2e8cc', band: '#c9a227', collar: '#ffffff', shirt: '#c9a227', pants: '#d8c8a0', boots: '#a8822a', skin: '#c09070', metal: '#ffd24a', eye: '#ffe08a', glow: '#ffd27a', shot: '#fff0b0', core: '#ffffff', halo: true } },
    ],
  },
  {
    id: 'barnaby', name: 'Barnaby "Tripas" McGovern', short: 'Barnaby', alias: 'TRIPAS', temper: 'Humor negro',
    role: 'Revólveres duales · Chistes que aterran a la horda',
    lore: 'Fue carnicero en Deadwood hasta que una vaca se levantó del gancho y le pidió la cuenta. Barnaby se rió, la despiezó por segunda vez y descubrió su vocación. Lleva dos revólveres, un delantal que nunca lava y un repertorio de chistes tan macabros que hasta los muertos retroceden para no oírlos.',
    panels: [
      { scene: 'butcher', cap: 'Carnicería McGovern, Deadwood. "Cortes finos. Clientes fríos."' },
      { scene: 'horde', cap: 'El día que los clientes volvieron por su propio pie, él ya tenía las manos ocupadas.' },
      { scene: 'hero', cap: 'Dos revólveres, un delantal y cero respeto.', say: '¿Sabéis por qué no peleo con zombis desarmados? ¡Porque ya vienen así!' },
    ],
    passive: { name: 'Humor Negro', desc: 'Cada 12 s suelta un chiste macabro que aterroriza a la horda cercana durante 2,5 s. Los enemigos aterrados huyen y reciben +25% de daño.' },
    stats: { hp: 135, speed: 186, dmg: 1, crit: 0.1, critMult: 2, armor: 1, dodge: 0.04, closeBonus: 0.1, farCrit: false, trapMaster: false, luck: 0, fearAura: 1 },
    signature: 'chiste',
    weapons: ['twins', 'butcher', 'wake'],
    skins: [
      { name: 'Carnicero de Deadwood', pal: { coat: '#4a3a2a', coatDark: '#2a2018', apron: '#d8ccb0', blood: '#7a1410', hat: '#1a1410', band: '#5a3a1e', shirt: '#c8b8a0', pants: '#3a3028', boots: '#2a1a10', skin: '#c08a6a', mustache: '#3a2014', metal: '#b8b0a0', eye: '#ffcf8a', glow: '#ffb060', shot: '#ffd890', core: '#fff4d6' } },
      { name: 'Enterrador Risueño', pal: { coat: '#1e1e24', coatDark: '#101014', apron: '#3a3a40', blood: '#5a0a0a', hat: '#0e0e12', band: '#8a1a14', shirt: '#a8a8a0', pants: '#22222a', boots: '#141418', skin: '#b08a72', mustache: '#1a1a1a', metal: '#c8c8d0', eye: '#ffd890', glow: '#ff9a5a', shot: '#ffc890', core: '#ffffff' } },
      { name: 'Matarife de Oro', pal: { coat: '#6a2a14', coatDark: '#40180a', apron: '#e8c870', blood: '#9a2410', hat: '#2a1408', band: '#e8b84a', shirt: '#f2e2b8', pants: '#4a2a14', boots: '#2a160a', skin: '#c89070', mustache: '#6a3014', metal: '#ffd24a', eye: '#ffe08a', glow: '#ffc04a', shot: '#ffe090', core: '#ffffff' } },
      { name: 'El Último Chiste', pal: { coat: '#120806', coatDark: '#080302', apron: '#2a0806', blood: '#ff3a12', hat: '#0a0402', band: '#ff4a12', shirt: '#2a1a14', pants: '#120806', boots: '#0a0402', skin: '#8a6450', mustache: '#ff6a2a', metal: '#ff8a3a', eye: '#ff4a12', glow: '#ff5a1a', shot: '#ff9a50', core: '#ffffff', ember: true } },
    ],
  },
];

// Armas con cargador, recarga y ALCANCE corto/medio (el anillo de tinta del suelo).
// kind: shotgun | cards | rifle | harpoon | revolvers
export const WEAPONS = {
  sawn: { name: 'Recortada "Mal Trago"', kind: 'shotgun', dmg: 11, rate: 1.7, mag: 2, reload: 1.25, speed: 760, range: 235, count: 7, spread: 0.62, pierce: 0, kb: 320, desc: 'Dos cañones recortados. Siete perdigones de mala uva.' },
  grudge: { name: 'Doble Cañón "Rencor"', kind: 'shotgun', dmg: 12, rate: 1.9, mag: 2, reload: 1.05, speed: 800, range: 255, count: 10, spread: 0.7, pierce: 1, kb: 420, desc: 'Diez perdigones que no olvidan. Perforan a un primer cuerpo.' },
  badtemper: { name: 'Escopeta de Palanca "Mala Leche"', kind: 'shotgun', dmg: 11, rate: 2.6, mag: 6, reload: 1.7, speed: 800, range: 265, count: 8, spread: 0.52, pierce: 0, kb: 300, desc: 'Seis cartuchos seguidos sin dar explicaciones.' },
  cards: { name: 'Naipes de Pólvora', kind: 'cards', dmg: 9, rate: 1.7, mag: 9, reload: 1.0, speed: 640, range: 300, count: 1, burst: 3, spread: 0.1, pierce: 0, kb: 60, explode: 46, desc: 'Ráfagas de tres naipes con pólvora en el canto. Estallan al tocar carne.' },
  devildeck: { name: 'Baraja del Diablo', kind: 'cards', dmg: 10, rate: 1.8, mag: 12, reload: 1.0, speed: 600, range: 310, count: 1, burst: 3, spread: 0.18, pierce: 0, kb: 60, explode: 54, homing: 3.5, desc: 'Ráfagas de naipes que buscan carne y estallan.' },
  judgement: { name: 'Baraja del Juicio Final', kind: 'cards', dmg: 12, rate: 1.25, mag: 4, reload: 1.15, speed: 660, range: 320, count: 5, burst: 1, spread: 0.22, pierce: 0, kb: 80, explode: 62, desc: 'Abanicos de cinco naipes explosivos. La banca siempre gana.' },
  whitworth: { name: 'Rifle Whitworth "Elegía"', kind: 'rifle', dmg: 78, rate: 1, mag: 1, reload: 1.05, speed: 1700, range: 400, count: 1, spread: 0, pierce: 3, kb: 230, desc: 'Monotiro pesado de precisión. Un verso, un muerto, tres a lo sumo.' },
  requiem: { name: 'Rifle de Caza "Réquiem"', kind: 'rifle', dmg: 100, rate: 1, mag: 1, reload: 0.95, speed: 1800, range: 420, count: 1, spread: 0, pierce: 5, kb: 260, desc: 'Cañón octogonal y culata grabada con nombres que ya no respiran.' },
  leviathan: { name: 'Arpón-Rifle "Leviatán"', kind: 'harpoon', dmg: 125, rate: 1, mag: 1, reload: 1.3, speed: 1250, range: 430, count: 1, spread: 0, pierce: 99, kb: 300, explode: 80, desc: 'Arpón ballenero que atraviesa la horda y estalla al primer impacto.' },
  twins: { name: 'Revólveres "Tripa y Corazón"', kind: 'revolvers', dmg: 13, rate: 7, mag: 12, reload: 1.6, speed: 900, range: 310, count: 1, spread: 0.07, pierce: 0, kb: 80, desc: 'Dos Colt de seis tiros que se turnan como un buen dúo cómico.' },
  butcher: { name: 'Schofield del Carnicero', kind: 'revolvers', dmg: 17, rate: 6.5, mag: 12, reload: 1.4, speed: 940, range: 320, count: 1, spread: 0.06, pierce: 0, kb: 90, burn: 5, desc: 'Balas de punta hueca que dejan sangrando a la horda.' },
  wake: { name: 'Peacemakers "Velorio"', kind: 'revolvers', dmg: 17, rate: 8, mag: 12, reload: 1.3, speed: 980, range: 330, count: 1, spread: 0.06, pierce: 0, kb: 90, chain: 1, desc: 'Cada bala rebota a un segundo invitado del velorio.' },
};

// Personalidad en combate (bocadillos flotantes).
export const BARKS = {
  silas: {
    start: ['Otra noche, otra pila de idiotas muertos.', 'Acabemos rápido, me duele el ojo.', 'Si alguien va a morir dos veces hoy, que no sea yo.'],
    streak: ['¿Eso es todo? Patético.', 'Ni muertos sabéis perder.', 'Siguiente. Y que sea menos feo.'],
    low: ['Ya estuve en una tumba. No me gustó la decoración.', 'Ahora sí que me habéis cabreado.'],
    card: ['Toma, desgraciado.', 'Aquí tienes tu propina.'],
    boss: ['Grande y feo. Mi tipo de problema.', 'Cuanto más grande, más ruido al caer.'],
    trap: ['Mira dónde pisas, imbécil.'],
    reload: ['Cargando… no me metáis prisa.'],
  },
  maeve: {
    start: ['¡Hagan juego, caballeros!', '¡Esta noche la casa paga en pólvora!', '¿Alguien tiene cambio para el infierno?'],
    streak: ['¡Escalera de color y de cadáveres!', '¡Ja! ¡Otra mano perdida!', '¡Bote! ¡Bote! ¡BOTE!'],
    low: ['Malas cartas… ¡pero aún me queda un farol!', '¡Uy! ¡Eso ha dolido, cariño!'],
    card: ['¡Carta marcada!', '¡Ases y ochos, querido!'],
    boss: ['¡Subo la apuesta y te la meto en la boca!', '¡Tú hueles a mi antiguo socio!'],
    trap: ['¡Mal paso, cielo!'],
    reload: ['¡Barajando! ¡Un segundito!'],
  },
  caleb: {
    start: ['Cae la noche como un sudario sobre el valle.', 'Que la pólvora rece por los que ya no pueden.', 'Escribo con plomo lo que la tierra olvidará.'],
    streak: ['Otro nombre para la lápida sin nombre.', 'Duerme, polvo; tu verso ha terminado.', 'La muerte también se cansa de esperar.'],
    low: ['Mi sangre es tinta… y se me acaba el papel.', 'Aún no, Señor; me falta la última estrofa.'],
    card: ['Que este verso te sirva de epitafio.', 'Escucha, carne triste, tu último poema.'],
    boss: ['Hasta los gigantes caben en una fosa.', 'Tu sombra es larga; tu final, breve.'],
    trap: ['Hasta el hierro reza cuando muerde.'],
    reload: ['Una pausa entre estrofas…'],
  },
  barnaby: {
    start: ['¡Clientes nuevos! ¿Lo de siempre? ¿Un brazo y medio?', 'Tranquilos, chicos, hoy hay descuento en costillas.', 'He traído el delantal bueno. El de manchar.'],
    streak: ['¿Por qué ese zombi cruzó la calle? ¡Porque se le cayó la pierna al otro lado!', '¡Echadle una mano! Ah, no, que ya se le ha caído.', 'Este se ha quedado sin cabeza… ¡y aun así ha dicho más tonterías que mi cuñado!'],
    low: ['Tranquilo, Barnaby, son solo tripas… ¡las tuyas!', 'Me están desmontando más rápido que a un pollo en Navidad.'],
    card: ['¿Sabéis cuál es el colmo de un zombi? ¡Perder la cabeza por mí!', '¡Os voy a dejar hechos filetes!'],
    boss: ['¡Madre mía, con ese tendré salchichas para un año!', '¡Grandullón! ¿Te corto en rodajas o en tacos?'],
    trap: ['¡Ese pie ya no vuelve a bailar!'],
    reload: ['¡Recargando! Id haciendo cola, por número.'],
    jokes: [
      '¿Qué le dijo un zombi a otro? «¡Échame una mano!» Y se la arrancó.',
      'Mi abuelo murió en paz, dormido. No como vosotros: ¡a pedazos y gritando!',
      'Doctor, me duele aquí. —Pues no se toque ahí… ¡que se le cae!',
      '¿Cómo se llama un zombi sin brazos ni piernas? ¡Como quieras, no va a venir!',
      'Hoy tengo oferta: dos por uno en cabezas. ¡Las vuestras!',
      'Sé que tenéis hambre, pero ¿no preferís un buen chuletón… de vuestro vecino?',
    ],
  },
  zombie: ['Grrrhh…', 'Caaarne…', 'Hhhaaa…', '…sed…', 'Grrk.', 'Mmmhhh…'],
  scared: ['¡¿…?!', '¡Hhhiii!', '…no…', '¡¡GRK!!'],
};
