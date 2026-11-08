// Isabel, la bruja guía y guardiana de los portales.
// Usa el modelo genérico de NPC con su aspecto de la ilustración: melena rubia
// rizada, gafas de sol, sombrero con hebilla, capa morada y escoba mágica.
import { NpcCharacter } from '../npcs/NpcModel.js';
import { NPC_BY_ID } from '../npcs/NpcData.js';

export class Isabel extends NpcCharacter {
  constructor() {
    super(NPC_BY_ID.isabel);
  }
}
