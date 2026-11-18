// Forajidos: siluetas verticales firmes, gabardinas largas y estructuradas, tinta limpia y postura de duelo.
// Coordenadas locales: pies en (0,0), altura ≈ 190. Paleta cálida (ocre, carmesí, ámbar) frente a la horda fría.
import { INK, poly, blob, ellipse, circle, line, tatter, star, glow, shade, rgba, beginArt, flame } from './ink.js';

export function limb(ctx, x1, y1, x2, y2, w1, w2, fill, lw = 3) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
  poly(ctx, [x1 + nx * w1, y1 + ny * w1, x2 + nx * w2, y2 + ny * w2, x2 - nx * w2, y2 - ny * w2, x1 - nx * w1, y1 - ny * w1], fill, lw);
}

function boots(ctx, c, spur) {
  poly(ctx, [-17, -84, -4, -84, -6, -28, -19, -28], c.pants);
  poly(ctx, [4, -84, 17, -84, 21, -28, 8, -28], c.pants);
  poly(ctx, [-22, -34, -4, -34, -3, -8, 2, -5, 2, 0, -26, 0, -24, -14], c.boots);
  poly(ctx, [6, -34, 24, -34, 25, -12, 34, -6, 34, 0, 5, 0, 5, -14], c.boots);
  if (spur) { star(ctx, -28, -9, 5, 6, spur, 1.4); star(ctx, 36, -10, 5, 6, spur, 1.4); }
}

// Gabardina estructurada: paneles rectos, solapas afiladas, bajo limpio con apenas un desgarro.
function duster(ctx, c, width = 1, hemY = -14) {
  const w = 34 * width;
  const back = [-27, -136, 27, -136, w + 6, hemY, w - 8, hemY + 4, 10, hemY, -10, hemY, -(w - 8), hemY + 4, -(w + 6), hemY];
  poly(ctx, back, c.coatDark);
  return w;
}
function dusterFront(ctx, c, w, hemY = -14) {
  poly(ctx, [-29, -138, -11, -136, -9, -96, -13, -58, -16, hemY + 8, -(w + 2), hemY + 2, -(w - 2), -70, -36, -110], c.coat);
  poly(ctx, [29, -138, 11, -136, 9, -96, 13, -58, 16, hemY + 8, w + 2, hemY + 2, w - 2, -70, 36, -110], c.coat);
  // solapas afiladas
  poly(ctx, [-11, -136, -27, -134, -12, -100], shade(c.coat, -0.28), 2.5, 0);
  poly(ctx, [11, -136, 27, -134, 12, -100], shade(c.coat, -0.28), 2.5, 0);
  // costuras verticales (estructura)
  line(ctx, -22, -100, -26, hemY + 6, rgba('#000000', 0.35), 1.5);
  line(ctx, 22, -100, 26, hemY + 6, rgba('#000000', 0.35), 1.5);
  // capa de hombros
  poly(ctx, [-40, -114, -24, -142, 24, -142, 40, -114, 30, -108, 0, -118, -30, -108], c.coat);
}

export function hat(ctx, x, y, w, ch, color, band, concho, tilt = 0, flat = false) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  if (flat) poly(ctx, [-w * 0.24, 0, -w * 0.24, -ch * 0.8, w * 0.24, -ch * 0.8, w * 0.24, 0], color);
  else poly(ctx, [-w * 0.27, 0, -w * 0.25, -ch * 0.75, -w * 0.17, -ch, -w * 0.04, -ch + 7, w * 0.04, -ch + 7, w * 0.17, -ch, w * 0.25, -ch * 0.75, w * 0.27, 0], color);
  poly(ctx, [-w * 0.27, -1, w * 0.27, -1, w * 0.265, -ch * 0.28, -w * 0.265, -ch * 0.28], band, 2.5, 0.4);
  if (concho) for (let i = -1; i <= 1; i++) circle(ctx, i * w * 0.15, -ch * 0.14, w * 0.033, concho, 1.4);
  if (flat) poly(ctx, [-w / 2, -4, w / 2, -4, w / 2 - 4, 4, -w / 2 + 4, 4], shade(color, 0.08));
  else poly(ctx, [-w / 2, -8, -w * 0.38, 2, -w * 0.2, 8, 0, 10, w * 0.2, 8, w * 0.38, 1, w / 2, -10, w * 0.3, -3, 0, -1, -w * 0.3, -2], shade(color, 0.06));
  ctx.restore();
}

