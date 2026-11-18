// Armería del Oeste Oculto. Todas las armas tienen cargador, recarga y ALCANCE corto/medio
// (anillo de tinta en el suelo). `power` es el DAÑO base de la tienda: el catálogo se ordena de menor a mayor.
// kind: revolvers | shotgun | cards | rifle | harpoon | smg | laser | tesla
// owner: forajido dueño (armas de serie y legendarias únicas) o null (cualquiera puede equiparla).

export const CATEGORIES = {
  mano: { name: 'Armas de Mano y Precisión', desc: 'Revólveres, escopetas y rifles monotiro. Daño bajo y medio.', color: '#c9a54a' },
  rapido: { name: 'Metralletas y Fuego Rápido', desc: 'Subfusiles de tambor y armas automáticas de época para saturar de plomo.', color: '#e07a3a' },
  arcano: { name: 'Armas Experimentales y Láseres', desc: 'Tecnología arcana: atraviesan hordas enteras y funden la coraza de los colosos.', color: '#7fc8ff' },
  legendaria: { name: 'Armas Únicas · Legendarias', desc: 'Piezas de coleccionista ligadas a un forajido. Daño máximo.', color: '#ff6a2a' },
};

const W = [
  // ---------------- MANO Y PRECISIÓN
  { id: 'derringer', cat: 'mano', price: 120, owner: null, name: 'Derringer de Tahúr', kind: 'revolvers', power: 38, dmg: 11, rate: 4, mag: 4, reload: 1.3, speed: 860, range: 260, count: 1, spread: 0.08, pierce: 0, kb: 60, desc: 'Cuatro tiros escondidos en la manga. Corto, rápido y traicionero.' },
  { id: 'twins', cat: 'mano', price: 0, owner: 'barnaby', name: 'Revólveres "Tripa y Corazón"', kind: 'revolvers', power: 52, dmg: 13, rate: 7, mag: 12, reload: 1.6, speed: 900, range: 310, count: 1, spread: 0.07, pierce: 0, kb: 80, desc: 'Dos Colt de seis tiros que se turnan como un buen dúo cómico.' },
  { id: 'cards', cat: 'mano', price: 0, owner: 'maeve', name: 'Naipes de Pólvora', kind: 'cards', power: 56, dmg: 9, rate: 1.7, mag: 9, reload: 1.0, speed: 640, range: 300, count: 1, burst: 3, spread: 0.1, pierce: 0, kb: 60, explode: 46, desc: 'Ráfagas de tres naipes con pólvora en el canto. Estallan al tocar carne.' },
  { id: 'colt', cat: 'mano', price: 300, owner: null, name: 'Colt Navy Gemelos', kind: 'revolvers', power: 60, dmg: 15, rate: 6.5, mag: 12, reload: 1.5, speed: 920, range: 310, count: 1, spread: 0.06, pierce: 0, kb: 85, desc: 'La pareja clásica del pistolero. Fiables hasta en el infierno.' },
  { id: 'sawn', cat: 'mano', price: 0, owner: 'silas', name: 'Recortada "Mal Trago"', kind: 'shotgun', power: 66, dmg: 11, rate: 1.7, mag: 2, reload: 1.25, speed: 760, range: 235, count: 7, spread: 0.62, pierce: 0, kb: 320, desc: 'Dos cañones recortados. Siete perdigones de mala uva.' },
  { id: 'springfield', cat: 'mano', price: 450, owner: null, name: 'Rifle Springfield Monotiro', kind: 'rifle', power: 70, dmg: 64, rate: 1, mag: 1, reload: 1.05, speed: 1600, range: 390, count: 1, spread: 0, pierce: 2, kb: 200, desc: 'Un cartucho, un muerto. Atraviesa dos cuerpos.' },
  { id: 'whitworth', cat: 'mano', price: 0, owner: 'caleb', name: 'Rifle Whitworth "Elegía"', kind: 'rifle', power: 78, dmg: 78, rate: 1, mag: 1, reload: 1.05, speed: 1700, range: 400, count: 1, spread: 0, pierce: 3, kb: 230, desc: 'Monotiro pesado de precisión. Un verso, un muerto, tres a lo sumo.' },
  { id: 'schofield', cat: 'mano', price: 700, owner: null, name: 'Schofield del Carnicero', kind: 'revolvers', power: 86, dmg: 18, rate: 6.5, mag: 12, reload: 1.4, speed: 940, range: 320, count: 1, spread: 0.06, pierce: 0, kb: 90, burn: 5, desc: 'Punta hueca: deja a la horda sangrando (daño por segundo).' },
  { id: 'grudge', cat: 'mano', price: 900, owner: null, name: 'Doble Cañón "Rencor"', kind: 'shotgun', power: 94, dmg: 12, rate: 1.9, mag: 2, reload: 1.05, speed: 800, range: 255, count: 10, spread: 0.7, pierce: 1, kb: 420, desc: 'Diez perdigones que no olvidan. Perforan a un primer cuerpo.' },
  { id: 'requiem', cat: 'mano', price: 1100, owner: null, name: 'Rifle de Caza "Réquiem"', kind: 'rifle', power: 104, dmg: 100, rate: 1, mag: 1, reload: 0.95, speed: 1800, range: 420, count: 1, spread: 0, pierce: 5, kb: 260, desc: 'Cañón octogonal y culata grabada con nombres que ya no respiran.' },
  // ---------------- METRALLETAS Y FUEGO RÁPIDO
  { id: 'henry', cat: 'rapido', price: 1400, owner: null, name: 'Henry de Dieciséis Tiros', kind: 'smg', power: 116, dmg: 22, rate: 6, mag: 16, reload: 2.0, speed: 1200, range: 360, count: 1, spread: 0.05, pierce: 1, kb: 110, desc: 'Rifle de palanca de repetición. Dieciséis plegarias seguidas.' },
  { id: 'pepper', cat: 'rapido', price: 1700, owner: null, name: 'Pimienta "Ruleta Rusa"', kind: 'smg', power: 124, dmg: 14, rate: 11, mag: 24, reload: 1.8, speed: 900, range: 300, count: 1, spread: 0.2, pierce: 0, kb: 70, critBonus: 0.15, desc: 'Seis cañones giratorios. Nunca sabes cuál escupe el diablo.' },
  { id: 'drum', cat: 'rapido', price: 2200, owner: null, name: 'Subfusil de Tambor "Tómbola"', kind: 'smg', power: 138, dmg: 12, rate: 15, mag: 50, reload: 2.4, speed: 980, range: 320, count: 1, spread: 0.16, pierce: 0, kb: 55, desc: 'Cargador de tambor de cincuenta. Para saturar de plomo cualquier calle.' },
  { id: 'devildeck', cat: 'rapido', price: 2500, owner: null, name: 'Baraja del Diablo', kind: 'cards', power: 146, dmg: 12, rate: 2.2, mag: 15, reload: 1.0, speed: 620, range: 320, count: 1, burst: 3, spread: 0.18, pierce: 0, kb: 60, explode: 56, homing: 3.5, desc: 'Ráfagas de naipes que buscan carne y estallan.' },
  { id: 'gatling', cat: 'rapido', price: 3000, owner: null, name: 'Gatling de Mano "Segadora"', kind: 'smg', power: 164, dmg: 13, rate: 20, mag: 80, reload: 3.2, speed: 1000, range: 330, count: 1, spread: 0.14, pierce: 1, kb: 50, spin: true, desc: 'Manivela, latón y ochenta balas. Gira y siega.' },
  // ---------------- EXPERIMENTALES Y LÁSERES
  { id: 'tesla', cat: 'arcano', price: 4000, owner: null, name: 'Pistola de Bobina Tesla "Chispa"', kind: 'tesla', power: 188, dmg: 30, rate: 3, mag: 8, reload: 1.6, speed: 0, range: 300, count: 1, chainN: 4, chainR: 170, kb: 40, desc: 'Arcos eléctricos que saltan entre cuatro cuerpos. Electrifica los charcos de tinta.' },
  { id: 'ether', cat: 'arcano', price: 5500, owner: null, name: 'Cañón de Éter "Rayo Azul"', kind: 'laser', power: 226, dmg: 46, rate: 2.4, mag: 6, reload: 1.8, speed: 0, range: 380, count: 1, width: 10, melt: 3, kb: 80, color: '#7fd8ff', desc: 'Haz de éter que atraviesa a todos los enemigos en línea y funde corazas.' },
  { id: 'leviathan', cat: 'arcano', price: 6000, owner: null, name: 'Arpón-Rifle "Leviatán"', kind: 'harpoon', power: 248, dmg: 125, rate: 1, mag: 1, reload: 1.3, speed: 1250, range: 430, count: 1, spread: 0, pierce: 99, kb: 300, explode: 80, desc: 'Arpón ballenero que atraviesa la horda y estalla al primer impacto.' },
  { id: 'eclipse', cat: 'arcano', price: 7500, owner: null, name: 'Proyector de Luz Negra "Eclipse"', kind: 'laser', power: 272, dmg: 70, rate: 1.6, mag: 4, reload: 2.0, speed: 0, range: 420, count: 1, width: 18, melt: 5, kb: 140, color: '#c77dff', desc: 'Prototipo de luz negra. Funde la coraza de los colosos como cera.' },
  // ---------------- LEGENDARIAS ÚNICAS
  { id: 'L_silas', cat: 'legendaria', price: 9000, owner: 'silas', name: 'La Viuda del Tuerto', kind: 'shotgun', power: 318, dmg: 24, rate: 2.2, mag: 4, reload: 1.0, speed: 860, range: 280, count: 12, spread: 0.6, pierce: 2, kb: 520, burn: 10, legendary: '#ffb347', desc: 'Perdigones de plata fundida que prenden fuego a todo lo que tocan.' },
  { id: 'L_barnaby', cat: 'legendaria', price: 9000, owner: 'barnaby', name: '"Tripas de Plomo"', kind: 'revolvers', power: 326, dmg: 34, rate: 9, mag: 14, reload: 1.1, speed: 1020, range: 340, count: 1, spread: 0.05, pierce: 1, kb: 120, burn: 8, chain: 1, fearOnCrit: 2, legendary: '#ff6a2a', desc: 'Cada crítico cuenta un chiste: los cercanos huyen aterrados.' },
  { id: 'L_maeve', cat: 'legendaria', price: 9000, owner: 'maeve', name: 'As de Picas Infernal', kind: 'cards', power: 332, dmg: 24, rate: 2.6, mag: 18, reload: 0.8, speed: 680, range: 340, count: 1, burst: 3, spread: 0.14, pierce: 1, kb: 90, explode: 78, homing: 4, burn: 9, legendary: '#ff4a2a', desc: 'Ases ardientes que persiguen, estallan y dejan fuego.' },
  { id: 'L_caleb', cat: 'legendaria', price: 9000, owner: 'caleb', name: '"Último Salmo"', kind: 'laser', power: 340, dmg: 150, rate: 1.1, mag: 2, reload: 1.1, speed: 0, range: 460, count: 1, width: 14, melt: 6, kb: 260, color: '#fff0b0', legendary: '#fff0b0', desc: 'Un verso de luz sagrada que atraviesa la noche entera.' },
];

W.sort((a, b) => a.power - b.power);
export const WEAPON_LIST = W;
export const WEAPONS = Object.fromEntries(W.map((w) => [w.id, w]));
export const canEquip = (w, heroId) => !w.owner || w.owner === heroId;
