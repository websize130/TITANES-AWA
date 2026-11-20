import * as THREE from 'three';
import { TAU, rand } from '../core/utils.js';
import { frondGeometry } from './island.js';

/* =====================================================================
   MODO HISTORIA · escenarios ampliados para ~2 horas de juego
   · Cap. 1  Laboratorio + ala de criogenia (inicio) + archivo y servidores
   · Cap. 2  Túneles: andén de metro, túnel de servicio, sala de bombas, ventilación y galería de colectores (nuevo)
   · Cap. 3  Industrial: patio de la refinería + silos + torre de control y tren de carga
   · Cap. 4  Invernadero experimental y cuarentena mutada (nuevo)
   · Cap. 5  Zona Cero: aproximación estrambótica (restos que flotan, casas del revés, arco de costillas) + el Núcleo
   Cada ala nueva se une a la anterior por una puerta que abre la propia historia.
   ===================================================================== */
const M4 = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S1 = new THREE.Vector3(1, 1, 1);
const place = (x, y, z, rx = 0, ry = 0, rz = 0, s = 1) => { E.set(rx, ry, rz); Q.setFromEuler(E); return M4.compose(V.set(x, y, z), Q, s === 1 ? S1 : new THREE.Vector3(s, s, s)); };
const panel = (w, x, z, side, label, id, o = {}) => { // consola de pared con pantalla y su interactivo
  const dx = side === 'w' ? -1 : side === 'e' ? 1 : 0, dz = side === 'n' ? -1 : side === 's' ? 1 : 0;
  w.box(x, 0, z, dx ? 0.5 : 1.4, 1.5, dx ? 1.4 : 0.5, o.mat || 'paintGrey');
  w.box(x - dx * 0.26, 1.0, z - dz * 0.26, dx ? 0.04 : 0.9, 0.45, dx ? 0.9 : 0.04, 'screen', { collide: false, cast: false });
  w.use(id, x - dx * 1.0, z - dz * 1.0, { label, hold: o.hold || 2, sfx: o.sfx || 'beep' });
};
function mutantPlant(w, x, z, s = 1, y = 0) { // follaje mutante: frondas violáceas con brillo tenue
  for (let i = 0; i < 8; i++) { const g = frondGeometry(rand(0.9, 1.5) * s, rand(0.4, 0.9) * s, 0.3 * s, 10, 0.55 + rand(-0.04, 0.04)); g.applyMatrix4(place(x, y + 0.05, z, 0, rand(0, TAU), rand(0.3, 0.9))); w.pushM(g, 'mutantLeaf', new THREE.Matrix4(), false); }
}
function tentS(w, x, z, ry) { w.prism(x, 0, z, 2.6, 1.7, 3.2, 'tent', { ry, collide: false }); w.rotAABB(x, z, 1.25, 1.6, ry, 1.6); }

