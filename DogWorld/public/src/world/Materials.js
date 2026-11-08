// Materiales PBR compartidos (MeshStandard/Physical) + utilidades de geometría.
import * as THREE from 'three';
import {
  stoneBricksTexture, roofTilesTexture, bannerTexture, woodTexture, rockNoiseTexture,
} from './Textures.js';

let materials = null;

export function getMaterials() {
  if (materials) return materials;
  const stone = stoneBricksTexture();
  materials = {
    stone: new THREE.MeshStandardMaterial({ map: stone, bumpMap: stone, bumpScale: 1.2, roughness: 0.88, color: '#fff4e4' }),
    stoneRough: new THREE.MeshStandardMaterial({ color: '#c9a77e', roughness: 0.9, bumpMap: rockNoiseTexture(), bumpScale: 1.5 }),
    rock: new THREE.MeshStandardMaterial({ color: '#a28c9c', roughness: 0.95, bumpMap: rockNoiseTexture(), bumpScale: 2 }),
    roof: new THREE.MeshStandardMaterial({ map: roofTilesTexture(), roughness: 0.55, metalness: 0.05 }),
    gold: new THREE.MeshStandardMaterial({ color: '#f5b630', metalness: 0.85, roughness: 0.28, emissive: '#5a3200', emissiveIntensity: 0.25 }),
    wood: new THREE.MeshStandardMaterial({ map: woodTexture(), roughness: 0.8, color: '#c08850' }),
    banner: new THREE.MeshStandardMaterial({ map: bannerTexture(), alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.75 }),
    window: new THREE.MeshStandardMaterial({ color: '#1a0f2a', emissive: '#ffb347', emissiveIntensity: 1.6, roughness: 0.4 }),
    windowBlue: new THREE.MeshStandardMaterial({ color: '#0b1a2e', emissive: '#59c7ff', emissiveIntensity: 2.2 }),
    crystal: new THREE.MeshPhysicalMaterial({
      color: '#b45cff', emissive: '#8a2be2', emissiveIntensity: 1.6, roughness: 0.12, metalness: 0,
      clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.92, flatShading: true,
    }),
    leaves: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }),
    trunk: new THREE.MeshStandardMaterial({ color: '#7a5233', roughness: 0.9, bumpMap: rockNoiseTexture(), bumpScale: 0.8 }),
    flag: new THREE.MeshStandardMaterial({ color: '#c0306a', side: THREE.DoubleSide, roughness: 0.7 }),
  };
  return materials;
}

/** Ajusta las UV de una BoxGeometry para que la textura mantenga su escala (metros por repetición). */
export function scaleBoxUVs(geo, w, h, d, metersPerTile = 4) {
  const uv = geo.attributes.uv;
  // Orden de caras en BoxGeometry: +x, -x, +y, -y, +z, -z (4 vértices cada una).
  const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = sizes[f];
    for (let v = 0; v < 4; v++) {
      const i = f * 4 + v;
      uv.setXY(i, uv.getX(i) * su / metersPerTile, uv.getY(i) * sv / metersPerTile);
    }
  }
  uv.needsUpdate = true;
  return geo;
}

export function scaleUVs(geo, su, sv) {
  const uv = geo.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv);
  uv.needsUpdate = true;
  return geo;
}

export function shadow(mesh, cast = true, receive = true) {
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}
