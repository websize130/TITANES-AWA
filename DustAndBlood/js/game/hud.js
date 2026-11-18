// HUD en canvas (espacio de pantalla): vida, nivel, objetivo, oro, Racha de Pólvora, jefe, botones táctiles,
// joystick translúcido, flechas a objetivos y rótulos de misión. Textos cacheados para no crear strings por frame.
import { INK, coin, star, burst } from '../art/comic.js';

const TAU = Math.PI * 2;
const memo = new Map();
function txt(key, value, fmt) {
  let m = memo.get(key);
  if (!m) { m = { v: NaN, s: '' }; memo.set(key, m); }
  if (m.v !== value) { m.v = value; m.s = fmt(value); }
  return m.s;
}
const mmss = (s) => { s = Math.ceil(s); return (s / 60 | 0) + ':' + String(s % 60).padStart(2, '0'); };

const FONT = new Map();
function fontOf(size, face) {
  const key = face + size;
  let f = FONT.get(key);
  if (!f) { f = size + 'px ' + face + ', Georgia, serif'; FONT.set(key, f); }
  return f;
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(20,11,6,0.62)';
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 8); ctx.fill();
  ctx.strokeStyle = 'rgba(201,165,74,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
}

function bar(ctx, x, y, w, h, k, c1, c2, back = '#2a1510') {
  ctx.fillStyle = INK; ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  ctx.fillStyle = back; ctx.fillRect(x, y, w, h);
  const kw = w * Math.max(0, Math.min(1, k));
  ctx.fillStyle = c1; ctx.fillRect(x, y, kw, h);
  ctx.fillStyle = c2; ctx.fillRect(x, y, kw, Math.max(1, h * 0.35));
}

