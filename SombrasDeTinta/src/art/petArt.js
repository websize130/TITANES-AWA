// Mascotas en tinta con anatomía 2D legible: sabueso espectral y gato negro (rig cuadrúpedo compartido con la
// horda) y cuervo/halcón (rig de ave). Mirando a la derecha, suelo en y = 0.
// Fotogramas: 0–3 galope/aleteo · 4 ataque (mordisco, zarpazo o picado). tier 0–2 añade detalles.
import { INK, TAU, glow, shade, circle, star } from './ink.js';
import { quadRig, capsule, cel } from './zombieArt.js';

function petHound(ctx, f, tier) {
  glow(ctx, 0, -46, 64, '#9ac8ff', 0.3);
  quadRig(ctx, f, {
    body: '#b4c8de', head: '#c4d6ea', eye: '#e8f6ff', legW: 4.8, muzzle: 15, fangs: f === 4, len: 0.95, height: 0.86,
    ears(c) { cel(c, [-6, -12, -4, -26, 4, -14], '#8aa2bc', 2, 0); },
    tail(c, ph, L, H) { // cola de jirones espectrales
      c.globalAlpha = 0.75; capsule(c, [-48 * L, -58 * H, -64 * L, -66 * H + Math.sin(ph) * 6, -80 * L, -60 * H + Math.sin(ph) * 8], 3.4, '#a8c0d8'); c.globalAlpha = 1;
    },
    bodyFx(c, L, H) {
      c.strokeStyle = 'rgba(40,60,90,0.45)'; c.lineWidth = 1.3; c.beginPath(); for (let i = 0; i < 3; i++) { const x = (-4 + i * 9) * L; c.moveTo(x, -64 * H); c.quadraticCurveTo(x + 4, -52 * H, x, -42 * H); } c.stroke();
      if (tier >= 1) cel(c, [36 * L, -62 * H, 46 * L, -52 * H, 30 * L, -46 * H], '#9a140e', 1.6, 0); // pañuelo de Silas
    },
    front(c, hx, hy) { if (tier >= 2) for (let i = 0; i < 3; i++) glow(c, -30 + i * 24, -74 - i * 3, 12, '#ffb347', 0.5); },
  });
}

function petCat(ctx, f, tier) {
  quadRig(ctx, f, {
    body: '#24222c', head: '#2c2a36', eye: '#d8ff6a', legW: 3.6, muzzle: 6, fangs: f === 4, len: 0.72, height: 0.72, whiskers: true,
    ears(c) { cel(c, [-6, -12, -6, -26, 3, -15], '#1c1a22', 2, 0); cel(c, [4, -15, 10, -27, 12, -13], '#1c1a22', 2, 0); c.fillStyle = '#7a2a3a'; c.beginPath(); c.moveTo(-4, -14); c.lineTo(-4, -22); c.lineTo(0, -15); c.fill(); },
    tail(c, ph, L, H, atk) { // cola alzada en signo de interrogación
      capsule(c, [-48 * L, -56 * H, -62 * L, -72 * H, -60 * L, -96 * H + Math.sin(ph) * 3, -48 * L, -102 * H], 3, '#24222c');
    },
    bodyFx(c, L, H) {
      c.fillStyle = 'rgba(200,190,255,0.16)'; c.beginPath(); c.ellipse(-6 * L, -64 * H, 18 * L, 3, -0.05, 0, TAU); c.fill();
      // collar con naipe de picas (Maeve)
      c.strokeStyle = '#9a140e'; c.lineWidth = 3; c.beginPath(); c.moveTo(40 * L, -66 * H); c.lineTo(46 * L, -48 * H); c.stroke();
      cel(c, [42 * L, -50 * H, 50 * L, -50 * H, 50 * L, -38 * H, 42 * L, -38 * H], '#efe2c4', 1.4, 0);
      c.fillStyle = INK; c.font = 'bold 8px serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♠', 46 * L, -44 * H);
    },
    front(c, hx, hy) { if (tier >= 2) { glow(c, hx + 2, hy - 22, 16, '#e07a3a', 0.6); star(c, hx + 2, hy - 22, 6, 5, '#ffd27a', 1.2); } },
  });
}