/* ---------- Capítulo 1 · alas nuevas del laboratorio ---------- */
export function labAnnexes(w) {
  // Sur · Criogenia (aquí despiertas)
  w.annex(-16, 30.6, 16, 58, 4.2, 'concrete', 'n', 'tileFloor', 0.6, 212);
  w.door('cryo', 0, 30.3, 3.2, 3.3, 'x', 'paintGrey', { mode: 'slide', dir: -1 });
  for (const [x, z, br] of [[-13, 35, 0], [-13, 41, 1], [-13, 47, 0], [-13, 53, 1], [13, 35, 1], [13, 41, 0], [13, 47, 1], [13, 53, 0]]) w.labTube(x, z, br, 1.1);
  panel(w, -15.4, 44, 'w', 'Restablecer el soporte vital', 'cryo1'); panel(w, 15.4, 50, 'e', 'Restablecer el soporte vital', 'cryo2'); panel(w, 0, 57.6, 's', 'Restablecer el soporte vital', 'cryo3');
  w.bench(-5, 39, 3.2, 1.0); w.bench(6, 47, 1.0, 3.2, false); w.crate(-8, 55, 0.8, 0.3); w.crate(8.5, 33.5, 0.7, 1.0); w.barrel(10, 56);
  for (const z of [36, 46, 55]) w.light(0, 4.0, z, 0x9fc6ff, 7, 16, { flicker: 0.3 });
  [[-3, 50, 1.2, 0.6], [4, 37, 1.0, 0.5]].forEach(([x, z, a, b]) => w.puddle(x, z, a, b, rand(0, 3)));
  w.use('ammoC', 7.5, 36.5, { kind: 'ammo' }); w.use('medC', -7.5, 56.5, { kind: 'med' });
  w.spawns('cryo', [[-9, 37], [10, 40], [-6, 51], [10, 55], [0, 44]]);
  // Norte · Archivo y servidores
  w.annex(-18, -62, 18, -32.6, 4.4, 'concrete', 's', 'tileFloor', 0.6, 213);
  w.door('archive', 0, -32.3, 3.2, 3.3, 'x', 'paintGrey', { mode: 'slide', dir: 1 });
  for (const x of [-13, -7, 7, 13]) for (const z of [-39, -47]) w.box(x, 0, z, 0.7, 2.6, 5.2, 'woodDark'); // estanterías del archivo
  for (let i = 0; i < 6; i++) { const x = -12.5 + i * 5; w.box(x, 0, -58.5, 1.1, 2.3, 1.0, 'metal'); w.box(x, 1.2, -57.95, 0.8, 0.9, 0.04, 'screen', { collide: false, cast: false }); w.box(x + 0.35, 2.0, -57.95, 0.08, 0.08, 0.05, 'lampRed', { collide: false, cast: false }); }
  w.pipe(-17.5, -34, -17.5, -61, 3.6, 0.15, 'metal'); w.pipe(17.5, -34, 17.5, -61, 3.6, 0.15, 'metal');
  panel(w, -17.6, -40, 'w', 'Descargar los registros', 't1', { hold: 3 }); panel(w, 17.6, -46, 'e', 'Descargar los registros', 't2', { hold: 3 }); panel(w, -6, -61.6, 'n', 'Descargar los registros', 't3', { hold: 3 });
  w.light(0, 4.2, -44, 0xff3020, 7, 18, { flicker: 0.35 }); w.light(0, 4.2, -56, 0x7fb0ff, 8, 16);
  w.poiAt('servers', 0, -54); w.poiAt('liftCab', -17, -30.3); w.poiAt('liftPoi', -17, -27);
  w.use('ammoA', 5, -36, { kind: 'ammo' }); w.use('medA', -16, -52, { kind: 'med' });
  w.spawns('archive', [[-15.5, -36], [15.5, -38], [-15.5, -59], [15.5, -59], [0, -50], [0, -42]]);
}

