/* Escenarios: niebla, luz de luna y fondo por nivel (el constructor está en LEVEL_BUILDERS) */
export const LEVELS = {
  // Supervivencia · noche: niebla más ligera que antes (el mapa es más grande y se lee mejor) y luna algo más intensa
  village: { name: 'El pueblo', fog: 0x0e161b, density: 0.034, moon: 0.72, moonColor: 0xa6bbdc, exposure: 1.12 },
  // Supervivencia · día: sol, cielo y océano (day: true activa cielo, agua y fauna); far amplía la distancia de dibujo
  island: { name: 'La isla', day: true, fog: 0x9ec0de, density: 0.0034, moon: 3.1, moonColor: 0xfff0dc, exposure: 1.0, lightDir: [-0.55, -1, -0.35], far: 420 },
  lab: { name: 'Laboratorio', fog: 0x0a0b0d, density: 0.06, moon: 0.1, moonColor: 0x8fa0b8, exposure: 1.15 },
  city: { name: 'Ciudad muerta', fog: 0x0e1013, density: 0.045, moon: 0.42, moonColor: 0x9aa8c0, exposure: 1.08 },
  silos: { name: 'Complejo industrial', fog: 0x100e0c, density: 0.05, moon: 0.35, moonColor: 0xb0a090, exposure: 1.08 },
  catacombs: { name: 'Subsuelo antiguo', fog: 0x070605, density: 0.075, moon: 0.05, moonColor: 0x8a7a68, exposure: 1.25 },
  core: { name: 'El Núcleo', fog: 0x0d0505, density: 0.04, moon: 0.2, moonColor: 0xb06060, exposure: 1.1 },
};

/* MODO HISTORIA — pasos declarativos por capítulo.
   reach: llegar a un punto · use: activar interactivos (con contador) · boss: abatir al jefe · alpha: combate final por fases
   start / done: acciones al empezar o al completar (alerta, puerta, energía, horda…) · dir: ajustes del director de oleadas */