// ------------------------------------------------------------------ AVES (cuervo y halcón)
// Cuerpo en gota, cabeza con pico propio, alas con primarias separadas y cola en abanico.
// Aleteo: arriba · medio · abajo · medio. Ataque: picado con alas plegadas y garras adelante.
function petWing(ctx, rot, fill, far, span) {
  ctx.save(); ctx.translate(2, -58); ctx.rotate(rot); ctx.scale(span, span);
  const w = [0, 0, 8, -8, 6, -26, -2, -44, -8, -46, -10, -38, -16, -40, -17, -32, -22, -32, -21, -22, -24, -18, -18, -8, -10, -2];
  cel(ctx, w, far ? shade(fill, -0.25) : fill, 2.4, 0.35);
  ctx.strokeStyle = 'rgba(10,6,5,0.55)'; ctx.lineWidth = 1.1; ctx.beginPath();
  ctx.moveTo(2, -6); ctx.lineTo(-6, -40); ctx.moveTo(0, -4); ctx.lineTo(-14, -34); ctx.moveTo(-2, -2); ctx.lineTo(-19, -24); ctx.stroke();
  ctx.restore();
}
function birdRig(ctx, f, o) {
  const atk = f === 4, rot = atk ? 1.45 : [-0.35, 0.55, 1.5, 0.55][f];
  ctx.save(); if (atk) { ctx.translate(6, 8); ctx.rotate(0.35); }
  petWing(ctx, rot - 0.25, o.wing, true, o.span);
  cel(ctx, [-30, -52, -50, -60, -54, -50, -50, -44, -30, -46], o.tail, 2.2, 0.3); // cola en abanico
  cel(ctx, [-32, -50, -16, -62, 8, -64, 22, -58, 24, -48, 10, -40, -12, -40], o.body, 2.6, 0.45);
  if (o.chest) { ctx.save(); ctx.beginPath(); ctx.ellipse(10, -48, 12, 7, 0, 0, TAU); ctx.fillStyle = o.chest; ctx.fill(); ctx.restore(); if (o.bars) { ctx.strokeStyle = 'rgba(60,30,10,0.55)'; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(2 + i * 4, -54); ctx.lineTo(1 + i * 4, -44); } ctx.stroke(); } }
  // garras: recogidas en vuelo, extendidas al atacar
  const lx = atk ? 26 : 2, ly = atk ? -34 : -36;
  capsule(ctx, [0, -42, lx, ly], 1.6, o.feet); capsule(ctx, [8, -42, lx + 8, ly + 2], 1.6, o.feet);
  if (atk) for (const x of [lx, lx + 8]) { ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, ly); ctx.lineTo(x + 5, ly + 4); ctx.moveTo(x, ly); ctx.lineTo(x + 2, ly + 6); ctx.stroke(); }
  // cabeza y pico
  cel(ctx, [16, -60, 20, -72, 32, -74, 40, -66, 36, -56, 24, -54], o.head, 2.4, 0.4);
  if (o.mask) cel(ctx, [24, -68, 38, -70, 37, -64, 25, -62], o.mask, 0, 0);
  cel(ctx, o.beak, o.beakCol, 2, 0.3);
  ctx.fillStyle = '#0a0605'; ctx.beginPath(); ctx.arc(31, -67, 2.6, 0, TAU); ctx.fill();
  glow(ctx, 31, -67, 7, o.eye, 1); ctx.fillStyle = o.eye; ctx.fillRect(30.5, -68.5, 2, 2);
  petWing(ctx, rot, o.wing, false, o.span);
  if (o.extra) o.extra(ctx);
  ctx.restore();
}
function petCrow(ctx, f, tier) {
  birdRig(ctx, f, {
    body: '#1a1a24', head: '#20202a', wing: '#24242e', tail: '#14141c', feet: '#3a3a40', eye: '#ff4a3a', span: 0.95,
    beak: [38, -70, 56, -66, 38, -62], beakCol: '#3e3e46',
    extra(c) {
      if (tier >= 1) { c.strokeStyle = '#c8a24a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(22, -56); c.lineTo(28, -46); c.stroke(); circle(c, 28, -44, 2.4, '#c8a24a', 1); } // relicario del poeta
      if (tier >= 2) glow(c, 0, -56, 40, '#cfd8e6', 0.45);
    },
  });
}
function petHawk(ctx, f, tier) {
  birdRig(ctx, f, {
    body: '#9a6a3c', head: '#b88452', wing: '#8a5a30', tail: '#7a4a24', feet: '#e8c040', eye: '#ffd23a', span: 1.1, chest: '#e8d8b0', bars: true,
    beak: [37, -71, 48, -67, 46, -60, 39, -62], beakCol: '#e8c040', mask: '#3a2010',
    extra(c) {
      if (tier >= 1) cel(c, [20, -74, 28, -76, 28, -70, 22, -68], '#9a140e', 1, 0); // capucha de cetrería
      if (tier >= 2) glow(c, 0, -56, 44, '#ff8a3a', 0.45);
    },
  });
}

const PET_DRAW = { hound: petHound, cat: petCat, crow: petCrow, hawk: petHawk };
export function drawPet(ctx, kind, frame = 0, tier = 0) { PET_DRAW[kind](ctx, frame, tier); }