/* ---------- Capítulo 2 · Túneles (nuevo) ---------- */
export function tunnels(w) {
  w.bounds = { x0: -21, x1: 21, z0: -61, z1: 59 };
  w.spawn.player.set(-4, 0, 55); w.spawn.yaw = 0;
  w.groundPlane(48, 126, 'concreteFloor', 0, -1, 261);
  w.perimeterGaps(-22, -62, 22, 60, 4.6, 'concrete');
  // A · Andén de metro abandonado
  for (const x of [13.2, 15.8]) w.box(x, 0, 47, 0.12, 0.14, 26, 'metal', { collide: false });
  for (let z = 35; z < 60; z += 1.1) w.box(14.5, 0, z, 3.4, 0.08, 0.25, 'woodDark', { collide: false });
  w.box(9.6, 0, 47, 0.3, 0.06, 26, 'hazard', { collide: false });
  for (const z of [40, 47.5]) { w.container(15, z, 'z', 'paintGrey'); w.box(13.75, 1.2, z, 0.04, 0.7, 4.8, 'glass', { collide: false, cast: false }); }
  for (const [x, z] of [[-6, 38], [4, 38], [-6, 47], [4, 47], [-6, 56], [4, 56]]) w.cyl(x, 0, z, 0.45, 0.45, 4.6, 12, 'tile');
  w.bench(-14, 50, 3, 0.9, false); w.bench(-14, 42, 3, 0.9, false);
  w.box(-19.6, 0, 45, 0.8, 2.0, 1.6, 'rust'); w.use('keyBox', -18.6, 45, { label: 'Abrir la taquilla de servicio', hold: 1.6, sfx: 'door' });
  for (const z of [40, 52]) w.light(-2, 4.2, z, 0xffc070, 6, 15, { flicker: 0.4 });
  w.poiAt('platformEnd', 0, 37.5);
  w.wallX(-22, 22, 34, 4.6, 'concrete', 0.5, [{ c: 0, w: 3, h: 3.2 }]); w.door('svc', 0, 34, 3, 3.2, 'x', 'rust', { mode: 'up' });
  // B · Túnel de servicio (estrecho, tuberías y luz que parpadea)
  w.wallZ(10, 34, -4.6, 4.6, 'concrete', 0.4); w.wallZ(10, 34, 4.6, 4.6, 'concrete', 0.4);
  w.pipe(-4.1, 10.5, -4.1, 33.5, 2.9, 0.16, 'rust'); w.pipe(-4.1, 10.5, -4.1, 33.5, 3.4, 0.1, 'metal'); w.pipe(4.1, 10.5, 4.1, 33.5, 3.1, 0.2, 'rust');
  for (const z of [14, 22, 30]) w.light(0, 4.0, z, 0xffb060, 5, 10, { flicker: 0.55 });
  [[0, 18, 0.9, 0.5], [1, 27, 0.7, 0.4]].forEach(([x, z, a, b]) => w.puddle(x, z, a, b, 0)); w.crate(-3, 25, 0.7, 0.4);
  w.poiAt('tunnelMid', 0, 22);
  w.wallX(-22, 22, 10, 4.6, 'concrete', 0.5, [{ c: 0, w: 4, h: 3.4 }]);
  // C · Sala de bombas
  for (const [x, z] of [[-12, -2], [12, -4]]) { w.cyl(x, 0, z, 1.3, 1.4, 2.2, 18, 'paintGrey'); w.cyl(x, 2.2, z, 0.5, 0.9, 0.6, 14, 'rust', { collide: false }); w.pipe(x, z, x, -13.5, 2.6, 0.22, 'rust'); }
  w.silo(17, -10, 1.7, 3.6, 'rust');
  panel(w, -21.4, 3, 'w', 'Abrir la válvula de drenaje', 'v1', { sfx: 'door' }); panel(w, 21.4, 5, 'e', 'Abrir la válvula de drenaje', 'v2', { sfx: 'door' }); panel(w, 9, -13.6, 'n', 'Abrir la válvula de drenaje', 'v3', { sfx: 'door' });
  [[-4, -6, 2.4, 1.4], [5, 2, 2.0, 1.1], [-14, 6, 1.6, 1.0]].forEach(([x, z, a, b]) => w.puddle(x, z, a, b, rand(0, 3)));
  w.light(0, 4.2, -2, 0xff4020, 7, 18, { flicker: 0.3 });
  w.wallX(-22, 22, -14, 4.6, 'concrete', 0.5, [{ c: 0, w: 3.2, h: 3.3 }]); w.door('vent', 0, -14, 3.2, 3.3, 'x', 'paintGrey', { mode: 'slide', dir: 1 });
  // D · Nudo de ventilación (gran ventilador y cuadro eléctrico)
  w.cyl(0, 0, -25, 3.4, 3.4, 0.9, 32, 'metal'); w.cyl(0, 0.9, -25, 3.0, 3.0, 0.04, 32, 'void', { collide: false });
  for (let i = 0; i < 6; i++) w.box(0, 0.95, -25, 5.6, 0.06, 0.5, 'rust', { ry: (i / 6) * Math.PI, collide: false });
  w.box(-16, 0, -20, 0.6, 0.9, 0.6, 'metal'); w.use('f1', -16, -18.9, { label: 'Coger el fusible', hold: 0.8, sfx: 'pickup' });
  w.box(17, 0, -31, 0.6, 0.9, 0.6, 'metal'); w.use('f2', 17, -29.9, { label: 'Coger el fusible', hold: 0.8, sfx: 'pickup' });
  w.box(-18, 0, -33.5, 0.6, 0.9, 0.6, 'metal'); w.use('f3', -18, -32.4, { label: 'Coger el fusible', hold: 0.8, sfx: 'pickup' });
  panel(w, 12, -14.9, 's', 'Colocar los fusibles', 'fusebox', { hold: 2.4, sfx: 'generator' });
  w.light(-10, 4.2, -26, 0xdde6ff, 9, 18, { group: 'power', off: true }); w.light(10, 4.2, -26, 0xff3020, 5, 12, { flicker: 0.6 });
  w.wallX(-22, 22, -36, 4.6, 'concrete', 0.5, [{ c: 0, w: 4, h: 3.4 }]); w.door('gallery', 0, -36, 4, 3.4, 'x', 'rust', { mode: 'up' });
  // E · Galería de colectores (arena del Carroñero)
  for (const [x, z] of [[-12, -44], [12, -44], [-12, -56], [12, -56]]) w.cyl(x, 0, z, 0.8, 0.9, 4.6, 16, 'concrete');
  for (const x of [-18, 18]) w.box(x, 0, -49, 2.4, 0.15, 20, 'void', { collide: false });
  w.box(0, 0, -61.6, 1.6, 4.4, 0.2, 'metal', { collide: false }); for (let y = 0.4; y < 4.2; y += 0.4) w.box(0, y, -61.4, 1.4, 0.06, 0.06, 'metal', { collide: false });
  w.use('ladder', 0, -60.2, { label: 'Subir por la escalerilla', hold: 1.2, sfx: 'door' });
  w.light(0, 4.4, -50, 0x7f90c8, 6, 20, { group: 'power', off: true });
  w.poiAt('gallery', 0, -40); w.poiAt('bossSpawn', 0, -52);
  w.use('ammoT1', -15, 55.5, { kind: 'ammo' }); w.use('medT1', 7, 57.5, { kind: 'med' }); w.use('ammoT2', -19, -2, { kind: 'ammo' }); w.use('medT2', 19, -24, { kind: 'med' });
  w.use('ammoT3', -19, -46, { kind: 'ammo' }); w.use('medT3', 19, -59, { kind: 'med' }); w.use('smgT', -10, 7, { kind: 'weapon', weapon: 'smg' });
  w.spawns('station', [[-18, 57], [-12, 39], [6, 52], [-18, 36]]); w.spawns('corr', [[0, 31], [0, 13]]);
  w.spawns('pump', [[-18, 7], [18, -10], [-10, -12], [12, 7], [0, 0]]); w.spawns('vent', [[-18, -18], [18, -18], [-19, -34], [19, -34]]);
  w.spawns('gallery', [[-18, -40], [18, -40], [-18, -60], [18, -60], [0, -44]]);
}

