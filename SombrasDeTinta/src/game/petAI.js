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
    g.pet = { on: false, x: 0, y: 0, vx: 0, vy: 0, face: 1, mode: 0, t: 0, cd: 0, target: null, tUid: 0, kills: 0, hits: 0, size: 1, tier: 0, fly: false, lift: 0, def: null, dmg: 0, cdMax: 1, bite: 0 };
    g.petShots = [];
    for (let i = 0; i < SHOTS; i++) g.petShots.push({ on: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, uid: 0 });
  }
  const P = g.pet;
  P.on = true; P.def = S.def; P.tier = S.tier; P.size = S.size; P.dmg = S.dmg; P.cdMax = S.cd; P.fly = S.def.fly;
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
