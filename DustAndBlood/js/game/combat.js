// Disparo de armas, habilidades de héroe, definitivas de la Racha de Pólvora, torretas y mejoras de nivel.
import { BK, ZK, PT } from './game.js';
import { Sfx } from '../core/audio.js';

const TAU = Math.PI * 2;

export function fireWeapon(g, dt, hasTarget) {
  const p = g.player, w = g.weapon, L = w.levels[g.weaponLvl - 1], st = g.st;
  let mult = st.rate * (g.slowmo > 0 ? 1.6 : 1);
  if (w.id === 'gatling') {
    p.spin = hasTarget ? Math.min(1, p.spin + dt / 1.1) : Math.max(0, p.spin - dt * 0.8);
    mult *= 0.3 + 0.7 * p.spin;
  }
  p.fireT -= dt * mult;
  if (p.fireT > 0) return;
  if (!hasTarget) { p.fireT = 0; return; }
  p.fireT += 1 / L.rate;
  if (p.fireT < 0) p.fireT = 0;

  const pal = g.pal, aim = p.aim, ca = Math.cos(aim), sa = Math.sin(aim);
  const mx = p.x + ca * 24, my = p.y - 26 + sa * 18;
  const life = L.range / L.speed;
  p.muzzle = 0.07;
  const count = L.count + (w.id === 'widow' ? st.extra * 2 : st.extra);
  switch (w.id) {
    case 'peacemaker': {
      p.alt = 1 - p.alt;
      const side = p.alt ? 7 : -7;
      for (let i = 0; i < count; i++) {
        const a = aim + (i - (count - 1) / 2) * L.spread + (Math.random() - 0.5) * 0.05;
        const col = pal.shotAlt && (p.alt ^ (i & 1)) ? pal.shotAlt : pal.shot;
        g.addBullet(mx - sa * side, my + ca * side, a, L.speed, L.dmg, 4, L.pierce, life, col, pal.shotCore, BK.BULLET, L.kb);
      }
      Sfx.play('shot');
      break;
    }
    case 'widow':
      for (let i = 0; i < count; i++) {
        const a = aim + (Math.random() - 0.5) * L.spread, sp = L.speed * (0.8 + Math.random() * 0.35);
        g.addBullet(mx, my, a, sp, L.dmg, 3.5, L.pierce, life * (0.85 + Math.random() * 0.3), pal.shot, pal.shotCore, BK.PELLET, L.kb);
      }
      for (let i = 0; i < 4; i++) g.addPart(mx + ca * 10, my + sa * 10, ca * 60 + (Math.random() - 0.5) * 40, sa * 60 - 20, 0.6, 8, pal.smoke || '#8a7a6a', PT.SMOKE, false).grow = 18;
      g.cam.shake = Math.max(g.cam.shake, 3);
      Sfx.play('shotgun');
      break;
    case 'winchester':
      for (let i = 0; i < count; i++) {
        const a = aim + (i - (count - 1) / 2) * 0.06;
        g.addBullet(mx, my, a, L.speed, L.dmg, 4.5, L.pierce, life, pal.shot, pal.shotCore, BK.RIFLE, L.kb);
      }
      Sfx.play('rifle');
      break;
    case 'grenade':
      for (let i = 0; i < count; i++) {
        const a = aim + (i - (count - 1) / 2) * L.spread;
        const dist = Math.min(L.range, Math.max(120, p.aimDist || L.range)) * (1 - Math.abs(i - (count - 1) / 2) * 0.08);
        const b = g.addBullet(mx, my, a, L.speed, L.dmg, 6, 0, 99, pal.shot, pal.shotCore, BK.GRENADE, L.kb);
        if (!b) break;
        b.sx = mx; b.sy = my; b.tx = p.x + Math.cos(a) * dist; b.ty = p.y + Math.sin(a) * dist; b.t = 0; b.tmax = dist / L.speed;
        b.radius = L.radius * st.explosive; b.fire = L.fire * st.dmg;
      }
      Sfx.play('launch');
      break;
    case 'crossbow':
      for (let i = 0; i < count; i++) {
        const a = aim + (i - (count - 1) / 2) * L.spread;
        const b = g.addBullet(mx, my, a, L.speed, L.dmg, 5, L.pierce, life, '#bfe8ff', '#ffffff', BK.BOLT, L.kb);
        if (b) b.heal = g.noHeal ? 0 : L.heal;
      }
      Sfx.play('bow');
      break;
    case 'gatling':
      for (let i = 0; i < count; i++) {
        const a = aim + (Math.random() - 0.5) * L.spread * (1 + i * 0.5);
        g.addBullet(mx + (Math.random() - 0.5) * 6, my + (Math.random() - 0.5) * 6, a, L.speed, L.dmg, 3, L.pierce, life, pal.shot, pal.shotCore, BK.BULLET, L.kb);
      }
      if (Math.random() < 0.3) g.addPart(mx, my, -sa * 80 + (Math.random() - 0.5) * 60, ca * 80 - 40, 0.4, 2, '#c9a54a', PT.DEBRIS, false);
      Sfx.play('gatling');
      break;
    default: break;
  }
  g.addPart(mx + ca * 6, my + sa * 6, 0, 0, 0.06, w.id === 'widow' ? 26 : 14, pal.glow, PT.FLASH, true);
}

