// Trampas ambientales y destructibles: cepos ocultos, faroles de gas que incendian el suelo al dispararles,
// barriles de dinamita en cadena y coberturas que se astillan por fases. Afectan al jugador y a la horda.
import { HX, HY, ZK, PT, zoneAt } from './engine.js';
import { makeRng, TAU } from '../art/ink.js';
import { Sfx } from '../core/audio.js';
import { BARKS } from '../data/heroes.js';

const COVERS = ['wagon', 'crates', 'barricade'];
const ZONE_COVERS = [['barricade', 'wagon', 'crates'], ['tomb', 'tomb', 'barricade'], ['crates', 'barricade', 'wagon']];

function mk(g, kind, x, y, extra) {
  const t = { kind, x, y, r: 16, hp: 1, maxHp: 1, dead: false, solid: false, flash: 0, armed: true, rearm: 0, owned: false, fuse: 0, phase: 0, variant: '', life: 0, ...extra };
  g.traps.push(t);
  return t;
}

export function buildTraps(g) {
  const r = makeRng(g.mapId.length * 131 + 7);
  const pts = [];
  const ok = (x, y, d) => Math.hypot(x, y - 120) > 230 && pts.every((p) => Math.hypot(p[0] - x, p[1] - y) > d);
  const place = (n, d, fn) => {
    for (let i = 0, tries = 0; i < n && tries < 400; tries++) {
      const x = (r() * 2 - 1) * (HX - 120), y = (r() * 2 - 1) * (HY - 120);
      if (!ok(x, y, d)) continue;
      pts.push([x, y]); fn(x, y, i); i++;
    }
  };
  const tombish = g.mapId === 'chapel' || g.mapId === 'pulpit';
  place(20, 200, (x, y, i) => {
    const v = g.zoned ? ZONE_COVERS[zoneAt(x)][i % 3] : tombish && i % 2 ? 'tomb' : COVERS[i % 3];
    const hp = v === 'tomb' ? 520 : 320;
    mk(g, 'cover', x, y, { r: v === 'tomb' ? 36 : 46, hp, maxHp: hp, solid: true, variant: v });
  });
  place(22, 160, (x, y) => mk(g, 'lantern', x, y, { r: 10 }));
  place(16, 150, (x, y) => mk(g, 'barrel', x, y, { r: 18, hp: 30, maxHp: 30, solid: true }));
  place(28, 110, (x, y) => mk(g, 'bear', x, y, { r: 18 }));
}

// Restaura destructibles (supervivencia: cada pocas rondas).
export function restoreTraps(g) {
  for (const t of g.traps) {
    if (t.owned) continue;
    t.dead = false; t.hp = t.maxHp; t.armed = true; t.fuse = 0; t.flash = 0;
  }
}

export function placeTrap(g, x, y, kind = 'bear') {
  x = Math.max(-HX, Math.min(HX, x)); y = Math.max(-HY, Math.min(HY, y));
  if (kind === 'mine') mk(g, 'mine', x, y, { r: 55, owned: true, life: 40 });
  else mk(g, 'bear', x, y, { r: 20, owned: true, life: 30 });
}

// Farol verde del Predicador de la Peste: le sigue; mientras arda, resucita a los muertos.
export function attachPlagueLamp(g, boss) {
  const t = mk(g, 'plaguelamp', boss.x - 60, boss.y, { r: 16, hp: boss.def.lamp || 170, maxHp: boss.def.lamp || 170, boss, a: 0 });
  boss.lamp = t; boss.lampOut = false;
  return t;
}

