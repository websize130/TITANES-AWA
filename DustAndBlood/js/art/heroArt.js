// Arte procedural de los 4 héroes. Coordenadas locales: pies en (0,0), altura ≈ 185 unidades.
// drawHero = capa estática (se cachea en sprites/cartas). drawHeroFx = capa animada (llamas, chispas, humo).
import {
  INK, poly, blob, ellipse, circle, line, tatter, star, gear, skull, flame, glow, smoke,
  shade, rgba, beginArt, Art,
} from './comic.js';

export function limb(ctx, x1, y1, x2, y2, w1, w2, fill, lw = 3) {
  const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
  const nx = -dy / l, ny = dx / l;
  poly(ctx, [x1 + nx * w1, y1 + ny * w1, x2 + nx * w2, y2 + ny * w2, x2 - nx * w2, y2 - ny * w2, x1 - nx * w1, y1 - ny * w1], fill, lw);
}

export function legs(ctx, pants, boots, wide = 1, spur = null) {
  poly(ctx, [-21 * wide, -82, -3, -82, -7, -26, -27 * wide, -26], pants);
  poly(ctx, [3, -82, 21 * wide, -82, 27 * wide, -26, 7, -26], pants);
  poly(ctx, [-31 * wide, -32, -6, -32, -5, -9, 0, -6, 0, 0, -36 * wide, 0, -34 * wide, -13], boots);
  poly(ctx, [6, -32, 31 * wide, -32, 32 * wide, -11, 44 * wide, -6, 44 * wide, 0, 5, 0, 4, -13], boots);
  poly(ctx, [-32 * wide, -36, -5, -36, -5, -27, -32 * wide, -27], shade(boots, 0.12), 2.5, 0);
  poly(ctx, [5, -36, 32 * wide, -36, 32 * wide, -27, 5, -27], shade(boots, 0.12), 2.5, 0);
  if (spur) {
    star(ctx, -38 * wide, -12, 6, 6, spur, 1.5);
    star(ctx, 38 * wide, -14, 6, 6, spur, 1.5);
  }
}

export function hat(ctx, x, y, w, ch, color, band, concho, tilt = 0) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(tilt);
  poly(ctx, [-w * 0.27, 0, -w * 0.25, -ch * 0.75, -w * 0.17, -ch, -w * 0.04, -ch + 7, w * 0.04, -ch + 7, w * 0.17, -ch, w * 0.25, -ch * 0.75, w * 0.27, 0], color);
  poly(ctx, [-w * 0.27, -1, w * 0.27, -1, w * 0.265, -ch * 0.3, -w * 0.265, -ch * 0.3], band, 2.5, 0.5);
  if (concho) for (let i = -1; i <= 1; i++) circle(ctx, i * w * 0.15, -ch * 0.15, w * 0.035, concho, 1.5);
  poly(ctx, [-w / 2, -8, -w * 0.38, 2, -w * 0.2, 8, 0, 10, w * 0.2, 8, w * 0.38, 1, w / 2, -10, w * 0.3, -3, 0, -1, -w * 0.3, -2], shade(color, 0.06));
  ctx.restore();
}

function hand(ctx, x, y, r, fill) { blob(ctx, [x - r, y, x - r * 0.4, y - r, x + r * 0.6, y - r * 0.8, x + r, y + r * 0.2, x, y + r], fill, 2.5, 0.5); }

