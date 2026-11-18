// Disparo por tipo de arma, cartas de acción y efectos pasivos periódicos (cuervos, tormenta de plomo,
// tren fantasma, columna de fuego, sombras gemelas, trampero).
import { BK, ZK, PT, HX, HY } from './engine.js';
import { placeTrap } from './traps.js';
import { Sfx } from '../core/audio.js';
import { BARKS } from '../data/heroes.js';
import { TAU } from '../art/ink.js';

function shoot(g, x, y, aim, dmgMul) {
  const w = g.weapon, pal = g.pal, R = g.range(), life = R / w.speed, st = g.st;
  const kb = w.kb * st.kbMult, pierce = w.pierce + g.fx.pierce;
  switch (w.kind) {
    case 'rifle': case 'harpoon': {
      const b = g.addBullet(x, y, aim + (Math.random() - 0.5) * w.spread, w.speed, w.dmg * dmgMul, w.kind === 'harpoon' ? 6 : 5, pierce, life, pal.shot, pal.core, w.kind === 'harpoon' ? BK.HARPOON : BK.RIFLE, kb);
      if (b && w.explode) b.radius = w.explode;
      g.cam.shake = Math.max(g.cam.shake, 4);
      Sfx.play('rifle');
      break;
    }
    case 'cards':
      for (let i = 0; i < w.count; i++) {
        const b = g.addBullet(x, y, aim + (i - (w.count - 1) / 2) * w.spread + (Math.random() - 0.5) * 0.06, w.speed, w.dmg * dmgMul, 5, pierce, life, pal.card || '#f2e6cc', '#ffffff', BK.CARD, kb);
        if (b) { b.chain += w.chain || 0; b.homing = w.homing || 0; b.radius = w.explode || 0; }
      }
      Sfx.play('card');
      break;
    case 'shotgun':
      for (let i = 0; i < w.count; i++) g.addBullet(x, y, aim + (Math.random() - 0.5) * w.spread, w.speed * (0.8 + Math.random() * 0.35), w.dmg * dmgMul, 3.5, pierce, life * (0.8 + Math.random() * 0.25), pal.shot, pal.core, BK.PELLET, kb);
      for (let i = 0; i < 3; i++) g.addPart(x + Math.cos(aim) * 14, y + Math.sin(aim) * 14, Math.cos(aim) * 60, Math.sin(aim) * 60 - 20, 0.6, 8, '#8a7a6a', PT.SMOKE, false).grow = 18;
      g.cam.shake = Math.max(g.cam.shake, 3);
      Sfx.play('shotgun');
      break;
    case 'revolvers': {
      const side = g.player.alt ? 9 : -9, ca = Math.cos(aim), sa = Math.sin(aim);
      const b = g.addBullet(x - sa * side, y + ca * side, aim + (Math.random() - 0.5) * w.spread, w.speed, w.dmg * dmgMul, 4, pierce, life, pal.shot, pal.core, BK.BULLET, kb);
      if (b) { b.chain += w.chain || 0; if (w.burn) b.burn = Math.max(b.burn, w.burn); }
      Sfx.play('shot');
      break;
    }
    default: break;
  }
}

export function fireWeapon(g, dt, has) {
  const p = g.player, w = g.weapon, st = g.st;
  // recarga
  if (p.reloadT > 0) {
    p.reloadT -= dt;
    if (p.reloadT <= 0 || g.fx.reload === 0) { p.reloadT = 0; p.ammo = g.magSize(); Sfx.play('trap'); }
    return;
  }
  // ráfagas en curso (naipes de Maeve)
  if (p.burstN > 0) {
    p.burstT -= dt;
    if (p.burstT <= 0) { p.burstN--; p.burstT = 0.075; emit(g, p); }
    return;
  }
  p.fireT -= dt * st.rate * g.fx.rate;
  if (p.fireT > 0) return;
  if (!has) { p.fireT = 0; if (p.ammo < g.magSize()) startReload(g); return; }
  p.fireT += 1 / w.rate; if (p.fireT < 0) p.fireT = 0;
  if (w.burst > 1) { p.burstN = w.burst - 1; p.burstT = 0.075; }
  emit(g, p);
}

