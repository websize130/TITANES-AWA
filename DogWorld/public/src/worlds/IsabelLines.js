// Diálogos contextuales de Isabel: según el progreso de la sala y las razas del
// equipo, explica qué portal toca, qué perros hacen falta y quién falta.
import { WORLDS, WORLD_BY_ID, BREED_FOR_TYPE, isUnlocked } from './WorldData.js';
import { getBreed } from '../breeds/BreedData.js';

const names = (ids) => ids.map((id) => getBreed(id).name);
const list = (arr) => (arr.length <= 1 ? arr.join('') : `${arr.slice(0, -1).join(', ')} y ${arr.at(-1)}`);

/** Razas necesarias para un mundo (según los tipos de sus objetivos). */
export function breedsForWorld(worldId) {
  const w = WORLD_BY_ID[worldId];
  return [...new Set(w.objectives.map((o) => BREED_FOR_TYPE[o.type]))];
}

export function isabelPages({ progress, team, firstTime }) {
  const pages = [];
  if (firstTime) {
    pages.push('¡Hola, valientes perritos! Soy Isabel, la bruja guardiana de los portales del castillo. ✨');
    pages.push('Los Gatos Villanos robaron la Corona y el castillo se quedó dormido. Detrás de estos seis portales hay mundos llenos de retos… y solo un equipo de perros unidos puede superarlos.');
    pages.push('Cada raza tiene un don: Tyson embiste, Blizzard congela, Digger excava, Scout olfatea, Rayder corre como el rayo, Goliath levanta pedruscos y Rufus… ¡anima a cualquiera con su baile!');
    pages.push('Para viajar, poneos delante de un portal abierto. Cuando todo el equipo esté listo, os teletransportaré juntos. Si alguien llega tarde, puede entrar después y unirse a la expedición.');
  }

  const done = progress instanceof Set ? progress : new Set(progress);
  if (done.size === WORLDS.length) {
    pages.push('¡Lo habéis conseguido! La Corona ha vuelto y el castillo ha DESPERTADO. Su gran portón está abierto para vosotros. 👑');
    pages.push('Podéis volver a cualquier mundo cuando queráis para repetir las misiones con otros amigos.');
    return pages;
  }

  const open = WORLDS.filter((w) => isUnlocked(w.id, done) && !done.has(w.id));
  const locked = WORLDS.filter((w) => !isUnlocked(w.id, done));
  const teamSet = new Set(team);

  for (const w of open.slice(0, 2)) {
    const need = breedsForWorld(w.id);
    const missing = need.filter((b) => !teamSet.has(b));
    let line = `El portal de ${w.title} (${w.name}) está abierto. ${w.intro} Allí necesitaréis a ${list(names(need))}.`;
    if (missing.length) {
      line += ` Ahora mismo os falta ${list(names(missing))}: alguien puede cambiar de perro desde el menú (⏸ / Esc).`;
    } else {
      line += ' ¡Vuestro equipo tiene todo lo necesario!';
    }
    pages.push(line);
  }

  if (locked.length) {
    const next = locked[0];
    const req = next.requires.filter((r) => !done.has(r)).map((r) => WORLD_BY_ID[r].title);
    pages.push(`El portal de ${next.title} sigue sellado: se abrirá cuando completéis ${list(req)}.`);
  }
  pages.push('Recordad: en cada mundo hay una reliquia al final. Solo aparece cuando el equipo ha superado todos los retos. ¡Buena suerte!');
  return pages;
}
