// Bestiario procedural en tinta: 6 enemigos + 4 jefes. Pies en (0,0). Escala "héroe" (~170 u de alto).
import { INK, poly, blob, ellipse, circle, line, tatter, star, skull, flame, glow, shade, beginArt } from './comic.js';
import { limb, legs, hat } from './heroArt.js';

function claw(ctx, x, y, dir, skin, tip = '#7a1010') {
  blob(ctx, [x - 7, y - 3, x, y - 8, x + 7, y - 3, x + 5, y + 6, x - 5, y + 6], skin, 2.5, 0.4);
  ctx.lineCap = 'round';
  for (let i = -1.5; i <= 1.5; i += 1) {
    const fx = x + dir * 6, fy = y + i * 4;
    ctx.strokeStyle = INK; ctx.lineWidth = 4.5;
    ctx.beginPath(); ctx.moveTo(fx - dir * 4, fy); ctx.lineTo(fx + dir * 8, fy + i * 2 + 3); ctx.stroke();
    ctx.strokeStyle = skin; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(fx - dir * 4, fy); ctx.lineTo(fx + dir * 8, fy + i * 2 + 3); ctx.stroke();
    ctx.fillStyle = tip; ctx.fillRect(fx + dir * 7 - 1.5, fy + i * 2 + 1.5, 3, 3);
  }
}

function zombieHead(ctx, x, y, skin, eye, s = 1) {
  blob(ctx, [x - 13 * s, y - 2, x - 10 * s, y - 15 * s, x + 10 * s, y - 15 * s, x + 13 * s, y - 2, x + 10 * s, y + 13 * s, x, y + 16 * s, x - 10 * s, y + 13 * s], skin);
  poly(ctx, [x - 8 * s, y + 4 * s, x + 8 * s, y + 4 * s, x + 6 * s, y + 12 * s, x - 6 * s, y + 12 * s], '#3a0806', 2, 0);
  ctx.fillStyle = '#e8dcc0';
  for (let i = -6; i <= 5; i += 2.6) { ctx.fillRect(x + i * s, y + 4 * s, 1.8 * s, 3 * s); ctx.fillRect(x + i * s, y + 9 * s, 1.8 * s, 3 * s); }
  ctx.fillStyle = 'rgba(120,10,10,0.7)'; ctx.fillRect(x - 6 * s, y + 12 * s, 3 * s, 5 * s);
  glow(ctx, x - 5 * s, y - 4 * s, 7 * s, eye, 0.9); glow(ctx, x + 5 * s, y - 4 * s, 7 * s, eye, 0.9);
  ctx.fillStyle = eye;
  ctx.fillRect(x - 7 * s, y - 5 * s, 4 * s, 2.4 * s); ctx.fillRect(x + 3 * s, y - 5 * s, 4 * s, 2.4 * s);
}

function wounds(ctx, pts) {
  ctx.fillStyle = 'rgba(120,14,10,0.75)';
  for (let i = 0; i < pts.length; i += 3) {
    ctx.beginPath(); ctx.ellipse(pts[i], pts[i + 1], pts[i + 2], pts[i + 2] * 0.7, 0.4, 0, Math.PI * 2); ctx.fill();
  }
}

