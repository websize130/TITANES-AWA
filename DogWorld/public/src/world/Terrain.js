// Terreno analítico de islas flotantes: la misma función alimenta la malla y la física.
// Isla central (Hub) + meseta del castillo, unidas por un puente sobre el abismo.
import * as THREE from 'three';
import { mulberry32, rockNoiseTexture } from './Textures.js';

export const HUB = { x: 0, z: 0, radius: 58 };
export const CASTLE_ISLAND = { x: 0, z: -118, radius: 42, height: 5 };
export const BRIDGE = { minX: -3, maxX: 3, rampStartZ: -52, rampEndZ: -72, endZ: -86 };
export const SPAWN = { x: 0, z: 20 };
export const FALL_LIMIT_Y = -35;

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a, b, t) => a + (b - a) * t;

/** Centro del camino de adoquines (serpentea ligeramente). */
export function pathX(z) {
  return 2.2 * Math.sin(z * 0.06 + 0.4);
}

function hubSd(x, z) {
  const d = Math.hypot(x - HUB.x, z - HUB.z);
  const a = Math.atan2(z, x);
  const r = HUB.radius + 3 * Math.sin(3 * a) + 2 * Math.sin(5 * a + 1);
  return d - r;
}

function castleSd(x, z) {
  const dx = x - CASTLE_ISLAND.x;
  const dz = z - CASTLE_ISLAND.z;
  const a = Math.atan2(dz, dx);
  return Math.hypot(dx, dz) - (CASTLE_ISLAND.radius + 2.5 * Math.sin(4 * a + 0.5));
}

function hubHeight(x, z, sd) {
  const d = Math.hypot(x, z);
  const a = Math.atan2(z, x);
  const base = 0.45 * Math.sin(x * 0.09 + 1.3) * Math.cos(z * 0.083) + 0.3 * Math.sin(x * 0.21 + z * 0.13);
  const rim = 2.4 * smoothstep(30, 55, d) * (0.55 + 0.45 * Math.sin(a * 5 + 0.7));
  let h = base * smoothstep(6, 26, d) + rim;

  // Camino y explanada de aparición planos.
  if (z > -70 && z < 36) {
    const w = 1 - smoothstep(3.5, 7.5, Math.abs(x - pathX(z)));
    h = lerp(h, 0.05, w);
  }
  const plaza = 1 - smoothstep(7, 12, Math.hypot(x - SPAWN.x, z - SPAWN.z));
  h = lerp(h, 0.05, plaza);

  // Borde redondeado del acantilado.
  h -= 0.8 * smoothstep(-3, 0, sd);
  return h;
}

function castleHeight(x, z, sd) {
  let h = CASTLE_ISLAND.height + 0.25 * Math.sin(x * 0.15) * Math.cos(z * 0.12);
  h -= 0.8 * smoothstep(-3, 0, sd);
  return h;
}

/** Altura del terreno sólido o -Infinity si es vacío (abismo). */
export function terrainHeight(x, z) {
  const sdH = hubSd(x, z);
  if (sdH < 0) return hubHeight(x, z, sdH);
  const sdC = castleSd(x, z);
  if (sdC < 0) return castleHeight(x, z, sdC);
  return -Infinity;
}

/** Distancia con signo al borde de la isla más cercana (<0 dentro). */
export function islandSd(x, z) {
  return Math.min(hubSd(x, z), castleSd(x, z));
}

/** Altura del puente (rampa + tramo plano). */
export function bridgeHeight(x, z) {
  const t = smoothstep(BRIDGE.rampStartZ, BRIDGE.rampEndZ, z);
  return lerp(0.05, CASTLE_ISLAND.height, t) + 0.05;
}

// ---------------------------------------------------------------------------
// Malla
// ---------------------------------------------------------------------------
const GRASS_A = new THREE.Color('#4f9e2f');
const GRASS_B = new THREE.Color('#8fd14c');
const GRASS_C = new THREE.Color('#b9e05a');
const DIRT = new THREE.Color('#b8925e');
const ROCK = new THREE.Color('#9a8296');
const ROCK_DARK = new THREE.Color('#6d5670');