function snap(g, t, e) {
  t.armed = false; t.rearm = t.owned ? 0 : 6; t.flash = 0.2;
  Sfx.play('trap');
  g.addText(t.x, t.y - 30, '¡CLANC!', '#d8d8d8', 15, true);
  for (let i = 0; i < 6; i++) g.addPart(t.x, t.y - 8, (Math.random() - 0.5) * 160, -Math.random() * 140, 0.4, 3, '#5a0a0a', PT.BLOOD, false);
  if (!e) return;
  const m = g.st.trapMult * (g.st.trapMaster ? 2 : 1);
  if (e === g.player) { if (!g.st.trapMaster) { g.player.rootT = 0.9; g.hurtPlayer(14, true); } return; }
  g.hurtZombie(e, (e.colossus ? 220 : 75) * m, false, 0, 0, 0, 0, 0, 0);
  if (!e.dead) e.rootT = e.colossus ? 1 : 3;
  if (Math.random() < 0.2) g.say(null, BARKS[g.hero.id].trap, 1.4);
}

export function updateTraps(g, dt) {
  const p = g.player;
  g.barrelsThisFrame = 0;
  for (let i = g.traps.length - 1; i >= 0; i--) {
    const t = g.traps[i];
    t.flash = Math.max(0, t.flash - dt);
    switch (t.kind) {
      case 'bear':
        if (t.owned) { t.life -= dt; if (t.life <= 0 || (!t.armed && t.flash <= 0)) { g.traps.splice(i, 1); continue; } }
        if (!t.armed) { if (!t.owned) { t.rearm -= dt; if (t.rearm <= 0) t.armed = true; } break; }
        if (!t.owned && Math.hypot(p.x - t.x, p.y - t.y) < t.r) { snap(g, t, p); break; }
        {
          const best = g.nearest(t.x, t.y, t.r + 12, 0);
          if (best && Math.hypot(best.x - t.x, best.y - t.y) < t.r + best.r * 0.6) snap(g, t, best);
        }
        break;
      case 'mine': {
        t.life -= dt;
        const e = g.nearest(t.x, t.y, t.r, 0);
        if (e || t.life <= 0) {
          g.explode(t.x, t.y - 10, 115, 150 * g.st.dmg * g.st.trapMult, '#ff8a2a', 1, 4, 420, false, true);
          g.traps.splice(i, 1);
        }
        break;
      }
      case 'plaguelamp': {
        const b = t.boss;
        if (!b || b.dead) { g.traps.splice(i, 1); break; }
        if (t.dead) break;
        t.a += dt * 1.4;
        t.x = b.x + Math.cos(t.a) * 70; t.y = b.y + Math.sin(t.a) * 30 - 10;
        if (t.hp <= 0) {
          t.dead = true; b.lampOut = true;
          g.addZone(ZK.FIRE, t.x, t.y + 20, 90, 5, 24, '#9dff3a', 1);
          g.ono(t.x, t.y - 80, '¡FAROL ROTO!', '#9dff3a', 30);
          g.say(b, ['¡Mi *farol*! ¡Mi luz!', '¡NOOO! ¡La *peste* se apaga!'], 0, true, 3);
        }
        break;
      }
      case 'barrel':
        if (t.dead) break;
        if (t.fuse > 0) { t.fuse -= dt; if (t.fuse <= 0) blowBarrel(g, t); }
        else if (t.hp <= 0) t.fuse = 0.12;
        break;
      case 'cover':
        if (t.dead) break;
        t.phase = t.hp > t.maxHp * 0.66 ? 0 : t.hp > t.maxHp * 0.33 ? 1 : 2;
        if (t.phase === 2 && t.variant !== 'tomb' && Math.random() < dt * 5) g.addPart(t.x + (Math.random() - 0.5) * 70, t.y - 30, (Math.random() - 0.5) * 20, -30 - Math.random() * 30, 1.4, 6, '#2a2624', PT.SMOKE, false).grow = 14;
        if (t.hp <= 0) {
          t.dead = true; Sfx.play('kill');
          g.comicText(t.x, t.y - 50, '¡CRACK!', '#c8a878', 22);
          for (let k = 0; k < 24; k++) g.addPart(t.x + (Math.random() - 0.5) * 80, t.y - 20, (Math.random() - 0.5) * 360, -Math.random() * 260, 0.9, 5, '#8a6a4a', PT.SPLINTER, false);
        }
        break;
      default: break;
    }
  }
}

