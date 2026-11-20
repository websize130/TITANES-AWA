import { TAU, rand } from '../core/utils.js';

/* =====================================================================
   ESCENARIOS: un constructor por nivel. Cada uno define límites, punto de inicio,
   grupos de aparición, puntos de interés (poi), interactivos (use) y luces.
   ===================================================================== */
export const LEVEL_BUILDERS = {
  village(w) { w.buildVillage(); },

  /* Capítulo 1 · Instalación abandonada: vestíbulo → sala de tanques → generador → bahía de contención */
  lab(w) {
    w.bounds = { x0: -21, x1: 21, z0: -31, z1: 29 };
    w.spawn.player.set(0, 0, 25.5); w.spawn.yaw = 0;
    w.groundPlane(46, 66, 'tileFloor', 0, -1, 211);
    w.perimeter(-22, -32, 22, 30, 4.4, 'concrete');
    // Vestíbulo de entrada
    w.box(0, 0, 19.5, 6, 1.05, 1.1, 'concrete'); w.box(0, 1.05, 19.5, 6.2, 0.06, 1.3, 'metal', { collide: false });
    w.box(-1.6, 1.11, 19.4, 0.55, 0.38, 0.05, 'screen', { collide: false }); w.box(1.7, 1.11, 19.4, 0.55, 0.38, 0.05, 'screen', { collide: false, ry: 0.2 });
    w.box(-16, 0, 21, 4, 0.75, 1.1, 'woodDark'); w.box(16, 0, 21, 4, 0.75, 1.1, 'woodDark');
    w.crate(-9, 24, 0.7, 0.3); w.crate(9.5, 22.5, 0.8, 1.1); w.barrel(-19, 27.5); w.barrel(19, 27.8);
    w.box(-8, 0, 17, 1.6, 0.05, 1.0, 'paintGrey', { collide: false, ry: 0.4 });
    w.light(0, 4.1, 22, 0xff2a1a, 7, 16, { flicker: 0.25 });
    // Muro de la sala de tanques
    w.wallX(-22, 22, 14, 4.4, 'tile', 0.4, [{ c: 0, w: 5, h: 3.2 }, { c: -15.5, w: 3, h: 3 }, { c: 15.5, w: 3, h: 3 }]);
    w.poiAt('hall', 0, 9);
    for (const [x, z, br] of [[-4.5, 9, 0], [4.5, 9, 1], [-4.5, 3, 1], [4.5, 3, 0], [-4.5, -3, 0], [4.5, -3, 1]]) w.labTube(x, z, br);
    w.bench(15.5, 8, 1.2, 4.5); w.bench(15.5, -0.5, 1.2, 4.5); w.bench(9.5, -5.5, 3.5, 1.1, false);
    w.light(0, 4.1, 3, 0xff1a1a, 6, 14, { flicker: 0.45 }); w.light(-5, 4.1, 5, 0xdde6ff, 12, 22, { group: 'power', off: true });
    // Ala oeste: generador de emergencia
    w.wallZ(-8, 14, -9, 4.4, 'tile', 0.4, [{ c: 3, w: 3.6, h: 3.2 }, { c: -5, w: 2.6, h: 3 }]);
    w.box(-17.2, 0, 2, 3.2, 2.1, 2.4, 'paintGrey'); w.cyl(-17.8, 2.1, 1.4, 0.35, 0.35, 1.0, 10, 'rust', { collide: false }); w.cyl(-16.6, 2.1, 2.6, 0.35, 0.35, 1.0, 10, 'rust', { collide: false });
    for (let i = 0; i < 6; i++) w.box(-15.55, 0.3 + i * 0.28, 2, 0.08, 0.12, 2.0, 'metal', { collide: false });
    w.pipe(-21.6, 2, -18.8, 2, 3.2, 0.14, 'metal'); w.box(-21.6, 0, 6, 0.4, 2.6, 1.6, 'paintGrey');
    w.use('gen', -14.7, 2, { label: 'Arrancar el generador', hold: 2.4, sfx: 'generator' });
    w.box(-16, 4.15, 5, 0.5, 0.08, 0.22, 'lampRed', { collide: false, cast: false });
    // Compuerta de seguridad y bahía de contención
    w.wallX(-22, 22, -8, 4.4, 'concrete', 0.5, [{ c: 0, w: 4, h: 3.4 }]);
    w.door('sec', 0, -8, 4, 3.4, 'x', 'paintGrey', { mode: 'slide', dir: 1 });
    w.labTube(0, -21, 1, 1.5); w.labTube(-14, -13, 0); w.labTube(-14, -20, 1); w.labTube(-4, -27, 0);
    w.light(2, 4.1, -19, 0xdde6ff, 11, 22, { group: 'power', off: true });
    w.box(12, 0, -12.9, 1.8, 0.85, 0.75, 'metal'); w.use('smgL', 12, -11.8, { kind: 'weapon', weapon: 'smg' });
    // Despacho con la tarjeta (noreste)
    w.wallZ(-32, -18, 9, 4.4, 'tile', 0.4, [{ c: -24, w: 3, h: 3 }]);
    w.wallX(9, 22, -18, 4.4, 'tile', 0.4, [{ c: 15.5, w: 3, h: 3 }]);
    w.box(16, 0, -26, 2.4, 0.85, 1.1, 'woodDark'); w.box(16, 0.85, -26.2, 0.6, 0.4, 0.06, 'screen', { collide: false });
    w.use('card', 16, -24.6, { label: 'Coger la tarjeta de acceso', hold: 0.8, sfx: 'pickup' });
    w.box(15.5, 4.15, -25, 0.5, 0.08, 0.22, 'lamp', { collide: false, cast: false });
    // Ascensor (noroeste)
    w.box(-19.2, 0, -31.3, 1.0, 4.4, 0.8, 'metal'); w.box(-14.8, 0, -31.3, 1.0, 4.4, 0.8, 'metal'); w.box(-17, 3.3, -31.3, 3.4, 1.1, 0.8, 'metal');
    w.box(-17, 0, -31.55, 3.4, 3.3, 0.12, 'paintGrey', { collide: false }); w.box(-17, 3.0, -30.85, 0.5, 0.18, 0.06, 'lampRed', { collide: false });
    w.use('lift', -17, -29.6, { label: 'Usar la tarjeta en el ascensor', hold: 1.2, sfx: 'beep' });
    w.poiAt('bossSpawn', 0, -16.5);
    // Suministros
    w.use('ammo1', 10.5, 26.5, { kind: 'ammo' }); w.use('med1', -12, 22.5, { kind: 'med' }); w.use('ammo2', -19.5, -2, { kind: 'ammo' });
    w.use('ammo3', -9, -28.5, { kind: 'ammo' }); w.use('med2', 19.5, -29.5, { kind: 'med' });
    w.spawns('south', [[-17, 25], [17, 25.5], [-18.5, 17.5], [18.5, 17.5]]);
    w.spawns('mid', [[-6.5, 12], [7, 11.5], [2, -5], [12, 4], [-6.5, -6], [18.5, 4], [0, 6]]);
    w.spawns('west', [[-18, 10], [-19, -5], [-12, -6], [-12, 11]]);
    w.spawns('north', [[-16, -11], [6, -12], [-8, -25], [-18, -24], [4, -29], [-5, -14]]);
  },

  /* Capítulo 2 · Las calles en penumbra: calle principal → comisaría → barricada → metro */
  city(w) {
    w.bounds = { x0: -10.5, x1: 10.5, z0: -33, z1: 32 };
    w.spawn.player.set(0, 0, 29.5); w.spawn.yaw = 0;
    w.groundPlane(60, 76, 'asphalt', 0, -1, 223);
    w.perimeter(-24, -36, 24, 34, 6, 'brick');
    for (const s of [-1, 1]) w.box(s * 9.75, 0, -1, 2.5, 0.14, 70, 'concrete', { collide: false });
    for (let z = 30; z > -22; z -= 4) w.box(0, 0.004, z, 0.14, 0.012, 2, 'paintGrey', { collide: false, cast: false });
    const block = (x0, x1, z0, z1, h, mat) => {
      w.box((x0 + x1) / 2, 0, (z0 + z1) / 2, x1 - x0, h, z1 - z0, mat);
      const fx = x0 > 0 ? x0 - 0.03 : x1 + 0.03; // ventanas oscuras y alguna encendida
      for (let z = z0 + 1.5; z < z1 - 1; z += 2.6) for (let y = 3.4; y < h - 1; y += 3) w.box(fx, y, z, 0.06, 1.3, 1.2, Math.random() < 0.08 ? 'lamp' : 'void', { collide: false, cast: false });
    };
    block(-24, -11, 18, 34, 12, 'brick'); block(-24, -11, 2, 15, 9, 'concrete'); block(-24, -11, -16, -1, 14, 'brick'); block(-24, -11, -36, -19, 10, 'concrete');
    block(11, 24, 20, 34, 11, 'concrete'); block(11, 24, 8, 17, 8, 'brick'); block(11, 24, -36, -13, 12, 'brick');
    // Comisaría (con la armería dentro)
    w.house({ x: 16.5, z: -2.5, w: 11, d: 15, h: 4.2, wall: 'concrete', roof: 'none', open: { w: [{ c: 2.5, w: 2.4, t: 'door' }, { c: -3.5, w: 1.6, t: 'window' }] } });
    w.box(14, 0, -6.5, 1.0, 1.05, 4, 'woodDark'); w.box(20.2, 0, -6, 0.9, 2.1, 2.6, 'paintGrey'); w.box(13.2, 0, 3.4, 2.6, 0.8, 1.0, 'woodDark');
    w.box(16.5, 3.6, 4.82, 3, 0.5, 0.06, 'lamp', { collide: false });
    w.use('station', 19.1, -6, { label: 'Abrir la armería', hold: 1.6, sfx: 'pickup' });
    w.light(16, 3.9, -2, 0xdde6ff, 6, 12, { flicker: 0.5 });
    // Coches abandonados y farolas
    w.car(-4.5, 20, 0.25); w.car(5, 13, -0.15, 'carRed'); w.car(-2.5, 4, 1.35); w.car(4.8, -6, 0.08); w.car(-5.5, -12, 0.5, 'carRed'); w.car(-3, -20.6, 1.5);
    w.lamppost(-9.6, 22, true, -1); w.lamppost(9.6, 6, 'flicker', 1); w.lamppost(-9.6, -8, false, -1); w.lamppost(9.6, -18, true, 1);
    [[-8.2, 26], [7.8, 25.5], [-8.6, 9], [8.4, -2], [-8.4, -14.5]].forEach(([x, z]) => w.barrel(x, z));
    [[6.5, 19], [-7, -3.5], [7.5, -11]].forEach(([x, z]) => w.crate(x, z, 0.85, rand(0, 1)));
    // Barricada policial (el bloque central se hunde al apartarla)
    w.box(-8, 0, -24, 6, 1.15, 0.8, 'concrete'); w.box(8, 0, -24, 6, 1.15, 0.8, 'concrete');
    for (const x of [-9.5, -6.5, 6.5, 9.5]) w.box(x, 1.15, -24, 0.9, 0.5, 0.6, 'woodDark', { collide: false, ry: rand(-0.3, 0.3) });
    w.door('barricade', 0, -24, 10, 1.5, 'x', 'concrete', { mode: 'sink', t: 0.8 });
    w.use('barricade', 0, -22.6, { label: 'Apartar la barricada', hold: 4, sfx: 'door' });
    // Boca de metro
    w.box(0, 0.002, -31.5, 4.2, 0.01, 3.4, 'void', { collide: false, cast: false });
    for (const s of [-1, 1]) w.box(s * 2.25, 0, -31.5, 0.08, 1.0, 3.4, 'metal');
    w.box(0, 0, -33.3, 4.6, 1.0, 0.08, 'metal');
    for (const s of [-1, 1]) w.cyl(s * 2.6, 0, -29.6, 0.05, 0.05, 2.9, 8, 'metal', { collide: false });
    w.box(0, 2.6, -29.6, 1.6, 0.6, 0.1, 'lampRed', { collide: false, cast: false });
    w.poiAt('crossing', 0, 8); w.poiAt('metro', 0, -30.2); w.poiAt('bossSpawn', 0, -15.5);
    w.use('ammo1', -9.4, 12, { kind: 'ammo' }); w.use('med1', 13.4, 1.8, { kind: 'med' }); w.use('ammo2', 9.4, -14.5, { kind: 'ammo' }); w.use('med2', -9.4, -19.8, { kind: 'med' });
    w.spawns('south', [[-15, 16.5], [15, 18.5], [-6, 31.5], [6, 31.5]]);
    w.spawns('mid', [[-15, 0.5], [15, 6.5], [-8, -1], [8, 1.5], [15, -11.5]]);
    w.spawns('north', [[-15, -17.5], [-7.5, -19.5], [7.5, -19.5], [0, -13], [7, -8]]);
  },

  /* Capítulo 3 · Zona de silos: paneles eléctricos → compuerta del silo central → muelle */
  silos(w) {
    w.bounds = { x0: -24, x1: 24, z0: -30, z1: 28 };
    w.spawn.player.set(0, 0, 25.5); w.spawn.yaw = 0;
    w.groundPlane(56, 70, 'concreteFloor', 0, -2, 233);
    w.perimeter(-26, -34, 26, 30, 3.4, 'concrete');
    w.silo(-15, -2, 3.4, 13); w.silo(15, -16, 3.4, 13); w.silo(-15, -19, 3.0, 11); w.silo(16, 6, 2.8, 10);
    w.silo(0, -15, 4.2, 15);
    w.box(0, 0, -10.7, 2.5, 3.0, 0.04, 'void', { collide: false, cast: false });
    w.door('hatch', 0, -10.45, 2.8, 3.1, 'x', 'paintGrey', { mode: 'up', t: 0.18 });
    w.use('hatch', 0, -9.1, { label: 'Abrir la compuerta del silo', hold: 2.6, sfx: 'door' });
    w.container(-18, 17, 'x', 'paintRed'); w.container(-18, 17, 'x', 'paintGrey', 2.6); w.container(18, 18.5, 'x', 'paintGrey'); w.container(-19.8, 8.5, 'z', 'paintGrey');
    w.container(8, 14.5, 'x', 'paintRed'); w.container(20.5, -27.6, 'x', 'paintRed'); w.container(-20.5, -12, 'z', 'paintRed');
    [[-6, 20], [-5.2, 20.6], [12, 23], [-11, 6], [22, 12], [-22, -22], [9, -22.5]].forEach(([x, z]) => w.barrel(x, z));
    [[3.5, 18], [-9, 13], [11, -4], [-6, -6], [6, -26.5]].forEach(([x, z]) => w.crate(x, z, 1.0, rand(0, 1)));
    w.pipe(-26, 4, -12, 4, 4.6, 0.25); w.pipe(12, -9, 26, -9, 4.2, 0.22); w.pipe(-4.2, -15, -26, -15, 6.2, 0.3);
    // Paneles eléctricos
    w.box(-25.6, 0, 3, 0.6, 2.0, 1.4, 'paintGrey'); w.box(-25.25, 1.7, 3, 0.05, 0.12, 0.12, 'lampRed', { collide: false });
    w.use('panelA', -24.4, 3, { label: 'Restablecer el panel A', hold: 2.2, sfx: 'switch' });
    w.box(25.6, 0, -3, 0.6, 2.0, 1.4, 'paintGrey'); w.box(25.25, 1.7, -3, 0.05, 0.12, 0.12, 'lampRed', { collide: false });
    w.use('panelB', 24.4, -3, { label: 'Restablecer el panel B', hold: 2.2, sfx: 'switch' });
    // Verja y muelle
    w.wallX(-26, 26, -26, 3.4, 'concrete', 0.5, [{ c: 0, w: 4 }]);
    w.door('gate', 0, -26, 4, 3.0, 'x', 'rust', { mode: 'slide', dir: -1 });
    w.box(0, -0.02, -32.6, 52, 0.02, 2.8, 'puddle', { collide: false, cast: false });
    for (const x of [-12, -4, 4, 12]) w.cyl(x, 0, -31, 0.22, 0.26, 0.7, 10, 'rust');
    w.light(-6, 6.5, 8, 0xffb070, 11, 19, { flicker: 0.08 }); w.light(9, 6.5, -6, 0xffb070, 11, 19, { group: 'power', off: true }); w.light(0, 4.5, -24, 0xff3a1a, 6, 14);
    w.cyl(-6, 0, 8.4, 0.08, 0.1, 6.5, 8, 'metal', { collide: false }); w.cyl(9, 0, -6.4, 0.08, 0.1, 6.5, 8, 'metal', { collide: false });
    w.poiAt('dock', 0, -30); w.poiAt('bossSpawn', 0, -8.2);
    w.box(-6, 0, 0.8, 1.6, 0.85, 0.8, 'metal'); w.use('rifleS', -6, 1.9, { kind: 'weapon', weapon: 'rifle' });
    w.use('ammo1', 6, 21.5, { kind: 'ammo' }); w.use('med1', 21, 12.5, { kind: 'med' }); w.use('ammo2', -22.5, -6, { kind: 'ammo' });
    w.use('ammo3', 21.5, -23, { kind: 'ammo' }); w.use('med2', -21.5, -24.5, { kind: 'med' });
    w.spawns('south', [[-20, 24], [20, 24.5], [-10, 26.5], [13, 21]]);
    w.spawns('mid', [[-22.5, -2], [22.5, -7], [-8, 4], [8, -1], [-5, 10], [6, 8]]);
    w.spawns('north', [[-19, -23.5], [21, -21], [-8, -23], [8, -21.5], [-6, -11]]);
  },

  /* Capítulo 4 · Las catacumbas: tres braseros → altar del Acólito → salida */
  catacombs(w) {
    w.bounds = { x0: -20.5, x1: 20.5, z0: -27, z1: 26 };
    w.spawn.player.set(0, 0, 24); w.spawn.yaw = 0;
    w.groundPlane(46, 62, 'stoneFloor', 0, -2, 241);
    w.perimeter(-22, -32, 22, 28, 4.8, 'stone');
    const skip = new Set(['-7,10', '7,-14', '-14,-22', '14,18', '7,2', '-7,-6']);
    for (const x of [-14, -7, 7, 14]) for (const z of [18, 10, 2, -6, -14, -22]) if (!skip.has(x + ',' + z)) { w.box(x, 0, z, 1.3, 4.8, 1.3, 'stone'); if (Math.random() < 0.45) w.fungus(x + 0.6, rand(0.2, 1.6), z, 4, 1); }
    w.wallX(-22, 22, 14, 4.8, 'stone', 0.8, [{ c: 0, w: 4, h: 3.2 }, { c: -17.5, w: 3, h: 3 }, { c: 17.5, w: 3, h: 3 }]);
    w.wallX(-22, 22, -2, 4.8, 'stone', 0.8, [{ c: -10.5, w: 4, h: 3.2 }, { c: 10.5, w: 4, h: 3.2 }]);
    w.wallX(-22, 22, -28, 4.8, 'stone', 0.8, [{ c: 0, w: 3, h: 3.2 }]);
    w.door('exit', 0, -28, 3, 3.2, 'x', 'stone', { mode: 'sink', t: 0.6, stripe: false });
    // Osarios: nichos de huesos en los muros
    for (const z of [13.55, -1.55, -2.45, 14.45]) for (let x = -20.5; x < 20.5; x += 1.4) if (Math.random() < 0.55 && Math.abs(x) > 2.5 && Math.abs(Math.abs(x) - 10.5) > 2.5 && Math.abs(Math.abs(x) - 17.5) > 2) w.box(x, rand(0.6, 2.6), z, 0.7, 0.32, 0.06, 'bone', { collide: false, cast: false });
    w.brazier('b1', -16, 20); w.brazier('b2', 16, 6); w.brazier('b3', -16, -9);
    w.box(0, 0, -21.5, 4, 1.0, 2, 'stone'); w.box(0, 1.0, -21.5, 4.2, 0.12, 2.2, 'bone', { collide: false });
    for (let i = 0; i < 9; i++) w.fungus(rand(-20, 20), 0, rand(-26, 26), 5, rand(0.8, 1.5));
    w.fungus(0, 1.1, -21.5, 8, 1.6);
    w.light(0, 1.8, -20, 0xff6a2a, 4, 10, { flicker: 0.25, fixture: false });
    w.poiAt('exit', 0, -30.3); w.poiAt('bossSpawn', 0, -18.5);
    w.use('ammo1', 19.5, 22, { kind: 'ammo' }); w.use('med1', -19.5, 10.5, { kind: 'med' }); w.use('ammo2', -19.5, -4.5, { kind: 'ammo' }); w.use('med2', 19.5, -12, { kind: 'med' }); w.use('ammo3', -10, -25.5, { kind: 'ammo' });
    w.use('sgK', 10, 22.5, { kind: 'weapon', weapon: 'shotgun' });
    w.spawns('south', [[-18.5, 24], [18.5, 24], [-10.5, 17], [10.5, 17.5]]);
    w.spawns('mid', [[-18.5, 6], [18.5, 10.5], [-3.5, 6], [3.5, 9], [10.5, 3]]);
    w.spawns('north', [[-11, -20], [11, -24], [18.5, -16], [-18.5, -25], [-4, -10]]);
  },

  /* Capítulo 5 · El Núcleo: arena circular, reactor, tres nodos y suministros que se reponen */
  core(w) {
    w.bounds = { x0: -23, x1: 23, z0: -23, z1: 23 };
    w.spawn.player.set(0, 0, 25); w.spawn.yaw = 0;
    w.groundPlane(62, 62, 'concreteFloor', 0, 0, 251);
    w.perimeter(-28, -28, 28, 28, 6, 'concrete');
    for (let i = 0; i < 16; i++) {
      if (i === 4) continue; const a = (i / 16) * TAU, x = Math.cos(a) * 25.5, z = Math.sin(a) * 25.5;
      w.box(x, 0, z, 1.5, 6, 1.5, 'concrete'); w.box(x, 2.6, z, 1.56, 0.14, 1.56, 'lampRed', { collide: false, cast: false });
    }
    w.cyl(0, 0, 0, 7, 7.3, 0.08, 40, 'paintGrey', { collide: false });
    for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; w.box(Math.cos(a) * 7.1, 0.06, Math.sin(a) * 7.1, 0.7, 0.04, 0.2, 'lampRed', { collide: false, cast: false, ry: -a }); }
    w.cyl(0, 0, -17, 3.4, 3.8, 1.2, 24, 'rust'); w.cyl(0, 1.2, -17, 2.2, 2.6, 13, 20, 'concrete');
    for (const y of [3, 6, 9, 12]) w.cyl(0, y, -17, 2.38, 2.38, 0.25, 20, 'lampRed', { collide: false, cast: false });
    w.light(0, 6.5, -13.2, 0xff2010, 26, 34, { pulse: 1, fixture: false });
    w.node('n1', -19, 5); w.node('n2', 19, 5); w.node('n3', 0, -23.6);
    [[-8, 4], [9, -2], [-12, -7], [13, 12], [-15, 13], [6, 13.5]].forEach(([x, z]) => w.box(x, 0, z, 1.6, 1.2, 1.6, 'concrete', { ry: 0 }));
    w.use('sup1', -12, 18.5, { kind: 'ammo', respawn: 32 }); w.use('sup2', 12, 18.5, { kind: 'ammo', respawn: 32 }); w.use('sup3', -21, -13, { kind: 'ammo', respawn: 40 });
    w.use('sup4', 21, -13, { kind: 'med', respawn: 45 }); w.use('sup5', -3, 21.5, { kind: 'med', respawn: 60 });
    w.use('rifleC', 8, 21.5, { kind: 'weapon', weapon: 'rifle' }); w.use('sgC', -8, 21.5, { kind: 'weapon', weapon: 'shotgun' });
    w.light(-19, 3.6, 7, 0xffd0c0, 5, 11); w.light(19, 3.6, 7, 0xffd0c0, 5, 11);
    w.poiAt('arena', 0, 13); w.poiAt('bossSpawn', 0, -5);
    const ring = []; for (let i = 0; i < 16; i++) { const a = ((i + 0.5) / 16) * TAU; ring.push([Math.cos(a) * 23, Math.sin(a) * 23]); }
    w.spawns('ring', ring);
  },
};
