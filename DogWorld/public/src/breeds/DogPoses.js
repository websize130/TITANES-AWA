// Animación procedural: locomoción común + gestos de personalidad por raza.
// Cada gesto recibe (model, t, ctx) y escribe rotaciones sobre una pose neutra;
// ctx.emit(tipo, punto) lanza partículas (notas, hielo, tierra…) y ctx.every()
// limita su frecuencia. Sin asignaciones por frame.

const sin = Math.sin;
const cos = Math.cos;
const abs = Math.abs;
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
const smooth = (x) => { const t = clamp01(x); return t * t * (3 - 2 * t); };

export function resetPose(md) {
  md.rig.position.set(0, 0, 0);
  md.rig.rotation.set(0, 0, 0);
  md.pelvis.rotation.set(0, 0, 0);
  md.chest.rotation.set(0, 0, 0);
  md.head.rotation.set(0, 0, 0);
  md.jaw.rotation.set(0, 0, 0);
  md.tongue.scale.set(1, 1, 1);
  md.tail.rotation.set(md.tail.userData.restX || 0, 0, 0);
  for (const ear of md.ears) {
    ear.rotation.set(ear.userData.restX, 0, ear.userData.restZ);
  }
  const L = md.legs;
  L.fl.rotation.set(0, 0, 0); L.fr.rotation.set(0, 0, 0);
  L.bl.rotation.set(0, 0, 0); L.br.rotation.set(0, 0, 0);
}

/** Mantiene las patas traseras verticales cuando la pelvis se inclina. */
function plantBackLegs(md) {
  md.legs.bl.rotation.x -= md.pelvis.rotation.x;
  md.legs.br.rotation.x -= md.pelvis.rotation.x;
}

function wagTail(md, t, speed, amount) {
  md.tail.rotation.y = sin(t * speed) * amount;
}

function earFlop(md, amount) {
  for (const ear of md.ears) ear.rotation.z = ear.userData.restZ + ear.userData.side * amount;
}

// ---------------------------------------------------------------------------
// Locomoción
// ---------------------------------------------------------------------------
export function poseIdle(md, t) {
  md.rig.position.y = sin(t * 2) * 0.01;
  md.chest.rotation.x = sin(t * 2) * 0.02;
  md.head.rotation.y = sin(t * 0.7) * 0.15;
  md.head.rotation.z = sin(t * 0.45) * 0.05;
  wagTail(md, t, 9, 0.45);
  // Jadeo suave.
  md.jaw.rotation.x = 0.12 + sin(t * 9) * 0.04;
}

export function poseRun(md, t, phase, speed01) {
  const sw = 0.95 * speed01;
  md.legs.fl.rotation.x = sin(phase) * sw;
  md.legs.br.rotation.x = sin(phase) * sw;
  md.legs.fr.rotation.x = sin(phase + Math.PI) * sw;
  md.legs.bl.rotation.x = sin(phase + Math.PI) * sw;
  md.rig.position.y = abs(sin(phase)) * 0.07 * speed01;
  md.pelvis.rotation.x = sin(phase * 2) * 0.04 * speed01;
  md.head.rotation.x = sin(phase * 2) * 0.05;
  earFlop(md, sin(phase) * 0.25 * speed01);
  wagTail(md, t, 14, 0.3);
  md.jaw.rotation.x = 0.2;
}

export function poseAir(md, rising) {
  const tuck = rising ? -0.75 : 0.5;
  md.legs.fl.rotation.x = tuck;
  md.legs.fr.rotation.x = tuck;
  md.legs.bl.rotation.x = -tuck;
  md.legs.br.rotation.x = -tuck;
  md.pelvis.rotation.x = rising ? -0.22 : 0.12;
  earFlop(md, rising ? -0.3 : 0.5);
  md.jaw.rotation.x = 0.25;
}