// Un barril solo estalla una vez (t.dead se marca ANTES de explotar, así ninguna cadena puede volver a él) y
// las cadenas se propagan con mecha (fuse) en fotogramas siguientes, con un máximo de 4 estallidos por fotograma.
function blowBarrel(g, t) {
  if (t.dead) return;
  if (g.barrelsThisFrame >= 4) { t.fuse = 0.05; return; }
  g.barrelsThisFrame++;
  t.dead = true; t.fuse = 0;
  g.explode(t.x, t.y - 14, 125, 170 * g.st.trapMult, '#ff8a2a', 1, 5, 420, false, true);
  g.explodeHitsPlayer(t.x, t.y, 125, 30, true);
  g.addZone(ZK.FIRE, t.x, t.y, 70, 3, 18, '#ff6a1a', 1);
}

export function breakLantern(g, t) {
  if (t.dead) return;
  t.dead = true; Sfx.play('boom');
  g.addZone(ZK.FIRE, t.x + 21, t.y + 6, 100, 6.5, 26 * g.st.trapMult, '#ff6a1a', 1);
  g.comicText(t.x, t.y - 110, '¡FWOOSH!', '#ffb040', 22);
  for (let k = 0; k < 14; k++) g.addPart(t.x + 21, t.y - 88, (Math.random() - 0.5) * 200, Math.random() * 120, 0.6, 3, '#ffe08a', PT.SPARK, true);
}

// Proyectil del jugador contra faroles/barriles. Devuelve true si el proyectil se consume.
export function bulletVsTraps(g, b) {
  for (let i = 0; i < g.traps.length; i++) {
    const t = g.traps[i];
    if (t.dead) continue;
    if (t.kind === 'plaguelamp') {
      const dx = t.x - b.x, dy = t.y - 30 - b.y;
      if (dx * dx + dy * dy < 22 * 22) { t.hp -= b.dmg * g.st.dmg; t.flash = 0.1; return true; }
    } else if (t.kind === 'lantern') {
      const dx = t.x + 21 - b.x, dy = t.y - 88 - b.y;
      if (dx * dx + dy * dy < 196) { breakLantern(g, t); return true; }
    } else if (t.kind === 'barrel') {
      const dx = t.x - b.x, dy = t.y - 20 - b.y;
      if (dx * dx + dy * dy < 22 * 22) { t.hp -= b.dmg; t.flash = 0.1; return true; }
    }
  }
  return false;
}

export function explosionVsTraps(g, x, y, r, dmg) {
  for (let i = 0; i < g.traps.length; i++) {
    const t = g.traps[i];
    if (t.dead) continue;
    const d = Math.hypot(t.x - x, t.y - y);
    if (t.kind === 'barrel' && d < r + 10 && t.fuse <= 0) t.fuse = 0.15 + Math.random() * 0.1;
    else if (t.kind === 'lantern' && d < r) breakLantern(g, t);
    else if (t.kind === 'cover' && d < r + t.r) { t.hp -= Math.max(40, dmg * 0.6); t.flash = 0.1; }
  }
}

// Zombis bloqueados por coberturas: las muerden.
export function zombieVsCovers(g, e, dt) {
  for (let i = 0; i < g.traps.length; i++) {
    const t = g.traps[i];
    if (!t.solid || t.dead) continue;
    const dx = e.x - t.x, dy = e.y - t.y, d = Math.hypot(dx, dy) || 1, m = t.r + e.r;
    if (d < m) {
      e.x = t.x + (dx / d) * m; e.y = t.y + (dy / d) * m;
      if (t.kind === 'cover') { t.hp -= e.dmg * 0.9 * dt; if (Math.random() < dt * 4) g.addPart(t.x + (dx / d) * t.r, t.y - 20, (Math.random() - 0.5) * 80, -60, 0.4, 3, '#a8885a', PT.SPLINTER, false); }
    }
  }
}

