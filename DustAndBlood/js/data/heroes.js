// Vanguardia de héroes: estadísticas, habilidades y Guardarropa Maldito (3 aspectos por héroe).
// Las paletas alimentan a la Carta Viva, al sprite en partida y a los disparos.

export const HEROES = [
  {
    id: 'hunter', name: 'El Exterminador', title: 'BOUNTY HUNTER', rank: 'K', suit: '♠',
    role: 'Tanque · Daño cercano · Empuje',
    desc: 'Cazarrecompensas de abrigo polvoriento. Aguanta el castigo y barre hordas a quemarropa.',
    stats: { hp: 170, speed: 182, damage: 1.15, crit: 0.05, critMult: 2, knockback: 1.8, armor: 3, pickup: 1, explosive: 1, elemental: false },
    bars: { vida: 5, velocidad: 2, daño: 4, control: 3 },
    ability: { id: 'blast', name: 'Estallido de Plomo', cd: 8, desc: 'Onda de perdigones en 360° que daña y repele a la horda.' },
    ultimate: { id: 'judgement', name: 'Juicio del Exterminador', desc: 'Cinco descargas circulares de escopeta con empuje brutal.' },
    skins: [
      { name: 'Cazarrecompensas', price: 0, pal: {
        primary: '#c27a35', coat: '#8b5a2b', coatDark: '#5b3519', scarf: '#9a1f1a', hat: '#5e3a1e', band: '#3a2412',
        metal: '#c9a54a', shirt: '#2a2220', pants: '#3d3029', boots: '#4a2c17', skin: '#b07a55', eye: '#ffb347',
        eyeGlow: false, glow: '#ffae42', glow2: '#ff7a1a', shot: '#ffcf6a', shotCore: '#fff4d6', smoke: '#c9a27a', aura: 'amber' } },
      { name: 'Sheriff Espectral', price: 800, pal: {
        primary: '#4f7fd9', coat: '#1d2c4f', coatDark: '#0f1830', scarf: '#2f4f8f', hat: '#1a2440', band: '#0c1226',
        metal: '#dfe6ef', shirt: '#121a2e', pants: '#1b2236', boots: '#151b2b', skin: '#9fb4c8', eye: '#9fe8ff',
        eyeGlow: true, glow: '#7fd8ff', glow2: '#c8f4ff', shot: '#9fe8ff', shotCore: '#ffffff', smoke: '#8fc8ff', ghost: true, aura: 'ghost' } },
      { name: 'Verdugo de Ceniza', price: 2000, pal: {
        primary: '#ff4a1a', coat: '#1b1716', coatDark: '#0d0a0a', scarf: '#2b1d1a', hat: '#141010', band: '#ff5a1a',
        metal: '#6b5f58', shirt: '#100c0b', pants: '#1a1514', boots: '#120e0d', skin: '#5a4a44', eye: '#ff2a1a',
        eyeGlow: true, glow: '#ff5a1a', glow2: '#ffb02a', shot: '#ff6a1a', shotCore: '#ffe08a', smoke: '#4a3a34', ember: true, aura: 'magma' } },
    ],
  },
  {
    id: 'arcane', name: 'El Chamán Pirotécnico', title: 'ARCANE GUNSLINGER', rank: 'Q', suit: '♦',
    role: 'Control de masas · Daño elemental',
    desc: 'Pistolero místico de poncho de cráneos. Sus balas queman y ralentizan a los malditos.',
    stats: { hp: 125, speed: 200, damage: 1.0, crit: 0.06, critMult: 2, knockback: 1, armor: 1, pickup: 1.15, explosive: 1, elemental: true },
    bars: { vida: 3, velocidad: 3, daño: 3, control: 5 },
    ability: { id: 'ring', name: 'Anillo Bicolor', cd: 7, desc: 'Un anillo de fuego violeta y naranja se expande quemando y frenando.' },
    ultimate: { id: 'firestorm', name: 'Lluvia de Fuego Fatuo', desc: 'Treinta bolas de fuego caen sobre los enemigos visibles.' },
    skins: [
      { name: 'Místico de Cráneos', price: 0, pal: {
        primary: '#b04dff', poncho: '#a3301f', ponchoDark: '#5e1810', pattern: '#e8d3a6', hat: '#4d2c18', band: '#2e1a0e',
        mask: '#7a1a14', skull: '#e5d2a8', pants: '#33241c', boots: '#3f2616', glove: '#3a2418', eye: '#d58bff',
        fireL: '#b04dff', fireL2: '#e7a6ff', fireR: '#ff8a1a', fireR2: '#ffd36a', glow: '#c06bff', glow2: '#ff9a3a',
        shot: '#c77dff', shotCore: '#ffe3ff', shotAlt: '#ff9a3a', smoke: '#7a4a8a', aura: 'violet' } },
      { name: 'Profeta de la Luna Roja', price: 800, pal: {
        primary: '#ff2340', poncho: '#6e0b14', ponchoDark: '#3a050a', pattern: '#ff8a7a', hat: '#2a0a0c', band: '#9a1020',
        mask: '#2a0507', skull: '#f0c8b8', pants: '#24100f', boots: '#2b120e', glove: '#2a0c0c', eye: '#ff4a5a',
        fireL: '#ff2340', fireL2: '#ff9aa6', fireR: '#ff2340', fireR2: '#ffb0a0', glow: '#ff2a3a', glow2: '#ff6a5a',
        shot: '#ff3a4a', shotCore: '#ffe0e0', shotAlt: '#ff6a3a', smoke: '#6a1a1a', aura: 'blood' } },
      { name: 'Señor del Vacío', price: 2000, pal: {
        primary: '#3fa9ff', poncho: '#ddd2b6', ponchoDark: '#a89c7c', pattern: '#c9a227', hat: '#2a2420', band: '#c9a227',
        mask: '#c9a227', skull: '#f4ecd8', pants: '#3a332c', boots: '#2c2620', glove: '#c9a227', eye: '#7fd0ff',
        fireL: '#3fa9ff', fireL2: '#c4ecff', fireR: '#3fa9ff', fireR2: '#ffffff', glow: '#4ab4ff', glow2: '#a6e4ff',
        shot: '#5ab8ff', shotCore: '#ffffff', shotAlt: '#a0e0ff', smoke: '#6a8aaa', aura: 'void' } },
    ],
  },
  {
    id: 'engineer', name: 'El Ingeniero', title: 'WEIRD WEST ENGINEER', rank: 'J', suit: '♣',
    role: 'Torretas · Explosivos',
    desc: 'Mecánico de mina con gafas de latón. Despliega torretas y vuela la horda por los aires.',
    stats: { hp: 135, speed: 190, damage: 1.0, crit: 0.05, critMult: 2, knockback: 1.2, armor: 2, pickup: 1.1, explosive: 1.3, elemental: false },
    bars: { vida: 3, velocidad: 3, daño: 4, control: 4 },
    ability: { id: 'turret', name: 'Torreta de Pólvora', cd: 10, desc: 'Despliega una torreta automática durante 14 segundos.' },
    ultimate: { id: 'bombard', name: 'Bombardeo de Dinamita', desc: 'Una alfombra de 32 cartuchos de dinamita arrasa la zona.' },
    skins: [
      { name: 'Mecánico de Mina', price: 0, pal: {
        primary: '#ff8a1a', vest: '#4b2e1b', shirt: '#d6c29b', scarf: '#b3241b', hat: '#5a3a22', band: '#3a2414',
        goggles: '#c9a227', lens: '#ff8a3a', dynamite: '#c4281c', pants: '#2e2622', boots: '#4a2c17', skin: '#b98760',
        glove: '#5a3a24', gear: '#c99a3a', boom: '#ff8a1a', boom2: '#ffd23a', glow: '#ff9a2a', glow2: '#ffd23a',
        shot: '#ffc04a', shotCore: '#fff2c0', smoke: '#8a7a6a', aura: 'amber' } },
      { name: 'Alquimista de Azufre', price: 800, pal: {
        primary: '#9dff3a', vest: '#2d3f20', shirt: '#a9a58a', scarf: '#4a6a1a', hat: '#2f2a1a', band: '#6a8a2a',
        goggles: '#8a9a3a', lens: '#9dff3a', dynamite: '#4f9a1f', pants: '#26281c', boots: '#2e2a18', skin: '#a8946a',
        glove: '#3a4a22', gear: '#7f8f4a', boom: '#9dff3a', boom2: '#e6ff7a', glow: '#9dff3a', glow2: '#e6ff7a',
        shot: '#b6ff5a', shotCore: '#f4ffd0', smoke: '#6a8a3a', aura: 'acid' } },
      { name: 'Forjador Infernal', price: 2000, pal: {
        primary: '#ff4a12', vest: '#3a2a26', shirt: '#5a4a44', scarf: '#ff4a12', hat: '#2a1d18', band: '#ff6a2a',
        goggles: '#ff6a2a', lens: '#ffd23a', dynamite: '#ff3a12', pants: '#221816', boots: '#2a1a14', skin: '#8a6450',
        glove: '#4a2a1e', gear: '#ff6a2a', boom: '#ff4a12', boom2: '#ffb02a', glow: '#ff4a12', glow2: '#ffb02a',
        shot: '#ff7a2a', shotCore: '#fff0b0', smoke: '#5a3a2a', hot: true, aura: 'magma' } },
    ],
  },
  {
    id: 'cyber', name: 'La Cazadora Ciber', title: 'CYBER OUTLAW', rank: 'A', suit: '♥',
    role: 'Alta velocidad · Críticos',
    desc: 'Forajida de tatuajes brillantes. Rápida como un relámpago y letal con dos revólveres.',
    stats: { hp: 105, speed: 238, damage: 1.0, crit: 0.25, critMult: 2.3, knockback: 0.8, armor: 0, pickup: 1.2, explosive: 1, elemental: false },
    bars: { vida: 2, velocidad: 5, daño: 4, control: 2 },
    ability: { id: 'dash', name: 'Paso Fantasma', cd: 4, desc: 'Esprint invulnerable que deja una estela de balas.' },
    ultimate: { id: 'deadeye', name: 'Ojo de la Muerte', desc: 'El tiempo se ralentiza y cada disparo es crítico automático.' },
    skins: [
      { name: 'Forajida Renegada', price: 0, pal: {
        primary: '#ff3b3b', coat: '#8e1a1a', coatDark: '#4e0c0c', corset: '#1a1214', hair: '#5a1e14', hat: '#2a1a14', band: '#5a3a24',
        tattoo: '#ff3b3b', skin: '#c08a62', gun: '#b8b0a8', pants: '#2a2020', boots: '#3a2418', glove: '#3a2418',
        metal: '#c9a54a', glow: '#ff3b3b', glow2: '#ff9a7a', shot: '#ff6a5a', shotCore: '#fff0e0', smoke: '#9a9a9a', aura: 'blood' } },
      { name: 'Viuda de Neón', price: 800, pal: {
        primary: '#b64dff', coat: '#16111c', coatDark: '#0a070d', corset: '#0e0a12', hair: '#1a1020', hat: '#120e16', band: '#b64dff',
        tattoo: '#b64dff', skin: '#b08a7a', gun: '#6a6a7a', pants: '#120e16', boots: '#18121e', glove: '#1a1420',
        metal: '#b64dff', glow: '#b64dff', glow2: '#e2b0ff', shot: '#c77dff', shotCore: '#ffffff', smoke: '#6a4a8a', aura: 'violet' } },
      { name: 'Ángel de Oro Maldito', price: 2000, pal: {
        primary: '#ffe17a', coat: '#efe8d8', coatDark: '#b8a98a', corset: '#b8902e', hair: '#e8c46a', hat: '#f2ead6', band: '#b8902e',
        tattoo: '#ffe17a', skin: '#c89a72', gun: '#d4af37', pants: '#d8cdb4', boots: '#b8902e', glove: '#d8cdb4',
        metal: '#d4af37', glow: '#ffe17a', glow2: '#fff6c8', shot: '#ffe17a', shotCore: '#ffffff', smoke: '#e8d8a8', aura: 'gold' } },
    ],
  },
];

export const heroById = (id) => HEROES.find((h) => h.id === id) || HEROES[0];