function emit(g, p) {
  const w = g.weapon, st = g.st;
  if (p.ammo <= 0) { startReload(g); return; }
  p.ammo--; p.alt = 1 - p.alt;
  const ca = Math.cos(p.aim), sa = Math.sin(p.aim);
  const mx = p.x + ca * 26, my = p.y - 26 + sa * 18;
  p.muzzle = 0.07;
  shoot(g, mx, my, p.aim, 1);
  g.addPart(mx + ca * 6, my + sa * 6, 0, 0, 0.06, w.kind === 'shotgun' || w.kind === 'rifle' ? 26 : 14, g.pal.glow, PT.FLASH, true);
  for (let i = 0; i < st.shadows; i++) {
    const a = g.realTime * 1.6 + (i / st.shadows) * TAU, sx = p.x + Math.cos(a) * 46, sy = p.y - 26 + Math.sin(a) * 26;
    const t = g.nearest(sx, sy + 26, g.range(), 0);
    shoot(g, sx, sy, t ? Math.atan2(t.y - t.r - sy, t.x - sx) : p.aim, 0.5);
  }
  if (p.ammo <= 0) { p.burstN = 0; startReload(g); }
}

function startReload(g) {
  const p = g.player;
  if (p.reloadT > 0) return;
  p.reloadT = g.fx.reload === 0 ? 0.05 : g.weapon.reload * g.st.reloadMult;
  if (Math.random() < 0.08) g.say(null, BARKS[g.hero.id].reload, 1.4);
}

// ---------------------------------------------------------------- cartas de acción
export function playCard(g, card) {
  const p = g.player, pal = g.pal, st = g.st, aim = p.aim;
  const ax = p.x + Math.cos(aim) * Math.min(380, p.aimDist || 300), ay = p.y + Math.sin(aim) * Math.min(380, p.aimDist || 300);
  switch (card.id) {
    case 'rabia': {
      for (let i = 0; i < 32; i++) g.addBullet(p.x, p.y - 22, (i / 32) * TAU, 760, 26, 4, 1, 0.34, pal.shot, pal.core, BK.PELLET, 520);
      g.explode(p.x, p.y - 10, 160, 45 * st.dmg, pal.glow, 1, 0, 620, true);
      g.cam.shake = 12; g.comicText(p.x, p.y - 96, '¡¿QUÉ MIRÁIS?!', '#ff6a3a', 28);
      Sfx.play('shotgun');
      break;
    }
    case 'verso': {
      const life = (g.range() * 2) / 1900;
      const b = g.addBullet(p.x + Math.cos(aim) * 26, p.y - 26 + Math.sin(aim) * 18, aim, 1900, 190, 7, 99, life, '#ffe08a', '#ffffff', BK.HARPOON, 400);
      if (b) b.crit = true;
      g.cam.shake = 10; g.comicText(p.x, p.y - 96, '«…y la noche calló.»', '#ffd23a', 20);
      Sfx.play('rifle');
      break;
    }
    case 'deadhand':
      for (let i = 0; i < 5; i++) { const b = g.addBullet(p.x, p.y - 26, aim + (i - 2) * 0.2, 720, 34, 6, 2, 0.6, '#f2e6cc', '#ff4a4a', BK.CARD, 120); if (b) { b.stun = 1.6; b.slow = 2; b.radius = 60; } }
      g.comicText(p.x, p.y - 96, '¡ASES Y OCHOS!', pal.glow, 26);
      break;
    case 'chiste':
      g.tellJoke(320, 4);
      g.comicText(p.x, p.y - 110, '¡JA, JA, JA!', '#ffcf6a', 30);
      break;
    case 'beartrap': case 'cepo': {
      const n = card.id === 'beartrap' ? 3 : 2;
      for (let i = 0; i < n; i++) { const a = aim + (i - (n - 1) / 2) * 0.55; placeTrap(g, p.x + Math.cos(a) * 90, p.y + Math.sin(a) * 90); }
      Sfx.play('trap');
      break;
    }
    case 'sal': {
      const q = g.q; let n = 0;
      g.grid.query(p.x, p.y, 230, (e) => { // uso puntual (no por frame)
        if (e.dead) return false;
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy);
        let da = Math.atan2(dy, dx) - aim; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
        if (d < 230 && Math.abs(da) < 0.75) { g.hurtZombie(e, 22 * st.dmg, false, dx / (d || 1), dy / (d || 1), 600, 0, 1.5, 1.2); n++; }
        return false;
      });
      for (let i = 0; i < 30; i++) { const a = aim + (Math.random() - 0.5) * 1.4, s = 200 + Math.random() * 400; g.addPart(p.x, p.y - 24, Math.cos(a) * s, Math.sin(a) * s, 0.5, 3, '#f2f2ea', PT.SPARK, false).drag = 3; }
      q.best = null;
      break;
    }
    case 'dinamita': case 'farol': {
      const b = g.addBullet(p.x, p.y - 26, aim, 0, 150, 6, 0, Math.min(0.9, Math.hypot(ax - p.x, ay - p.y) / 500 + 0.25), '#ffd23a', '#fff', BK.LOB, 0);
      if (b) { b.ox = p.x; b.oy = p.y - 10; b.vx = ax; b.vy = ay; b.spin = 0; b.radius = card.id === 'farol' ? 120 : 130; b.burn = card.id === 'farol' ? 26 * st.dmg : 0; b.dmg = 150 * st.dmg; b.color = card.id === 'farol' ? '#ffb040' : '#ff4a1a'; }
      break;
    }
    case 'aguabendita':
      g.heal(25);
      g.addZone(ZK.RING, p.x, p.y - 10, 280, 0.6, 70 * st.dmg, '#c8e0ff', 1);
      g.comicText(p.x, p.y - 96, '¡AMÉN!', '#c8e0ff', 28);
      break;
    case 'caballeria':
      for (let i = 0; i < 6; i++) {
        const dir = i % 2 ? 1 : -1, y = p.y - g.viewH * 0.4 + (i / 5) * g.viewH * 0.8;
        const z = g.addZone(ZK.RIDERS, p.x - dir * (g.viewW / 2 + 120), y, 46, 2.2, 120 * st.dmg, '#9ab8ff', 1);
        if (z) z.vx = dir * 900;
      }
      g.comicText(p.x, p.y - 96, '¡A LA CARGA!', '#9ab8ff', 30);
      g.cam.shake = 12;
      break;
    case 'trompeta': {
      const E = g.zombies.items, hw = g.viewW / 2, hh = g.viewH / 2;
      for (let i = 0; i < g.zombies.n; i++) {
        const e = E[i];
        if (e.dead || Math.abs(e.x - g.cam.x) > hw || Math.abs(e.y - g.cam.y) > hh) continue;
        g.hurtZombie(e, e.colossus ? e.maxHp * 0.25 : 99999, false, 0, 0, 0, 0, 0, 0);
      }
      g.flash = 1; g.cam.shake = 24; g.comicText(p.x, p.y - 110, '¡EL JUICIO!', '#ffffff', 44);
      Sfx.play('bell');
      break;
    }
    default: break;
  }
}

