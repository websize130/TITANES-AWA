// IA de la horda y patrones de los jefes. Sin asignaciones por frame (solo estado en los objetos del pool).
import { HALF, EK, ZK, PT } from './game.js';
import { ENEMIES } from '../data/enemies.js';
import { Sfx } from '../core/audio.js';

const TAU = Math.PI * 2;

function chase(e, tx, ty, speed, dt) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  e.x += (dx / d) * speed * dt; e.y += (dy / d) * speed * dt;
  if (dx > 2) e.face = 1; else if (dx < -2) e.face = -1;
  return d;
}

export function updateEnemies(g, dt) {
  const E = g.enemies.items, p = g.player;
  const et = dt * g.enemyScale;
  const damp = Math.max(0, 1 - 7 * et);
  g.grid.clear();
  for (let i = g.enemies.n - 1; i >= 0; i--) {
    const e = E[i];
    if (e.dead) { if (e === g.boss) g.boss = null; g.enemies.kill(i); continue; }
    e.flash -= dt;
    if (e.burnT > 0) {
      e.burnT -= dt; e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.5;
        if (Math.random() < 0.7) g.addPart(e.x + (Math.random() - 0.5) * e.r, e.y - e.r * 1.5, 0, -50, 0.5, 3, '#ff7a1a', PT.EMBER, true);
        g.hurtEnemy(e, e.burnDps * 0.5, false, 0, 0, 0, 0, 0);
        if (e.dead) continue;
      }
    }
    const slow = e.slowT > 0 ? 0.55 : 1;
    if (e.slowT > 0) e.slowT -= dt;

    // objetivo: jugador o estructura defendida
    let tx = p.x, ty = p.y;
    const s = e.targetStruct;
    if (s && s.hp > 0) { tx = s.x; ty = s.y; }

    if (e.boss) updateBoss(g, e, et);
    else {
      switch (e.type) {
        case 'hound':
          e.atkT -= et;
          if (e.state === 1) {
            e.x += e.ax * et; e.y += e.ay * et; e.stateT -= et;
            if (e.stateT <= 0) e.state = 0;
          } else {
            const d = chase(e, tx, ty, e.speed * slow, et);
            if (d < 150 && e.atkT <= 0) {
              e.state = 1; e.stateT = 0.32; e.atkT = 1.8 + Math.random();
              e.ax = ((tx - e.x) / d) * e.speed * 2.6; e.ay = ((ty - e.y) / d) * e.speed * 2.6;
            }
          }
          break;
        case 'rider':
          e.atkT -= et;
          if (e.state === 1) { // telegrafía
            e.stateT -= et;
            if (e.stateT <= 0) { e.state = 2; e.stateT = 1.0; }
          } else if (e.state === 2) {
            e.x += e.ax * et; e.y += e.ay * et; e.stateT -= et;
            if (Math.random() < 0.6) g.addPart(e.x, e.y, (Math.random() - 0.5) * 60, -20, 0.5, 8, '#5a3a2a', PT.SMOKE, false).grow = 20;
            if (e.stateT <= 0) { e.state = 0; e.atkT = 2.5 + Math.random(); }
          } else {
            const d = chase(e, tx, ty, e.speed * slow, et);
            if (d < 460 && e.atkT <= 0) {
              e.state = 1; e.stateT = 0.7;
              e.ax = ((tx - e.x) / d) * 560; e.ay = ((ty - e.y) / d) * 560; e.face = e.ax > 0 ? 1 : -1;
              const z = g.addZone(ZK.CHARGE, e.x, e.y, 30, 0.7, 0, '#ff3a12', 0);
              if (z) { z.ang = Math.atan2(e.ay, e.ax); z.len = 560; }
            }
          }
          break;
        case 'shaman': {
          const R = ENEMIES.shaman.ranged;
          const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
          if (d > R.range * 0.95) chase(e, tx, ty, e.speed * slow, et);
          else if (d < R.range * 0.55) { e.x -= (dx / d) * e.speed * 0.8 * et; e.y -= (dy / d) * e.speed * 0.8 * et; }
          else { e.x += (-dy / d) * e.speed * 0.5 * et; e.y += (dx / d) * e.speed * 0.5 * et; }
          e.face = dx > 0 ? 1 : -1;
          e.atkT -= et;
          if (e.atkT <= 0 && d < R.range * 1.15) {
            e.atkT = R.cd * (e.elite ? 0.8 : 1) * (0.85 + Math.random() * 0.3);
            const a = Math.atan2(ty - 20 - (e.y - 40), tx - e.x);
            const n = e.elite ? 3 : 1;
            for (let k = 0; k < n; k++) g.addEBullet(e.x + e.face * 20, e.y - 40, a + (k - (n - 1) / 2) * 0.22, R.speed, R.dmg, 7, 4, '#b04dff', EK.ORB);
          }
          if (e.elite) { // el Nigromante alza a los muertos
            e.summonT -= et;
            if (e.summonT <= 0) {
              e.summonT = 7;
              for (let k = 0; k < 3; k++) {
                const a = Math.random() * TAU;
                const m = g.spawnEnemy('outlaw', e.x + Math.cos(a) * 70, e.y + Math.sin(a) * 70);
                if (m) for (let q = 0; q < 5; q++) g.addPart(m.x, m.y, (Math.random() - 0.5) * 100, -Math.random() * 120, 0.6, 4, '#b04dff', PT.EMBER, true);
              }
            }
          }
          break;
        }
        case 'sniper':
          updateSniper(g, e, et);
          break;
        default:
          chase(e, tx, ty, e.speed * slow, et);
      }
    }

    // empuje (knockback)
    e.x += e.vx * et; e.y += e.vy * et; e.vx *= damp; e.vy *= damp;
    const lim = HALF + 120;
    if (e.x < -lim) e.x = -lim; else if (e.x > lim) e.x = lim;
    if (e.y < -lim) e.y = -lim; else if (e.y > lim) e.y = lim;

    // estructuras: colisión y asedio
    for (let k = 0; k < g.structs.length; k++) {
      const st = g.structs[k];
      if (!st.solid || st.hp <= 0) continue;
      const dx = e.x - st.x, dy = e.y - st.y, d = Math.hypot(dx, dy) || 1, m = st.r + e.r;
      if (d < m) {
        e.x = st.x + (dx / d) * m; e.y = st.y + (dy / d) * m;
        if (st.defend && st === s) g.hurtStruct(st, e.dmg * 0.6 * et);
      }
    }

    if (!e.boss) g.grid.insert(e);

    // daño por contacto
    if (e.type !== 'sniper' && e.alpha > 0.5) {
      const dx = p.x - e.x, dy = p.y - e.y, rr = e.r + p.r;
      if (dx * dx + dy * dy < rr * rr) g.hurtPlayer(e.dmg);
    }
  }
  separate(g);
}

