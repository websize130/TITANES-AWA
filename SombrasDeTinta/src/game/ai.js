// IA de la horda y de los Colosos de Élite. Estado en los objetos del pool; sin asignaciones por frame.
import { HX, HY, EK, ZK, PT } from './engine.js';
import { zombieVsCovers } from './traps.js';
import { Sfx } from '../core/audio.js';
import { TAU } from '../art/ink.js';

function chase(e, tx, ty, sp, dt) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  e.x += (dx / d) * sp * dt; e.y += (dy / d) * sp * dt;
  if (dx > 2) e.face = 1; else if (dx < -2) e.face = -1;
  return d;
}

export function updateZombies(g, dt) {
  const Z = g.zombies.items, p = g.player, damp = Math.max(0, 1 - 7 * dt), spdK = g.objective.speedMult || 1;
  g.grid.clear();
  for (let i = g.zombies.n - 1; i >= 0; i--) {
    const e = Z[i];
    if (e.dead) {
      if (e.colossus) { const k = g.colossi.indexOf(e); if (k !== -1) g.colossi.splice(k, 1); }
      g.zombies.kill(i); continue;
    }
    e.flash -= dt; if (e.atkAnim > 0) e.atkAnim -= dt;
    if (e.burnT > 0) {
      e.burnT -= dt; e.burnTick -= dt;
      if (e.burnTick <= 0) {
        e.burnTick = 0.5;
        if (Math.random() < 0.7) g.addPart(e.x + (Math.random() - 0.5) * e.r, e.y - e.r * 1.5, 0, -50, 0.5, 3, '#ff7a1a', PT.EMBER, true);
        g.hurtZombie(e, e.burnDps * 0.5, false, 0, 0, 0, 0, 0, 0);
        if (e.dead) continue;
      }
    }
    const slow = e.slowT > 0 ? 0.6 : 1;
    if (e.slowT > 0) e.slowT -= dt;
    if (e.stunT > 0) e.stunT -= dt;
    if (e.fearT > 0) e.fearT -= dt;
    if (e.rootT > 0) e.rootT -= dt;
    const frozen = e.stunT > 0 || e.rootT > 0;
    let tx = p.x, ty = p.y;
    if (e.target && e.target.hp > 0) { tx = e.target.x; ty = e.target.y; }
    const sp = frozen ? 0 : e.speed * slow * spdK;

    if (e.colossus) updateColossus(g, e, frozen ? 0 : dt);
    else if (e.fearT > 0) { // aterrado por un chiste: huye
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      e.x += (dx / d) * sp * 0.9 * dt; e.y += (dy / d) * sp * 0.9 * dt; e.face = dx > 0 ? 1 : -1;
    } else switch (e.type) {
      case 'hound': { // zig-zag y flanqueo: rodea al objetivo antes de morder
        const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
        const side = d > 90 ? 0.9 * e.flank : 0.15 * e.flank, zz = Math.sin(g.time * 7 + e.uid) * 0.55;
        const nx = dx / d, ny = dy / d, px = -ny * (side + zz), py = nx * (side + zz);
        const mx = nx + px, my = ny + py, ml = Math.hypot(mx, my) || 1;
        e.x += (mx / ml) * sp * dt; e.y += (my / ml) * sp * dt; e.face = dx > 0 ? 1 : -1;
        if (Math.random() < dt * 0.4) e.flank = -e.flank;
        break;
      }
      case 'spider': // enjambre: avanzan en grupo con un temblor nervioso
        chase(e, tx + Math.sin(g.time * 11 + e.uid) * 24, ty + Math.cos(g.time * 9 + e.uid * 1.3) * 24, sp, dt);
        break;
      case 'abomination': {
        const S = e.def.spit, d = Math.hypot(tx - e.x, ty - e.y);
        e.atkT -= dt;
        if (e.state === 1) { // apunta y escupe bilis de tinta en cono
          e.stateT -= dt; e.atkAnim = 0.15;
          if (e.stateT <= 0) {
            e.state = 0; e.atkT = S.cd;
            for (let k = 0; k < S.count; k++) g.addEBullet(e.x + e.face * 20, e.y - 40, e.ang + (k - (S.count - 1) / 2) * (S.cone / (S.count - 1)), S.speed * (0.85 + Math.random() * 0.3), e.dmg * 0.6, 8, 1.6, '#3a2a6a', EK.INK);
            Sfx.play('groan');
          }
        } else {
          if (d > S.range * 0.75) chase(e, tx, ty, sp, dt);
          if (d < S.range && e.atkT <= 0 && !frozen) {
            e.state = 1; e.stateT = 0.6; e.ang = Math.atan2(ty - 20 - (e.y - 40), tx - e.x);
            const z = g.addZone(ZK.CONE, e.x, e.y - 20, S.range, 0.6, 0, '#5a3aaa', 0); if (z) { z.ang = e.ang; z.len = S.cone; }
          }
        }
        break;
      }
      case 'runner':
        chase(e, tx + Math.sin(g.time * 3 + e.uid) * 30, ty, sp, dt);
        break;
      case 'forker':
        e.atkT -= dt;
        if (e.state === 1) { e.atkAnim = 0.15; if (!frozen) { e.x += e.ax * dt; e.y += e.ay * dt; } e.stateT -= dt; if (e.stateT <= 0) e.state = 0; }
        else {
          const d = chase(e, tx, ty, sp, dt);
          if (d < 140 && e.atkT <= 0 && !frozen) { e.state = 1; e.stateT = 0.3; e.atkT = 2 + Math.random(); e.ax = ((tx - e.x) / d) * e.speed * 3.4; e.ay = ((ty - e.y) / d) * e.speed * 3.4; }
        }
        break;
      case 'dynamiter':
        if (e.state === 1) {
          e.stateT -= dt; e.atkAnim = 0.15; e.flash = (g.realTime * 12) % 1 < 0.5 ? 0.05 : 0;
          if (e.stateT <= 0) { g.hurtZombie(e, 99999, false, 0, 0, 0, 0, 0, 0); continue; }
        } else {
          const d = chase(e, tx, ty, sp, dt);
          if (Math.random() < dt * 6) g.addPart(e.x + e.face * 3, e.y - 40, (Math.random() - 0.5) * 40, -40, 0.3, 2, '#ffd23a', PT.SPARK, true);
          if (d < 64) { e.state = 1; e.stateT = 0.6; g.addText(e.x, e.y - 60, '¡TSSS!', '#ffd23a', 14, true); }
        }
        break;
      default:
        chase(e, tx, ty, sp, dt);
    }

    e.x += e.vx * dt; e.y += e.vy * dt; e.vx *= damp; e.vy *= damp;
    if (e.x < -HX - 120) e.x = -HX - 120; else if (e.x > HX + 120) e.x = HX + 120;
    if (e.y < -HY - 120) e.y = -HY - 120; else if (e.y > HY + 120) e.y = HY + 120;
    zombieVsCovers(g, e, dt);
    for (let k = 0; k < g.structs.length; k++) {
      const s = g.structs[k];
      if (s.hp <= 0) continue;
      const dx = e.x - s.x, dy = e.y - s.y, d = Math.hypot(dx, dy) || 1, m = s.r + e.r;
      if (d < m) { e.x = s.x + (dx / d) * m; e.y = s.y + (dy / d) * m; if (e.target === s) s.hp -= e.dmg * 0.7 * dt * g.objective.dmgMult; }
    }
    if (!e.colossus) g.grid.insert(e);
    if (e.stunT <= 0 && e.fearT <= 0) {
      const dx = p.x - e.x, dy = p.y - e.y, rr = e.r + p.r;
      if (dx * dx + dy * dy < (rr + 26) * (rr + 26)) e.atkAnim = Math.max(e.atkAnim, 0.28); // zarpazo / mordisco visible al llegar
      if (dx * dx + dy * dy < rr * rr) { g.hurtPlayer(e.dmg); if (e.def.stun) g.stunPlayer(e.def.stun); }
    }
  }
  separate(g);
}