// ---------------------------------------------------------------- habilidades (Q / clic derecho / botón)
export function useAbility(g) {
  const p = g.player, h = g.hero, pal = g.pal, st = g.st;
  p.abilityCd = h.ability.cd * st.cdMult;
  Sfx.play('ability');
  switch (h.ability.id) {
    case 'blast':
      for (let i = 0; i < 30; i++) g.addBullet(p.x, p.y - 22, (i / 30) * TAU, 720, 22, 4, 1, 0.38, pal.shot, pal.shotCore, BK.PELLET, 320);
      g.explode(p.x, p.y - 10, 150, 40 * st.dmg, pal.glow, 1, 0, 560, true);
      g.cam.shake = Math.max(g.cam.shake, 10);
      g.comicText(p.x, p.y - 90, '¡BLAM!', pal.glow, 30);
      break;
    case 'ring':
      g.addZone(ZK.RING, p.x, p.y - 10, 270, 0.55, 48 * st.dmg, pal.glow, 1);
      g.comicText(p.x, p.y - 90, '¡FWOOSH!', pal.fireL || pal.glow, 28);
      break;
    case 'turret':
      g.turrets.push({ x: p.x + p.face * 34, y: p.y + 12, life: 14, cd: 0.4, ang: 0, spr: g.cache.prop('turret', pal) });
      if (g.turrets.length > 3) g.turrets.shift();
      for (let i = 0; i < 12; i++) g.addPart(p.x + p.face * 34, p.y, (Math.random() - 0.5) * 200, -Math.random() * 160, 0.5, 3, pal.gear || '#c99a3a', PT.SPARK, true);
      g.comicText(p.x, p.y - 90, '¡CLANK!', pal.glow, 26);
      break;
    case 'dash': {
      const mv = g.input.moveOut;
      const a = (mv.x || mv.y) ? Math.atan2(mv.y, mv.x) : p.aim;
      p.dashT = 0.2; p.dvx = Math.cos(a) * 1150; p.dvy = Math.sin(a) * 1150; p.inv = Math.max(p.inv, 0.4);
      for (let i = 0; i < 12; i++) g.addBullet(p.x, p.y - 22, (i / 12) * TAU, 820, 18, 4, 1, 0.4, pal.shot, pal.shotCore, BK.BULLET, 120);
      for (let i = 0; i < 10; i++) g.addPart(p.x, p.y - 20, -Math.cos(a) * 200 + (Math.random() - 0.5) * 80, -Math.sin(a) * 200 + (Math.random() - 0.5) * 80, 0.4, 5, pal.glow, PT.EMBER, true);
      break;
    }
    default: break;
  }
}