// Separación ligera dentro de cada celda (evita que la horda se apile en un punto).
function separate(g) {
  const grid = g.grid;
  for (let u = 0; u < grid.used.length; u++) {
    const c = grid.cells[grid.used[u]];
    const n = c.length;
    if (n < 2) continue;
    for (let a = 0; a < n; a++) {
      const A = c[a];
      for (let b = a + 1; b < n && b < a + 8; b++) {
        const B = c[b];
        const dx = B.x - A.x, dy = B.y - A.y, m = (A.r + B.r) * 0.85;
        const d2 = dx * dx + dy * dy;
        if (d2 < m * m && d2 > 0.0001) {
          const d = Math.sqrt(d2), push = (m - d) * 0.5 / d;
          A.x -= dx * push; A.y -= dy * push; B.x += dx * push; B.y += dy * push;
        }
      }
    }
  }
}

function updateSniper(g, e, dt) {
  const p = g.player;
  e.stateT -= dt;
  e.face = p.x > e.x ? 1 : -1;
  switch (e.state) {
    case 0: // aparece
      e.alpha = Math.min(1, e.alpha + dt * 2);
      if (e.stateT <= -0.6) { e.state = 1; e.stateT = 1.3; Sfx.play('laser'); }
      break;
    case 1: // apunta siguiendo al jugador
      e.ax = p.x; e.ay = p.y - 20;
      if (e.stateT <= 0) { e.state = 2; e.stateT = 0.38; }
      break;
    case 2: // fija la mira y parpadea
      if (e.stateT <= 0) {
        const a = Math.atan2(e.ay - (e.y - 34), e.ax - e.x);
        g.addEBullet(e.x + Math.cos(a) * 30, e.y - 34 + Math.sin(a) * 30, a, 980, e.dmg, 6, 2.5, '#7fffd4', EK.FAST);
        g.addPart(e.x + Math.cos(a) * 30, e.y - 34 + Math.sin(a) * 30, 0, 0, 0.08, 16, '#7fffd4', PT.FLASH, true);
        Sfx.play('rifle');
        e.shots++;
        if (e.shots >= 2) { e.state = 3; e.stateT = 0.7; } else { e.state = 4; e.stateT = 0.9; }
      }
      break;
    case 4:
      if (e.stateT <= 0) { e.state = 1; e.stateT = 1.2; Sfx.play('laser'); }
      break;
    case 3: // se desvanece sin botín
      e.alpha = Math.max(0, e.alpha - dt * 1.6);
      if (e.stateT <= 0) e.dead = true;
      break;
    default: break;
  }
  if (e.state === 0 && e.alpha === 0) e.alpha = 0.01;
}

