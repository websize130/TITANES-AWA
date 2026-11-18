// Mazo de cartas de la partida. Rarezas: Bronce → Plata → Oro → Platino → Diamante.
// Pasivas: efecto permanente en la partida. Acción: entran en la mano (máx. 3) y se juegan con 1·2·3.
// Diamante: Bendición + Maldición (penalización temporal de velocidad o vulnerabilidad).

export const RARITY = [
  { id: 0, name: 'Bronce', label: 'COMÚN', frame: '#7a4a2a', edge: '#3a1e0e', glow: '#b06a3a', text: '#e8c8a8', weight: 52 },
  { id: 1, name: 'Plata', label: 'POCO COMÚN', frame: '#a8a8a0', edge: '#4a4a46', glow: '#d8d8d0', text: '#f2f2ea', weight: 27 },
  { id: 2, name: 'Oro', label: 'RARA', frame: '#b8862e', edge: '#5a3a0a', glow: '#ffb347', text: '#ffe6a8', weight: 13 },
  { id: 3, name: 'Platino', label: 'ÉPICA', frame: '#8a96a8', edge: '#2a3040', glow: '#c8e0ff', text: '#e8f2ff', weight: 6 },
  { id: 4, name: 'Diamante', label: 'LEGENDARIA', frame: '#4a3a6a', edge: '#120a24', glow: '#d0a8ff', text: '#f4e8ff', weight: 2 },
];

const P = 'passive', A = 'action';