// ------------------------------------------------------------------ FORAJIDO PUTREFACTO
function outlaw(ctx) {
  const skin = '#8f9a72';
  legs(ctx, '#3a2a22', '#4a2c17', 1.1, '#b08a3a');
  limb(ctx, -50, -98, -76, -86, 8, 6, '#c9b48a'); limb(ctx, 50, -98, 76, -86, 8, 6, '#c9b48a');
  const pon = [-16, -130, 16, -130, 68, -98, 52, -56];
  tatter(pon, 52, -56, -52, -56, 9, 15, 41); pon.push(-68, -98);
  poly(ctx, pon, '#9a2a1a');
  poly(ctx, [-56, -94, 0, -124, 56, -94, 52, -86, 0, -114, -52, -86], '#d9bf94', 2, 0.3);
  ctx.fillStyle = INK;
  for (const [x, y, r] of [[-30, -78, 4], [22, -70, 5], [36, -96, 3], [-8, -100, 3]]) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); }
  poly(ctx, [-12, -62, 12, -62, 10, -54, -10, -54], '#5a3a22', 2, 0);
  claw(ctx, -84, -84, -1, skin); claw(ctx, 84, -84, 1, skin);
  zombieHead(ctx, 0, -138, skin, '#ff8a1a');
  hat(ctx, 0, -146, 86, 28, '#5a3a22', '#3a2414', '#b08a3a', -0.12);
  wounds(ctx, [-20, -140, 3, 40, -88, 3]);
}

// ------------------------------------------------------------------ MINERO MALDITO
function miner(ctx) {
  const skin = '#9aa27a';
  legs(ctx, '#2e2622', '#4a2c17', 1.3, null);
  // pico
  line(ctx, -88, -48, -52, -150, INK, 9); line(ctx, -88, -48, -52, -150, '#6b3f1f', 5);
  poly(ctx, [-86, -150, -60, -168, -30, -162, -6, -140, -34, -150, -54, -148, -74, -138], '#8a8a90', 3, 0.6);
  ctx.fillStyle = 'rgba(150,10,10,0.8)'; ctx.fillRect(-26, -158, 10, 8);
  blob(ctx, [-44, -148, 44, -148, 52, -100, 40, -70, -40, -70, -52, -100], '#c8b48e');
  poly(ctx, [-46, -146, -14, -146, -16, -72, -40, -72, -50, -100], '#3a2418');
  poly(ctx, [46, -146, 14, -146, 16, -72, 40, -72, 50, -100], '#3a2418');
  // dinamita en el pecho
  for (const gx of [-28, 16]) {
    for (let i = 0; i < 3; i++) {
      const x = gx + i * 6;
      poly(ctx, [x - 3, -130, x + 3, -130, x + 3, -102, x - 3, -102], '#d42a14', 2, 0.3);
    }
    glow(ctx, gx + 6, -116, 26, '#ff4a12', 0.55);
    line(ctx, gx + 6, -130, gx + 9, -138, '#d8c6a3', 1.5);
  }
  poly(ctx, [-50, -112, 50, -112, 50, -104, -50, -104], '#2a1a10', 2.5, 0);
  poly(ctx, [-44, -80, 44, -80, 44, -70, -44, -70], '#2a1a10', 2.5, 0);
  circle(ctx, 0, -75, 7, '#9a7a3a', 2);
  // brazos
  limb(ctx, -46, -138, -62, -110, 13, 12, '#c8b48e'); limb(ctx, -62, -110, -66, -88, 11, 10, skin);
  limb(ctx, 46, -138, 66, -108, 13, 12, '#c8b48e'); limb(ctx, 66, -108, 72, -78, 11, 10, skin);
  claw(ctx, -66, -84, -1, skin); claw(ctx, 74, -72, 1, skin);
  zombieHead(ctx, 0, -158, skin, '#ff3a1a', 1.05);
  // casco con vela
  poly(ctx, [-24, -166, -20, -184, -8, -192, 8, -192, 20, -184, 24, -166], '#7a5a2a');
  poly(ctx, [-30, -168, 30, -168, 26, -160, -26, -160], '#5a3e1c', 2.5, 0.4);
  poly(ctx, [-6, -192, 6, -192, 6, -210, -6, -210], '#e8dcbc', 2.5, 0.3);
  flame(ctx, 0, -210, 0.5, '#ff6a12', '#ffb02a', '#fff6c0', 0, 1);
  glow(ctx, 0, -218, 30, '#ffa040', 0.6);
  wounds(ctx, [-30, -96, 4, 56, -96, 3]);
}