// ---------------------------------------------------------------- JEFES
const PATTERNS = {
  sheriff: { move: 2.0, list: ['fan', 'ring', 'summon', 'fan', 'charge', 'ring'], summon: ['outlaw', 6], color: '#ffcf6a' },
  bride: { move: 1.7, list: ['teleport', 'spiral', 'summon', 'teleport', 'ring', 'charge'], summon: ['hound', 6], color: '#9fe8ff' },
  foreman: { move: 1.9, list: ['charge', 'dynamite', 'slam', 'summon', 'dynamite', 'slam'], summon: ['miner', 3], color: '#ff8a2a' },
  preacher: { move: 1.5, list: ['spiral', 'skulls', 'pools', 'summon', 'ring', 'teleport', 'slam', 'skulls'], summon: ['shaman', 3], color: '#b04dff' },
};
const DUR = { fan: 1.6, ring: 1.4, summon: 1.0, charge: 1.6, spiral: 2.8, teleport: 1.1, dynamite: 1.8, slam: 1.4, skulls: 1.2, pools: 1.0 };

function ringShot(g, e, n, speed, off, color) {
  for (let i = 0; i < n; i++) g.addEBullet(e.x, e.y - e.r, off + (i / n) * TAU, speed, e.dmg * 0.6, 8, 6, color, EK.ORB);
}