function eyes(ctx, x, y, gap, color, glowOn) {
  if (glowOn) {
    glow(ctx, x - gap, y, 9, color, 0.9);
    glow(ctx, x + gap, y, 9, color, 0.9);
  }
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.ellipse(x - gap, y, 2.8, 1.8, 0.15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(x + gap, y, 2.8, 1.8, -0.15, 0, Math.PI * 2); ctx.fill();
}

// ------------------------------------------------------------------ EL EXTERMINADOR
function hunter(ctx, p) {
  const back = [-30, -128, 30, -128, 54, -14];
  tatter(back, 54, -14, -54, -14, 9, 15, 11);
  poly(ctx, back, p.coatDark);
  if (p.ember) emberHem(ctx, back, p.band);
  legs(ctx, p.pants, p.boots, 1.05, p.metal);
  poly(ctx, [-24, -128, 24, -128, 21, -78, -21, -78], p.shirt);
  // bandolera con cartuchos
  poly(ctx, [-27, -124, -15, -129, 25, -84, 14, -78], '#3a2412', 2.5, 0.6);
  for (let i = 0; i < 6; i++) {
    const t = i / 6, x = -17 + t * 34, y = -122 + t * 40;
    poly(ctx, [x - 3, y - 6, x + 3, y - 6, x + 3, y + 3, x - 3, y + 3], p.ghost ? '#6fa8ff' : '#b3261a', 1.5, 0);
    poly(ctx, [x - 3, y + 3, x + 3, y + 3, x + 3, y + 6, x - 3, y + 6], '#c9a54a', 1.2, 0);
  }
  poly(ctx, [-23, -86, 23, -86, 23, -75, -23, -75], p.band, 2.5, 0.5);
  circle(ctx, 0, -80, 7, p.metal, 2);
  star(ctx, 0, -80, 4.5, 5, shade(p.metal, -0.4), 0);
  // paneles del abrigo
  const L = [-31, -131, -14, -129, -12, -90, -16, -48];
  tatter(L, -16, -48, -52, -22, 4, 11, 3); L.push(-46, -92);
  poly(ctx, L, p.coat);
  const R = [31, -131, 14, -129, 12, -90, 16, -48];
  tatter(R, 16, -48, 52, -22, 4, 11, 5); R.push(46, -92);
  poly(ctx, R, p.coat);
  if (p.ember) { emberHem(ctx, L, p.band); emberHem(ctx, R, p.band); }
  poly(ctx, [-14, -129, -25, -129, -12, -104], shade(p.coat, -0.3), 2.5, 0);
  poly(ctx, [14, -129, 25, -129, 12, -104], shade(p.coat, -0.3), 2.5, 0);
  star(ctx, 27, -108, 7, 5, p.metal, 2);
  // capa corta de hombros
  poly(ctx, [-38, -116, -22, -136, 22, -136, 38, -116, 28, -110, 0, -118, -28, -110], p.coat);
  // brazos y escopeta
  limb(ctx, -32, -120, -16, -92, 9, 8, p.coat);
  poly(ctx, [-40, -72, -16, -92, -9, -85, -32, -66], '#6b3f1f');
  poly(ctx, [-16, -94, 8, -98, 10, -87, -8, -84], '#3a3a3e', 2.5, 0.4);
  poly(ctx, [8, -100, 80, -110, 82, -100, 9, -89], '#2a2a2f', 3, 0.4);
  line(ctx, 10, -94, 80, -105, 'rgba(220,220,230,0.35)', 1.5);
  ellipse(ctx, 81, -105, 2.5, 5, '#111', 1.5, -0.14);
  limb(ctx, 32, -120, 44, -102, 9, 8, p.coat);
  hand(ctx, -10, -88, 7, '#4a2c17');
  hand(ctx, 47, -101, 7, '#4a2c17');
  // cabeza
  poly(ctx, [-7, -132, 7, -132, 6, -124, -6, -124], p.skin, 2, 0);
  blob(ctx, [-14, -146, -10, -158, 10, -158, 14, -146, 11, -130, 0, -126, -11, -130], p.skin);
  poly(ctx, [-15, -150, -19, -122, -11, -134], '#2a1a12', 2, 0);
  poly(ctx, [15, -150, 19, -122, 11, -134], '#2a1a12', 2, 0);
  poly(ctx, [-15, -141, 15, -141, 13, -128, 4, -121, -4, -121, -13, -128], p.scarf);
  poly(ctx, [12, -134, 24, -126, 20, -120, 10, -128], shade(p.scarf, -0.2), 2, 0);
  ctx.fillStyle = 'rgba(8,5,4,0.75)';
  ctx.fillRect(-14, -153, 28, 9);
  eyes(ctx, 0, -147, 6, p.eye, p.eyeGlow);
  hat(ctx, 0, -153, 100, 32, p.hat, p.band, p.metal, -0.04);
}

function emberHem(ctx, pts, color) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(color, 0.8); ctx.lineWidth = 2;
  ctx.beginPath();
  // solo la parte inferior (y > -60)
  let started = false;
  for (let i = 0; i < pts.length; i += 2) {
    if (pts[i + 1] > -60) { if (!started) { ctx.moveTo(pts[i], pts[i + 1]); started = true; } else ctx.lineTo(pts[i], pts[i + 1]); }
  }
  ctx.stroke();
  ctx.restore();
}