/* ---------- Capítulo 3 · patio de la refinería (sur) y torre de control (norte) ---------- */
export function silosAnnexes(w) {
  w.annex(-26, 30.6, 26, 62, 3.4, 'concrete', 'n', 'asphalt', 0.6, 234);
  w.door('plant', 0, 30.3, 4, 3.0, 'x', 'rust', { mode: 'slide', dir: 1 });
  for (const [x, z] of [[-17, 46], [17, 50]]) { w.silo(x, z, 3.0, 6.5, 'paintGrey'); w.pipe(x, z, x > 0 ? 9 : -9, z, 4.5, 0.25, 'rust'); }
  w.container(-12, 37, 'x', 'paintRed'); w.container(13, 38, 'x', 'paintGrey'); w.container(-20, 58, 'z', 'rust');
  // Grúa pórtico sobre la entrada de la planta
  for (const x of [-6, 6]) w.box(x, 0, 33.5, 0.7, 7.5, 0.7, 'paintRed');
  w.box(0, 7.5, 33.5, 13, 0.7, 0.9, 'paintRed'); w.box(1.5, 6.4, 33.5, 1.4, 1.1, 1.4, 'metal', { collide: false });
  w.box(0, 3.6, 33.5, 3.2, 2.4, 2.0, 'rust', { collide: false }); // contenedor colgado de la grúa sobre la entrada
  panel(w, 9, 37, 'e', 'Mover la grúa', 'crane', { hold: 2.6, sfx: 'generator', mat: 'paintRed' });
  panel(w, -25.4, 41, 'w', 'Cerrar la válvula de gas', 'valveR1', { sfx: 'door' }); panel(w, 25.4, 55, 'e', 'Cerrar la válvula de gas', 'valveR2', { sfx: 'door' });
  w.lamppost(-8, 52, true, -1); w.lamppost(16, 41, 'flicker', 1);
  w.poiAt('refinery', 0, 44);
  w.use('ammoY', -3, 59, { kind: 'ammo' }); w.use('medY', 22, 33.5, { kind: 'med' });
  w.spawns('yard', [[-22, 59], [22, 59], [-20, 40], [21, 44], [0, 50]]);
  // Norte · torre de control y tren de carga
  w.annex(-22, -64, 22, -34.6, 3.6, 'concrete', 's', 'asphalt', 0.6, 235);
  w.door('tower', 0, -34.3, 4, 3.0, 'x', 'rust', { mode: 'slide', dir: -1 });
  w.box(12, 0, -52, 5, 9, 5, 'concrete'); w.box(12, 6.5, -49.45, 4.2, 1.6, 0.06, 'glass', { collide: false, cast: false });
  panel(w, 9.1, -49, 'w', 'Activar la torre de control', 'tw1', { hold: 2.6 }); panel(w, -21.4, -44, 'w', 'Dar paso al tren', 'tw2', { hold: 2.6 });
  for (const x of [-16.6, -15.4]) w.box(x, 0, -49, 0.12, 0.14, 30, 'metal', { collide: false });
  w.container(-16, -45, 'z', 'paintGrey'); w.container(-16, -52, 'z', 'paintRed');
  w.lamppost(-6, -44, true, 1); w.lamppost(6, -60, 'flicker', -1);
  w.poiAt('train', -12.8, -58); w.use('ammoN', 4, -40, { kind: 'ammo' }); w.use('medN', 18, -62, { kind: 'med' });
  w.spawns('tower', [[-18, -38], [18, -38], [0, -62], [19, -60], [-8, -60]]);
}