// ---------------------------------------------------------------- pasivas periódicas
export function updatePassives(g, dt) {
  const st = g.st, p = g.player, T = g.timers;
  if (st.trapper) {
    T.trap -= dt;
    if (T.trap <= 0) { T.trap = 9 / st.trapper; const a = Math.random() * TAU; placeTrap(g, p.x + Math.cos(a) * 110, p.y + Math.sin(a) * 110); }
  }
  if (st.leadStorm) {
    T.storm -= dt;
    if (T.storm <= 0) {
      T.storm = 7 / st.leadStorm;
      for (let i = 0; i < 28; i++) g.addBullet(p.x, p.y - 24, (i / 28) * TAU, 760, 22, 4, 1, 0.55, g.pal.shot, g.pal.core, BK.BULLET, 160);
      g.comicText(p.x, p.y - 90, '¡RATATATÁ!', g.pal.glow, 22); Sfx.play('shotgun');
    }
  }
  if (st.ghostTrain) {
    T.train -= dt;
    if (T.train <= 0) {
      T.train = 16 / st.ghostTrain;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const z = g.addZone(ZK.TRAIN, p.x - dir * (g.viewW / 2 + 200), p.y + (Math.random() - 0.5) * 160, 70, 2.4, 160 * st.dmg, '#9ab8d8', 1);
      if (z) z.vx = dir * 1000;
      g.comicText(p.x, p.y - 100, '¡CHU-CHUUU!', '#c8d8ff', 26); Sfx.play('bell');
    }
  }
  if (st.holyFire && g.holyKills >= 18 / st.holyFire) {
    g.holyKills = 0;
    const t = g.nearest(p.x, p.y, 500, 0);
    g.addZone(ZK.STRIKE, t ? t.x : p.x, t ? t.y : p.y, 130, 0.55, 220 * st.dmg, '#ffe08a', 1);
  }
  // cuervos guardianes
  while (g.crows.length < st.crows) g.crows.push({ a: Math.random() * TAU, cd: 0, x: p.x, y: p.y });
  for (let i = 0; i < g.crows.length; i++) {
    const c = g.crows[i];
    c.a += dt * 2.4; c.x = p.x + Math.cos(c.a + i * 2) * 90; c.y = p.y - 30 + Math.sin(c.a + i * 2) * 55;
    c.cd -= dt;
    if (c.cd <= 0) {
      const t = g.nearest(c.x, c.y + 30, 120, 0);
      if (t) { c.cd = 0.5; g.hurtZombie(t, 16 * st.dmg, false, 0, 0, 60, 0, 0, 0); g.addPart(t.x, t.y - t.r * 2, 0, -40, 0.3, 4, '#1a1a1e', PT.DEBRIS, false); }
      else c.cd = 0.2;
    }
  }
}