// ------------------------------------------------------------------ EL CHAMÁN PIROTÉCNICO
function arcane(ctx, p) {
  legs(ctx, p.pants, p.boots, 1, null);
  // antebrazos extendidos
  limb(ctx, -46, -104, -82, -112, 7, 6, p.glove);
  limb(ctx, 46, -104, 82, -112, 7, 6, p.glove);
  // poncho
  const pon = [-15, -136, 15, -136, 68, -102, 50, -50];
  tatter(pon, 50, -50, -50, -50, 9, 13, 21); pon.push(-68, -102);
  poly(ctx, pon, p.poncho);
  // banda decorativa con zigzag
  poly(ctx, [-58, -100, -4, -126, 4, -126, 58, -100, 54, -91, 0, -116, -54, -91], p.pattern, 2.5, 0.4);
  ctx.strokeStyle = p.ponchoDark; ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, x = -54 + t * 52, y = -94 - t * 26 + (i % 2 ? -3 : 3);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  for (let i = 0; i <= 10; i++) {
    const t = i / 10, x = 2 + t * 52, y = -120 + t * 26 + (i % 2 ? -3 : 3);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
  poly(ctx, [-36, -66, 36, -66, 32, -59, -32, -59], p.pattern, 2, 0);
  // cráneos de animal sobre el poncho
  skull(ctx, -30, -110, 0.7, p.skull); skull(ctx, 28, -108, 0.7, p.skull);
  skull(ctx, -12, -82, 0.6, p.skull); skull(ctx, 16, -78, 0.6, p.skull);
  // manos abiertas
  hand(ctx, -86, -113, 8, p.glove);
  hand(ctx, 86, -113, 8, p.glove);
  // cabeza con máscara
  blob(ctx, [-13, -146, -9, -158, 9, -158, 13, -146, 10, -131, 0, -127, -10, -131], '#8a6248');
  poly(ctx, [-15, -143, 15, -143, 14, -128, 0, -122, -14, -128], p.mask);
  ctx.fillStyle = 'rgba(8,5,4,0.8)'; ctx.fillRect(-13, -154, 26, 10);
  eyes(ctx, 0, -148, 6, p.eye, true);
  hat(ctx, 0, -154, 104, 30, p.hat, p.band, null, 0.05);
  skull(ctx, -16, -162, 0.32, p.skull, 1); skull(ctx, 0, -163, 0.32, p.skull, 1); skull(ctx, 16, -162, 0.32, p.skull, 1);
}

// ------------------------------------------------------------------ EL INGENIERO
function engineer(ctx, p) {
  legs(ctx, p.pants, p.boots, 1, null);
  poly(ctx, [-24, -128, 24, -128, 22, -78, -22, -78], p.shirt);
  // chaleco / delantal / armadura
  poly(ctx, [-26, -129, -6, -127, -7, -80, -25, -80], p.vest);
  poly(ctx, [26, -129, 6, -127, 7, -80, 25, -80], p.vest);
  if (p.hot) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = rgba(p.glow, 0.9); ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(-20, -120); ctx.lineTo(-14, -108); ctx.lineTo(-18, -96); ctx.moveTo(18, -118); ctx.lineTo(12, -104); ctx.lineTo(16, -90); ctx.stroke();
    ctx.restore();
  }
  for (let i = 0; i < 3; i++) { circle(ctx, -9, -118 + i * 12, 2.2, p.goggles, 1.2); circle(ctx, 9, -118 + i * 12, 2.2, p.goggles, 1.2); }
  // arnés
  poly(ctx, [-20, -128, -14, -128, 10, -84, 4, -84], '#2e1c10', 2, 0);
  poly(ctx, [-8, -112, 0, -112, 0, -104, -8, -104], p.goggles, 1.5, 0);
  // cinturón y herramientas
  poly(ctx, [-24, -86, 24, -86, 24, -75, -24, -75], '#2a1a10', 2.5, 0.4);
  gear(ctx, 0, -80, 9, 8, p.goggles, 0, 2);
  poly(ctx, [-26, -76, -20, -76, -22, -52, -27, -52], '#8a8a90', 2, 0);
  circle(ctx, -24.5, -50, 4, '#8a8a90', 2);
  poly(ctx, [18, -78, 30, -78, 30, -60, 18, -60], '#5a3a24', 2.5, 0.5);
  // brazo derecho abierto
  limb(ctx, 26, -124, 40, -108, 8, 7, p.shirt);
  limb(ctx, 40, -108, 54, -96, 7, 6, p.skin);
  hand(ctx, 57, -94, 7, p.glove);
  // brazo izquierdo alzado con dinamita
  limb(ctx, -26, -124, -48, -120, 8, 7, p.shirt);
  limb(ctx, -48, -120, -60, -138, 7, 6, p.skin);
  for (let i = 0; i < 3; i++) {
    const x = -70 + i * 8;
    poly(ctx, [x - 4, -178, x + 4, -178, x + 4, -138, x - 4, -138], p.dynamite, 2.5, 0.6);
  }
  poly(ctx, [-75, -162, -49, -162, -49, -156, -75, -156], INK, 0, 0);
  ctx.fillStyle = INK; ctx.fillRect(-75, -162, 26, 5);
  ctx.strokeStyle = '#d8c6a3'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-62, -178); ctx.quadraticCurveTo(-58, -188, -52, -190); ctx.stroke();
  hand(ctx, -61, -142, 8, p.glove);
  // bufanda
  poly(ctx, [-15, -132, 15, -132, 42, -124, 56, -112, 36, -116, 12, -123], p.scarf);
  // cabeza
  blob(ctx, [-13, -146, -9, -158, 9, -158, 13, -146, 11, -131, 0, -126, -11, -131], p.skin);
  poly(ctx, [-11, -136, 11, -136, 8, -128, 0, -125, -8, -128], '#3a2a1e', 1.5, 0);
  // gafas de latón
  line(ctx, -15, -147, 15, -147, '#2a1a10', 4);
  circle(ctx, -6, -147, 6, p.goggles, 2.5); circle(ctx, 6, -147, 6, p.goggles, 2.5);
  circle(ctx, -6, -147, 3.8, p.lens, 1.2); circle(ctx, 6, -147, 3.8, p.lens, 1.2);
  glow(ctx, -6, -147, 8, p.lens, 0.5); glow(ctx, 6, -147, 8, p.lens, 0.5);
  hat(ctx, 0, -154, 92, 30, p.hat, p.band, p.goggles, -0.08);
  // gafas sobre el sombrero
  circle(ctx, -10, -168, 5, p.goggles, 2); circle(ctx, 2, -169, 5, p.goggles, 2);
  circle(ctx, -10, -168, 3, shade(p.lens, -0.3), 1); circle(ctx, 2, -169, 3, shade(p.lens, -0.3), 1);
}