export const CARDS = [
  // ---------------- BRONCE: efecto básico
  { id: 'polvora', r: 0, t: P, name: 'Pólvora Barata', icon: '💥', desc: '+12% de daño.', apply: (g) => { g.st.dmg *= 1.12; } },
  { id: 'gatillo', r: 0, t: P, mod: true, name: 'Gatillo Ligero', icon: '🔫', desc: '+12% de cadencia.', apply: (g) => { g.st.rate *= 1.12; } },
  { id: 'botas', r: 0, t: P, name: 'Botas Gastadas', icon: '👢', desc: '+8% de velocidad.', apply: (g) => { g.st.speed *= 1.08; } },
  { id: 'cuero', r: 0, t: P, name: 'Cuero Curtido', icon: '🛡', desc: '+20 de vida máxima.', apply: (g) => { g.addMaxHp(20); } },
  { id: 'whisky', r: 0, t: P, name: 'Whisky Aguado', icon: '🥃', desc: 'Cura el 30% de la vida.', heal: true, apply: (g) => { g.heal(g.player.maxHp * 0.3); } },
  { id: 'bolsillos', r: 0, t: P, name: 'Bolsillos Hondos', icon: '👝', desc: '+35% de radio de recogida.', apply: (g) => { g.st.pickup *= 1.35; } },
  { id: 'puntas', r: 0, t: P, mod: true, name: 'Puntas de Acero', icon: '🔩', desc: 'Munición perforante: +1 cuerpo atravesado por bala.', apply: (g) => { g.st.pierce += 1; } },
  { id: 'cargador', r: 0, t: P, mod: true, name: 'Cargador Engrasado', icon: '🛢', desc: 'Recarga un 25% más rápida.', apply: (g) => { g.st.reloadMult *= 0.75; } },
  { id: 'sal', r: 0, t: A, name: 'Puñado de Sal', icon: '🧂', cd: 6, desc: 'Cono de sal gruesa que repele y aturde a la horda cercana.' },

  // ---------------- PLATA: doble beneficio
  { id: 'plata', r: 1, t: P, mod: true, name: 'Munición de Plata', icon: '🌙', desc: '+15% de daño y +1 perforación.', apply: (g) => { g.st.dmg *= 1.15; g.st.pierce += 1; } },
  { id: 'cartuchera', r: 1, t: P, mod: true, name: 'Doble Cartuchera', icon: '🎒', desc: '+15% de cadencia y recarga un 15% más rápida.', apply: (g) => { g.st.rate *= 1.15; g.st.reloadMult *= 0.85; } },
  { id: 'espuelas', r: 1, t: P, name: 'Espuelas del Muerto', icon: '⭐', desc: '+12% de velocidad y +6% de esquiva.', apply: (g) => { g.st.speed *= 1.12; g.st.dodge += 0.06; } },
  { id: 'biblia', r: 1, t: P, name: 'Biblia de Bolsillo', icon: '📖', desc: '+25 de vida máxima y regeneras 1 vida/s.', heal: true, apply: (g) => { g.addMaxHp(25); g.st.regen += 1; } },
  { id: 'buitre', r: 1, t: P, name: 'Mirada de Buitre', icon: '🦅', desc: '+8% de crítico y +25% de daño crítico.', apply: (g) => { g.st.crit += 0.08; g.st.critMult += 0.25; } },
  { id: 'halcon', r: 1, t: P, mod: true, range: true, name: 'Ojo de Halcón', icon: '🎯', desc: 'LARGO ALCANCE: +35% de alcance de disparo y de detección.', apply: (g) => { g.st.rangeMult *= 1.35; } },
  { id: 'tambor', r: 1, t: P, mod: true, name: 'Tambor Ampliado', icon: '🥁', desc: '+50% de capacidad del cargador y recarga un 15% más rápida.', apply: (g) => { g.st.magMult *= 1.5; g.st.reloadMult *= 0.85; } },
  { id: 'polvorarea', r: 1, t: P, mod: true, name: 'Pólvora Negra', icon: '💣', desc: 'Disparos en área: cada impacto estalla en un radio pequeño.', apply: (g) => { g.st.splash += 40; } },
  { id: 'mina', r: 1, t: A, art: true, name: 'Dinamita de Proximidad', icon: '🧨', cd: 8, desc: 'ARTEFACTO: siembra 3 cartuchos que estallan cuando la horda se acerca.' },
  { id: 'acido', r: 1, t: A, art: true, name: 'Frasco de Ácido', icon: '⚗', cd: 9, desc: 'ARTEFACTO: charco de ácido que corroe corazas. Con fuego: ¡explosión de pólvora!' },
  { id: 'dinamita', r: 1, t: A, name: 'Cartucho de Dinamita', icon: '🧨', cd: 8, desc: 'Lanza dinamita que estalla en un gran radio.' },
  { id: 'cepo', r: 1, t: A, name: 'Cepo de Oso', icon: '🪤', cd: 7, desc: 'Coloca dos cepos que atrapan y desgarran zombis.' },

  // ---------------- ORO: impacto táctico
  { id: 'metralla', r: 2, t: P, mod: true, name: 'Metralla', icon: '✴', desc: 'Cada impacto revienta en 4 esquirlas que hieren a la horda cercana.', apply: (g) => { g.st.shrapnel += 4; } },
  { id: 'catalejo', r: 2, t: P, mod: true, range: true, name: 'Catalejo de Latón', icon: '🔭', desc: 'LARGO ALCANCE: +60% de alcance y +6% de crítico.', apply: (g) => { g.st.rangeMult *= 1.6; g.st.crit += 0.06; } },
  { id: 'cadena', r: 2, t: P, mod: true, name: 'Balas Encadenadas', icon: '⛓', desc: 'Cada impacto rebota a otro zombi cercano.', apply: (g) => { g.st.chain += 1; } },
  { id: 'salbendita', r: 2, t: P, mod: true, name: 'Sal Bendita', icon: '✝', desc: 'Tus disparos ralentizan un 35% a la horda.', apply: (g) => { g.st.slowOnHit = Math.max(g.st.slowOnHit, 1.2); } },
  { id: 'incendiarias', r: 2, t: P, mod: true, name: 'Plomo Incendiario', icon: '🔥', desc: 'Tus balas prenden fuego: 9 de daño por segundo durante 3 s.', apply: (g) => { g.st.burnOnHit += 9; } },
  { id: 'trampero', r: 2, t: P, name: 'Trampero', icon: '⚙', desc: 'Cada 9 s colocas un cepo automático. Las trampas hacen +50% de daño.', apply: (g) => { g.st.trapper += 1; g.st.trapMult *= 1.5; } },
  { id: 'cuervo', r: 2, t: P, name: 'Cuervo Guardián', icon: '🐦', desc: 'Un cuervo de tinta orbita a tu alrededor y picotea zombis.', apply: (g) => { g.st.crows += 1; } },
  { id: 'bobina', r: 2, t: A, art: true, name: 'Bobina Tesla', icon: '⚡', cd: 12, desc: 'ARTEFACTO: planta una bobina que lanza arcos eléctricos 12 s. Electrifica la tinta.' },
  { id: 'explosivas', r: 2, t: P, mod: true, art: true, name: 'Balas Explosivas', icon: '💥', desc: 'ARTEFACTO: cada impacto estalla en un radio medio.', apply: (g) => { g.st.splash += 55; } },
  { id: 'farol', r: 2, t: A, name: 'Farol Arrojadizo', icon: '🏮', cd: 9, desc: 'Lanza un farol de gas que deja el suelo en llamas.' },
  { id: 'aguabendita', r: 2, t: A, name: 'Agua Bendita', icon: '💧', cd: 12, desc: 'Onda sagrada: cura 25 de vida y quema a la horda alrededor.' },

  // ---------------- PLATINO: efectos cinemáticos devastadores
  { id: 'tormenta', r: 3, t: P, name: 'Tormenta de Plomo', icon: '🌀', desc: 'Cada 7 s disparas una corona de 28 balas.', apply: (g) => { g.st.leadStorm += 1; } },
  { id: 'columna', r: 3, t: P, name: 'Columna de Fuego Sagrado', icon: '🕯', desc: 'Cada 18 bajas cae una columna de fuego que arrasa la zona.', apply: (g) => { g.st.holyFire += 1; } },
  { id: 'tren', r: 3, t: P, name: 'Tren Fantasma', icon: '🚂', desc: 'Cada 16 s un tren espectral cruza la pantalla y arrolla a la horda.', apply: (g) => { g.st.ghostTrain += 1; } },
  { id: 'danza', r: 3, t: P, name: 'Danza Macabra', icon: '💀', desc: 'Tus críticos estallan y dañan a los zombis cercanos.', apply: (g) => { g.st.critExplode += 1; } },
  { id: 'rayo', r: 3, t: A, art: true, name: 'Llamada del Rayo', icon: '🌩', cd: 14, desc: 'ARTEFACTO: seis rayos caen sobre la horda. Sobre charcos de tinta: sobrecarga en cadena.' },
  { id: 'bobinas', r: 3, t: P, mod: true, art: true, name: 'Balas de Bobina', icon: '🔋', desc: 'ARTEFACTO: 25% de que cada impacto salte en arco a 2 enemigos cercanos.', apply: (g) => { g.st.arc += 0.25; } },
  { id: 'caballeria', r: 3, t: A, name: 'Carga de Caballería Fantasma', icon: '🐎', cd: 18, desc: 'Una carga de jinetes espectrales barre el campo de lado a lado.' },

  // ---------------- DIAMANTE: Bendición y Maldición
  { id: 'pacto', r: 4, t: P, name: 'Pacto en la Encrucijada', icon: '🩸', desc: 'BENDICIÓN: daño x2 el resto de la partida.', curse: { type: 'slow', amount: 0.35, time: 25, text: 'MALDICIÓN: -35% de velocidad durante 25 s.' }, apply: (g) => { g.st.dmg *= 2; } },
  { id: 'corazon', r: 4, t: P, name: 'Corazón del Diablo', icon: '❤', desc: 'BENDICIÓN: +100 de vida máxima y regeneras 3 vida/s.', heal: true, curse: { type: 'vuln', amount: 0.5, time: 30, text: 'MALDICIÓN: recibes +50% de daño durante 30 s.' }, apply: (g) => { g.addMaxHp(100); g.st.regen += 3; } },
  { id: 'ases', r: 4, t: P, name: 'Ases y Ochos', icon: '🂡', desc: 'BENDICIÓN: +35% de crítico y los críticos hacen x3.', curse: { type: 'vuln', amount: 0.4, time: 25, text: 'MALDICIÓN: +40% de daño recibido y sin esquiva 25 s.' }, apply: (g) => { g.st.crit += 0.35; g.st.critMult = Math.max(g.st.critMult, 3); } },
  { id: 'sombra', r: 4, t: P, name: 'Sombra Vendida', icon: '👤', desc: 'BENDICIÓN: dos sombras gemelas disparan contigo.', curse: { type: 'slow', amount: 0.5, time: 20, text: 'MALDICIÓN: -50% de velocidad durante 20 s.' }, apply: (g) => { g.st.shadows += 2; } },
  { id: 'ciclope', r: 4, t: P, mod: true, range: true, name: 'Ojo del Cíclope', icon: '👁', desc: 'BENDICIÓN: alcance x2 y +20% de crítico.', curse: { type: 'slow', amount: 0.4, time: 25, text: 'MALDICIÓN: -40% de velocidad durante 25 s.' }, apply: (g) => { g.st.rangeMult *= 2; g.st.crit += 0.2; } },
  { id: 'ahorcado', r: 4, t: P, mod: true, name: 'Bala del Ahorcado', icon: '🪢', desc: 'BENDICIÓN: todos tus disparos atraviesan cualquier cuerpo.', curse: { type: 'slow', amount: 0.3, time: 30, text: 'MALDICIÓN: -30% de velocidad durante 30 s.' }, apply: (g) => { g.st.pierce += 99; } },
  { id: 'trompeta', r: 4, t: A, name: 'Trompeta del Juicio', icon: '📯', cd: 40, desc: 'BENDICIÓN: aniquila a toda la horda visible (los colosos sufren un golpe brutal).', curse: { type: 'vuln', amount: 0.6, time: 12, text: 'MALDICIÓN al tocarla: +60% de daño recibido 12 s.' } },
];

