// Mascota del forajido: le sigue con movimiento suave, detecta enemigos cercanos y los ataca sola
// (embestida, picado o proyectil de tinta). Daño equilibrado: apoya, no limpia el nivel por sí misma.
// Sin asignaciones por fotograma: estado y proyectiles preasignados.
import { PT } from './engine.js';
import { petStats } from '../data/pets.js';
import { Sfx } from '../core/audio.js';

const SHOTS = 6;

export function initPet(g, heroId, level) {
  const S = petStats(heroId, level);
  if (!g.pet) {
    g.pet = { on: false, x: 0, y: 0, vx: 0, vy: 0, face: 1, mode: 0, t: 0, cd: 0, target: null, tUid: 0, kills: 0, hits: 0, size: 1, tier: 0, fly: false, lift: 0, def: null, dmg: 0, cdMax: 1, bite: 0,
      powerT: 0, powerCd: 1, shield: 0, chk: 0, uses: 0, fxT: 0, fxMax: 0.5, fxKind: '', fxX: 0, fxY: 0, fxR: 0, fxN: 0, fxPts: new Float32Array(24) };
    g.petShots = [];
    for (let i = 0; i < SHOTS; i++) g.petShots.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, uid: 0 });
  }
  const P = g.pet;
  P.on = true; P.def = S.def; P.tier = S.tier; P.size = S.size; P.dmg = S.dmg; P.cdMax = S.cd; P.fly = S.def.fly;
  P.powerCd = S.powerCd; P.powerT = S.powerCd * 0.6; P.shield = S.shield; P.chk = 0; P.uses = 0; P.fxT = 0;
  g.player.shield = 0; g.player.shieldT = 0; g.player.shieldMax = S.shield;
  P.x = g.player.x - 40; P.y = g.player.y + 10; P.vx = 0; P.vy = 0; P.mode = 0; P.t = 0; P.cd = 1.5; P.target = null; P.kills = 0; P.hits = 0; P.lift = P.fly ? 46 : 0; P.bite = 0;
  for (const s of g.petShots) s.on = false;
}

// Golpe de la mascota: cuenta las bajas que firma.
function petHit(g, e, dmg, nx, ny) {
  const P = g.pet;
  if (!e || e.dead) return;
  const wasDead = e.dead;
  g.hurtZombie(e, dmg * (e.colossus ? 0.6 : 1), false, nx, ny, e.colossus ? 0 : 140, 0, 0, 0, 0);
  P.hits++;
  if (!wasDead && e.dead) { P.kills++; g.petKills = (g.petKills || 0) + 1; }
  g.addPart(e.x, e.y - e.r, nx * 60, -60, 0.35, 3, '#0a0605', PT.BLOOD, false);
  Sfx.play('pet');
}