// ------------------------------------------------------------------ CHAMÁN CORRUPTO
function shaman(ctx) {
  const robe = [-18, -130, 18, -130, 46, -62, 56, -4];
  tatter(robe, 56, -4, -56, -4, 10, 12, 51); robe.push(-46, -62);
  poly(ctx, robe, '#3e2234');
  ctx.strokeStyle = '#d8b07a'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let i = 0; i < 9; i++) { const x = -42 + i * 10.5; ctx.lineTo(x, -40 + (i % 2 ? -5 : 5)); } ctx.stroke();
  const cape = [-22, -134, 22, -134, 60, -96, 50, -70];
  tatter(cape, 50, -70, -50, -70, 8, 12, 53); cape.push(-60, -96);
  poly(ctx, cape, '#7a2a1e');
  // collar de plumas
  for (let i = 0; i < 14; i++) {
    const a = Math.PI + (i / 13) * Math.PI;
    const x = Math.cos(a) * 34, y = -130 + Math.sin(a) * 14;
    poly(ctx, [x - 4, y + 4, x + Math.cos(a) * 26, y + Math.sin(a) * 18 - 4, x + 4, y + 4], i % 3 === 0 ? '#2a1a1a' : i % 3 === 1 ? '#8a2a1e' : '#6a4a3a', 2, 0);
  }
  // cinturón y medallones
  poly(ctx, [-30, -86, 30, -86, 30, -76, -30, -76], '#5a3a1e', 2.5, 0);
  for (const x of [-18, 0, 18]) { circle(ctx, x, -81, 6, '#c9a54a', 2); star(ctx, x, -81, 3.5, 8, '#7a5a1a', 0); }
  // brazos huesudos
  limb(ctx, -40, -112, -76, -116, 6, 4, '#d8c8a0'); limb(ctx, 40, -112, 76, -116, 6, 4, '#d8c8a0');
  claw(ctx, -82, -116, -1, '#d8c8a0', '#6a1a6a'); claw(ctx, 82, -116, 1, '#d8c8a0', '#6a1a6a');
  glow(ctx, -86, -122, 40, '#b04dff', 0.6); glow(ctx, 86, -122, 40, '#b04dff', 0.6);
  flame(ctx, -86, -116, 0.8, '#9a3aff', '#d08aff', '#fff', 0.3, 1);
  flame(ctx, 86, -116, 0.8, '#9a3aff', '#d08aff', '#fff', 0.7, 2);
  // capucha + cráneo de búfalo
  blob(ctx, [-22, -134, -20, -170, 0, -182, 20, -170, 22, -134], '#2a1620');
  poly(ctx, [-16, -168, 16, -168, 14, -150, 6, -132, -6, -132, -14, -150], '#d8c8a0');
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(-7, -156, 4.5, 5.5, 0.3, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(7, -156, 4.5, 5.5, -0.3, 0, Math.PI * 2); ctx.fill();
  glow(ctx, -7, -156, 10, '#c06bff', 1); glow(ctx, 7, -156, 10, '#c06bff', 1);
  ctx.fillStyle = '#e2a6ff'; ctx.fillRect(-9, -157, 4, 2.4); ctx.fillRect(5, -157, 4, 2.4);
  line(ctx, 0, -168, 0, -146, '#9a1a1a', 2);
  // cuernos
  poly(ctx, [-14, -168, -36, -174, -54, -190, -50, -198, -42, -184, -24, -178, -12, -176], '#8a6a3a', 3, 0.4);
  poly(ctx, [14, -168, 36, -174, 54, -190, 50, -198, 42, -184, 24, -178, 12, -176], '#8a6a3a', 3, 0.4);
  for (let i = 0; i < 5; i++) skull(ctx, -16 + i * 8, -120 + (i % 2) * 3, 0.22, '#e8dcc0', 1);
}