function separate(g) {
  const grid = g.grid;
  for (let u = 0; u < grid.used.length; u++) {
    const c = grid.cells[grid.used[u]], n = c.length;
    if (n < 2) continue;
    for (let a = 0; a < n; a++) {
      const A = c[a];
      for (let b = a + 1; b < n && b < a + 8; b++) {
        const B = c[b], dx = B.x - A.x, dy = B.y - A.y, m = (A.r + B.r) * 0.85, d2 = dx * dx + dy * dy;
        if (d2 < m * m && d2 > 0.0001) { const d = Math.sqrt(d2), k = (m - d) * 0.5 / d; A.x -= dx * k; A.y -= dy * k; B.x += dx * k; B.y += dy * k; }
      }
    }
  }
}

// ---------------------------------------------------------------- COLOSOS DE ÉLITE
const PAT = {
  foreman: { move: 1.9, list: ['charge', 'dynamite', 'slam', 'summon', 'dynamite', 'charge', 'slam'], summon: ['dynamiter', 3], color: '#ffb040' },
  faceless: { move: 1.6, list: ['pages', 'teleport', 'summon', 'pools', 'pages', 'teleport'], summon: ['walker', 6], color: '#c8b8ff' },
  plague: { move: 1.6, list: ['raise', 'pages', 'pools', 'raise', 'teleport', 'summon'], summon: ['walker', 4], color: '#9dff3a' },
  spawn: { move: 2.4, list: ['charge', 'dynamite', 'slam', 'summon', 'dynamite'], summon: ['dynamiter', 3], color: '#ffb040' },
  beast: { move: 1.4, list: ['leap', 'bile', 'swipe', 'charge', 'leap', 'summon'], summon: ['forker', 3], color: '#9dff3a' },
};
const DUR = { raise: 1.2, charge: 1.6, dynamite: 1.8, slam: 1.4, summon: 1.0, pages: 2.8, teleport: 1.1, pools: 1.0, leap: 1.6, bile: 1.5, swipe: 0.9 };