function hand(ctx, x, y, r, fill) { blob(ctx, [x - r, y, x - r * 0.4, y - r, x + r * 0.6, y - r * 0.8, x + r, y + r * 0.2, x, y + r], fill, 2.5, 0.4); }
function head(ctx, c, x = 0, y = -150) { blob(ctx, [x - 12, y + 4, x - 9, y - 10, x + 9, y - 10, x + 12, y + 4, x + 9, y + 18, x, y + 22, x - 9, y + 18], c.skin); }

// ------------------------------------------------------------------ SILAS "EL TUERTO"
function silas(ctx, c) {
  const w = duster(ctx, c, 1.05);
  boots(ctx, c, c.metal);
  poly(ctx, [-20, -136, 20, -136, 18, -80, -18, -80], c.shirt);
  poly(ctx, [-20, -88, 20, -88, 20, -78, -20, -78], '#1a100a', 2.5, 0);
  circle(ctx, 0, -83, 6, c.metal, 2); star(ctx, 0, -83, 3.6, 5, shade(c.metal, -0.4), 0);
  poly(ctx, [12, -82, 22, -82, 21, -56, 13, -56], '#3a2214');
  dusterFront(ctx, c, w);
  if (c.ember) { glow(ctx, -30, -18, 18, c.glow, 0.5); glow(ctx, 30, -18, 18, c.glow, 0.5); }
  star(ctx, -24, -112, 6, 5, c.metal, 1.8);
  // recortada de doble cañón, corta y fea, empuñada a la cadera
  limb(ctx, 31, -124, 44, -100, 8, 7, c.coat);
  limb(ctx, -31, -124, -18, -98, 8, 7, c.coat);
  poly(ctx, [-26, -84, -6, -98, 0, -90, -20, -76], '#5a3418');
  poly(ctx, [-4, -100, 14, -104, 16, -94, -2, -90], c.metal, 2.5, 0.4);
  poly(ctx, [12, -106, 52, -112, 54, -100, 14, -94], '#2a2a30', 3, 0.4);
  line(ctx, 14, -100, 53, -106, 'rgba(220,220,230,0.35)', 1.2);
  ellipse(ctx, 53, -109, 2, 3, '#111', 1.2); ellipse(ctx, 54, -103, 2, 3, '#111', 1.2);
  hand(ctx, -14, -94, 6.5, '#3a2214'); hand(ctx, 44, -104, 6.5, '#3a2214');
  // cabeza: parche en el ojo, barba de días
  poly(ctx, [-6, -134, 6, -134, 5, -126, -5, -126], c.skin, 2, 0);
  head(ctx, c);
  poly(ctx, [-11, -140, 11, -140, 9, -130, 0, -127, -9, -130], shade(c.skin, -0.35), 1.5, 0);
  poly(ctx, [-14, -136, 14, -136, 12, -126, -12, -126], c.scarf);
  ctx.fillStyle = 'rgba(8,5,4,0.7)'; ctx.fillRect(-12, -158, 24, 8);
  line(ctx, -13, -160, 12, -142, '#120a06', 2);
  ellipse(ctx, -5, -151, 5, 4, c.patch, 1.5);
  glow(ctx, 6, -151, 8, c.eye, 0.8);
  ctx.fillStyle = c.eye; ctx.fillRect(4, -152, 4, 2.2);
  line(ctx, -9, -158, -2, -144, rgba('#5a1a10', 0.8), 1.5); // cicatriz
  hat(ctx, 0, -158, 98, 32, c.hat, c.band, c.metal, -0.06);
}