// ------------------------------------------------------------------ SABUESO DEL DESIERTO (vista lateral)
function hound(ctx) {
  const fur = '#6a5a5e', furD = '#4a3e42', bone = '#d8c8a0';
  limb(ctx, -36, -48, -48, -6, 8, 6, furD); limb(ctx, 26, -48, 22, -6, 8, 6, furD);
  const body = [-58, -58, -36, -88, 6, -94, 40, -84, 56, -64, 36, -40, -18, -38, -50, -44];
  blob(ctx, body, fur);
  // lomo erizado
  const sp = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12, x = -58 + t * 100, y = -60 - Math.sin(t * Math.PI) * 32;
    sp.push(x, y + 6, x + 4, y - 10 - (i % 2) * 6);
  }
  sp.push(44, -66, -56, -56);
  poly(ctx, sp, shade(fur, 0.08), 2.5, 0.6);
  wounds(ctx, [-20, -66, 6, 10, -58, 5, -40, -54, 4]);
  limb(ctx, -24, -46, -30, -4, 9, 7, fur); limb(ctx, 38, -50, 46, -4, 9, 7, fur);
  for (const x of [-30, 46, -48, 22]) { ctx.strokeStyle = bone; ctx.lineWidth = 2; ctx.beginPath(); for (let i = -1; i <= 1; i++) { ctx.moveTo(x + i * 4, -4); ctx.lineTo(x + i * 5 + 3, 2); } ctx.stroke(); }
  // collar
  poly(ctx, [34, -92, 48, -96, 58, -60, 44, -56], '#6a4424', 2.5, 0.3);
  for (let i = 0; i < 3; i++) circle(ctx, 42 + i * 3, -86 + i * 11, 2.6, '#c9a54a', 1.2);
  // cabeza con fauces abiertas
  blob(ctx, [44, -98, 58, -112, 80, -104, 98, -92, 92, -84, 70, -80, 52, -72], fur);
  poly(ctx, [56, -112, 52, -128, 62, -114], furD, 2.5, 0); poly(ctx, [66, -110, 66, -126, 72, -108], furD, 2.5, 0);
  poly(ctx, [56, -74, 74, -76, 96, -70, 90, -60, 70, -60, 54, -64], shade(fur, -0.15));
  poly(ctx, [70, -82, 94, -84, 92, -72, 70, -70], '#3a0806', 2, 0);
  ctx.fillStyle = '#efe6cc';
  for (let i = 0; i < 5; i++) {
    const x = 72 + i * 4.5;
    poly(ctx, [x, -83, x + 2.5, -76, x + 4, -83], '#efe6cc', 1, 0);
    poly(ctx, [x, -70, x + 2.5, -77, x + 4, -70], '#efe6cc', 1, 0);
  }
  circle(ctx, 98, -92, 3, INK, 0);
  glow(ctx, 70, -98, 14, '#9dff3a', 1);
  ctx.fillStyle = '#d8ff7a'; ctx.beginPath(); ctx.ellipse(70, -98, 5, 3, -0.2, 0, Math.PI * 2); ctx.fill();
  // baba tóxica
  glow(ctx, 84, -58, 22, '#7aff2a', 0.7);
  ctx.fillStyle = '#9dff3a';
  for (const [x, l] of [[76, 18], [86, 12], [92, 22]]) { ctx.beginPath(); ctx.ellipse(x, -66 + l / 2, 2, l / 2, 0, 0, Math.PI * 2); ctx.fill(); }
  // cola
  poly(ctx, [-56, -60, -84, -84, -92, -78, -78, -70, -60, -50], furD, 2.5, 0.4);
}