// ------------------------------------------------------------------ LA CAZADORA CIBER
function cyber(ctx, p) {
  // melena detrás
  blob(ctx, [-20, -160, 22, -160, 34, -130, 30, -104, 14, -118, -14, -118, -32, -104, -34, -134], p.hair, 3, 0.6);
  const back = [-20, -126, 20, -126, 50, -80, 70, -34];
  tatter(back, 70, -34, -64, -38, 9, 14, 31); back.push(-46, -82);
  poly(ctx, back, p.coatDark);
  legs(ctx, p.pants, p.boots, 0.92, null);
  poly(ctx, [-18, -127, 18, -127, 16, -80, -16, -80], p.corset);
  ctx.strokeStyle = shade(p.metal, -0.2); ctx.lineWidth = 1.2;
  ctx.beginPath(); for (let y = -122; y < -84; y += 6) { ctx.moveTo(-4, y); ctx.lineTo(4, y + 3); ctx.moveTo(4, y); ctx.lineTo(-4, y + 3); } ctx.stroke();
  // cinturón con balas
  poly(ctx, [-22, -86, 22, -86, 22, -76, -22, -76], '#2a1a10', 2.5, 0.4);
  for (let i = -18; i <= 18; i += 5) poly(ctx, [i - 1.6, -85, i + 1.6, -85, i + 1.6, -77, i - 1.6, -77], p.metal, 1, 0);
  circle(ctx, 0, -81, 7, p.metal, 2); star(ctx, 0, -81, 4.5, 5, shade(p.metal, -0.4), 0);
  // funda
  poly(ctx, [16, -78, 26, -78, 24, -50, 18, -50], '#4a2c17');
  // paneles del abrigo
  const L = [-22, -129, -13, -127, -17, -86, -30, -50];
  tatter(L, -30, -50, -48, -42, 3, 8, 13); L.push(-38, -96);
  poly(ctx, L, p.coat);
  const R = [22, -129, 13, -127, 17, -86, 30, -50];
  tatter(R, 30, -50, 50, -40, 3, 8, 17); R.push(38, -96);
  poly(ctx, R, p.coat);
  // brazos extendidos con revólveres
  limb(ctx, -22, -124, -60, -114, 9, 7, p.coat);
  limb(ctx, 22, -124, 60, -114, 9, 7, p.coat);
  poly(ctx, [-62, -120, -96, -124, -96, -116, -62, -112], p.gun, 2.5, 0.4);
  poly(ctx, [-66, -116, -76, -116, -74, -102, -66, -104], '#5a3a24', 2.5, 0.4);
  ellipse(ctx, -70, -118, 6, 5, shade(p.gun, -0.25), 2);
  poly(ctx, [62, -120, 96, -124, 96, -116, 62, -112], p.gun, 2.5, 0.4);
  poly(ctx, [66, -116, 76, -116, 74, -102, 66, -104], '#5a3a24', 2.5, 0.4);
  ellipse(ctx, 70, -118, 6, 5, shade(p.gun, -0.25), 2);
  hand(ctx, -63, -114, 7, p.glove); hand(ctx, 63, -114, 7, p.glove);
  // cabeza
  blob(ctx, [-12, -146, -9, -158, 9, -158, 12, -146, 10, -132, 0, -127, -10, -132], p.skin);
  ctx.fillStyle = INK; ctx.fillRect(-9, -134, 18, 2.2);
  ctx.fillStyle = 'rgba(8,5,4,0.55)'; ctx.fillRect(-12, -154, 24, 6);
  // tatuajes brillantes (circuito/diana)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = p.tattoo; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(-6, -142, 4, 0, Math.PI * 2); ctx.moveTo(-6, -149); ctx.lineTo(-6, -135); ctx.moveTo(-13, -142); ctx.lineTo(1, -142);
  ctx.moveTo(5, -138); ctx.lineTo(9, -134); ctx.lineTo(9, -128); ctx.stroke();
  ctx.restore();
  eyes(ctx, 0, -147, 5.5, '#2a0a0a', false);
  // trenzas
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 5; i++) ellipse(ctx, sx * 14 + sx * i * 0.6, -134 + i * 8, 3.6, 5, p.hair, 1.8);
  }
  hat(ctx, 0, -155, 90, 30, p.hat, p.band, p.metal, 0.1);
}

