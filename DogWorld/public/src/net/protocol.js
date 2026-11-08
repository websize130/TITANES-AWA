// Protocolo compartido cliente/servidor (el servidor lo importa también).
// Mensajes JSON pequeños con claves cortas para ahorrar ancho de banda.

export const PROTOCOL_VERSION = 4;

export const MSG = Object.freeze({
  // Cliente -> Servidor
  JOIN: 'join',         // { t, v, room, name, b:breedId, c:cosmetics }
  ROOM_QUERY: 'rq',     // { t, room }  -> ROOM_INFO (para la pantalla de selección)
  BREED: 'breed',       // { t, b }  cambiar de raza dentro de la sala
  ABILITY: 'ab',        // { t, a, p:[x,y,z], r, x? }  (también S->C con id)
  STATE: 'st',          // { t, p:[x,y,z], r:yaw, a:anim }
  COLLECT: 'col',       // { t, id }
  PORTAL: 'portal',     // { t, w|null }  listo (o no) junto a un portal del Hub
  EXIT: 'exit',         // { t }  volver al Hub desde un mundo
  ACT: 'act',           // { t, k, v }  interruptor / placa / reliquia
  COSMETICS: 'cos',     // { t, c:{head,eyes,neck,back} }  accesorios equipados
  GOLDEN: 'gold',       // { t, i }  he recogido el Hueso Dorado i
  TV_HOST: 'tvh',       // { t }  esta pantalla es una TV: pide código
  TV_JOIN: 'tvj',       // { t, code }  este móvil quiere ser el mando de esa TV
  TV_INPUT: 'tvi',      // { t, m:[x,y], l:[dx,dy], b:bits }  mando -> TV (reenviado)
  TV_FEEDBACK: 'tvf',   // { t, hap?:[ms], st? }  TV -> mando (vibración / estado)
  PING: 'ping',         // { t, ts }

  // Servidor -> Cliente
  WELCOME: 'welcome',   // { t, id, room, players:[PlayerInfo], collected:[id], objects, progress }
  ROOM_INFO: 'ri',      // { t, room, players:[{ name, b }], max }
  PLAYER_BREED: 'pb',   // { t, id, b }
  OBJECT: 'obj',        // { t, z, k:'rock'|'dig'|'boulder', i, s }
  SCORE: 'score',       // { t, id, score, gain }
  ZONE: 'zone',         // { t, z, players:[id], state? }  has cambiado de zona
  PLAYER_ZONE: 'pz',    // { t, id, z, p }  otro jugador cambió de zona
  PORTAL_STATUS: 'ps',  // { t, w, ready:[id], ms }  cuenta atrás compartida del portal
  MISSION: 'ms',        // { t, z, k, solved?|door?, by }
  WORLD_COMPLETE: 'wc', // { t, w, by, name, progress:[worldId] }
  PLAYER_COSMETICS: 'pcos', // { t, id, c }
  GOLDEN_FOUND: 'goldf', // { t, i, by, name }
  TV_CODE: 'tvc',       // { t, code }  código de emparejamiento para la TV
  TV_PAIRED: 'tvok',    // { t, role:'tv'|'pad', code }
  TV_LOST: 'tvbye',     // { t }  la otra parte se ha desconectado
  PLAYER_JOIN: 'pj',    // { t, player: PlayerInfo }
  PLAYER_LEAVE: 'pl',   // { t, id }
  SNAPSHOT: 'snap',     // { t, ts, s:[[id, x, y, z, yaw, anim], ...] }
  COLLECTED: 'cold',    // { t, id, by, score }
  RESPAWN: 'resp',      // { t, id }
  PONG: 'pong',         // { t, ts }
  ERROR: 'err',         // { t, code, msg, taken? }
});

export const NET = Object.freeze({
  SEND_RATE_HZ: 15,          // envíos del cliente
  SNAPSHOT_RATE_HZ: 15,      // difusión del servidor
  INTERP_DELAY_MS: 120,      // retardo de interpolación de jugadores remotos
  MAX_PLAYERS_PER_ROOM: 7, // una raza distinta por jugador
  MAX_NAME_LENGTH: 16,
  MAX_ROOM_LENGTH: 8,
  COLLECTIBLE_COUNT: 24,
  COLLECTIBLE_RESPAWN_MS: 30000,
});

// EMOTE = gesto de personalidad de la raza; ACTION = animación de la habilidad.
export const ANIM = Object.freeze({ IDLE: 0, RUN: 1, JUMP: 2, FALL: 3, EMOTE: 4, ACTION: 5 });
export const ANIM_MAX = 5;

export function sanitizeRoom(raw) {
  const code = String(raw ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, NET.MAX_ROOM_LENGTH);
  return code || 'HUB';
}

export function sanitizeName(raw) {
  const name = String(raw ?? '').replace(/[<>&"'`\u0000-\u001f]/g, '').trim().slice(0, NET.MAX_NAME_LENGTH);
  return name || 'Perrito';
}
