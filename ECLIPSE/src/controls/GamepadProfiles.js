// Identificación de la familia del mando a partir de Gamepad.id.
// Solo determina qué símbolos se muestran; la lógica usa siempre el
// "standard mapping" del W3C (0 = botón inferior, 1 = derecho, 2 = izquierdo, 3 = superior).

export const PAD = Object.freeze({
  SOUTH: 0, EAST: 1, WEST: 2, NORTH: 3,
  L1: 4, R1: 5, L2: 6, R2: 7,
  SELECT: 8, START: 9, L3: 10, R3: 11,
  UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15,
});

export const FAMILY_LABEL = Object.freeze({
  playstation: 'Mando PlayStation',
  xbox: 'Mando Xbox',
  generic: 'Mando',
});

export function detectFamily(gamepad) {
  const id = (gamepad?.id || '').toLowerCase();
  // Xbox primero: su nombre también contiene "Wireless Controller"
  // 045e = Microsoft
  if (/045e|xbox|xinput|x-box/.test(id)) return 'xbox';
  // 054c = Sony (el id de Chrome incluye "Vendor: 054c" en DualShock 4 y DualSense)
  if (/054c|playstation|dualsense|dualshock|ps[345] /.test(id)) return 'playstation';
  return 'generic';
}