export function buildTerrain(quality) {
  const group = new THREE.Group();
  group.name = 'Terrain';

  const minX = -75, maxX = 75, minZ = -165, maxZ = 70;
  const res = quality.terrainResolution; // celdas por metro
  const segX = Math.round((maxX - minX) * res);
  const segZ = Math.round((maxZ - minZ) * res);
  const geo = new THREE.PlaneGeometry(maxX - minX, maxZ - minZ, segX, segZ);
  geo.rotateX(-Math.PI / 2);
  geo.translate((minX + maxX) / 2, 0, (minZ + maxZ) / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const keep = new Uint8Array(pos.count);
  const skirt = 2.2 / res;
  const tmp = new THREE.Color();

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const sdH = hubSd(x, z);
    const sdC = castleSd(x, z);
    const onHub = sdH <= sdC;
    const sd = onHub ? sdH : sdC;
    let y;

    if (sd < 0) {
      y = onHub ? hubHeight(x, z, sd) : castleHeight(x, z, sd);
      keep[i] = 1;
      // Color: hierba con variación de bajo coste.
      const n = 0.5 + 0.5 * Math.sin(x * 0.31 + Math.sin(z * 0.17) * 2) * Math.cos(z * 0.23 - x * 0.05);
      tmp.copy(GRASS_A).lerp(GRASS_B, n);
      if (n > 0.85) tmp.lerp(GRASS_C, (n - 0.85) * 4);
      if (onHub && z > -70 && z < 36) {
        const w = 1 - smoothstep(2.8, 4.6, Math.abs(x - pathX(z)));
        tmp.lerp(DIRT, w);
      }
      if (sd > -2.5) tmp.lerp(ROCK, smoothstep(-2.5, 0, sd) * 0.8);
    } else {
      // Faldón del acantilado.
      const edgeY = onHub ? 0 : CASTLE_ISLAND.height;
      y = edgeY - 0.8 - sd * 3.2;
      keep[i] = sd < skirt ? 1 : 0;
      tmp.copy(ROCK).lerp(ROCK_DARK, Math.min(1, sd / skirt));
    }
    pos.setY(i, y);
    tmp.toArray(colors, i * 3);
  }

  // Quitar triángulos totalmente fuera de las islas.
  const idx = geo.index.array;
  const kept = [];
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    if (keep[a] && keep[b] && keep[c]) kept.push(a, b, c);
  }
  geo.setIndex(kept);
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.92,
    metalness: 0,
    bumpMap: rockNoiseTexture(),
    bumpScale: 0.6,
  });
  const ground = new THREE.Mesh(geo, mat);
  ground.receiveShadow = true;
  ground.name = 'Ground';
  group.add(ground);

  // Base rocosa de las islas flotantes.
  const hubRadius = (a) => HUB.radius + 3 * Math.sin(3 * a) + 2 * Math.sin(5 * a + 1) + 1.5;
  const castleRadius = (a) => CASTLE_ISLAND.radius + 2.5 * Math.sin(4 * a + 0.5) + 1.5;
  group.add(buildIslandUnderside(HUB.x, HUB.z, hubRadius, -3, 55, 21));
  group.add(buildIslandUnderside(CASTLE_ISLAND.x, CASTLE_ISLAND.z, castleRadius, CASTLE_ISLAND.height - 3, 45, 33));

  return group;
}

/** Cono rocoso irregular invertido bajo cada isla (con tono lavanda como la referencia). */
export function buildIslandUnderside(cx, cz, radiusFn, topY, depth, seed, radial = 64, rings = 14) {
  const rnd = mulberry32(seed);
  const points = [];
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    // Perfil normalizado: ancho arriba, se estrecha hacia una punta irregular.
    const r = Math.pow(1 - t, 0.75) * (i === 0 ? 1 : 0.9 + rnd() * 0.12);
    points.push(new THREE.Vector2(Math.max(r, 0.01), topY - t * depth));
  }
  const geo = new THREE.LatheGeometry(points, radial);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const tmp = new THREE.Color();
  const top = new THREE.Color('#a68aa6');
  const bottom = new THREE.Color('#4b3558');
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const t = (topY - y) / depth;
    // Estratos y salientes.
    const bulge = radiusFn(a) * (1 + t * (0.12 * Math.sin(a * 7 + y * 0.4) + 0.08 * Math.sin(a * 13 - y * 0.9) + 0.06 * Math.sin(y * 1.7)));
    pos.setX(i, x * bulge);
    pos.setZ(i, z * bulge);
    tmp.copy(top).lerp(bottom, Math.min(1, t * 1.2));
    if (Math.sin(y * 2.2 + a * 3) > 0.7) tmp.multiplyScalar(0.85);
    tmp.toArray(colors, i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.95, bumpMap: rockNoiseTexture(), bumpScale: 1.5,
  }));
  mesh.position.set(cx, 0, cz);
  mesh.receiveShadow = true;
  return mesh;
}
