import * as THREE from 'three';
import { TAU, clamp, rand, smooth } from '../core/utils.js';
import { Noise } from '../render/textures.js';
import { ScannedTextures } from '../render/scannedTextures.js';
import { TextureFactory } from '../render/textures.js';

/* =====================================================================
   ISLA (Modo Supervivencia · día): superelipse con orilla irregular. El interior es llano (el juego mueve
   al jugador a altura fija); la playa baja suave hasta el agua y luego cae al fondo marino.
   El límite (world.limit) deja caminar hasta la orilla y por el embarcadero sobre el agua.
   ===================================================================== */
export const ISLAND = { A: 50, B: 52, P: 4, water: -0.16, walk: 0.9, pier: { x: 8, z0: 49, z1: 70, w: 2.4 } };

export function islandR(x, z) { // «radio» de superelipse con ondulación de la costa (1 ≈ línea de costa exterior)
  const a = Math.atan2(z, x), wob = 1 + 0.035 * Math.sin(a * 3 + 1.3) + 0.022 * Math.sin(a * 7 + 0.4) + 0.012 * Math.sin(a * 13 + 2.1);
  return Math.pow(Math.pow(Math.abs(x) / (ISLAND.A * wob), ISLAND.P) + Math.pow(Math.abs(z) / (ISLAND.B * wob), ISLAND.P), 1 / ISLAND.P);
}
export function islandHeight(x, z) {
  const r = islandR(x, z);
  if (r <= 0.86) return 0;
  if (r <= 0.9) return -0.08 * smooth(0.86, 0.9, r);
  if (r <= 1.0) return -0.08 - 0.8 * smooth(0.9, 1.0, r);
  return Math.max(-9, -0.88 - (r - 1) * 26);
}
const onPier = (x, z, m = 0) => { const P = ISLAND.pier; return Math.abs(x - P.x) < P.w / 2 - 0.25 + m && z > P.z0 - 4 && z < P.z1 - 0.4; };