// ---------------------------------------------------------------------------
// Gestos de personalidad / habilidades
// ---------------------------------------------------------------------------
export const GESTURES = {
  /** Rufus: ladra feliz y baila sobre las patitas traseras. */
  rufusDance(md, t, ctx) {
    const rise = smooth(t * 2.5);
    md.pelvis.rotation.x = -1.15 * rise + sin(t * 8) * 0.06 * rise;
    plantBackLegs(md);
    // Saltitos y giro festivo.
    md.rig.position.y = abs(sin(t * 6)) * 0.12 * rise;
    md.rig.rotation.y = sin(t * 2.2) * 0.7 * rise;
    md.rig.rotation.z = sin(t * 6) * 0.08 * rise;
    // Patitas delanteras haciendo palmas / saludando.
    md.legs.fl.rotation.x = -0.9 + sin(t * 12) * 0.5;
    md.legs.fr.rotation.x = -0.9 + sin(t * 12 + Math.PI) * 0.5;
    md.legs.fl.rotation.z = -0.35 + sin(t * 6) * 0.2;
    md.legs.fr.rotation.z = 0.35 - sin(t * 6) * 0.2;
    // Cabeza al ritmo y ladridos (boca abierta a golpes).
    md.head.rotation.x = 0.5 * rise - 0.15;
    md.head.rotation.z = sin(t * 6) * 0.22;
    const beat = (t * 2.4) % 1;
    const bark = beat < 0.22 ? sin((beat / 0.22) * Math.PI) : 0;
    md.jaw.rotation.x = 0.15 + bark * 0.6;
    md.head.rotation.x -= bark * 0.25;
    md.tongue.scale.set(1, 1, 1 + bark * 0.4);
    earFlop(md, sin(t * 12) * 0.35);
    wagTail(md, t, 22, 0.6);
    if (bark > 0.9 && ctx.every('bark', 0.3)) ctx.emit('bark', 'mouth');
    if (ctx.every('notes', 0.35)) ctx.emit('note', 'head');
    if (ctx.every('hearts', 0.9)) ctx.emit('heart', 'head');
  },

  /** Rayder: se estira y se pone en posición de salida, luego carrera en el sitio. */
  rayderReady(md, t, ctx) {
    const cycle = t % 3;
    if (cycle < 1.2) {
      // Estiramiento: delante abajo, culete arriba ("play bow").
      const k = smooth(cycle / 0.4) * (1 - smooth((cycle - 0.9) / 0.3));
      md.pelvis.rotation.x = 0.35 * k;
      plantBackLegs(md);
      md.legs.fl.rotation.x = -0.9 * k;
      md.legs.fr.rotation.x = -0.9 * k;
      md.rig.position.y = -0.06 * k;
      md.head.rotation.x = -0.35 * k;
      md.jaw.rotation.x = 0.35 * k; // bostezo
      wagTail(md, t, 6, 0.3);
    } else {
      // Tensión y sprint en el sitio con líneas de viento.
      const k = smooth((cycle - 1.2) / 0.3);
      const ph = t * 22;
      md.legs.fl.rotation.x = sin(ph) * 1.1 * k;
      md.legs.br.rotation.x = sin(ph) * 1.1 * k;
      md.legs.fr.rotation.x = sin(ph + Math.PI) * 1.1 * k;
      md.legs.bl.rotation.x = sin(ph + Math.PI) * 1.1 * k;
      md.pelvis.rotation.x = 0.12 * k + sin(ph * 2) * 0.05;
      md.rig.position.y = abs(sin(ph)) * 0.06;
      md.head.rotation.x = 0.2 * k;
      earFlop(md, -0.5 * k);
      md.tail.rotation.x = 0.8 * k;
      md.jaw.rotation.x = 0.3;
      if (ctx.every('wind', 0.06)) ctx.emit('wind', 'back');
    }
  },

  /** Tyson: postura de tipo duro, rasca el suelo y amaga una embestida. */
  tysonTough(md, t, ctx) {
    const cycle = t % 2.6;
    md.legs.fl.rotation.z = -0.18;
    md.legs.fr.rotation.z = 0.18;
    md.pelvis.rotation.x = 0.12;
    plantBackLegs(md);
    md.head.rotation.x = 0.18;
    md.rig.rotation.z = sin(t * 3) * 0.03;
    md.jaw.rotation.x = 0.05 + abs(sin(t * 11)) * 0.06; // gruñido
    if (cycle < 1.4) {
      md.legs.br.rotation.x += -0.4 + sin(cycle * 14) * 0.55;
      if (sin(cycle * 14) > 0.9 && ctx.every('scrape', 0.2)) ctx.emit('dust', 'backPaw');
    } else {
      const k = sin(((cycle - 1.4) / 1.2) * Math.PI);
      md.rig.position.z = k * 0.35;
      md.pelvis.rotation.x = 0.12 + k * 0.25;
      md.head.rotation.x = 0.18 + k * 0.3;
      if (k > 0.95 && ctx.every('huff', 0.6)) ctx.emit('dust', 'mouth');
    }
    wagTail(md, t, 10, 0.25);
  },

  /** Tyson (habilidad): embestida con la cabeza agachada. */
  tysonTackle(md, t, ctx) {
    const ph = t * 24;
    md.pelvis.rotation.x = 0.35;
    plantBackLegs(md);
    md.head.rotation.x = 0.55;
    md.legs.fl.rotation.x = -0.9 + sin(ph) * 0.4;
    md.legs.fr.rotation.x = -0.9 + sin(ph + 1) * 0.4;
    md.legs.bl.rotation.x += 0.6 + sin(ph + 2) * 0.4;
    md.legs.br.rotation.x += 0.6 + sin(ph + 3) * 0.4;
    earFlop(md, -0.5);
    if (ctx.every('tackle', 0.05)) ctx.emit('dust', 'backPaw');
  },

  /** Blizzard: aúlla a las nubes y su aliento escarcha el aire. */
  blizzardHowl(md, t, ctx) {
    const cycle = t % 3.2;
    if (cycle < 1.6) {
      const k = smooth(cycle / 0.35) * (1 - smooth((cycle - 1.3) / 0.3));
      md.pelvis.rotation.x = -0.25 * k;
      plantBackLegs(md);
      md.head.rotation.x = -0.95 * k;
      md.jaw.rotation.x = 0.45 * k;
      md.tongue.scale.set(1, 1, 0.5);
      for (const ear of md.ears) ear.rotation.x = ear.userData.restX - 0.4 * k;
      wagTail(md, t, 4, 0.15);
      if (k > 0.8 && ctx.every('howl', 0.35)) ctx.emit('note', 'mouth');
    } else {
      GESTURES.blizzardBreath(md, cycle - 1.6, ctx);
    }
  },

  /** Blizzard (habilidad): exhala un chorro de escarcha. */
  blizzardBreath(md, t, ctx) {
    const k = smooth(t / 0.25);
    md.head.rotation.x = 0.1 - 0.15 * k;
    md.pelvis.rotation.x = 0.06 * k;
    plantBackLegs(md);
    md.jaw.rotation.x = 0.55 * k;
    md.chest.rotation.x = sin(t * 4) * 0.04;
    md.tongue.scale.set(1, 1, 0.4);
    wagTail(md, t, 6, 0.2);
    if (k > 0.5 && ctx.every('ice', 0.035)) ctx.emit('ice', 'mouth');
  },

  /** Digger: escarba con las patas delanteras moviendo el culete. */
  diggerDig(md, t, ctx) {
    const k = smooth(t / 0.25);
    md.pelvis.rotation.x = 0.42 * k;
    plantBackLegs(md);
    md.head.rotation.x = 0.3 * k;
    const ph = t * 20;
    md.legs.fl.rotation.x = (0.6 + sin(ph) * 0.9) * k;
    md.legs.fr.rotation.x = (0.6 + sin(ph + Math.PI) * 0.9) * k;
    md.rig.rotation.y = sin(t * 9) * 0.1 * k; // menea el culete
    md.tail.rotation.y = sin(t * 18) * 0.7;
    md.jaw.rotation.x = 0.3; // sonrisa con la lengua fuera
    md.tongue.scale.set(1, 1, 1.5);
    if (ctx.every('dirt', 0.07)) ctx.emit('dirt', 'frontPaws');
  },

  /** Scout: olfatea el suelo de lado a lado y señala con la pata. */
  scoutSniff(md, t, ctx) {
    const cycle = t % 3.4;
    if (cycle < 2.2) {
      const k = smooth(cycle / 0.3);
      md.pelvis.rotation.x = 0.28 * k;
      plantBackLegs(md);
      md.head.rotation.x = 0.55 * k;
      md.head.rotation.y = sin(cycle * 3.2) * 0.55 * k;
      md.rig.rotation.y = sin(cycle * 1.6) * 0.15;
      md.jaw.rotation.x = 0.02 + abs(sin(t * 20)) * 0.03; // husmea
      for (const ear of md.ears) ear.rotation.x = ear.userData.restX + 0.2;
      wagTail(md, t, 8, 0.35);
      if (ctx.every('sniff', 0.22)) ctx.emit('scent', 'nose');
    } else {
      // ¡Lo encontré! Orejas arriba y pata delantera levantada señalando.
      const k = smooth((cycle - 2.2) / 0.25);
      md.head.rotation.x = -0.15 * k;
      md.legs.fl.rotation.x = -1.2 * k;
      md.chest.rotation.x = -0.05 * k;
      for (const ear of md.ears) ear.rotation.x = ear.userData.restX - 0.35 * k;
      md.tail.rotation.x = -0.5 * k;
      md.tail.rotation.y = sin(t * 16) * 0.2;
      if (k > 0.9 && ctx.every('found', 1.2)) ctx.emit('sparkle', 'nose');
    }
  },

  /** Goliath: se alza tranquilamente sosteniendo un pedrusco sobre la cabeza. */
  goliathLift(md, t, ctx) {
    const k = smooth(t / 0.6);
    const breathe = sin(t * 1.6);
    md.pelvis.rotation.x = -0.55 * k + breathe * 0.03;
    plantBackLegs(md);
    md.legs.fl.rotation.x = -1.6 * k;
    md.legs.fr.rotation.x = -1.6 * k;
    md.legs.fl.rotation.z = -0.2 * k;
    md.legs.fr.rotation.z = 0.2 * k;
    md.head.rotation.x = 0.25 * k - 0.1;
    md.rig.position.y = breathe * 0.02;
    md.jaw.rotation.x = 0.12;
    wagTail(md, t, 3, 0.35);
    if (ctx.prop) {
      ctx.prop.visible = true;
      ctx.prop.position.y = ctx.propBaseY + breathe * 0.05;
    }
    if (k > 0.95 && ctx.every('strong', 1.4)) ctx.emit('sparkle', 'head');
  },

  /** Goliath cargando un pedrusco en partida (cabeza arriba, paso firme). */
  goliathCarry(md) {
    md.head.rotation.x = -0.35;
    md.chest.rotation.x = -0.08;
  },
};
