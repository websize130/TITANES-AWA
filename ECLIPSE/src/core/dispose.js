// Liberación de memoria GPU. Three.js NO libera geometrías, materiales ni
// texturas automáticamente al quitar objetos de la escena.

const TEXTURE_KEYS = [
  'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap',
  'alphaMap', 'bumpMap', 'displacementMap', 'lightMap', 'envMap',
];

export function disposeMaterial(material) {
  for (const key of TEXTURE_KEYS) material[key]?.dispose();
  material.dispose();
}

/** Elimina un objeto de su padre y libera todos sus recursos GPU. */
export function disposeObject(root) {
  root.removeFromParent();
  root.traverse((o) => {
    o.geometry?.dispose();
    if (o.material) {
      if (Array.isArray(o.material)) o.material.forEach(disposeMaterial);
      else disposeMaterial(o.material);
    }
  });
}