function ring(g, e, n, sp, off, col, kind = EK.ORB) {
  for (let i = 0; i < n; i++) g.addEBullet(e.x, e.y - e.r, off + (i / n) * TAU, sp, e.dmg * 0.55, 8, 6, col, kind);
}

function updateColossus(g, e, dt) {
  const B = PAT[e.type], p = g.player, col = B.color;
  const hpf = e.hp / e.maxHp, phase = hpf < 0.33 ? 2 : hpf < 0.66 ? 1 : 0;
  if (phase > e.phase) { e.phase = phase; g.cam.shake = 14; Sfx.play('boss'); g.say(e, e.def.taunts, 2.2, true); ring(g, e, 26, 230, 0, col); }
  e.tauntT -= dt; if (e.tauntT <= 0) { e.tauntT = 14 + Math.random() * 6; g.say(e, e.def.taunts, 2, true); }
  dt *= 1 + e.phase * 0.2;
  e.modeT -= dt;
  const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
  if (e.type === 'spawn') { // gira despacio: rodearlo expone la dinamita de la espalda
    const target = Math.atan2(dy, dx);
    let da = target - e.ang; while (da > Math.PI) da -= TAU; while (da < -Math.PI) da += TAU;
    const tr = (e.def.turn || 0.8) * dt;
    e.ang += Math.max(-tr, Math.min(tr, da));
    e.face = Math.cos(e.ang) >= 0 ? 1 : -1;
  } else e.face = dx > 0 ? 1 : -1;
  if (e.mode === 'move') {
    if (d > 120) {
      if (e.type === 'spawn') { e.x += Math.cos(e.ang) * e.speed * dt; e.y += Math.sin(e.ang) * e.speed * dt; }
      else { e.x += (dx / d) * e.speed * dt; e.y += (dy / d) * e.speed * dt; }
    }
    if (e.modeT <= 0) { e.mode = B.list[e.patIdx++ % B.list.length]; e.modeT = DUR[e.mode]; e.subT = 0; e.subN = 0; e.state = 0; }
    return;
  }
  e.subT += dt;
  switch (e.mode) {
    case 'charge':
      if (e.state === 0) {
        e.state = 1; e.ax = (dx / d) * 650; e.ay = (dy / d) * 650;
        const z = g.addZone(ZK.CHARGE, e.x, e.y, e.r, 0.6, 0, col, 0); if (z) { z.ang = Math.atan2(dy, dx); z.len = 650; }
      } else if (e.subT > 0.6 && e.subT < 1.4) {
        e.x += e.ax * dt; e.y += e.ay * dt;
        if (Math.random() < 0.7) g.addPart(e.x, e.y, (Math.random() - 0.5) * 80, -20, 0.6, 10, '#2a2420', PT.SMOKE, false).grow = 20;
      }
      break;
    case 'dynamite':
      if (e.subT >= 0.35 * e.subN && e.subN < 5) { e.subN++; g.addLob(e.x, e.y - 70, p.x + (Math.random() - 0.5) * 140, p.y + (Math.random() - 0.5) * 140, 0.9, e.dmg * 0.8, 80, '#ff6a12'); }
      break;
    case 'slam':
      if (e.subN === 0) { e.subN = 1; g.addZone(ZK.SLAM, e.x, e.y, 210, 0.9, e.dmg, col, 0); }
      else if (e.subN === 1 && e.subT >= 0.9) { e.subN = 2; ring(g, e, 22 + e.phase * 6, 250, 0, col); g.cam.shake = 16; }
      break;
    case 'raise': // el Predicador de la Peste resucita caminantes mientras su farol arda
      if (e.subN === 0) {
        e.subN = 1;
        if (e.lampOut) { g.addText(e.x, e.y - 130, 'Sin farol no hay milagro…', '#9dff3a', 14, false); break; }
        for (let i = 0; i < 6 + e.phase * 2; i++) {
          const a = Math.random() * TAU, r = 80 + Math.random() * 160;
          const z = g.spawnZombie('walker', e.x + Math.cos(a) * r, e.y + Math.sin(a) * r, g.objective.hpMult || 1, 1);
          if (z) for (let k = 0; k < 4; k++) g.addPart(z.x, z.y, (Math.random() - 0.5) * 80, -40 - Math.random() * 80, 0.8, 4, '#9dff3a', PT.EMBER, true);
        }
        g.ono(e.x, e.y - 130, '¡LEVANTAOS!', '#9dff3a', 28);
      }
      break;
    case 'summon':
      if (e.subN === 0) {
        e.subN = 1;
        const [type, n] = B.summon;
        for (let i = 0; i < n + e.phase; i++) { const a = (i / n) * TAU; g.spawnZombie(type, e.x + Math.cos(a) * 90, e.y + Math.sin(a) * 90, g.objective.hpMult || 1, 1); }
        g.comicText(e.x, e.y - 130, '¡LEVANTAOS!', col, 22);
      }
      break;
    case 'pages':
      if (e.subT >= 0.08 * e.subN) {
        e.subN++; e.ang += 0.31;
        const arms = 2 + e.phase;
        for (let k = 0; k < arms; k++) g.addEBullet(e.x, e.y - e.r * 1.5, e.ang + (k / arms) * TAU, 190, e.dmg * 0.45, 8, 6, '#e8dcc0', EK.PAGE);
      }
      break;
    case 'teleport':
      if (e.subT < 0.4) e.alpha = Math.max(0.05, 1 - e.subT / 0.4);
      else if (e.state === 0) {
        e.state = 1; const a = Math.random() * TAU;
        e.x = Math.max(-HX + 60, Math.min(HX - 60, p.x + Math.cos(a) * 230)); e.y = Math.max(-HY + 60, Math.min(HY - 60, p.y + Math.sin(a) * 230));
        for (let i = 0; i < 16; i++) g.addPart(e.x, e.y - 50, (Math.random() - 0.5) * 260, (Math.random() - 0.5) * 260, 0.6, 5, col, PT.EMBER, true);
      } else {
        e.alpha = Math.min(1, (e.subT - 0.4) / 0.4);
        if (e.subN === 0 && e.subT > 0.8) { e.subN = 1; ring(g, e, 14 + e.phase * 4, 220, Math.random(), col, EK.PAGE); }
      }
      break;
    case 'pools':
      if (e.subN === 0) {
        e.subN = 1;
        for (let i = 0; i < 4 + e.phase; i++) { const a = Math.random() * TAU, r = i === 0 ? 0 : 90 + Math.random() * 160; const z = g.addZone(ZK.POOL, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r, 80, 6, e.dmg * 0.5, '#5a3aaa', 0); if (z) z.tick = 0.6; }
      }
      break;
    case 'leap':
      if (e.state === 0) { e.state = 1; e.ax = p.x; e.ay = p.y; g.addZone(ZK.SLAM, p.x, p.y, 170, 1.1, e.dmg * 1.2, col, 0); e.ang = Math.hypot(p.x - e.x, p.y - e.y); }
      else if (e.subT < 1.1) { const k = Math.min(1, dt / Math.max(0.05, 1.1 - e.subT + dt)); e.x += (e.ax - e.x) * k; e.y += (e.ay - e.y) * k; e.alpha = 0.85; }
      else e.alpha = 1;
      break;
    case 'bile':
      if (e.subT >= 0.4 * e.subN && e.subN < 3) { e.subN++; g.addLob(e.x, e.y - 60, p.x + (Math.random() - 0.5) * 160, p.y + (Math.random() - 0.5) * 160, 0.8, e.dmg * 0.5, 85, '#9dff3a', true); }
      break;
    case 'swipe':
      if (e.subN === 0 && e.subT > 0.35) {
        e.subN = 1;
        if (d < e.r + 110) g.hurtPlayer(e.dmg * 1.2);
        for (let i = 0; i < 9; i++) g.addEBullet(e.x, e.y - e.r, Math.atan2(dy, dx) + (i - 4) * 0.16, 300, e.dmg * 0.5, 8, 1.1, col, EK.FAST);
        g.comicText(e.x, e.y - 100, '¡ZARPAZO!', col, 22);
      }
      break;
    default: break;
  }
  if (e.modeT <= 0) { e.mode = 'move'; e.modeT = B.move; e.alpha = 1; e.state = 0; }
}