export const CHAPTERS = [
  { id: 'lab', level: 'lab', title: 'Instalación Abandonada', place: 'Laboratorio', boss: 'El Sujeto 0',
    intro: 'Despiertas entre cristales rotos. Las luces de emergencia laten en rojo y algo enorme golpea el interior del tanque de contención del Sujeto 0. Restablece la energía y encuentra la salida antes de que se libere.',
    outro: 'El ascensor se cierra a tu espalda. El Sujeto 0 era solo el primer experimento: la infección ya ha llegado a la ciudad.',
    director: { target: 3, every: [8, 13], groups: ['south', 'mid'], initial: 3, weights: { villager: 2, woman: 2, police: 1, runner: 1 } },
    steps: [
      { text: 'Investiga el laboratorio', reach: 'hall', r: 4.5 },
      { text: 'Activa el generador de emergencia', use: ['gen'], dir: { groups: ['mid', 'west'], target: 4 }, done: { alert: ['Energía restablecida', 'La compuerta de seguridad se abre', 'info'], door: 'sec', power: true } },
      { text: 'Recupera la tarjeta de acceso', use: ['card'], dir: { groups: ['mid', 'north'], target: 5 } },
      { text: 'Abate al Sujeto 0', boss: { type: 'subject', at: 'bossSpawn' }, start: { alert: ['El Sujeto 0', 'Su placa de hueso aguanta de frente: esquiva la embestida y dispárale por la espalda', 'danger'], sfx: 'glass' }, dir: { target: 2, every: [10, 16] } },
      { text: 'Usa la tarjeta en el ascensor', use: ['lift'], start: { alert: ['Amenaza neutralizada', 'El ascensor de servicio ya responde', 'success'] }, dir: { target: 3 } },
    ] },
  { id: 'city', level: 'city', title: 'Las Calles en Penumbra', place: 'Ciudad muerta', boss: 'El Acometedor de Sombras',
    intro: 'La ciudad que conocías es un cementerio de coches. Algo alto y delgado se mueve entre los callejones sin hacer ruido: solo se le ven los ojos. Consigue munición en la comisaría y llega al metro.',
    outro: 'Bajas al metro entre chispas y sirenas mudas. Las vías llevan al complejo industrial donde fabricaron el contagio.',
    director: { target: 4, every: [6, 11], groups: ['south'], initial: 4, weights: { villager: 2, woman: 2, police: 2, runner: 2, bloater: 0.5 } },
    steps: [
      { text: 'Avanza por la calle principal', reach: 'crossing', r: 5, dir: { groups: ['south', 'mid'] } },
      { text: 'Busca munición en la comisaría', use: ['station'], dir: { groups: ['mid'], target: 5 }, done: { alert: ['Escopeta conseguida', 'Munición y una escopeta de la armería', 'success'], give: 'shotgun' } },
      { text: 'Caza al Acometedor de Sombras', boss: { type: 'stalker', at: 'bossSpawn' }, start: { alert: ['El Acometedor de Sombras', 'Casi invisible en la oscuridad: ilumínalo con la linterna y castígalo tras su salto', 'danger'] }, dir: { groups: ['mid', 'north'], target: 2, every: [10, 15] } },
      { text: 'Despeja la barricada', use: ['barricade'], start: { alert: ['Barricada', 'Mantén la acción para apartar los bloques: la horda viene', 'info'] }, dir: { groups: ['north', 'mid'], target: 7, every: [3, 6], fury: true }, done: { door: 'barricade', alert: ['Paso libre', 'Corre hacia la boca de metro', 'success'] } },
      { text: 'Entra en el metro', reach: 'metro', r: 3 },
    ] },
  { id: 'silos', level: 'silos', title: 'Zona de Silos', place: 'Complejo industrial', boss: 'El Behemoth Industrial',
    intro: 'El rastro del contagio lleva a los silos de la planta química. Restablece la energía y abre la compuerta. Lo que encadenaron ahí dentro lleva placas de acero atornilladas a la carne.',
    outro: 'Desde el muelle se ve la entrada a las catacumbas. Huelen a tierra húmeda… y algo pare en la oscuridad.',
    director: { target: 4, every: [6, 10], groups: ['south'], initial: 4, weights: { villager: 1, police: 2, runner: 2, bloater: 1 } },
    steps: [
      { text: 'Restablece la energía', use: ['panelA', 'panelB'], dir: { groups: ['south', 'mid'], target: 5 }, done: { alert: ['Energía al 100 %', 'La compuerta del silo central ya tiene corriente', 'info'], power: true } },
      { text: 'Abre la compuerta del silo', use: ['hatch'], done: { door: 'hatch' } },
      { text: 'Derriba al Behemoth Industrial', boss: { type: 'behemoth', at: 'bossSpawn' }, start: { alert: ['El Behemoth Industrial', 'Revienta sus placas a balazos. Aléjate cuando alce los brazos o haga girar las cadenas', 'danger'] }, dir: { groups: ['mid', 'north'], target: 3, every: [9, 14] } },
      { text: 'Escapa por el muelle', reach: 'dock', r: 3.5, start: { door: 'gate', alert: ['La verja del muelle cede', 'Sal antes de que llegue la horda', 'success'] }, dir: { groups: ['north', 'mid'], target: 6, every: [4, 7], fury: true } },
    ] },
  { id: 'catacombs', level: 'catacombs', title: 'Las Catacumbas', place: 'Subsuelo antiguo', boss: 'La Reina de la Cripta',
    intro: 'Bajo la ciudad, túneles de piedra y huesos cubiertos de huevos. La Reina de la Cripta anida aquí con su enjambre. Enciende los braseros: la luz es lo único que la saca de su agujero.',
    outro: 'Tras la última puerta late una luz roja. El Núcleo está debajo de tus pies.',
    director: { target: 3, every: [8, 13], groups: ['south'], initial: 3, weights: { villager: 2, woman: 2, runner: 2 } },
    steps: [
      { text: 'Enciende los braseros', use: ['b1', 'b2', 'b3'], dir: { groups: ['south', 'mid'], target: 4 } },
      { text: 'Mata a la Reina de la Cripta', boss: { type: 'queen', at: 'bossSpawn' }, start: { alert: ['La Reina de la Cripta', 'Pare enjambres: mátalos a cuchillo o a tiros y esquiva su ácido. La cabeza es su punto débil', 'danger'] }, dir: { groups: ['mid', 'north'], target: 2, every: [12, 18] } },
      { text: 'Encuentra la salida', reach: 'exit', r: 3, start: { door: 'exit', alert: ['Se abre un pasadizo', 'Al fondo de la cripta, hacia el norte', 'success'] }, dir: { groups: ['north'], target: 4 } },
    ] },
  { id: 'core', level: 'core', title: 'El Núcleo', place: 'Corazón de la infección', boss: 'El Parásito Alpha',
    intro: 'El corazón de la infección late bajo una cúpula de hormigón: el Parásito Alpha, un núcleo biomecánico colosal. Activa los nodos para romper su escudo, revienta sus vainas y destruye el núcleo.',
    outro: 'El Parásito Alpha se desploma y el núcleo se apaga con un último latido. Por primera vez en semanas, amanece.',
    director: { target: 3, every: [7, 12], groups: ['ring'], initial: 2, weights: { villager: 1, woman: 1, police: 1, runner: 2, bloater: 0.6 } },
    steps: [
      { text: 'Entra en el Núcleo', reach: 'arena', r: 5 },
      { text: 'Destruye al Parásito Alpha', alpha: { type: 'alpha', at: 'bossSpawn', nodes: ['n1', 'n2', 'n3'], window: 14 }, start: { alert: ['El Parásito Alpha', 'Fase 1: es invulnerable. Activa los tres nodos para bajar su escudo y dispara al núcleo del pecho', 'danger'] }, dir: { groups: ['ring'], target: 6, every: [3, 6], fury: true } },
    ] },
];

/* El Modo Supervivencia (mapas y 15 niveles) está en data/survival.js */