/* ---------- Palmera: tronco curvo por segmentos y frondas de hojuelas ---------- */
function frondGeometry(len, droop, width, n = 16, hue = 0) {
  const pos = [], nor = [], uv = [], col = [], idx = [], c0 = new THREE.Color().setHSL(0.24 + hue, 0.55, 0.22), c1 = new THREE.Color().setHSL(0.2 + hue, 0.6, 0.42), c = new THREE.Color();
  const spine = (t) => [t * len, -droop * t * t + 0.25 * t, 0];
  let v = 0;
  for (let i = 0; i < n; i++) {
    const t0 = i / n, t1 = (i + 0.8) / n, [x0, y0] = spine(t0), [x1, y1] = spine(t1), L = width * Math.sin(Math.PI * (0.15 + 0.85 * t0)) * (1 - t0 * 0.35);
    for (const s of [1, -1]) { // hojuela: cuadrilátero inclinado hacia abajo y hacia la punta
      const tipX = x0 + L * 0.55, tipY = y0 - L * 0.55, tipZ = s * L;
      pos.push(x0, y0, 0, x1, y1, 0, tipX + (x1 - x0), tipY - 0.03, tipZ, tipX, tipY, tipZ * 0.96);
      for (let k = 0; k < 4; k++) nor.push(0, 1, 0);
      uv.push(0, 0, 1, 0, 1, 1, 0, 1);
      c.copy(c0).lerp(c1, 0.3 + 0.7 * t0); for (let k = 0; k < 2; k++) col.push(c.r * 0.8, c.g * 0.8, c.b * 0.8); for (let k = 0; k < 2; k++) col.push(c.r, c.g, c.b);
      idx.push(v, v + 1, v + 2, v, v + 2, v + 3); v += 4;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx);
  g.computeVertexNormals(); return g;
}
function palm(w, x, z, h = rand(6.5, 9.5)) {
  const segs = 9, lean = rand(0.25, 0.9), dirA = rand(0, TAU), dx = Math.cos(dirA), dz = Math.sin(dirA), m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
  let px = x, py = 0, pz = z, prev = new THREE.Vector3(x, 0, z);
  const pts = [];
  for (let i = 0; i <= segs; i++) { const t = i / segs, off = lean * t * t * h * 0.32; pts.push(new THREE.Vector3(x + dx * off, t * h, z + dz * off)); }
  for (let i = 0; i < segs; i++) {
    const a = pts[i], b = pts[i + 1], d = new THREE.Vector3().subVectors(b, a), L = d.length(), r0 = 0.2 - 0.07 * (i / segs), r1 = 0.2 - 0.07 * ((i + 1) / segs);
    const g = new THREE.CylinderGeometry(r1, r0 * 1.06, L * 1.04, 9, 1); const uvA = g.attributes.uv; for (let k = 0; k < uvA.count; k++) uvA.setXY(k, uvA.getX(k) * 0.9, uvA.getY(k) * L * 1.6); // anillos del tronco
    q.setFromUnitVectors(up, d.normalize()); m.compose(a.clone().lerp(b, 0.5), q, new THREE.Vector3(1, 1, 1));
    w.pushM(g, 'palmTrunk', m);
  }
  w.circles.push({ x, z, r: 0.24, minY: 0, maxY: h });
  const top = pts[segs], hue = rand(-0.02, 0.03);
  for (let i = 0; i < 11; i++) { // corona de frondas (las de abajo más caídas)
    const a = (i / 11) * TAU + rand(-0.15, 0.15), lowr = i % 2, g = frondGeometry(rand(2.3, 3.1), rand(1.0, 1.7) + lowr * 0.5, rand(0.55, 0.75), 16, hue);
    m.makeRotationY(-a); m.premultiply(new THREE.Matrix4().makeTranslation(top.x, top.y - 0.05, top.z)); g.applyMatrix4(m.clone().multiply(new THREE.Matrix4().makeRotationZ(rand(0.05, 0.35) - lowr * 0.25)));
    w.pushM(g, 'palmLeaf', new THREE.Matrix4(), false);
  }
  for (let i = 0; i < 5; i++) { const a = rand(0, TAU); w.pushM(new THREE.SphereGeometry(0.11, 10, 8), 'woodDark', new THREE.Matrix4().makeTranslation(top.x + Math.cos(a) * 0.2, top.y - 0.25 - rand(0, 0.12), top.z + Math.sin(a) * 0.2)); }
}
// Matas bajas (helechos / arbustos tropicales): frondas cortas desde el suelo
function bush(w, x, z, s = 1) {
  const m = new THREE.Matrix4(), hue = rand(-0.03, 0.04);
  for (let i = 0; i < 9; i++) { const g = frondGeometry(rand(0.9, 1.4) * s, rand(0.5, 0.9) * s, 0.32 * s, 10, hue); m.makeRotationY(rand(0, TAU)); m.premultiply(new THREE.Matrix4().makeTranslation(x, 0.05, z)); g.applyMatrix4(m.clone().multiply(new THREE.Matrix4().makeRotationZ(rand(0.3, 0.9)))); w.pushM(g, 'palmLeaf', new THREE.Matrix4(), false); }
}

/* ---------- Construcciones ---------- */
function hut(w, x, z, door = 's', o = {}) { // cabaña de playa: madera, techo de paja, suelo de tablones (emboscada)
  const W = o.w || 4.6, D = o.d || 4.2, op = { n: [], s: [], e: [], w: [] }; op[door].push({ c: 0, w: 1.3, t: 'door' });
  for (const k of ['n', 's', 'e', 'w']) if (k !== door) op[k].push({ c: rand(-0.6, 0.6), w: 1.0, t: 'window', boarded: Math.random() < 0.35 });
  w.house({ x, z, w: W, d: D, h: 2.6, wall: 'wood', roofMat: 'thatch', roofH: 1.9, floor: true, open: op });
  w.ambushSpot(x + rand(-0.5, 0.5), z + rand(-0.4, 0.4), 0.08, door === 'e' || door === 'w' ? Math.PI / 2 : 0);
}
function lighthouse(w, x, z) {
  const H = 15;
  for (let i = 0; i < 5; i++) { const y0 = (i / 5) * H, r0 = 2.3 - (i / 5) * 0.8, r1 = 2.3 - ((i + 1) / 5) * 0.8; w.cyl(x, y0, z, r1, r0, H / 5, 28, i % 2 ? 'paintRed' : 'plaster', { collide: false }); }
  w.circles.push({ x, z, r: 2.35, minY: 0, maxY: H });
  w.cyl(x, H, z, 1.9, 1.9, 0.18, 28, 'metal', { collide: false }); // balconada
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; w.cyl(x + Math.cos(a) * 1.8, H + 0.18, z + Math.sin(a) * 1.8, 0.03, 0.03, 0.9, 5, 'metal', { collide: false }); }
  w.cyl(x, H + 1.0, z, 1.85, 1.85, 0.05, 28, 'metal', { collide: false });
  w.cyl(x, H + 0.18, z, 1.15, 1.15, 1.6, 16, 'glass', { collide: false, cast: false });
  w.cyl(x, H + 0.5, z, 0.45, 0.45, 0.9, 12, 'lamp', { collide: false, cast: false });
  w.cyl(x, H + 1.78, z, 0.05, 1.4, 1.1, 16, 'paintRed', { collide: false });
  w.box(x, 0, z + 2.25, 1.1, 2.1, 0.12, 'woodDark', { collide: false });
}
function pier(w) { // embarcadero sobre el agua (se puede recorrer: el límite deja pasar por encima)
  const P = ISLAND.pier, len = P.z1 - P.z0 + 4, zc = (P.z0 - 4 + P.z1) / 2;
  for (let z = P.z0 - 4; z < P.z1; z += 0.34) w.box(P.x + rand(-0.03, 0.03), -0.06, z, P.w, 0.12, 0.3, 'wood', { collide: false, ry: rand(-0.012, 0.012) }); // tarima por encima de las crestas
  for (const sx of [-1, 1]) for (let z = P.z0 - 2; z <= P.z1; z += 3) w.cyl(P.x + sx * (P.w / 2 - 0.1), -3.2, z, 0.13, 0.15, 3.25, 8, 'woodDark', { collide: false });
  for (const sx of [-1, 1]) w.box(P.x + sx * (P.w / 2 - 0.06), 0.06, zc, 0.08, 0.1, len, 'woodDark', { collide: false });
  for (const sx of [-1, 1]) for (let z = P.z0; z <= P.z1; z += 6) w.cyl(P.x + sx * (P.w / 2 - 0.1), -0.03, z, 0.09, 0.1, 0.9, 8, 'woodDark', { collide: false }); // bolardos
  w.ambushSpot(P.x, P.z0 + 6, 0.06, Math.PI / 2); w.ambushSpot(P.x, P.z1 - 5, 0.06, Math.PI / 2);
  // Barca amarrada al final
  boat(w, P.x + 2.6, P.z1 - 3, 0.08, false);
}
function boat(w, x, z, ry, beached = true) {
  const y = beached ? -0.05 : -0.3, tilt = beached ? 0.22 : 0.02;
  w.box(x, y, z, 1.6, 0.5, 4.2, 'hullPaint', { ry, rz: tilt, collide: false });
  w.prism(x, y, z + Math.cos(ry) * 2.4, 1.6, 0.5, 0.6, 'hullPaint', { collide: false });
  for (const s of [-1, 1]) w.box(x + s * 0.78, y + 0.5, z, 0.06, 0.12, 4.2, 'woodDark', { ry, rz: tilt, collide: false });
  w.box(x, y + 0.42, z - 0.4, 1.5, 0.06, 0.3, 'wood', { ry, collide: false });
  if (beached) w.rotAABB(x, z, 0.85, 2.3, ry, 0.9);
}
function tent(w, x, z, ry) {
  const c = Math.cos(ry), s = Math.sin(ry);
  w.prism(x, 0, z, 2.6, 1.7, 3.2, 'tent', { ry, collide: false });
  w.cyl(x + s * 1.6, 0, z + c * 1.6, 0.03, 0.03, 1.75, 5, 'woodDark', { collide: false }); w.cyl(x - s * 1.6, 0, z - c * 1.6, 0.03, 0.03, 1.75, 5, 'woodDark', { collide: false });
  w.rotAABB(x, z, 1.25, 1.6, ry, 1.6);
}