/* ---------- Capítulo 4 · Invernadero experimental (nuevo) ---------- */
export function greenhouse(w) {
  w.bounds = { x0: -27, x1: 27, z0: -61, z1: 57 };
  w.spawn.player.set(0, 0, 54); w.spawn.yaw = 0;
  w.groundPlane(60, 124, 'concreteFloor', 0, -2, 271);
  w.perimeterGaps(-28, -62, 28, 58, 4.4, 'concrete');
  // A · Puesto de cuarentena
  tentS(w, -16, 50, 0.2); tentS(w, -18, 40, -0.1); tentS(w, 16, 52, -0.3); tentS(w, 18, 41, 0.15);
  for (let i = 0; i < 7; i++) w.box(-9 + i * 3, 0, 36, 2.4, 1.0, 0.4, 'hazard', { ry: rand(-0.1, 0.1) });
  for (const x of [-1.6, 1.6]) w.box(x, 0, 32.5, 0.15, 3, 0.15, 'metal'); w.box(0, 2.9, 32.5, 3.4, 0.15, 1.6, 'metal', { collide: false });
  w.box(0, 2.6, 32.5, 1.2, 0.08, 1.2, 'lamp', { collide: false, cast: false });
  w.use('decon', 0, 33, { label: 'Pasar por la descontaminación', hold: 3, sfx: 'spore' });
  w.lamppost(-10, 46, true, 1); w.lamppost(10, 44, 'flicker', -1);
  w.poiAt('checkpoint', 0, 38);
  w.wallX(-28, 28, 31, 4.4, 'concrete', 0.5, [{ c: 0, w: 3, h: 3.2 }]); w.door('gh1', 0, 31, 3, 3.2, 'x', 'paintGrey', { mode: 'slide', dir: 1 });
  // B · Invernadero de cristal con bancales de plantas mutadas
  w.glassWall('z', 1, 30.5, -14, 5.2); w.glassWall('z', 1, 30.5, 14, 5.2);
  for (let z = 1; z <= 31; z += 3) w.box(0, 5.2, z, 28.4, 0.1, 0.12, 'metal', { collide: false }); // cerchas del techo
  for (const x of [-8, 0, 8]) { w.box(x, 0, 9, 2.6, 0.55, 7, 'ground'); w.box(x, 0, 23, 2.6, 0.55, 7, 'ground'); for (const z of [7, 11, 21, 25]) mutantPlant(w, x + rand(-0.5, 0.5), z, rand(0.9, 1.4), 0.55); }
  w.fungus(-12, 0, 18, 6, 1.2); w.fungus(12, 0, 6, 5, 1);
  w.use('s1', -8, 13.4, { label: 'Recoger una muestra', hold: 1.8, sfx: 'pickup' }); w.use('s2', 8, 18.6, { label: 'Recoger una muestra', hold: 1.8, sfx: 'pickup' }); w.use('s3', 0, 27.6, { label: 'Recoger una muestra', hold: 1.8, sfx: 'pickup' });
  panel(w, -13.6, 4, 'w', 'Cortar el aspersor de esporas', 'valveS1', { sfx: 'door' }); panel(w, 13.6, 26, 'e', 'Cortar el aspersor de esporas', 'valveS2', { sfx: 'door' });
  w.light(0, 4.8, 16, 0xb8ffc8, 8, 22, { flicker: 0.15 });
  w.wallX(-28, 28, 0, 4.4, 'concrete', 0.5, [{ c: 0, w: 3.2, h: 3.3 }]); w.door('lab', 0, 0, 3.2, 3.3, 'x', 'paintGrey', { mode: 'slide', dir: -1 });
  // C · Laboratorio botánico
  w.bench(-14, -8, 4.5, 1.2); w.bench(14, -8, 4.5, 1.2); w.bench(-14, -18, 4.5, 1.2, false); w.bench(14, -18, 4.5, 1.2);
  for (const [x, z] of [[-4, -6], [4, -6], [-4, -18], [4, -18]]) w.labTube(x, z, Math.random() < 0.4 ? 1 : 0, 0.9);
  panel(w, -27.4, -12, 'w', 'Sintetizar el herbicida', 'seed', { hold: 4, sfx: 'generator' }); panel(w, 27.4, -20, 'e', 'Cargar el pulverizador', 'sprayer', { hold: 2.4, sfx: 'switch' });
  w.light(-10, 4.2, -12, 0xdde6ff, 8, 18); w.light(10, 4.2, -14, 0xff3020, 5, 12, { flicker: 0.5 });
  w.poiAt('botLab', 0, -11);
  w.wallX(-28, 28, -24, 4.4, 'concrete', 0.5, [{ c: 0, w: 4, h: 3.4 }]); w.door('dome', 0, -24, 4, 3.4, 'x', 'rust', { mode: 'up' });
  // D · Gran cúpula: árbol mutado, sacos de huevos y hongos (arena de la Matriarca)
  w.glassWall('z', -61.5, -24.5, -26, 5.6); w.glassWall('z', -61.5, -24.5, 26, 5.6);
  w.cyl(0, 0, -44, 0.8, 1.4, 7.5, 12, 'bark'); for (let i = 0; i < 12; i++) { const g = frondGeometry(rand(2.6, 3.6), rand(1.2, 2), 0.7, 14, 0.56); g.applyMatrix4(place(0, 7.2, -44, 0, (i / 12) * TAU, rand(0.1, 0.5))); w.pushM(g, 'mutantLeaf', new THREE.Matrix4(), false); }
  for (let i = 0; i < 16; i++) { const a = rand(0, TAU), r = rand(6, 18), x = Math.cos(a) * r, z = -44 + Math.sin(a) * r * 0.8; w.pushM(new THREE.SphereGeometry(rand(0.25, 0.5), 12, 10).scale(1, 1.3, 1), 'flesh', place(x, 0.3, z)); }
  for (const [x, z] of [[-20, -30], [20, -36], [-18, -56], [19, -55]]) { w.fungus(x, 0, z, 7, 1.4); mutantPlant(w, x + 2, z + 1.5, 1.6); }
  w.light(0, 5.2, -44, 0xc8ff9a, 9, 26, { flicker: 0.1 });
  w.poiAt('bossSpawn', 0, -40); w.poiAt('exitG', 0, -59.5);
  w.box(0, 0, -61.7, 3.2, 3.2, 0.2, 'paintGrey', { collide: false }); w.box(0, 3.2, -61.6, 3.6, 0.2, 0.3, 'lampRed', { collide: false, cast: false });
  w.use('ammoG1', -20, 54, { kind: 'ammo' }); w.use('medG1', 20, 34, { kind: 'med' }); w.use('ammoG2', -10, 2.5, { kind: 'ammo' }); w.use('rifleG', 10, -4, { kind: 'weapon', weapon: 'rifle' });
  w.use('medG2', -22, -22, { kind: 'med' }); w.use('ammoG3', 22, -27, { kind: 'ammo' }); w.use('medG3', -23, -59, { kind: 'med' });
  w.spawns('quar', [[-22, 55], [22, 56], [-24, 38], [24, 37]]); w.spawns('gh', [[-11, 3], [11, 3], [-11, 29], [11, 29], [0, 16]]);
  w.spawns('blab', [[-24, -3], [24, -3], [-24, -21], [24, -21], [0, -21]]); w.spawns('dome', [[-22, -28], [22, -28], [-22, -59], [22, -59], [0, -30], [-10, -56], [10, -56]]);
}

