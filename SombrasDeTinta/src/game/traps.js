// Trampas ambientales y destructibles: cepos ocultos, faroles de gas que incendian el suelo al dispararles,
// barriles de dinamita en cadena y coberturas que se astillan por fases. Afectan al jugador y a la horda.
import { HALF, ZK, PT } from './engine.js';
import { makeRng, TAU } from '../art/ink.js';
import { Sfx } from '../core/audio.js';
import { BARKS } from '../data/heroes.js';

const COVERS = ['wagon', 'crates', 'barricade'];

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
      const x = (r() * 2 - 1) * (HALF - 120), y = (r() * 2 - 1) * (HALF - 120);
      if (!ok(x, y, d)) continue;
      pts.push([x, y]); fn(x, y, i); i++;
    }
  };
  place(7, 200, (x, y, i) => mk(g, 'cover', x, y, { r: 46, hp: 320, maxHp: 320, solid: true, variant: COVERS[i % 3] }));
  place(8, 160, (x, y) => mk(g, 'lantern', x, y, { r: 10 }));
  place(7, 150, (x, y) => mk(g, 'barrel', x, y, { r: 18, hp: 30, maxHp: 30, solid: true }));
  place(12, 110, (x, y) => mk(g, 'bear', x, y, { r: 18 }));
}

// Restaura destructibles (supervivencia: cada pocas rondas).
export function restoreTraps(g) {
  for (const t of g.traps) {
    if (t.owned) continue;
    t.dead = false; t.hp = t.maxHp; t.armed = true; t.fuse = 0; t.flash = 0;
  }
}

export function placeTrap(g, x, y) {
  x = Math.max(-HALF, Math.min(HALF, x)); y = Math.max(-HALF, Math.min(HALF, y));
  mk(g, 'bear', x, y, { r: 20, owned: true, life: 30 });
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
      case 'barrel':
        if (t.dead) break;
        if (t.fuse > 0) { t.fuse -= dt; if (t.fuse <= 0) blowBarrel(g, t); }
        else if (t.hp <= 0) t.fuse = 0.12;
        break;
      case 'cover':
        if (t.dead) break;
        t.phase = t.hp > t.maxHp * 0.66 ? 0 : t.hp > t.maxHp * 0.33 ? 1 : 2;
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

function blowBarrel(g, t) {
  t.dead = true;
  g.explode(t.x, t.y - 14, 125, 170 * g.st.trapMult, '#ff8a2a', 1, 5, 420, false, true);
  g.explodeHitsPlayer(t.x, t.y, 125, 30, true);
  g.addZone(ZK.FIRE, t.x, t.y, 70, 3, 18, '#ff6a1a', 1);
}

export function breakLantern(g, t) {
  if (t.dead) return;
  t.dead = true; Sfx.play('boom');
  g.addZone(ZK.FIRE, t.x + 18, t.y, 100, 6.5, 26 * g.st.trapMult, '#ff6a1a', 1);
  g.comicText(t.x, t.y - 110, '¡FWOOSH!', '#ffb040', 22);
  for (let k = 0; k < 14; k++) g.addPart(t.x + 18, t.y - 92, (Math.random() - 0.5) * 200, Math.random() * 120, 0.6, 3, '#ffe08a', PT.SPARK, true);
}

// Proyectil del jugador contra faroles/barriles. Devuelve true si el proyectil se consume.
export function bulletVsTraps(g, b) {
  for (let i = 0; i < g.traps.length; i++) {
    const t = g.traps[i];
    if (t.dead) continue;
    if (t.kind === 'lantern') {
      const dx = t.x + 18 - b.x, dy = t.y - 92 - b.y;
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