// ------------------------------------------------------------------ MAEVE "LA SOTA DE PICAS"
function maeve(ctx, c) {
  // melena
  blob(ctx, [-18, -164, 20, -164, 28, -128, 24, -100, 12, -116, -12, -116, -26, -100, -28, -132], c.hair, 3, 0.5);
  const w = duster(ctx, c, 0.95, -10);
  boots(ctx, c, null);
  // corsé
  poly(ctx, [-16, -132, 16, -132, 14, -84, -14, -84], c.corset);
  ctx.strokeStyle = c.metal; ctx.lineWidth = 1.1; ctx.beginPath();
  for (let y = -128; y < -88; y += 6) { ctx.moveTo(-3, y); ctx.lineTo(3, y + 3); ctx.moveTo(3, y); ctx.lineTo(-3, y + 3); }
  ctx.stroke();
  poly(ctx, [-18, -88, 18, -88, 18, -79, -18, -79], '#1a0a0c', 2.5, 0);
  dusterFront(ctx, c, w, -10);
  if (c.ember) glow(ctx, 0, -40, 50, c.glow, 0.3);
  // brazo izquierdo abajo con derringer
  limb(ctx, -28, -124, -34, -94, 7, 6, c.coat);
  limb(ctx, -34, -94, -38, -74, 6, 5, c.coat);
  poly(ctx, [-44, -74, -36, -74, -36, -60, -44, -60], '#2a2a30', 2, 0);
  hand(ctx, -38, -74, 5.5, c.skin);
  // brazo derecho alzado con abanico de naipes
  limb(ctx, 28, -124, 46, -128, 7, 6, c.coat);
  limb(ctx, 46, -128, 56, -146, 6, 5, c.coat);
  for (let i = -2; i <= 2; i++) {
    ctx.save(); ctx.translate(58, -150); ctx.rotate(i * 0.22);
    poly(ctx, [-6, -28, 6, -28, 6, -2, -6, -2], c.card, 2, 0);
    ctx.fillStyle = i === 0 ? '#120a06' : (i % 2 ? '#a01a14' : '#120a06');
    ctx.font = 'bold 9px serif'; ctx.textAlign = 'center'; ctx.fillText(i === 0 ? '♠' : i % 2 ? '♥' : '♣', 0, -12);
    ctx.restore();
  }
  hand(ctx, 57, -148, 5.5, c.skin);
  // cabeza
  head(ctx, c, 0, -150);
  ctx.fillStyle = 'rgba(8,5,4,0.5)'; ctx.fillRect(-11, -158, 22, 5);
  ctx.fillStyle = c.eye; ctx.fillRect(-7, -151, 4, 2); ctx.fillRect(3, -151, 4, 2);
  ctx.fillStyle = c.lips; ctx.fillRect(-4, -136, 8, 2.5);
  // mechones al frente
  poly(ctx, [-13, -160, -18, -122, -10, -140], c.hair, 2, 0);
  poly(ctx, [13, -160, 16, -126, 9, -144], c.hair, 2, 0);
  hat(ctx, 2, -160, 84, 28, c.hat, c.band, null, 0.16);
  // pluma
  poly(ctx, [-14, -176, -40, -198, -34, -186, -48, -190, -20, -172], '#1a1010', 2, 0);
}

