import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * Cámara libre de inspección (OrbitControls) para el modo ?debug.
 * Táctil: 1 dedo rota, 2 dedos zoom/desplazamiento.
 */
export function createDebugOrbit(camera, domElement, target) {
  const controls = new OrbitControls(camera, domElement);
  controls.target.copy(target);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 2;
  controls.maxDistance = 40;
  controls.update();
  return controls;
}
