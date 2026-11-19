// Mascotas en tinta: sabueso espectral, gato negro, cuervo sombrío y halcón del desierto.
// Mirando a la derecha, suelo en y = 0. 4 fotogramas (galope / aleteo). tier 0–2 añade detalles.
import { INK, TAU, poly, blob, ellipse, circle, line, glow, shade, hatchPoly, tatter } from './ink.js';
import { limb } from './heroArt.js';

function pet_eye(ctx, x, y, r, col) { glow(ctx, x, y, r * 3, col, 0.9); ellipse(ctx, x, y, r, r * 0.8, col, 1.2); ctx.fillStyle = INK; ctx.fillRect(x - 0.6, y - r * 0.7, 1.2, r * 1.4); }

function pet_hound(ctx, f, tier) {
  const ph = (f / 4) * TAU, s = Math.sin(ph), c = Math.cos(ph);
  const body = '#b8cce0', dark = '#7890aa';
  glow(ctx, 0, -40, 70, '#9ac8ff', 0.35);
  // cola de jirones espectrales
  const tail = [-44, -50, -40, -42];
  tatter(tail, -40, -42, -86, -48 + s * 6, 4, 8, 3); tail.push(-84, -60 + s * 4);
  poly(ctx, tail, pet_rgbaHex(body, 0.7), 2, 0);
  // patas traseras y delanteras (galope)
  limb(ctx, -30, -40, -40 - s * 12, -4, 7, 4, dark); limb(ctx, 28, -42, 36 + s * 12, -4, 7, 4, dark);
  const bd = [-46, -46, -30, -66, 10, -70, 36, -62, 44, -44, 26, -32, -24, -30];
  blob(ctx, bd, body, 3, 0.5);
  hatchPoly(ctx, bd, 4, 'rgba(20,30,60,0.35)', 1, true, 0.42);
  ctx.strokeStyle = dark; ctx.lineWidth = 1.5; ctx.beginPath(); for (let i = 0; i < 4; i++) { const x = -10 + i * 8; ctx.moveTo(x, -64); ctx.quadraticCurveTo(x + 4, -50, x, -36); } ctx.stroke();
  limb(ctx, -24, -38, -28 + s * 12, -4, 7, 4, body); limb(ctx, 32, -40, 44 - s * 12, -4, 7, 4, body);
  // cabeza
  blob(ctx, [32, -64, 46, -82, 66, -80, 82, -70, 80, -60, 58, -56, 40, -50], body, 3, 0.5);
  poly(ctx, [44, -80, 42, -98, 54, -82], dark, 2, 0);
  poly(ctx, [62, -62, 82, -64, 78, -56, 62, -56], '#1a2030', 1.6, 0);
  pet_eye(ctx, 58, -72, 3, '#d8f0ff');
  if (tier >= 1) poly(ctx, [36, -60, 44, -52, 30, -48], '#9a140e', 1.6, 0); // pañuelo rojo de Silas
  if (tier >= 2) for (let i = 0; i < 3; i++) glow(ctx, -20 + i * 22, -70 - i * 4, 14, '#ffb347', 0.5);
}

function pet_cat(ctx, f, tier) {
  const ph = (f / 4) * TAU, s = Math.sin(ph);
  const fur = '#1c1a22', fur2 = '#2c2a36';
  // cola en signo de interrogación
  ctx.lineCap = 'round'; ctx.strokeStyle = INK; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(-34, -40); ctx.quadraticCurveTo(-64, -50 + s * 4, -56, -84); ctx.quadraticCurveTo(-52, -96, -40, -90); ctx.stroke();
  ctx.strokeStyle = fur2; ctx.lineWidth = 5; ctx.stroke();
  limb(ctx, -26, -36, -32 - s * 9, -3, 6, 4, fur); limb(ctx, 22, -38, 28 + s * 9, -3, 6, 4, fur);
  const bd = [-38, -38, -26, -62, 6, -64, 30, -56, 34, -38, 18, -28, -24, -28]; // lomo arqueado
  blob(ctx, bd, fur2, 3, 0.5);
  ctx.fillStyle = 'rgba(200,190,255,0.16)'; ctx.beginPath(); ctx.ellipse(-4, -58, 18, 4, -0.1, 0, TAU); ctx.fill();
  limb(ctx, -18, -34, -20 + s * 9, -3, 6, 4, fur2); limb(ctx, 28, -36, 36 - s * 9, -3, 6, 4, fur2);
  // cabeza con orejas puntiagudas
  blob(ctx, [24, -58, 30, -78, 52, -80, 60, -66, 54, -52, 34, -50], fur2, 3, 0.4);
  poly(ctx, [30, -74, 30, -96, 42, -78], fur, 2.4, 0); poly(ctx, [46, -78, 56, -96, 58, -72], fur, 2.4, 0);
  poly(ctx, [33, -78, 33, -90, 39, -80], '#7a2a3a', 0, 0);
  pet_eye(ctx, 40, -68, 3.2, '#d8ff6a'); pet_eye(ctx, 52, -68, 3.2, '#d8ff6a');
  line(ctx, 58, -60, 72, -62, 'rgba(232,220,192,0.7)', 1); line(ctx, 58, -58, 72, -56, 'rgba(232,220,192,0.7)', 1);
  // collar con naipe de picas (Maeve)
  line(ctx, 30, -54, 50, -52, '#9a140e', 3);
  poly(ctx, [36, -52, 44, -52, 44, -40, 36, -40], '#efe2c4', 1.4, 0);
  ctx.fillStyle = INK; ctx.font = 'bold 9px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('♠', 40, -46);
  if (tier >= 2) { glow(ctx, 40, -86, 18, '#e07a3a', 0.6); poly(ctx, [32, -84, 36, -94, 40, -86, 44, -94, 48, -84], '#ffd27a', 1.4, 0); } // coronita de reina
}