// Cartas de firma (no salen en el sorteo; empiezan en la mano).
export const SIGNATURE = {
  rabia: { id: 'rabia', r: 2, t: A, name: 'Arrebato de Mal Genio', icon: '💢', cd: 7, desc: 'Silas revienta: corona de perdigones en 360° con empuje brutal.' },
  deadhand: { id: 'deadhand', r: 2, t: A, name: 'Mano de Muerto', icon: '🂡', cd: 7, desc: 'Abanico de cinco naipes explosivos que aturden y hechizan.' },
  verso: { id: 'verso', r: 2, t: A, name: 'Último Verso', icon: '✒', cd: 6, desc: 'Disparo de precisión que lo atraviesa todo con crítico garantizado y alcance doble.' },
  chiste: { id: 'chiste', r: 2, t: A, name: 'Chiste de Carnicero', icon: '🔪', cd: 9, desc: 'Un chiste tan macabro que la horda cercana huye aterrada 4 s.' },
};

export const cardById = (id) => CARDS.find((c) => c.id === id) || SIGNATURE[id];

// Sorteo de rareza: la suerte (Maeve, nivel de partida, rondas) desplaza el peso hacia arriba.
export function rollRarity(luck, rnd = Math.random) {
  const w = RARITY.map((r, i) => r.weight * Math.pow(1 + luck * 0.55, i));
  let tot = 0;
  for (const x of w) tot += x;
  let v = rnd() * tot;
  for (let i = 0; i < w.length; i++) { v -= w[i]; if (v <= 0) return i; }
  return 0;
}
