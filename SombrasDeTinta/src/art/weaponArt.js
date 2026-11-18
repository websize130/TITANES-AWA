// Iconos procedurales de la Armería: cada familia de arma con su silueta en tinta, latón y madera.
import { INK, poly, ellipse, circle, line, glow, star, gear, shade, beginArt } from './ink.js';

const WP_WOOD = '#6b3f1f', WP_STEEL = '#3a3a40', WP_STEEL2 = '#5a5a62', WP_BRASS = '#c9a54a';

function revolver(c, x, y, k, metal) {
  c.save(); c.translate(x, y); c.scale(k, 1);
  poly(c, [-40, -8, 34, -10, 34, -2, -24, 2], metal);
  ellipse(c, -20, -2, 11, 9, shade(metal, -0.2), 2.5);
  poly(c, [-34, -2, -24, 4, -32, 32, -46, 28], WP_WOOD);
  circle(c, -20, -2, 3, WP_STEEL, 1);
  c.restore();
}

export function drawWeaponIcon(ctx, w, W, H, t = 0) {
  ctx.save();
  ctx.translate(W / 2, H / 2);
  const s = Math.min(W / 220, H / 90);
  ctx.scale(s, s);
  beginArt(w.id.length * 13, 1);
  if (w.legendary) { glow(ctx, 0, 0, 110, w.legendary, 0.35 + Math.sin(t * 2) * 0.1); }
  const metal = w.legendary ? shade(w.legendary, -0.35) : WP_STEEL2;
  switch (w.kind) {
    case 'revolvers':
      if (w.id === 'derringer') { poly(ctx, [-30, -10, 20, -12, 20, 0, -30, 2], metal); poly(ctx, [-30, 0, -18, 2, -26, 26, -40, 22], WP_WOOD); }
      else { revolver(ctx, -26, 8, 1, metal); revolver(ctx, 22, -8, -1, metal); }
      break;
    case 'shotgun':
      poly(ctx, [-96, 10, -46, -6, -42, 6, -90, 26], WP_WOOD);
      poly(ctx, [-46, -8, -14, -10, -12, 6, -44, 8], WP_STEEL);
      poly(ctx, [-14, -12, w.id === 'sawn' ? 40 : 70, -16, w.id === 'sawn' ? 40 : 70, 2, -14, 6], '#2a2a30');
      line(ctx, -12, -4, w.id === 'sawn' ? 40 : 70, -8, 'rgba(255,255,255,0.3)', 2);
      if (w.id === 'badtemper' || w.mag > 2) poly(ctx, [-30, 6, -10, 6, -14, 22, -30, 18], WP_WOOD);
      break;
    case 'rifle': case 'harpoon':
      poly(ctx, [-100, 8, -62, -4, -60, 8, -96, 22], WP_WOOD);
      poly(ctx, [-62, -6, -26, -8, -24, 8, -60, 8], WP_BRASS);
      poly(ctx, [-26, -7, 96, -9, 96, -3, -26, -1], WP_STEEL);
      poly(ctx, [-20, 0, 40, 0, 40, 6, -20, 6], WP_WOOD);
      if (w.kind === 'harpoon') { poly(ctx, [96, -14, 120, -6, 96, 2], '#c8c8d0'); line(ctx, 60, -6, 96, -6, '#d8c8a0', 2); }
      else poly(ctx, [-6, -16, 26, -18, 26, -12, -6, -10], WP_BRASS, 2, 0);
      break;
    case 'cards':
      for (let i = -2; i <= 2; i++) {
        ctx.save(); ctx.rotate(i * 0.24); ctx.translate(0, 10);
        poly(ctx, [-14, -54, 14, -54, 14, -4, -14, -4], i === 0 ? '#f2e6cc' : '#e0d4b8', 2.5, 0);
        ctx.font = 'bold 16px serif'; ctx.textAlign = 'center'; ctx.fillStyle = i % 2 ? '#a01a14' : '#120a06'; ctx.fillText(['♠', '♥', '♣', '♦', '♠'][i + 2], 0, -24);
        ctx.restore();
      }
      glow(ctx, 0, -30, 40, w.legendary || '#ff8a3a', 0.4);
      break;
    case 'smg':
      if (w.spin) {
        gear(ctx, -60, 4, 20, 10, WP_BRASS, t * 3, 2.5);
        poly(ctx, [-44, -20, -4, -20, -4, 24, -44, 24], '#5a4a40');
        for (let i = 0; i < 5; i++) { const y = -14 + i * 7; poly(ctx, [-4, y - 3, 96, y - 3, 96, y + 3, -4, y + 3], i % 2 ? WP_STEEL : WP_STEEL2, 2, 0); }
      } else {
        poly(ctx, [-96, 4, -56, -6, -54, 8, -90, 20], WP_WOOD);
        poly(ctx, [-56, -10, 20, -12, 22, 8, -54, 8], WP_STEEL);
        poly(ctx, [20, -8, 78, -10, 78, -2, 20, 0], '#2a2a30');
        if (w.id === 'drum') { circle(ctx, -14, 22, 20, '#3a3a40', 3); circle(ctx, -14, 22, 8, WP_STEEL2, 2); }
        else poly(ctx, [-30, 8, -16, 8, -18, 34, -32, 34], WP_STEEL2);
        if (w.id === 'pepper') for (let i = 0; i < 3; i++) circle(ctx, 80, -10 + i * 5, 3, '#111', 1);
      }
      break;
    case 'laser': {
      const col = w.color || '#7fd8ff';
      poly(ctx, [-70, 6, -40, -14, -36, 22, -64, 30], WP_WOOD);
      poly(ctx, [-40, -16, 10, -18, 14, 18, -38, 20], WP_BRASS);
      for (let i = 0; i < 4; i++) ellipse(ctx, -24 + i * 10, 0, 4, 16, shade(WP_BRASS, -0.25), 2);
      poly(ctx, [10, -10, 70, -6, 70, 6, 10, 10], '#2a2a30');
      ellipse(ctx, 40, 0, 16, 10, col, 2.5);
      glow(ctx, 40, 0, 30 + Math.sin(t * 6) * 4, col, 0.9);
      glow(ctx, 82, 0, 22, col, 0.8);
      line(ctx, 70, 0, 110, 0, col, 4);
      break;
    }
    case 'tesla':
      poly(ctx, [-70, 6, -40, -14, -36, 22, -64, 30], WP_WOOD);
      poly(ctx, [-40, -14, 20, -14, 20, 16, -40, 16], WP_STEEL);
      for (let i = 0; i < 5; i++) ellipse(ctx, -30 + i * 10, 0, 4, 18, WP_BRASS, 2);
      line(ctx, 20, 0, 50, 0, WP_STEEL2, 6); circle(ctx, 58, 0, 12, '#c8d8ff', 2.5);
      glow(ctx, 58, 0, 34, '#9ab8ff', 0.9);
      ctx.strokeStyle = '#e8f0ff'; ctx.lineWidth = 2; ctx.beginPath();
      for (let k = 0; k < 3; k++) { let x = 58, y = 0; ctx.moveTo(x, y); for (let j = 0; j < 4; j++) { x += 10; y += (Math.sin(t * 20 + k * 3 + j) * 9); ctx.lineTo(x, y); } }
      ctx.stroke();
      break;
    default: break;
  }
  if (w.legendary) for (let i = 0; i < 4; i++) star(ctx, -80 + i * 50, -32 + (i % 2) * 64, 4 + Math.sin(t * 3 + i) * 2, 4, w.legendary, 0);
  ctx.restore();
}