/* ---------- Terreno: arena con hierba en el interior (mezcla en el shader) y arena mojada en la orilla ---------- */
function terrain(w) {
  const S = 150, N = 150, g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, cols = new Float32Array(pos.count * 3), blend = new Float32Array(pos.count), uv = g.attributes.uv;
  const ts = w.mats.texScale.sand || 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), r = islandR(x, z), n = Noise.fbm((x + 200) / 40, (z + 200) / 40, 5, 5, 4, 77);
    pos.setY(i, islandHeight(x, z) + (r < 0.84 ? (n - 0.5) * 0.06 : 0));
    const wet = smooth(0.86, 0.93, r), c = (1 - 0.42 * wet) * (0.9 + 0.2 * n);
    cols[i * 3] = c; cols[i * 3 + 1] = c * 0.98; cols[i * 3 + 2] = c * 0.95;
    const path = Math.abs(x - ISLAND.pier.x) < 2.2 + n * 1.2 && z > 18 ? 1 : 0; // sendero de arena hacia el embarcadero
    blend[i] = (1 - smooth(0.66 + n * 0.12, 0.78 + n * 0.1, r)) * (1 - path) * clamp(0.75 + n * 0.6, 0, 1);
    uv.setXY(i, x / ts, z / ts);
  }
  g.setAttribute('color', new THREE.BufferAttribute(cols, 3)); g.setAttribute('blend', new THREE.BufferAttribute(blend, 1)); g.computeVertexNormals();
  const base = w.mats.get('sand'), G = ScannedTextures.get('grass'), Tg = TextureFactory.sets.ground;
  const m = base.clone(); m.name = 'islandTerrain';
  const csm = w.game.lighting.csm; if (csm) csm.setupMaterial(m);
  const prev = m.onBeforeCompile, grassMap = G ? G.map : Tg.map, gScale = (w.mats.texScale.sand || 2) / (G ? G.size : 4);
  const tint = G ? new THREE.Color(1, 1, 1) : new THREE.Color(0.55, 0.78, 0.36);
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(m, sh, r);
    sh.uniforms.map2 = { value: grassMap }; sh.uniforms.uScale2 = { value: gScale }; sh.uniforms.uTint2 = { value: tint };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float blend;\nvarying float vBlend;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvBlend = blend;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D map2; uniform float uScale2; uniform vec3 uTint2; varying float vBlend;')
      .replace('#include <map_fragment>', `#ifdef USE_MAP
        vec4 sampledDiffuseColor = texture2D( map, vMapUv );
        vec4 grassCol = texture2D( map2, vMapUv * uScale2 ) * vec4( uTint2, 1.0 );
        float edge = clamp( ( vBlend - 0.5 ) * 2.4 + ( grassCol.g - 0.35 ) * 1.4 + 0.5, 0.0, 1.0 ); // borde orgánico guiado por la propia hierba
        diffuseColor *= mix( sampledDiffuseColor, grassCol, edge );
      #endif`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix( roughnessFactor, 0.95, clamp( vBlend * 1.4, 0.0, 1.0 ) );');
  };
  m.customProgramCacheKey = () => 'islandTerrain' + (csm ? 'csm' : '');
  w.mats.list.islandTerrain = m;
  const mesh = new THREE.Mesh(g, m); mesh.receiveShadow = true; w.scene.add(mesh); w.meshes.push(mesh);
}