// ------------------------------------------------------------------ FRANCOTIRADOR ESPECTRAL
function sniper(ctx) {
  const wrap = '#c9bd9e';
  legs(ctx, wrap, '#3a3430', 0.95, null);
  ctx.strokeStyle = 'rgba(40,30,20,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); for (let y = -78; y < -30; y += 7) { ctx.moveTo(-26, y); ctx.lineTo(-4, y + 4); ctx.moveTo(4, y + 3); ctx.lineTo(26, y); } ctx.stroke();
  const coat = [-22, -130, 22, -130, 44, -60, 52, -14];
  tatter(coat, 52, -14, -52, -14, 9, 14, 61); coat.push(-44, -60);
  poly(ctx, coat, '#3a4038');
  poly(ctx, [-18, -130, 18, -130, 14, -78, -14, -78], wrap);
  ctx.beginPath(); for (let y = -126; y < -80; y += 6) { ctx.moveTo(-16, y); ctx.lineTo(16, y + 3); } ctx.stroke();
  // rifle largo en diagonal
  line(ctx, -40, -66, 96, -140, INK, 9); line(ctx, -40, -66, 96, -140, '#5a3a24', 5);
  line(ctx, 10, -94, 110, -148, INK, 6); line(ctx, 10, -94, 110, -148, '#7a8288', 3);
  limb(ctx, -22, -124, -6, -92, 7, 6, '#3a4038'); limb(ctx, 22, -124, 44, -118, 7, 6, '#3a4038');
  circle(ctx, -4, -90, 6, wrap, 2); circle(ctx, 46, -118, 6, wrap, 2);
  // cabeza vendada, ojo espectral
  blob(ctx, [-12, -146, -9, -158, 9, -158, 12, -146, 10, -131, 0, -127, -10, -131], wrap);
  ctx.beginPath(); for (let y = -154; y < -130; y += 5) { ctx.moveTo(-12, y); ctx.lineTo(12, y + 2); } ctx.stroke();
  glow(ctx, 5, -146, 14, '#7fffd4', 1);
  ctx.fillStyle = '#d8fff0'; ctx.fillRect(2, -147.5, 6, 3);
  hat(ctx, 0, -154, 84, 26, '#2a2e2a', '#1a1e1a', null, 0.06);
}

// ------------------------------------------------------------------ JINETE DEL APOCALIPSIS
function rider(ctx) {
  const bone = '#d8c8a0', dark = '#231a1c';
  // patas del caballo
  for (const [x1, x2] of [[-60, -70], [-40, -36], [40, 30], [58, 66]]) { limb(ctx, x1, -70, x2, -4, 6, 4, dark); ellipse(ctx, x2, -2, 6, 3, bone, 2); }
  blob(ctx, [-76, -84, -40, -104, 30, -104, 70, -96, 76, -76, 50, -62, -40, -60, -74, -66], dark);
  ctx.strokeStyle = bone; ctx.lineWidth = 2.5;
  ctx.beginPath(); for (let i = 0; i < 6; i++) { const x = -26 + i * 10; ctx.moveTo(x, -98); ctx.quadraticCurveTo(x + 6, -82, x, -66); } ctx.stroke();
  // cuello y cráneo de caballo
  poly(ctx, [60, -96, 86, -134, 100, -128, 82, -84], dark);
  poly(ctx, [84, -142, 100, -146, 136, -122, 132, -112, 104, -116, 88, -124], bone);
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(100, -134, 4, 3, 0, 0, Math.PI * 2); ctx.fill();
  glow(ctx, 100, -134, 12, '#ff3a12', 1);
  flame(ctx, 76, -120, 0.9, '#ff3a12', '#ff9a2a', '#fff2a0', 0.4, 3);
  flame(ctx, -80, -80, 0.8, '#ff3a12', '#ff9a2a', '#fff2a0', 0.9, 4);
  // jinete
  const pon = [-14, -150, 14, -150, 40, -118, 30, -96];
  tatter(pon, 30, -96, -30, -96, 6, 10, 71); pon.push(-40, -118);
  poly(ctx, pon, '#2a1214');
  limb(ctx, 26, -132, 58, -128, 6, 5, '#2a1214');
  line(ctx, 60, -128, 100, -150, '#8a8a90', 4);
  zombieHead(ctx, 0, -160, '#b8b8a8', '#ff3a12', 0.9);
  hat(ctx, 0, -168, 78, 26, '#1a1012', '#4a1a1a', null, -0.1);
}

