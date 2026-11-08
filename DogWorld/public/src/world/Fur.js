// Pelaje por capas ("shell fur") en GPU.
// Cada parte peluda se dibuja N veces desplazada a lo largo de su normal; un ruido
// procedural decide en qué capas sigue habiendo hebra, así se forman mechones
// suaves con raíz oscura y puntas claras. Todas las capas van en un único
// InstancedMesh (gl_InstanceID = capa): una draw call por parte.
import * as THREE from 'three';
import { windUniforms } from './Wind.js';

let LAYERS = 12;

/** Calidad global (capas por parte): bajo 6, medio 10, alto 16. */
export function setFurQuality(name) {
  LAYERS = name === 'low' ? 6 : name === 'medium' ? 10 : 16;
}

export function furLayers() {
  return LAYERS;
}

const cache = new Map();

/**
 * Material de pelo. opts: { length, density, droop, curl, tipColor, rootShade, roughness }
 * El color viene de los colores de vértice de la geometría (manchas de cada raza).
 */
export function furMaterial(opts = {}) {
  const o = {
    length: 0.05, density: 38, droop: 0.4, curl: 0, rootShade: 0.62, tip: 1.12, roughness: 0.95, ...opts,
  };
  const key = JSON.stringify(o);
  if (cache.has(key)) return cache.get(key);
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.roughness, metalness: 0 });
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.furLen = { value: o.length };
    shader.uniforms.furLayers = { value: LAYERS };
    shader.uniforms.furDroop = { value: o.droop };
    shader.uniforms.furCurl = { value: o.curl };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime; uniform float furLen; uniform float furLayers; uniform float furDroop; uniform float furCurl;
        attribute float furAmt;
        varying float vLayer; varying vec3 vFurPos; varying vec3 vFurN; varying float vFurAmt;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        float layer = (float(gl_InstanceID) + 1.0) / furLayers;
        vLayer = layer;
        vFurPos = position;
        vec3 n = normalize(objectNormal);
        vFurN = n;
        vFurAmt = furAmt;
        // Rizo: las puntas giran un poco alrededor de la normal (pelo de bichón).
        vec3 side = normalize(cross(n, vec3(0.0, 1.0, 0.001)));
        float curlA = sin(dot(position, vec3(23.0, 17.0, 19.0))) * furCurl * layer;
        float fl = furLen * furAmt;  // furAmt: 0 = sin pelo (ojos, nariz), 1 = pelo completo
        transformed += (n + side * curlA) * fl * layer;
        // Gravedad + leve vaivén.
        transformed.y -= furDroop * fl * layer * layer;
        transformed.x += sin(uTime * 2.3 + position.y * 9.0) * fl * 0.12 * layer * layer;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float furLayers;
        varying float vLayer; varying vec3 vFurPos; varying vec3 vFurN; varying float vFurAmt;
        float furHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }`)
      .replace('#include <alphatest_fragment>', `#include <alphatest_fragment>
        // Hebras: celdas 3D con grosor que se afina hacia la punta.
        vec3 fp = vFurPos * ${o.density.toFixed(1)};
        vec3 cell = floor(fp);
        vec3 f = fract(fp) - 0.5;
        float h = furHash(cell);
        float h2 = furHash(cell + 37.0);
        float lenK = 0.55 + 0.45 * h2;              // mechones de largo variable
        float radius = 0.62 * (1.0 - vLayer / lenK);
        vec3 nn = normalize(vFurN);
        vec3 fperp = f - dot(f, nn) * nn;   // sección de la hebra perpendicular a la piel
        if (vFurAmt < 0.05 || vLayer > lenK || length(fperp) > radius + 0.08) discard;
        float shade = mix(${o.rootShade.toFixed(2)}, ${o.tip.toFixed(2)}, vLayer) * (0.92 + 0.16 * h);
        diffuseColor.rgb *= shade;`);
  };
  mat.customProgramCacheKey = () => `fur-${key}-${LAYERS}`;
  cache.set(key, mat);
  return mat;
}

/**
 * Añade pelaje a una malla existente (hereda su geometría y colores de vértice).
 * scale: multiplica la longitud del pelo para esa parte (hocico más corto, etc.).
 */
export function addFur(mesh, opts, scale = 1) {
  if (!opts || !(opts.length > 0) || scale <= 0) return null;
  const geo = mesh.geometry;
  if (!geo.attributes.furAmt) {
    geo.setAttribute('furAmt', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count).fill(1), 1));
  }
  if (!geo.attributes.color) {
    // Sin colores de vértice: usar el color del material base.
    const c = mesh.material.color ?? new THREE.Color('#ffffff');
    const arr = new Float32Array(geo.attributes.position.count * 3);
    for (let i = 0; i < arr.length; i += 3) c.toArray(arr, i);
    geo.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  }
  const mat = furMaterial({ ...opts, length: opts.length * scale });
  const shells = new THREE.InstancedMesh(geo, mat, LAYERS);
  const id = new THREE.Matrix4();
  for (let i = 0; i < LAYERS; i++) shells.setMatrixAt(i, id);
  shells.castShadow = false;
  shells.receiveShadow = true;
  shells.frustumCulled = false;
  shells.userData.isFur = true;
  mesh.add(shells);
  return shells;
}