function updateBoss(g, e, dt) {
  const B = PATTERNS[e.bossId], p = g.player, col = B.color;
  const hpf = e.hp / e.maxHp;
  const phase = hpf < 0.33 ? 2 : hpf < 0.66 ? 1 : 0;
  if (phase > e.phase) {
    e.phase = phase; g.cam.shake = 14; Sfx.play('boss');
    g.comicText(e.x, e.y - 120, phase === 2 ? '¡IRA ABISAL!' : '¡FURIA!', col, 32);
    ringShot(g, e, 28, 240, 0, col);
  }
  dt *= 1 + e.phase * 0.22;
  e.modeT -= dt;
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
  e.face = dx > 0 ? 1 : -1;

  if (e.mode === 'move') {
    if (d > 140) { e.x += (dx / d) * e.speed * dt; e.y += (dy / d) * e.speed * dt; }
    if (e.modeT <= 0) {
      e.mode = B.list[e.patIdx++ % B.list.length];
      e.modeT = DUR[e.mode]; e.subT = 0; e.subN = 0; e.state = 0;
    }
    return;
  }
  e.subT += dt;
  switch (e.mode) {
    case 'fan':
      if (e.subT >= 0.45 * e.subN && e.subN < 3) {
        e.subN++;
        const a = Math.atan2(dy - 10, dx), n = 7 + e.phase * 2;
        for (let i = 0; i < n; i++) g.addEBullet(e.x, e.y - e.r, a + (i - (n - 1) / 2) * 0.12, 330, e.dmg * 0.6, 7, 4, col, EK.FAST);
        Sfx.play('shot');
      }
      break;
    case 'ring':
      if (e.subT >= 0.6 * e.subN && e.subN < 2 + e.phase) {
        e.subN++;
        ringShot(g, e, 20 + e.phase * 4, 220, e.subN * 0.15, col);
      }
      break;
    case 'summon':
      if (e.subN === 0) {
        e.subN = 1;
        const [type, n] = B.summon;
        for (let i = 0; i < n + e.phase; i++) {
          const a = (i / n) * TAU;
          g.spawnEnemy(type, e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90);
        }
        for (let i = 0; i < 20; i++) g.addPart(e.x, e.y - 40, (Math.random() - 0.5) * 300, (Math.random() - 0.5) * 300, 0.7, 6, col, PT.EMBER, true);
        g.comicText(e.x, e.y - 110, '¡LEVANTAOS!', col, 22);
      }
      break;
    case 'charge':
      if (e.state === 0) {
        e.state = 1;
        e.ax = (dx / d) * 640; e.ay = (dy / d) * 640;
        const z = g.addZone(ZK.CHARGE, e.x, e.y, e.r, 0.6, 0, col, 0);
        if (z) { z.ang = Math.atan2(dy, dx); z.len = 640; }
      } else if (e.subT > 0.6 && e.subT < 1.4) {
        e.x += e.ax * dt; e.y += e.ay * dt;
        if (Math.random() < 0.7) g.addPart(e.x, e.y, (Math.random() - 0.5) * 80, -20, 0.6, 10, '#4a3a2a', PT.SMOKE, false).grow = 20;
      }
      break;
    case 'spiral':
      if (e.subT >= 0.07 * e.subN) {
        e.subN++;
        e.ang += 0.27;
        const arms = 2 + (e.phase >= 1 ? 1 : 0) + (e.bossId === 'preacher' && e.phase === 2 ? 1 : 0);
        for (let k = 0; k < arms; k++) g.addEBullet(e.x, e.y - e.r, e.ang + (k / arms) * TAU, 200, e.dmg * 0.5, 7, 6, col, EK.ORB);
      }
      break;
    case 'teleport':
      if (e.subT < 0.4) e.alpha = Math.max(0.05, 1 - e.subT / 0.4);
      else if (e.state === 0) {
        e.state = 1;
        const a = Math.random() * TAU;
        e.x = Math.max(-HALF + 60, Math.min(HALF - 60, p.x + Math.cos(a) * 230));
        e.y = Math.max(-HALF + 60, Math.min(HALF - 60, p.y + Math.sin(a) * 230));
        for (let i = 0; i < 16; i++) g.addPart(e.x, e.y - 40, (Math.random() - 0.5) * 260, (Math.random() - 0.5) * 260, 0.6, 5, col, PT.EMBER, true);
      } else {
        e.alpha = Math.min(1, (e.subT - 0.4) / 0.4);
        if (e.subN === 0 && e.subT > 0.8) { e.subN = 1; ringShot(g, e, 14 + e.phase * 4, 230, Math.random(), col); }
      }
      break;
    case 'dynamite':
      if (e.subT >= 0.35 * e.subN && e.subN < 5) {
        e.subN++;
        g.addLob(e.x, e.y - 60, p.x + (Math.random() - 0.5) * 120, p.y + (Math.random() - 0.5) * 120, 0.9, e.dmg * 0.8, 78, '#ff6a12');
      }
      break;
    case 'slam':
      if (e.subN === 0) { e.subN = 1; g.addZone(ZK.SLAM, e.x, e.y, 210, 0.9, e.dmg, col, 0); }
      else if (e.subN === 1 && e.subT >= 0.9) { e.subN = 2; ringShot(g, e, 24 + e.phase * 6, 260, 0, col); g.cam.shake = 16; }
      break;
    case 'skulls':
      if (e.subN === 0) {
        e.subN = 1;
        for (let i = 0; i < 6 + e.phase * 2; i++) {
          const b = g.addEBullet(e.x, e.y - 60, (i / (6 + e.phase * 2)) * TAU, 170, e.dmg * 0.7, 10, 5.5, '#d8c8a0', EK.SKULL);
          if (b) b.homing = 1.7;
        }
      }
      break;
    case 'pools':
      if (e.subN === 0) {
        e.subN = 1;
        for (let i = 0; i < 4 + e.phase; i++) {
          const a = Math.random() * TAU, r = i === 0 ? 0 : 90 + Math.random() * 160;
          const z = g.addZone(ZK.POOL, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 80, 6, e.dmg * 0.5, '#7a1aff', 0);
          if (z) z.tick = 0.6;
        }
      }
      break;
    default: break;
  }
  if (e.modeT <= 0) { e.mode = 'move'; e.modeT = B.move; e.alpha = 1; e.state = 0; }
}