function pet_wings(ctx, f, col, col2, span) {
  // 0 arriba · 1 medio · 2 abajo · 3 medio
  const up = [1, 0.25, -0.7, 0.25][f];
  for (const side of [-1, 1]) {
    const far = side < 0, c = far ? shade(col, -0.25) : col;
    const tipY = -60 - up * 46 + (far ? -6 : 0), tipX = -8 + side * 4;
    const w = [-6, -52, 18, -54, tipX + span * 0.5, tipY + 10, tipX, tipY, tipX - span * 0.4, tipY + 18, -22, -48];
    poly(ctx, w, c, 2.6, 0.4);
    ctx.strokeStyle = col2; ctx.lineWidth = 1.2; ctx.beginPath();
    for (let k = 1; k < 4; k++) { ctx.moveTo(-4 + k * 3, -52); ctx.lineTo(tipX - span * 0.3 + k * 9, tipY + 16 - k * 2); } ctx.stroke();
    if (far) continue;
  }
}
function pet_crow(ctx, f, tier) {
  const bodyC = '#14141c';
  pet_wings(ctx, f, '#1c1c26', 'rgba(140,150,190,0.35)', 70);
  const bd = [-40, -50, -20, -64, 14, -64, 30, -54, 20, -40, -10, -38];
  blob(ctx, bd, bodyC, 3, 0.4);
  poly(ctx, [-40, -50, -62, -58, -58, -44, -40, -44], bodyC, 2.4, 0); // cola
  blob(ctx, [16, -60, 26, -72, 40, -70, 44, -58, 32, -52], bodyC, 3, 0.4);
  poly(ctx, [42, -66, 60, -62, 42, -58], '#3a3a40', 2, 0);
  pet_eye(ctx, 32, -64, 2.6, '#ff4a3a');
  line(ctx, -2, -40, -4, -30, INK, 2); line(ctx, 8, -40, 8, -30, INK, 2);
  if (tier >= 1) { line(ctx, 18, -54, 28, -46, '#c8a24a', 1.6); circle(ctx, 28, -44, 2.4, '#c8a24a', 1); } // relicario del poeta
  if (tier >= 2) glow(ctx, 0, -54, 40, '#cfd8e6', 0.45);
}
function pet_hawk(ctx, f, tier) {
  pet_wings(ctx, f, '#8a5a30', 'rgba(40,20,10,0.6)', 84);
  const bd = [-36, -50, -16, -66, 14, -66, 30, -56, 22, -40, -8, -38];
  blob(ctx, bd, '#a87444', 3, 0.4);
  ctx.strokeStyle = 'rgba(40,20,10,0.6)'; ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-14 + i * 8, -60); ctx.lineTo(-10 + i * 8, -44); } ctx.stroke(); // plumas barradas
  poly(ctx, [-36, -50, -62, -60, -64, -46, -36, -44], '#7a4a24', 2.4, 0);
  ctx.fillStyle = '#e8d8b0'; ctx.beginPath(); ctx.ellipse(10, -50, 10, 7, 0, 0, TAU); ctx.fill();
  blob(ctx, [16, -62, 24, -76, 40, -74, 44, -60, 30, -54], '#c89058', 3, 0.4);
  poly(ctx, [40, -70, 54, -64, 48, -56, 42, -60], '#e8c040', 2, 0); // pico curvo
  poly(ctx, [24, -70, 40, -72, 38, -66, 26, -64], '#3a2010', 0, 0); // máscara
  pet_eye(ctx, 34, -68, 2.6, '#ffd23a');
  line(ctx, -2, -40, -4, -30, '#e8c040', 2.4); line(ctx, 8, -40, 8, -30, '#e8c040', 2.4);
  if (tier >= 1) poly(ctx, [-2, -66, 6, -66, 4, -58, 0, -58], '#9a140e', 1, 0); // capucha de cetrería
  if (tier >= 2) glow(ctx, 0, -54, 44, '#ff8a3a', 0.45);
}

function pet_rgbaHex(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
const PET_DRAW = { hound: pet_hound, cat: pet_cat, crow: pet_crow, hawk: pet_hawk };
export function drawPet(ctx, kind, frame = 0, tier = 0) { PET_DRAW[kind](ctx, frame, tier); }