// ---------------------------------------------------------------- definitivas
export function useUltimate(g) {
  const c = g.combo, p = g.player, pal = g.pal;
  c.ready = false; c.value = 0;
  g.ult = { id: g.hero.ultimate.id, t: 0, n: 0, next: 0 };
  g.flash = 0.7; g.cam.shake = 16;
  Sfx.play('ultimate');
  g.showBanner(g.hero.ultimate.name.toUpperCase(), '¡RACHA DE PÓLVORA!', 1.6);
  if (g.ult.id === 'deadeye') { g.slowmo = 4.5; g.comicText(p.x, p.y - 90, '¡OJO DE LA MUERTE!', pal.glow, 26); }
}

function randomVisibleEnemy(g) {
  const E = g.enemies.items, n = g.enemies.n;
  if (!n) return null;
  const hw = g.viewW / 2, hh = g.viewH / 2, cx = g.cam.x, cy = g.cam.y;
  const start = (Math.random() * n) | 0;
  for (let k = 0; k < n; k++) {
    const e = E[(start + k) % n];
    if (!e.dead && Math.abs(e.x - cx) < hw && Math.abs(e.y - cy) < hh) return e;
  }
  return null;
}

export function updateUltimate(g, dt) {
  const u = g.ult;
  if (!u) return;
  const p = g.player, pal = g.pal, st = g.st;
  u.t += dt; u.next -= dt;
  switch (u.id) {
    case 'judgement':
      while (u.next <= 0 && u.n < 5) {
        u.next += 0.28; u.n++;
        for (let i = 0; i < 36; i++) g.addBullet(p.x, p.y - 22, (i / 36) * TAU + u.n * 0.08, 760, 30, 4.5, 2, 0.45, pal.shot, pal.shotCore, BK.PELLET, 420);
        g.explode(p.x, p.y - 10, 190, 50 * st.dmg, pal.glow, 1, 0, 620, u.n > 1);
        g.cam.shake = Math.max(g.cam.shake, 12);
      }
      if (u.n >= 5) g.ult = null;
      break;
    case 'firestorm':
      while (u.next <= 0 && u.n < 32) {
        u.next += 0.075; u.n++;
        const e = randomVisibleEnemy(g);
        const x = e ? e.x : p.x + (Math.random() - 0.5) * g.viewW * 0.8;
        const y = e ? e.y : p.y + (Math.random() - 0.5) * g.viewH * 0.8;
        g.addZone(ZK.STRIKE, x, y, 72, 0.45, 75 * st.dmg, u.n % 2 ? (pal.fireL || pal.glow) : (pal.fireR || pal.glow2), 1);
      }
      if (u.n >= 32) g.ult = null;
      break;
    case 'bombard':
      while (u.next <= 0 && u.n < 32) {
        u.next += 0.06; u.n++;
        const a = Math.random() * TAU, d = 70 + Math.random() * 380;
        g.addZone(ZK.STRIKE, p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 85 * st.explosive, 0.5, 85 * st.dmg, pal.boom || pal.glow, 1);
      }
      if (u.n >= 32) g.ult = null;
      break;
    case 'deadeye':
      while (u.next <= 0 && g.slowmo > 0) {
        u.next += 0.1;
        for (let k = 0; k < 5; k++) {
          const e = randomVisibleEnemy(g);
          if (!e) break;
          const a = Math.atan2(e.y - e.r - (p.y - 26), e.x - p.x);
          g.addBullet(p.x, p.y - 26, a, 1500, 40, 4.5, 1, 0.8, pal.shot, pal.shotCore, BK.RIFLE, 150);
        }
        Sfx.play('shot');
      }
      if (g.slowmo <= 0) g.ult = null;
      break;
    default: g.ult = null;
  }
}