// ------------------------------------------------------------------ CALEB BLACKWOOD
function caleb(ctx, c) {
  const w = duster(ctx, c, 1.18, -12);
  boots(ctx, c, null);
  poly(ctx, [-22, -136, 22, -136, 20, -80, -20, -80], c.shirt);
  if (c.plate) { poly(ctx, [-20, -132, 20, -132, 18, -92, 0, -84, -18, -92], c.metal); line(ctx, 0, -130, 0, -88, INK, 2); }
  // bandolera
  poly(ctx, [-24, -132, -14, -136, 24, -90, 14, -86], '#2a1a10', 2.5, 0);
  for (let i = 0; i < 5; i++) { const t = i / 5, x = -15 + t * 32, y = -128 + t * 38; poly(ctx, [x - 3, y - 5, x + 3, y - 5, x + 3, y + 4, x - 3, y + 4], '#9a2a14', 1.4, 0); }
  poly(ctx, [-22, -88, 22, -88, 22, -78, -22, -78], '#1a100a', 2.5, 0);
  circle(ctx, 0, -83, 6, c.metal, 2);
  dusterFront(ctx, c, w, -12);
  // cruz colgante y rosario
  ctx.strokeStyle = c.metal; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(-8, -134); ctx.quadraticCurveTo(-4, -110, 0, -104); ctx.stroke();
  poly(ctx, [-2, -106, 2, -106, 2, -90, -2, -90], c.metal, 1.5, 0); poly(ctx, [-6, -101, 6, -101, 6, -97, -6, -97], c.metal, 1.5, 0);
  // rifle monotiro largo de precisión, terciado y con mira de latón
  limb(ctx, -32, -126, -36, -98, 9, 8, c.coat);
  limb(ctx, 32, -126, 30, -104, 9, 8, c.coat);
  line(ctx, -50, -70, 96, -150, INK, 9); line(ctx, -50, -70, 4, -100, '#5a3418', 5.5);
  line(ctx, 2, -99, 96, -150, '#2a2a30', 3.5);
  poly(ctx, [10, -110, 40, -126, 42, -121, 12, -105], c.metal, 2, 0);
  circle(ctx, 12, -108, 3, c.metal, 1.2);
  hand(ctx, -32, -92, 7, '#2a1a10'); hand(ctx, 32, -102, 7, '#2a1a10');
  // cuaderno de versos al cinto
  poly(ctx, [-26, -80, -12, -80, -12, -62, -26, -62], '#3a2414', 2, 0); line(ctx, -24, -76, -14, -76, '#e8dcc0', 1);
  // cabeza y alzacuellos
  poly(ctx, [-8, -136, 8, -136, 7, -128, -7, -128], c.collar, 2, 0);
  head(ctx, c, 0, -152);
  poly(ctx, [-10, -140, 10, -140, 8, -132, 0, -129, -8, -132], '#4a4040', 1.5, 0); // barba gris
  ctx.fillStyle = 'rgba(8,5,4,0.7)'; ctx.fillRect(-12, -160, 24, 8);
  glow(ctx, -5, -154, 6, c.eye, 0.6); glow(ctx, 5, -154, 6, c.eye, 0.6);
  ctx.fillStyle = c.eye; ctx.fillRect(-7, -155, 4, 2); ctx.fillRect(3, -155, 4, 2);
  hat(ctx, 0, -160, 104, 22, c.hat, c.band, null, 0, true);
  if (c.halo) { ctx.strokeStyle = c.glow; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -186, 26, 7, 0, 0, Math.PI * 2); ctx.stroke(); glow(ctx, 0, -186, 34, c.glow, 0.6); }
}

