// Naipes de tinta: la horda los suelta al morir. Al reunir 5 se evalúa la mano de póker y la jugada
// desata una "ráfaga de furia" pasiva y temporal. Baraja corta (8 a As) para que las jugadas sean alcanzables.

export const RANKS = ['8', '9', '10', 'J', 'Q', 'K', 'A'];
export const SUITS = ['♠', '♥', '♦', '♣'];
export const RED = [false, true, true, false];

// Efectos multiplicativos/aditivos de cada furia.
export const FURIES = {
  PAREJA: { name: 'Pareja', label: 'FURIA DE LA PAREJA', time: 8, rate: 1.25, color: '#e8dcc0', desc: '+25% cadencia' },
  DOBLE: { name: 'Doble Pareja', label: 'DOBLE FURIA', time: 10, rate: 1.25, dmg: 1.2, color: '#c8d8ff', desc: '+25% cadencia · +20% daño' },
  TRIO: { name: 'Trío', label: 'FURIA DEL TRÍO', time: 10, dmg: 1.45, speed: 1.15, color: '#ffcf6a', desc: '+45% daño · +15% velocidad' },
  ESCALERA: { name: 'Escalera', label: 'FURIA DE LA ESCALERA', time: 12, pierce: 3, range: 1.3, speed: 1.25, color: '#9dff6a', desc: '+3 perforación · +30% alcance · +25% velocidad' },
  COLOR: { name: 'Color', label: 'FURIA DEL COLOR', time: 8, crit: 1, color: '#ff6a8a', desc: 'Todos los disparos son críticos' },
  FULL: { name: 'Full', label: '¡FULL! FURIA TOTAL', time: 12, dmg: 1.5, rate: 1.4, reload: 0, color: '#ffb347', desc: '+50% daño · +40% cadencia · recarga instantánea' },
  POKER: { name: 'Póker', label: '¡PÓKER DE MUERTOS!', time: 8, dmg: 2, invuln: true, explode: 70, color: '#d0a8ff', desc: 'Daño x2 · invulnerable · balas explosivas' },
};

export function evaluateHand(hand) {
  const counts = new Array(RANKS.length).fill(0), suits = new Array(4).fill(0);
  for (const c of hand) { counts[c.r]++; suits[c.s]++; }
  const groups = counts.filter((n) => n > 0).sort((a, b) => b - a);
  const flush = hand.length === 5 && suits.some((n) => n === 5);
  let straight = false;
  if (hand.length === 5 && groups.length === 5) {
    const rs = hand.map((c) => c.r).sort((a, b) => a - b);
    straight = rs[4] - rs[0] === 4;
  }
  if (groups[0] === 4) return 'POKER';
  if (groups[0] === 3 && groups[1] === 2) return 'FULL';
  if (flush) return 'COLOR';
  if (straight) return 'ESCALERA';
  if (groups[0] === 3) return 'TRIO';
  if (groups[0] === 2 && groups[1] === 2) return 'DOBLE';
  if (groups[0] === 2) return 'PAREJA';
  return null;
}
