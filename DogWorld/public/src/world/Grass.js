// Césped instanciado con viento en GPU (una sola draw call).
import * as THREE from 'three';
import { windUniforms } from './Wind.js';
import { mulberry32 } from './Textures.js';
import { terrainHeight, islandSd, pathX, SPAWN } from './Terrain.js';

export function buildGrass(quality) {
  const count = quality.grassCount;
  if (!count) return null;

  // Brizna: tira de 3 segmentos que se estrecha hacia la punta.
  const blade = new THREE.BufferGeometry();
  const w = 0.16;
  const hgt = 0.7;
  const verts = [];
  const cols = [];
  const segs = 3;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const width = w * (1 - t * 0.9);
    verts.push(-width / 2, t * hgt, 0, width / 2, t * hgt, 0);
    cols.push(t, t); // altura normalizada de cada vértice (base 0, punta 1)
  }
  const idx = [];
  for (let i = 0; i < segs; i++) {
    const a = i * 2;
    idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  blade.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
  blade.setAttribute('aHeight', new THREE.Float32BufferAttribute(cols, 1));
  blade.setIndex(idx);
  blade.computeVertexNormals();

  const mat = new THREE.MeshLambertMaterial({ side: THREE.DoubleSide });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime;
        attribute float aHeight;
        varying float vHeight;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vHeight = aHeight;
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
        float wave = sin(uTime * 1.8 + ip.x * 0.35 + ip.z * 0.25) * 0.6 + sin(uTime * 3.1 + ip.x * 0.9) * 0.25;
        float bend = aHeight * aHeight;
        transformed.x += wave * 0.18 * bend;
        transformed.z += (wave * 0.5 + 0.35) * 0.12 * bend;`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        objectNormal = vec3(0.0, 1.0, 0.0);`); // normales hacia arriba: iluminación suave tipo "toon"
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        varying float vHeight;`)
      // Doble cara sin invertir la normal: ambas caras de la brizna reciben la misma luz.
      .replace('#include <normal_fragment_begin>', `#include <normal_fragment_begin>
        normal = normalize(vNormal);`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        vec3 baseC = vec3(0.12, 0.38, 0.06);
        vec3 tipC = vec3(0.6, 0.92, 0.22);
        vec4 diffuseColor = vec4(mix(baseC, tipC, vHeight), opacity);`);
  };

  const mesh = new THREE.InstancedMesh(blade, mat, count);
  const tint = new THREE.Color();
  const rnd = mulberry32(42);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  let n = 0;
  for (let tries = 0; n < count && tries < count * 3; tries++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * 58;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (islandSd(x, z) > -1.2) continue;
    if (z > -70 && z < 36 && Math.abs(x - pathX(z)) < 3.6) continue;
    if (Math.hypot(x - SPAWN.x, z - SPAWN.z) < 4) continue;
    const y = terrainHeight(x, z);
    p.set(x, y - 0.02, z);
    q.setFromAxisAngle(up, rnd() * Math.PI);
    const sc = 0.7 + rnd() * 0.8;
    s.set(sc, sc * (0.8 + rnd() * 0.6), sc);
    mesh.setMatrixAt(n, m.compose(p, q, s));
    // Variación de color por brizna: verdes amarillentos, intensos y alguno azulado.
    const v = rnd();
    tint.setRGB(0.85 + v * 0.3, 0.9 + rnd() * 0.2, 0.7 + rnd() * 0.45);
    if (v > 0.92) tint.setRGB(1.25, 1.15, 0.6);
    mesh.setColorAt(n++, tint);
  }
  mesh.count = n;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false; // el bounding sphere de la brizna no cubre todas las instancias
  return mesh;
}