function text(ctx, s, x, y, size, color, face = 'Rye', align = 'left', stroke = 3) {
  ctx.font = fontOf(size, face);
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  if (stroke) { ctx.lineWidth = stroke; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = color; ctx.fillText(s, x, y);
}

const BTN = { ability: { id: 'ability', x: 0, y: 0, r: 0 }, ultimate: { id: 'ultimate', x: 0, y: 0, r: 0 }, pause: { id: 'pause', x: 0, y: 0, r: 0 } };

export function drawHud(g, ctx, t) {
  const W = g.w, H = g.h, p = g.player, inp = g.input, touch = inp.isTouch;
  const small = W < 640;
  const k = small ? 0.82 : 1;

  // ---------------- vida + nivel (arriba izquierda)
  const px = 12, py = 12, pw = small ? 170 : 230;
  panel(ctx, px, py, pw + 64 * k, 58 * k);
  ctx.save();
  ctx.beginPath(); ctx.arc(px + 28 * k, py + 29 * k, 22 * k, 0, TAU); ctx.fillStyle = '#120a06'; ctx.fill();
  ctx.lineWidth = 2.5; ctx.strokeStyle = g.pal.primary; ctx.stroke(); ctx.clip();
  const hs = g.cache.hero(g.hero.id, g.pal);
  ctx.drawImage(hs.canvas, px + 28 * k - 26 * k, py + 4 * k, 52 * k, 52 * k * hs.h / hs.w);
  ctx.restore();
  const bx = px + 58 * k;
  bar(ctx, bx, py + 12 * k, pw - 4, 13 * k, p.hp / p.maxHp, p.hp / p.maxHp < 0.3 ? '#ff2a1a' : '#c0281c', 'rgba(255,170,150,0.55)');
  text(ctx, txt('hp', Math.ceil(p.hp) * 10000 + p.maxHp, () => Math.ceil(p.hp) + ' / ' + Math.round(p.maxHp)), bx + 6, py + 19 * k, 11 * k, '#fff2dc', 'Special Elite', 'left', 2.5);
  bar(ctx, bx, py + 34 * k, pw - 4, 7 * k, g.xp / g.nextXp, '#7fd8ff', '#e0f6ff', '#10202a');
  text(ctx, txt('lvl', g.level, (v) => 'NV ' + v), bx, py + 50 * k, 12 * k, '#7fd8ff', 'Rye', 'left', 3);
  text(ctx, txt('kills', g.kills, (v) => '☠ ' + v), bx + pw - 6, py + 50 * k, 12 * k, '#e8d8b8', 'Special Elite', 'right', 3);

  // ---------------- oro + pausa (arriba derecha)
  BTN.pause.r = touch ? 24 : 18; BTN.pause.x = W - 12 - BTN.pause.r; BTN.pause.y = 12 + BTN.pause.r;
  ctx.beginPath(); ctx.arc(BTN.pause.x, BTN.pause.y, BTN.pause.r, 0, TAU);
  ctx.fillStyle = 'rgba(20,11,6,0.7)'; ctx.fill(); ctx.strokeStyle = '#c9a54a'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#f2e2b8'; ctx.fillRect(BTN.pause.x - 6, BTN.pause.y - 8, 4, 16); ctx.fillRect(BTN.pause.x + 2, BTN.pause.y - 8, 4, 16);
  const cw = small ? 112 : 136, cx = BTN.pause.x - BTN.pause.r - 10 - cw;
  panel(ctx, cx, 12, cw, 34);
  coin(ctx, cx + 18, 29, 9, 1.6);
  text(ctx, txt('coins', Math.floor(g.coinsRun), (v) => '' + v), cx + 34, 30, 16, '#ffd23a', 'Rye', 'left', 3);

  // ---------------- Racha de Pólvora
  const c = g.combo;
  const rw = small ? 150 : 200, rx = W - 12 - rw, ry = touch ? 72 : 58;
  panel(ctx, rx - 8, ry - 6, rw + 16, 44 * k + 6);
  text(ctx, 'RACHA DE PÓLVORA', rx, ry + 6, 11 * k, c.ready ? '#ffd23a' : '#e8c8a0', 'Rye', 'left', 3);
  text(ctx, txt('mult', c.mult, (v) => 'x' + v + ' ORO'), rx + rw, ry + 6, 11 * k, c.mult > 1 ? '#ffd23a' : '#9a8a7a', 'Special Elite', 'right', 2.5);
  const pulse = c.ready ? 0.6 + Math.sin(t * 10) * 0.4 : 1;
  bar(ctx, rx, ry + 18 * k, rw, 12 * k, c.value / 100, c.ready ? `rgba(255,${(150 + pulse * 100) | 0},40,1)` : '#d4561a', '#ffd27a', '#2a1208');
  for (let i = 1; i < 4; i++) { ctx.fillStyle = INK; ctx.fillRect(rx + (rw * i) / 4 - 1, ry + 18 * k, 2, 12 * k); }
  if (c.kills > 4) text(ctx, txt('ck', c.kills, (v) => v + ' BAJAS'), rx + rw, ry + 38 * k, 10 * k, '#ff8a5a', 'Special Elite', 'right', 2.5);
  if (c.ready) text(ctx, touch ? '¡PULSA ★!' : '¡ESPACIO!', rx, ry + 38 * k, 11 * k, '#ffd23a', 'Rye', 'left', 3);

  // ---------------- objetivo (arriba centro)
  const o = g.objective;
  const ow = small ? Math.min(W - 24, 280) : 340, ox = (W - ow) / 2, oy = small ? 142 : 12;
  panel(ctx, ox, oy, ow, o.progress >= 0 ? 58 : 46);
  text(ctx, o.headline(), W / 2, oy + 15, small ? 12 : 14, '#f2d27a', 'Rye', 'center', 3);
  if (o.timer >= 0) text(ctx, txt('timer', Math.ceil(o.timer), mmss), W / 2, oy + 34, small ? 16 : 20, o.timer < 10 ? '#ff6a4a' : '#fff2dc', 'Rye', 'center', 4);
  else text(ctx, g.boss ? '¡Acaba con él!' : g.mission.name, W / 2, oy + 33, 11, '#c8b89a', 'Special Elite', 'center', 2);
  if (o.progress >= 0) bar(ctx, ox + 14, oy + 48, ow - 28, 5, o.progress, '#e8c25a', '#fff6c0');

  // ---------------- jefe
  const b = g.boss;
  if (b && !b.dead) {
    const bw = Math.min(W - 40, 520), bxx = (W - bw) / 2, byy = H - (touch ? 150 : 56);
    text(ctx, b.name.toUpperCase(), W / 2, byy - 12, small ? 13 : 16, '#ff5a4a', 'Rye', 'center', 4);
    bar(ctx, bxx, byy, bw, 14, b.hp / b.maxHp, '#b3101a', '#ff8a7a', '#1a0606');
    star(ctx, bxx - 4, byy + 7, 10, 5, '#c9a54a', 2);
    star(ctx, bxx + bw + 4, byy + 7, 10, 5, '#c9a54a', 2);
  }

  // ---------------- flechas a objetivos fuera de pantalla
  const ms = o.markers;
  for (let i = 0; i < ms.length; i++) {
    const m = ms[i];
    if (!m.on) continue;
    const sx = (m.x - g.cam.x) * g.scale + W / 2, sy = (m.y - 30 - g.cam.y) * g.scale + H / 2;
    if (sx > 30 && sx < W - 30 && sy > 90 && sy < H - 30) {
      const bounce = Math.sin(t * 6) * 4;
      ctx.fillStyle = m.color; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sx, sy - 40 * g.scale + bounce); ctx.lineTo(sx - 8, sy - 54 * g.scale + bounce); ctx.lineTo(sx + 8, sy - 54 * g.scale + bounce); ctx.closePath(); ctx.fill(); ctx.stroke();
      continue;
    }
    const a = Math.atan2(sy - H / 2, sx - W / 2);
    const ex = Math.max(28, Math.min(W - 28, W / 2 + Math.cos(a) * W)), ey = Math.max(96, Math.min(H - 28, H / 2 + Math.sin(a) * H));
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a);
    ctx.fillStyle = m.color; ctx.strokeStyle = INK; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -11); ctx.lineTo(-3, 0); ctx.lineTo(-8, 11); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // ---------------- habilidad + definitiva
  const ab = g.hero.ability, cdK = p.abilityCd > 0 ? p.abilityCd / (ab.cd * g.st.cdMult) : 0;
  if (touch) {
    BTN.ability.r = 36; BTN.ability.x = W - 128; BTN.ability.y = H - 60;
    BTN.ultimate.r = 42; BTN.ultimate.x = W - 54; BTN.ultimate.y = H - 116;
  } else {
    BTN.ability.r = 30; BTN.ability.x = W / 2 - 40; BTN.ability.y = H - 44;
    BTN.ultimate.r = 30; BTN.ultimate.x = W / 2 + 40; BTN.ultimate.y = H - 44;
    if (b && !b.dead) { BTN.ability.x = W - 120; BTN.ultimate.x = W - 50; }
  }
  roundButton(ctx, BTN.ability, cdK, g.pal.glow, touch ? '' : 'Q', abilityGlyph(ab.id), t, false);
  roundButton(ctx, BTN.ultimate, c.ready ? 0 : 1 - c.value / 100, '#ffd23a', touch ? '' : 'ESP', '★', t, c.ready);
  if (!touch) text(ctx, ab.name, BTN.ability.x, BTN.ability.y - 42, 10, '#e8c8a0', 'Special Elite', 'center', 2.5);
  inp.buttons.length = 0;
  inp.buttons.push(BTN.pause);
  if (touch) { inp.buttons.push(BTN.ability); inp.buttons.push(BTN.ultimate); }

  // ---------------- joystick translúcido
  if (touch && inp.joy.active) {
    const j = inp.joy;
    ctx.globalAlpha = 0.28;
    ctx.beginPath(); ctx.arc(j.ox, j.oy, j.radius, 0, TAU); ctx.fillStyle = '#000'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#f2e2b8'; ctx.stroke();
    ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(j.ox + j.dx * j.radius, j.oy + j.dy * j.radius, 24, 0, TAU); ctx.fillStyle = '#f2e2b8'; ctx.fill();
    ctx.globalAlpha = 1;
  } else if (touch && g.time < 6) {
    ctx.globalAlpha = 0.5 - g.time / 14;
    text(ctx, 'Arrastra para moverte', 90, H - 40, 13, '#f2e2b8', 'Special Elite', 'left', 3);
    ctx.globalAlpha = 1;
  }

  // ---------------- rótulo central
  const bn = g.banner;
  if (bn) {
    const k2 = bn.t / bn.max;
    const a = Math.min(1, (1 - k2) * 6, k2 * 4);
    ctx.globalAlpha = Math.max(0, a);
    const cy = H * 0.34;
    const sz = Math.min(W / (bn.title.length * 0.62 + 2), small ? 30 : 46);
    ctx.save(); ctx.translate(W / 2, cy); ctx.rotate(-0.04);
    burst(ctx, 0, 0, Math.min(W * 0.48, bn.title.length * sz * 0.42 + 40), 22, 'rgba(160,20,14,0.92)', 4, 9);
    text(ctx, bn.title, 0, -4, sz, '#ffe08a', 'Rye', 'center', sz * 0.22);
    ctx.restore();
    if (bn.sub) text(ctx, bn.sub, W / 2, cy + sz * 0.9 + 14, small ? 13 : 16, '#f2e2c8', 'Special Elite', 'center', 3);
    ctx.globalAlpha = 1;
  }
}

function abilityGlyph(id) { return id === 'blast' ? '✸' : id === 'ring' ? '◎' : id === 'turret' ? '⚙' : '➤'; }

function roundButton(ctx, B, cd, color, key, glyph, t, ready) {
  ctx.beginPath(); ctx.arc(B.x, B.y, B.r, 0, TAU);
  ctx.fillStyle = 'rgba(20,11,6,0.72)'; ctx.fill();
  ctx.lineWidth = 3; ctx.strokeStyle = ready ? color : '#7a5a2a'; ctx.stroke();
  if (cd > 0) {
    ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.arc(B.x, B.y, B.r - 3, -Math.PI / 2, -Math.PI / 2 + TAU * cd); ctx.closePath();
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fill();
  }
  if (ready) {
    ctx.globalAlpha = 0.4 + Math.sin(t * 9) * 0.3;
    ctx.beginPath(); ctx.arc(B.x, B.y, B.r + 6, 0, TAU); ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  text(ctx, glyph, B.x, B.y + 1, B.r * 0.85, cd > 0 ? '#7a6a5a' : color, 'serif', 'center', 3);
  if (key) text(ctx, key, B.x, B.y + B.r - 6, 9, '#e8d8b8', 'Special Elite', 'center', 2);
}