// ------------------------------------------------------------------ JEFES
function sheriff(ctx) {
  const skin = '#9aa4a8';
  // soga hacia arriba
  line(ctx, 4, -168, 10, -260, INK, 7); line(ctx, 4, -168, 10, -260, '#a8885a', 4);
  legs(ctx, '#2a2422', '#3a2418', 1.15, '#c9a54a');
  const back = [-32, -132, 32, -132, 58, -14];
  tatter(back, 58, -14, -58, -14, 10, 16, 81);
  poly(ctx, back, '#2a1c14');
  poly(ctx, [-26, -132, 26, -132, 22, -78, -22, -78], '#4a4a48');
  const L = [-34, -134, -14, -132, -16, -40]; tatter(L, -16, -40, -54, -22, 4, 12, 83); L.push(-48, -96); poly(ctx, L, '#3e2a1c');
  const R = [34, -134, 14, -132, 16, -40]; tatter(R, 16, -40, 54, -22, 4, 12, 85); R.push(48, -96); poly(ctx, R, '#3e2a1c');
  star(ctx, -24, -110, 13, 6, '#d8b44a', 2.5); circle(ctx, -24, -110, 4, '#a07a2a', 1.5);
  poly(ctx, [-24, -86, 24, -86, 24, -76, -24, -76], '#1a1210', 2.5, 0);
  // brazos con revólveres hacia los lados
  limb(ctx, -32, -126, -66, -96, 9, 8, '#3e2a1c'); limb(ctx, 32, -126, 66, -96, 9, 8, '#3e2a1c');
  poly(ctx, [-66, -100, -98, -90, -98, -82, -66, -92], '#9a9aa2', 2.5, 0.3);
  poly(ctx, [66, -100, 98, -90, 98, -82, 66, -92], '#9a9aa2', 2.5, 0.3);
  circle(ctx, -66, -96, 7, skin, 2); circle(ctx, 66, -96, 7, skin, 2);
  // cuello roto y cabeza ladeada
  ctx.save(); ctx.translate(0, -150); ctx.rotate(0.35);
  zombieHead(ctx, 0, 0, skin, '#9fe8ff', 1.1);
  ctx.restore();
  ellipse(ctx, 4, -136, 16, 6, '#a8885a', 3);
  hat(ctx, 6, -164, 104, 32, '#2a1c14', '#c9a54a', '#d8b44a', 0.3);
}