const DRAW = { hunter, arcane, engineer, cyber };

export function drawHero(ctx, id, pal, detail = 1, seed = 1234) {
  beginArt(seed, detail);
  ctx.save();
  if (pal.ghost) ctx.globalAlpha = 0.9;
  DRAW[id](ctx, pal);
  ctx.restore();
}

// Capa animada (cartas): llamas en manos, mecha encendida, engranajes, humo de cañones.
export function drawHeroFx(ctx, id, p, t, big = true) {
  switch (id) {
    case 'hunter':
      smoke(ctx, 82, -110, big ? 1 : 0.6, p.smoke, 0.35, t, 1);
      if (p.ember) for (let i = 0; i < 4; i++) {
        const k = (t * 0.4 + i * 0.25) % 1;
        glow(ctx, -40 + i * 26 + Math.sin(t * 2 + i) * 6, -20 - k * 110, 6, p.glow, 0.9 * (1 - k));
      }
      if (p.ghost) glow(ctx, 0, -90, 90, p.glow, 0.12 + Math.sin(t * 2) * 0.04);
      break;
    case 'arcane':
      glow(ctx, -86, -122, 46, p.fireL, 0.5);
      glow(ctx, 86, -122, 46, p.fireR, 0.5);
      flame(ctx, -86, -114, 1.25, p.fireL, p.fireL2, '#ffffff', t, 0);
      flame(ctx, 86, -114, 1.25, p.fireR, p.fireR2, '#ffffff', t, 2);
      glow(ctx, -6, -148, 7, p.eye, 0.6 + Math.sin(t * 4) * 0.2);
      glow(ctx, 6, -148, 7, p.eye, 0.6 + Math.sin(t * 4) * 0.2);
      break;
    case 'engineer': {
      const fl = 0.7 + Math.sin(t * 30) * 0.3;
      glow(ctx, -52, -190, 26 * fl, p.boom2, 0.9);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = p.boom2; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = i * 0.785 + t * 3;
        ctx.moveTo(-52, -190); ctx.lineTo(-52 + Math.cos(a) * 10 * fl, -190 + Math.sin(a) * 10 * fl);
      }
      ctx.stroke(); ctx.restore();
      if (big) {
        const gears = [[-92, -70, 16, 1], [84, -150, 13, -1.3], [90, -50, 20, 0.8], [-96, -170, 11, -1.6], [70, -10, 9, 2]];
        for (const [x, y, r, s] of gears) {
          gear(ctx, x, y + Math.sin(t * 1.5 + x) * 4, r, 8, p.gear, t * s, 2);
          if (p.hot) glow(ctx, x, y, r * 1.6, p.glow, 0.35);
        }
      }
      break;
    }
    case 'cyber':
      smoke(ctx, -98, -126, big ? 0.9 : 0.6, p.smoke, 0.35, t, 2);
      smoke(ctx, 98, -126, big ? 0.9 : 0.6, p.smoke, 0.35, t, 4);
      glow(ctx, -4, -140, 14, p.tattoo, 0.35 + Math.sin(t * 5) * 0.15);
      if (p.aura === 'gold') glow(ctx, 0, -100, 100, p.glow, 0.12 + Math.sin(t * 3) * 0.05);
      break;
    default: break;
  }
}