// ------------------------------------------------------------------ BARNABY "TRIPAS" McGOVERN
function barnaby(ctx, c) {
  const w = duster(ctx, c, 1.1, -22);
  boots(ctx, c, null);
  // barriga y camisa
  blob(ctx, [-30, -134, 30, -134, 38, -104, 32, -76, -32, -76, -38, -104], c.shirt);
  // chaleco abierto
  poly(ctx, [-32, -134, -12, -132, -16, -78, -34, -82, -40, -104], c.coat);
  poly(ctx, [32, -134, 12, -132, 16, -78, 34, -82, 40, -104], c.coat);
  // delantal de carnicero manchado
  poly(ctx, [-22, -122, 22, -122, 26, -40, -26, -40], c.apron);
  ctx.fillStyle = c.blood; for (const [x, y, r] of [[-8, -100, 6], [10, -80, 8], [-14, -60, 5], [6, -52, 4], [16, -110, 3]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.7, 0.4, 0, Math.PI * 2); ctx.fill(); }
  line(ctx, -22, -122, -30, -134, '#2a1a10', 2); line(ctx, 22, -122, 30, -134, '#2a1a10', 2);
  poly(ctx, [-34, -86, 34, -86, 34, -78, -34, -78], '#2a1a10', 2.5, 0);
  // cuchillo de carnicero al cinto
  poly(ctx, [26, -84, 40, -84, 40, -64, 30, -60], c.metal, 2, 0); poly(ctx, [24, -90, 30, -90, 30, -84, 24, -84], '#3a2414', 1.5, 0);
  // brazos con dos revólveres
  limb(ctx, -36, -126, -54, -100, 9, 8, c.shirt); limb(ctx, -54, -100, -62, -84, 8, 7, c.skin);
  limb(ctx, 36, -126, 56, -110, 9, 8, c.shirt); limb(ctx, 56, -110, 70, -104, 8, 7, c.skin);
  poly(ctx, [-66, -84, -60, -84, -60, -60, -66, -60], '#2a2a30', 2, 0); poly(ctx, [-70, -86, -58, -86, -58, -80, -70, -80], c.metal, 1.5, 0);
  poly(ctx, [70, -108, 98, -110, 98, -102, 70, -100], c.metal, 2.5, 0.3); poly(ctx, [72, -102, 80, -102, 78, -90, 72, -92], '#5a3a24', 2, 0);
  hand(ctx, -63, -82, 6.5, c.skin); hand(ctx, 72, -104, 6.5, c.skin);
  // cabeza redonda, bigote de manillar, sonrisa torcida
  head(ctx, c, 0, -150);
  blob(ctx, [-16, -140, -6, -144, 0, -140, 6, -144, 16, -140, 20, -134, 6, -137, 0, -134, -6, -137, -20, -134], c.mustache, 2, 0);
  line(ctx, -4, -131, 6, -132, INK, 1.8);
  ctx.fillStyle = 'rgba(8,5,4,0.55)'; ctx.fillRect(-12, -158, 24, 6);
  ctx.fillStyle = c.eye; ctx.fillRect(-7, -153, 4, 2); ctx.fillRect(3, -154, 4, 2);
  // bombín
  ctx.save(); ctx.translate(0, -160);
  blob(ctx, [-16, 0, -16, -18, -8, -26, 8, -26, 16, -18, 16, 0], c.hat);
  poly(ctx, [-16, -3, 16, -3, 16, -8, -16, -8], c.band, 2, 0);
  poly(ctx, [-26, 0, 26, 0, 22, 5, -22, 5], shade(c.hat, 0.08));
  ctx.restore();
  if (c.ember) glow(ctx, 0, -60, 46, c.glow, 0.3);
}

const DRAW_HERO = { silas, maeve, caleb, barnaby };

export function drawHero(ctx, id, pal, detail = 1, seed = 1234) {
  beginArt(seed, detail);
  DRAW_HERO[id](ctx, pal);
}

// Capa animada para cartas/dossier: humo del cañón, brillo de ojos, brasas.
export function drawHeroFx(ctx, id, c, t) {
  if (c.ember) for (let i = 0; i < 5; i++) {
    const k = (t * 0.35 + i * 0.2) % 1;
    glow(ctx, -40 + i * 20 + Math.sin(t * 2 + i) * 6, -20 - k * 140, 6, c.glow, 0.9 * (1 - k));
  }
  if (id === 'silas') glow(ctx, 6, -151, 10, c.eye, 0.4 + Math.sin(t * 3) * 0.2);
  if (id === 'maeve') glow(ctx, 58, -164, 24, c.glow, 0.25 + Math.sin(t * 2.4) * 0.12);
  if (id === 'caleb') glow(ctx, 96, -150, 14, c.glow, 0.3 + Math.sin(t * 5) * 0.15);
  if (id === 'barnaby') glow(ctx, 98, -106, 14, c.glow, 0.3 + Math.sin(t * 6) * 0.15);
}