function bride(ctx) {
  const dress = '#d8e4ea';
  glow(ctx, 0, -90, 120, '#8fe8ff', 0.25);
  const sk = [-20, -120, 20, -120, 70, -40, 84, 0];
  tatter(sk, 84, 0, -84, 0, 12, 18, 91); sk.push(-70, -40);
  poly(ctx, sk, dress);
  ctx.strokeStyle = 'rgba(80,110,130,0.6)'; ctx.lineWidth = 2;
  ctx.beginPath(); for (let i = -3; i <= 3; i++) { ctx.moveTo(i * 4, -110); ctx.lineTo(i * 22, -6); } ctx.stroke();
  poly(ctx, [-20, -140, 20, -140, 18, -112, -18, -112], '#c8d8e0');
  // velo largo translúcido
  ctx.save(); ctx.globalAlpha = 0.55;
  const veil = [-16, -176, 16, -176, 46, -120, 56, -60];
  tatter(veil, 56, -60, -56, -60, 8, 14, 93); veil.push(-46, -120);
  poly(ctx, veil, '#eef8ff', 2, 0);
  ctx.restore();
  limb(ctx, -18, -134, -40, -104, 5, 4, '#c8d8e0'); limb(ctx, 18, -134, 30, -110, 5, 4, '#c8d8e0');
  // ramo de rosas muertas
  for (let i = 0; i < 5; i++) circle(ctx, 30 + Math.cos(i * 1.3) * 8, -112 + Math.sin(i * 1.3) * 6, 6, '#5a0a14', 2);
  line(ctx, 30, -104, 34, -80, '#2a3a1a', 3);
  // cráneo con ojos espectrales
  blob(ctx, [-12, -150, -10, -168, 10, -168, 12, -150, 8, -138, 0, -134, -8, -138], '#e8eef0');
  ctx.fillStyle = INK;
  ctx.beginPath(); ctx.ellipse(-5, -156, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(5, -156, 4, 5, 0, 0, Math.PI * 2); ctx.fill();
  glow(ctx, -5, -156, 10, '#7fe8ff', 1); glow(ctx, 5, -156, 10, '#7fe8ff', 1);
  ctx.fillRect(-6, -142, 12, 2);
  // tiara
  for (let i = -2; i <= 2; i++) poly(ctx, [i * 6 - 3, -168, i * 6, -176 - (i === 0 ? 6 : 0), i * 6 + 3, -168], '#c9d8e8', 1.5, 0);
}

function foreman(ctx) {
  const iron = '#4a4a52', ironD = '#2c2c32';
  // piernas acorazadas
  poly(ctx, [-40, -80, -8, -80, -12, -10, -46, -10], ironD); poly(ctx, [8, -80, 40, -80, 46, -10, 12, -10], ironD);
  poly(ctx, [-52, -16, -6, -16, -6, 0, -56, 0], iron); poly(ctx, [6, -16, 52, -16, 56, 0, 6, 0], iron);
  // torso masivo con horno
  blob(ctx, [-70, -160, 70, -160, 80, -110, 60, -70, -60, -70, -80, -110], iron);
  poly(ctx, [-30, -140, 30, -140, 30, -90, -30, -90], '#1a1010');
  for (let i = 0; i < 4; i++) poly(ctx, [-26, -134 + i * 12, 26, -134 + i * 12, 26, -128 + i * 12, -26, -128 + i * 12], '#3a2020', 1.5, 0);
  glow(ctx, 0, -115, 60, '#ff5a12', 0.9);
  ctx.fillStyle = '#ffb02a'; ctx.fillRect(-24, -112, 48, 6);
  for (const [x, y] of [[-60, -150], [60, -150], [-66, -100], [66, -100], [-40, -76], [40, -76]]) circle(ctx, x, y, 4, '#8a8a92', 1.5);
  // chimeneas
  poly(ctx, [-60, -160, -48, -160, -48, -196, -60, -196], ironD); poly(ctx, [48, -160, 60, -160, 60, -190, 48, -190], ironD);
  // brazos y mazo gigante
  limb(ctx, -72, -146, -96, -100, 18, 16, iron); limb(ctx, 72, -146, 100, -110, 18, 16, iron);
  circle(ctx, -98, -96, 14, ironD, 3); circle(ctx, 102, -106, 14, ironD, 3);
  line(ctx, 102, -106, 128, -20, INK, 10); line(ctx, 102, -106, 128, -20, '#6b3f1f', 6);
  poly(ctx, [100, -40, 150, -50, 158, -6, 108, 4], '#5a5a62', 3, 0.6);
  // cabeza pequeña con casco y bigote
  zombieHead(ctx, 0, -176, '#a89a7a', '#ffb02a', 1.0);
  poly(ctx, [-16, -168, 0, -164, 16, -168, 12, -162, 0, -160, -12, -162], '#3a2a1a', 2, 0);
  poly(ctx, [-22, -186, -18, -204, 0, -210, 18, -204, 22, -186], '#6a6a72');
  poly(ctx, [-28, -188, 28, -188, 24, -180, -24, -180], ironD, 2.5, 0);
}

function preacher(ctx) {
  // sombra abisal con tentáculos
  glow(ctx, 0, -20, 110, '#8a2aff', 0.5);
  for (let i = 0; i < 6; i++) {
    const a = -0.4 + i * 0.6 - Math.PI / 2 - 1.2;
    const x2 = Math.cos(a) * 90, y2 = -10 + Math.sin(a) * -20;
    limb(ctx, (i - 2.5) * 12, -10, x2, y2 - 20, 10, 2, '#1a0a24', 2.5);
  }
  const coat = [-22, -150, 22, -150, 46, -60, 56, 0];
  tatter(coat, 56, 0, -56, 0, 10, 14, 101); coat.push(-46, -60);
  poly(ctx, coat, '#141018');
  poly(ctx, [-16, -150, 16, -150, 12, -96, -12, -96], '#2a2030');
  poly(ctx, [-8, -150, 8, -150, 4, -140, -4, -140], '#e8e4dc', 2, 0);
  limb(ctx, -22, -144, -40, -110, 8, 7, '#141018'); limb(ctx, 22, -144, 40, -110, 8, 7, '#141018');
  // libro abierto brillante
  glow(ctx, 0, -110, 60, '#b04dff', 0.9);
  poly(ctx, [-34, -118, 0, -112, 34, -118, 34, -96, 0, -92, -34, -96], '#3a1a10');
  poly(ctx, [-30, -116, -2, -110, -2, -94, -30, -98], '#e8dcc0', 1.5, 0);
  poly(ctx, [30, -116, 2, -110, 2, -94, 30, -98], '#e8dcc0', 1.5, 0);
  ctx.strokeStyle = '#8a2aff'; ctx.lineWidth = 1.2;
  ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-26, -112 + i * 4); ctx.lineTo(-6, -108 + i * 4); ctx.moveTo(6, -108 + i * 4); ctx.lineTo(26, -112 + i * 4); } ctx.stroke();
  circle(ctx, -36, -108, 6, '#c8c0b4', 2); circle(ctx, 36, -108, 6, '#c8c0b4', 2);
  // cara pálida
  blob(ctx, [-12, -166, -10, -182, 10, -182, 12, -166, 8, -154, 0, -150, -8, -154], '#c8c0b4');
  glow(ctx, -5, -172, 10, '#d08aff', 1); glow(ctx, 5, -172, 10, '#d08aff', 1);
  ctx.fillStyle = '#f0d0ff'; ctx.fillRect(-7, -173, 4, 2); ctx.fillRect(3, -173, 4, 2);
  ctx.fillStyle = INK; ctx.fillRect(-5, -160, 10, 2);
  // sombrero de predicador plano
  poly(ctx, [-18, -182, -16, -206, 16, -206, 18, -182], '#100c12');
  poly(ctx, [-50, -184, 50, -184, 44, -176, -44, -176], '#100c12');
  star(ctx, 0, -194, 5, 5, '#8a2aff', 1, 0.5);
}

const DRAW = { outlaw, miner, shaman, hound, sniper, rider, sheriff, bride, foreman, preacher };

// Caja aproximada (unidades de arte) para dimensionar los sprites.
export const ART_BOX = {
  outlaw: { w: 200, h: 200, cy: 0.9 }, miner: { w: 220, h: 240, cy: 0.92 }, shaman: { w: 200, h: 220, cy: 0.92 },
  hound: { w: 220, h: 150, cy: 0.9 }, sniper: { w: 240, h: 200, cy: 0.9 }, rider: { w: 260, h: 240, cy: 0.92 },
  sheriff: { w: 240, h: 300, cy: 0.94 }, bride: { w: 220, h: 230, cy: 0.94 }, foreman: { w: 340, h: 260, cy: 0.94 },
  preacher: { w: 260, h: 250, cy: 0.94 },
};

export function drawEnemy(ctx, type, detail = 0, seed = 77) {
  beginArt(seed, detail);
  DRAW[type](ctx);
}