/* ---------- Constructor del nivel ---------- */
export function buildIsland(w) {
  w.bounds = { x0: -44, x1: 44, z0: -46, z1: 46 };
  w.spawn.player.set(2, 0, 37); w.spawn.yaw = 0;
  w.ocean = { level: ISLAND.water }; w.fauna = true; w.islandHeight = islandHeight;
  // Límite de la orilla: superelipse (se puede pisar el embarcadero)
  w.limit = (pos, r) => {
    if (onPier(pos.x, pos.z)) { const P = ISLAND.pier; pos.x = clamp(pos.x, P.x - P.w / 2 + 0.25 + r * 0.4, P.x + P.w / 2 - 0.25 - r * 0.4); return; }
    const k = islandR(pos.x, pos.z), lim = ISLAND.walk;
    if (k > lim) { const f = lim / k; if (!onPier(pos.x * f, pos.z * f, 0.2) || pos.z < ISLAND.pier.z0 - 4) { pos.x *= f; pos.z *= f; } }
  };
  terrain(w);
  w.spawns('all', [[-30, -10], [30, -20], [-10, -36], [20, -36], [-38, 20], [36, 26], [0, -20], [-20, 8], [24, -4], [-6, 14], [33, -33], [-34, -24], [12, 22], [-24, 32], [38, 4]]);
  // Suministros: armas (se desbloquean por nivel), munición y botiquines
  w.use('wShotgun', -5.5, 6.5, { kind: 'weapon', weapon: 'shotgun' });
  w.use('wSmg', 21, 15.5, { kind: 'weapon', weapon: 'smg' });
  w.use('wRifle', -29.5, -27, { kind: 'weapon', weapon: 'rifle' });
  w.use('ammoA', 3.5, 4, { kind: 'ammo' }); w.use('ammoB', -24, 9.5, { kind: 'ammo' }); w.use('ammoC', 26, -16, { kind: 'ammo' }); w.use('ammoD', 8, 52, { kind: 'ammo' });
  w.use('medA', 0, 28, { kind: 'med' }); w.use('medB', -14, -20, { kind: 'med' }); w.use('medC', 30, 8, { kind: 'med' });
  // Campamento central: tiendas, hoguera, cajas militares, jeeps
  tent(w, -3, 1, 0.3); tent(w, 4.5, -2.5, -0.6); tent(w, -7.5, -5, 1.4);
  w.bonfire(0, -1.2);
  for (const [x, z, s, ry] of [[-2, 6.2, 0.8, 0.2], [-1.2, 6.6, 0.7, 0.9], [5.8, 3.5, 0.85, 0.4], [6.4, 4.1, 0.6, 1.2], [-9, 1, 0.75, 0.6]]) w.crate(x, z, s, ry);
  w.crate(-1.6, 6.4, 0.55, 0.5, 0.8);
  [[7.5, 0.5], [-9.8, -1.5], [2.5, -7]].forEach(([x, z]) => w.barrel(x, z));
  w.car(13, -7, 0.9, 'carPaint'); w.car(-15, 3, -2.3, 'carRed');
  // Cabañas de playa (suelo de tablones: emboscadas)
  hut(w, 22, 18, 'w'); hut(w, 31, 5, 'w', { w: 4.2 }); hut(w, -21, 25, 'e'); hut(w, -29, 9, 'e'); hut(w, 14, -30, 's');
  // Faro al noroeste, embarcadero al sur y barca varada al este
  lighthouse(w, -32, -31); pier(w); boat(w, 40, 14, 1.2); boat(w, -38, 30, -0.5);
  // Rocas de la costa y del interior
  for (let i = 0, n = 0; i < 400 && n < 34; i++) {
    const a = rand(0, TAU), k = rand(0.78, 0.9), x = Math.cos(a) * ISLAND.A * k, z = Math.sin(a) * ISLAND.B * k;
    if (onPier(x, z, 2) || !w.isFree(x, z, 1.5)) continue; w.rock(x, z, rand(0.25, 0.9)); n++;
  }
  // Palmeras (densas en el interior, sueltas en la playa) y matas
  for (let i = 0, n = 0; i < 900 && n < 70; i++) {
    const x = rand(-44, 44), z = rand(-46, 46), r = islandR(x, z);
    if (r > 0.86 || (Math.abs(x) < 11 && Math.abs(z) < 10) || onPier(x, z, 3) || (Math.abs(x - 8) < 3 && z > 18) || !w.isFree(x, z, 2.2)) continue;
    if (r > 0.7 && Math.random() < 0.55) continue;
    palm(w, x, z); n++;
  }
  for (let i = 0, n = 0; i < 600 && n < 60; i++) { const x = rand(-42, 42), z = rand(-44, 44); if (islandR(x, z) > 0.8 || (Math.abs(x) < 10 && Math.abs(z) < 9) || !w.isFree(x, z, 1.2)) continue; bush(w, x, z, rand(0.8, 1.3)); n++; }
}