// ---------------------------------------------------------------- torretas del Ingeniero
export function updateTurrets(g, dt) {
  const T = g.turrets, pal = g.pal;
  for (let i = T.length - 1; i >= 0; i--) {
    const t = T[i];
    t.life -= dt; t.cd -= dt;
    if (t.life <= 0) {
      g.explode(t.x, t.y - 10, 70, 40 * g.st.dmg, pal.glow, 1, 0, 200, false);
      T.splice(i, 1);
      continue;
    }
    if (t.cd <= 0) {
      const e = g.nearestEnemy(t.x, t.y, 440);
      if (e) {
        t.cd = 0.28;
        t.ang = Math.atan2(e.y - (e.r || 20) - (t.y - 26), e.x - t.x);
        g.addBullet(t.x + Math.cos(t.ang) * 14, t.y - 26 + Math.sin(t.ang) * 14, t.ang, 950, 15, 3.5, 0, 0.5, pal.shot, pal.shotCore, BK.BULLET, 60);
        g.addPart(t.x + Math.cos(t.ang) * 18, t.y - 26 + Math.sin(t.ang) * 18, 0, 0, 0.05, 10, pal.glow, PT.FLASH, true);
        Sfx.play('shot');
      } else t.cd = 0.2;
    }
  }
}

// ---------------------------------------------------------------- mejoras al subir de nivel
const UPGRADES = [
  { id: 'dmg', name: 'Pólvora Negra', desc: '+20% de daño', icon: '💥', apply: (g) => { g.st.dmg *= 1.2; } },
  { id: 'rate', name: 'Gatillo Fácil', desc: '+15% de cadencia', icon: '🔫', apply: (g) => { g.st.rate *= 1.15; } },
  { id: 'speed', name: 'Espuelas de Plata', desc: '+10% de velocidad', icon: '👢', apply: (g) => { g.st.speed *= 1.1; } },
  { id: 'hp', name: 'Piel Curtida', desc: '+25 de vida máxima', icon: '🛡️', apply: (g) => { g.player.maxHp += 25; g.player.hp += g.noHeal ? 0 : 25; } },
  { id: 'magnet', name: 'Imán de Oro', desc: '+40% radio de recogida', icon: '🧲', apply: (g) => { g.st.pickup *= 1.4; } },
  { id: 'extra', name: 'Cartucho Extra', desc: '+1 proyectil por disparo', icon: '➕', max: 3, apply: (g) => { g.st.extra += 1; } },
  { id: 'pierce', name: 'Balas Benditas', desc: '+1 perforación', icon: '✝️', max: 3, apply: (g) => { g.st.pierce += 1; } },
  { id: 'crit', name: 'Ojo de Halcón', desc: '+8% probabilidad de crítico', icon: '🎯', apply: (g) => { g.st.crit += 0.08; } },
  { id: 'cd', name: 'Reloj de Bolsillo', desc: '-15% enfriamiento de habilidad', icon: '⏱️', max: 4, apply: (g) => { g.st.cdMult *= 0.85; } },
  { id: 'kb', name: 'Culata Pesada', desc: '+30% de empuje', icon: '🪨', max: 3, apply: (g) => { g.st.kb *= 1.3; } },
  { id: 'armor', name: 'Chaleco de Cuero', desc: '+2 de armadura', icon: '🦺', max: 4, apply: (g) => { g.st.armor += 2; } },
  { id: 'whiskey', name: 'Trago de Whiskey', desc: 'Cura el 40% de la vida', icon: '🥃', heal: true, apply: (g) => { g.heal(g.player.maxHp * 0.4); } },
  { id: 'regen', name: 'Sangre de Coyote', desc: 'Regeneras 1 de vida por segundo', icon: '🩸', heal: true, max: 3, apply: (g) => { g.st.regen += 1; } },
  { id: 'vamp', name: 'Plata Sedienta', desc: 'Cada baja cura 1 de vida', icon: '🦇', heal: true, max: 2, apply: (g) => { g.st.healOnKill = (g.st.healOnKill || 0) + 1; } },
];

export function rollUpgrades(g) {
  g.upTaken = g.upTaken || {};
  const pool = UPGRADES.filter((u) => !(u.heal && g.noHeal) && !(u.max && (g.upTaken[u.id] || 0) >= u.max));
  for (let i = pool.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  return pool.slice(0, 3);
}

export function applyUpgrade(g, up) {
  g.upTaken = g.upTaken || {};
  g.upTaken[up.id] = (g.upTaken[up.id] || 0) + 1;
  up.apply(g);
}