export function updatePet(g, dt) {
  const P = g.pet;
  if (!P || !P.on) return;
  const p = g.player, D = P.def;
  P.cd -= dt; P.t += dt; P.bite = Math.max(0, P.bite - dt);
  if (P.fxT > 0) P.fxT -= dt;
  if (p.shieldT > 0) { p.shieldT -= dt; if (p.shieldT <= 0) p.shield = 0; }
  updatePetPower(g, P, dt);
  // objetivo: el enemigo más cercano al forajido dentro del radio de vigilancia
  if (P.target && (P.target.dead || P.target.uid !== P.tUid)) P.target = null;
  if (!P.target && P.cd <= 0) { const e = g.nearest(p.x, p.y, D.range, 0); if (e) { P.target = e; P.tUid = e.uid; } }
  let tx, ty, k = 6;
  const back = p.face < 0 ? 1 : -1;
  if (P.mode === 1 && P.target) {
    // ataque cuerpo a cuerpo (embestida o picado)
    const e = P.target, dx = e.x - P.x, dy = e.y - P.y, d = Math.hypot(dx, dy) || 1;
    const sp = D.speed * (1 + P.tier * 0.08);
    P.vx = (dx / d) * sp; P.vy = (dy / d) * sp;
    P.x += P.vx * dt; P.y += P.vy * dt;
    if (P.fly) P.lift = Math.max(6, P.lift - dt * 160);
    P.face = dx >= 0 ? 1 : -1;
    if (d < e.r + 14) { petHit(g, e, P.dmg, dx / d, dy / d); P.mode = 2; P.t = 0; P.cd = P.cdMax; P.bite = 0.2; P.target = null; }
    else if (P.t > 1.2 || Math.hypot(e.x - p.x, e.y - p.y) > D.range * 1.6) { P.mode = 2; P.t = 0; P.target = null; }
    return;
  }
  if (P.mode === 2 && P.t > 0.35) P.mode = 0;
  // seguir al forajido: posición a su espalda, con un ligero vaivén
  tx = p.x + back * 50 + Math.sin(g.realTime * 1.3) * 8; ty = p.y - 8 + Math.cos(g.realTime * 1.1) * 5;
  if (P.fly) { P.lift += ((40 + Math.sin(g.realTime * 3) * 6) - P.lift) * Math.min(1, dt * 4); ty -= 6; }
  const ex = tx - P.x, ey = ty - P.y;
  if (Math.abs(ex) + Math.abs(ey) > 600) { P.x = tx; P.y = ty; }
  P.vx = ex * k; P.vy = ey * k;
  P.x += P.vx * dt; P.y += P.vy * dt;
  if (Math.abs(P.vx) > 8) P.face = P.vx > 0 ? 1 : -1;
  // atacar
  if (P.target && P.cd <= 0) {
    if (D.attack === 'bolt') {
      const e = P.target, s = g.petShots.find((x) => !x.on);
      if (s) {
        const sx = P.x + P.face * 14, sy = P.y - 18 - P.lift, dx = e.x - sx, dy = e.y - e.r - sy, d = Math.hypot(dx, dy) || 1;
        s.on = true; s.x = sx; s.y = sy; s.vx = (dx / d) * D.speed; s.vy = (dy / d) * D.speed; s.life = 0.9; s.uid = e.uid;
        P.cd = P.cdMax; P.bite = 0.18; P.face = dx >= 0 ? 1 : -1; P.target = null;
        Sfx.play('petshot');
      }
    } else { P.mode = 1; P.t = 0; }
  }
}

export function updatePetShots(g, dt) {
  if (!g.petShots) return;
  for (const s of g.petShots) {
    if (!s.on) continue;
    s.life -= dt; s.x += s.vx * dt; s.y += s.vy * dt;
    if (s.life <= 0) { s.on = false; continue; }
    if (Math.random() < 0.6) g.addPart(s.x, s.y, -s.vx * 0.05, -s.vy * 0.05, 0.3, 2.5, '#0a0605', PT.BLOOD, false);
    const e = g.nearest(s.x, s.y + 20, 26, 0);
    if (e) { const d = Math.hypot(s.vx, s.vy) || 1; petHit(g, e, g.pet.dmg, s.vx / d, s.vy / d); s.on = false; }
  }
}