/* ---------- Capítulo 5 · Zona Cero: la aproximación estrambótica al Núcleo ---------- */
export function zoneZero(w) {
  w.annex(-30, 28.6, 30, 98, 6, 'concrete', 'n', 'asphalt', 0.6, 252);
  w.door('core', 0, 28.3, 5, 4.6, 'x', 'rust', { mode: 'sink', t: 0.5 });
  w.bounds.z1 = 96; w.spawn.player.set(0, 0, 92); w.spawn.yaw = 0;
  // Raíces de carne y venas incandescentes que reptan por el asfalto
  for (let i = 0; i < 26; i++) { const x = rand(-28, 28), z = rand(32, 95), L = rand(3, 9); w.cyl(x, 0.2 - L / 2, z, 0.12, 0.28, L, 8, i % 3 ? 'flesh' : 'vein', { rz: Math.PI / 2, ry: rand(0, TAU), collide: false }); } // tumbadas a ras de suelo
  // Arco de costillas gigantes sobre la avenida
  for (let i = 0; i < 6; i++) { const z = 46 + i * 2.6, r = 10 - Math.abs(i - 2.5) * 0.9; w.pushM(new THREE.TorusGeometry(r, 0.42 - i * 0.02, 10, 40, Math.PI), 'bone', place(0, 0, z, 0, 0, 0)); w.circles.push({ x: -r, z, r: 0.5, minY: 0, maxY: 3 }); w.circles.push({ x: r, z, r: 0.5, minY: 0, maxY: 3 }); }
  w.pushM(new THREE.CylinderGeometry(0.6, 0.9, 13.5, 12).rotateX(Math.PI / 2), 'bone', place(0, 9.6, 52.5)); // espinazo
  // Restos que flotan: coches, losas, vigas y casas enteras del revés
  for (let i = 0; i < 22; i++) {
    const x = rand(-28, 28), z = rand(32, 96), y = rand(4, 13), k = Math.random();
    const geo = k < 0.35 ? new THREE.BoxGeometry(1.8, 0.8, 4.2) : k < 0.7 ? new THREE.BoxGeometry(rand(1.5, 4), rand(0.3, 0.8), rand(1.5, 4)) : new THREE.BoxGeometry(0.4, 0.4, rand(4, 8));
    w.floater(geo, k < 0.35 ? (Math.random() < 0.5 ? 'carRed' : 'carPaint') : k < 0.7 ? 'concrete' : 'rust', x, y, z, { rx: rand(-0.6, 0.6), ry: rand(0, TAU), rz: rand(-0.6, 0.6), amp: rand(0.3, 1.2) });
  }
  for (const [x, z, y] of [[-18, 62, 15], [19, 80, 17], [-8, 88, 19], [16, 44, 14]]) { // casas del revés colgando del cielo rojo
    const g = new THREE.BoxGeometry(5, 3.4, 6), roof = new THREE.CylinderGeometry(1, 1, 1, 3, 1).rotateX(-Math.PI / 2).scale(3.2, 1.6, 6.6).translate(0, -2.4, 0).rotateZ(Math.PI);
    w.floater(g, 'plaster', x, y, z, { rz: Math.PI + rand(-0.3, 0.3), ry: rand(0, TAU), amp: 0.6, sp: 0.25 }); w.floater(roof, 'roof', x, y + 2.6, z, { rz: rand(-0.3, 0.3), ry: rand(0, TAU), amp: 0.6, sp: 0.25 });
  }
  // Corazones de la colmena (laten) y el Ojo en el cielo
  for (const [id, x, z] of [['heart1', -15, 64], ['heart2', 15, 40]]) { w.floater(new THREE.SphereGeometry(1.4, 24, 18).scale(1, 1.25, 1), 'flesh', x, 1.5, z, { amp: 0.15, sp: 1.2, pulse: 0.12, spin: 0.1 }); w.circles.push({ x, z, r: 1.5, minY: 0, maxY: 3 }); w.use(id, x, z + 2.3, { label: 'Reventar el corazón', hold: 3, sfx: 'splat' }); }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(7, 32, 20), new THREE.MeshBasicMaterial({ color: 0xff3010, fog: false })); eye.position.set(0, 48, -45); w.scene.add(eye); w.meshes.push(eye);
  w.floaters.push({ m: eye, y: 48, amp: 2, sp: 0.2, spin: 0.05, ph: 0, pulse: 0.05, s0: 1 });
  // Balizas e inhibidores
  for (const [id, x, z] of [['b1', -26, 86], ['b2', 26, 76], ['b3', 0, 68]]) { w.cyl(x, 0, z, 0.25, 0.35, 2.2, 10, 'metal'); w.box(x, 2.2, z, 0.5, 0.3, 0.5, 'lampRed', { collide: false, cast: false }); w.use(id, x, z + 1.1, { label: 'Activar la baliza', hold: 2, sfx: 'beep' }); }
  for (const [id, x, z] of [['i1', -24, 36], ['i2', 24, 58], ['i3', 0, 34]]) { w.box(x, 0, z, 1.4, 2.4, 1.4, 'paintGrey'); w.box(x, 2.4, z, 0.3, 1.2, 0.3, 'vein', { collide: false }); w.use(id, x, z + 1.4, { label: 'Desactivar el inhibidor', hold: 2.4, sfx: 'switch' }); }
  w.poiAt('zc1', 0, 82); w.poiAt('ribs', 0, 52); w.poiAt('domeGate', 0, 31); w.poiAt('evac', 0, -24);
  w.light(-12, 5, 70, 0xff2a10, 8, 26, { flicker: 0.25 }); w.light(12, 5, 44, 0xff4a20, 8, 26, { flicker: 0.2 });
  // Arena del Núcleo: luz de contra cálida y fría para que la silueta colosal del Omega se lea con nitidez
  w.light(-15, 11, -14, 0xffa070, 16, 40); w.light(15, 9, 6, 0x90b0ff, 12, 36);
  w.use('ammoZ1', -6, 90, { kind: 'ammo', respawn: 45 }); w.use('medZ1', 6, 90, { kind: 'med', respawn: 70 }); w.use('ammoZ2', -27, 50, { kind: 'ammo', respawn: 45 }); w.use('medZ2', 27, 64, { kind: 'med', respawn: 70 });
  w.spawns('zc', [[-26, 94], [26, 94], [-26, 70], [26, 70], [-26, 44], [26, 44], [0, 60], [-12, 34], [12, 34]]);
}