// ---------------------------------------------------------------- PODER SECUNDARIO (automático, enfriamiento propio)
// Se comprueba 4 veces por segundo cuando está listo y solo se lanza si la situación lo pide.
function countNear(g, x, y, r) {
  const Z = g.zombies.items, r2 = r * r; let n = 0, sx = 0, sy = 0;
  for (let i = 0; i < g.zombies.n; i++) { const e = Z[i]; if (e.dead) continue; const dx = e.x - x, dy = e.y - y; if (dx * dx + dy * dy < r2) { n++; sx += e.x; sy += e.y; } }
  g._cnt.n = n; g._cnt.x = n ? sx / n : x; g._cnt.y = n ? sy / n : y;
  return g._cnt;
}
function updatePetPower(g, P, dt) {
  P.powerT -= dt;
  if (P.powerT > 0 || g.state !== 'play') return;
  P.chk -= dt; if (P.chk > 0) return; P.chk = 0.25;
  if (!g._cnt) g._cnt = { n: 0, x: 0, y: 0 };
  const p = g.player, pw = P.def.power;
  let fired = false;
  if (pw.id === 'knock') {
    if (countNear(g, p.x, p.y, pw.radius).n >= 3) {
      const Z = g.zombies.items, r2 = pw.radius * pw.radius;
      for (let i = 0; i < g.zombies.n; i++) {
        const e = Z[i]; if (e.dead) continue;
        const dx = e.x - p.x, dy = e.y - p.y, d2 = dx * dx + dy * dy; if (d2 > r2) continue;
        const d = Math.sqrt(d2) || 1, k = e.colossus ? 0.25 : 1;
        e.vx += (dx / d) * 460 * k; e.vy += (dy / d) * 460 * k; if (!e.colossus) e.stunT = Math.max(e.stunT, 0.6);
        petHit(g, e, P.dmg * 1.2, dx / d, dy / d);
      }
      fx(P, 'knock', p.x, p.y, pw.radius, 0.5); g.ono(p.x, p.y - 110, '¡AUUUU!', '#cfe8ff', 26); Sfx.play('howl'); g.cam.shake = Math.max(g.cam.shake, 6);
      fired = true;
    }
  } else if (pw.id === 'shield') {
    if (p.hp < p.maxHp * 0.8 || p.hurt > 0 || countNear(g, p.x, p.y, 160).n >= 4) {
      p.shield = p.shieldMax; p.shieldT = pw.time;
      fx(P, 'shield', p.x, p.y, 70, 0.6); g.ono(p.x, p.y - 110, '¡SIETE VIDAS!', '#d8ff6a', 22); Sfx.play('power');
      fired = true;
    }
  } else if (pw.id === 'loot') {
    const I = g.items.items, r2 = pw.radius * pw.radius, pr = g.st.pickup;
    let n = 0;
    for (let i = 0; i < g.items.n && n < 12; i++) {
      const it = I[i]; if (it.mag) continue;
      const dx = it.x - p.x, dy = it.y - p.y, d2 = dx * dx + dy * dy;
      if (d2 > r2 || d2 < pr * pr) continue;
      P.fxPts[n * 2] = it.x; P.fxPts[n * 2 + 1] = it.y; n++;
      it.mag = true;
    }
    if (n >= 2) {
      const gold = Math.min(n, 6); P.fxN = n; g.gold += gold; fx(P, 'loot', p.x, p.y, pw.radius, 0.6);
      g.addText(p.x, p.y - 96, '+' + gold + ' ⛀ RAPIÑA', '#ffd27a', 14, true); Sfx.play('power');
      fired = true;
    }
  } else if (pw.id === 'slow') {
    const c = countNear(g, p.x, p.y, 260);
    if (c.n >= 4) {
      const cx = c.x, cy = c.y, Z = g.zombies.items, r2 = pw.radius * pw.radius;
      for (let i = 0; i < g.zombies.n; i++) {
        const e = Z[i]; if (e.dead) continue;
        const dx = e.x - cx, dy = e.y - cy; if (dx * dx + dy * dy > r2) continue;
        e.slowT = Math.max(e.slowT, 3); petHit(g, e, P.dmg * 0.6, 0, 0);
      }
      fx(P, 'slow', cx, cy, pw.radius, 0.7); g.ono(cx, cy - 90, '¡SOMBRA!', '#ffb347', 22); Sfx.play('power');
      fired = true;
    }
  }
  if (fired) { P.powerT = P.powerCd; P.uses++; P.bite = 0.25; }
}
function fx(P, kind, x, y, r, t) { P.fxKind = kind; P.fxX = x; P.fxY = y; P.fxR = r; P.fxT = t; P.fxMax = t; }
